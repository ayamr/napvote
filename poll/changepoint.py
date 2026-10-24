"""Détection de rupture : à quel moment la part de chaque candidat change-t-elle brutalement ?

Pour chaque candidat, on cherche l'heure qui sépare le mieux l'historique en deux parties de part différente (rapport de vraisemblance binomial),
puis on recommence sur le plus long des deux segments (segmentation binaire, profondeur 2). La date n'est pas choisie à la main.
Usage : python3 changepoint.py [--scope pres] [--top 10] [--sqlite fichier.db]
"""
import argparse, collections, datetime, json, math, os, sqlite3, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))

def q(sql, db=None):
    if db: return [dict(r) for r in db.execute(sql).fetchall()]
    import time
    for essai in range(4):
        r = subprocess.run(["npx", "wrangler", "d1", "execute", "napvote-poll", "--remote", "--json", "--command", sql], capture_output=True, text=True, cwd=HERE).stdout
        try:
            i = r.index("[\n"); data = json.loads(r[i:r.rindex("]") + 1])
            if data and "results" in data[0]: return data[0]["results"]
        except Exception: pass
        time.sleep(3 * (essai + 1))
    raise RuntimeError("la base n'a pas répondu : " + r[-300:])

def dev(k, n, p):  # déviance binomiale 2*[k log(k/np) + (n-k) log((n-k)/(n(1-p)))]
    if n == 0: return 0.0
    out = 0.0
    if k > 0 and p > 0: out += k * math.log(k / (n * p))
    if n - k > 0 and p < 1: out += (n - k) * math.log((n - k) / (n * (1 - p)))
    return 2 * out

def best_split(ks, ns, lo, hi, min_seg=300):
    K = sum(ks[lo:hi]); N = sum(ns[lo:hi])
    if N < 2 * min_seg or K == 0: return None
    p0 = K / N; best = (0.0, None); k1 = n1 = 0
    for i in range(lo, hi - 1):
        k1 += ks[i]; n1 += ns[i]
        if n1 < min_seg or N - n1 < min_seg: continue
        k2, n2 = K - k1, N - n1
        d = dev(k1, n1, p0) + dev(k2, n2, p0) if False else dev(k1, n1, p0) + dev(k2, n2, p0)
        if d > best[0]: best = (d, i + 1)
    return best if best[1] else None

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--scope", default="pres"); ap.add_argument("--top", type=int, default=10); ap.add_argument("--sqlite"); a = ap.parse_args()
    db = sqlite3.connect(a.sqlite) if a.sqlite else None
    if db: db.row_factory = sqlite3.Row
    rows = q(f"SELECT created/3600 AS h, choice, COUNT(*) AS n FROM ballots WHERE scope = '{a.scope}' GROUP BY h, choice", db)
    hours = sorted({r["h"] for r in rows}); hi = {h: i for i, h in enumerate(hours)}
    tot = [0] * len(hours); per = collections.defaultdict(lambda: [0] * len(hours))
    for r in rows: tot[hi[r["h"]]] += r["n"]; per[r["choice"]][hi[r["h"]]] += r["n"]
    final = sorted(per, key=lambda c: -sum(per[c]))[:a.top]
    fmt = lambda i: datetime.datetime.fromtimestamp(hours[min(i, len(hours) - 1)] * 3600, datetime.UTC).strftime("%d/%m %Hh")
    print(f"Scrutin {a.scope} : {sum(tot)} bulletins sur {len(hours)} heures (du {fmt(0)} au {fmt(len(hours) - 1)} UTC)\n")
    print("rang | part globale | rupture principale (heure UTC) | avant -> après | force | 2e rupture")
    for rk, c in enumerate(final, 1):
        ks = per[c]; sp = best_split(ks, tot, 0, len(hours))
        if not sp: print(f"{rk:4d} | {100 * sum(ks) / sum(tot):5.1f} %       | aucune rupture nette"); continue
        d, i = sp; k1, n1 = sum(ks[:i]), sum(tot[:i]); k2, n2 = sum(ks[i:]), sum(tot[i:])
        # 2e rupture : sur le segment le plus long
        seg = (0, i) if i >= len(hours) - i else (i, len(hours)); sp2 = best_split(ks, tot, *seg)
        s2 = f"{fmt(sp2[1])} (force {sp2[0]:.0f})" if sp2 and sp2[0] > 60 else "—"
        strong = "forte" if d > 300 else "moyenne" if d > 100 else "faible"
        print(f"{rk:4d} | {100 * sum(ks) / sum(tot):5.1f} %       | {fmt(i)}                  | {100 * k1 / n1:4.1f} % -> {100 * k2 / n2:4.1f} % | {strong} ({d:.0f}) | {s2}")

if __name__ == "__main__":
    main()
