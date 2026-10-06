#!/usr/bin/env python3
"""Original Sela Tarot board-game vector deck. No external artwork or fonts."""
from pathlib import Path
from html import escape
import math

OUT = Path(__file__).resolve().parents[1] / 'public' / 'assets' / 'cards'
INK, PAPER, GOLD, SAGE, RUST = '#292449', '#fff7df', '#ffc85e', '#63dbc5', '#ff7fab'
LAVENDER, BLUE = '#a68bfa', '#6db7fa'
PALETTES = {
    'rose': (GOLD,SAGE,RUST,RUST),
    'lilac': (GOLD,BLUE,RUST,LAVENDER),
    'aqua': (GOLD,SAGE,LAVENDER,SAGE),
    'gold': (GOLD,SAGE,RUST,GOLD),
    'blue': (GOLD,LAVENDER,RUST,BLUE),
    'w': (GOLD,SAGE,LAVENDER,RUST),
    'c': (BLUE,SAGE,RUST,RUST),
    's': (LAVENDER,BLUE,RUST,LAVENDER),
    'p': (GOLD,SAGE,RUST,SAGE),
}

class Drawing:
    def __init__(self,theme='lilac'):
        self.parts = []
        gold,sage,rust,self.panel = PALETTES[theme]
        self.colours={GOLD:gold,SAGE:sage,RUST:rust}
    def colour(self,c): return self.colours.get(c,c)
    def weight(self,sw): return 0 if sw==0 else max(.55,sw*1.5)
    def raw(self, x): self.parts.append(x)
    def path(self, d, fill='none', stroke=INK, sw=1, **attrs):
        extra = ' '.join(f'{k.replace("_", "-")}="{v}"' for k,v in attrs.items())
        self.raw(f'<path d="{d}" fill="{self.colour(fill)}" stroke="{self.colour(stroke)}" stroke-width="{self.weight(sw)}" {extra}/>')
    def line(self,x1,y1,x2,y2,sw=.8,stroke=INK): self.path(f'M{x1} {y1}L{x2} {y2}',stroke=stroke,sw=sw)
    def circle(self,x,y,r,fill='none',sw=1,stroke=INK):
        self.raw(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{self.colour(fill)}" stroke="{self.colour(stroke)}" stroke-width="{self.weight(sw)}"/>')
    def ellipse(self,x,y,rx,ry,fill='none',sw=1,stroke=INK):
        self.raw(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{self.colour(fill)}" stroke="{self.colour(stroke)}" stroke-width="{self.weight(sw)}"/>')
    def rect(self,x,y,w,h,fill='none',sw=1,rx=0):
        self.raw(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{self.colour(fill)}" stroke="{INK}" stroke-width="{self.weight(sw)}"/>')
    def text(self,x,y,txt,size=10,spacing=1,fill=INK):
        self.raw(f'<text x="{x}" y="{y}" text-anchor="middle" font-family="Trebuchet MS, Arial, sans-serif" font-weight="700" font-size="{size}" letter-spacing="{spacing}" fill="{self.colour(fill)}">{escape(txt)}</text>')
    def group(self,transform): self.raw(f'<g transform="{transform}">')
    def end(self): self.raw('</g>')

def star(a,x,y,r=8,n=8,inner=.43,fill=GOLD):
    pts=[]
    for i in range(n*2):
        ang=-math.pi/2+i*math.pi/n; rr=r if i%2==0 else r*inner
        pts.append(f'{x+math.cos(ang)*rr:.2f},{y+math.sin(ang)*rr:.2f}')
    a.path('M'+'L'.join(pts)+'Z',fill,sw=.7)

def leaf(a,x,y,angle=0,size=1,fill=SAGE):
    a.group(f'translate({x} {y}) rotate({angle}) scale({size})')
    a.path('M0 0C-10 -5 -9 -14 0 -23C8 -14 8 -5 0 0Z',fill,sw=.65)
    a.path('M0 -1L0 -21M0 -8L-4 -12M0 -12L4 -16',sw=.45);a.end()

def sprig(a,x,y,angle=0,height=50):
    a.group(f'translate({x} {y}) rotate({angle})')
    a.path(f'M0 0C-3 {-height/2} 4 {-height/2} 0 {-height}',sw=.7)
    for i in range(3):
        leaf(a,0,-height*.23*(i+1),-55,.5)
        leaf(a,0,-height*.23*(i+1)-3,55,.5)
    a.end()

def rose(a,x,y,size=1):
    a.group(f'translate({x} {y}) scale({size})')
    a.path('M0 -9C5 -14 12 -5 8 0C13 5 5 13 0 8C-5 13 -13 5 -8 0C-12 -5 -5 -14 0 -9Z',RUST,sw=.8)
    a.path('M-4 -3C0 -8 7 -2 3 3C-2 8 -7 1 -2 -2C2 -5 5 1 1 2',sw=.65);a.end()

def hatch(a,x,y,w,h,step=5,tilt=7):
    for dx in range(0,int(w),step): a.line(x+dx,y,x+dx-tilt,y+h,.45)

def mountain(a,base=298):
    a.path(f'M22 {base}L63 {base-67}L93 {base-33}L123 {base-80}L181 {base-30}L216 {base-66}L258 {base}Z',fill=PAPER,sw=.75)
    a.path(f'M63 {base-67}L57 {base-32}L69 {base-43}L79 {base-31}M123 {base-80}L114 {base-39}L132 {base-52}L143 {base-33}M216 {base-66}L205 {base-40}L220 {base-29}',sw=.6)
    for x,y in [(37,base-17),(70,base-18),(89,base-9),(135,base-29),(162,base-14),(211,base-16),(233,base-13)]:
        for i in range(4): a.line(x+i*3,y,x+i*3-5,y+10,.45)

def land(a,y=326):
    a.path(f'M22 {y}Q62 {y-13} 101 {y+1}T178 {y-2}T258 {y+3}L258 378L22 378Z',PAPER,sw=.8)
    for row in range(4):
        for col in range(9):
            x=25+col*27+(row%2)*9; yy=y+14+row*11
            a.path(f'M{x} {yy}q6 -2 12 0',sw=.45)

def water(a,y=319):
    a.path(f'M22 {y}Q68 {y-8} 119 {y}T216 {y}T258 {y}L258 378L22 378Z',SAGE,sw=.75)
    for row in range(6):
        for col in range(6):
            x=26+col*39+(row%2)*8; yy=y+8+row*8
            a.path(f'M{x} {yy}q6 -3 14 0q6 3 15 0',sw=.45)

def cloud(a,x,y,s=1):
    a.group(f'translate({x} {y}) scale({s})')
    a.path('M-21 6C-35 7 -34 -7 -23 -9C-24 -24 -6 -30 4 -19C15 -27 29 -18 26 -8C39 -3 32 9 19 6Z',PAPER,sw=.6)
    a.path('M-18 1Q-8 -4 2 1M9 1Q15 -3 21 1',sw=.45);a.end()

def face(a,x,y,r=13,style='front',beard=False):
    a.path(f'M{x-r*.62} {y-r*.66}Q{x} {y-r*1.3} {x+r*.6} {y-r*.68}Q{x+r*.82} {y} {x+r*.46} {y+r*.72}L{x} {y+r}L{x-r*.48} {y+r*.73}Q{x-r*.82} {y} {x-r*.62} {y-r*.66}Z',PAPER,sw=.8)
    a.path(f'M{x-r*.67} {y-r*.45}Q{x-r*.45} {y-r*1.14} {x} {y-r*1.08}Q{x+r*.4} {y-r*1.14} {x+r*.66} {y-r*.46}',sw=.85)
    if style=='side':
        a.path(f'M{x+1} {y-4}q3 -2 6 0l-3 1Z M{x+4} {y-2}l4 6l-5 1M{x+2} {y+8}q3 -.5 5 -1M{x+3} {y+10}l3 -.5',sw=.5)
        a.path(f'M{x-6} {y-3}q-3 5 0 7M{x-5} {y+5}q3 4 6 6',sw=.4)
    else:
        a.path(f'M{x-7} {y-3}q3 -2 5 0q-2 1 -5 0M{x+2} {y-3}q3 -2 5 0q-2 1 -5 0M{x-7} {y-6}q3 -1 5 0M{x+2} {y-6}q3 -1 5 0M{x} {y-2}l-2 7h4M{x-4} {y+8}q4 -1 8 0M{x-3} {y+10}q3 1 6 0',sw=.45)
        a.path(f'M{x-r*.6} {y+1}l2 5M{x+r*.6} {y+1}l-2 5',sw=.35)
    if beard:
        a.path(f'M{x-r*.7} {y+3}Q{x-r*.5} {y+r+16} {x} {y+r+22}Q{x+r*.5} {y+r+16} {x+r*.7} {y+3}Q{x} {y+12} {x-r*.7} {y+3}Z',PAPER,sw=.8)
        for i in range(-2,3): a.path(f'M{x+i*3} {y+11}q-2 7 0 {10-abs(i)*2}',sw=.45)

def crown(a,x,y,w=28):
    a.path(f'M{x-w/2} {y}l-2 -13l9 6l7 -13l7 13l9 -6l-2 13Z',GOLD,sw=.8)
    a.line(x-w/2+1,y+3,x+w/2-1,y+3,.65)
    for xx in [x-8,x,x+8]: a.circle(xx,y-1,1.4,RUST,.4)

def halo(a,x,y,r=21):
    a.circle(x,y,r,sw=.5,stroke=GOLD);a.circle(x,y,r+4,sw=.5,stroke=GOLD)

def robe(a,x,y,w=43,h=132,fill=SAGE):
    a.path(f'M{x-11} {y}Q{x-w/2} {y+7} {x-w/2+5} {y+45}L{x-w/2-11} {y+h}Q{x} {y+h+8} {x+w/2+11} {y+h}L{x+w/2-5} {y+45}Q{x+w/2} {y+7} {x+11} {y}Z',fill,sw=1)
    a.path(f'M{x-9} {y+7}Q{x} {y+23} {x+10} {y+7}M{x-9} {y+27}L{x-17} {y+h-6}M{x+9} {y+27}L{x+22} {y+h-7}M{x} {y+42}L{x-4} {y+h}M{x+6} {y+47}L{x+10} {y+h}',sw=.6)
    for i in range(5): a.line(x-w/2-5+i*4,y+h-15,x-w/2-8+i*4,y+h-3,.45)

def wings(a,x,y,scale=1):
    a.group(f'translate({x} {y}) scale({scale})')
    for sign in [-1,1]:
        a.group(f'scale({sign} 1)')
        a.path('M0 2C24 -19 49 -34 68 -26C56 -18 60 -5 37 15L8 40Z',PAPER,sw=.9)
        for i in range(6): a.path(f'M{10+i*4} {19-i*3}Q{29+i*4} {-2-i*2} {53+i*2} {-19-i}',sw=.55)
        a.end()
    a.end()

def sun(a,x,y,r=32,face_on=True):
    for i in range(16):
        angle=math.pi*i/8; inner=r+3; outer=r+(18 if i%2==0 else 11)
        xx,yy=math.cos(angle),math.sin(angle)
        if i%2:
            a.group(f'translate({x} {y}) rotate({math.degrees(angle)})')
            a.path(f'M{inner} -2Q{r+10} -7 {outer+4} 0Q{r+11} 2 {inner} 2',fill=GOLD,sw=.6);a.end()
        else:
            a.path(f'M{x+xx*inner:.1f} {y+yy*inner:.1f}L{x+xx*outer:.1f} {y+yy*outer:.1f}',sw=.8)
    a.circle(x,y,r,GOLD,.9);a.circle(x,y,r-4,sw=.5)
    if face_on:
        a.path(f'M{x-18} {y-5}q8 -7 15 0q-7 4 -15 0M{x+3} {y-5}q8 -7 15 0q-7 4 -15 0',sw=.65)
        a.ellipse(x-10,y-5,1.5,2.2,INK,.3);a.ellipse(x+10,y-5,1.5,2.2,INK,.3)
        a.path(f'M{x-2} {y-3}Q{x-2} {y+6} {x-6} {y+10}q6 4 12 0M{x-10} {y+21}Q{x} {y+18} {x+10} {y+21}M{x-7} {y+24}q7 2 14 0',sw=.65)
        a.path(f'M{x-20} {y-12}q8 -5 17 -1M{x+3} {y-13}q9 -4 17 1M{x-23} {y+5}q-2 5 2 9M{x+23} {y+5}q2 5 -2 9',sw=.55)
        for side in [-1,1]:
            for k in range(4):a.line(x+side*(17+k*2),y+15,x+side*(20+k*2),y+20,.32)

def moon(a,x,y,r=32):
    a.circle(x,y,r,GOLD,.8)
    a.path(f'M{x+9} {y-r+2}C{x-25} {y-r*.4} {x-22} {y+r*.7} {x+9} {y+r-2}C{x-5} {y+r*.4} {x+8} {y-r*.4} {x+9} {y-r+2}Z',PAPER,sw=.8)
    a.path(f'M{x-13} {y-8}q5 -3 8 0M{x-5} {y-5}l-4 11l4 2M{x-8} {y+14}q5 2 8 -1',sw=.6)

def tree(a,x,y,height=125,fruit=False):
    a.path(f'M{x-7} {y}Q{x+2} {y-height*.55} {x-2} {y-height}M{x+7} {y}Q{x+6} {y-height*.55} {x+2} {y-height}',fill='none',sw=1.5)
    for k,(side,off) in enumerate([(-1,.25),(1,.38),(-1,.51),(1,.65),(-1,.78)]):
        yy=y-height*off; xx=x+side*22
        a.path(f'M{x} {yy+13}Q{xx} {yy+8} {xx+side*11} {yy-16}',sw=.9)
        for j in range(3): leaf(a,xx+side*j*4,yy-j*7,side*(30+j*12),.66)
        if fruit: a.circle(xx,yy+7,4,RUST,.7)
    leaf(a,x,y-height,0,.8)

def column(a,x,y,w=24,h=170):
    a.rect(x-w/2,y,w,h,PAPER,.8)
    a.rect(x-w/2-4,y-6,w+8,8,PAPER,.8)
    a.rect(x-w/2-5,y+h-2,w+10,8,PAPER,.8)
    for i in range(1,5): a.line(x-w/2+i*w/5,y+7,x-w/2+i*w/5,y+h-8,.45)

def seated(a,x,y,fill=SAGE,royal=False,beard=False):
    a.rect(x-40,y+21,80,138,PAPER,.9,rx=3)
    a.rect(x-46,y+84,12,71,GOLD,.8)
    a.rect(x+34,y+84,12,71,GOLD,.8)
    face(a,x,y,14,beard=beard)
    if royal: crown(a,x,y-13)
    robe(a,x,y+17,55,132,fill)
    a.path(f'M{x-25} {y+69}Q{x} {y+62} {x+25} {y+69}M{x-25} {y+82}L{x+26} {y+82}M{x-16} {y+85}L{x-22} {y+148}M{x+17} {y+84}L{x+21} {y+148}',sw=.65)
    a.path(f'M{x-20} {y+44}L{x-34} {y+83}L{x-23} {y+85}M{x+21} {y+43}L{x+35} {y+83}L{x+22} {y+85}',PAPER,sw=.9)

def animal(a,x,y,size=1,kind='dog'):
    a.group(f'translate({x} {y}) scale({size})')
    if kind=='lion':
        a.path('M-39 -13Q-10 -29 14 -10L24 7L5 11L-10 1L-33 0L-37 18L-45 18L-43 -8Z',GOLD,sw=.9)
        a.circle(18,-18,19,GOLD,.9);a.ellipse(22,-17,12,11,PAPER,.75)
        for i in range(9):
            t=i*.65; a.line(18+math.cos(t)*14,-18+math.sin(t)*14,18+math.cos(t)*18,-18+math.sin(t)*18,.5)
        a.path('M29 -18l7 4l-9 5M20 -21l5 1M-41 -12Q-60 -41 -63 -14',sw=.85)
        a.circle(-62,-12,3,GOLD,.65)
    else:
        a.path('M-25 -15Q-8 -24 8 -14L17 -31L19 -48L25 -41L28 -46L34 -31L27 -18L18 -7L15 14L9 14L8 -2L-10 0L-14 14L-21 14L-20 -2L-29 -10Q-47 -20 -42 -32Q-34 -22 -25 -15Z',SAGE if kind=='wolf' else PAPER,sw=.9)
        a.path('M26 -34l6 2M26 -28l8 2M-17 -9l-5 -5M-9 -14l-4 -4',sw=.6)
    a.end()

def horse(a,x,y,scale=1):
    a.group(f'translate({x} {y}) scale({scale})')
    a.path('M-65 -29Q-23 -53 13 -29L22 -62L14 -73L22 -94L31 -83L43 -90L57 -60L70 -44L61 -31L41 -39L32 -14L38 1L34 44L24 44L21 3L8 -6L-20 -5L-33 14L-41 44L-51 44L-48 13L-39 -2L-65 -6L-67 41L-76 41L-78 -4L-75 -28Z',PAPER,sw=1)
    a.path('M17 -65Q6 -41 16 -17M24 -77Q15 -52 25 -33M30 -73Q21 -52 31 -39M48 -68l8 4M58 -49l8 2M-72 -28Q-91 -11 -91 27M-66 -26Q-81 -13 -84 20',sw=.65)
    a.circle(47,-66,1.5,INK,.4)
    for i in range(8): a.path(f'M{-61+i*5} -30q-4 12 -3 21',sw=.45)
    a.path('M-24 -31Q-11 -18 7 -20M28 -29Q21 -16 27 -5M-56 3L-57 31M-70 2L-71 29M29 7L29 33',sw=.55)
    a.end()

def scales(a,x,y,scale=1):
    a.group(f'translate({x} {y}) scale({scale})')
    a.line(0,-30,0,23,1);a.circle(0,-29,3,GOLD,.7)
    a.path('M-28 -18Q0 -24 28 -18M-20 -20L-33 13L-7 13ZM20 -20L7 13L33 13Z',sw=.75)
    a.path('M-34 13Q-20 31 -6 13M6 13Q20 31 34 13',GOLD,sw=.8);a.end()

def sword(a,x,y,scale=1,angle=0):
    a.group(f'translate({x} {y}) rotate({angle}) scale({scale})')
    a.path('M0 -44L6 -32L4 17L-4 17L-6 -32Z',PAPER,sw=.8)
    a.line(0,-41,0,15,.5)
    a.path('M-16 18Q0 12 16 18L16 22L-16 22Z',GOLD,sw=.8)
    a.rect(-3,23,6,19,SAGE,.75)
    for yy in [26,30,34,38]: a.line(-3,yy,3,yy+2,.45)
    a.circle(0,45,4,GOLD,.7);a.end()

def cup(a,x,y,scale=1):
    a.group(f'translate({x} {y}) scale({scale})')
    a.path('M-17 -22L17 -22Q17 2 4 6L4 19L14 22L14 26L-14 26L-14 22L-4 19L-4 6Q-17 2 -17 -22Z',GOLD,sw=.85)
    a.ellipse(0,-22,17,4,PAPER,.65)
    a.path('M-11 -13Q0 -7 11 -13M-10 -8Q0 -2 10 -8M0 -17L0 1',sw=.55)
    a.path('M-17 -16Q-30 -23 -26 -9Q-22 0 -12 -1M17 -16Q30 -23 26 -9Q22 0 12 -1',sw=.7)
    a.line(-9,23,9,23,.5);a.end()

def wand(a,x,y,scale=1,angle=0):
    a.group(f'translate({x} {y}) rotate({angle}) scale({scale})')
    a.path('M-3 44L-5 -36L-1 -47L4 -36L3 44Z',GOLD,sw=.85)
    a.path('M0 -36L0 38M-3 -13l-9 -8M3 12l8 -8M-3 27l-8 -6',sw=.6)
    leaf(a,-10,-20,-45,.46);leaf(a,10,5,48,.49);leaf(a,-9,21,-52,.42)
    a.end()

def coin(a,x,y,scale=1):
    a.group(f'translate({x} {y}) scale({scale})')
    a.circle(0,0,22,GOLD,.8);a.circle(0,0,18,sw=.65)
    pts=[]
    for i in [0,2,4,1,3]:
        t=-math.pi/2+i*2*math.pi/5;pts.append(f'{math.cos(t)*15:.2f},{math.sin(t)*15:.2f}')
    a.path('M'+'L'.join(pts)+'Z',PAPER,sw=.85)
    for i in range(16):
        t=i*math.pi/8;a.line(math.cos(t)*19.8,math.sin(t)*19.8,math.cos(t)*21,math.sin(t)*21,.4)
    a.end()

def scene_fool(a):
    sun(a,207,110,18,False);mountain(a,305);land(a,334)
    a.path('M171 290L210 313L192 331L221 351L199 378L258 378L258 284Z',PAPER,sw=.95)
    hatch(a,208,324,42,43,5,13)
    a.path('M119 250L137 291L133 312L146 316L153 296L143 262M147 247L171 276L174 295L185 294L182 270L164 244',PAPER,sw=.9)
    a.path('M106 167Q144 144 166 174L162 222L181 249Q148 268 111 243L116 207Z',SAGE,sw=1)
    a.path('M113 180l-15 31l-26 -8l-4 10l35 13l21 -31M159 179l22 -17l7 -25l10 2l-5 36l-26 25',PAPER,sw=.9)
    face(a,137,149,14,'side');a.path('M123 139Q130 116 148 132L151 140Z',GOLD,sw=.9)
    a.path('M123 156Q110 142 112 130M139 160L137 180M130 174L121 239M145 182L151 249M156 197L164 241',sw=.7)
    a.line(102,132,194,166,1.4);a.path('M179 163Q166 178 181 192Q201 194 203 173L190 163Z',RUST,sw=.9)
    rose(a,69,204,.65);a.line(70,210,73,224,.7)
    animal(a,92,293,.64);sprig(a,41,356,7,55)

def scene_magician(a):
    land(a,338);rose(a,42,91,.8);sprig(a,37,150,11,60);sprig(a,242,143,-15,56)
    face(a,140,155,14);robe(a,140,172,48,158,RUST)
    a.path('M119 180L107 222L89 286L98 292L122 237M160 179L181 146L184 111L194 112L194 156L169 209',PAPER,sw=1)
    a.path('M123 179L128 255L148 250L154 178',PAPER,sw=.8)
    a.path('M127 118C103 104 112 141 138 119C165 96 175 135 148 126C140 120 133 118 127 118Z',sw=1)
    wand(a,190,104,.4,-8)
    a.rect(57,276,166,13,GOLD,1)
    a.path('M69 289L64 344L76 344L85 289M203 289L198 344L210 344L216 289',PAPER,sw=.9)
    cup(a,88,264,.35);coin(a,140,264,.43);sword(a,183,267,.39,87);wand(a,171,275,.47,89)
    for x,y in [(37,355),(65,369),(215,352),(245,367)]:rose(a,x,y,.58)

def scene_priestess(a):
    column(a,56,139,30,201);column(a,224,139,30,201)
    a.text(56,212,'B',20,0);a.text(224,212,'J',20,0)
    a.path('M80 108Q140 87 200 108L200 333L80 333Z',SAGE,sw=.8)
    for y in [132,164,196,228]:
        for x in [98,140,182]:rose(a,x,y,.45)
    seated(a,140,174,PAPER)
    a.path('M124 157L129 138L136 142L140 130L144 142L151 138L156 157Z',GOLD,sw=.8)
    a.path('M128 164L114 236M152 164L166 236M130 198L150 198M140 188L140 209',sw=.7)
    a.path('M109 251Q127 242 142 252L163 240L170 260L145 274L117 272Z',GOLD,sw=.9)
    a.line(130,253,146,268,.55);a.line(120,257,131,261,.55);a.line(152,251,164,247,.55)
    a.path('M156 336C134 320 118 338 126 353C133 370 158 365 167 349C156 357 149 351 156 336Z',GOLD,sw=.8)
    a.path('M93 345q-12 15 3 23M188 345q12 15 -3 23',sw=.65)

def scene_empress(a):
    mountain(a,290);land(a,335);tree(a,52,298,140);tree(a,239,304,123)
    a.path('M80 205L185 201L197 316L87 325Z',RUST,sw=.9)
    seated(a,136,182,PAPER,True)
    for x,y in [(110,267),(145,285),(161,315),(119,316)]:rose(a,x,y,.48)
    a.path('M111 222L86 245L71 217M162 220L184 234L199 206',PAPER,sw=.9)
    a.line(200,191,199,249,1);a.circle(200,188,6,GOLD,.75)
    for x in [29,42,56,214,228,241]:
        a.path(f'M{x} 368Q{x-4} 349 {x+1} 320',sw=.8)
        for y in [326,335,344]:
            a.path(f'M{x} {y}q-9 -2 -8 -10q8 2 8 10q9 -2 8 -10',GOLD,sw=.6)
    a.path('M89 318L66 338L68 364L91 369L109 347Z',GOLD,sw=.8)
    a.circle(86,344,8,sw=.7);a.path('M86 352L86 362M82 358L90 358',sw=.7)

def scene_emperor(a):
    mountain(a,333);a.path('M83 161L197 161L207 337L75 337Z',SAGE,sw=1)
    for x in [91,187]:
        a.circle(x,178,10,PAPER,.8);a.path(f'M{x-4} 176q-15 -15 -14 0q4 9 11 5M{x+4} 176q15 -15 14 0q-4 9 -11 5',sw=.8)
    seated(a,140,183,RUST,True,True)
    a.path('M115 228L91 252L75 235M165 228L185 251L202 243',PAPER,sw=.9)
    a.line(74,206,74,307,1.3);a.circle(74,201,6,GOLD,.8);a.line(66,214,82,214,.8)
    a.circle(204,237,10,GOLD,.8);a.path('M204 226L204 219M200 222L208 222',sw=.7)
    a.path('M115 338L106 353L122 353L131 335M153 337L158 353L175 353L167 336',GOLD,sw=.9)
    hatch(a,86,307,15,23,3,4);hatch(a,183,306,16,23,3,4)

def scene_hierophant(a):
    a.path('M44 320L44 160Q140 57 236 160L236 320M61 319L61 166Q140 83 219 166L219 319',sw=1)
    column(a,49,181,20,158);column(a,231,181,20,158)
    seated(a,140,165,RUST)
    a.path('M122 152L125 116L132 121L140 105L148 121L155 116L158 152Z',GOLD,sw=.9)
    a.path('M126 132L155 132M125 143L156 143',sw=.6)
    a.path('M119 206L99 196L98 173M162 207L180 230L193 220',PAPER,sw=.9)
    a.path('M94 175L94 160M98 176L98 157M102 178L104 164',sw=.7)
    a.line(194,152,194,299,1.3)
    for y,w in [(167,9),(182,13),(198,17)]:a.line(194-w,y,194+w,y,1)
    a.rect(87,315,106,13,PAPER,.8);a.rect(70,328,140,13,PAPER,.8)
    for x in [79,201]:face(a,x,322,11);robe(a,x,337,33,41,SAGE)
    for x,ang in [(127,-32),(153,32)]:
        a.group(f'translate({x} 354) rotate({ang})');a.circle(0,-13,7,GOLD,.8);a.line(0,-6,0,19,1.5);a.path('M0 13L8 13L8 18M0 18L6 18',sw=1);a.end()

def scene_lovers(a):
    sun(a,140,109,23,False);wings(a,140,144,.8);face(a,140,150,11)
    a.path('M123 164Q140 180 157 164L169 199L111 199Z',RUST,sw=.8)
    mountain(a,333);land(a,346);tree(a,45,322,130,True);tree(a,239,322,130)
    for x,fill in [(92,PAPER),(188,SAGE)]:
        face(a,x,234,12);robe(a,x,249,30,87,fill)
        a.path(f'M{x-17} 263L{x-27} 288L{x-38} 276M{x+17} 263L{x+27} 288L{x+38} 276',PAPER,sw=.8)
        a.path(f'M{x-9} 337L{x-10} 357M{x+9} 337L{x+10} 357',sw=1)
    a.path('M118 290Q140 310 161 290',sw=.55)

def scene_chariot(a):
    a.path('M57 133Q140 107 223 133L218 150L62 150Z',SAGE,sw=.9)
    for x in [72,108,140,173,207]:star(a,x,135,4,5,.45,PAPER)
    a.path('M66 149L66 297M214 149L214 297',sw=1.5)
    face(a,140,192,14);crown(a,140,179)
    a.path('M118 211L162 211L178 270L103 270Z',PAPER,sw=.95)
    a.path('M117 228L162 228M117 244L164 244M128 213L128 260M152 213L152 260',sw=.65)
    a.path('M118 220L91 254L104 269L127 239M162 220L187 253L175 269L153 239',PAPER,sw=.8)
    a.rect(79,267,122,63,GOLD,1);a.rect(87,275,106,42,SAGE,.8)
    star(a,140,295,16,8,.5,PAPER)
    for x in [66,214]:a.circle(x,310,23,PAPER,1);a.circle(x,310,17,sw=.6)
    for x,fill in [(94,SAGE),(187,PAPER)]:
        a.path(f'M{x-31} 354Q{x-29} 334 {x-13} 334L{x+3} 335L{x+5} 312L{x+23} 312L{x+28} 342L{x+17} 353Z',fill,sw=.9)
        face(a,x+14,315,10);a.path(f'M{x+3} 305L{x+25} 305L{x+29} 326L{x+1} 326Z',GOLD,sw=.8)
        a.path(f'M{x-17} 342L{x-18} 358M{x+9} 341L{x+9} 358',sw=.8)

def scene_strength(a):
    mountain(a,311);land(a,345);tree(a,241,320,103)
    a.path('M129 120C106 104 108 144 138 122C166 102 171 139 149 129C143 125 134 119 129 120Z',sw=.9)
    face(a,138,165,13);robe(a,138,181,42,148,PAPER)
    a.path('M126 154Q117 174 124 193M151 154Q164 172 156 193',sw=1)
    for x,y in [(131,151),(139,149),(147,151)]:rose(a,x,y,.32)
    a.path('M115 191L110 230L142 265L149 260L125 223M160 190L174 234L181 268L172 270L160 241L151 212',PAPER,sw=.9)
    animal(a,166,302,1.28,'lion');sprig(a,39,365,-12,54)

def scene_hermit(a):
    mountain(a,346)
    for x,y in [(52,102),(217,89),(232,148),(76,171)]:star(a,x,y,3,4,.3,GOLD)
    a.path('M86 353L116 320L176 324L199 351L258 378L22 378Z',SAGE,sw=.8)
    hatch(a,108,349,91,26,5,12)
    a.path('M136 156Q143 126 160 134Q179 144 176 177L199 336Q158 348 115 332L123 203Z',SAGE,sw=1)
    face(a,149,163,13,'side',True)
    a.path('M135 149Q132 128 154 126Q180 130 178 167L167 179M141 187L125 328M158 209L153 338M171 198L188 330',sw=.8)
    a.path('M132 192L106 213L92 174L84 177L93 228L128 221',PAPER,sw=.9)
    a.line(189,175,193,353,1.4)
    a.path('M167 202L187 217L195 205',PAPER,sw=.9)
    a.path('M74 146L94 146L98 177L70 177Z',GOLD,sw=.85)
    a.path('M78 145Q85 133 91 145M73 178L95 178M76 180L76 186M92 180L92 186',sw=.7)
    star(a,84,161,8,6,.43,PAPER)

def scene_wheel(a):
    for x,y in [(59,122),(221,123),(55,322),(226,322)]:cloud(a,x,y,.85)
    a.circle(140,222,77,GOLD,1);a.circle(140,222,63,PAPER,.8);a.circle(140,222,20,GOLD,.9)
    for i in range(8):
        ang=math.pi*i/4;x,y=math.cos(ang),math.sin(ang)
        a.line(140+x*21,222+y*21,140+x*62,222+y*62,.85)
        a.circle(140+x*70,222+y*70,2,PAPER,.45)
    star(a,140,222,12,8,.4,PAPER)
    a.path('M57 178C30 217 64 237 49 264C39 281 56 294 62 283M59 177l8 -7l-1 10',sw=2)
    a.path('M106 136L120 121L162 123L179 137L106 137Z',SAGE,sw=.9);face(a,143,114,11)
    a.path('M127 106L126 94L137 99L151 94L156 106',GOLD,sw=.8)
    sword(a,166,112,.32,15)
    a.path('M211 256L231 273L215 305L179 305L183 294L211 295L221 279L206 269Z',RUST,sw=.9)
    a.path('M52 107L49 93L57 103L65 96L66 109M48 111Q60 118 72 107M218 109L231 95L233 108L225 116',sw=.9)
    animal(a,226,329,.39,'lion')
    a.path('M44 322l1 -15l8 8l8 -8l1 15M49 323q6 4 10 0',sw=.8)

def scene_justice(a):
    column(a,53,148,27,193);column(a,227,148,27,193)
    a.path('M73 113Q140 93 207 113L207 333L73 333Z',SAGE,sw=.75)
    seated(a,140,178,RUST,True)
    a.path('M118 224L92 246L75 225M162 224L181 246L205 220',PAPER,sw=.9)
    sword(a,75,190,.78)
    scales(a,207,252,.67)
    a.path('M125 198L155 198L149 216L131 216Z',GOLD,sw=.8)
    a.rect(76,335,128,11,PAPER,.8);a.rect(63,346,154,13,PAPER,.8)

def scene_hanged(a):
    land(a,347)
    a.path('M59 356L65 118L43 109L43 96L239 96L239 109L219 117L225 356L211 357L205 115L79 115L73 356Z',SAGE,sw=1)
    for x in [61,216]:sprig(a,x,104,-40 if x==61 else 40,39)
    a.path('M76 105L205 104M67 123L64 335M218 124L220 335',sw=.55)
    a.path('M147 112L154 173L146 202L127 196L137 162L136 116Z',GOLD,sw=.9)
    a.path('M128 197L105 166L113 151L152 179L153 197Z',GOLD,sw=.9)
    a.path('M123 199L153 199L163 264L145 286L119 264Z',RUST,sw=.9)
    a.path('M123 216L101 237L116 264M155 216L177 237L162 264',PAPER,sw=.8)
    halo(a,141,293,19);face(a,141,293,13)
    a.path('M133 281L126 238M146 281L154 236M136 282Q124 309 133 315M148 282Q158 308 149 314',sw=.7)
    a.line(141,111,141,130,.8)

def scene_death(a):
    sun(a,205,189,15,False)
    for x in [183,228]:a.rect(x,184,13,91,SAGE,.75);a.path(f'M{x} 184l2 -10h3v6h3v-6h3v10',sw=.7)
    mountain(a,309);land(a,346)
    horse(a,145,300,.9)
    a.path('M117 217L157 215L165 265L135 271L124 249Z',SAGE,sw=.9)
    face(a,139,202,12)
    a.path('M129 199L149 199M135 202l-2 4M145 202l-2 4M136 212h9M137 211v4M141 211v4M145 211v4',sw=.8)
    a.path('M126 224L99 251L105 261L135 247M155 227L178 227L180 212',PAPER,sw=.85)
    a.line(180,131,180,305,1.25)
    a.path('M180 136Q150 126 128 140L132 178Q156 162 180 170Z',INK,sw=.9)
    rose(a,155,151,.75)
    for x,y in [(43,360),(82,356),(213,365),(244,348)]:sprig(a,x,y,0,23);rose(a,x,y-25,.38)

def scene_temperance(a):
    sun(a,223,142,14,False);mountain(a,315);water(a,340)
    a.path('M144 329Q197 308 258 318L258 378L154 378Z',PAPER,sw=.8)
    wings(a,140,173,.94);halo(a,140,166,19);face(a,140,166,13)
    robe(a,140,184,46,138,PAPER)
    a.path('M116 202L90 236L99 246L123 222M164 202L191 245L181 256L155 223',PAPER,sw=.9)
    cup(a,91,230,.46);cup(a,183,250,.46)
    a.path('M99 228C114 222 147 257 173 247M101 232C116 229 147 262 174 251',sw=.7,stroke=SAGE)
    a.path('M124 322L115 354L129 356L138 326M151 323L168 345L181 343L163 316',PAPER,sw=.9)
    a.path('M130 216L150 216L140 233Z',GOLD,sw=.7)
    for x,y in [(219,347),(236,365)]:sprig(a,x,y,-8,42);rose(a,x,y-44,.4)

def scene_devil(a):
    a.path('M45 161L75 113L111 132L140 106L168 134L207 113L236 160L209 198L181 182L170 250L110 250L98 182L72 198Z',SAGE,sw=1)
    a.path('M102 134C79 90 98 95 111 118M170 134C191 89 180 94 166 117',GOLD,sw=1)
    face(a,140,148,18);a.path('M127 150l8 -3M145 147l8 3M130 161l10 8l10 -8',sw=.9)
    a.path('M113 177L140 197L169 177M139 198L139 243M118 210L161 210',sw=.75)
    star(a,140,116,10,5,.46,GOLD)
    a.rect(107,250,66,33,GOLD,.9);a.rect(92,283,96,17,PAPER,.9)
    for x,sgn in [(72,-1),(208,1)]:
        face(a,x,282,11);robe(a,x,298,28,61,PAPER)
        a.path(f'M{x-10} 271l-3 -9M{x+10} 271l3 -9M{x-sgn*17} 322Q{x-sgn*32} 343 {x-sgn*20} 356',sw=.85)
    for i in range(8):
        a.ellipse(84+i*6,291-i*1.5,4,2.4,sw=.65)
        a.ellipse(196-i*6,291-i*1.5,4,2.4,sw=.65)
    a.path('M104 190L72 210L56 197M176 190L199 214L226 203',PAPER,sw=.9)
    a.path('M52 197C31 175 54 177 44 158C71 176 71 188 52 197Z',RUST,sw=.8)

def scene_tower(a):
    water(a,345)
    a.path('M65 345L92 303L138 298L188 329L215 345Z',SAGE,sw=.9)
    a.path('M104 316L109 162L169 162L178 316Z',PAPER,sw=1)
    a.path('M112 164L112 147L120 147L120 154L130 154L130 147L141 147L141 154L152 154L152 147L163 147L163 163Z',GOLD,sw=.9)
    for yy in range(174,312,14):
        a.line(109,yy,175,yy,.45)
        for xx in range(114+(7 if yy%28 else 0),173,20):a.line(xx,yy,xx,yy+14,.45)
    for x,y in [(133,192),(136,239)]:
        a.path(f'M{x-7} {y+22}L{x-7} {y}Q{x} {y-13} {x+7} {y}L{x+7} {y+22}Z',INK,sw=.7)
    a.path('M222 87L179 120L189 125L144 155L161 131L151 126Z',GOLD,sw=.8)
    a.path('M146 144C158 110 171 137 168 149M118 151C101 127 103 115 117 123',RUST,sw=.8)
    for x,y,rot in [(70,237,-40),(208,277,35)]:
        a.group(f'translate({x} {y}) rotate({rot})');face(a,0,0,10);robe(a,0,12,24,46,RUST);a.path('M-13 24L-29 6M13 24L28 8M-7 58L-12 79M7 58L18 76',sw=1);a.end()
    for x,y in [(65,174),(194,185),(205,227),(78,290)]:star(a,x,y,4,5,.5,GOLD)
    a.path('M90 120L105 108L117 112L109 126L95 129Z',GOLD,sw=.8)

def scene_star(a):
    star(a,140,112,32,8,.36,GOLD)
    for x,y,r in [(66,93,8),(220,96,8),(57,161,9),(218,157,10),(82,197,7),(198,200,7),(140,171,6)]:star(a,x,y,r,8,.38,PAPER)
    a.path('M24 264Q55 250 95 261Q151 280 183 261Q218 247 257 264L258 378L22 378Z',PAPER,sw=.8)
    water(a,330)
    a.path('M130 271L165 293L185 329L175 338L154 310L134 298L125 323L116 342L91 342L94 334L112 332L109 302Z',PAPER,sw=.9)
    face(a,134,233,13,'side');a.path('M123 223Q136 208 150 226L158 256L146 254M125 228Q117 250 129 258',sw=.9)
    a.path('M123 250Q135 246 148 254L144 279L126 292L115 271Z',SAGE,sw=.9)
    a.path('M120 252L99 273L70 283L73 292L106 286L129 270M146 255L170 278L201 287L197 296L164 291L140 274',PAPER,sw=.9)
    a.path('M126 255Q138 261 143 276M123 269L120 280M132 294L151 307M142 292L161 307M120 310L120 328M157 314L169 331M104 277L84 285M169 282L190 291',sw=.5)
    a.path('M57 284L74 277L85 288L71 303L58 299Z',GOLD,sw=.9)
    a.path('M192 285L207 280L217 296L204 306L193 300Z',GOLD,sw=.9)
    a.path('M67 300Q58 322 74 337M70 302Q62 324 77 339M206 304Q218 328 209 344M210 304Q224 329 214 345',sw=.9,stroke=SAGE)
    for x in [50,66,88,202,219,237]:a.path(f'M{x} 351q7 -3 13 0',sw=.5)
    tree(a,237,282,76);a.path('M235 221q-15 -17 -25 -10l11 7l-3 8l18 -5',GOLD,sw=.75)
    sprig(a,36,316,-12,38)
    for x,y in [(24,132),(227,129),(28,209),(215,220)]:
        for i in range(3):a.path(f'M{x} {y+i*4}q9 -1 17 0',sw=.3)
    a.path('M87 313q8 -4 17 0M176 318q8 -3 13 0',sw=.5)

def scene_moon(a):
    a.circle(140,120,50,sw=.45,stroke=GOLD);moon(a,140,120,40)
    for i in range(14):
        t=math.pi+i*math.pi/13;x=140+math.cos(t)*57;y=120+math.sin(t)*57
        a.line(x,y,140+math.cos(t)*63,120+math.sin(t)*63,.6,stroke=GOLD)
    for x in [49,206]:
        a.rect(x,211,25,87,SAGE,.9)
        a.path(f'M{x-3} 211v-17h6v8h6v-8h7v8h6v-8h6v17Z',PAPER,sw=.9)
        a.path(f'M{x+8} 249v-20q4 -10 9 0v20Z',INK,sw=.6)
        hatch(a,x+3,267,19,23,4,5)
    a.path('M22 299Q55 284 88 302Q121 321 140 303Q181 278 217 298L258 292L258 378L22 378Z',PAPER,sw=.8)
    a.path('M111 378C126 342 133 340 132 314C131 285 160 284 145 263C137 251 153 242 161 231',fill='none',sw=14,stroke=GOLD)
    a.path('M105 378C120 341 127 338 126 314C125 282 154 282 141 265M118 378C133 345 139 341 138 314C137 291 166 286 152 262',sw=.55)
    animal(a,88,303,.8);animal(a,198,303,.85,'wolf')
    for x,y in [(105,197),(135,200),(164,197),(89,225),(185,222)]:
        a.path(f'M{x} {y}q-5 8 0 10q5 -2 0 -10Z',GOLD,sw=.55)
    for x,y in [(29,161),(217,173),(28,186),(222,161)]:
        for i in range(4):a.path(f'M{x} {y+i*3}q8 -1 17 0',sw=.3)
    water(a,350)
    a.ellipse(140,361,6,11,RUST,.8)
    a.path('M137 351L130 343L127 346M143 351L150 343L153 346M135 355L125 350L122 344M145 355L155 350L158 344M135 361L124 359M145 361L156 359M138 370L132 376M142 370L148 376',sw=.8)

def scene_sun(a):
    sun(a,140,119,40,True)
    a.path('M22 273L258 273L258 317L22 317Z',SAGE,sw=.85)
    for yy in [284,298,310]:
        a.line(22,yy,258,yy,.5)
        for xx in range(30+(8 if yy==298 else 0),258,22):a.line(xx,yy,xx,yy+12,.45)
    for x,h in [(42,227),(68,234),(217,228),(242,216)]:
        a.line(x,h+14,x,273,.8);leaf(a,x,h+35,-60,.45);leaf(a,x,h+31,60,.45)
        for i in range(12):
            t=i*math.pi/6;star(a,x+math.cos(t)*12,h+math.sin(t)*12,5,4,.45,GOLD)
        a.circle(x,h,7,RUST,.8)
        for i in [-3,0,3]:a.line(x+i,h-4,x+i,h+4,.45)
    land(a,346);horse(a,146,313,.83)
    face(a,126,235,11);a.path('M117 248L137 247L146 278L124 280L113 265Z',PAPER,sw=.9)
    a.path('M120 252L100 265L93 254M134 253L153 256L177 235',PAPER,sw=.8)
    a.path('M125 280L151 298L158 329L149 331L140 307L117 289',PAPER,sw=.85)
    a.path('M115 228Q128 214 139 231',sw=.9);rose(a,127,222,.5)
    a.line(180,182,175,322,1.25)
    a.path('M182 186Q219 166 243 182L235 204Q208 193 180 214Z',RUST,sw=.9)
    a.path('M190 189Q213 177 235 185M188 197Q211 185 238 192',sw=.6)

def scene_judgement(a):
    wings(a,140,134,.95);face(a,140,145,13)
    a.path('M121 161L159 161L173 193L107 193Z',SAGE,sw=.8)
    a.path('M126 166L104 184L82 187M152 166L162 177L110 190',PAPER,sw=.85)
    a.path('M123 175L73 193L64 184L56 207L70 204L126 182Z',GOLD,sw=.9)
    a.path('M99 189L101 232L127 232L123 182Z',PAPER,sw=.8)
    a.path('M108 197L113 226M101 210L120 210',sw=3,stroke=RUST)
    mountain(a,308);water(a,330)
    for x,y in [(77,299),(143,320),(210,293)]:
        a.path(f'M{x-28} {y+31}L{x+23} {y+31}L{x+33} {y+49}L{x-35} {y+49}Z',GOLD,sw=.85)
        face(a,x,y-18,10);robe(a,x,y-5,27,41,PAPER)
        a.path(f'M{x-13} {y+3}L{x-25} {y-19}L{x-22} {y-35}M{x+13} {y+3}L{x+26} {y-19}L{x+23} {y-35}',sw=1.3)

def scene_world(a):
    a.ellipse(140,235,80,131,sw=.9)
    a.ellipse(140,235,72,121,sw=.7)
    for i in range(30):
        t=i*2*math.pi/30;x=140+math.cos(t)*77;y=235+math.sin(t)*127
        leaf(a,x,y,math.degrees(t)+80,.64)
    for y in [108,360]:
        a.path(f'M120 {y}Q140 {y-14} 160 {y}L151 {y+9}L140 {y+2}L127 {y+10}Z',RUST,sw=.8)
    face(a,142,195,13);a.path('M130 184Q145 172 157 190L161 214',sw=1)
    a.path('M129 213L151 211L155 265L139 280L121 262Z',PAPER,sw=.9)
    a.path('M129 228L106 257L96 252M151 226L173 249L184 242',PAPER,sw=.85)
    a.path('M138 275L153 302L145 337L135 336L140 306L129 289M133 277L115 298L134 320L143 315L126 298L145 283',PAPER,sw=.9)
    a.path('M121 218C184 226 160 268 113 279L120 293C180 275 199 229 154 209Z',SAGE,sw=.8)
    wand(a,94,245,.35,15);wand(a,184,242,.35,-15)
    for x,y in [(47,107),(231,109),(44,352),(234,352)]:cloud(a,x,y,.64)
    face(a,46,100,10);wings(a,46,113,.35)
    a.path('M225 102l15 -15l8 8l-15 15l-13 5M230 110l-10 15',GOLD,sw=.8)
    a.path('M34 350l1 -16l8 7l8 -7l1 16M38 352q7 4 12 0',sw=.8)
    animal(a,235,356,.37,'lion')

MAJOR = [
 ('The Fool',scene_fool,'A traveller steps toward a cliff with a small dog, a flower and a tied bundle.'),
 ('The Magician',scene_magician,'A robed figure raises a branch above a table holding a cup, coin, sword and wand.'),
 ('The High Priestess',scene_priestess,'A seated figure holds a scroll between two lettered pillars beneath a crescent crown.'),
 ('The Empress',scene_empress,'A crowned figure rests among wheat, flowers and leafy trees with a round sceptre.'),
 ('The Emperor',scene_emperor,'A bearded ruler sits on a throne with ram details, holding a staff and an orb.'),
 ('The Hierophant',scene_hierophant,'A ceremonial figure sits beneath a temple arch with a triple cross and crossed keys.'),
 ('The Lovers',scene_lovers,'Two figures stand between trees beneath a winged figure and a small sun.'),
 ('The Chariot',scene_chariot,'An armoured figure stands in a wheeled carriage beneath a starred canopy and above two sphinxes.'),
 ('Strength',scene_strength,'A flower crowned figure gently reaches toward a lion in a mountain meadow.'),
 ('The Hermit',scene_hermit,'A cloaked elder stands on a mountain holding a lantern with a six pointed star and a staff.'),
 ('Wheel of Fortune',scene_wheel,'An eight spoke wheel turns between clouds, with a snake, a sphinx and small winged creatures.'),
 ('Justice',scene_justice,'A crowned figure sits between pillars, holding an upright sword and balanced scales.'),
 ('The Hanged Man',scene_hanged,'A haloed figure hangs upside down by one foot from a leafy wooden frame.'),
 ('Death',scene_death,'A skull faced rider sits on a pale horse with a flower banner; a sun rises between distant towers.'),
 ('Temperance',scene_temperance,'A winged figure pours water between two cups with one foot on land and one in water.'),
 ('The Devil',scene_devil,'A horned winged figure stands above a pedestal, two smaller robed figures and loose chains.'),
 ('The Tower',scene_tower,'Lightning strikes a stone tower; a crown, sparks and two figures fall beside it.'),
 ('The Star',scene_star,'A kneeling figure pours water from two pitchers beneath one large and seven small eight pointed stars.'),
 ('The Moon',scene_moon,'A crescent faced moon shines above two towers, a dog, a wolf, a winding path and a crayfish.'),
 ('The Sun',scene_sun,'A bright face appears in a sun with straight rays above sunflowers, a child, a pale horse and a red banner.'),
 ('Judgement',scene_judgement,'A winged figure sounds a trumpet with a cross banner above three figures lifting their arms from water.'),
 ('The World',scene_world,'A dancing figure holds two branches inside an oval leafy wreath with four small creatures at its corners.'),
]

ROMAN = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI']
RANKS = ['Ace','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Page','Knight','Queen','King']
SUITS = {'w':('Wands',wand,SAGE),'c':('Cups',cup,GOLD),'s':('Swords',sword,SAGE),'p':('Pentacles',coin,GOLD)}

def frame(a,number,name):
    # A bright board-game frame, with a cream rim and deliberately stout ink.
    a.raw(f'<rect x="3" y="3" width="274" height="454" rx="20" fill="{PAPER}" stroke="{INK}" stroke-width="3"/>')
    a.raw(f'<rect x="10" y="10" width="260" height="440" rx="14" fill="{a.panel}"/>')
    a.raw(f'<rect x="22" y="57" width="236" height="322" rx="9" fill="{PAPER}" stroke="{INK}" stroke-width="1.8"/>')
    pill_width=82 if len(number)>3 else 58
    a.rect(140-pill_width/2,21,pill_width,27,PAPER,1.2,rx=13.5)
    a.text(140,39,number,13,.8)
    # Small framing marks are expressive without repeating UI star decorations.
    a.path('M34 33L44 28L40 40Z',PAPER,sw=.9)
    a.path('M238 28L246 35L234 39Z',PAPER,sw=.9)
    a.raw(f'<rect x="22" y="390" width="236" height="51" rx="9" fill="{PAPER}" stroke="{INK}" stroke-width="1.8"/>')
    words=name.upper().split()
    if len(name)>18:
        split=max(1,len(words)//2)
        a.text(140,412,' '.join(words[:split]),11.4,.45)
        a.text(140,428,' '.join(words[split:]),11.4,.45)
    else:a.text(140,420,name.upper(),12.5,.25)

def finish(a,ident,title,desc):
    xml=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 460" role="img" aria-labelledby="title desc"><title id="title">{escape(title)}</title><desc id="desc">{escape(desc)}</desc><g stroke-linecap="round" stroke-linejoin="round">'+''.join(a.parts)+'</g></svg>'
    (OUT/f'{ident}.svg').write_text(xml,encoding='utf-8')

def pip_positions(rank,suit):
    if rank==1:return [(140,219,1.85)]
    if rank==2:return [(140,145,1.18),(140,287,1.18)]
    if rank==3:return [(140,121,1.0),(140,220,1.0),(140,319,1.0)]
    if rank==4:return [(83,146,.98),(197,146,.98),(83,286,.98),(197,286,.98)]
    if rank==5:return [(83,129,.88),(197,129,.88),(140,218,.88),(83,309,.88),(197,309,.88)]
    if rank==6:return [(x,y,.83) for y in [119,219,319] for x in [83,197]]
    if rank==7:return [(x,y,.75) for y in [118,220,322] for x in [80,200]]+[(140,220,.75)]
    if rank==8:return [(x,y,.66) for y in [99,178,257,336] for x in [82,198]]
    if rank==9:return [(x,y,.66) for y in [121,219,317] for x in [76,140,204]]
    return [(x,y,.62) for y in [94,155,219,283,344] for x in [82,198]]

def minor_background(a,suit,rank):
    # Landscape filigree stays peripheral so every pip can be counted.
    if suit=='w':
        for x,ang in [(39,-5),(241,5)]:sprig(a,x,368,ang,73+rank*4)
        a.path('M24 369Q140 357 256 369',sw=.6)
        for i in range(8):a.line(36+i*28,369,32+i*28,376,.4)
    elif suit=='c':
        for row in range(3):
            a.path(f'M25 {359+row*7}q16 -6 32 0t32 0t32 0t32 0t32 0t32 0t32 0',sw=.55,stroke=SAGE)
        for x,y in [(40,80),(240,82)]:cloud(a,x,y,.35)
    elif suit=='s':
        for x,y in [(41,102),(240,102),(39,296),(239,296)]:
            a.path(f'M{x-5} {y-13}L{x+5} {y+13}M{x-10} {y-7}L{x} {y+19}',sw=.4)
        a.path('M27 370L61 351L94 367L137 354L177 367L216 349L252 371',sw=.6)
        a.path('M30 377L66 362M185 376L218 359',sw=.45)
    else:
        for x in [37,242]:
            a.path(f'M{x} 374Q{x-4} 348 {x} 311',sw=.7)
            for y in [324,335,346,357]:
                a.path(f'M{x} {y}q-8 -2 -8 -10q8 2 8 10q8 -2 8 -10',GOLD,sw=.55)
        a.path('M24 373Q140 359 256 373',sw=.55)

def minor_pips(a,suit,rank):
    minor_background(a,suit,rank)
    if rank==1:
        # A cloud emerging hand gives the four aces a distinct engraving.
        cloud(a,140,325,1.25)
        a.path('M119 310L119 283Q123 273 129 279L132 267Q137 259 142 268L149 271L151 255Q157 251 160 259L156 283L168 277Q175 280 170 288L158 307Z',PAPER,sw=.85)
        a.path('M130 282L130 294M143 281L140 296M153 282L149 297',sw=.6)
        fn=SUITS[suit][1]
        if suit=='w':fn(a,140,205,1.55,-7)
        elif suit=='s':fn(a,140,199,1.7,0)
        elif suit=='c':fn(a,140,207,1.65)
        else:fn(a,140,207,1.75)
        if suit=='c':a.path('M113 245q-12 30 -4 49M129 251q-5 21 -2 39M150 251q5 21 2 39M166 245q12 30 4 49',sw=.65,stroke=SAGE)
        if suit=='p':sprig(a,52,298,-13,75);sprig(a,228,298,13,75)
        return
    for i,(x,y,s) in enumerate(pip_positions(rank,suit)):
        fn=SUITS[suit][1]
        if suit=='w':fn(a,x,y,s,-8 if i%2==0 else 8)
        elif suit=='s':fn(a,x,y,s,8 if i%2==0 else -8)
        else:fn(a,x,y,s)
    # Fine connecting vines echo the suit without adding extra suit symbols.
    if suit=='w' and rank>=4:
        a.path('M129 83Q119 152 137 209T131 355',sw=.45)
    if suit=='c' and rank in [2,4,6,8,10]:
        a.path('M130 88Q140 79 150 88M135 84L140 78L145 84',sw=.6)

def court(a,suit,rank):
    name,fn,tint=SUITS[suit];mountain(a,308);land(a,347)
    if rank==11:
        face(a,131,169,13,'side')
        a.path('M116 161Q123 140 147 151L151 163Z',tint,sw=.9)
        a.path('M135 146Q136 129 150 131L145 153',PAPER,sw=.75)
        robe(a,131,186,41,112,tint)
        a.path('M115 212L102 247L116 259M151 208L171 238L185 226',PAPER,sw=.9)
        a.path('M113 298L111 344L124 348L132 299M143 298L151 343L165 343L156 296',PAPER,sw=.9)
        a.path('M112 345L101 352L125 353M152 344L167 353L145 353',GOLD,sw=.8)
        if suit in ['w','s']:fn(a,184,213,.85,3)
        else:fn(a,183,219,.9)
        a.path('M124 191L127 241M141 191L147 260',sw=.7)
    elif rank==12:
        horse(a,141,305,.9)
        face(a,136,192,12,'side')
        a.path('M124 186Q133 166 149 183L154 195L128 197Z',GOLD,sw=.9)
        a.path('M148 177Q164 145 177 158Q164 162 155 185Z',RUST,sw=.8)
        a.path('M123 209L154 211L164 265L124 269Z',tint,sw=.9)
        a.path('M126 214L108 242L122 251M155 218L173 235L190 221',PAPER,sw=.9)
        a.path('M137 267L163 286L170 326L160 328L150 295L126 282',PAPER,sw=.9)
        a.path('M126 223L153 223M129 237L155 237M134 249L158 249',sw=.7)
        if suit in ['w','s']:fn(a,194,188,.94,8)
        else:fn(a,191,210,.92)
    else:
        seated(a,140,175,tint,True,rank==14)
        a.path('M118 218L96 245L77 230M164 219L185 246L208 230',PAPER,sw=.9)
        if suit in ['w','s']:fn(a,78,211,.86)
        else:fn(a,78,225,.98)
        if rank==13:
            rose(a,209,224,.75);a.line(209,230,209,263,.85)
            a.path('M121 182Q109 193 114 221M156 182Q169 191 164 220',sw=.85)
        else:
            a.line(208,204,208,288,1);a.circle(208,198,7,GOLD,.8)
            a.path('M204 198L212 198M208 194L208 203',sw=.6)
        # Each throne carries a suit appropriate carved relief.
        for x in [100,180]:
            if suit=='w':leaf(a,x,162,-15 if x<140 else 15,.6)
            elif suit=='c':a.path(f'M{x-8} 151q8 -8 16 0l-3 12h-10Z',GOLD,sw=.65)
            elif suit=='s':a.path(f'M{x-8} 160l8 -17l8 17M{x-7} 154h14',sw=.7)
            else:star(a,x,155,9,5,.45,GOLD)
        a.rect(77,337,126,10,PAPER,.75);a.rect(68,347,144,11,PAPER,.75)
    if suit=='c':a.path('M24 366q19 -6 38 0t38 0t38 0t38 0t38 0t38 0',sw=.6,stroke=SAGE)
    if suit=='w':sprig(a,39,364,-12,54);sprig(a,241,365,12,48)
    if suit=='p':sprig(a,39,364,-12,45);rose(a,241,357,.65)
    if suit=='s':cloud(a,49,113,.6);cloud(a,225,105,.5)

def card_back():
    a=Drawing('lilac')
    a.raw(f'<rect x="3" y="3" width="274" height="454" rx="20" fill="{PAPER}" stroke="{INK}" stroke-width="3"/>')
    a.raw(f'<rect x="13" y="13" width="254" height="434" rx="12" fill="{LAVENDER}" stroke="{INK}" stroke-width="2"/>')
    a.raw(f'<rect x="26" y="26" width="228" height="408" rx="7" fill="none" stroke="{PAPER}" stroke-width="4"/>')
    # Strong flat celestial illustrations, deliberately sized for card picking.
    for x,y,r,fill in [(56,64,14,GOLD),(218,75,12,PAPER),(52,363,12,RUST),(217,394,14,GOLD),(132,401,9,PAPER),(149,63,9,SAGE)]:
        star(a,x,y,r,4,.38,fill)
    for x,y in [(52,108),(230,344),(80,411),(215,120)]:a.circle(x,y,3,PAPER,1)
    a.group('translate(67 143) rotate(-20)')
    a.circle(0,0,17,BLUE,1.5)
    a.ellipse(0,0,30,8,sw=1.5)
    a.path('M-9 -9q10 -5 19 0M-10 7q9 5 18 0',sw=.8);a.end()
    a.group('translate(214 313) rotate(23)')
    a.circle(0,0,20,RUST,1.5)
    a.circle(-6,-5,5,PAPER,.75);a.circle(7,5,3,PAPER,.75)
    a.ellipse(0,0,31,10,sw=1.5);a.end()
    # An orbit joins the sun and moon; the front segment passes below them.
    a.group('translate(140 232) rotate(-27)')
    a.ellipse(0,0,103,38,sw=1.8)
    a.end()
    sun(a,118,204,45,True)
    a.circle(169,264,43,PAPER,1.65)
    a.path('M182 223C140 224 131 280 178 305C153 294 166 248 182 223Z',SAGE,sw=1.5)
    a.path('M170 255q6 -5 12 -1M174 258l-3 10l6 1M174 278q5 2 10 0',sw=.9)
    star(a,186,248,5,4,.4,RUST)
    a.group('translate(140 232) rotate(-27)')
    a.path('M-103 0C-93 46 78 51 103 0',sw=1.8);a.end()
    star(a,68,272,11,4,.4,PAPER);star(a,211,196,10,4,.4,GOLD)
    a.path('M109 353q15 -10 30 0q15 10 30 0M114 363q12 -7 24 0q12 7 24 0',sw=1.2,stroke=PAPER)
    finish(a,'back','Sela Tarot card reverse','A yellow sun and blue crescent moon sit inside an orbit on a purple card, surrounded by bold stars, two small planets and a chunky cream border.')

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    for i,(name,scene,desc) in enumerate(MAJOR):
        theme=['rose','gold','lilac','aqua','rose','blue'][i%6]
        if i==17:theme='lilac'
        elif i==18:theme='blue'
        elif i==19:theme='gold'
        a=Drawing(theme);frame(a,ROMAN[i],name)
        a.raw('<g clip-path="url(#scene)"><defs><clipPath id="scene"><rect x="23" y="58" width="234" height="320"/></clipPath></defs>')
        scene(a);a.end();finish(a,f'm{i:02}',name,desc)
    for key,(suit,fn,tint) in SUITS.items():
        for rank in range(1,15):
            title=f'{RANKS[rank-1]} of {suit}';a=Drawing(key);frame(a,str(rank) if rank<=10 else ['PAGE','KNIGHT','QUEEN','KING'][rank-11],title)
            a.raw('<g clip-path="url(#scene)"><defs><clipPath id="scene"><rect x="23" y="58" width="234" height="320"/></clipPath></defs>')
            if rank<=10:minor_pips(a,key,rank)
            else:court(a,key,rank)
            a.end()
            if rank<=10:
                desc=f'{rank} '+({'w':'leaf bearing carved branch','c':'engraved two handled goblet','s':'long sword with a wrapped grip','p':'round coin bearing a five pointed star'}[key])+('s' if rank!=1 else '')+' arranged in a parchment framed landscape.'
            else:desc=f'A {RANKS[rank-1].lower()} '+('on a pale horse' if rank==12 else 'on an engraved throne' if rank>12 else 'standing in a landscape')+f', holding the symbol of {suit.lower()}.'
            finish(a,f'{key}{rank:02}',title,desc)
    card_back()
    print(f'Created {len(list(OUT.glob("*.svg")))} original SVGs in {OUT}')

if __name__=='__main__':main()
