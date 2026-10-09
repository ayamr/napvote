"""Collecte automatique des données du CEP (candidats, statistiques d'inscription) avec contrôles.

Usage : python3 scripts/fetch_cep.py            (écrit dans data/)
Codes de sortie : 0 = ok (données modifiées ou non), 2 = données suspectes ou API en panne (rien n'est écrit).
Sorties pour GitHub Actions ($GITHUB_OUTPUT) : changed=true|false, notes_new=<n>.
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
POSTES = ["Président", "Sénateur", "Député", "Maire", "CASEC", "ASEC"]
PS = 10  # le CEP plafonne la taille de page à 10
UA = {"User-Agent": "NapVote/1.0 (citizen election tracker)"}


def http(url, data=None, tries=8):
    last = None
    for a in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers=dict(UA, **({"Content-Type": "application/json"} if data else {})))
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read()
        except urllib.error.HTTPError as e:  # 429 : le CEP limite le débit, on patiente
            last = e
            wait = int(e.headers.get("Retry-After", "0") or 0) if e.code == 429 else 0
            time.sleep(max(wait, 4 * (a + 1)) if e.code == 429 else 1.5 * (a + 1))
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 * (a + 1))
    raise RuntimeError("échec %s : %s" % (url, last))


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


def main():
    os.makedirs(SRC, exist_ok=True)
    t0 = time.time()
    path = os.path.join(D, "candidats_cep.json")
    prev = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else None

    # ---- candidats ----
    items = []
    try:
        for p in POSTES:
            got = fetch_poste(p)
            print("%-10s %4d" % (p, len(got)), file=sys.stderr)
            items += got
    except Exception as e:  # noqa: BLE001
        print("ERREUR collecte :", e, file=sys.stderr)
        out("changed", "false")
        sys.exit(2)

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
    stamp = now_local()
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
    for name, fn in [("stats-summary", "api_stats-summary.json"), ("stats-geography", "api_stats-geography.json"), ("stats-timeline", "api_stats-timeline.json"), ("geography", "api_geography.json")]:
        try:
            raw = http(STATS.format(name), data=b"{}")
            json.loads(raw)
            p = os.path.join(SRC, fn)
            if not os.path.exists(p) or open(p, "rb").read() != raw:
                open(p, "wb").write(raw)
                stats_changed = True
        except Exception as e:  # noqa: BLE001
            print("avertissement statistiques %s : %s" % (name, e), file=sys.stderr)

    # ---- veille des notes du CEP (non bloquant) ----
    notes_new = []
    try:
        html = http(NOTES).decode("utf-8", "ignore")
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

    json.dump({"iso": stamp.isoformat(timespec="seconds"), "date": stamp.date().isoformat(), "changed": changed or stats_changed}, open(os.path.join(SRC, "fetched.json"), "w"))
    out("changed", "true" if (changed or stats_changed) else "false")
    out("notes_new", str(len(notes_new)))
    print("terminé en %.0f s" % (time.time() - t0), file=sys.stderr)


if __name__ == "__main__":
    main()
