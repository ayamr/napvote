"""Icônes NapVote (PWA, iOS, Android) : une page de cahier, une marge rouge, une coche au stylo bleu.
uv run --with pillow python scripts/make_icons.py"""
from PIL import Image, ImageDraw
import os
ROOT=os.path.join(os.path.dirname(__file__),"..")
PAPER=(251,251,248); RULE=(188,206,234); MARGIN=(227,134,143); PEN=(27,63,191); INK=(15,27,76); NIGHT=(18,23,31)

def paper(size, scale=1.0, bg=None, rounded=False):
    S=4; n=size*S
    im=Image.new("RGBA",(n,n),bg or PAPER+(255,))
    d=ImageDraw.Draw(im)
    a=n*scale; off=(n-a)/2
    # lignes bleues
    for k in range(1,7):
        y=off+a*(k/7.0)*1.0
        d.line([(0,y),(n,y)],fill=RULE,width=max(2,int(n*0.008)))
    # double trait de marge
    x=off+a*0.24
    for dx in (0,a*0.022):
        d.line([(x+dx,0),(x+dx,n)],fill=MARGIN,width=max(2,int(n*0.009)))
    # coche au stylo
    w=int(a*0.085)
    pts=[(off+a*0.40,off+a*0.54),(off+a*0.52,off+a*0.67),(off+a*0.80,off+a*0.30)]
    d.line(pts,fill=PEN,width=w,joint="curve")
    for p in pts: d.ellipse([p[0]-w/2,p[1]-w/2,p[0]+w/2,p[1]+w/2],fill=PEN)
    if rounded:
        m=Image.new("L",(n,n),0); ImageDraw.Draw(m).rounded_rectangle([0,0,n-1,n-1],radius=int(n*0.22),fill=255)
        out=Image.new("RGBA",(n,n),(0,0,0,0)); out.paste(im,(0,0),m); im=out
    return im.resize((size,size),Image.LANCZOS)

out=os.path.join(ROOT,"www","icons")
paper(192,rounded=True).save(f"{out}/icon-192.png")
paper(512,rounded=True).save(f"{out}/icon-512.png")
paper(512,scale=0.74).save(f"{out}/icon-maskable-512.png")       # zone de sécurité Android
paper(180).convert("RGB").save(f"{out}/apple-touch-icon.png")
paper(32,rounded=True).save(f"{out}/favicon-32.png")
os.makedirs(f"{ROOT}/assets",exist_ok=True)
paper(1024).convert("RGB").save(f"{ROOT}/assets/icon-only.png")
fg=Image.new("RGBA",(1024,1024),(0,0,0,0))
tick=paper(1024,scale=0.62); 
fg=tick; fg.save(f"{ROOT}/assets/icon-foreground.png")
Image.new("RGB",(1024,1024),PAPER).save(f"{ROOT}/assets/icon-background.png")
lg=paper(760,rounded=True)
sp=Image.new("RGB",(2732,2732),PAPER); sp.paste(lg,((2732-760)//2,(2732-760)//2),lg); sp.save(f"{ROOT}/assets/splash.png")
spd=Image.new("RGB",(2732,2732),NIGHT); spd.paste(lg,((2732-760)//2,(2732-760)//2),lg); spd.save(f"{ROOT}/assets/splash-dark.png")
print("ok")
