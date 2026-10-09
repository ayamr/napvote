"""Écrit www/sw.js avec la liste des fichiers et une version basée sur leur contenu."""
import os, hashlib, json
ROOT=os.path.join(os.path.dirname(__file__),"..","www")
files=[]
for dp,_,fs in os.walk(ROOT):
    for f in fs:
        p=os.path.join(dp,f); rel=os.path.relpath(p,ROOT).replace(os.sep,"/")
        if rel in("sw.js",) or rel.startswith("_") or f.startswith(".") or f.endswith(".bak"): continue
        files.append(rel)
files.sort()
h=hashlib.sha1()
for rel in files: h.update(rel.encode()); h.update(open(os.path.join(ROOT,rel),"rb").read())
ver=h.hexdigest()[:10]
tpl=open(os.path.join(os.path.dirname(__file__),"sw.template.js"),encoding="utf-8").read()
urls=["./"]+[f for f in files]
open(os.path.join(ROOT,"sw.js"),"w",encoding="utf-8").write(tpl.replace("__VERSION__",ver).replace("__FILES__",json.dumps(urls,indent=1)))
print("sw.js",ver,len(files),"fichiers")
