"""Score de suspicion par bulletin (présidentielle), à partir du dossier de preuves (table evidence).

Les règles sont les mêmes pour tous les candidats : le score ne regarde JAMAIS le candidat choisi pour décider qui est suspect,
sauf pour la règle d'uniformité d'un groupe (écart du groupe à la moyenne de son département), qui s'applique de la même façon à tous.

Usage :
  python3 score.py                       rapport sur les dernières 24 h (lecture seule), base en ligne via wrangler
  python3 score.py --hours 36            autre durée
  python3 score.py --apply 100           inscrit dans ballot_risk les bulletins de score >= 100 (statut 'retire') et 60-99 ('suspect')
  python3 score.py --sqlite test.db      même chose sur une base locale (tests)
Retirer / rétablir ensuite (réversible, prise en compte à la publication de l'heure suivante) :
  UPDATE ballot_risk SET status = 'garde' WHERE dh = '...';   DELETE FROM ballot_risk;  (annule tout)
"""
import argparse, collections, json, math, os, sqlite3, subprocess, sys, datetime, statistics

HERE = os.path.dirname(os.path.abspath(__file__))
FLAG_POINTS = {1: 80, 2: 80, 4: 60, 8: 20, 16: 3, 32: 8, 64: 20}  # 16 (Chrome sans window.chrome) et 32 (mobile sans tactile) : très courants dans les navigateurs intégrés aux applications, donc presque sans poids
FLAG_NAMES = {1: "navigateur piloté (webdriver)", 2: "navigateur sans interface", 4: "variables d'automatisation", 8: "aucune langue", 16: "Chrome sans window.chrome", 32: "mobile sans tactile", 64: "fenêtre de taille nulle"}


class Source:
    def __init__(self, sqlite_path=None):
        self.db = sqlite3.connect(sqlite_path) if sqlite_path else None
        self.db and setattr(self.db, "row_factory", sqlite3.Row)

    def q(self, sql):
        if self.db:
            return [dict(r) for r in self.db.execute(sql).fetchall()]
        import time
        for essai in range(4):  # nouvel essai si la base répond par une erreur passagère
            r = subprocess.run(["npx", "wrangler", "d1", "execute", "napvote-poll", "--remote", "--json", "--command", sql], capture_output=True, text=True, cwd=HERE).stdout
            try:
                i = r.index("[\n"); data = json.loads(r[i:r.rindex("]") + 1])
                if data and "results" in data[0]: return data[0]["results"]
            except Exception: pass
            time.sleep(3 * (essai + 1))
        raise RuntimeError("la base n'a pas répondu : " + r[-300:])

    def run_file(self, sql_text):
        if self.db:
            self.db.executescript(sql_text); return
        path = os.path.join(HERE, "_apply.sql"); open(path, "w", encoding="utf-8").write(sql_text)
        r = subprocess.run(["npx", "wrangler", "d1", "execute", "napvote-poll", "--remote", f"--file={path}"], capture_output=True, text=True, cwd=HERE)
        os.remove(path)
        if r.returncode != 0:
            print(r.stdout[-400:], r.stderr[-400:]); sys.exit(1)


