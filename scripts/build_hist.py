import json,re,unicodedata,collections
H=json.load(open("res2015/election-data.json"))
VV=json.load(open("_build/vv_full.json",encoding="utf-8"))
KI=json.load(open("keyidx.json"))
def strip(s):
    s=unicodedata.normalize("NFD",s); return "".join(c for c in s if unicodedata.category(c)!="Mn")
def norm(s): return re.sub(r"\s+"," ",re.sub(r"[-'’]"," ",strip(s).lower())).strip()
def toks(s): return frozenset(t for t in re.sub(r"[^a-z ]"," ",strip(s).lower().replace("-"," ")).split() if t)
SMALL={"de","du","des","la","le","au","à","sur","d","l","et"}
def title(s):
    parts=re.split(r"([\s\-'’/]+)",s.lower()); out=[];first=True
    for p in parts:
        if not p or re.fullmatch(r"[\s\-'’/]+",p): out.append(p); continue
        out.append(p if (p in SMALL and not first) else p[:1].upper()+p[1:]); first=False
    return "".join(out)
def pname(s):
    if "," in s:
        a,b=s.split(",",1); return title(a.strip())+" "+b.strip().upper()
    return title(s)
def title2(s):
    parts=re.split(r"([\s\-'’/]+)",s.lower()); out=[];first=True
    for p in parts:
        if not p or re.fullmatch(r"[\s\-'’/]+",p): out.append(p); continue
        if p=="a" and not first: out.append("à")
        else: out.append(p if (p in SMALL and not first) else p[:1].upper()+p[1:])
        first=False
    return "".join(out)
def cname(s):
    m=re.search(r"\((\d)(?:ERE|EME)\)",s)
    base=title2(re.sub(r"\(.*?\)","",s).strip())
    return base+((" ("+m.group(1)+("re" if m.group(1)=="1" else "e")+")") if m else "")
DN=[norm(x) for x in VV["deptNames"]]
def didx(name): return DN.index(norm(name))
def party(p): return p.replace("P.H.T.K","PHTK") if p else p

# circo -> places
circo_places=collections.defaultdict(set)
for cm in H["communes"]:
    k=norm(cm["name"]); i=KI[k]
    for ci in cm["circos"]: circo_places[ci].add(i)
circos=[]
for c in H["circos"]:
    e=None
    st=c["final"]["status"]
    if st=="r2": e=dict(n=pname(c["r2"]["candidat"]),p=party(c["r2"]["parti"]),v=c["r2"]["votes"],pc=c["r2"]["pct"],rd=2)
    elif st=="r1": e=dict(n=pname(c["winner"]["candidat"]),p=party(c["winner"]["parti"]),v=c["winner"]["votes"],pc=c["winner"]["pct"],rd=1)
    w=c.get("winner")
    o=dict(id=c["id"],d=didx(c["dept"]),n=cname(c["name"]),pv=[c["pv_included"],c["pv_total"]],vv=c["votes_valides"],vn=c["votes_nuls"],nc=c["ncand"],st=st,why=c["final"].get("reason",""),
      e=e,w=(dict(n=pname(w["candidat"]),p=party(w["parti"]),v=w["votes"],pc=w["pct"]) if w else None),
      top=[dict(n=pname(t["candidat"]),p=party(t["parti"]),v=t["votes"],pc=t["pct"]) for t in c.get("top",[])],
      q=[[party(a),pname(b)] for a,b in c["final"].get("qualif",[])],pl=sorted(circo_places[c["id"]]))
    r2=c.get("r2")
    if r2: o["r2"]=dict(vv=r2["votes_valides"],va=r2["votes_aucun"],vn=r2["votes_nuls"],pv=[r2["pv_included"],r2["pv_total"]])
    circos.append(o)
import reprises as RP
n_late=RP.apply_deputies(circos)
print("reprises appliquées :",n_late)
CI={c["id"]:c for c in circos}
raw={c["id"]:c for c in H["circos"]}

# locs (députés) -> circos
P=VV["places"]; L=VV["locs"]; C=VV["cands"]
dep_locs=sorted({r[7] for r in C if r[3]==2 and r[7]>=0})
loc2c={}
for li in dep_locs:
    lp=set(L[li]["p"]); lab=L[li]["l"]
    m=re.search(r"Port-au-Prince (\d)$",lab)
    cand=[]
    if m:
        n=m.group(1); suffix={"1":"(1re)","2":"(2e)","3":"(3e)"}[n]
        cand=[c["id"] for c in circos if c["n"].startswith("Port-au-Prince") and c["n"].endswith(suffix)]
    else:
        sc=[]
        for ci,pl in circo_places.items():
            inter=len(lp&pl)
            if inter: sc.append((inter/len(lp|pl),ci))
        sc.sort(reverse=True)
        if sc:
            best=sc[0][0]; cand=[ci for j,ci in sc if j>=max(0.5,best-1e-9)] if best>=0.5 else [sc[0][1]]
    loc2c[li]=cand
