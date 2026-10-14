import {Node,Mesh,MeshRenderer,Material,Color,Vec3,primitives,utils,geometry} from 'cc';
import {ObjectCatalog,ObjectEntity,ObjectWorld,TownLayout} from './Layout';
export const actionLabels:Record<string,string>={inspect:'看看',clean:'擦干净',repair:'修一修',toggle:'开关',sit:'坐一会儿',read:'读几页',browse:'翻翻书',water:'浇水',pick:'摘花',harvest:'摘桃子',prune:'修剪',brew:'做咖啡',drink:'喝杯茶','water-fill':'装水',take:'取木料',store:'存木料',craft:'磨木板',collect:'拾起来',move:'搬动',rotate:'转个方向',pack:'收入仓库',rest:'休息'};
export const actionIcons:Record<string,string>={inspect:'memory',clean:'help',repair:'help',toggle:'sun',sit:'rest',read:'memory',browse:'memory',water:'help',pick:'gift',harvest:'gift',prune:'help',brew:'tea',drink:'tea','water-fill':'tea',take:'gift',store:'memory',craft:'help',collect:'gift',move:'walk',rotate:'next'};
type Building={id:string;minX:number;maxX:number;minZ:number;maxZ:number;roof:Node;inside:boolean;hidden:boolean};
const C={grass:'#A7BB82',wood:'#A8835A',dark:'#72583E',cream:'#F0DFC0',green:'#678567',roof:'#B9795C',stone:'#C9C7AC',water:'#80B5B5',brass:'#C2A061'};
/** Server-owned object entities; mesh geometry is only their presentation. */
export class ObjectScene {
 entities=new Map<string,ObjectEntity>();nodes=new Map<string,Node>();actorLayer:Node;
 navRevision=-1;private shown=-1;private selected='';private halo:Node;private ghost:Node;
 private meshes=new Map<string,Mesh>();private materials=new Map<string,Material>();private signatures=new Map<string,string>();
 buildings:Building[]=[];private trees=new Map<string,Node>();private viewKey='';private roofKey='';
 constructor(private root:Node,private catalog:ObjectCatalog,private layout:TownLayout){
  this.actorLayer=new Node('Residents');this.actorLayer.parent=root;
  this.meshes.set('box',utils.createMesh(primitives.box()));
  this.meshes.set('ball',utils.createMesh(primitives.sphere(.5,{segments:8})));
  this.meshes.set('cylinder',utils.createMesh(primitives.cylinder(.5,.5,1,{radialSegments:10})));
  this.meshes.set('cone',utils.createMesh(primitives.cylinder(0,.5,1,{radialSegments:10})));
  this.ground();this.buildRoofs();
  this.halo=this.outline('Selected object');this.ghost=this.outline('Placement preview');this.halo.active=this.ghost.active=false;
  this.apply({version:catalog.version,revision:0,navRevision:0,patches:{}});
 }
 mat(hex:string){let m=this.materials.get(hex);if(!m){m=new Material();m.initialize({effectName:'builtin-standard',defines:{USE_INSTANCING:true}});m.setProperty('mainColor',new Color().fromHEX(hex));m.setProperty('roughness',.9);m.setProperty('metallic',0);this.materials.set(hex,m);}return m;}
 shape(parent:Node,kind:string,p:number[],s:number[],color:string,name=kind){const n=new Node(name);n.parent=parent;n.setPosition(p[0],p[1],p[2]);n.setScale(s[0],s[1],s[2]);const r=n.addComponent(MeshRenderer);r.mesh=this.meshes.get(kind)!;r.setMaterial(this.mat(color),0);return n;}
 private ground(){
  const b=this.layout.bounds;this.shape(this.root,'box',[(b.minX+b.maxX)/2,-.13,(b.minZ+b.maxZ)/2],[120,.2,100],C.grass,'Meadow');
  // Coalesce equal neighbouring floor tiles into strips instead of per-metre meshes.
  const rows=new Map<string,number[]>();
  for(const o of this.catalog.instances){const d=this.catalog.definitions[o.defId];if(d.category!=='terrain'||o.defId==='grass')continue;const key=o.defId+':'+o.z+':'+d.size.d;(rows.get(key)||rows.set(key,[]).get(key)!).push(o.x);}
  for(const [key,xs] of rows){const [kind,zs,ds]=key.split(':'),d=this.catalog.definitions[kind],z=Number(zs);xs.sort((a,b)=>a-b);let start=xs[0],end=start;
   const flush=()=>{const color=kind==='stone-floor'?'#D5C9AC':kind==='wood-floor'?'#C5A477':'#AC9167';this.shape(this.root,'box',[(start+end)/2,.005,z],[end-start+d.size.w,.08,Number(ds)],color,'Floor '+kind);};
   for(let i=1;i<xs.length;i++){if(xs[i]-end>d.size.w+.01){flush();start=xs[i];}end=xs[i];}flush();
  }
  for(let i=0;i<16;i++){const x=b.minX-5+(i%8)*9,z=i<8?b.minZ-5:b.maxZ+5;this.shape(this.root,'ball',[x,-.2,z],[8,2.2,7],i%2?'#98AE78':'#B0C18C','Distant meadow');}
 }
 private buildRoofs(){
  const groups=new Set(this.catalog.instances.filter(o=>o.defId==='wall').map(o=>o.group));
  for(const id of groups){const walls=this.catalog.instances.filter(o=>o.defId==='wall'&&o.group===id),minX=Math.min(...walls.map(o=>o.x))-.5,maxX=Math.max(...walls.map(o=>o.x))+.5,minZ=Math.min(...walls.map(o=>o.z))-.5,maxZ=Math.max(...walls.map(o=>o.z))+.5;
   const roof=new Node('Roof '+id);roof.parent=this.root;roof.setPosition((minX+maxX)/2,2.85,(minZ+maxZ)/2);const w=maxX-minX+.7,d=maxZ-minZ+.7,rise=Math.min(2,w*.22),angle=Math.atan2(rise,w/2)*180/Math.PI;
   const tone=id==='library'?'#708A78':id==='hotel'?'#718778':C.roof;
   for(const sign of [-1,1]){const n=this.shape(roof,'box',[sign*w/4,rise/2,0],[Math.hypot(w/2,rise),.18,d],tone,'Roof slope');n.setRotationFromEuler(0,0,-sign*angle);}
   this.shape(roof,'box',[0,rise+.06,0],[.22,.22,d+.1],C.dark,'Ridge');
   this.shape(roof,'box',[w*.28,rise+.1,-d*.25],[.75,1.25,.7],C.cream,'Chimney');
   this.shape(roof,'box',[w*.28,rise+.76,-d*.25],[.9,.16,.85],C.dark,'Chimney cap');
   this.buildings.push({id,minX,maxX,minZ,maxZ,roof,inside:false,hidden:false});
  }
 }
 bounds(o:ObjectEntity){const turned=o.rotation%180===90;return {x:o.x,z:o.z,w:turned?o.size.d:o.size.w,d:turned?o.size.w:o.size.d};}
 snap(id:string,x:number,z:number){const b=this.bounds(this.entities.get(id)!);return {x:Math.round(x-b.w/2)+b.w/2,z:Math.round(z-b.d/2)+b.d/2};}
 blocking(o:ObjectEntity){return o.blocking&&!o.state.removed&&!o.state.stored&&!(o.defId==='door'&&o.state.open);}
 obstacles(){return [...this.entities.values()].filter(o=>this.blocking(o)).map(o=>({...this.bounds(o),id:o.id}));}
 height(o:ObjectEntity){return ({wall:2.8,door:2.65,tree:3.8,shrub:.85,flowers:.4,table:1,desk:.9,workbench:1,counter:1.12,shelf:2.1,chair:1,bench:1,sofa:.95,armchair:.95,bed:.6,basin:.9,machine:.65,cup:.22,book:.1,pot:.65,lamp:2.8,fountain:1.15,crate:.75,rock:.6,rug:.025} as Record<string,number>)[o.defId]||.2;}
 surfaceHeight(o:ObjectEntity){return o.defId==='shelf'?1.22:this.height(o);}
 baseHeight(o:ObjectEntity){const p=o.parentId?this.entities.get(o.parentId):null;return p?this.surfaceHeight(p)+.035:.06;}
 placementPoint(id:string,x:number,z:number){return this.snap(id,x,z);}
 placementRay(id:string,ray:geometry.Ray,fallback:{x:number;z:number}){
  const o=this.entities.get(id);if(!o||!['item','plant','appliance'].includes(o.category)||o.blocking)return fallback;
  let nearest=Infinity,point=fallback;
  for(const s of this.entities.values()){if(!s.surface||s.id===id||s.state.removed||s.state.stored)continue;const t=(this.surfaceHeight(s)-ray.o.y)/ray.d.y;if(t<0||t>=nearest)continue;const x=ray.o.x+ray.d.x*t,z=ray.o.z+ray.d.z*t,b=this.bounds(s),own=this.bounds(o);if(own.w>b.w||own.d>b.d||Math.abs(x-s.x)>b.w/2||Math.abs(z-s.z)>b.d/2)continue;
   point={x:Math.max(s.x-b.w/2+own.w/2,Math.min(s.x+b.w/2-own.w/2,x)),z:Math.max(s.z-b.d/2+own.d/2,Math.min(s.z+b.d/2-own.d/2,z))};nearest=t;
  }return point;
 }
 apply(state:ObjectWorld){
  if(state.revision===this.shown)return false;const navigation=state.navRevision!==this.navRevision;this.shown=state.revision;this.navRevision=state.navRevision;
  for(const source of [...this.catalog.instances,...Object.values(state.instances||{})]){const d=this.catalog.definitions[source.defId],patch=state.patches[source.id]||{},o={...d,...source,...patch,state:{...d.initial,...source.state,...patch.state},revision:patch.revision||0} as ObjectEntity;this.entities.set(o.id,o);if(d.category==='terrain')continue;
   let n=this.nodes.get(o.id);if(!n){n=new Node(o.id);n.parent=this.root;this.nodes.set(o.id,n);}
   n.active=!o.state.removed&&!o.state.stored;const sig=JSON.stringify([o.defId,o.state.open,o.state.lit,o.state.running,o.state.volume,o.state.stock]);if(n.active&&this.signatures.get(o.id)!==sig){for(const c of n.children.slice()){c.removeFromParent();c.destroy();}this.render(n,o);this.signatures.set(o.id,sig);}
   n.setPosition(o.x,this.baseHeight(o),o.z);n.setRotationFromEuler(0,-o.rotation,0);
  }
  // Resolve after all parents; server coordinates already include parent movement/rotation.
  for(const o of this.entities.values())if(o.parentId)this.nodes.get(o.id)?.setPosition(o.x,this.baseHeight(o),o.z);
  this.viewKey='';this.roofKey='';this.highlight(this.selected);return navigation;
 }
 private render(n:Node,o:ObjectEntity){
  const w=o.size.w,d=o.size.d,k=o.defId,h=this.height(o),s=(kind:string,p:number[],scale:number[],c:string,name?:string)=>this.shape(n,kind,p,scale,c,name),box=(p:number[],scale:number[],c:string,name?:string)=>s('box',p,scale,c,name);
  const legs=(top:number,ww=w*.72,dd=d*.65)=>{for(const x of [-ww/2,ww/2])for(const z of [-dd/2,dd/2])box([x,top/2,z],[.12,top,.12],C.dark);};
  if(k==='wall'){box([0,1.38,0],[w,2.76,d],C.cream);box([0,.17,0],[w+.025,.34,d+.025],C.stone);box([0,2.76,0],[w+.03,.13,d+.03],C.dark);}
  else if(k==='door'){for(const x of [-w/2+.12,w/2-.12])box([x,1.3,0],[.24,2.6,d*.55],C.dark);box([0,2.55,0],[w,.22,d*.55],C.dark);const leaf=new Node('Door leaf');leaf.parent=n;leaf.setPosition(-w/2+.23,0,0);leaf.setRotationFromEuler(0,o.state.open?-87:0,0);this.shape(leaf,'box',[(w-.46)/2,1.22,0],[w-.46,2.44,.12],C.green);this.shape(leaf,'ball',[w-.66,1.1,.13],[.12,.12,.12],C.brass);}
  else if(['table','desk','workbench'].includes(k)){legs(h-.13);box([0,h-.09,0],[w*.96,.18,d*.94],C.wood);box([0,h+.005,-d*.35],[w*.95,.015,.03],C.dark);}
  else if(k==='counter'){box([0,.51,0],[w*.93,1.02,d*.86],C.green);box([0,1.07,0],[w,.13,d],C.wood);for(const x of [-w*.28,0,w*.28])box([x,.55,d*.445],[.07,.8,.03],C.cream);}
  else if(k==='shelf'){box([0,1.02,-d*.36],[w*.92,2.04,.16],C.dark);for(const x of [-w*.46,w*.46])box([x,1,0],[.14,2,d*.8],C.wood);for(const y of [.18,.68,1.2,1.92])box([0,y,0],[w,.1,d*.85],C.wood);for(let i=0;i<7;i++)box([-w*.37+i*w*.12,.93,-d*.12],[w*.085,.38+(i%3)*.02,.44],['#8BA091','#BD8465','#DBBC80'][i%3]);}
  else if(['chair','bench','sofa','armchair'].includes(k)){const padded=['sofa','armchair'].includes(k);legs(.43);box([0,.46,0],[w*.88,.18,d*.83],padded?'#9CAB89':C.wood);box([0,.82,-d*.37],[w*.9,.55,.18],padded?C.green:C.wood);if(padded)for(const x of [-w*.43,w*.43])box([x,.67,0],[.18,.4,d*.86],C.green);}
  else if(k==='bed'){box([0,.2,0],[w*.95,.32,d*.94],C.dark);box([0,.43,0],[w*.92,.24,d*.87],C.cream);box([w*.12,.565,0],[w*.62,.07,d*.9],'#A4B5A2');box([-w*.32,.61,0],[w*.23,.14,d*.74],'#FBF0D5');box([-w*.48,.55,0],[.12,.8,d],C.wood);}
  else if(k==='tree'){s('cylinder',[0,1.05,0],[.36,2.1,.36],C.dark);const crown=new Node('Tree canopy');crown.parent=n;this.shape(crown,'ball',[0,2.7,0],[2.5,2.2,2.3],C.green);this.shape(crown,'ball',[.5,3.1,.1],[1.7,1.7,1.8],'#8CA574');this.trees.set(o.id,crown);if(o.state.stock>0)for(const x of [-.6,.5])this.shape(crown,'ball',[x,2.4,.85],[.27,.28,.27],'#DCA280');}
  else if(k==='shrub')s('ball',[0,.4,0],[1,.8,.85],C.green);
  else if(k==='flowers'||k==='pot'){if(k==='pot'){s('cylinder',[0,.17,0],[.44,.34,.44],C.roof);s('cylinder',[0,.34,0],[.49,.08,.49],C.wood);}for(let i=0;i<3;i++){const x=(i-1)*.14,y=k==='pot'?.55:.25;s('cylinder',[x,y-.08,0],[.035,.27,.035],C.green);s('ball',[x,y+.08,0],[.21,.17,.22],['#E4BA88','#CF907F','#F1D7AB'][i]);}}
  else if(k==='cup'){s('cylinder',[0,.09,0],[.19,.18,.19],'#F4EAD4');s('cylinder',[0,.185,0],[.14,.009,.14],o.state.volume?'#705139':'#D4CCB7');s('ball',[.13,.1,0],[.12,.12,.05],C.cream);}
  else if(k==='book'){box([0,.045,0],[.43,.07,.55],'#A36F58');box([0,.056,.01],[.39,.038,.51],C.cream);}
  else if(k==='machine'){box([0,.3,0],[.62,.6,.5],C.green);box([0,.17,.29],[.6,.09,.24],C.dark);for(const x of [-.14,.14])s('cylinder',[x,.25,.25],[.05,.18,.05],C.brass);}
  else if(k==='fountain'){s('cylinder',[0,.22,0],[w,.44,d],C.stone);s('cylinder',[0,.455,0],[w*.83,.035,d*.83],C.water);s('cylinder',[0,.72,0],[.45,.9,.45],C.stone);s('cylinder',[0,1.05,0],[1.4,.17,1.4],C.cream);if(o.state.running)s('ball',[0,1.24,0],[.35,.4,.35],'#B0D4D0');}
  else if(k==='basin'){box([0,.42,0],[w*.9,.84,d*.8],C.green);s('cylinder',[0,.88,0],[.85,.12,.7],C.cream);s('cylinder',[0,.951,0],[.61,.016,.48],C.water);box([0,1.07,-.23],[.06,.24,.06],C.brass);}
  else if(k==='lamp'){s('cylinder',[0,1.25,0],[.09,2.5,.09],C.dark);box([0,2.5,0],[.37,.45,.37],o.state.lit?'#F4D69A':C.cream);s('cone',[0,2.83,0],[.55,.22,.55],C.green);}
  else if(k==='crate'){box([0,.36,0],[.82,.72,.82],C.wood);for(const z of [-.43,.43])for(const y of [.12,.59])box([0,y,z],[.9,.1,.07],C.dark);}
  else if(k==='rock')s('ball',[0,.25,0],[.85,.6,.75],C.stone);
  else if(k==='rug'){box([0,.012,0],[w,.022,d],'#B78668');box([0,.027,0],[w*.88,.006,d*.88],'#D8B789');}
 }
 private outline(name:string){const n=new Node(name);n.parent=this.root;for(const [x,z,w,d] of [[0,-.5,1,.025],[0,.5,1,.025],[-.5,0,.025,1],[.5,0,.025,1]])this.shape(n,'box',[x,.025,z],[w,.035,d],'#F8E5A2');return n;}
 highlight(id:string){this.selected=id;const o=this.entities.get(id);this.halo.active=!!o&&!o.state.removed&&!o.state.stored;if(o){const b=this.bounds(o);this.halo.setPosition(o.x,this.baseHeight(o)+.015,o.z);this.halo.setScale(b.w,1,b.d);}}
 preview(id:string,x:number,z:number){const o=this.entities.get(id);this.ghost.active=!!o;if(o){const b=this.bounds(o),p=this.placementPoint(id,x,z);let y=.08;for(const s of this.entities.values())if(s.surface&&s.id!==id&&!s.state.stored&&!s.state.removed&&this.distance(p.x,p.z,s)<.01)y=this.surfaceHeight(s)+.08;this.ghost.setPosition(p.x,y,p.z);this.ghost.setScale(b.w,1,b.d);}}
 hidePreview(){this.ghost.active=false;}
 updateView(cx:number,cz:number,hx:number,hz:number,actors:{id:string;node:Node;x:number;z:number}[]){
  const key=[Math.round(cx*2),Math.round(cz*2),Math.round(hx),Math.round(hz)].join(':');if(key===this.viewKey)return;this.viewKey=key;
  for(const o of this.entities.values()){const n=this.nodes.get(o.id);if(n)n.active=!o.state.stored&&!o.state.removed&&Math.abs(o.x-cx)<hx+o.size.w+7&&Math.abs(o.z-cz)<hz+o.size.d+12;}
 }
 updateRoofs(player:{x:number;z:number},camera:Vec3){
  const key=[Math.round(player.x*10),Math.round(player.z*10),Math.round(camera.x),Math.round(camera.z),this.shown].join(':');if(key===this.roofKey)return;this.roofKey=key;
  for(const b of this.buildings){const margin=b.inside?.25:0;b.inside=player.x>b.minX-margin&&player.x<b.maxX+margin&&player.z>b.minZ-margin&&player.z<b.maxZ+margin;
   // Hide also when a roof lies directly between the camera and the player's head.
   const t=(3.4-1.5)/(camera.y-1.5),rx=player.x+(camera.x-player.x)*t,rz=player.z+(camera.z-player.z)*t;
   const blocked=t>0&&t<1&&rx>b.minX-.5&&rx<b.maxX+.5&&rz>b.minZ-.5&&rz<b.maxZ+.5;b.hidden=b.inside||blocked;b.roof.active=!b.hidden;
   for(const o of this.entities.values())if(o.group===b.id&&['wall','door'].includes(o.defId)){const n=this.nodes.get(o.id)!;const cut=b.inside&&(o.z>player.z+.2||Math.abs(o.x-player.x)<1.1);const cover=!b.inside&&blocked&&o.z>player.z&&Math.abs(o.x-player.x)<1.5;n.setScale(1,cut||cover?.13:1,1);}
  }
  for(const [id,crown] of this.trees){const o=this.entities.get(id)!;crown.active=!(o.z>player.z-.7&&o.z<player.z+4.2&&Math.abs(o.x-player.x)<1.5);}
 }
 visibleAt(x:number,z:number){return !this.buildings.some(b=>b.roof.active&&x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ);}
 private hit(ray:geometry.Ray,min:Vec3,max:Vec3){let near=0,far=Infinity;for(const k of ['x','y','z'] as const){if(Math.abs(ray.d[k])<1e-7){if(ray.o[k]<min[k]||ray.o[k]>max[k])return Infinity;continue;}let a=(min[k]-ray.o[k])/ray.d[k],b=(max[k]-ray.o[k])/ray.d[k];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return Infinity;}return near;}
 pick(ray:geometry.Ray){let best=Infinity,result:ObjectEntity|null=null;
  for(const o of this.entities.values()){const n=this.nodes.get(o.id);if(!n?.activeInHierarchy)continue;
   if(o.defId==='door'&&o.state.open){for(const renderer of n.getComponentsInChildren(MeshRenderer)){const bounds=renderer.model?.worldBounds;if(!bounds)continue;const t=geometry.intersect.rayAABB(ray,bounds);if(t>0&&t<best){best=t;result=o;}}continue;}
   const b=this.bounds(o),base=this.baseHeight(o),small=['cup','book','pot'].includes(o.defId),w=small?.48:b.w,d=small?.48:b.d,h=this.height(o)*(['wall','door'].includes(o.defId)?n.scale.y:1);const t=this.hit(ray,new Vec3(o.x-w/2,base,o.z-d/2),new Vec3(o.x+w/2,base+Math.max(.2,h),o.z+d/2));if(t<best){best=t;result=o;}}
  return result;
 }
 at(x:number,z:number,terrain=false){return [...this.entities.values()].find(o=>(terrain?o.category==='terrain':o.category!=='terrain')&&!o.state.stored&&!o.state.removed&&this.distance(x,z,o)<.01)||null;}
 distance(x:number,z:number,o:ObjectEntity){const b=this.bounds(o);return Math.hypot(Math.max(0,Math.abs(x-b.x)-b.w/2),Math.max(0,Math.abs(z-b.z)-b.d/2));}
 children(id:string){return [...this.entities.values()].filter(o=>o.parentId===id&&!o.state.removed&&!o.state.stored);}
 seat(id:string){const o=this.entities.get(id);if(!o||!['chair','bench','sofa','armchair'].includes(o.defId))return null;return {x:o.x,z:o.z,direction:[2,1,0,3][((o.rotation/90)%4+4)%4],height:.55};}
    details(o:ObjectEntity,inventory:Record<string,number>={}){
        const s=o.state,lines=[`编号：${o.code||'地形符号'}`, `${o.material} · ${o.mass} 千克`,`归属：${o.owner}`,`尺寸：${o.size.w}m × ${o.size.d}m`,`位置：${o.x.toFixed(1)}，${o.z.toFixed(1)}`,`朝向：${o.rotation}°`,`耐久：${s.health} / ${o.maxHealth}`,`整洁：${s.cleanliness}%`,this.blocking(o)?'通行：占用地面':'通行：可以经过',o.movable?'摆放：可以搬动、旋转':'摆放：固定在这里'];
        if(o.parentId)lines.push(`摆在：${this.entities.get(o.parentId)?.name||'物品上'}`);
        if(s.open!=null)lines.push(`门：${s.open?'开着':'关着'}`);if(s.lit!=null)lines.push(`灯光：${s.lit?'亮着':'熄灭'}`);if(s.running!=null)lines.push(`水流：${s.running?'流动':'已停'}`);
        if(s.moisture!=null)lines.push(`土壤湿度：${Math.round(s.moisture)}%`);if(s.growth!=null)lines.push(`生长：${Math.round(s.growth)}%`);
        if(s.stock!=null)lines.push(`存量：${s.stock} / ${s.capacity}`);if(s.volume!=null)lines.push(s.volume?`杯中：${s.content}`:'杯中：空了');
        if(s.occupiedBy!=null)lines.push(s.occupiedBy?'座位：有人坐着':'座位：空着');if(s.uses)lines.push(`使用过 ${s.uses} 次`);
        const contents=this.children(o.id);if(contents.length)lines.push('放着：'+contents.map(c=>c.name).join('、'));
        lines.push(`口袋：木料 ${inventory.wood||0} · 水 ${inventory.water||0}`);return lines;
    }
}
