"""Construit www/data/civ.json (centres d'inscription et de vote, format compact) à partir de data/civ_cep.json.
Lancé depuis la racine par update.py. Ne plante pas si la collecte n'a jamais réussi : l'application gère l'absence du fichier."""
import json, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
src = os.path.join(ROOT, "data", "civ_cep.json")
if not os.path.exists(src):
    print("civ.json : data/civ_cep.json absent, rien à construire")
    raise SystemExit(0)
d = json.load(open(src, encoding="utf-8"))
# le CEP liste parfois deux fois le même centre sous deux identifiants : on garde la fiche la plus complète
best = {}
for c in d["items"]:
    k = (c["dep"], c["com"], c["sec"], c["nom"])
    if k not in best or (bool(c["type"]), bool(c["adr"])) > (bool(best[k]["type"]), bool(best[k]["adr"])):
        best[k] = c
items = sorted(best.values(), key=lambda c: (c["dep"], c["com"], c["sec"], c["nom"]))
deps = sorted({c["dep"] for c in items})
types = sorted({c["type"] for c in items if c["type"]})
# lignes : [dép., commune, section, nom, adresse, bureaux, lat, lon, type]  (dép. et type = indices dans les listes d, t)
rows = [[deps.index(c["dep"]), c["com"], c["sec"], c["nom"], c["adr"], c["bv"], c["lat"], c["lon"], types.index(c["type"]) if c["type"] else -1] for c in items]
out = {"t": d["collected"], "maj": d["maj_cep"], "src": "https://cephaiti.ht/civ/", "d": deps, "t_": types, "r": rows}
os.makedirs(os.path.join(ROOT, "www", "data"), exist_ok=True)
js = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
open(os.path.join(ROOT, "www", "data", "civ.json"), "w", encoding="utf-8").write(js)
print("civ.json", len(js) // 1024, "Ko ;", len(rows), "centres ;", sum(1 for r in rows if r[6] is None), "sans coordonnées")
