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
// Réseaux d'hébergement de serveurs, de VPN et de relais privés : aucun électeur ne vote depuis un serveur. Désactivable avec BLOCK_HOSTING = "0".
const HOSTING = /host|data ?cent|server|cloud|vps|vpn|proxy|\bcolo\b|colocation|hetzner|\bovh|digitalocean|linode|vultr|choopa|amazon|\baws\b|google llc|google cloud|microsoft|azure|oracle|alibaba|tencent|m247|datacamp|packethub|gthost|leaseweb|contabo|ionos|scaleway|quadranet|frantech|buyvm|psychz|nordvpn|tefincom|expressvpn|surfshark|proton|mullvad|windscribe|private ?internet|london trust|kape technologies|cyberghost|ipvanish|mudhook|tunnelbear|vyprvpn|hotspot ?shield|anchorfree|psiphon|zscaler|private customer|akamai|fastly|ipxo|ucloud|kamatera|clouvider|serverius|zenlayer|ddos|anycast|cdn|latitude|hurricane electric|eventure/i;
const hostingNet = (org) => !!org && HOSTING.test(org);
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

async function turnstile(env, token, ip) {  // renvoie null si l'anti-robot échoue, sinon le détail de la vérification (action, cdata)
  if (!env.TURNSTILE_SECRET) return {};
  if (!token) return null;
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip || "" });
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const j = await r.json();
  return j.success ? j : null;
}

// Défi signé : le site demande un jeton (/challenge) avant d'envoyer. Il lie l'envoi à l'appareil et impose un délai minimum depuis l'ouverture de la page.
const CH_MIN_MS = 5000, CH_MAX_MS = 30 * 60 * 1000;
async function hmacHex(env, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode("ch|" + env.SALT), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 40);
}
async function challenge(req, env) {
  if (!env.SALT) throw new HttpError(500, "service mal configuré");
  let b; try { b = await req.json(); } catch (e) { throw new HttpError(400, "requête invalide"); }
  const device = String(b.device || "");
  if (!/^[A-Za-z0-9-]{16,64}$/.test(device)) throw new HttpError(400, "appareil invalide");
  const t = Date.now(), n = [...crypto.getRandomValues(new Uint8Array(8))].map((x) => x.toString(16).padStart(2, "0")).join("");
  return { t, n, s: await hmacHex(env, device + "|" + t + "|" + n), min: CH_MIN_MS };
}
async function checkChallenge(env, device, ch) {  // lève une erreur « defi » (à refaire) ou « defi_tot » (trop rapide)
  if (!ch || typeof ch !== "object") throw new HttpError(400, "defi");
  const t = Number(ch.t), n = String(ch.n || ""), s = String(ch.s || "");
  if (!Number.isFinite(t) || !/^[0-9a-f]{16}$/.test(n) || !/^[0-9a-f]{40}$/.test(s)) throw new HttpError(400, "defi");
  if (s !== (await hmacHex(env, device + "|" + t + "|" + n))) throw new HttpError(400, "defi");
  const age = Date.now() - t;
  if (age > CH_MAX_MS || age < 0) throw new HttpError(400, "defi");
  if (age < CH_MIN_MS) throw new HttpError(400, "defi_tot");
  try { await env.DB.prepare("INSERT INTO challenge_used(n,t) VALUES(?,?)").bind(n, t).run(); }  // un jeton ne sert qu'une fois
  catch (e) { throw new HttpError(400, "defi"); }
}

