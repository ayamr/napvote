"""Assemble www/data/live.json : tout ce qui change à chaque collecte (candidats, liens 2015-2017, inscription, nouveautés).
Lancé depuis data/ par update.py."""
import json, os, re, unicodedata

def norm(s):
    s = unicodedata.normalize("NFD", s)
    return re.sub(r"\s+", " ", re.sub(r"[-'’]", " ", "".join(c for c in s if unicodedata.category(c) != "Mn").lower())).strip()

vv = json.load(open("_build/vv_live.json", encoding="utf-8"))
hl = json.load(open("_build/hist_live.json", encoding="utf-8"))
el = json.load(open("_build/election.json", encoding="utf-8"))
ch = json.load(open("changes.json", encoding="utf-8")) if os.path.exists("changes.json") else None
hist = json.load(open("history.json")) if os.path.exists("history.json") else []

# nouveautés : on retrouve l'indice de chaque candidat ajouté dans le fichier courant
POSTES = ["Président", "Sénateur", "Député", "Maire", "CASEC", "ASEC"]
idx = {}
for i, c in enumerate(vv["cands"]):
    idx.setdefault((c[3], norm(c[0]), norm(c[1])), []).append(i)
changes = None
if ch:
    added = []
    for a in ch["added"]:
        hits = idx.get((POSTES.index(a["po"]), norm(a["nom"]), norm(a["pre"])), [])
        if hits:
            added.append(hits[0])
    changes = {"t": ch["t"], "prev_t": ch["prev_t"], "total": ch["total"], "prev_total": ch["prev_total"], "by": ch["by"],
               "nAdded": sum(v["added"] for v in ch["by"].values()), "nRemoved": sum(v["removed"] for v in ch["by"].values()), "added": added[:60]}
live = {"geo": vv.pop("geo"), "vv": vv, "hist": hl, "election": el, "changes": changes, "growth": [[h["t"], h["total"]] for h in hist[-120:]]}
os.makedirs("../www/data", exist_ok=True)
js = json.dumps(live, ensure_ascii=False, separators=(",", ":"))
open("../www/data/live.json", "w", encoding="utf-8").write(js)
print("live.json", len(js) // 1024, "Ko ;", len(vv["cands"]), "candidats ; nouveautés :", changes and (changes["nAdded"], changes["nRemoved"]))
