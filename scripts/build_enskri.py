"""Construit www/data/enskri.json pour la page « Enskri » : inscrits du CEP par âge, comparés à la population adulte (IHSI 2024).
Entrées : data/src/api_stats-{summary,demographic,geography}.json, data/src/api_geography.json (CEP), data/ihsi_population_2024.json, data/civ_cep.json.
Lancé depuis la racine par update.py. Tous les chiffres de la page viennent d'ici : la page ne calcule rien.
Les groupes d'âge de l'IHSI (5 ans) sont répartis uniformément pour coller aux tranches du CEP (18-28, 29-38...) : les chiffres sont des ordres de grandeur."""
import datetime, json, os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
D = os.path.join(ROOT, "data")
need = ["src/api_stats-summary.json", "src/api_stats-demographic.json", "src/api_stats-geography.json", "src/api_geography.json", "ihsi_population_2024.json"]
if any(not os.path.exists(os.path.join(D, f)) for f in need):
    print("enskri.json : données manquantes, rien à construire")
    raise SystemExit(0)
L = lambda f: json.load(open(os.path.join(D, f), encoding="utf-8"))
summary, demo, geo_stats, geo, ihsi = L(need[0])[0], L(need[1]), L(need[2]), L(need[3]), L(need[4])

# --- inscrits par tranche d'âge (CEP) ---
BANDS = [("18_28", "18-28"), ("29_38", "29-38"), ("39_48", "39-48"), ("49_58", "49-58"), ("59_68", "59-68"), ("69_PLUS", "69+")]
ins = {r["category"]: r["count"] for r in demo if r["dimension"] == "AGE"}
sex = {r["category"]: r["count"] for r in demo if r["dimension"] == "SEX"}
assert set(ins) == {b[0] for b in BANDS}, ins
tot_age = sum(ins.values())
# le CEP calcule l'âge et le sexe par requêtes séparées sur un registre qui bouge : un écart de quelques inscrits est normal (4 sur 1 037 411 le 26 nov. 2026).
# On ne bloque que sur un écart de plus de 0,5 %, signe d'une donnée vraiment incohérente.
assert abs(tot_age - sum(sex.values())) <= 0.005 * tot_age, "âge et sexe ne totalisent pas la même chose (%d contre %d)" % (tot_age, sum(sex.values()))

# --- population adulte par tranche (IHSI), à partir de groupes de 5 ans (répartition uniforme dans un groupe) ---
def bands(pop):
    g = lambda a: pop[a]
    f = 0.2  # une année d'âge = 1/5 d'un groupe de 5 ans
    return {
        "18_28": 2 * f * g("15-19 ans") + g("20-24 ans") + 4 * f * g("25-29 ans"),
        "29_38": f * g("25-29 ans") + g("30-34 ans") + 4 * f * g("35-39 ans"),
        "39_48": f * g("35-39 ans") + g("40-44 ans") + 4 * f * g("45-49 ans"),
        "49_58": f * g("45-49 ans") + g("50-54 ans") + 4 * f * g("55-59 ans"),
        "59_68": f * g("55-59 ans") + g("60-64 ans") + 4 * f * g("65-69 ans"),
        "69_PLUS": f * g("65-69 ans") + g("70-74 ans") + g("75-79 ans") + g("80 ans et plus"),
    }
pop = bands(ihsi["population"]["HAITI"])
adults = sum(pop.values())
pct = lambda a, b: round(100 * a / b, 1)
age = [{"k": lab, "ins": ins[k], "pct_ins": pct(ins[k], tot_age), "pop": round(pop[k]), "pct_pop": pct(pop[k], adults), "taux": pct(ins[k], pop[k])} for k, lab in BANDS]
y = age[0]

# --- par département : inscrits du CEP / adultes IHSI ---
# le CEP numérote certains départements (« OUEST 1 ») : on regroupe sous le nom de l'IHSI
names = {g["id"]: re.sub(r"\s*\d+$", "", g["name"]).strip() for g in geo if g["level"] == "DEPARTMENT"}
acc = {}
for r in geo_stats:
    n = names.get(r["geographyId"])
    if not n or n not in ihsi["population"]:
        continue
    d = acc.setdefault(n, {"ins": 0, "cap": 0})
    d["ins"] += r["registeredVoterCount"]
    d["cap"] += r["capacity"]
dept = []
for n, d in acc.items():
    a = sum(bands(ihsi["population"][n]).values())
    dept.append({"n": n, "ins": d["ins"], "adultes": round(a), "taux": pct(d["ins"], a), "cap": d["cap"]})
dept.sort(key=lambda d: -d["taux"])

# --- contrôles : si une donnée est incohérente, on le signale dans le fichier (la page masque alors la comparaison) ---
problemes = []
if abs(tot_age - summary["registeredVoterCount"]) > 0.02 * tot_age:
    problemes.append("total par âge (%d) et total CEP (%d) divergent de plus de 2 %%" % (tot_age, summary["registeredVoterCount"]))
if len(dept) != 10 or abs(sum(d["ins"] for d in dept) - summary["registeredVoterCount"]) > 0.01 * summary["registeredVoterCount"]:
    problemes.append("départements : %d reconnus, somme %d pour %d inscrits" % (len(dept), sum(d["ins"] for d in dept), summary["registeredVoterCount"]))
