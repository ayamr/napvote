#!/usr/bin/env python3
"""Bilan figé du sondage : lit les résultats PUBLIÉS (les mêmes que ceux du site) et écrit www/data/bilan.json.

Usage : python3 scripts/build_bilan.py [AAAA-MM-JJ]

Le fichier est autonome : noms, partis et classements y sont copiés, pour que la page du bilan reste exacte
même quand la liste du CEP change ou que les compteurs du sondage sont remis à zéro.
À lancer une dernière fois juste avant la remise à zéro (poll/reset-edition-2.sql), puis ne plus y toucher.
"""
import json, os, re, sys, unicodedata, urllib.request, datetime

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
API = "https://poll.napvote-ht.com"
DAY = sys.argv[1] if len(sys.argv) > 1 else datetime.date.today().isoformat()
FIXED = ("~aucun", "~indecis", "~abstention")
DEPTS = ["Artibonite", "Centre", "Grand'Anse", "Nippes", "Nord", "Nord-Est", "Nord-Ouest", "Ouest", "Sud", "Sud-Est"]
POP_KEY = {"Grand'Anse": "GRANDE-ANSE"}


def norm(s):
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"\s+", " ", re.sub(r"[-'’]", " ", s)).strip()


def post(path, body):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode(), method="POST", headers={
        "content-type": "application/json", "origin": "https://napvote-ht.com", "user-agent": "napvote-bilan/1"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def title(s):
    small = {"de", "du", "des", "la", "le", "au", "à", "sur", "d", "l", "et"}
    out, first = [], True
    for p in re.split(r"([\s\-'’/]+)", s.lower()):
        if not p or re.fullmatch(r"[\s\-'’/]+", p):
            out.append(p); continue
        out.append(p if (p in small and not first) else p[:1].upper() + p[1:]); first = False
    return "".join(out)


# Candidats : ceux que le site affiche en ce moment (data/live.json, rafraîchi toutes les 2 h par la publication), pas la copie locale qui date.
try:
    with urllib.request.urlopen(urllib.request.Request("https://napvote-ht.com/data/live.json", headers={"user-agent": "napvote-bilan/1"}), timeout=60) as r:
        V = json.load(r)["vv"]
except Exception:
    V = json.load(open(ROOT + "/www/data/live.json", encoding="utf-8"))["vv"]
PARTIES, LOCS = V["parties"], V["locs"]
DN = ["Artibonite", "Centre", "Grand'Anse", "Nippes", "Nord", "Nord-Est", "Nord-Ouest", "Ouest", "Sud", "Sud-Est"]
used = {}  # nom du parti -> indice dans le fichier
plist = []


def pidx(pa):
    name = PARTIES[pa]
    if name not in used:
        used[name] = len(plist); plist.append(name)
    return used[name]


# « portée|clé » -> (prénom, nom, parti) ; mêmes clés que le sondage (scripts/build_poll_options.py)
WHO = {}
for c in V["cands"]:
    nom, pre, _, po, _, d, pa, lo, sc = c[:9]
    k = norm(nom + " " + pre)
    if po == 0: WHO["pres|" + k] = (pre, nom, pa)
    elif po == 1 and d >= 0: WHO["sen|" + norm(DN[d]) + "|" + k] = (pre, nom, pa)
    elif po == 2 and lo >= 0: WHO["dep|" + norm(LOCS[lo]["l"]) + "|" + k] = (pre, nom, pa)


def rows_of(scope, choices, keep):
    out = []
    for k, n in sorted(choices.items(), key=lambda x: -x[1]):
        if k in FIXED or n <= 0: continue
        w = WHO.get(scope + "|" + k)
        if not w:
            w = (k.title(), "", None)  # candidat qui n'est plus sur la liste du CEP : on garde le nom tel quel
        out.append([w[0], w[1], pidx(w[2]) if w[2] is not None else -1, n])
        if keep and len(out) >= keep: break
    return out


def pack(scope, d, keep):
    ch = d.get("choices", {})
    o = {"total": d.get("total", 0), "rows": rows_of(scope, ch, keep)}
    fx = {k[1:]: ch[k] for k in FIXED if ch.get(k)}
    if fx: o["fx"] = fx
    if d.get("adj"): o["adj"] = d["adj"]
    return o


def fetch(scopes, dept=""):
    out, asof = {}, None
    for i in range(0, len(scopes), 12):
        r = post("/results", {"scopes": scopes[i:i + 12], "dept": dept, "t": 0})
        out.update({k: v for k, v in r["scopes"].items() if v}); asof = r.get("asof") or asof
    return out, asof, r.get("depts") or {}


# 1. présidentielle, au total puis par département
pres_all, asof, depts_tot = fetch(["pres"])
pres = pack("pres", pres_all["pres"], 0)
pres["depts"] = {}
for d in DEPTS:
    r, _, _ = fetch(["pres"], d)
    pres["depts"][d] = pack("pres", r["pres"], 6)

# 2. sénat par département, députés par circonscription
sen_scopes = ["sen|" + norm(d) for d in DEPTS]
sen_raw, _, _ = fetch(sen_scopes)
sen = {d: pack("sen|" + norm(d), sen_raw.get("sen|" + norm(d), {}), 6) for d in DEPTS}
circos = sorted({LOCS[c[7]]["l"] for c in V["cands"] if c[3] == 2 and c[7] >= 0})
dep_raw, _, _ = fetch(["dep|" + norm(c) for c in circos])
dep = {norm(c): dict(pack("dep|" + norm(c), dep_raw.get("dep|" + norm(c), {}), 6), n=c) for c in circos}

# 3. parlement simulé : le premier de chaque circonscription est député ; les trois premiers de chaque département sont sénateurs ; aucun second tour
def seats(units, take):
    cnt, tie, none = {}, 0, 0
    for u in units:
        rows = u["rows"]
        if not rows or u["total"] == 0: none += 1; continue
        if len(rows) > take and rows[take - 1][3] == rows[take][3]:  # égalité à la dernière place : non attribuée
            tie += 1; continue
        for r in rows[:take]:
            cnt[r[2]] = cnt.get(r[2], 0) + 1
    return {"seats": sorted(cnt.items(), key=lambda x: -x[1]), "tie": tie, "none": none, "units": len(units)}


parl = {"dep": seats(dep.values(), 1), "sen": seats(sen.values(), 3)}

# 4. participation par département (réponses à la présidentielle) et population
pop = json.load(open(ROOT + "/data/ihsi_population_2024.json", encoding="utf-8"))["total"]
dstat = {d: {"n": depts_tot.get(d, 0), "pop": pop.get(POP_KEY.get(d, d.upper()), 0)} for d in DEPTS}

# 5. croissance : participants à la présidentielle, jour par jour
tr = post("/trend", {"scope": "pres"})
growth = [[x["d"], x["t"]] for x in tr.get("days", []) if x.get("t")]

# 6. bulletins reçus par jour : requête D1 faite une fois à la main (data/bilan-daily.json), car elle demande l'accès à la base
try:
    _x = json.load(open(ROOT + "/data/bilan-daily.json", encoding="utf-8")); daily = _x["daily"]; people = {k: v for k, v in _x["participants"].items() if k != "note"}
except Exception: daily, people = [], {}

# nombre de candidats à la présidence sur la liste du CEP au moment du bilan ; premier relevé de la liste : 15 noms le 9 octobre 2026 (voir docs/note-sondage-2026-11-16.md)
ncp = len({k for k in WHO if k.startswith("pres|")})
out = {"v": 1, "day": DAY, "cands": {"pres": ncp}, "listStart": {"day": "2026-10-09", "n": 15}, "asof": asof, "parties": plist, "pres": pres, "sen": sen, "dep": dep, "parl": parl, "depts": dstat, "growth": growth, "daily": daily, "people": people}
dst = ROOT + "/www/data/bilan.json"
json.dump(out, open(dst, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("bilan :", DAY, "· publié", asof, "· pres", pres["total"], "· %d circonscriptions" % len(dep), "· %d Ko" % (os.path.getsize(dst) // 1024))
print("députés", parl["dep"]["seats"][:6], "égalités", parl["dep"]["tie"], "sans vote", parl["dep"]["none"])
print("sénateurs", parl["sen"]["seats"][:6], "égalités", parl["sen"]["tie"])
