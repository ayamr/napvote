"""Collecte automatique des données du CEP (candidats, statistiques d'inscription) avec contrôles.

Usage : python3 scripts/fetch_cep.py            (écrit dans data/)
Codes de sortie : 0 = ok (données modifiées ou non), 2 = données suspectes (rien n'est écrit).
Si l'API des candidats est inaccessible ou protégée par un défi anti-robot (HTTP 403 « cf-mitigated: challenge »), les derniers candidats sont gardés,
le reste de la collecte continue et la sortie vaut 0 : la reconstruction et la publication du site ne sont plus bloquées (cep_blocked=true, ticket GitHub ouvert par le workflow).
Sorties pour GitHub Actions ($GITHUB_OUTPUT) : changed=true|false, notes_new=<n>, cep_blocked=true|false.
"""
import csv, datetime, hashlib, json, os, re, sys, time
import urllib.error, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
D = os.path.join(ROOT, "data")
SRC = os.path.join(D, "src")
BASE = "https://tableau.cephaiti.ht/api/tableau/candidats"
STATS = "https://stats.cephaiti.ht/api/{}/search"
NOTES = "https://cephaiti.ht/notes-communiques/"
ONI = "https://oni.gouv.ht/la-liste-des-bureaux/"  # bureaux d'enregistrement de la carte d'identification nationale (ONI)
CIV = "https://cephaiti.ht/civ/"  # centres d'inscription et de vote : la liste complète est incluse dans le code de la page
POSTES = ["Président", "Sénateur", "Député", "Maire", "CASEC", "ASEC"]
PS = 10  # le CEP plafonne la taille de page à 10
UA = {"User-Agent": "NapVote/1.0 (citizen election tracker; +https://napvote-ht.com; contact: contact@napvote-ht.com)"}


START = time.time()
OPTIONAL_BUDGET = 540  # s : au-delà, les étapes facultatives sont sautées pour que la publication du site ne dépasse jamais la limite de 15 minutes du robot


def late():
    return time.time() - START > OPTIONAL_BUDGET


class Unreachable(RuntimeError):
    """Service du CEP inaccessible après plusieurs essais (réseau, délai, erreur serveur)."""


class Blocked(Unreachable):
    """Le CEP répond par un défi anti-robot Cloudflare : réessayer ne sert à rien, et nous ne cherchons pas à le contourner."""


def http(url, data=None, tries=8, timeout=40):
    last = None
    for a in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers=dict(UA, **({"Content-Type": "application/json"} if data else {})))
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:  # 429 : le CEP limite le débit, on patiente
            last = e
            if e.code == 403 and (e.headers.get("cf-mitigated") or "").lower() == "challenge":
                raise Blocked("défi anti-robot du CEP (HTTP 403) : %s" % url) from e
            wait = int(e.headers.get("Retry-After", "0") or 0) if e.code == 429 else 0
            time.sleep(max(wait, 4 * (a + 1)) if e.code == 429 else 1.5 * (a + 1))
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 * (a + 1))
    raise Unreachable("échec %s : %s" % (url, last))


def page(poste, n):
    u = "%s?poste=%s&page=%d&pageSize=%d" % (BASE, urllib.parse.quote(poste), n, PS)
    return json.loads(http(u))


