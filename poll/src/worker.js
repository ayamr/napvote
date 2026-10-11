// Service du sondage NapVote (Cloudflare Worker + D1), version multi-scrutins.
// POST /vote    {device, dept, token?, votes:[{scope, choice}]}   -> { ok:true, saved:n }
// POST /results {scopes:[...], dept?}                              -> { scope: {total, choices:{choix:n}} , depts }
const DEPTS = ["Artibonite", "Centre", "Grand'Anse", "Nippes", "Nord", "Nord-Est", "Nord-Ouest", "Ouest", "Sud", "Sud-Est"];
const FIXED = ["~aucun", "~indecis", "~abstention"];
const MAX_SCOPES = 12;
let optCache = { at: 0, keys: null, scopes: null };

const enc = new TextEncoder();
async function sha256(s) {
  const b = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
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
    const scope = String(v.scope || ""), choice = String(v.choice || "");
    if (seen.has(scope) || !opt.scopes.has(scope)) throw new HttpError(400, "scrutin invalide");
    if (!(FIXED.includes(choice) || opt.keys.has(scope + "|" + choice))) throw new HttpError(400, "choix invalide");
    seen.add(scope); clean.push([scope, choice]);
  }
  const ip = req.headers.get("CF-Connecting-IP") || "";
  if (!(await turnstileOk(env, b.token, ip))) throw new HttpError(403, "vérification anti-robot refusée");

  const now = Math.floor(Date.now() / 1000), day = new Date().toISOString().slice(0, 10);
  const rk = await sha256(ip + "|" + day + "|" + env.SALT);
  const limit = parseInt(env.RATE_LIMIT || "120", 10);
  await env.DB.prepare("DELETE FROM rl WHERE day < ?").bind(day).run();
  const row = await env.DB.prepare("INSERT INTO rl(k,n,day) VALUES(?,1,?) ON CONFLICT(k) DO UPDATE SET n=n+1 RETURNING n").bind(rk, day).first();
  if (row && row.n > limit) throw new HttpError(429, "trop de votes depuis ce réseau aujourd'hui");

  const dh = await sha256(device + "|" + env.SALT);
  const st = env.DB.prepare("INSERT INTO ballots(device,scope,choice,dept,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(device,scope) DO UPDATE SET choice=excluded.choice, dept=excluded.dept, updated=excluded.updated");
  await env.DB.batch(clean.map(([scope, choice]) => st.bind(dh, scope, choice, dept, now, now)));
  return { ok: true, saved: clean.length };
}

async function results(req, env) {
  let b;
  try { b = await req.json(); } catch (e) { throw new HttpError(400, "requête invalide"); }
  const scopes = Array.isArray(b.scopes) ? b.scopes.map(String) : [];
  const dept = String(b.dept || "");
  if (!scopes.length || scopes.length > MAX_SCOPES) throw new HttpError(400, "scrutins invalides");
  if (dept && !DEPTS.includes(dept)) throw new HttpError(400, "département invalide");
  const stmts = scopes.map((s) => (dept && s === "pres")
    ? env.DB.prepare("SELECT choice, COUNT(*) n FROM ballots WHERE scope=? AND dept=? GROUP BY choice").bind(s, dept)
    : env.DB.prepare("SELECT choice, COUNT(*) n FROM ballots WHERE scope=? GROUP BY choice").bind(s));
  stmts.push(env.DB.prepare("SELECT dept, COUNT(*) n FROM ballots WHERE scope='pres' AND dept<>'' GROUP BY dept"));
  const res = await env.DB.batch(stmts);
  const out = {};
  scopes.forEach((s, i) => {
    const choices = {}; let total = 0;
    for (const r of res[i].results) { choices[r.choice] = r.n; total += r.n; }
    out[s] = { total, choices };
  });
  const depts = {}; for (const r of res[scopes.length].results) depts[r.dept] = r.n;
  return { scopes: out, depts, dept };
}

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    try {
      if (url.pathname === "/results" && req.method === "POST") return json(await results(req, env), cors);
      if (url.pathname === "/vote" && req.method === "POST") return json(await vote(req, env), cors);
      if (url.pathname === "/health") return json({ ok: true, v: 2 }, cors);
      return json({ error: "introuvable" }, cors, 404);
    } catch (e) {
      return json({ error: e.message || "erreur" }, cors, e.status || 500);
    }
  },
};
