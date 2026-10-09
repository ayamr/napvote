"""Génère les icônes PNG (PWA, iOS, Android) — uv run --with pillow python scripts/make_icons.py"""
from PIL import Image, ImageDraw
import os
ROOT=os.path.join(os.path.dirname(__file__),"..")
BLUE=(22,64,181); RED=(200,32,59); WHITE=(255,255,255)

def draw_icon(size, rounded=True, scale=1.0, bg=None):
    S=4; n=size*S
    im=Image.new("RGBA",(n,n),bg or (0,0,0,0))
    d=ImageDraw.Draw(im)
    u=n/32.0
    # artwork occupies a centered square of side 'scale'*n
    off=n*(1-scale)/2; a=u*scale
    def P(x,y): return (off+x*a, off+y*a)
    if rounded:
        d.rounded_rectangle([off,off,off+32*a-1,off+32*a-1], radius=8*a, fill=BLUE)
    else:
        d.rectangle([0,0,n,n], fill=BLUE)
    # bande rouge
    top=18
    mask=Image.new("L",(n,n),0); md=ImageDraw.Draw(mask)
    if rounded:
        md.rounded_rectangle([off,off,off+32*a-1,off+32*a-1], radius=8*a, fill=255)
    else:
        md.rectangle([0,0,n,n], fill=255)
    band=Image.new("RGBA",(n,n),(0,0,0,0)); bd=ImageDraw.Draw(band)
    y0=off+top*a if rounded else n*(top/32.0)
    bd.rectangle([0,y0,n,n], fill=RED)
    im.paste(band,(0,0),Image.composite(band.split()[3],Image.new("L",(n,n),0),mask))
    # coche
    w=3.2*a
    pts=[P(9,16.5),P(14,21.5),P(23,11.5)]
    d=ImageDraw.Draw(im)
    d.line(pts,fill=WHITE,width=int(w),joint="curve")
    for p in pts:
        d.ellipse([p[0]-w/2,p[1]-w/2,p[0]+w/2,p[1]+w/2],fill=WHITE)
    return im.resize((size,size),Image.LANCZOS)

out=os.path.join(ROOT,"www","icons")
draw_icon(192).save(f"{out}/icon-192.png")
draw_icon(512).save(f"{out}/icon-512.png")
draw_icon(512,rounded=False,scale=0.74).save(f"{out}/icon-maskable-512.png")
# iOS : fond plein, sans transparence ni coins arrondis (iOS arrondit lui-même)
draw_icon(180,rounded=False,scale=1.0).convert("RGB").save(f"{out}/apple-touch-icon.png")
draw_icon(32).save(f"{out}/favicon-32.png")
# sources pour @capacitor/assets
draw_icon(1024,rounded=False,scale=1.0).convert("RGB").save(f"{ROOT}/assets/icon-only.png")
fg=draw_icon(1024,rounded=False,scale=0.62); fg.save(f"{ROOT}/assets/icon-foreground.png")
Image.new("RGB",(1024,1024),BLUE).save(f"{ROOT}/assets/icon-background.png")
# splash 2732x2732 : fond clair, logo centré
sp=Image.new("RGB",(2732,2732),(242,244,248)); lg=draw_icon(820); sp.paste(lg,((2732-820)//2,(2732-820)//2),lg); sp.save(f"{ROOT}/assets/splash.png")
spd=Image.new("RGB",(2732,2732),(10,16,31)); spd.paste(lg,((2732-820)//2,(2732-820)//2),lg); spd.save(f"{ROOT}/assets/splash-dark.png")
print("ok")
