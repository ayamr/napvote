"""Variante pour l'hébergement en Artifact (polices Google, d3 via cdnjs, sans service worker)."""
import re, os, shutil
ROOT=os.path.join(os.path.dirname(__file__),"..")
W=os.path.join(ROOT,"www"); O=os.path.join(ROOT,"dist","artifact")
shutil.rmtree(O,ignore_errors=True); os.makedirs(O+"/css"); os.makedirs(O+"/js"); os.makedirs(O+"/data")
h=open(W+"/index.html",encoding="utf-8").read()
body=h[h.index("<body>")+6:h.index("</body>")]
body=re.sub(r'<script src="js/vendor/d3.min.js"></script>','<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>',body)
page=('<title>NapVote</title>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&family=Source+Serif+4:wght@600;700&display=swap">\n'
      '<link rel="stylesheet" href="css/napvote.css">\n'+body.replace('<script src="js/pwa.js"></script>','<script src="js/pwa.js"></script>'))
open(O+"/artifact.html","w",encoding="utf-8").write(page)
css=open(W+"/css/napvote.css",encoding="utf-8").read()
css=re.sub(r"@font-face \{.*?\}\n","",css,flags=re.S)
open(O+"/css/napvote.css","w",encoding="utf-8").write(css)
for f in os.listdir(W+"/js"):
    if f.endswith(".js"): shutil.copy(W+"/js/"+f,O+"/js/"+f)
shutil.copy(W+"/data/live.json",O+"/data/live.json")
print("ok",len(page))
