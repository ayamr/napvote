"""Construit www/data/civ.json (centres d'inscription et de vote, format compact) à partir de data/civ_cep.json.
Lancé depuis la racine par update.py. Ne plante pas si la collecte n'a jamais réussi : l'application gère l'absence du fichier."""
import json, os, re, unicodedata
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

# --- bureaux de l'ONI (carte d'identification nationale) : mêmes noms de départements et de communes que la liste du CEP ---
def norm(x):
    x = unicodedata.normalize("NFD", x)
    x = "".join(c for c in x if unicodedata.category(c) != "Mn").upper()
    x = re.sub(r"[-'’.,]", " ", x)
    x = re.sub(r"\bSAINTE?\b", "ST", x)
    x = re.sub(r"\s+", " ", x).strip()
    return re.sub(r"^(L|LA|LE|LES) ", "", x).replace(" ", "")
def dkey(x):
    k = norm(re.sub(r"\s*\d+$", "", x.strip()))   # « OUEST 1 » -> OUEST
    return "GRANDANSE" if k == "GRANDEANSE" else k   # le CEP écrit « GRAND'ANSE », l'ONI « GRANDE-ANSE »
# écarts d'écriture vérifiés à la main (jamais de rapprochement approximatif : « Cabaret » n'est pas « Tabarre »)
ALIAS = {("ARTIBONITE", "PETITE RIVIERE"): "PETITE RIVIÈRE DE L'ARTIBONITE", ("ARTIBONITE", "SAINT MICHEL"): "SAINT-MICHEL DE L'ATTALAYE",
         ("GRANDE ANSE", "ABRICOTS"): "ABRICOT", ("NIPPES", "PETITE RIVIERE"): "PETITE RIVIÈRE DE NIPPES", ("NIPPES", "L'AZILE"): "ASILE",
         ("NORD", "PLAISANCE"): "PLAISANCE DU NORD", ("NORD", "GRDE RIVIERE DU NORD"): "GRANDE RIVIÈRE DU NORD", ("NORD", "RANQUITE"): "RANQUITTE",
         ("NORD OUEST", "SAINT LOUIS NORD"): "SAINT-LOUIS DU NORD", ("SUD EST", "LA VALLEE"): "LA VALLÉE DE JACMEL",
         ("SUD EST", "COTE- DE- FER"): "CÔTES-DE-FER", ("SUD EST", "ANSE-A-PITRE"): "ANSE-À-PITRES"}
alias = {(dkey(a), norm(b)): norm(v) for (a, b), v in ALIAS.items()}
oni_path = os.path.join(ROOT, "data", "oni_bureaux.json")
oni_rows, oni_src, oni_t = [], None, None
if os.path.exists(oni_path):
    od = json.load(open(oni_path, encoding="utf-8"))
    oni_src, oni_t = od["source"], od["collected"]
    cep = {}
    for c in items:
        cep[(dkey(c["dep"]), norm(c["com"]))] = c["com"]
    for o in od["items"]:
        dk, ck = dkey(o["dep"]), norm(o["com"])
        ck = alias.get((dk, ck), ck)
        name = cep.get((dk, ck)) or o["com"].replace("- ", "-").strip()   # commune sans centre du CEP : on garde le nom de l'ONI
        dep = next((c["dep"] for c in items if dkey(c["dep"]) == dk), None)
        if dep is None:
            continue
        oni_rows.append([deps.index(dep), name, o["adr"]])
    oni_rows.sort(key=lambda r: (r[0], r[1], r[2]))
out = {"t": d["collected"], "maj": d["maj_cep"], "src": "https://cephaiti.ht/civ/", "d": deps, "t_": types, "r": rows, "o": oni_rows, "oni": {"src": oni_src, "t": oni_t}}
os.makedirs(os.path.join(ROOT, "www", "data"), exist_ok=True)
js = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
open(os.path.join(ROOT, "www", "data", "civ.json"), "w", encoding="utf-8").write(js)
print("civ.json", len(js) // 1024, "Ko ;", len(rows), "centres ;", sum(1 for r in rows if r[6] is None), "sans coordonnées ;", len(oni_rows), "bureaux ONI dans", len({(r[0], r[1]) for r in oni_rows}), "communes ;", len({(r[0], r[1]) for r in oni_rows} - {(r[0], r[1]) for r in rows}), "sans centre du CEP")