def tvd_excess(obs, exp, t):
    tvd = 0.5 * sum(abs(obs.get(c, 0) / t - exp.get(c, 0)) for c in set(obs) | set(exp))
    noise = 0.5 * sum(math.sqrt(2 * p * (1 - p) / (math.pi * t)) for p in exp.values() if 0 < p < 1)
    return 100 * (tvd - noise)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--hours", type=int, default=24); ap.add_argument("--apply", type=int); ap.add_argument("--sqlite"); ap.add_argument("--net-min", type=int, default=30); ap.add_argument("--net-min-other", type=int, default=20); ap.add_argument("--net-share", type=float, default=0.9); ap.add_argument("--apply-other", action="store_true", help="appliquer aussi le retrait des réseaux en bloc aux scrutins locaux (déconseillé : un candidat local très populaire peut avoir 90 pour cent des votes d'un réseau)"); a = ap.parse_args()
    src = Source(a.sqlite)
    now = src.q("SELECT CAST(strftime('%s','now') AS INTEGER) AS n")[0]["n"] if not a.sqlite else int(datetime.datetime.now(datetime.UTC).timestamp())
    since = now - a.hours * 3600
    ev = src.q(f"SELECT id,t,dh,isnew,asn,net,fp,hw,ua,hdr,chal,tsage,pres,dept,sg FROM evidence WHERE t >= {since}")
    if not ev:
        print("Aucun dossier de preuves sur cette période."); return
    # un seul dossier par appareil : le plus récent (celui qui correspond au bulletin actuel)
    last = {}
    for e in ev:
        if e["dh"] not in last or e["t"] > last[e["dh"]]["t"]: last[e["dh"]] = e
    # bulletins de la présidentielle actuels de ces appareils
    allb = [r for r in src.q(f"SELECT device, scope, dept, choice FROM ballots WHERE created >= {since}") if r["device"] in last]
    ball = {r["device"]: r for r in allb if r["scope"] == "pres"}
    # cellules déjà retirées (opérateur + heures) : on ne retire pas deux fois
    cells = src.q("SELECT asn, hour_from, hour_to FROM excluded_cells")
    def hour_of(t): return datetime.datetime.fromtimestamp(t, datetime.UTC).strftime("%Y-%m-%dT%H")
    def in_cell(e): return any(c["asn"] == e["asn"] and c["hour_from"] <= hour_of(e["t"]) <= c["hour_to"] for c in cells)
    # tailles de groupes sur la période
    fp_new = collections.defaultdict(set); hwnet = collections.defaultdict(set); net = collections.defaultdict(set)
    by_min = collections.defaultdict(int); chal_by_net = collections.defaultdict(list)
    for e in ev:
        if e["fp"] and e["isnew"]: fp_new[e["fp"]].add(e["dh"])
        if e["hw"] and e["net"]: hwnet[(e["hw"], e["net"])].add(e["dh"])
        if e["net"]: net[e["net"]].add(e["dh"]); by_min[(e["net"], e["t"] // 60)] += 1
        if e["net"] and e["chal"]: chal_by_net[e["net"]].append(e["chal"])
    # uniformité d'un groupe réseau : écart à la moyenne du département (de tous les autres appareils)
    pres_by_dept = collections.defaultdict(collections.Counter)
    for dev, b in ball.items(): pres_by_dept[b["dept"]][b["choice"]] += 1
    allp = src.q("SELECT dept, choice, SUM(n) n FROM tally WHERE scope='pres' GROUP BY dept, choice")
    base = collections.defaultdict(collections.Counter)
    for r in allp: base[r["dept"]][r["choice"]] += r["n"]
    unif = {}
    for k, devs in net.items():
        members = [d for d in devs if d in ball]
        if len(members) < 20: continue
        dd = collections.Counter(ball[d]["dept"] for d in members); exp = collections.Counter(); tot = 0
        for dept, nd in dd.items():
            rest = base[dept].copy()
            for d in members:
                if ball[d]["dept"] == dept: rest[ball[d]["choice"]] -= 1
            rt = sum(v for v in rest.values() if v > 0)
            if rt < 200: continue
            for c, v in rest.items(): exp[c] += nd * max(0, v) / rt
            tot += nd
        if not tot: continue
        obs = collections.Counter(ball[d]["choice"] for d in members)
        unif[k] = tvd_excess(obs, {c: v / tot for c, v in exp.items()}, len(members))
    # ---- RÉSEAUX « EN BLOC » : un réseau d'au moins N votes dont >= 90 % vont au même candidat (même seuil pour tous les candidats) ----
    # Les électeurs honnêtes se répartissent sur de nombreux petits réseaux et, sur un réseau partagé, votent pour plusieurs candidats.
    bloc = {}  # (appareil, scrutin) -> raison
    blocks_found = []
    bys = collections.defaultdict(lambda: collections.defaultdict(list))
    for b in allb:
        net_ = last[b["device"]]["net"] if b["device"] in last else ""
        if net_: bys[b["scope"]][net_].append(b)
    for scp, nets_ in bys.items():
        need = a.net_min if scp == "pres" else a.net_min_other
        for net_, bl in nets_.items():
            devs = {x["device"] for x in bl}
            if len(devs) < need: continue
            cnt = collections.Counter(x["choice"] for x in bl)
            top_c, top_n = cnt.most_common(1)[0]
            holders = {x["device"] for x in bl if x["choice"] == top_c}
            share = len(holders) / len(devs)
            if share >= a.net_share:
                blocks_found.append((scp, net_, len(devs), top_c, share))
                for d_ in holders: bloc[(d_, scp)] = f"réseau en bloc : {len(devs)} votes, {100 * share:.0f} % pour le même candidat"
    # score par appareil
    rows = []
    for dev, e in last.items():
        if dev not in ball: continue
        reasons = []
        def add(p, label):
            reasons.append((p, label))
        sg = {}
        try: sg = json.loads(e["sg"] or "{}")
        except Exception: pass
        f = int(sg.get("f", 0))
        if sg:
            for bit, p in FLAG_POINTS.items():
                if f & bit: add(p, FLAG_NAMES[bit])
            if sg.get("p", 0) + sg.get("k", 0) == 0: add(40, "aucune interaction avant l'envoi")
            if sg.get("tr", 1) == 0: add(60, "événement non fiable")
            o = sg.get("o", 0)
            if 0 < o < 4000: add(40, "formulaire envoyé en moins de 4 s")
            elif 0 < o < 7000: add(25, "formulaire envoyé en moins de 7 s")
        if e["chal"] and e["chal"] < 6500: add(15, "envoi dès le déblocage du bouton")
        if e["tsage"] and e["tsage"] < 300: add(10, "contrôle anti-robot résolu en moins de 0,3 s")
        ua = e["ua"] or ""
        if re_modern(ua) and not (e["hdr"] & 1 and e["hdr"] & 2): add(15, "en-têtes de navigateur moderne absents")
        n_fp = len(fp_new.get(e["fp"], ())) if e["fp"] else 0
        for th, p in ((30, 45), (15, 30), (8, 15)):
            if n_fp >= th: add(p, f"même empreinte de navigateur que {n_fp - 1} autres nouveaux appareils"); break
        n_hw = len(hwnet.get((e["hw"], e["net"]), ())) if e["hw"] and e["net"] else 0
        for th, p in ((11, 40), (6, 25)):
            if n_hw >= th: add(p, f"même matériel et même réseau que {n_hw - 1} autres appareils"); break
        n_net = len(net.get(e["net"], ())) if e["net"] else 0
        for th, p in ((100, 20), (40, 10)):
            if n_net >= th: add(p, f"réseau très actif ({n_net} appareils)"); break
        if e["net"] and by_min.get((e["net"], e["t"] // 60), 0) >= 8: add(20, "au moins 8 envois du même réseau dans la même minute")
        ch = chal_by_net.get(e["net"], [])
        if len(ch) >= 10 and statistics.pstdev(ch) < 300: add(25, "délais d'envoi presque identiques sur ce réseau")
        if (dev, "pres") in bloc: add(100, bloc[(dev, "pres")])
        # Règles de GROUPE (empreinte, matériel, réseau, uniformité) : des téléphones identiques les déclenchent sans qu'il y ait fraude.
        # Elles ne comptent donc que plafonnées à 30 points, sauf si le COMPORTEMENT de l'appareil est lui aussi anormal (indice d'automatisation fort, envoi trop rapide, aucune interaction...).
        GROUP = ("même empreinte", "même matériel", "réseau très actif", "au moins 8 envois", "délais d'envoi", "groupe réseau uniforme")
        behav = [pl for pl in reasons if not pl[1].startswith(GROUP)]
        grp = [pl for pl in reasons if pl[1].startswith(GROUP)]
        strong = any(p >= 15 for p, _ in behav)
        gsum = sum(p for p, _ in grp)
        score = min(200, sum(p for p, _ in behav) + (gsum if strong else min(gsum, 30)))
        bsc = sum(p for p, l in behav if not l.startswith("réseau en bloc")) + (gsum if strong and any(p >= 15 for p, l in behav if not l.startswith("réseau en bloc")) else min(gsum, 30))
        rows.append({"dh": dev, "score": score, "bscore": bsc, "reasons": "; ".join(l for _, l in sorted(reasons, reverse=True)), "choice": ball[dev]["choice"], "dept": ball[dev]["dept"], "skip": in_cell(e)})
    n = len(rows); skip = sum(1 for r in rows if r["skip"])
    print(f"Période : {a.hours} h | dossiers : {len(ev)} envois, {len(last)} appareils, {n} avec un bulletin de président | déjà couverts par un retrait par opérateur : {skip}")
    live = [r for r in rows if not r["skip"]]
    print("\nRépartition des scores (hors cellules déjà retirées) :")
    for lo, hi, lab in ((0, 19, "0-19 (normal)"), (20, 39, "20-39"), (40, 59, "40-59"), (60, 99, "60-99 (à voir)"), (100, 999, "100+ (retrait)")):
        c = sum(1 for r in live if lo <= r["score"] <= hi); print(f"  {lab:18s} {c:6d}  ({100 * c / max(1, len(live)):4.1f} %)")
    # tableau par candidat : mêmes règles, seuil unique
    T = a.apply or 100
    tot = collections.Counter(r["choice"] for r in live); sus = collections.Counter(r["choice"] for r in live if r["score"] >= T); mid = collections.Counter(r["choice"] for r in live if 60 <= r["score"] < T)
    gen = src.q("SELECT choice, SUM(n) AS n FROM tally WHERE scope='pres' GROUP BY choice ORDER BY n DESC")
    grank = {r["choice"]: i + 1 for i, r in enumerate(gen)}
    order = sorted(tot, key=lambda c: grank.get(c, 999))
    print(f"\nPar candidat (désigné par son rang dans cet échantillon), seuil unique {T} :")
    print("  rang général | bulletins | part | score moyen | à voir (60-{}) | retirés (>= {}) | part retirée".format(T - 1, T))
    for i, c in enumerate(order[:10]):
        sc = [r["score"] for r in live if r["choice"] == c]
        print(f"  {grank.get(c, 99):4d} | {tot[c]:9d} | {100 * tot[c] / len(live):4.1f} % | {sum(sc) / len(sc):6.1f}      | {mid[c]:13d} | {sus[c]:15d} | {100 * sus[c] / tot[c]:5.1f} %")
    rs = collections.Counter()
    for r in live:
        if r["score"] >= T:
            for x in r["reasons"].split("; ")[:2]: rs[x.split(" que ")[0] if "même" in x else x] += 1
    print("\nMotifs les plus fréquents parmi les retirés :"); [print(f"  {v:5d}  {k}") for k, v in rs.most_common(8)]
    removed = sum(sus.values()); print(f"\nTotal retiré au seuil {T} : {removed} ({100 * removed / max(1, len(live)):.1f} % de l'échantillon)")
    # ---- taux de votes suspects par candidat et par scrutin (président, sénat, députés, maires...), avec marge d'erreur de Wilson à 95 % ----
    sc = {r["dh"]: r["score"] for r in live}
    def kind(scope): return scope.split("|")[0]
    def wilson(k, n):
        if n == 0: return (0.0, 0.0)
        z = 1.96; p = k / n; den = 1 + z * z / n; c = p + z * z / (2 * n); w = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
        return ((c - w) / den, (c + w) / den)
    agg = collections.defaultdict(lambda: [0, 0]); per = collections.defaultdict(lambda: collections.defaultdict(lambda: [0, 0]))
    for b in allb:
        if b["device"] not in sc: continue
        sus_ = sc[b["device"]] >= T or (b["device"], b["scope"]) in bloc; kd = kind(b["scope"])
        agg[kd][0] += 1; agg[kd][1] += sus_
        per[kd][b["choice"]][0] += 1; per[kd][b["choice"]][1] += sus_
    NAMES = {"pres": "Président", "sen": "Sénat", "dep": "Députés", "may": "Maires", "cas": "CASEC", "asec": "ASEC"}
    print("\n== Taux de votes suspects par candidat (seuil %d), intervalle de confiance à 95 %% ; en dessous de 30 bulletins : taux du scrutin utilisé ==" % T)
    for kd in ("pres", "sen", "dep", "may", "cas", "asec"):
        if kd not in agg: continue
        n0, k0 = agg[kd]; print(f"\n{NAMES[kd]} : {n0} bulletins, taux moyen {100 * k0 / n0:.1f} % ({k0} suspects)" + ("" if kd == "pres" else "  [indicatif : en local, un candidat très populaire peut avoir 90 % d'un réseau ; non appliqué]"))
        ranked = sorted(per[kd].items(), key=lambda x: (grank.get(x[0], 999) if kd == "pres" else -x[1][0]))[:(10 if kd == "pres" else 8)]
        for i, (c, (n, k)) in enumerate(ranked):
            lo, hi = wilson(k, n); small = "  ← échantillon trop petit, taux du scrutin utilisé" if n < 30 else ""
            print(f"  {(grank.get(c, 99) if kd == 'pres' else i + 1)}. {n:6d} bulletins | taux {100 * k / n:5.1f} % [{100 * lo:4.1f} - {100 * hi:4.1f}]{small}")
    print(f"\nRéseaux « en bloc » trouvés (seuils : {a.net_min} votes de président / {a.net_min_other} pour les autres scrutins, {100 * a.net_share:.0f} % pour le même candidat) : {len(blocks_found)}")
    by_scope = collections.Counter(sc_[0].split("|")[0] for sc_ in blocks_found); print("   par scrutin :", dict(by_scope))
    # variabilité dans le temps (président) : un taux unique est-il représentatif ?
    blocks = collections.defaultdict(lambda: [0, 0])
    for r in live:
        t = last[r["dh"]]["t"]; blk = datetime.datetime.fromtimestamp(t - t % 21600, datetime.UTC).strftime("%d %Hh")
        blocks[blk][0] += 1; blocks[blk][1] += r["score"] >= T
    print("\n== Variabilité du taux suspect dans le temps (président, blocs de 6 h UTC) : un taux unique est-il représentatif ? ==")
    for blk in sorted(blocks): n, k = blocks[blk]; print(f"  {blk} : {n:5d} bulletins | {100 * k / n:5.1f} % suspects")
    # ---- envois REFUSÉS par candidat de président : où va la manipulation, même quand elle est bloquée ----
    try:
        att = src.q(f"SELECT pres, reason, COUNT(*) AS n FROM attempts WHERE t >= {since} AND pres <> '' GROUP BY pres, reason")
    except Exception:
        att = []
    if att:
        TOT = sum(r["n"] for r in att); byc = collections.Counter(); byr = collections.defaultdict(collections.Counter)
        for r in att: byc[r["pres"]] += r["n"]; byr[r["pres"]][r["reason"]] += r["n"]
        acc = collections.Counter(r["choice"] for r in live); accT = sum(acc.values())
        print(f"\n== Envois refusés selon le candidat de président visé ({TOT} tentatives) : part parmi les refus, part parmi les envois acceptés, rapport ==")
        print("  rang (par tentatives) | tentatives | part des refus | part des acceptés | rapport | raisons principales")
        for i, (c, n) in enumerate(byc.most_common(10)):
            sh = 100 * n / TOT; sa = 100 * acc.get(c, 0) / accT if accT else 0
            top = ", ".join(f"{k[:22]} {v}" for k, v in byr[c].most_common(2))
            print(f"  {i + 1:4d}                  | {n:10d} | {sh:5.1f} %        | {sa:5.1f} %           | {sh / sa if sa else float('inf'):5.1f}   | {top}")
        print("  (un rapport élevé = ce candidat est visé par beaucoup plus de tentatives refusées que sa part de votes acceptés)")
    json.dump({kd: {"total": agg[kd], "candidats": {c: v for c, v in per[kd].items()}} for kd in agg}, open(os.path.join(HERE, "_taux.json"), "w"), ensure_ascii=False)
    if a.apply:
        stmts = []; d = datetime.date.today().isoformat()
        sel = []
        byd = collections.defaultdict(list)
        for b in allb: byd[b["device"]].append(b["scope"])
        seen_pairs = set()
        for r in live:
            if r["score"] >= 60:
                # comportement anormal (automatisation...) : tous les scrutins de l'appareil ; vote en bloc seulement : le scrutin de président (les autres scrutins sont traités par leur propre réseau en bloc)
                scopes_ = set(byd.get(r["dh"], ["pres"])) if r["bscore"] >= 60 else {"pres"}
                for scp in scopes_: sel.append({**r, "scope": scp}); seen_pairs.add((r["dh"], scp))
        for (dv_, scp), why in bloc.items():  # réseaux en bloc dans les autres scrutins : uniquement avec --apply-other ; par défaut, indicatif seulement
            if scp != "pres" and not a.apply_other: continue
            if dv_ in last and in_cell(last[dv_]): continue  # déjà couvert par un retrait par opérateur : pas de double retrait
            if (dv_, scp) not in seen_pairs: sel.append({"dh": dv_, "scope": scp, "score": 100, "reasons": why}); seen_pairs.add((dv_, scp))
        for i in range(0, len(sel), 200):
            vals = ",".join("('%s','%s',%d,'%s','%s','%s')" % (r["dh"], r["scope"].replace("'", "''"), r["score"], r["reasons"].replace("'", "''")[:300], "retire" if r["score"] >= T else "suspect", d) for r in sel[i:i + 200])
            stmts.append(f"INSERT INTO ballot_risk(dh,scope,score,reasons,status,decided) VALUES {vals} ON CONFLICT(dh,scope) DO UPDATE SET score=excluded.score, reasons=excluded.reasons, status=excluded.status, decided=excluded.decided WHERE ballot_risk.status <> 'garde';")
        src.run_file("\n".join(stmts) if stmts else "SELECT 1;")
        print(f"Inscrit dans ballot_risk (tous scrutins) : {sum(1 for r in sel if r['score'] >= T)} bulletins retirés, {sum(1 for r in sel if r['score'] < T)} à voir. Effet à la prochaine publication horaire (17 min après l'heure).")


def re_modern(ua):
    import re
    m = re.search(r"(Chrome|Firefox|Version)/(\d+)", ua or "")
    return bool(m and int(m.group(2)) >= 80)



if __name__ == "__main__":
    main()
