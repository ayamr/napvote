// Service du sondage NapVote (Cloudflare Worker + D1), version multi-scrutins.
// POST /vote    {device, dept, token?, votes:[{scope, choice}]}   -> { ok:true, saved:n }
// POST /results {scopes:[...], dept?, t?}                          -> { scopes:{scope:{total, choices:{choix:n}}}, depts }  (cache mémoire 60 s)
const DEPTS = ["Artibonite", "Centre", "Grand'Anse", "Nippes", "Nord", "Nord-Est", "Nord-Ouest", "Ouest", "Sud", "Sud-Est"];
const FIXED = ["~aucun", "~indecis", "~abstention"];
const MAX_SCOPES = 12;
const maxChoices = (scope) => (scope.startsWith("sen|") ? 3 : 1);
let optCache = { at: 0, keys: null, scopes: null };
const TTL_MS = 60 * 1000, FRESH_MS = 3 * 1000;  // durée du cache des résultats ; délai minimal après un vote
const memo = new Map();                          // « scrutin\u0001département » -> { at, v }
let deptsMemo = { at: 0, v: null };

const enc = new TextEncoder();
async function sha256(s) {
  const b = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
// Signature technique grossière (navigateur, système, écran arrondi, fuseau, langue) : ne sert qu'à repérer les envois en masse.
function coarseUA(ua) {
  const b = /(Edg|OPR|SamsungBrowser|Firefox|FBAN|FBAV|Instagram|Chrome|Safari)\/?(\d+)?/.exec(ua || "");
  const o = /(Android)\s(\d+)|(iPhone OS|CPU OS)\s(\d+)|(Windows)|(Mac OS X)|(Linux)/.exec(ua || "");
  return (b ? b[1] + (b[2] || "") : "?") + "|" + (o ? (o[1] || o[3] || o[5] || o[6] || o[7]) + (o[2] || o[4] || "") : "?");
}
const isoWeek = (d) => Math.floor(d.getTime() / (7 * 86400000));
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

function corsHeaders(req, env) {
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get("Origin") || "";
  const ok = allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : allowed[0] || "",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}
function json(data, cors, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

async function options(env) {
  if (optCache.keys && Date.now() - optCache.at < 10 * 60 * 1000) return optCache;
  try {
    const r = await fetch(env.OPTIONS_URL, { cf: { cacheTtl: 300 } });
    if (r.ok) {
      const j = await r.json();
      const keys = new Set(j.keys), scopes = new Set(j.keys.map((k) => k.slice(0, k.lastIndexOf("|"))));
      optCache = { at: Date.now(), keys, scopes };
      return optCache;
    }
  } catch (e) { /* on garde la dernière liste connue */ }
  if (optCache.keys) return optCache;
  throw new HttpError(503, "liste des choix indisponible");
}

async function turnstileOk(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip || "" });
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  return !!(await r.json()).success;
}

