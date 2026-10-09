"""Reprises 2015-2017 : complète les 29 circonscriptions sans élu fin 2015 et le Sénat.

Sources croisées :
 - HaïtiLibre (publications du CEP) : résultats préliminaires du 5 déc. 2016 (art. 19427), définitifs partiels du 30 déc. 2016 (art. 19655),
   Sénat 2e tour du 29 janv. 2017, définitifs du 9 fév. 2017 (art. 20046) ;
 - Wikipédia (2015–17 Haitian parliamentary election) : tableaux de voix tour par tour, extraits par parse_wiki_1517.py.
Les noms sont écrits dans l'ordre Prénom NOM (comme le reste des données)."""
import json, re, os

D = os.path.join(os.path.dirname(__file__), "..", "data", "reprises")
WIKI = json.load(open(D + "/wiki_results.json", encoding="utf-8"))
WSEN = json.load(open(D + "/wiki_sen1617.json", encoding="utf-8"))

PARTY = {
    "Haitian Tèt Kale Party": "PHTK", "Vérité": "VERITE", "Konvansyon Inite Demokratik": "KID", "Struggling People's Organization": "OPL",
    "Fanmi Lavalas": "FANMI LAVALAS", "Reseau National Bouclier": "BOUCLIER", "Inite Patriyotik": "INITE PATRIYOTIK", "Renmen Ayiti": "RENMEN AYITI",
    "Platfòm Pitit Desalin": "PITIT DESSALINES", "Ansanm Patriyot pou Lavni Ayiti": "APLA", "Haiti in Action": "AAA",
    "Fusion of Haitian Social Democrats": "FUSION", "Platfòm Leve Kanpe": "PLATFÒM LEVE KANPE", "Konbit Nasyonal": "KONA",
    "Consortium National des Partis Politiques Haïtiens": "CONSORTIUM", "Alternative League for Haitian Progress and Emancipation": "LAPEH",
    "Rassemblement des patriotes haïtiens": "RPH",
}
MONTHS = {"January": "janvier", "February": "février", "March": "mars", "April": "avril", "May": "mai", "June": "juin", "July": "juillet", "August": "août",
          "September": "septembre", "October": "octobre", "November": "novembre", "December": "décembre"}


def party(p):
    p = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", p or "")
    return PARTY.get(p, p)


def fr_date(s):
    m = re.search(r"(\d{1,2}) (\w+) (\d{4})", s)
    return "%s %s %s" % (("1er" if m.group(1) == "1" else m.group(1)), MONTHS[m.group(2)], m.group(3)) if m else s


def given_family(s):
    """Wikipédia écrit « NOM Prénom » : on remet « Prénom NOM »."""
    t = s.split()
    return (" ".join(t[1:]) + " " + t[0].upper()) if len(t) > 1 else s


def clean_name(s):
    return re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", s)


# circo id -> (nom affiché Prénom NOM, source). 'def' = résultats définitifs partiels du CEP (30 déc. 2016) ; 'prel' = préliminaires du CEP
# (5 déc. 2016) ; 'wiki' = seul le tableau Wikipédia est disponible.
WINNERS = {
    0: ("Roger MILLIEN", "prel"), 7: ("Joseph Antonio VERICAIN", "def"), 8: ("Lemaire PIERRE", "def"), 12: ("Jean Marcel LUMERANT", "wiki"),
    16: ("Raymonde RIVAL", "prel"), 17: ("Pierre Fequiere JULIEN", "def"), 18: ("Joseph Manes LOUIS", "def"), 22: ("Dieudonne LHERISSON", "prel"),
    26: ("Roudy DEVIL", "def"), 34: ("Rodney CHARLES", "def"), 36: ("Jacques JULMIOCE", "prel"), 37: ("Jean-Wilfrid BORGELLA", "def"),
    38: ("Hermogene DANIEL", "prel"), 40: ("Jude FAUSTIN", "wiki"), 41: ("Philome Hilaire FANFAN", "prel"), 43: ("Audne ALCIDE", "prel"),
    60: ("Samuel D'HAITI", "def"), 61: ("Gerard PAUL LORMEUS", "def"), 64: ("Prophane VICTOR", "prel"), 65: ("Hubert Dieu ALSACE", "wiki"),
    66: ("Baudelaire NOELSAINT", "def"), 75: ("Jude JEAN", "prel"), 78: ("Guerda Bellevue Benjamin ALEXANDRE", "def"), 83: ("Bertin AUGUSTIN", "def"),
    90: ("Daniel LETANG", "prel"), 94: ("St Jean Marie Gladice LUNDY", "def"), 100: ("Ronald TOUSSAINT", "wiki"), 102: ("Ronald ETIENNE", "wiki"),
    109: ("Yves DUPRAS", "def"),
}
# la table Wikipédia utilise l'ordre « NOM Prénom » ; on associe par jeu de mots
def toks(s):
    import unicodedata
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower().replace("-", " ").replace("'", " ")
    return frozenset(re.sub(r"[^a-z ]", " ", s).split())


def wnorm(s):
    import unicodedata
    s = re.sub(r"<.*", "", s)
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9/]+", " ", s)).strip()


WALIAS = {"port au prince 1re": "port au prince 1st", "port au prince 2e": "port au prince 2nd", "port au prince 3e": "port au prince 3rd",
          "petite riviere de l artibonite": "petite riviere de artibonite"}
WT = {wnorm(o["cap"]): o for o in WIKI if not o["senate"]}


def last_round(o):
    for r in range(len(o["rounds"]) - 1, -1, -1):
        if any(c["v"][r] for c in o["cands"]):
            return r
    return None


def pcs(v, tot):
    return round(100.0 * v / tot, 2)


