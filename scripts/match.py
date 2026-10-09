import csv, json, unicodedata, re, collections
from shapely.geometry import shape, Point

def norm(s):
    s=unicodedata.normalize("NFD",s)
    s="".join(c for c in s if unicodedata.category(c)!="Mn")
    s=re.sub(r"[-'’]"," ",s.lower())
    s=re.sub(r"\s+"," ",s).strip()
    return s

rows=list(csv.DictReader(open("/Users/ayamreg/Downloads/candidats_CEP_complet(1).csv",encoding="utf-8-sig"),delimiter=";"))
adm1=json.load(open("adm1.geojson")); adm3=json.load(open("adm3.geojson"))

# ADM1 -> CSV dept names
d1map={"Artibonite Department":"ARTIBONITE","Centre Department":"CENTRE","Département de l'Ouest":"OUEST","Département de la Grande-Anse":"GRAND'ANSE","Département des Nippes":"NIPPES","Département du Nord":"NORD","Département du Sud-Est":"SUD-EST","Nord-Est Department":"NORD-EST","Nord-Ouest Department":"NORD-OUEST","Sud Department":"SUD"}
d1=[(d1map[f["properties"]["shapeName"]],shape(f["geometry"])) for f in adm1["features"]]
def dept_of(geom):
    p=geom.representative_point()
    for n,g in d1:
        if g.contains(p): return n
    best=min(d1,key=lambda x:x[1].distance(p)); return best[0]

geo={}
for f in adm3["features"]:
    g=shape(f["geometry"]); name=f["properties"]["shapeName"]
    geo[norm(name)]={"name":name,"dept":dept_of(g)}
print(len(geo))

alias={"cayes":"les cayes","petion ville":"petionville","del mas":"delmas","cornillon (grand bois)":"cornillon","cornillon  grand bois":"cornillon",
"saint louis du nord":"saint louis du nord","ile a vache":"ile a vache","iles cayemites":None,"anse a foleur":"anse a foleur","anse a galets":"anse a galets","anse a pitre":"anse a pitres",
"jean rabel":"jean rabel","anse d hainault":"anse d hainault","irois":"les irois","fonds des blancs":None,"limbe":"limbe","bas limbe":"bas limbe","roche a bateau":"roche a bateaux",
"fonds verrettes":"fonds verrettes","mole saint nicolas":"mole saint nicolas","la vallee":None,"lavallee":"la vallee de jacmel","cayes jacmel":"cayes jacmel","saint raphael":"saint raphael",
"petite riviere de l artibonite":"petite riviere de l artibonite","pointe a raquette":"pointe a raquette","grande riviere du nord":"grande riviere du nord","ferrier":"ferrier","perches":"perches",
"cap haitien":"cap haitien","port au prince 1":"port au prince","port au prince 2":"port au prince","port au prince 3":"port au prince","trou du nord":"trou du nord","caracol":"caracol",
"cornillon":"cornillon","moron":"moron","chambellan":"chambellan","capotille":"capotille","la victoire":"la victoire","grand boucan":"grand boucan","maniche":"maniche","paillant":"paillant"}
def res(part):
    n=norm(part)
    n=re.sub(r"\(.*\)","",n).strip() if "(" in part and norm(part) not in geo else n
    if n in alias:
        a=alias[n]
        return a if a else None
    return n if n in geo else "??"+n

allparts=collections.defaultdict(set)  # part -> set of depts from CSV
for r in rows:
    c=r["Commune"]
    if not c: continue
    for part in c.split("/"):
        allparts[part.strip()].add(r["Département"])
unmatched=[]
for p,ds in sorted(allparts.items()):
    k=res(p)
    if k is None or k.startswith("??"):
        unmatched.append((p,k,ds))
print("unmatched:",len(unmatched))
for u in unmatched: print(u)
used=set(res(p) for p in allparts if res(p) and not res(p).startswith("??"))
print("geo communes w/o candidates:",sorted(geo[k]["name"] for k in geo if k not in used))