async function vote(req, env) {
  if (!env.SALT) throw new HttpError(500, "service mal configuré");
  let b;
  try { b = await req.json(); } catch (e) { throw new HttpError(400, "requête invalide"); }
  const device = String(b.device || ""), dept = String(b.dept || "");
  if (!/^[A-Za-z0-9-]{16,64}$/.test(device)) throw new HttpError(400, "appareil invalide");
  if (dept && !DEPTS.includes(dept)) throw new HttpError(400, "département invalide");
  const votes = Array.isArray(b.votes) ? b.votes : [];
  if (!votes.length || votes.length > MAX_SCOPES) throw new HttpError(400, "votes invalides");
  const opt = await options(env), seen = new Set(), clean = [];
  for (const v of votes) {
    const scope = String(v.scope || "");
    const list = (Array.isArray(v.choices) ? v.choices : [v.choice]).map((x) => String(x || ""));
    if (seen.has(scope) || !opt.scopes.has(scope)) throw new HttpError(400, "scrutin invalide");
    if (!list.length || list.length > maxChoices(scope) || new Set(list).size !== list.length) throw new HttpError(400, "nombre de choix invalide");
    for (const choice of list) if (!(FIXED.includes(choice) || opt.keys.has(scope + "|" + choice))) throw new HttpError(400, "choix invalide");
    if (list.some((c) => FIXED.includes(c)) && list.length > 1) throw new HttpError(400, "choix incompatibles");
    seen.add(scope); for (const c of list) clean.push([scope, c]);
  }
  const ip = req.headers.get("CF-Connecting-IP") || "";
  if (!(await turnstileOk(env, b.token, ip))) throw new HttpError(403, "vérification anti-robot refusée");

  const now = Math.floor(Date.now() / 1000), day = new Date().toISOString().slice(0, 10);
  const rk = await sha256(ip + "|" + day + "|" + env.SALT);
  const limit = parseInt(env.RATE_LIMIT || "100", 10);
  if (Math.random() < 0.02) await env.DB.prepare("DELETE FROM rl WHERE day < ?").bind(day).run();  // purge des jours passés, de temps en temps
  const row = await env.DB.prepare("INSERT INTO rl(k,n,day) VALUES(?,1,?) ON CONFLICT(k) DO UPDATE SET n=n+1 RETURNING n").bind(rk, day).first();
  if (row && row.n > limit) throw new HttpError(429, "trop de votes depuis ce réseau aujourd'hui");

  const dh = await sha256(device + "|" + env.SALT), scopesArr = [...seen];
  const sig = /^[\w\/|.+ -]{0,80}$/.test(String(b.sig || "")) ? String(b.sig || "") : "";
  const dayDate = new Date(), cl = await sha256([ip, sig, coarseUA(req.headers.get("User-Agent")), env.SALT, isoWeek(dayDate)].join("|"));
  const clMax = parseInt(env.CLUSTER_MAX || "0", 10);
  // anciens choix de cet appareil (quelques lignes) : on les retire des totaux avant d'ajouter les nouveaux
  const prev = (await env.DB.prepare("SELECT scope, choice, dept FROM ballots WHERE device=? AND scope IN (" + scopesArr.map(() => "?").join(",") + ")").bind(dh, ...scopesArr).all()).results || [];
  let isNew = false;
  if (!prev.length) isNew = !(await env.DB.prepare("SELECT 1 AS x FROM ballots WHERE device=? LIMIT 1").bind(dh).first());
  const grp = await env.DB.prepare("SELECT new_dev, sends FROM cluster WHERE k=? AND day=?").bind(cl, day).first();
  if (isNew && clMax > 0 && grp && grp.new_dev >= clMax) throw new HttpError(429, "trop de nouveaux appareils depuis ce réseau aujourd'hui");
  const stmts = [];
  const decC = env.DB.prepare("UPDATE tally SET n = n - 1 WHERE scope=? AND dept=? AND choice=?");
  const decT = env.DB.prepare("UPDATE tally_tot SET n = n - 1 WHERE scope=? AND dept=?");
  const doneT = new Set();
  for (const r of prev) {
    stmts.push(decC.bind(r.scope, r.dept, r.choice));
    if (!doneT.has(r.scope)) { doneT.add(r.scope); stmts.push(decT.bind(r.scope, r.dept)); }
  }
  const del = env.DB.prepare("DELETE FROM ballots WHERE device=? AND scope=?");
  const ins = env.DB.prepare("INSERT INTO ballots(device,scope,choice,dept,created,updated) VALUES(?,?,?,?,?,?)");
  const incC = env.DB.prepare("INSERT INTO tally(scope,dept,choice,n) VALUES(?,?,?,1) ON CONFLICT(scope,dept,choice) DO UPDATE SET n = n + 1");
  const incT = env.DB.prepare("INSERT INTO tally_tot(scope,dept,n) VALUES(?,?,1) ON CONFLICT(scope,dept) DO UPDATE SET n = n + 1");
  for (const sc of scopesArr) stmts.push(del.bind(dh, sc), incT.bind(sc, dept));
  for (const [scope, choice] of clean) stmts.push(ins.bind(dh, scope, choice, dept, now, now), incC.bind(scope, dept, choice));
  // statistique anonyme : pays et région approximatifs de la requête (jamais l'adresse IP)
  const cf = req.cf || {}, country = String(cf.country || "").slice(0, 8), region = String(cf.region || "").slice(0, 60);
  stmts.push(env.DB.prepare("INSERT INTO geo_daily(day,country,region,dept,n) VALUES(?,?,?,?,1) ON CONFLICT(day,country,region,dept) DO UPDATE SET n = n + 1").bind(day, country, region, dept));
  // Répartition des choix (président, sénateur, député) par groupe, seulement à partir du TRACK-ième envoi du jour : les petits groupes ne laissent aucune trace de leurs choix.
  const track = parseInt(env.CLUSTER_TRACK || "10", 10);
  if (grp && grp.sends + 1 >= track) {
    const incG = env.DB.prepare("INSERT INTO cluster_choice(k,day,scope,choice,n) VALUES(?,?,?,?,1) ON CONFLICT(k,day,scope,choice) DO UPDATE SET n = n + 1");
    for (const [scope, choice] of clean) if (scope === "pres" || scope.startsWith("sen|") || scope.startsWith("dep|")) stmts.push(incG.bind(cl, day, scope, choice));
  }
  const asn = Number(cf.asn) || 0, org = String(cf.asOrganization || "").slice(0, 60);
  stmts.push(env.DB.prepare("INSERT INTO cluster(k,day,new_dev,sends) VALUES(?,?,?,1) ON CONFLICT(k,day) DO UPDATE SET new_dev = new_dev + excluded.new_dev, sends = sends + 1").bind(cl, day, isNew ? 1 : 0));
  stmts.push(env.DB.prepare("INSERT INTO asn_daily(day,asn,org,sends,new_dev) VALUES(?,?,?,1,?) ON CONFLICT(day,asn) DO UPDATE SET sends = sends + 1, new_dev = new_dev + excluded.new_dev").bind(day, asn, org, isNew ? 1 : 0));
  if (Math.random() < 0.02) {  // purge : les signatures ne sont gardées que 7 jours
    const old7 = new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10), old60 = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    stmts.push(env.DB.prepare("DELETE FROM cluster WHERE day < ?").bind(old7), env.DB.prepare("DELETE FROM cluster_choice WHERE day < ?").bind(old7), env.DB.prepare("DELETE FROM asn_daily WHERE day < ?").bind(old60));
  }
  await env.DB.batch(stmts);
  for (const k of [...memo.keys()]) if (seen.has(k.split("\u0001")[0])) memo.delete(k);
  deptsMemo = { at: 0, v: null };
  return { ok: true, saved: seen.size };
}

