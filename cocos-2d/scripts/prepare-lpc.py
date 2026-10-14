"""Pack selected, attributed LPC art for Mossvale. All crops remain reproducible.
No source art is overwritten; derived atlases are distributed with their credits.
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import json,csv,hashlib,uuid,re,html,zipfile
ROOT=Path(__file__).resolve().parents[2]; LIB=ROOT/'vendor/lpc'; OUT=ROOT/'cocos-2d/assets/resources'; QA=ROOT/'cocos-2d/qa'
OGA=LIB/'opengameart'; BASE=OGA/'liberated-pixel-cup-lpc-base-assets-sprites-map-tiles/extracted/LPC Base Assets/tiles'
# Expand selected source packs only. Paths in upstream archives never escape the library.
PACKS=['liberated-pixel-cup-lpc-base-assets-sprites-map-tiles','lpc-wooden-furniture','lpc-floors','lpc-walls','lpc-windows-doors','lpc-containers','lpc-flowers-plants-fungi-wood','lpc-plant-repack','lpc-city-inside','lpc-items-and-game-effects','lpc-revised-the-office']
for slug in PACKS:
 folder=OGA/slug
 for archive in folder.glob('*.zip'):
  if slug=='lpc-wooden-furniture' and archive.name=='layers.zip':continue
  with zipfile.ZipFile(archive) as z:
   for info in z.infolist():
    path=Path(info.filename)
    if info.is_dir() or path.is_absolute() or '..' in path.parts or (info.external_attr>>16)&0o170000==0o120000:continue
    target=folder/'extracted'/path
    if not target.exists():target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(info))

source_files={
 'coffee':OGA/'lpc-revised-the-office/extracted/Coffee Maker.png','mug':OGA/'lpc-revised-the-office/extracted/Coffee Cup.png',
 'wood':OGA/'lpc-wooden-furniture/blonde-wood_3.png', 'upholstery':OGA/'lpc-upholstery/upholstery_3.png',
 'floors':OGA/'lpc-floors/extracted/lpc-floors/floors.png', 'walls':OGA/'lpc-walls/extracted/lpc-walls/walls.png',
 'items':OGA/'lpc-items-and-game-effects/extracted/ItemsAndEffects/items1.png', 'doors':OGA/'lpc-windows-doors/extracted/lpc-windows-doors-v2/windows-doors.png',
 'plants':OGA/'lpc-flowers-plants-fungi-wood/extracted/lpc-flowers-plants-fungi-wood/plants.png',
 'trees':OGA/'lpc-plant-repack/plant repack_2.png', 'containers':OGA/'lpc-containers/extracted/container-v4_2/container.png',
 'city':OGA/'lpc-city-inside/extracted/LPC_city_inside/city_inside.png', 'fountain':OGA/'lpc-water-fountain/WaterFountain.png',
 **{k:BASE/(k+'.png') for k in ['grass','dirt','cup','rock','kitchen','castle_lightsources','house']}}
images={k:Image.open(p).convert('RGBA') for k,p in source_files.items()}; frames={}; crops={};sources={}
def cut(key,src,rect,trim=False):
 x,y,w,h=rect;im=images[src].crop((x,y,x+w,y+h))
 if trim:
  box=im.getbbox()
  if box:im=im.crop(box)
 if not im.getbbox():raise ValueError('Empty sprite: '+key)
 crops[key]=im;sources[key]={'file':str(source_files[src].relative_to(ROOT)),'rect':rect};return im
# Each metre uses a 32 px tile. Furniture keeps the same pixel density as people.
for i in range(4):
 cut('grass'+str(i),'grass',(32,96,32,32))
 if i:
  tuft=images['grass'].crop((32*i%96,0,32*i%96+32,32))
  crops['grass'+str(i)].alpha_composite(tuft)
  sources['grass'+str(i)]['overlay']=[32*i%96,0,32,32]
for i in range(4):cut('paving'+str(i),'floors',(384+(i%2)*32,1632+(i//2)*32,32,32));cut('planks'+str(i),'floors',(192+(i%4)*32,1216,32,32))
cut('soil','dirt',(32,96,32,32));cut('tile-bath','floors',(64,1600,32,32))
cut('wall-fill','walls',(32,128,32,16));cut('wall-n','walls',(32,224,32,16));cut('wall-s','walls',(32,304,32,16));cut('wall-w','walls',(0,256,16,32));cut('wall-e','walls',(80,256,16,32))
cut('table','wood',(224,224,64,64),True)
cut('chair0','wood',(416,544,32,32),True);cut('chair1','wood',(448,544,32,32),True);cut('chair2','wood',(384,544,32,32),True);cut('chair3','wood',(480,544,32,32),True)
for i,x in enumerate([32,64,0,96]):cut('armchair'+str(i),'upholstery',(x,128,32,32),True)
cut('shelf','wood',(256,288,64,64),True)
bookrow=images['wood'].crop((354,131,381,139))
for by in [15,34,53]:
 for bx in [5,32]:crops['shelf'].alpha_composite(bookrow,(bx,by))
sources['shelf']['overlays']={'rect':[354,131,27,8],'positions':[[bx,by] for by in [15,34,53] for bx in [5,32]]}
cut('workbench','wood',(136,176,80,80),True);cut('workbench-side','wood',(96,64,32,96),True)
cut('counter','wood',(96,0,96,64),True);cut('counter-side','wood',(96,64,32,96),True)
cut('bench','wood',(0,224,96,64),True);cut('bench-side','wood',(96,224,32,64),True)
cut('desk','wood',(416,224,32,32),True)
cut('bed','upholstery',(8,576,80,64),True);cut('bed-side','upholstery',(192,480,32,96),True)
cut('sofa0','upholstery',(192,128,64,32),True);cut('sofa1','upholstery',(192,224,32,64),True);cut('sofa2','upholstery',(128,256,64,32),True);cut('sofa3','upholstery',(224,224,32,64),True)
cut('pot','city',(352,96,32,64),True)
cut('tree','trees',(192,128,96,160),True);cut('shrub','plants',(0,256,32,32),True);cut('flowers','plants',(224,192,32,32),True)
cut('fountain','fountain',(0,0,64,96),True);cut('fountain-flow','fountain',(64,0,64,96),True)
cut('crate','containers',(0,480,32,32),True);cut('rock','rock',(0,0,32,32),True)
cut('lamp','upholstery',(0,64,32,32),True);cut('cup','mug',(0,0,32,32),True)
# A tabletop coffee pot, book, and porcelain basin, individually selectable.
cut('machine','coffee',(0,0,32,32),True);cut('book','items',(448,64,32,32),True);cut('basin','wood',(192,0,32,32),True)
cut('rug','floors',(96,384,96,96));cut('door','doors',(0,512,32,48),True);cut('door-open','doors',(256,512,32,48),True)
# Extend straight furniture by repeating its middle pixels; do not stretch texels.
def extend(key,newkey,w,h):
 src=crops[key];a=min(12,src.width//3);b=min(12,src.height//3);out=Image.new('RGBA',(w,h))
 for y in range(h):
  sy=y if y<b else src.height-(h-y) if y>=h-b else b+(y-b)%max(1,src.height-2*b)
  for x in range(w):
   sx=x if x<a else src.width-(w-x) if x>=w-a else a+(x-a)%max(1,src.width-2*a)
   out.putpixel((x,y),src.getpixel((sx,sy)))
 crops[newkey]=out;sources[newkey]={'derivedFrom':key,'operation':'repeat centre, preserve edges','size':[w,h]}
extend('shelf','shelf-wide',96,64);extend('workbench','workbench-wide',128,80);extend('bench','bench-long',128,48);extend('bench-side','bench-tall',32,128)
# One shared atlas, padded to avoid neighbour pixels at zoom edges.
atlas=Image.new('RGBA',(1024,1024));x=y=2;rowh=0
for key,im in crops.items():
 if x+im.width+2>1024:x=2;y+=rowh+4;rowh=0
 if y+im.height+2>1024:raise ValueError('Atlas overflow')
 atlas.alpha_composite(im,(x,y));frames[key]={'rect':[x,y,im.width,im.height]};x+=im.width+4;rowh=max(rowh,im.height)
atlas.save(OUT/'lpc-world.png')
# Object display widths/depths describe art, independently of collision footprints.
def spec(names,w=None,h=None,**extra):return {'frames':names.split(','),**({'width':w} if w else {}),**({'height':h} if h else {}),**extra}
visuals={
 'table':spec('table',2,2,surfaceLift=10,surfaceDepth=.4),
 'chair':spec('armchair0,armchair1,armchair2,armchair3',1,1,seat=True),
 'armchair':spec('armchair0,armchair1,armchair2,armchair3',1,1,seat=True),
 'shelf':spec('shelf-wide',3,2,surfaceLift=20,surfaceDepth=.25),
 'workbench':spec('workbench-wide,workbench-side,workbench-wide,workbench-side',surfaceLift=12,surfaceDepth=.55,fitWidth=True),
 'counter':spec('counter,counter-side,counter,counter-side',surfaceLift=15,surfaceDepth=.5,fitWidth=True),
 'bench':spec('bench-long,bench-tall,bench-long,bench-tall',seat=True),
 'desk':spec('desk',1,1,surfaceLift=4,surfaceDepth=.5),
 'bed':spec('bed,bed-side,bed,bed-side'),
 'sofa':spec('sofa0,sofa1,sofa2,sofa3',seat=True),
 'machine':spec('machine',.8,None,small=True), 'cup':spec('cup',.45,None,small=True),
 'book':spec('book',.55,None,small=True), 'pot':spec('pot',.85,None,small=True,attachedScale=.65),
 'tree':spec('tree',3,None), 'shrub':spec('shrub',1,None), 'flowers':spec('flowers',.9,None,small=True),
 'fountain':spec('fountain',3.3,None), 'crate':spec('crate',1,None),'rock':spec('rock',1,None),
 'lamp':spec('lamp',.65,None,small=True),'basin':spec('basin',1,None),'rug':spec('rug',2,2,ground=True),
 'door':spec('door'), 'wall':spec('wall-fill'),
 'grass':spec('grass0'),'wood-floor':spec('planks0'),'stone-floor':spec('paving0'),'soil':spec('soil')}
# Assemble actual four-direction walk and seated poses; leave originals intact.
CHAR=LIB/'characters/spritesheets';used=set();chars=Image.new('RGBA',(2048,2048));charframes={};palette=[(80,119,92),(170,102,73),(79,111,143),(124,110,86),(152,117,154),(113,135,128),(166,142,84),(96,125,164),(173,110,110),(96,144,143),(159,151,113),(98,110,120),(187,135,88),(114,147,163),(154,134,167),(151,165,108),(182,150,125),(130,134,184)]
index=0
for person in range(18):
 gender='female' if person in [1,4,6,8,10,13,15,17] else 'male';thin='thin' if gender=='female' else 'male'
 hair=['plain','long','pixie','parted','loose','bob'][person%6]
 if not (CHAR/f'hair/{hair}/adult/walk.png').exists():hair='plain'
 layers=[f'body/bodies/{gender}',f'head/heads/human/{gender}',f'legs/pants/{thin}',f'feet/shoes/basic/{thin}',f'torso/clothes/longsleeve/longsleeve/{gender}',f'hair/{hair}/adult']
 for action in ['walk','sit']:
  merged=None
  for layer in layers:
   f=CHAR/layer/(action+'.png')
   if not f.exists():raise ValueError('Missing character layer '+str(f))
   im=Image.open(f).convert('RGBA');used.add(str(f.relative_to(CHAR)))
   if layer.startswith(('torso/','legs/','hair/')):
    tint=palette[person] if layer.startswith('torso/') else (67,70,80) if layer.startswith('legs/') else [(79,53,39),(54,44,39),(99,67,43),(145,144,128),(45,46,52),(91,59,44)][person%6];px=im.load()
    for py in range(im.height):
     for px0 in range(im.width):
      r,g,b,a=px[px0,py]
      if a:lum=(r+g+b)/3/245;px[px0,py]=tuple(min(255,round(v*lum)) for v in tint)+(a,)
   if merged is None:merged=Image.new('RGBA',im.size)
   merged.alpha_composite(im)
  for direction in range(4):
   count=9 if action=='walk' else 1
   for frame in range(count):
    sourceFrame=frame if action=='walk' else 2
    im=merged.crop((sourceFrame*64,direction*64,sourceFrame*64+64,direction*64+64));ax=(index%32)*64;ay=(index//32)*64
    chars.alpha_composite(im,(ax,ay));charframes[f'{person}:{action}:{direction}:{frame}']=[ax,ay,64,64];index+=1
chars.save(OUT/'lpc-people.png')
metadata={'version':1,'tilePixels':32,'frames':frames,'definitions':visuals,'characters':charframes,'sources':sources}
(OUT/'lpc-art.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
# Cocos imports the packed images as unfiltered Texture2D resources.
for name in ['lpc-world','lpc-people']:
 f=OUT/(name+'.png.meta');u=json.loads(f.read_text())['uuid'] if f.exists() else str(uuid.uuid4())
 meta={'ver':'1.0.27','importer':'image','imported':True,'uuid':u,'files':['.json','.png'],'subMetas':{'6c48a':{'importer':'texture','uuid':u+'@6c48a','displayName':name,'id':'6c48a','name':'texture','ver':'1.0.22','imported':True,'files':['.json'],'subMetas':{},'userData':{'wrapModeS':'clamp-to-edge','wrapModeT':'clamp-to-edge','imageUuidOrDatabaseUri':u,'isUuid':True,'visible':False,'minfilter':'nearest','magfilter':'nearest','mipfilter':'none','anisotropy':0}}},'userData':{'type':'texture','hasAlpha':True,'redirect':u+'@6c48a','fixAlphaTransparencyArtifacts':True}}
 f.write_text(json.dumps(meta,indent=2))
f=OUT/'lpc-art.json.meta'
if not f.exists():f.write_text(json.dumps({'ver':'1.0.0','importer':'json','imported':True,'uuid':str(uuid.uuid4()),'files':['.json'],'subMetas':{},'userData':{}},indent=2))
# Exact character attribution subset from the upstream per-file CSV.
creditrows=[]
with (LIB/'characters/CREDITS.csv').open() as f:
 reader=csv.reader(f,skipinitialspace=True);header=next(reader)
 for row in reader:
  if row and row[0].strip() in used:creditrows.append(row)
with (LIB/'CHARACTERS-USED.csv').open('w') as f:
 w=csv.writer(f);w.writerow(header);w.writerows(creditrows)
if len(creditrows)<len(used):raise ValueError(f'Character credits missing: {len(creditrows)}/{len(used)}')
(OUT/'lpc-character-credits.txt').write_text((LIB/'CHARACTERS-USED.csv').read_text())
# A contact sheet for visual inspection before the single final game build.
preview=Image.new('RGB',(768,((len(crops)+5)//6)*132),(47,57,49));draw=ImageDraw.Draw(preview)
for i,(key,im) in enumerate(crops.items()):
 col=i%6;row=i//6;scale=min(2,112/im.width,100/im.height);p=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.NEAREST);preview.paste(p,(col*128+(128-p.width)//2,row*132+8),p);draw.text((col*128+4,row*132+111),key,fill='white')
preview.save(QA/'lpc-selected-art.png')
print(json.dumps({'worldFrames':len(frames),'characterFrames':len(charframes),'definitions':len(visuals),'characterSources':len(used),'credits':len(creditrows)}))
