"""Liste des candidats à la présidence pour le sondage -> www/data/poll-options.json (lue par le service du sondage).
La clé est stable : nom + prénom normalisés (mêmes règles que le site)."""
import json, os, re, unicodedata
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..")
def norm(s):
    s="".join(c for c in unicodedata.normalize("NFD",s) if unicodedata.category(c)!="Mn").lower()
    return re.sub(r"\s+"," ",re.sub(r"[-'’]"," ",s)).strip()
live=json.load(open(ROOT+"/data/_build/vv_live.json",encoding="utf-8"))
parties=live["parties"]
out=[{"k":norm(c[0]+" "+c[1]),"n":"%s %s"%(c[1],c[0]),"p":parties[c[6]]} for c in live["cands"] if c[3]==0]
out.sort(key=lambda o:o["k"])
os.makedirs(ROOT+"/www/data",exist_ok=True)
json.dump(out,open(ROOT+"/www/data/poll-options.json","w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
print("sondage :",len(out),"candidats")