async function results(req, env) {
  let b;
  try { b = await req.json(); } catch (e) { throw new HttpError(400, "requête invalide"); }
  const scopes = Array.isArray(b.scopes) ? b.scopes.map(String) : [];
  const dept = String(b.dept || "");
  if (!scopes.length || scopes.length > MAX_SCOPES) throw new HttpError(400, "scrutins invalides");
  if (dept && !DEPTS.includes(dept)) throw new HttpError(400, "département invalide");
  // Mémoire locale à l'instance : des milliers de visiteurs partagent le même calcul au lieu de relire toute la base.
  // Une mise à jour juste après un vote (fresh) ne contourne le cache que s'il a plus de FRESH_MS.
  const fresh = Number(b.t) > 0, maxAge = fresh ? FRESH_MS : TTL_MS, now = Date.now();
  const out = {}, todo = [];
  for (const s of scopes) {
    const f = dept && s === "pres", k = s + "\u0001" + (f ? dept : ""), hit = memo.get(k);
    if (hit && now - hit.at < maxAge) out[s] = hit.v; else todo.push([s, f, k]);
  }
  // Totaux déjà calculés (tables tally / tally_tot) : quelques centaines de lignes, jamais la table des bulletins.
  let depts = deptsMemo.v;
  const needDepts = !deptsMemo.v || now - deptsMemo.at >= maxAge;
  if (todo.length || needDepts) {
    const ph = todo.map(() => "?").join(","), ids = todo.map((x) => x[0]), stmts = [];
    if (todo.length) {
      stmts.push(env.DB.prepare("SELECT scope, dept, choice, n FROM tally WHERE scope IN (" + ph + ")").bind(...ids));
      stmts.push(env.DB.prepare("SELECT scope, dept, n FROM tally_tot WHERE scope IN (" + ph + ")").bind(...ids));
    }
    if (needDepts) stmts.push(env.DB.prepare("SELECT dept, n FROM tally_tot WHERE scope='pres' AND dept<>''"));
    const res = await env.DB.batch(stmts);
    if (todo.length) {
      if (memo.size > 3000) memo.clear();
      const acc = {};
      for (const [s, f, k] of todo) acc[s] = { f, k, total: 0, choices: {} };
      for (const r of res[0].results) { const a = acc[r.scope]; if (!a.f || r.dept === dept) a.choices[r.choice] = (a.choices[r.choice] || 0) + r.n; }
      for (const r of res[1].results) { const a = acc[r.scope]; if (!a.f || r.dept === dept) a.total += r.n; }
      for (const s of ids) { out[s] = { total: acc[s].total, choices: acc[s].choices }; memo.set(acc[s].k, { at: now, v: out[s] }); }
    }
    if (needDepts) {
      depts = {}; for (const r of res[res.length - 1].results) depts[r.dept] = r.n;
      deptsMemo = { at: now, v: depts };
    }
  }
  return { scopes: Object.fromEntries(scopes.map((s) => [s, out[s]])), depts, dept };
}

// Recalage horaire : recompte exact à partir des bulletins (corrige les écarts dus à des envois simultanés). Même requêtes que recount.sql.
async function recount(env) {
  await env.DB.batch([
    env.DB.prepare("INSERT INTO tally(scope, dept, choice, n) SELECT scope, dept, choice, COUNT(*) FROM ballots WHERE 1 GROUP BY scope, dept, choice ON CONFLICT(scope, dept, choice) DO UPDATE SET n = excluded.n WHERE n <> excluded.n"),
    env.DB.prepare("INSERT INTO tally_tot(scope, dept, n) SELECT scope, dept, COUNT(DISTINCT device) FROM ballots WHERE 1 GROUP BY scope, dept ON CONFLICT(scope, dept) DO UPDATE SET n = excluded.n WHERE n <> excluded.n"),
    env.DB.prepare("DELETE FROM tally WHERE n <= 0"),
    env.DB.prepare("DELETE FROM tally_tot WHERE n <= 0"),
  ]);
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(recount(env)); },
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    try {
      if (url.pathname === "/results" && req.method === "POST") return json(await results(req, env), cors);
      if (url.pathname === "/vote" && req.method === "POST") return json(await vote(req, env), cors);
      if (url.pathname === "/health") return json({ ok: true, v: 6 }, cors);
      return json({ error: "introuvable" }, cors, 404);
    } catch (e) {
      return json({ error: e.message || "erreur" }, cors, e.status || 500);
    }
  },
};
