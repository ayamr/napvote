"""Construit www/js/photos.js à partir de data/photos/curated.json (photos libres, identité vérifiée à la main).
Les images sont dans www/photos/ ; chaque entrée garde auteur, licence et page Commons pour le crédit affiché."""
import json, os, unicodedata
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..")
def strip(s): return "".join(c for c in unicodedata.normalize("NFD",s) if unicodedata.category(c)!="Mn").lower()
# recadrage serré sur le visage (cadres choisis à la main dans data/photos/crops.json) à partir des originaux data/photos/src/
try:
    from PIL import Image
    crops=json.load(open(ROOT+"/data/photos/crops.json"))
    for fn,b in crops.items():
        src=ROOT+"/data/photos/src/%s.jpg"%fn
        if os.path.exists(src):
            Image.open(src).convert("RGB").crop(tuple(b)).resize((256,256),Image.LANCZOS).save(ROOT+"/www/photos/%s.jpg"%fn,quality=84,optimize=True)
except ImportError:
    pass  # Pillow absent : on garde les images déjà recadrées dans www/photos/
out={}
for p in json.load(open(ROOT+"/data/photos/curated.json",encoding="utf-8")):
    fn="photos/%s-%s.jpg"%(p["nom"].lower().replace(" ","-"),p["pre"].lower().replace(" ","-"))
    assert os.path.exists(ROOT+"/www/"+fn), fn
    out["%s|%s|%d"%(strip(p["nom"]),strip(p["pre"]),p["po"])]={"f":fn,"a":p["author"],"l":p["license"],"u":p["page"]}
open(ROOT+"/www/js/photos.js","w",encoding="utf-8").write("window.VVPhotos="+json.dumps(out,ensure_ascii=False,separators=(",",":"))+";\n")
print("photos :",len(out))
