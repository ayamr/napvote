import csv, json, unicodedata, re, collections, math
import shapely
from shapely.geometry import shape, Point, Polygon, MultiPolygon
from shapely.ops import transform, unary_union

_raw=json.load(open("candidats_cep.json",encoding="utf-8"))
COLLECTED=_raw["collected"]
rows=[]
for it in _raw["items"]:
    l=it.get("localite") or []
    rows.append({"Nom":it["nom"],"Prénom":it["prenom"],"Sexe":it["sexe"],"Poste":it["poste"],"Position":it["position"],
                 "Département":l[0] if l else "","Commune":l[1] if len(l)>1 else "","Section":l[2] if len(l)>2 else "","Parti politique":it["structure"]})

def norm(s):
    s=unicodedata.normalize("NFD",s)
    s="".join(c for c in s if unicodedata.category(c)!="Mn")
    s=re.sub(r"[-'’]"," ",s.lower())
    return re.sub(r"\s+"," ",s).strip()

SMALL={"de","du","des","la","le","au","à","sur","d","l","et"}
def title(s):
    parts=re.split(r"([\s\-'’/]+)",s.lower())
    out=[];first=True
    for p in parts:
        if not p or re.fullmatch(r"[\s\-'’/]+",p): out.append(p); continue
        out.append(p if (p in SMALL and not first) else p[:1].upper()+p[1:]); first=False
    return "".join(out)
OVERRIDE={"CAYES":"Les Cayes","CAP-HAITIEN":"Cap-Haïtien","DEL MAS":"Delmas","ILES CAYEMITES":"Îles Cayémites","ILE-À-VACHE":"Île-à-Vache","CAYES/ILE-À-VACHE":"Les Cayes/Île-à-Vache","CORAIL/ILES CAYEMITES":"Corail/Îles Cayémites"}
def disp(s):
    if s in OVERRIDE: return OVERRIDE[s]
    return "/".join(OVERRIDE.get(p,title(p)) for p in s.split("/")) if "/" in s else title(s)

DEPTS=["ARTIBONITE","CENTRE","GRAND'ANSE","NIPPES","NORD","NORD-EST","NORD-OUEST","OUEST","SUD","SUD-EST"]
DEPT_NAMES=["Artibonite","Centre","Grand'Anse","Nippes","Nord","Nord-Est","Nord-Ouest","Ouest","Sud","Sud-Est"]
adm1=json.load(open("adm1.geojson")); adm3=json.load(open("adm3.geojson"))
d1map={"Artibonite Department":"ARTIBONITE","Centre Department":"CENTRE","Département de l'Ouest":"OUEST","Département de la Grande-Anse":"GRAND'ANSE","Département des Nippes":"NIPPES","Département du Nord":"NORD","Département du Sud-Est":"SUD-EST","Nord-Est Department":"NORD-EST","Nord-Ouest Department":"NORD-OUEST","Sud Department":"SUD"}
d1=[(d1map[f["properties"]["shapeName"]],shape(f["geometry"])) for f in adm1["features"]]
def dept_of(g):
    p=g.representative_point()
    for n,gg in d1:
        if gg.contains(p): return n
    return min(d1,key=lambda x:x[1].distance(p))[0]

alias={"cayes":"les cayes","petion ville":"petionville","del mas":"delmas","cornillon (grand bois)":"cornillon","anse a pitre":"anse a pitres","roche a bateau":"roche a bateaux",
"lavallee":"la vallee de jacmel","fond des negres":"fonds des negres","irois":"les irois","port au prince 1":"port au prince","port au prince 2":"port au prince","port au prince 3":"port au prince"}
OFF=["BAPTISTE","CAHOANNE","DUCIS","FONDS DES BLANCS","GRAND-BASSIN","ILES CAYEMITES","LAPOINTE","LIANCOURT","MARFRANC","MONTROUIS"]
OFFN={norm(o):o for o in OFF}
alias.update({"fond des blancs":"fonds des blancs","fonds des blancs":"fonds des blancs","grand bassin":"grand bassin","iles cayemites":"iles cayemites"})
def key_of(part):
    n=alias.get(norm(part),norm(part))
    if n in OFFN: return "off:"+OFFN[n]
    return n

