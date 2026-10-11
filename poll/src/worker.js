// Service du sondage NapVote (Cloudflare Worker + D1).
// GET  /results?dept=Ouest   -> { total, choices:{cle:n}, depts:{nom:n}, updated }
// POST /vote  {device, choice, dept, token?} -> { ok:true }
const DEPTS = ["Artibonite", "Centre", "Grand'Anse", "Nippes", "Nord", "Nord-Est", "Nord-Ouest", "Ouest", "Sud", "Sud-Est"];
const FIXED = ["indecis", "abstention"];
let optCache = { at: 0, keys: null };

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
function json(data, cors, status = 200, cache = 0) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache ? `public, max-age=${cache}` : "no-store" } });
}

async function allowedChoices(env) {
  if (optCache.keys && Date.now() - optCache.at < 10 * 60 * 1000) return optCache.keys;
  try {
    const r = await fetch(env.OPTIONS_URL, { cf: { cacheTtl: 300 } });
    if (r.ok) {
      const list = await r.json();
      optCache = { at: Date.now(), keys: new Set([...list.map((o) => o.k), ...FIXED]) };
      return optCache.keys;
    }
  } catch (e) { /* on garde la dernière liste connue */ }
  if (optCache.keys) return optCache.keys;
  throw new HttpError(503, "liste des candidats indisponible");
}

async function turnstileOk(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip || "" });
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const j = await r.json();
  return !!j.success;
}

async function vote(req, env) {
  if (!env.SALT) throw new HttpError(500, "service mal configuré");
  let b;
  try { b = await req.json(); } catch (e) { throw new HttpError(400, "requête invalide"); }
  const device = String(b.device || ""), choice = String(b.choice || ""), dept = String(b.dept || "");
  if (!/^[A-Za-z0-9-]{16,64}$/.test(device)) throw new HttpError(400, "appareil invalide");
  if (dept && !DEPTS.includes(dept)) throw new HttpError(400, "département invalide");
  const allowed = await allowedChoices(env);
  if (!allowed.has(choice)) throw new HttpError(400, "choix invalide");
  const ip = req.headers.get("CF-Connecting-IP") || "";
  if (!(await turnstileOk(env, b.token, ip))) throw new HttpError(403, "vérification anti-robot refusée");

  const now = Math.floor(Date.now() / 1000), day = new Date().toISOString().slice(0, 10);
  const rk = await sha256(ip + "|" + day + "|" + env.SALT);
  const limit = parseInt(env.RATE_LIMIT || "60", 10);
  await env.DB.prepare("DELETE FROM rl WHERE day < ?").bind(day).run();
  const row = await env.DB.prepare("INSERT INTO rl(k,n,day) VALUES(?,1,?) ON CONFLICT(k) DO UPDATE SET n=n+1 RETURNING n").bind(rk, day).first();
  if (row && row.n > limit) throw new HttpError(429, "trop de votes depuis ce réseau aujourd'hui");

  const dh = await sha256(device + "|" + env.SALT);
  await env.DB.prepare("INSERT INTO votes(device,choice,dept,created,updated) VALUES(?,?,?,?,?) ON CONFLICT(device) DO UPDATE SET choice=excluded.choice, dept=excluded.dept, updated=excluded.updated")
    .bind(dh, choice, dept, now, now).run();
  return { ok: true };
}

async function results(env, url) {
  const dept = url.searchParams.get("dept") || "";
  if (dept && !DEPTS.includes(dept)) throw new HttpError(400, "département invalide");
  const q = dept
    ? env.DB.prepare("SELECT choice, COUNT(*) n FROM votes WHERE dept=? GROUP BY choice").bind(dept)
    : env.DB.prepare("SELECT choice, COUNT(*) n FROM votes GROUP BY choice");
  const [byChoice, byDept, last] = await Promise.all([
    q.all(),
    env.DB.prepare("SELECT dept, COUNT(*) n FROM votes WHERE dept<>'' GROUP BY dept").all(),
    env.DB.prepare("SELECT MAX(updated) t FROM votes").first(),
  ]);
  const choices = {}; let total = 0;
  for (const r of byChoice.results) { choices[r.choice] = r.n; total += r.n; }
  const depts = {}; for (const r of byDept.results) depts[r.dept] = r.n;
  return { total, choices, depts, dept, updated: last && last.t ? last.t : null };
}

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    try {
      if (url.pathname === "/results" && req.method === "GET") return json(await results(env, url), cors, 200, 30);
      if (url.pathname === "/vote" && req.method === "POST") return json(await vote(req, env), cors);
      if (url.pathname === "/health") return json({ ok: true }, cors);
      return json({ error: "introuvable" }, cors, 404);
    } catch (e) {
      return json({ error: e.message || "erreur" }, cors, e.status || 500);
    }
  },
};
