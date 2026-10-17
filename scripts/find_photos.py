"""Cherche sur Wikipédia/Commons des photos à licence libre pour des candidats connus (revue manuelle ensuite).
Usage : python3 scripts/find_photos.py > data/photos/candidates_found.json"""
import json, sys, re, urllib.parse, urllib.request, urllib.error, unicodedata
UA={"User-Agent":"NapVote/1.0 (citizen election tracker; photo licence check)"}
import time, os, hashlib
CACHE="data/photos/cache"; os.makedirs(CACHE,exist_ok=True)
def api(host,params):
    u="https://%s/w/api.php?%s"%(host,urllib.parse.urlencode(dict(params,format="json")))
    f=CACHE+"/"+hashlib.md5(u.encode()).hexdigest()+".json"
    if os.path.exists(f): return json.load(open(f))
    for a in range(8):
        try:
            time.sleep(1.2)
            r=json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=25))
            json.dump(r,open(f,"w")); return r
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(15*(a+1)); continue
            raise
    raise RuntimeError("429 persistant")
def norm(s):
    s=unicodedata.normalize("NFD",s); s="".join(c for c in s if unicodedata.category(c)!="Mn").lower()
    return re.sub(r"[^a-z ]"," ",s).split()
live=json.load(open("www/data/live.json")); V=live["vv"]
H=live["hist"]
cands=[]
for i,c in enumerate(V["cands"]):
    nom,pre,po=c[0],c[1],c[3]
    links=H["links"].get(str(i)) or []
    elu=any(l.get("el") for l in links)
    if po in (0,1) or elu: cands.append((i,pre+" "+nom,po,elu))
out=[]
for i,name,po,elu in cands:
    res=None
    for host in ("fr.wikipedia.org","en.wikipedia.org"):
        try:
            s=api(host,{"action":"query","list":"search","srsearch":'"%s" Haïti OR Haiti'%name,"srlimit":3})["query"]["search"]
        except Exception as e:
            print("ERR",host,name,e,file=sys.stderr); continue
        for r in s:
            t=r["title"]; tn=set(norm(t)); nn=set(norm(name))
            if len(tn&nn)>=2 and re.search(r"ha[iï]ti",r["snippet"]+t,re.I):
                res=(host,t); break
        if res: break
    if not res: continue
    host,t=res
    q=api(host,{"action":"query","titles":t,"prop":"pageimages|extracts","piprop":"original|name","exintro":1,"explaintext":1,"exchars":300})
    pg=list(q["query"]["pages"].values())[0]
    out.append({"i":i,"name":name,"po":po,"elu":elu,"host":host,"title":t,"image":pg.get("pageimage"),"orig":(pg.get("original") or {}).get("source"),"extract":(pg.get("extract") or "")[:300]})
json.dump(out,sys.stdout,ensure_ascii=False,indent=1)
print(len(cands),"cherchés,",len(out),"trouvés sur Wikipédia",file=sys.stderr)