unmatched=[L[li]["l"] for li in dep_locs if not loc2c[li]]
print("député locs:",len(dep_locs),"unmatched:",unmatched)
# place -> circos
place2c=collections.defaultdict(set)
for ci,pl in circo_places.items():
    for p in pl: place2c[p].add(ci)
for li,cs in loc2c.items():
    for p in L[li]["p"]:
        for ci in cs: place2c[p].add(ci)

# senate
sen={}
for dn,s in H["senate"].items():
    d=didx(dn)
    sen[d]=dict(seats=s["seats"],nc=s["r1"]["n_candidates"],pv=[s["r1"]["pv_included"],s["r1"]["pv_total"]],vv=s["r1"]["votes_valides"],
      top=[dict(n=pname(t["candidat"]),p=party(t["parti"]),v=t["votes"],pc=t["pct"]) for t in s["r1_top"][:6]],
      el=[dict(n=pname(e["candidat"]),p=party(e["parti"]),v=e["votes"],pc=e["pct"],rd=e["round"]) for e in s.get("elected",[])],
      q=[[party(a),pname(b)] for a,b in s.get("qualif",[])],r2=bool(s.get("r2")))
RP.apply_senate(sen)
print("senate elected:",sum(len(v["el"]) for v in sen.values()),"+ tiers 2016-17:",sum(1 for v in sen.values() if v.get("s17")))
# presidential
pres=H["pres"]; tot=pres["national_total"]
ACC={"JOVENEL MOISE":"Jovenel Moïse","JUDE CELESTIN":"Jude Célestin","JEAN-CHARLES MOISE":"Jean-Charles Moïse","JEAN HENRY CEANT":"Jean Henry Céant","MARYSE NARCISSE":"Maryse Narcisse"}
nat=[dict(n=ACC.get(k,title(k)),v=pres["national"][k],pc=round(100*pres["national"][k]/tot,2)) for k in pres["order"]]
pdept={}
for dn,v in pres["depts"].items():
    d=didx(dn); items=sorted(v["votes"].items(),key=lambda x:-x[1])[:5]
    pdept[d]=dict(t=v["total"],top=[dict(n=ACC.get(k,title(k)),v=x,pc=round(100*x/v["total"],2)) for k,x in items])
print("pres nat top",nat[:3],tot)

# ---- candidate links ----
def entries_circo(ci):
    c=raw[ci]; out={}
    for rk,t in enumerate(c.get("top",[]),1): out[toks(t["candidat"])]=dict(r=rk,v=t["votes"],pc=t["pct"],p=party(t["parti"]),n=pname(t["candidat"]))
    if c.get("winner") and toks(c["winner"]["candidat"]) not in out:
        w=c["winner"]; out[toks(w["candidat"])]=dict(r=1,v=w["votes"],pc=w["pct"],p=party(w["parti"]),n=pname(w["candidat"]))
    return out
EC={ci:entries_circo(ci) for ci in raw}
for c in circos:
    if c["st"]=="late":
        k=toks(c["e"]["n"])
        if k not in EC[c["id"]]: EC[c["id"]][k]=dict(r=None,v=c["e"]["v"],pc=c["e"]["pc"],p=c["e"]["p"],n=c["e"]["n"])
dept_circos=collections.defaultdict(list)
for c in circos: dept_circos[c["d"]].append(c["id"])
sen_entries={}
for dn,s in H["senate"].items():
    d=didx(dn); m={}
    for rk,t in enumerate(s["r1_top"],1): m[toks(t["candidat"])]=dict(r=rk,v=t["votes"],pc=t["pct"],p=party(t["parti"]),n=pname(t["candidat"]),el=False)
    for e in s.get("elected",[]):
        k=toks(e["candidat"]); 
        if k in m: m[k]["el"]=True; m[k]["v"]=e["votes"]; m[k]["pc"]=e["pct"]
        else: m[k]=dict(r=None,v=e["votes"],pc=e["pct"],p=party(e["parti"]),n=pname(e["candidat"]),el=True)
    for e in sen[d]["el"]:
        if e.get("late"): m[toks(e["n"])]=dict(r=None,v=e["v"],pc=e["pc"],p=e["p"],n=e["n"],el=True,dt="reprise du 20 novembre 2016 (sièges restés vacants en 2015)")
    s17=sen[d].get("s17")
    if s17:
        m[toks(s17["n"])]=dict(r=None,v=None,pc=s17["pc"],p=s17["p"],n=s17["n"],el=True,dt="tiers du Sénat 2016-2017, "+("1er tour du 20 novembre 2016" if s17["rd"]==1 else "2e tour du 29 janvier 2017"))
    for a,b in s.get("qualif",[]):
        k=toks(b)
        if k in m: m[k]["q"]=True
    sen_entries[d]=m
