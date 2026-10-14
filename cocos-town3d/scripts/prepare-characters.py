"""Reproduce the Kenney CC0 glTF; no engine/editor build is performed."""
from pathlib import Path
import subprocess,json,copy,base64,struct,math
root=Path(__file__).resolve().parents[2];source=root/'vendor/kenney-3d/protagonists';target=root/'cocos-town3d/assets/resources/people'
binary=Path.home()/'Applications/CocosCreator-3.8.8/CocosCreator.app/Contents/Resources/app.asar.unpacked/node_modules/@cocos/fbx2gltf/bin/Darwin/FBX2glTF'
for key,file in [('character','Model/characterMedium.fbx'),('idle','Animations/idle.fbx'),('run','Animations/run.fbx')]:
 subprocess.run([str(binary),'-i',str(source/file),'-o',str(source/key),'-e','--anim-framerate','bake24'],check=True,stdout=subprocess.DEVNULL)
d=json.loads((source/'character_out/character.gltf').read_text());index={n['name']:i for i,n in enumerate(d['nodes'])};d['animations']=[]
for key in ['idle','run']:
 a=json.loads((source/f'{key}_out/{key}.gltf').read_text());bo=len(d['buffers']);vo=len(d['bufferViews']);ao=len(d['accessors']);d['buffers']+=a['buffers']
 for v in a['bufferViews']:v['buffer']+=bo
 d['bufferViews']+=a['bufferViews']
 for v in a['accessors']:v['bufferView']+=vo
 d['accessors']+=a['accessors']
 for anim in a['animations']:
  if 'Targeting' in anim['name']:continue
  anim['name']=key
  for s in anim['samplers']:s['input']+=ao;s['output']+=ao
  for c in anim['channels']:c['target']['node']=index[a['nodes'][c['target']['node']]['name']]
  d['animations'].append(anim)
# Build a seated pose from the artist's idle pose, aligning thighs forward and shins down.
pose=copy.deepcopy(d['nodes']);idle=d['animations'][0]
for c in idle['channels']:
 a=d['accessors'][idle['samplers'][c['sampler']]['output']];v=d['bufferViews'][a['bufferView']];buf=base64.b64decode(d['buffers'][v['buffer']]['uri'].split(',')[1]);count={'VEC3':3,'VEC4':4}[a['type']]
 pose[c['target']['node']][c['target']['path']]=list(struct.unpack_from('<'+'f'*count,buf,v.get('byteOffset',0)+a.get('byteOffset',0)))
parents={c:i for i,n in enumerate(pose) for c in n.get('children',[])}
def mul(a,b):
 x,y,z,w=a;X,Y,Z,W=b;return [w*X+x*W+y*Z-z*Y,w*Y-x*Z+y*W+z*X,w*Z+x*Y-y*X+z*W,w*W-x*X-y*Y-z*Z]
def inv(q):return [-q[0],-q[1],-q[2],q[3]]
def world(i):return mul(world(parents[i]),pose[i].get('rotation',[0,0,0,1])) if i in parents else pose[i].get('rotation',[0,0,0,1])
def rotate(q,v):return mul(mul(q,v+[0]),inv(q))[:3]
def between(a,b):
 dot=sum(x*y for x,y in zip(a,b));q=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0],1+dot]
 n=math.sqrt(sum(x*x for x in q));return [x/n for x in q] if n>1e-6 else [1,0,0,0]
for name,direction in [('LeftUpLeg',[0,0,1]),('RightUpLeg',[0,0,1]),('LeftLeg',[0,-1,0]),('RightLeg',[0,-1,0])]:
 i=index[name];q=world(i);delta=between(rotate(q,[0,1,0]),direction);pose[i]['rotation']=mul(inv(world(parents[i])),mul(delta,q))
buf=bytearray();views=[];access=[]
def accessor(values,kind,minimum=None,maximum=None):
 offset=len(buf);flat=[x for value in values for x in (value if isinstance(value,list) else [value])];buf.extend(struct.pack('<'+'f'*len(flat),*flat));vi=len(d['bufferViews'])+len(views);views.append({'buffer':len(d['buffers']),'byteOffset':offset,'byteLength':len(flat)*4});a={'bufferView':vi,'componentType':5126,'count':len(values),'type':kind}
 if minimum is not None:a['min']=minimum;a['max']=maximum
 i=len(d['accessors'])+len(access);access.append(a);return i
time=accessor([0,1],'SCALAR',[0],[1]);sit={'name':'sit','channels':[],'samplers':[]}
for i,n in enumerate(pose):
 for path,kind in [('rotation','VEC4'),('translation','VEC3')]:
  if path not in n:continue
  value=n[path];out=accessor([value,value],kind);si=len(sit['samplers']);sit['samplers'].append({'input':time,'output':out,'interpolation':'LINEAR'});sit['channels'].append({'sampler':si,'target':{'node':i,'path':path}})
d['buffers'].append({'byteLength':len(buf),'uri':'data:application/octet-stream;base64,'+base64.b64encode(buf).decode()});d['bufferViews']+=views;d['accessors']+=access;d['animations'].append(sit)
d['images']=[{'uri':'skaterMaleA.png'}];d['textures']=[{'source':0}];d['materials'][0]['pbrMetallicRoughness']={'baseColorFactor':[1,1,1,1],'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':.9}
(target/'townsfolk.gltf').write_text(json.dumps(d,separators=(',',':')))
print('CC0 model: mesh, idle, run, derived sit; glTF written.')
