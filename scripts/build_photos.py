"""Construit www/js/photos.js à partir de data/photos/curated.json (photos libres, identité vérifiée à la main).
Les images sont dans www/photos/ ; chaque entrée garde auteur, licence et page Commons pour le crédit affiché."""
import json, os, unicodedata
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..")
def strip(s): return "".join(c for c in unicodedata.normalize("NFD",s) if unicodedata.category(c)!="Mn").lower()
out={}
for p in json.load(open(ROOT+"/data/photos/curated.json",encoding="utf-8")):
    fn="photos/%s-%s.jpg"%(p["nom"].lower(),p["pre"].lower())
    assert os.path.exists(ROOT+"/www/"+fn), fn
    out["%s|%s|%d"%(strip(p["nom"]),strip(p["pre"]),p["po"])]={"f":fn,"a":p["author"],"l":p["license"],"u":p["page"]}
open(ROOT+"/www/js/photos.js","w",encoding="utf-8").write("window.VVPhotos="+json.dumps(out,ensure_ascii=False,separators=(",",":"))+";\n")
print("photos :",len(out))