pres_names={toks(k):(i+1,k) for i,k in enumerate(pres["order"])}
links={}
for i,r in enumerate(C):
    nom,pre,sx,po,pos,d,pa,lo=r[:8]
    k=toks(pre+" "+nom)
    if len(k)<2: continue
    L_=[]
    if po==0:
        if k in pres_names:
            rk,key=pres_names[k]; v=pres["national"][key]
            L_.append(dict(k="p",r=rk,v=v,pc=round(100*v/tot,2),nc=len(pres["order"])))
    else:
        if po==2 and lo>=0:
            for ci in loc2c.get(lo,[]):
                e=EC[ci].get(k)
                if e:
                    cir=CI[ci]; el=cir["e"] and toks(cir["e"]["n"])==k
                    rec=dict(k="d",c=ci,r=e["r"],v=e["v"],pc=e["pc"],p=e["p"],nc=cir["nc"],el=bool(el))
                    if el:
                        rec["v"]=cir["e"]["v"]; rec["pc"]=cir["e"]["pc"]; rec["rd"]=cir["e"]["rd"]; rec["r1v"]=e["v"]; rec["r1pc"]=e["pc"]
                        if cir["e"].get("dt"): rec["dt"]=cir["e"]["dt"]; rec["src"]=cir["e"].get("src")
                    L_.append(rec)
        # same-dept other circos (cross-post) and senate
        if d>=0:
            seen={x["c"] for x in L_ if x["k"]=="d"}
            if not (po==2 and lo>=0 and L_):
                for ci in dept_circos.get(d,[]):
                    if ci in seen: continue
                    e=EC[ci].get(k)
                    if e:
                        cir=CI[ci]; el=cir["e"] and toks(cir["e"]["n"])==k
                        rec=dict(k="d",c=ci,r=e["r"],v=e["v"],pc=e["pc"],p=e["p"],nc=cir["nc"],el=bool(el),x=1)
                        if el:
                            rec["v"]=cir["e"]["v"]; rec["pc"]=cir["e"]["pc"]; rec["rd"]=cir["e"]["rd"]
                            if cir["e"].get("dt"): rec["dt"]=cir["e"]["dt"]
                        L_.append(rec)
            e=sen_entries.get(d,{}).get(k)
            if e:
                L_.append(dict(k="s",d=d,r=e["r"],v=e["v"],pc=e["pc"],p=e["p"],nc=sen[d]["nc"],el=e["el"],q=bool(e.get("q")),**({"dt":e["dt"]} if e.get("dt") else {})))
    if L_: links[i]=L_
print("candidates with links:",len(links),collections.Counter(x["k"] for v in links.values() for x in v), "élus:",sum(1 for v in links.values() for x in v if x.get("el")))
# stats
stat=dict(circos=len(circos),elus=sum(1 for c in circos if c["e"]),r1=sum(1 for c in circos if c["st"]=="r1"),r2=sum(1 for c in circos if c["st"]=="r2"),late=sum(1 for c in circos if c["st"]=="late"),sen17=sum(1 for v in sen.values() if v.get("s17")),ncand=sum(c["nc"] or 0 for c in circos),
  sen_el=sum(len(v["el"]) for v in sen.values()),sen_seats=sum(v["seats"] for v in sen.values()))
out=dict(circos=circos,sen={str(k):v for k,v in sen.items()},pres=dict(nat=nat,tot=tot,dept={str(k):v for k,v in pdept.items()}),stat=stat)
open("../www/js/hist.js","w",encoding="utf-8").write("window.VVH="+json.dumps(out,ensure_ascii=False,separators=(",",":"))+";")
live=dict(loc2c={str(k):v for k,v in loc2c.items()},place2c={str(k):sorted(v) for k,v in place2c.items()},links={str(k):v for k,v in links.items()})
json.dump(live,open("_build/hist_live.json","w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
print(stat,len(json.dumps(out)))