def apply_deputies(circos):
    """Met à jour les circonscriptions sans élu : e (élu), st='late', rp (détail du dernier tour)."""
    done = 0
    for c in circos:
        if c["e"] or c["id"] not in WINNERS:
            continue
        name, src = WINNERS[c["id"]]
        k = wnorm(c["n"]); k = WALIAS.get(k, k)
        o = WT[k]; r = last_round(o)
        tot = sum((x["v"][r] or 0) for x in o["cands"]) + ((o["none"] or [0] * 9)[r] or 0 if o.get("none") else 0)
        wt = toks(name)
        win = next((x for x in o["cands"] if toks(x["n"]) == wt), None) or next((x for x in o["cands"] if x["el"]), None)
        assert win and (win["v"][r] or 0) == max((x["v"][r] or 0) for x in o["cands"]), (c["n"], name)
        label = o["rounds"][r]
        rd = 2 if label.lower().startswith("second") else 1
        dt = fr_date(label)
        ranked = sorted(o["cands"], key=lambda x: -(x["v"][r] or 0))
        top = [dict(n=(name if x is win else given_family(clean_name(x["n"]))), p=party(x["p"]), v=x["v"][r], pc=pcs(x["v"][r], tot)) for x in ranked[:4] if x["v"][r]]
        c["why0"] = c["why"]
        c["e"] = dict(n=name, p=party(win["p"]), v=win["v"][r], pc=pcs(win["v"][r], tot), rd=rd, dt=dt, src=src)
        c["st"] = "late"
        c["rp"] = dict(dt=dt, rd=rd, vv=tot, top=top, src=src)
        c["why"] = ""
        done += 1
    return done


# ---------- Sénat ----------
# compléments du Sénat 2015 (Centre, Grand'Anse, Nord) : 2e tour du 20 nov. 2016 (CEP, définitifs partiels du 30 déc. 2016)
SEN_COMPLEMENT = {  # dept idx -> [(nom, parti, pc)]
    1: [("Willot JOSEPH", "PHTK", 38.68)],
    2: [("Guy PHILIPPE", "CONSORTIUM", 35.46), ("Sorel JACINTHE", "INITE PATRIYOTIK", 29.64)],
    4: [("Dieudonne Etienne LUMA", "PHTK", 34.94), ("Nawoon MARCELLUS", "BOUCLIER", 31.21)],
}
SEN_COMPLEMENT_NOTE = {
    1: "Wilfrid GELIN (PHTK, 23,77 %) figurait parmi les élus des résultats préliminaires du 5 décembre 2016 ; le CEP a ensuite annoncé une enquête administrative à son sujet et ne l’a pas repris dans les résultats définitifs partiels du 30 décembre.",
}
# tiers du Sénat 2016-2017 : 1 siège par département. rd, pc, src : pc du tour décisif (CEP/HaïtiLibre) quand connu.
SEN17 = {  # dept idx (ordre VV: Artibonite0 Centre1 Grand'Anse2 Nippes3 Nord4 Nord-Est5 Nord-Ouest6 Ouest7 Sud8 Sud-Est9)
    0: dict(n="Garcia DELVA", p="AAA", rd=2, pc=53.85, o=("Marc Antoine ALDORPHE", "BOUCLIER", 43.07), src="def"),
    1: dict(n="Rony CELESTIN", p="PHTK", rd=2, pc=None, o=("Abel DESCOLLINES", "KID", None), src="wiki", r1=(31.73, 18.89)),
    2: dict(n="Jean Rigaud BELIZAIRE", p="CONSORTIUM", rd=2, pc=52.83, o=("Riche ANDRIS", "OPL", 45.92), src="def"),
    3: dict(n="Denis CADEAU", p="BOUCLIER", rd=2, pc=59.45, o=("Louberson VILSON", "FANMI LAVALAS", 39.44), src="def"),
    4: dict(n="Jean Marie Ralphe FETHIERE", p="PHTK", rd=2, pc=None, o=("Theodord SAINTILUS", "PITIT DESSALINES", None), src="wiki", r1=(35.68, 14.04)),
    5: dict(n="Wanique PIERRE", p="PHTK", rd=1, pc=58.74, o=None, src="prel"),
    6: dict(n="Kedlaire AUGUSTIN", p="PHTK", rd=2, pc=65.50, o=("Francois Lucas SAINVIL", "MOSANOH", 32.28), src="def"),
    7: dict(n="Patrice DUMONT", p="RPH", rd=2, pc=57.40, o=("Fednel MONCHERY", "PHTK", 40.13), src="def"),
    8: dict(n="Pierre Francois SILDOR", p="PHTK", rd=2, pc=None, o=("Fritz Carlos LEBON", "FANMI LAVALAS", None), src="wiki", r1=(25.51, 25.33)),
    9: dict(n="Joseph LAMBERT", p="KONA", rd=1, pc=53.78, o=None, src="prel"),
}


def apply_senate(sen):
    for d, lst in SEN_COMPLEMENT.items():
        s = sen[d]
        for n, p, pc in lst:
            s["el"].append(dict(n=n, p=p, v=None, pc=pc, rd=2, dt="20 novembre 2016", late=1))
        if d in SEN_COMPLEMENT_NOTE:
            s["note"] = SEN_COMPLEMENT_NOTE[d]
    for d, x in SEN17.items():
        sen[d]["s17"] = dict(x, dt="20 novembre 2016" if x["rd"] == 1 else "29 janvier 2017")
        if x["o"]:
            sen[d]["s17"]["o"] = dict(n=x["o"][0], p=x["o"][1], pc=x["o"][2])
        else:
            sen[d]["s17"]["o"] = None
        sen[d]["s17"] = {k: v for k, v in sen[d]["s17"].items() if k != "r1"} | ({"r1": list(x["r1"])} if x.get("r1") else {})