// Envois refusés : on enregistre le candidat visé (président seulement) avec la raison, pour mesurer où va la manipulation même quand elle est bloquée.
async function recordAttempt(env, req, ctx, reason) {
  const cf = req.cf || {}, ip = req.headers.get("CF-Connecting-IP") || "";
  const net = (await sha256(ip + "|" + isoWeek(new Date()) + "|" + env.SALT)).slice(0, 16);
  const pres = (ctx.clean.find((x) => x[0] === "pres") || [])[1] || "";
  await env.DB.prepare("INSERT INTO attempts(t,reason,asn,country,net,pres,dept,scopes) VALUES(?,?,?,?,?,?,?,?)").bind(Math.floor(Date.now() / 1000), String(reason).slice(0, 40), Number(cf.asn) || 0, String(cf.country || "").slice(0, 4), net, pres, ctx.dept || "", new Set(ctx.clean.map((x) => x[0])).size).run();
}
async function vote(req, env) {
  const ctx = {};
  try { return await voteInner(req, env, ctx); }
  catch (e) {
    if (e instanceof HttpError && ctx.clean && [400, 403, 409, 429].includes(e.status)) { try { await recordAttempt(env, req, ctx, e.message); } catch (x) { /* la statistique ne doit jamais gêner le refus */ } }
    throw e;
  }
}
async function voteInner(req, env, ctx) {
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
  ctx.clean = clean; ctx.dept = dept;
  const ip = req.headers.get("CF-Connecting-IP") || "";
  const cfx = req.cf || {};
  if (env.VOTE_HOST && new URL(req.url).hostname !== env.VOTE_HOST) throw new HttpError(403, "hote");  // on force le passage par l'adresse protégée
  if ((env.BLOCK_HOSTING || "1") !== "0" && hostingNet(cfx.asOrganization)) {
    try {  // on compte les refus par opérateur, pour surveiller les faux positifs
      await env.DB.prepare("INSERT INTO blocked_daily(day,asn,org,n) VALUES(?,?,?,1) ON CONFLICT(day,asn) DO UPDATE SET n = n + 1").bind(new Date().toISOString().slice(0, 10), Number(cfx.asn) || 0, String(cfx.asOrganization).slice(0, 60)).run();
    } catch (e) { /* le refus prime sur la statistique */ }
    throw new HttpError(403, "reseau");
  }
  const ts = await turnstile(env, b.token, ip);
  if (!ts) throw new HttpError(403, "vérification anti-robot refusée");
  const chMode = env.REQUIRE_CHALLENGE || "0";
  if (chMode === "1") {
    if (env.TURNSTILE_SECRET && (ts.cdata !== device || (ts.action && ts.action !== "vote"))) throw new HttpError(403, "vérification anti-robot refusée");  // jeton lié à cet appareil
    await checkChallenge(env, device, b.ch);
  } else if (chMode === "2") {
    // mode d'observation : on vérifie et on compte (table blocked_daily, numéros négatifs), sans jamais refuser
    const note = async (code, label) => { try { await env.DB.prepare("INSERT INTO blocked_daily(day,asn,org,n) VALUES(?,?,?,1) ON CONFLICT(day,asn) DO UPDATE SET n = n + 1").bind(new Date().toISOString().slice(0, 10), code, label).run(); } catch (e) { /* ignoré */ } };
    if (env.TURNSTILE_SECRET && (ts.cdata !== device || (ts.action && ts.action !== "vote"))) await note(-1, "OBSERVATION défi : jeton Turnstile non lié à l'appareil");
    try { await checkChallenge(env, device, b.ch); await note(-9, "OBSERVATION défi : valide"); }
    catch (e) { await note(e.message === "defi_tot" ? -3 : -2, e.message === "defi_tot" ? "OBSERVATION défi : envoi trop rapide" : "OBSERVATION défi : absent ou invalide"); }
  }

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
  // Empreinte du navigateur calculée par la page (web seulement) : on ne garde qu'un code mélangé à un secret et à la semaine, 8 jours, sans lien avec les bulletins.
  // Empreinte du MATÉRIEL (écran, processeur graphique, cœurs, fuseau : identique d'un navigateur à l'autre sur un même appareil), croisée avec le réseau et le jour : mesure seulement.
  const hwRaw = /^[0-9a-f]{64}$/.test(String(b.hw || "")) ? String(b.hw) : "";
  const hwk = hwRaw ? await sha256([hwRaw, ip, env.SALT, day].join("|")) : "";
  const fpRaw = /^[0-9a-f]{64}$/.test(String(b.fp || "")) ? String(b.fp) : "";
  const fpk = fpRaw ? await sha256([fpRaw, env.SALT, isoWeek(dayDate)].join("|")) : "", fpMax = parseInt(env.FP_MAX || "0", 10);
  // anciens choix de cet appareil (quelques lignes) : on les retire des totaux avant d'ajouter les nouveaux
  const prev = (await env.DB.prepare("SELECT scope, choice, dept FROM ballots WHERE device=? AND scope IN (" + scopesArr.map(() => "?").join(",") + ")").bind(dh, ...scopesArr).all()).results || [];
  let isNew = false;
  if (!prev.length) isNew = !(await env.DB.prepare("SELECT 1 AS x FROM ballots WHERE device=? LIMIT 1").bind(dh).first());
  const grp = await env.DB.prepare("SELECT new_dev, sends FROM cluster WHERE k=? AND day=?").bind(cl, day).first();
  if (isNew && clMax > 0 && grp && grp.new_dev >= clMax) throw new HttpError(429, "trop de nouveaux appareils depuis ce réseau aujourd'hui");
  if (isNew && fpk && fpMax > 0) {  // trop de nouveaux appareils créés sur le même navigateur cette semaine
    const f = await env.DB.prepare("SELECT new_dev FROM fp_week WHERE k=? AND week=?").bind(fpk, isoWeek(dayDate)).first();
    if (f && f.new_dev >= fpMax) throw new HttpError(429, "empreinte");
  }
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
    const incG = env.DB.prepare("INSERT INTO group_choice(k,day,scope,dept,choice,n) VALUES(?,?,?,?,?,1) ON CONFLICT(k,day,scope,dept,choice) DO UPDATE SET n = n + 1");
    for (const [scope, choice] of clean) if (scope === "pres" || scope.startsWith("sen|") || scope.startsWith("dep|")) stmts.push(incG.bind(cl, day, scope, dept, choice));
  }
  if (fpk) stmts.push(env.DB.prepare("INSERT INTO fp_week(k,week,new_dev,sends) VALUES(?,?,?,1) ON CONFLICT(k,week) DO UPDATE SET new_dev = new_dev + excluded.new_dev, sends = sends + 1").bind(fpk, isoWeek(dayDate), isNew ? 1 : 0));
  if (hwk) {
    stmts.push(env.DB.prepare("INSERT INTO hw_day(k,day,new_dev,sends) VALUES(?,?,?,1) ON CONFLICT(k,day) DO UPDATE SET new_dev = new_dev + excluded.new_dev, sends = sends + 1").bind(hwk, day, isNew ? 1 : 0));
    if (fpk) stmts.push(env.DB.prepare("INSERT OR IGNORE INTO hw_fp(k,day,fpk) VALUES(?,?,?)").bind(hwk, day, fpk));  // navigateurs différents vus sur ce matériel et ce réseau
  }
  // Dossier de preuves de l'envoi (14 jours) : sert à calculer, après coup et de la même façon pour tous les candidats, un score de suspicion par bulletin.
  // Tout est mélangé à un secret : ni adresse, ni identifiant en clair. Voir le tableau « evidence » du schéma.
  {
    const wk = isoWeek(dayDate), h16 = async (x) => (await sha256(x + "|" + env.SALT)).slice(0, 16), hd = req.headers;
    const ua = hd.get("User-Agent") || "", chAge = (b.ch && Number(b.ch.t)) ? Date.now() - Number(b.ch.t) : 0, tsAge = ts && ts.challenge_ts ? Date.now() - Date.parse(ts.challenge_ts) : 0;
    const hdr = ["Sec-Fetch-Site", "Sec-Fetch-Mode", "Sec-Fetch-Dest", "Sec-CH-UA", "Accept-Language", "Origin", "Referer", "Accept-Encoding"].reduce((a, k, i) => a | (hd.get(k) ? 1 << i : 0), 0);
    const sgIn = b.sg && typeof b.sg === "object" ? b.sg : {}, sg = {};
    for (const k of ["o", "i", "p", "k", "s", "m", "f", "tr", "a", "n"]) { const v = Number(sgIn[k]); if (Number.isFinite(v)) sg[k] = Math.max(0, Math.min(1e9, Math.round(v))); }
    const presChoice = (clean.find((x) => x[0] === "pres") || [])[1] || "";
    stmts.push(env.DB.prepare("INSERT INTO evidence(t,dh,isnew,asn,country,region,colo,http,tls,rtt,net,fp,hw,ua,uah,lang,hdr,chal,tsage,scopes,pres,dept,sg,tech) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(
      Math.floor(Date.now() / 1000), dh, isNew ? 1 : 0, Number(cf.asn) || 0, String(cf.country || "").slice(0, 4), String(cf.region || "").slice(0, 30), String(cf.colo || "").slice(0, 6),
      String(cf.httpProtocol || "").slice(0, 10), String(cf.tlsVersion || "").slice(0, 10), Number(cf.clientTcpRtt) || 0,
      await h16(ip + "|" + wk), fpk ? fpk.slice(0, 16) : "", hwRaw ? await h16(hwRaw + "|" + wk) : "", coarseUA(ua), await h16(ua), String(hd.get("Accept-Language") || "").slice(0, 5),
      hdr, chAge, tsAge > 0 ? tsAge : 0, seen.size, presChoice, dept, JSON.stringify(sg).slice(0, 200), sig.slice(0, 80)));
  }
  const asn = Number(cf.asn) || 0, org = String(cf.asOrganization || "").slice(0, 60);
  // Suivi horaire par opérateur réseau et département déclaré ; les choix de président ne sont comptés que pour les opérateurs déjà actifs (ASN_TRACK envois dans la journée).
  const hour = new Date().toISOString().slice(0, 13), aTrack = parseInt(env.ASN_TRACK || "30", 10);
  const ad = await env.DB.prepare("SELECT sends FROM asn_daily WHERE day=? AND asn=?").bind(day, asn).first();
  stmts.push(env.DB.prepare("INSERT INTO asn_hour(hour,asn,org,dept,sends,new_dev) VALUES(?,?,?,?,1,?) ON CONFLICT(hour,asn,dept) DO UPDATE SET sends = sends + 1, new_dev = new_dev + excluded.new_dev").bind(hour, asn, org, dept, isNew ? 1 : 0));
  if (ad && ad.sends + 1 >= aTrack) {
    for (const [scope, choice] of clean) if (scope === "pres") stmts.push(env.DB.prepare("INSERT INTO asn_choice(hour,asn,dept,choice,n) VALUES(?,?,?,?,1) ON CONFLICT(hour,asn,dept,choice) DO UPDATE SET n = n + 1").bind(hour, asn, dept, choice));
  }
  stmts.push(env.DB.prepare("INSERT INTO cluster(k,day,new_dev,sends) VALUES(?,?,?,1) ON CONFLICT(k,day) DO UPDATE SET new_dev = new_dev + excluded.new_dev, sends = sends + 1").bind(cl, day, isNew ? 1 : 0));
  stmts.push(env.DB.prepare("INSERT INTO asn_daily(day,asn,org,sends,new_dev) VALUES(?,?,?,1,?) ON CONFLICT(day,asn) DO UPDATE SET sends = sends + 1, new_dev = new_dev + excluded.new_dev").bind(day, asn, org, isNew ? 1 : 0));
  if (Math.random() < 0.02) {  // purge : les signatures ne sont gardées que 7 jours
    const old7 = new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10), old60 = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    stmts.push(env.DB.prepare("DELETE FROM attempts WHERE t < ?").bind(Math.floor(Date.now() / 1000) - 14 * 86400), env.DB.prepare("DELETE FROM evidence WHERE t < ?").bind(Math.floor(Date.now() / 1000) - 14 * 86400), env.DB.prepare("DELETE FROM hw_day WHERE day < ?").bind(old7), env.DB.prepare("DELETE FROM hw_fp WHERE day < ?").bind(old7), env.DB.prepare("DELETE FROM cluster WHERE day < ?").bind(old7), env.DB.prepare("DELETE FROM group_choice WHERE day < ?").bind(old7), env.DB.prepare("DELETE FROM asn_daily WHERE day < ?").bind(old60));
    const old14 = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 13);
    stmts.push(env.DB.prepare("DELETE FROM asn_hour WHERE hour < ?").bind(old14), env.DB.prepare("DELETE FROM asn_choice WHERE hour < ?").bind(old14));
    stmts.push(env.DB.prepare("DELETE FROM fp_week WHERE week < ?").bind(isoWeek(dayDate) - 1), env.DB.prepare("DELETE FROM challenge_used WHERE t < ?").bind(Date.now() - 86400000));
  }
  await env.DB.batch(stmts);
  for (const k of [...memo.keys()]) if (seen.has(k.split("\u0001")[0])) memo.delete(k);
  deptsMemo = { at: 0, v: null };
  return { ok: true, saved: seen.size };
}