if not (0 < y["taux"] < 100):
    problemes.append("taux des 18-28 ans hors bornes")
# --- fermeture du registre électoral : lue dans le calendrier du CEP (www/data/live.json, étape 14.3) ---
fermeture = None
lj = os.path.join(ROOT, "www", "data", "live.json")
if os.path.exists(lj):
    for c in json.load(open(lj, encoding="utf-8")).get("election", {}).get("cal", []):
        if c.get("n") == "14.3" or "Fermeture du registre" in c.get("t", ""):
            dt = datetime.date.fromisoformat(c["a"])
            fermeture = {"date": c["a"], "jours": (dt - datetime.date.today()).days, "source": "Calendrier électoral actualisé du CEP (publié le 28 octobre 2026) ; les dates peuvent changer"}
            break
if not fermeture:
    problemes.append("date de fermeture du registre introuvable dans le calendrier")
elif fermeture["jours"] < 0:
    fermeture = None  # registre déjà fermé : la page ne doit plus dire « encore ouvert »
    problemes.append("registre fermé selon le calendrier : revoir le texte de la page")

# --- mise en perspective : présidentielle du 20 novembre 2016 (résultats du CEP, data/res2015/election-data.json) ---
pres16 = None
rp = os.path.join(D, "res2015", "election-data.json")
if os.path.exists(rp):
    P = json.load(open(rp, encoding="utf-8"))["pres"]
    if P["order"][0] == "JOVENEL MOISE":
        v, tot = P["national"]["JOVENEL MOISE"], P["national_total"]
        pres16 = {"date": "2016-11-20", "gagnant": "Jovenel Moïse", "voix_gagnant": v, "voix_total": tot, "pct_gagnant": pct(v, tot),
                  "inscrits_vs_gagnant": round(summary["registeredVoterCount"] / v, 1),  # inscrits aujourd'hui / voix du gagnant en 2016
                  "jeunes_vs_gagnant": round(pop["18_28"] / v, 1)}                       # adultes de 18-28 ans (estimés) / voix du gagnant
    else:
        problemes.append("présidentielle 2016 : le premier du classement n'est plus celui attendu")

fetched = json.load(open(os.path.join(D, "src", "fetched.json"))) if os.path.exists(os.path.join(D, "src", "fetched.json")) else {}
oni = L("oni_bureaux.json") if os.path.exists(os.path.join(D, "oni_bureaux.json")) else None
civ = L("civ_cep.json") if os.path.exists(os.path.join(D, "civ_cep.json")) else None
out = {
    "t": fetched.get("iso"), "ok": not problemes, "problemes": problemes,
    "inscrits": summary["registeredVoterCount"], "inscrits_age": tot_age, "centres": summary.get("votingCenterCount"),
    "femmes_pct": pct(sex.get("F", 0), tot_age),
    "adultes": round(adults), "taux_adultes": pct(tot_age, adults),
    "age": age,
    "jeunes": {"pct_pop": y["pct_pop"], "pct_ins": y["pct_ins"], "taux": y["taux"], "un_sur": round(100 / y["taux"]) if y["taux"] else None,
               "pct_pop_18_38": pct(pop["18_28"] + pop["29_38"], adults), "pct_ins_18_38": pct(ins["18_28"] + ins["29_38"], tot_age)},
    "dept": dept,
    "fermeture": fermeture, "pres2016": pres16,
    "oni": {"bureaux": len(oni["items"]), "communes": len({(x["dep"], x["com"]) for x in oni["items"]}), "maj": oni["collected"][:10], "source": oni["source"]} if oni else None,
    "civ": {"centres": len(civ["items"]), "bureaux": sum(x["bv"] for x in civ["items"]), "maj": civ["maj_cep"]} if civ else None,
    "sources": {"cep": "CEP, tableau de bord public des inscriptions (stats.cephaiti.ht)", "ihsi": ihsi["source"], "ihsi_publie": ihsi["publie"], "ihsi_url": ihsi["url"]},
    "limites": ihsi["note"],
    # le CEP ne parle d'« électorat potentiel » que pour les détenteurs de la carte d'identification nationale (CIN) : plus de 6,5 millions
    # selon Le Nouvelliste du 21/09/2026. Une partie de l'écart des jeunes peut venir d'une détention de CIN moindre : la page doit le dire.
    "cin": {"electorat_potentiel": 6500000, "source": "Le Nouvelliste, 21 septembre 2026 (« plus de 6,5 millions de personnes en âge de voter et détentrices d'une carte d'identification nationale »)"},
}
js = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
os.makedirs(os.path.join(ROOT, "www", "data"), exist_ok=True)
open(os.path.join(ROOT, "www", "data", "enskri.json"), "w", encoding="utf-8").write(js)
print("enskri.json", len(js), "o ; ok =", out["ok"], problemes or "", "; 18-28 ans : %.1f %% des adultes, %.1f %% des inscrits, taux %.1f %%" % (y["pct_pop"], y["pct_ins"], y["taux"]))
