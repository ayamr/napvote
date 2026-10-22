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
# Précache : l'essentiel seulement. Le reste (carte, polices latin étendu et italiques, liste du sondage) est mis en cache à l'usage par sw.js.
# Une police partagée par une plage latine et une plage étendue reste précachée.
import re
css=open(os.path.join(ROOT,"css","napvote.css"),encoding="utf-8").read()
lazy_fonts=set()
for blk in re.findall(r"@font-face\s*\{(.*?)\}",css,re.S):
    m=re.search(r"url\(\.\./(fonts/[^)]+)\)",blk)
    if m and (re.search(r"unicode-range:\s*U\+0100",blk) or "font-style: italic" in blk): lazy_fonts.add(m.group(1))
used=set(re.findall(r"url\(\.\./(fonts/[^)]+)\)",css)) - lazy_fonts
LAZY={"js/vendor/d3.min.js","js/map.js","data/poll-options.json"}|lazy_fonts
LAZY={f for f in LAZY if f not in used}
pre=[f for f in files if f not in LAZY]
urls=["./"]+pre
print("précache :",len(pre),"fichiers ; à l'usage :",sorted(LAZY))
open(os.path.join(ROOT,"sw.js"),"w",encoding="utf-8").write(tpl.replace("__VERSION__",ver).replace("__FILES__",json.dumps(urls,indent=1)))
print("sw.js",ver,len(files),"fichiers")