# ---- CSV-side info per place key
csv_dept=collections.defaultdict(set); csv_name={}
for r in rows:
    if not r["Commune"]: continue
    for part in r["Commune"].split("/"):
        part=part.strip(); k=key_of(part)
        csv_dept[k].add(r["Département"]); csv_name.setdefault(k,disp(part))

# ---- geometry: project to SVG space
W=800.0
def merc(lon,lat):
    x=(lon+180.0)/360.0
    y=0.5-math.log(math.tan(math.pi/4+math.radians(lat)/2))/(2*math.pi)
    return x,y
feats=[]
for f in adm3["features"]:
    g=shape(f["geometry"]); name=f["properties"]["shapeName"]
    feats.append((norm(name),name,g))
allg=unary_union([g for _,_,g in feats])
minx,miny,maxx,maxy=allg.bounds
x0,y1=merc(minx,miny); x1,y0=merc(maxx,maxy)  # y1 bottom, y0 top
scale=(W-24)/(x1-x0); H=round((y1-y0)*scale+24,1)
def proj(x,y,z=None):
    mx,my=merc(x,y)
    return (12+(mx-x0)*scale, 12+(my-y0)*scale)
pg=[transform(proj,g) for _,_,g in feats]
simp=list(shapely.coverage_simplify(pg,0.28))
print("shapely",shapely.__version__)

def rnd(v): return round(v,1)
def ring_d(coords):
    pts=[];last=None
    for x,y in coords:
        p=(rnd(x),rnd(y))
        if p!=last: pts.append(p); last=p
    if len(pts)<3: return ""
    s="M"+" ".join(f"{a:g} {b:g}" for a,b in pts[:1])+"L"+" ".join(f"{a:g} {b:g}" for a,b in pts[1:])
    return s+"Z"
def geom_d(g):
    polys=[g] if isinstance(g,Polygon) else list(g.geoms)
    out=[]
    for p in polys:
        if p.is_empty: continue
        out.append(ring_d(p.exterior.coords))
        for i in p.interiors: out.append(ring_d(i.coords))
    return "".join(out)
def largest_rep(g):
    polys=[g] if isinstance(g,Polygon) else list(g.geoms)
    big=max(polys,key=lambda p:p.area)
    r=big.representative_point(); return [rnd(r.x),rnd(r.y)]

places=[]; key_idx={}
geo_by_key={}
for (k,name,_),g in zip(feats,simp):
    if not g.is_valid: g=g.buffer(0)
    geo_by_key[k]=(name,g)
mism=[]
for k in sorted(geo_by_key,key=lambda k:(csv_name.get(k) or geo_by_key[k][0])):
    name,g=geo_by_key[k]
    gdept=dept_of(shape(adm3["features"][[norm(f["properties"]["shapeName"]) for f in adm3["features"]].index(k)]["geometry"]))
    cd=csv_dept.get(k)
    if cd and gdept not in cd: mism.append((name,gdept,cd))
    dept=list(cd)[0] if cd and len(cd)==1 else gdept
    b=g.bounds
    places.append({"n":csv_name.get(k,name),"d":DEPTS.index(dept),"c":largest_rep(g),"b":[rnd(b[0]),rnd(b[1]),rnd(b[2]),rnd(b[3])],"p":geom_d(g)})
    key_idx[k]=len(places)-1
print("dept mismatches:",mism)
for o in OFF:
    k="off:"+o; d=list(csv_dept[k])
    places.append({"n":csv_name[k],"d":DEPTS.index(d[0]),"off":1})
    key_idx[k]=len(places)-1

# communes inconnues du fond de carte (nouvelle orthographe du CEP, nouvelle commune) : rapprochement approché, sinon « hors carte »
import difflib
for k in sorted(csv_dept):
    if k in key_idx: continue
    cand=difflib.get_close_matches(k,[x for x in key_idx if not x.startswith("off:")],n=1,cutoff=0.86)
    if cand:
        key_idx[k]=key_idx[cand[0]]; print("AVERTISSEMENT commune rapprochée :",k,"->",cand[0])
    else:
        d=sorted(csv_dept[k])[0]
        places.append({"n":csv_name[k],"d":DEPTS.index(d) if d in DEPTS else 0,"off":1}); key_idx[k]=len(places)-1
        print("AVERTISSEMENT commune ajoutée hors carte :",csv_name[k],d)

