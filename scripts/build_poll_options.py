"""Choix du sondage -> www/data/poll-options.json (lu par le service du sondage pour valider les votes).
Une clé = « portée|choix ». Portée : pres | sen|<département> | dep|<circonscription> | may|<commune> | cas|<commune>|<section> | asec|<commune>|<section>.
Choix : « nom prénom » (président, sénat, députés) ou le parti (listes de maire, CASEC, ASEC). Mêmes règles de normalisation que le site."""
import json, os, re, unicodedata
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..")
def norm(s):
    s="".join(c for c in unicodedata.normalize("NFD",s) if unicodedata.category(c)!="Mn").lower()
    return re.sub(r"\s+"," ",re.sub(r"[-'’]"," ",s)).strip()
V=json.load(open(ROOT+"/data/_build/vv_full.json",encoding="utf-8"))
P,L,S,D=V["parties"],V["locs"],V["secs"],V["deptNames"]
keys=set()
for c in V["cands"]:
    nom,pre,_,po,_,d,pa,lo,sc=c[:9]
    who=norm(nom+" "+pre)
    if po==0: keys.add("pres|"+who)
    elif po==1 and d>=0: keys.add("sen|"+norm(D[d])+"|"+who)
    elif po==2 and lo>=0: keys.add("dep|"+norm(L[lo]["l"])+"|"+who)
    elif po==3 and lo>=0: keys.add("may|"+norm(L[lo]["l"])+"|"+norm(P[pa]))
    elif po in (4,5) and lo>=0 and sc>=0: keys.add(("cas|" if po==4 else "asec|")+norm(L[lo]["l"])+"|"+norm(S[sc]["n"])+"|"+norm(P[pa]))
out=sorted(keys)
os.makedirs(ROOT+"/www/data",exist_ok=True)
json.dump({"v":2,"keys":out},open(ROOT+"/www/data/poll-options.json","w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
print("sondage :",len(out),"choix,",len({k.rsplit("|",1)[0] for k in out}),"scrutins")
