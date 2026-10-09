"""Icônes NapVote : tuile bleu marine, case de bulletin et coche blanches.
uv run --with pillow python scripts/make_icons.py"""
from PIL import Image, ImageDraw
import os
ROOT=os.path.join(os.path.dirname(__file__),"..")
NAVY=(11,36,71); WHITE=(255,255,255); PAPER=(255,255,255); NIGHT=(14,22,36)

def tile(size, scale=1.0, rounded=True):
    S=4; n=size*S
    im=Image.new("RGBA",(n,n),NAVY+(255,))
    d=ImageDraw.Draw(im)
    a=n*scale; off=(n-a)/2
    w=max(2,int(a*0.045))
    # case de bulletin
    d.rectangle([off+a*0.24,off+a*0.36,off+a*0.62,off+a*0.74],outline=WHITE,width=w)
    # coche
    cw=int(a*0.075)
    pts=[(off+a*0.33,off+a*0.54),(off+a*0.45,off+a*0.66),(off+a*0.76,off+a*0.28)]
    d.line(pts,fill=WHITE,width=cw,joint="curve")
    for p in pts: d.ellipse([p[0]-cw/2,p[1]-cw/2,p[0]+cw/2,p[1]+cw/2],fill=WHITE)
    if rounded:
        m=Image.new("L",(n,n),0); ImageDraw.Draw(m).rounded_rectangle([0,0,n-1,n-1],radius=int(n*0.2),fill=255)
        out=Image.new("RGBA",(n,n),(0,0,0,0)); out.paste(im,(0,0),m); im=out
    return im.resize((size,size),Image.LANCZOS)

out=os.path.join(ROOT,"www","icons")
tile(192).save(f"{out}/icon-192.png")
tile(512).save(f"{out}/icon-512.png")
tile(512,scale=0.74,rounded=False).save(f"{out}/icon-maskable-512.png")
tile(180,rounded=False).convert("RGB").save(f"{out}/apple-touch-icon.png")
tile(32).save(f"{out}/favicon-32.png")
os.makedirs(f"{ROOT}/assets",exist_ok=True)
tile(1024,rounded=False).convert("RGB").save(f"{ROOT}/assets/icon-only.png")
tile(1024,scale=0.62,rounded=False).save(f"{ROOT}/assets/icon-foreground.png")
Image.new("RGB",(1024,1024),NAVY).save(f"{ROOT}/assets/icon-background.png")
lg=tile(760)
sp=Image.new("RGB",(2732,2732),PAPER); sp.paste(lg,((2732-760)//2,(2732-760)//2),lg); sp.save(f"{ROOT}/assets/splash.png")
spd=Image.new("RGB",(2732,2732),NIGHT); spd.paste(lg,((2732-760)//2,(2732-760)//2),lg); spd.save(f"{ROOT}/assets/splash-dark.png")
print("ok")