# dept outlines from dissolved communes
depts=[]
for i,dn in enumerate(DEPTS):
    gs=[geo_by_key[k][1] for k,idx in key_idx.items() if not k.startswith("off:") and places[idx]["d"]==i]
    u=unary_union([g.buffer(0.05) for g in gs]).buffer(-0.05)
    b=u.bounds
    depts.append({"n":DEPT_NAMES[i],"c":largest_rep(u if not u.is_empty else gs[0]),"b":[rnd(b[0]),rnd(b[1]),rnd(b[2]),rnd(b[3])],"l":geom_d(u)})

# ---- candidates
POSTES=["Président","Sénateur","Député","Maire","CASEC","ASEC"]
def posrank(s):
    m=re.match(r"(\d+)",s); return 0 if s=="Titulaire" else int(m.group(1))
POS=sorted(set(r["Position"] for r in rows),key=posrank)
PARTIES=sorted(set(r["Parti politique"] for r in rows))
locs=[];loc_idx={}
def loc_of(c):
    if not c: return -1
    if c not in loc_idx:
        ps=[]
        for part in c.split("/"):
            i=key_idx[key_of(part.strip())]
            if i not in ps: ps.append(i)
        loc_idx[c]=len(locs); locs.append({"l":disp(c),"p":ps})
    return loc_idx[c]
def pname(s): return title(s)
def secrank(x):
    m=re.match(r"(\d+)",x); return int(m.group(1)) if m else 99
secs=[];sec_idx={}
for r in rows:
    if r["Section"]:
        k=(r["Commune"],r["Section"])
        if k not in sec_idx:
            sec_idx[k]=None
for k in sorted(sec_idx,key=lambda k:(k[0],secrank(k[1]),k[1])):
    sec_idx[k]=len(secs)
    nm=re.sub(r"^(\d+)(ème|ère|e|er)\s+Section\s*","",k[1],flags=re.I)
    secs.append({"n":k[1].strip(),"c":loc_of(k[0]),"s":nm.strip()})
cands=[]
for r in rows:
    cands.append([r["Nom"].strip(),pname(r["Prénom"].strip()),0 if r["Sexe"]=="M" else 1,POSTES.index(r["Poste"]),POS.index(r["Position"]),
                  DEPTS.index(r["Département"]) if r["Département"] in DEPTS else -1,PARTIES.index(r["Parti politique"]),loc_of(r["Commune"]),sec_idx[(r["Commune"],r["Section"])] if r["Section"] else -1])
VV={"H":H,"W":W,"postes":POSTES,"pos":POS,"parties":PARTIES,"deptNames":DEPT_NAMES,"places":places,"depts":depts,"locs":locs,"secs":secs,"cands":cands,"collected":COLLECTED,"proj":{"x0":round(x0,8),"y0":round(y0,8),"s":round(scale,4),"pad":12}}
import hashlib,os
os.makedirs("_build",exist_ok=True)
STATIC=["H","W","postes","deptNames","places","depts","proj"]
LIVE=["pos","parties","locs","secs","cands","collected"]
geo=hashlib.md5(json.dumps([[p["n"],p["d"],bool(p.get("off"))] for p in places],ensure_ascii=False).encode()).hexdigest()[:8]
static={k:VV[k] for k in STATIC}; static["geo"]=geo
js="window.VV="+json.dumps(static,ensure_ascii=False,separators=(",",":"))+";"
open("../www/js/data.js","w",encoding="utf-8").write(js)
VV["geo"]=geo
json.dump(VV,open("_build/vv_full.json","w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
json.dump({"geo":geo,**{k:VV[k] for k in LIVE}},open("_build/vv_live.json","w",encoding="utf-8"),ensure_ascii=False,separators=(",",":"))
print("H",H,"places",len(places),"locs",len(locs),"cands",len(cands),"geo",geo,"static bytes",len(js.encode()))
json.dump(key_idx,open("keyidx.json","w"),ensure_ascii=False)