// Instantané publié : les résultats affichés ne bougent qu'une fois par heure (tâche planifiée), pour ne pas offrir de retour immédiat à qui tenterait de les influencer.
let pubMemo = { at: 0, v: null };
async function publishedAt(env) {
  if (Date.now() - pubMemo.at < 30000) return pubMemo.v;
  let v = null;
  try { const r = await env.DB.prepare("SELECT v FROM pub_meta WHERE k='snap_at'").first(); v = r ? r.v : null; } catch (e) { /* table absente : résultats en direct */ }
  pubMemo = { at: Date.now(), v };
  return v;
}
let riskMemo = { at: 0, v: 0 };
async function riskRemoved(env) {  // bulletins de la présidentielle retirés après examen des preuves, comptés dans l'instantané publié
  if (Date.now() - riskMemo.at < 30000) return riskMemo.v;
  let v = 0;
  try { const r = await env.DB.prepare("SELECT v FROM pub_meta WHERE k='risk_pres'").first(); v = r ? Number(r.v) || 0 : 0; } catch (e) { /* table absente */ }
  riskMemo = { at: Date.now(), v };
  return v;
}
let cutMemo = { at: 0, v: null };
async function publishedCut(env) {  // période de la présidentielle retirée des résultats (la plus récente), pour l'afficher
  if (Date.now() - cutMemo.at < 30000) return cutMemo.v;
  let v = null;
  try { const r = await env.DB.prepare("SELECT from_ts, to_ts FROM excluded_windows WHERE scope='pres' ORDER BY to_ts DESC LIMIT 1").first(); if (r) v = { from: new Date(r.from_ts * 1000).toISOString(), to: new Date(r.to_ts * 1000).toISOString() }; } catch (e) { /* table absente */ }
  cutMemo = { at: Date.now(), v };
  return v;
}
// Retrait des envois anormaux. Pour chaque cellule « opérateur réseau + heures + département » inscrite dans excluded_cells, on retire des résultats de la
// présidentielle seulement l'EXCÉDENT par rapport à ce que le département aurait donné (les électeurs ordinaires de la même cellule restent comptés),
// en ne gardant que les nouveaux appareils (les renvois ne sont pas des choix en plus). Aucun bulletin n'est modifié ni supprimé : le retrait se fait à l'affichage.
const EXCL_SQL = `WITH cell AS (
  SELECT a.hour, a.asn, a.dept, a.choice, a.n FROM asn_choice a
  WHERE a.hour <= COALESCE((SELECT v FROM pub_meta WHERE k = 'snap_hour'), '9999')
  AND NOT EXISTS (SELECT 1 FROM excluded_windows w WHERE w.scope = 'pres' AND CAST(strftime('%s', substr(a.hour, 1, 10) || ' ' || substr(a.hour, 12, 2) || ':00:00') AS INTEGER) >= w.from_ts AND CAST(strftime('%s', substr(a.hour, 1, 10) || ' ' || substr(a.hour, 12, 2) || ':00:00') AS INTEGER) + 3599 <= w.to_ts)
  AND EXISTS (SELECT 1 FROM excluded_cells e WHERE e.asn = a.asn AND a.hour >= e.hour_from AND a.hour <= e.hour_to AND (e.dept = '*' OR e.dept = a.dept))
), c AS (SELECT hour, asn, dept, SUM(n) AS t FROM cell GROUP BY hour, asn, dept),
cs AS (SELECT dept, choice, SUM(n) AS n FROM cell GROUP BY dept, choice),
base AS (SELECT t.dept, t.choice, MAX(0, t.n - COALESCE(cs.n, 0)) AS n FROM TALLY t LEFT JOIN cs ON cs.dept = t.dept AND cs.choice = t.choice WHERE t.scope = 'pres'),
nat AS (SELECT choice, n * 1.0 / NULLIF(SUM(n) OVER (), 0) AS p FROM (SELECT choice, SUM(n) AS n FROM base GROUP BY choice)),
moy AS (SELECT dept, choice, CASE WHEN SUM(n) OVER (PARTITION BY dept) >= 200 THEN n * 1.0 / SUM(n) OVER (PARTITION BY dept) END AS p FROM base)
SELECT cell.dept, cell.choice, SUM(MAX(0.0, cell.n - c.t * COALESCE(m.p, nt.p, 0)) * COALESCE(h.new_dev * 1.0 / NULLIF(h.sends, 0), 1.0)) AS x
FROM cell JOIN c ON c.hour = cell.hour AND c.asn = cell.asn AND c.dept = cell.dept
LEFT JOIN moy m ON m.dept = cell.dept AND m.choice = cell.choice
LEFT JOIN nat nt ON nt.choice = cell.choice
LEFT JOIN asn_hour h ON h.hour = cell.hour AND h.asn = cell.asn AND h.dept = cell.dept
GROUP BY cell.dept, cell.choice`;
let exclMemo = { at: 0, v: null };
async function loadExcl(env, maxAge, tallyTable) {
  if (exclMemo.v && Date.now() - exclMemo.at < maxAge) return exclMemo.v;
  const byChoice = new Map(), byDept = new Map();
  try {
    for (const r of (await env.DB.prepare(EXCL_SQL.replace("FROM TALLY t", "FROM " + tallyTable + " t")).all()).results || []) {
      const x = Math.round(r.x || 0); if (x <= 0) continue;
      byChoice.set(r.dept + "\u0001" + r.choice, x); byDept.set(r.dept, (byDept.get(r.dept) || 0) + x);
    }
  } catch (e) { /* table absente ou erreur : aucun retrait plutôt qu'un échec */ }
  exclMemo = { at: Date.now(), v: { byChoice, byDept } };
  return exclMemo.v;
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
  // Totaux déjà calculés : quelques centaines de lignes, jamais la table des bulletins. On lit l'instantané publié chaque heure (tally_pub) ; à défaut, les totaux en direct.
  let depts = deptsMemo.v;
  const needDepts = !deptsMemo.v || now - deptsMemo.at >= maxAge;
  const snap = await publishedAt(env), T = snap ? "tally_pub" : "tally", TT = snap ? "tally_tot_pub" : "tally_tot";
  if (todo.length || needDepts) {
    const ph = todo.map(() => "?").join(","), ids = todo.map((x) => x[0]), stmts = [];
    if (todo.length) {
      stmts.push(env.DB.prepare("SELECT scope, dept, choice, n FROM " + T + " WHERE scope IN (" + ph + ")").bind(...ids));
      stmts.push(env.DB.prepare("SELECT scope, dept, n FROM " + TT + " WHERE scope IN (" + ph + ")").bind(...ids));
    }
    if (needDepts) stmts.push(env.DB.prepare("SELECT dept, n FROM " + TT + " WHERE scope='pres' AND dept<>''"));
    const res = await env.DB.batch(stmts);
    const ex = (needDepts || ids.includes("pres")) ? await loadExcl(env, maxAge, T) : null;
    if (todo.length) {
      if (memo.size > 3000) memo.clear();
      const acc = {};
      for (const [s, f, k] of todo) acc[s] = { f, k, total: 0, choices: {}, adj: 0 };
      for (const r of res[0].results) {
        const a = acc[r.scope];
        if (!a.f || r.dept === dept) {
          let n = r.n;
          if (r.scope === "pres" && ex) { const m = Math.min(n, ex.byChoice.get(r.dept + "\u0001" + r.choice) || 0); n -= m; a.adj += m; }
          a.choices[r.choice] = (a.choices[r.choice] || 0) + n;
        }
      }
      for (const r of res[1].results) {
        const a = acc[r.scope];
        if (!a.f || r.dept === dept) a.total += (r.scope === "pres" && ex) ? Math.max(0, r.n - (ex.byDept.get(r.dept) || 0)) : r.n;
      }
      for (const s of ids) { out[s] = { total: acc[s].total, choices: acc[s].choices }; if (acc[s].adj > 0) out[s].adj = acc[s].adj; memo.set(acc[s].k, { at: now, v: out[s] }); }
    }
    if (needDepts) {
      depts = {}; for (const r of res[res.length - 1].results) depts[r.dept] = Math.max(0, r.n - (ex ? ex.byDept.get(r.dept) || 0 : 0));
      deptsMemo = { at: now, v: depts };
    }
  }
  if (scopes.includes("pres") && out.pres) { const rk = await riskRemoved(env); if (rk > 0) out.pres = { ...out.pres, adj: (out.pres.adj || 0) + rk }; }
  const cut = scopes.includes("pres") ? await publishedCut(env) : null;
  return { scopes: Object.fromEntries(scopes.map((s) => [s, out[s]])), depts, dept, asof: snap || null, ...(cut ? { cut } : {}) };
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

// Publication horaire : copie des totaux en direct vers l'instantané affiché (n'écrit que les lignes qui changent).
async function publish(env) {
  const now = new Date();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO tally_pub(scope,dept,choice,n) SELECT scope,dept,choice,n FROM tally WHERE 1 ON CONFLICT(scope,dept,choice) DO UPDATE SET n = excluded.n WHERE n <> excluded.n"),
    env.DB.prepare("DELETE FROM tally_pub WHERE NOT EXISTS (SELECT 1 FROM tally t WHERE t.scope = tally_pub.scope AND t.dept = tally_pub.dept AND t.choice = tally_pub.choice)"),
    env.DB.prepare("INSERT INTO tally_tot_pub(scope,dept,n) SELECT scope,dept,n FROM tally_tot WHERE 1 ON CONFLICT(scope,dept) DO UPDATE SET n = excluded.n WHERE n <> excluded.n"),
    env.DB.prepare("DELETE FROM tally_tot_pub WHERE NOT EXISTS (SELECT 1 FROM tally_tot t WHERE t.scope = tally_tot_pub.scope AND t.dept = tally_tot_pub.dept)"),
    // périodes retirées (table excluded_windows) : on retire de l'instantané les bulletins dont le dernier choix date de la période ; les bulletins ne sont pas touchés
    env.DB.prepare("UPDATE tally_pub SET n = MAX(0, n - (SELECT COUNT(*) FROM ballots b WHERE b.scope = tally_pub.scope AND b.dept = tally_pub.dept AND b.choice = tally_pub.choice AND EXISTS (SELECT 1 FROM excluded_windows w WHERE w.scope = b.scope AND b.created BETWEEN w.from_ts AND w.to_ts))) WHERE scope IN (SELECT scope FROM excluded_windows)"),
    env.DB.prepare("UPDATE tally_tot_pub SET n = MAX(0, n - (SELECT COUNT(DISTINCT b.device) FROM ballots b WHERE b.scope = tally_tot_pub.scope AND b.dept = tally_tot_pub.dept AND EXISTS (SELECT 1 FROM excluded_windows w WHERE w.scope = b.scope AND b.created BETWEEN w.from_ts AND w.to_ts))) WHERE scope IN (SELECT scope FROM excluded_windows)"),
    // bulletins retirés après examen des preuves (ballot_risk, statut 'retire') : retirés de l'instantané, jamais supprimés
    env.DB.prepare("UPDATE tally_pub SET n = MAX(0, n - (SELECT COUNT(*) FROM ballots b JOIN ballot_risk r ON r.dh = b.device AND r.scope = b.scope AND r.status = 'retire' WHERE b.scope = tally_pub.scope AND b.dept = tally_pub.dept AND b.choice = tally_pub.choice)) WHERE scope IN (SELECT scope FROM ballot_risk WHERE status = 'retire')"),
    env.DB.prepare("UPDATE tally_tot_pub SET n = MAX(0, n - (SELECT COUNT(DISTINCT b.device) FROM ballots b JOIN ballot_risk r ON r.dh = b.device AND r.scope = b.scope AND r.status = 'retire' WHERE b.scope = tally_tot_pub.scope AND b.dept = tally_tot_pub.dept)) WHERE scope IN (SELECT scope FROM ballot_risk WHERE status = 'retire')"),
    env.DB.prepare("INSERT INTO pub_meta(k,v) VALUES('risk_pres',(SELECT CAST(COUNT(*) AS TEXT) FROM ballot_risk r WHERE r.status = 'retire' AND r.scope = 'pres' AND EXISTS (SELECT 1 FROM ballots b WHERE b.device = r.dh AND b.scope = 'pres'))) ON CONFLICT(k) DO UPDATE SET v = excluded.v"),
    env.DB.prepare("INSERT INTO pub_meta(k,v) VALUES('snap_at',?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(now.toISOString()),
    env.DB.prepare("INSERT INTO pub_meta(k,v) VALUES('snap_hour',?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(now.toISOString().slice(0, 13)),
  ]);
  pubMemo = { at: 0, v: null }; cutMemo = { at: 0, v: null }; riskMemo = { at: 0, v: 0 };
}

// Détection automatique : propose (sans rien retirer) les cellules « opérateur + heure » dont les choix de président s'écartent fortement
// des autres répondants des mêmes départements. Une personne valide ensuite chaque proposition (voir README).
async function propose(env) {
  const minExc = parseInt(env.PROPOSE_MIN || "40", 10), minChoices = 60;
  const since = new Date(Date.now() - 48 * 3600000).toISOString().slice(0, 13);
  const rows = (await env.DB.prepare("SELECT hour, asn, dept, choice, n FROM asn_choice WHERE hour >= ?").bind(since).all()).results || [];
  if (!rows.length) return 0;
  const pd = {}; for (const r of (await env.DB.prepare("SELECT dept, choice, n FROM tally WHERE scope='pres'").all()).results || []) { (pd[r.dept] = pd[r.dept] || { tot: 0, c: {} }); pd[r.dept].tot += r.n; pd[r.dept].c[r.choice] = r.n; }
  const hh = {}; for (const r of (await env.DB.prepare("SELECT hour, asn, SUM(sends) AS s, SUM(new_dev) AS nd FROM asn_hour WHERE hour >= ? GROUP BY hour, asn").bind(since).all()).results || []) hh[r.asn + "|" + r.hour] = r;
  const orgs = {}; for (const r of (await env.DB.prepare("SELECT asn, MAX(org) AS org FROM asn_daily GROUP BY asn").all()).results || []) orgs[r.asn] = r.org;
  const cells = new Map(), own = {};  // own[asn][dept][choix] : tout ce que cet opérateur a envoyé sur la période, retiré de la référence pour le comparer au reste des répondants
  for (const r of rows) {
    const k = r.asn + "|" + r.hour; if (!cells.has(k)) cells.set(k, { asn: r.asn, hour: r.hour, c: {}, d: {} });
    const o = cells.get(k); o.c[r.choice] = (o.c[r.choice] || 0) + r.n; o.d[r.dept] = (o.d[r.dept] || 0) + r.n;
    const w = ((own[r.asn] = own[r.asn] || {})[r.dept] = own[r.asn][r.dept] || {}); w[r.choice] = (w[r.choice] || 0) + r.n;
  }
  // La référence (autres répondants du même département) exclut l'opérateur évalué ET les opérateurs déjà signalés : on itère jusqu'à stabilité,
  // pour qu'une vague n'en fasse pas paraître un autre opérateur anormal.
  const evaluate = (skip) => {
    const out = {};
    for (const o of cells.values()) {
      const t = Object.values(o.c).reduce((a, b) => a + b, 0);
      if (t < minChoices) continue;
      const exp = {}; let covered = 0;
      // référence nationale sans cet opérateur ni les opérateurs déjà signalés : sert de repli quand un opérateur domine un département (il reste alors trop peu d'autres répondants)
      const natRest = {}; let natT = 0;
      for (const [d, b] of Object.entries(pd)) for (const [ch, n] of Object.entries(b.c)) {
        let v = n - (((own[o.asn] || {})[d] || {})[ch] || 0);
        for (const f of skip) if (String(f) !== String(o.asn)) v -= ((own[f] || {})[d] || {})[ch] || 0;
        v = Math.max(0, v); natRest[ch] = (natRest[ch] || 0) + v; natT += v;
      }
      for (const [d, nd] of Object.entries(o.d)) {
        const b = pd[d]; if (!b) continue;
        const rest = {}; let rt = 0;
        for (const [ch, n] of Object.entries(b.c)) {
          let v = n - (((own[o.asn] || {})[d] || {})[ch] || 0);
          for (const f of skip) if (String(f) !== String(o.asn)) v -= ((own[f] || {})[d] || {})[ch] || 0;
          v = Math.max(0, v); rest[ch] = v; rt += v;
        }
        if (rt >= 200) { for (const [ch, v] of Object.entries(rest)) exp[ch] = (exp[ch] || 0) + nd * v / rt; covered += nd; }
        else if (natT >= 1000) { for (const [ch, v] of Object.entries(natRest)) exp[ch] = (exp[ch] || 0) + nd * v / natT; covered += nd; }  // repli national
      }
      if (!Object.keys(exp).length || covered < 0.6 * t) continue;  // référence trop partielle : on n'évalue pas
      for (const ch of Object.keys(exp)) exp[ch] = exp[ch] * t / covered;  // la référence est ramenée à l'ensemble des votes de la cellule
      let tvd = 0; for (const ch of new Set([...Object.keys(o.c), ...Object.keys(exp)])) tvd += Math.abs((o.c[ch] || 0) / t - (exp[ch] || 0) / t); tvd /= 2;
      let noise = 0; for (const e of Object.values(exp)) { const p = e / t; if (p > 0 && p < 1) noise += Math.sqrt(2 * p * (1 - p) / (Math.PI * t)); } noise /= 2;
      const h = hh[o.asn + "|" + o.hour] || { s: 0, nd: 0 }, newPct = h.s ? h.nd / h.s : 1;
      const top2 = Object.values(o.c).sort((a, b) => b - a).slice(0, 2).reduce((a, b) => a + b, 0) / t;
      const exc = Math.round(100 * (tvd - noise));
      if (exc >= minExc && newPct >= 0.7) (out[o.asn] = out[o.asn] || []).push({ hour: o.hour, t, exc, top2: Math.round(100 * top2), newPct: Math.round(100 * newPct) });
    }
    return out;
  };
  // Élimination progressive : on signale l'opérateur le plus anormal, on le retire de la référence, puis on réévalue les autres.
  const flagged = {}, chosen = [];
  for (let i = 0; i < 8; i++) {
    const cand = Object.entries(evaluate(chosen)).filter(([a]) => !chosen.includes(a));
    if (!cand.length) break;
    const score = (l) => l.reduce((a, x) => a + x.exc * x.t, 0) / l.reduce((a, x) => a + x.t, 0);
    cand.sort((x, y) => score(y[1]) - score(x[1]));
    chosen.push(cand[0][0]); flagged[cand[0][0]] = cand[0][1];
  }
  let added = 0;
  for (const [asn, list] of Object.entries(flagged)) {
    list.sort((a, b) => (a.hour < b.hour ? -1 : 1));
    const groups = []; let cur = null;
    for (const x of list) {  // heures consécutives regroupées en une seule proposition
      const prev = cur && new Date(cur.to + ":00:00Z").getTime() + 3600000;
      if (cur && new Date(x.hour + ":00:00Z").getTime() <= prev) { cur.to = x.hour; cur.t += x.t; cur.excSum += x.exc * x.t; cur.top += x.top2 * x.t; cur.nw += x.newPct * x.t; } else { cur = { from: x.hour, to: x.hour, t: x.t, excSum: x.exc * x.t, top: x.top2 * x.t, nw: x.newPct * x.t }; groups.push(cur); }
    }
    for (const g of groups) {
      const dup = await env.DB.prepare("SELECT 1 AS x FROM proposals WHERE asn=? AND hour_from<=? AND hour_to>=? UNION ALL SELECT 1 FROM excluded_cells WHERE asn=? AND hour_from<=? AND hour_to>=?").bind(Number(asn), g.to, g.from, Number(asn), g.to, g.from).first();
      if (dup) continue;
      await env.DB.prepare("INSERT INTO proposals(created,asn,org,hour_from,hour_to,choices,excess,top2,new_pct) VALUES(?,?,?,?,?,?,?,?,?)").bind(new Date().toISOString(), Number(asn), (orgs[asn] || "").slice(0, 60), g.from, g.to, g.t, Math.round(g.excSum / g.t), Math.round(g.top / g.t), Math.round(g.nw / g.t)).run();
      added++;
    }
  }
  return added;
}
// Retrait automatique des réseaux « en bloc » (présidentielle) : un réseau d'au moins BLOCK_MIN appareils votant dans les BLOCK_HOURS dernières heures, dont au moins
// BLOCK_SHARE pour le même candidat, voit ces votes-là retirés de l'instantané publié (table ballot_risk, statut 'retire'). Mêmes seuils pour tous les candidats.
// Les appareils déjà couverts par un retrait par opérateur (excluded_cells) et ceux confirmés honnêtes (statut 'garde') sont ignorés. Désactivable : AUTO_BLOCKS = "0".
async function autoBlocks(env) {
  if ((env.AUTO_BLOCKS || "1") !== "1") return 0;
  const need = parseInt(env.BLOCK_MIN || "30", 10), share = parseFloat(env.BLOCK_SHARE || "0.9"), hours = parseInt(env.BLOCK_HOURS || "6", 10);
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const rows = (await env.DB.prepare("SELECT dh, net, pres, asn, t FROM evidence WHERE t >= ? AND pres <> '' AND net <> ''").bind(since).all()).results || [];
  const last = new Map();
  for (const r of rows) { const o = last.get(r.dh); if (!o || r.t > o.t) last.set(r.dh, r); }
  const byNet = new Map();
  for (const r of last.values()) { if (!byNet.has(r.net)) byNet.set(r.net, []); byNet.get(r.net).push(r); }
  const cells = (await env.DB.prepare("SELECT asn, hour_from, hour_to FROM excluded_cells").all()).results || [];
  const hourOf = (t) => new Date(t * 1000).toISOString().slice(0, 13);
  const inCell = (r) => cells.some((c) => c.asn === r.asn && c.hour_from <= hourOf(r.t) && hourOf(r.t) <= c.hour_to);
  const keep = new Set(((await env.DB.prepare("SELECT dh FROM ballot_risk WHERE scope = 'pres' AND status = 'garde'").all()).results || []).map((x) => x.dh));
  const flagged = [], day = new Date().toISOString().slice(0, 10);
  for (const list of byNet.values()) {
    if (list.length < need) continue;
    const cnt = {};
    for (const r of list) cnt[r.pres] = (cnt[r.pres] || 0) + 1;
    const [top, n] = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    if (n / list.length < share) continue;
    const why = "réseau en bloc : " + list.length + " votes, " + Math.round(100 * n / list.length) + " % pour le même candidat (automatique)";
    for (const r of list) if (r.pres === top && !keep.has(r.dh) && !inCell(r)) flagged.push([r.dh, why]);
  }
  const ins = "INSERT INTO ballot_risk(dh,scope,score,reasons,status,decided) VALUES(?,'pres',100,?,'retire',?) ON CONFLICT(dh,scope) DO UPDATE SET score = MAX(ballot_risk.score, 100), reasons = excluded.reasons, status = 'retire', decided = excluded.decided WHERE ballot_risk.status <> 'garde'";
  for (let i = 0; i < flagged.length; i += 40) await env.DB.batch(flagged.slice(i, i + 40).map(([dh, why]) => env.DB.prepare(ins).bind(dh, why, day)));
  return flagged.length;
}
async function cron(env) {
  await recount(env);
  try { await autoBlocks(env); } catch (e) { /* tables absentes : pas de retrait automatique */ }
  try { await publish(env); } catch (e) { /* tables de publication absentes : résultats en direct */ }
  try { await propose(env); } catch (e) { /* tables de propositions absentes */ }
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(cron(env)); },
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    try {
      if (url.pathname === "/results" && req.method === "POST") return json(await results(req, env), cors);
      if (url.pathname === "/challenge" && req.method === "POST") return json(await challenge(req, env), cors);
      if (url.pathname === "/vote" && req.method === "POST") return json(await vote(req, env), cors);
      if (url.pathname === "/health") return json({ ok: true, v: 19 }, cors);
      return json({ error: "introuvable" }, cors, 404);
    } catch (e) {
      return json({ error: e.message || "erreur" }, cors, e.status || 500);
    }
  },
};
