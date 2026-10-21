import struct, os, glob, json, re
from collections import defaultdict
rows=[]
for f in glob.glob("/Library/Audio/Apple Loops/Apple/*/*.caf"):
    b=open(f,'rb').read(); p=8; meta={}; frames=None; rate=44100; fpp=1024
    while p<len(b)-12:
        t=b[p:p+4]; sz=struct.unpack('>q',b[p+4:p+12])[0]
        if t==b'desc': rate=struct.unpack('>d',b[p+12:p+20])[0]
        if t==b'pakt': frames=struct.unpack('>q',b[p+20:p+28])[0]
        if t==b'uuid' and b'beat count' in b[p+12:p+12+sz]:
            parts=b[p+12+20:p+12+sz].split(b'\x00')
            for i in range(0,len(parts)-1,2): meta[parts[i].decode('latin1')]=parts[i+1].decode('latin1')
        if sz<0: break
        p+=12+sz
    if not meta or not frames: continue
    dur=frames/rate; beats=int(meta.get('beat count',0) or 0)
    bpm=round(beats*60/dur,1) if beats else 0
    name=os.path.basename(f)[:-4]; fam=re.sub(r'\s+(Beat|Bass|Synth|Piano|Guitar|Electric|Clav|Chords|Arp|Pad|Lead|Strings|Brass|Hi-Hat|Percussion|Vox|Topper|Keys|Riser|FX|Stabs|Gated|Swell|Gliding|Slap|Funk|Rhythm|Wah|Organ|Bell|Drum|Drums|Kit|Groove|Fill|Sub|Kick|Snare|Clap|Shaker|Tambourine|Pluck|Plucks|Mallet|Marimba|Vibes|Choir|Horn|Lead Guitar|Auto).*$','',name)
    rows.append(dict(f=f,name=name,fam=fam,genre=os.path.basename(os.path.dirname(f)),cat=meta.get('category'),sub=meta.get('subcategory'),key=meta.get('key signature'),beats=beats,dur=round(dur,3),bpm=bpm,desc=meta.get('descriptors')))
json.dump(rows,open('catalog.json','w'),indent=0)
fam=defaultdict(list)
for r in rows: fam[(r['genre'],r['fam'])].append(r)
for (g,fm),rs in sorted(fam.items()):
    if g[:2] in ('02','07','08','09') and len(rs)>=3:
        cats=sorted(set(r['cat'] for r in rs)); print(g,'|',fm,'|',rs[0]['bpm'],'|',sorted(set(str(r['key']) for r in rs)),'|',cats,'|',len(rs))
