"""Extrait de Wikipédia (2015–17 Haitian parliamentary election) les tableaux de résultats par circonscription/département.
Source brute : data/reprises/w1517.html -> data/reprises/wiki_results.json"""
import re, html, json, os
D=os.path.join(os.path.dirname(__file__),"..","data","reprises")
import sys
SRC=sys.argv[1] if len(sys.argv)>1 else "w1517.html"
DST=sys.argv[2] if len(sys.argv)>2 else "wiki_results.json"
s=open(D+"/"+SRC,encoding="utf-8").read()
sen_start=s.find('id="Senate"')
out=[]
for m in re.finditer(r"<table class=\"wikitable[^>]*data-mw='(.*?)'>",s,flags=re.S):
    try: d=json.loads(html.unescape(m.group(1)))
    except Exception: continue
    part=d["parts"][0]
    if not isinstance(part,dict) or "template" not in part: continue
    t=part["template"]
    if "Election_results" not in t["target"].get("href",""): continue
    p=t["params"]
    g=lambda k:(p.get(k) or {}).get("wt")
    rounds=[]
    for k in ["firstround","secondround","thirdround","fourthround"]:
        w=g(k)
        if w: rounds.append(re.sub(r"\s+"," ",html.unescape(re.sub(r"<[^>]+>"," ",w))).strip())
    if not rounds:
        cp=g("caption") or ""
        mm=re.search(r"<small>(.*?)</small>",cp)
        rounds=[mm.group(1) if mm else "Scrutin"]
    cands=[]
    i=1
    while g(f"cand{i}") or g(f"row{i}"):
        nm=g(f"cand{i}")
        if nm:
            el="'''" in nm
            nm=nm.replace("'''","").replace("&apos;","'").strip()
            pt=re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]",r"\1",g(f"party{i}") or "")
            vs=[]
            for r in range(len(rounds)):
                v=g(f"votes{i}" if r==0 else f"votes{i}_{r+1}")
                vs.append(int(v.replace(",","")) if v and v.strip().isdigit() else None)
            cands.append({"n":html.unescape(nm),"p":html.unescape(pt),"v":vs,"el":el})
        i+=1
    none=[]
    j=1
    while j<20:
        if g(f"row{j}") and "None" in (g(f"row{j}") or ""):
            none=[(int(g(f"votes{j}" if r==0 else f"votes{j}_{r+1}").replace(",","")) if (g(f"votes{j}" if r==0 else f"votes{j}_{r+1}") or "").replace(",","").isdigit() else None) for r in range(len(rounds))]
        j+=1
    out.append({"none":none,"pos":m.start(),"senate":m.start()>sen_start,"cap":html.unescape(g("caption") or ""),"rounds":rounds,"cands":cands})
json.dump(out,open(D+"/"+DST,"w"),ensure_ascii=False,indent=0)
print(len(out),"tables;",sum(1 for o in out if o["senate"]),"senate")