def fetch_poste(poste):
    first = page(poste, 1)
    total = int(first.get("total", 0))
    pages = -(-total // PS)
    items = list(first.get("items", []))
    if pages > 1:
        with ThreadPoolExecutor(max_workers=3) as ex:
            for res in ex.map(lambda n: page(poste, n).get("items", []), range(2, pages + 1)):
                items += res
    # des candidatures peuvent être ajoutées pendant la collecte : on tolère un petit écart
    if abs(len(items) - total) > 3:
        raise RuntimeError("%s : %d reçus pour %d annoncés" % (poste, len(items), total))
    return items


def key(i):
    loc = " / ".join(i.get("localite") or [])
    return "|".join([i["poste"], i["nom"].strip().upper(), i["prenom"].strip().upper(), i["position"], loc.upper()])


def now_local():
    try:
        from zoneinfo import ZoneInfo
        return datetime.datetime.now(ZoneInfo("America/Port-au-Prince"))
    except Exception:  # noqa: BLE001
        return datetime.datetime.now(datetime.timezone.utc)


def out(k, v):
    p = os.environ.get("GITHUB_OUTPUT")
    if p:
        with open(p, "a") as f:
            f.write("%s=%s\n" % (k, v))
    print("[out] %s=%s" % (k, v), file=sys.stderr)


def fetch_civ():
    """Centres d'inscription et de vote (CIV) : lit le tableau `const CENTRES = [...]` de la page publique du CEP.
    Écrit data/civ_cep.json si la liste a changé. Retourne True si le fichier a été modifié. Ne bloque jamais la collecte principale."""
    path = os.path.join(D, "civ_cep.json")
    prev = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else None
    html = http(CIV, tries=2, timeout=25).decode("utf-8", "ignore")
    i = html.find("const CENTRES = ")
    if i < 0:
        raise RuntimeError("tableau CENTRES introuvable (page modifiée ?)")
    raw, _ = json.JSONDecoder().raw_decode(html[i + len("const CENTRES = "):])
    items = []
    for c in raw:
        def txt(k):
            return re.sub(r"\s+", " ", (c.get(k) or "")).strip()
        lat, lon = c.get("latitude"), c.get("longitude")
        ok = isinstance(lat, (int, float)) and isinstance(lon, (int, float)) and 17.5 <= lat <= 20.5 and -75 <= lon <= -71
        items.append({"id": int(c["id"]), "dep": txt("departement"), "com": txt("commune"), "sec": txt("section"), "nom": txt("nom_cv"),
                      "adr": txt("adresse_cv"), "type": txt("remarques"), "bv": int(c.get("nombre_actuel_bv") or 0), "cap": int(c.get("capacite_bv") or 0),
                      "lat": round(lat, 6) if ok else None, "lon": round(lon, 6) if ok else None})
    items.sort(key=lambda x: x["id"])
    coms = {(x["dep"], x["com"]) for x in items}
    if len(items) < 1000 or len(coms) < 100 or len({x["dep"] for x in items}) != 10:
        raise RuntimeError("liste suspecte : %d centres, %d communes" % (len(items), len(coms)))
    if prev and len(items) < 0.9 * len(prev["items"]):
        raise RuntimeError("baisse suspecte : %d -> %d centres ; mise à jour refusée" % (len(prev["items"]), len(items)))
    m = re.search(r"Données mises à jour le\s*(\d{2})/(\d{2})/(\d{4})\s*à\s*(\d{1,2}):(\d{2})\s*([AP]M)", re.sub(r"<[^>]+>", " ", html))
    maj = None
    if m:
        h = int(m.group(4)) % 12 + (12 if m.group(6) == "PM" else 0)
        maj = "%s-%s-%sT%02d:%s" % (m.group(3), m.group(2), m.group(1), h, m.group(5))
    if prev and prev["items"] == items:
        print("centres CIV : aucun changement (%d)" % len(items), file=sys.stderr)
        return False
    json.dump({"collected": now_local().isoformat(timespec="seconds"), "maj_cep": maj, "items": items}, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("centres CIV : %d centres, %d communes, %d bureaux (mise à jour CEP %s)" % (len(items), len(coms), sum(x["bv"] for x in items), maj), file=sys.stderr)
    return True


def fetch_oni():
    """Bureaux de l'Office national d'identification (ONI) : tableau département / commune / adresse de la page publique.
    Écrit data/oni_bureaux.json si la liste a changé. Retourne True si le fichier a été modifié. Ne bloque jamais la collecte principale."""
    import html as _html
    path = os.path.join(D, "oni_bureaux.json")
    prev = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else None
    page_html = http(ONI, tries=2, timeout=25).decode("utf-8", "ignore")
    items = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", page_html, flags=re.S):
        cells = [re.sub(r"\s+", " ", _html.unescape(re.sub(r"<[^>]+>", "", c))).strip() for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, flags=re.S)]
        if len(cells) >= 3 and cells[0].upper() != "DEPARTEMENT":
            items.append({"dep": cells[0].upper(), "com": cells[1].upper(), "adr": cells[2]})
    coms = {(x["dep"], x["com"]) for x in items}
    if len(items) < 100 or len({x["dep"] for x in items}) != 10:
        raise RuntimeError("liste suspecte : %d bureaux, %d départements" % (len(items), len({x["dep"] for x in items})))
    if prev and len(items) < 0.9 * len(prev["items"]):
        raise RuntimeError("baisse suspecte : %d -> %d bureaux ; mise à jour refusée" % (len(prev["items"]), len(items)))
    if prev and prev["items"] == items:
        print("bureaux ONI : aucun changement (%d)" % len(items), file=sys.stderr)
        return False
    json.dump({"collected": now_local().isoformat(timespec="seconds"), "source": ONI, "items": items}, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("bureaux ONI : %d bureaux, %d communes" % (len(items), len(coms)), file=sys.stderr)
    return True


def main():
    os.makedirs(SRC, exist_ok=True)
    t0 = time.time()
    if "--civ" in sys.argv:  # test : centres seulement
        fetch_civ()
        return
    if "--oni" in sys.argv:  # test : bureaux de l'ONI seulement
        fetch_oni()
        return
    path = os.path.join(D, "candidats_cep.json")
    prev = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else None

    # ---- candidats ----
    items = []
    blocked = False
    try:
        for p in POSTES:
            got = fetch_poste(p)
            print("%-10s %4d" % (p, len(got)), file=sys.stderr)
            items += got
    except Unreachable as e:
        if not prev:  # rien à garder : on ne peut pas construire le site
            print("ERREUR collecte :", e, file=sys.stderr)
            out("changed", "false")
            sys.exit(2)
        # API des candidats inaccessible ou bloquée : on garde les derniers candidats connus (candidats_cep.json) et on continue le reste de la collecte
        blocked = True
        print("AVERTISSEMENT : candidats non mis à jour, derniers candidats conservés (collectés le %s) : %s" % (prev["collected"], e), file=sys.stderr)
    except Exception as e:  # noqa: BLE001
        print("ERREUR collecte :", e, file=sys.stderr)
        out("changed", "false")
        sys.exit(2)

    changed = False
    stamp = now_local()

    if not blocked:
        counts = {p: sum(1 for i in items if i["poste"] == p) for p in POSTES}
        if prev:
            pc = {p: sum(1 for i in prev["items"] if i["poste"] == p) for p in POSTES}
            if len(items) < 0.9 * len(prev["items"]) or any(counts[p] < 0.8 * pc[p] for p in POSTES):
                print("ERREUR : baisse suspecte %s -> %s ; mise à jour refusée" % (pc, counts), file=sys.stderr)
                out("changed", "false")
                sys.exit(2)
        if any(counts[p] == 0 for p in POSTES):
            print("ERREUR : un poste est vide", counts, file=sys.stderr)
            out("changed", "false")
            sys.exit(2)

        new_keys = {key(i): i for i in items}
        old_keys = {key(i): i for i in prev["items"]} if prev else {}
        added = [new_keys[k] for k in new_keys if k not in old_keys]
        removed = [old_keys[k] for k in old_keys if k not in new_keys]
        changed = bool(added or removed) or not prev

        if changed:
            items.sort(key=key)
            json.dump({"collected": stamp.isoformat(timespec="seconds"), "items": items}, open(path, "w", encoding="utf-8"), ensure_ascii=False)
            with open(os.path.join(D, "candidats_cep.csv"), "w", newline="", encoding="utf-8-sig") as f:
                w = csv.writer(f, delimiter=";", quoting=csv.QUOTE_ALL)
                w.writerow(["Nom", "Prénom", "Sexe", "Poste", "Position", "Département", "Commune", "Section", "Parti politique"])
                for c in items:
                    l = c.get("localite") or []
                    w.writerow([c["nom"], c["prenom"], c["sexe"], c["poste"], c["position"], l[0] if l else "", l[1] if len(l) > 1 else "", l[2] if len(l) > 2 else "", c["structure"]])
            def brief(i):
                l = i.get("localite") or []
                return {"po": i["poste"], "nom": i["nom"], "pre": i["prenom"], "d": l[0] if l else "", "c": l[1] if len(l) > 1 else ""}
            by = {p: {"added": sum(1 for i in added if i["poste"] == p), "removed": sum(1 for i in removed if i["poste"] == p)} for p in POSTES}
            ch = {"t": stamp.isoformat(timespec="seconds"), "prev_t": prev["collected"] if prev else None,
                  "total": len(items), "prev_total": len(prev["items"]) if prev else None,
                  "by": {p: v for p, v in by.items() if v["added"] or v["removed"]},
                  "added": [brief(i) for i in added[:400]], "removed": [brief(i) for i in removed[:100]]}
            json.dump(ch, open(os.path.join(D, "changes.json"), "w", encoding="utf-8"), ensure_ascii=False)
            hp = os.path.join(D, "history.json")
            hist = json.load(open(hp)) if os.path.exists(hp) else []
            hist.append({"t": stamp.isoformat(timespec="minutes"), "total": len(items), **counts})
            json.dump(hist[-600:], open(hp, "w"))
            print("candidats : +%d / -%d (total %d)" % (len(added), len(removed), len(items)), file=sys.stderr)
        else:
            print("candidats : aucun changement (%d)" % len(items), file=sys.stderr)

    # ---- statistiques d'inscription (non bloquant) ----
    stats_changed = False
    fails = 0
    for name, fn in [("stats-summary", "api_stats-summary.json"), ("stats-geography", "api_stats-geography.json"), ("stats-timeline", "api_stats-timeline.json"), ("stats-demographic", "api_stats-demographic.json"), ("geography", "api_geography.json")]:
        if fails >= 2 or late():  # le service des statistiques ne répond pas : on garde les derniers fichiers, sans retarder la publication
            print("statistiques %s : ignoré (service lent ou délai dépassé)" % name, file=sys.stderr)
            continue
        try:
            raw = http(STATS.format(name), data=b"{}", tries=2, timeout=20)
            json.loads(raw)
            fails = 0
            p = os.path.join(SRC, fn)
            if not os.path.exists(p) or open(p, "rb").read() != raw:
                open(p, "wb").write(raw)
                stats_changed = True
        except Exception as e:  # noqa: BLE001
            fails += 1
            print("avertissement statistiques %s : %s" % (name, e), file=sys.stderr)

    # ---- centres d'inscription et de vote (non bloquant) ----
    civ_changed = False
    try:
        civ_changed = False if late() else fetch_civ()
    except Exception as e:  # noqa: BLE001
        print("avertissement centres CIV :", e, file=sys.stderr)

    # ---- bureaux de l'ONI (non bloquant) ----
    oni_changed = False
    try:
        oni_changed = False if late() else fetch_oni()
    except Exception as e:  # noqa: BLE001
        print("avertissement bureaux ONI :", e, file=sys.stderr)

    # ---- veille des notes du CEP (non bloquant) ----
    notes_new = []
    try:
        if late():
            raise RuntimeError("délai dépassé, étape sautée")
        html = http(NOTES, tries=2, timeout=25).decode("utf-8", "ignore")
        links = sorted({m for m in re.findall(r'href="(https://cephaiti\.ht/[a-z0-9][^"#?]*?/)"', html)
                        if "/wp-" not in m and "/category/" not in m and "/page/" not in m and "/tag/" not in m})
        sp = os.path.join(D, "notes_state.json")
        old = json.load(open(sp)) if os.path.exists(sp) else None
        if old is not None:
            notes_new = [l for l in links if l not in old["links"]]
        json.dump({"links": links}, open(sp, "w"))
    except Exception as e:  # noqa: BLE001
        print("avertissement notes du CEP :", e, file=sys.stderr)
    if notes_new:
        open(os.path.join(D, "notes_new.txt"), "w").write("\n".join(notes_new))
        print("nouvelles pages sur le site du CEP :", *notes_new, sep="\n  ", file=sys.stderr)

    json.dump({"iso": stamp.isoformat(timespec="seconds"), "date": stamp.date().isoformat(), "changed": changed or stats_changed or civ_changed or oni_changed}, open(os.path.join(SRC, "fetched.json"), "w"))
    out("changed", "true" if (changed or stats_changed or civ_changed or oni_changed) else "false")
    out("notes_new", str(len(notes_new)))
    out("cep_blocked", "true" if blocked else "false")
    print("terminé en %.0f s" % (time.time() - t0), file=sys.stderr)


if __name__ == "__main__":
    main()
