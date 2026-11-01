import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {OutlinePass} from 'three/examples/jsm/postprocessing/OutlinePass.js';
import {ComicInkPass,makeToonRamp} from './comic-render.mjs';
import {createSurfaceMaterials,surfaceUVs} from './surface-materials.mjs';
import {createCharacter,animateCharacter} from './characters.mjs';
import {NavigationWorld} from './navigation.mjs';
import {roomAt,wallSegments,sceneBounds} from '../shared/suspect7/spatial.mjs';
import {people} from '../shared/suspect7/cast.mjs';
export class VillaScene{
 constructor(host,pick){
  this.host=host;this.pick=pick;this.active=true;this.materials=new Map();this.toonRamp=makeToonRamp();this.surface=createSurfaceMaterials(this.toonRamp);this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#d6dcc8');
  this.renderer=new THREE.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.append(this.renderer.domElement);
  this.camera=new THREE.OrthographicCamera(-14,14,14,-14,.1,250);this.camera.position.set(25,36,40);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.enableRotate=false;this.controls.minZoom=.35;this.controls.maxZoom=3;this.controls.screenSpacePanning=true;this.controls.mouseButtons.LEFT=THREE.MOUSE.PAN;this.controls.touches.ONE=THREE.TOUCH.PAN;this.controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
  this.scene.add(new THREE.HemisphereLight('#fff5dc','#839385',1.8));const sun=new THREE.DirectionalLight('#fff5df',1.5);sun.position.set(-20,42,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.intensity=.4;Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,far:120});this.scene.add(sun);
  this.world=new THREE.Group();this.scene.add(this.world);this.cast=new Map();this.clickables=[];this.obstacles=[];this.clock=0;
  this.labels=document.createElement('div');this.labels.className='s7-world-labels';host.append(this.labels);this.roomLabels=[];
  const rt=new THREE.WebGLRenderTarget(1,1,{samples:2,depthTexture:new THREE.DepthTexture(1,1)});this.composer=new EffectComposer(this.renderer,rt);this.composer.addPass(new RenderPass(this.scene,this.camera));this.comic=new ComicInkPass(this.camera);this.composer.addPass(this.comic);this.outline=new OutlinePass(new THREE.Vector2(1,1),this.scene,this.camera);this.outline.edgeStrength=3;this.outline.edgeThickness=1.4;this.outline.visibleEdgeColor.set('#af8d52');this.outline.hiddenEdgeColor.set('#af8d52');this.composer.addPass(this.outline);this.composer.addPass(new OutputPass());
  const canvas=this.renderer.domElement;canvas.setAttribute('aria-label','伴山别墅单层连通地图');canvas.addEventListener('pointerdown',e=>{this.down=[e.clientX,e.clientY];});canvas.addEventListener('pointerup',e=>{
   if(!this.allowed()||!this.down||Math.hypot(e.clientX-this.down[0],e.clientY-this.down[1])>6)return;
   const b=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),this.camera);
   const hit=ray.intersectObjects(this.clickables,true)[0];if(!hit)return;let o=hit.object;while(o&&!o.userData.pick)o=o.parent;const a=o?.userData.pick;if(!a)return;
   if(a.type==='move'){this.travel(a.room,hit.point);return;}
   const pos=o.getWorldPosition(new THREE.Vector3()),room=a.room||this.state.people.find(p=>p.id===a.id)?.location;
   this.approach(pos,room,()=>this.arrive(room,a));
  });
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();this.frame=this.frame.bind(this);this.raf=requestAnimationFrame(this.frame);
 }
 allowed(){return this.interactionAllowed?.()!==false;}
 mat(color,kind='plaster'){return this.surface(color,kind);}
 box(x,y,z,w,h,d,color,parent=this.world,kind='wood',obstacle=false){const geo=new THREE.BoxGeometry(w,h,d);surfaceUVs(geo,kind,w,h,d);const m=new THREE.Mesh(geo,this.mat(color,kind));m.position.set(x,y+h/2,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);if(obstacle)this.obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});return m;}
 sphere(parent,x,y,z,rx,ry,rz,c){const m=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),this.mat(c));m.scale.set(rx,ry,rz);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
 cylinder(parent,x,y,z,r,h,c){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),this.mat(c));m.position.set(x,y,z);parent.add(m);return m;}
 update(s){
  const previous=this.state;this.state=s;const key=JSON.stringify([s.playerId,s.chapterId,s.scene.rooms,s.scene.doors,s.scene.mapSpots.map(p=>p.id)]);
  if(key!==this.key){this.key=key;this.rebuild(s,previous);}
  else if(previous?.room!==s.room&&!this.arriving){const r=s.scene.rooms.find(r=>r.id===s.room);this.player.g.position.copy(this.spawn(r));this.focus();}
  this.host.dataset.room=s.room;this.host.dataset.layout='single-level';
  this.outline.selectedObjects=this.clickables.filter(o=>o.userData.pick?.type==='inspect'&&o.userData.pick.room===s.room&&!s.evidence.some(e=>e.id===o.userData.pick.id));
 }
 // Used by both the renderer and isolated navigation checks.
 buildPlan(s){
  this.obstacles=[];this.clickables=[];this.propObjects=new Map();this.bounds=sceneBounds(s.scene.rooms,1);const b=this.bounds;
  this.box(0,-.45,-6,180,.2,180,'#c9d1aa',this.world,'stone');
  for(const r of s.scene.rooms){
   this.box(r.x,-.22,r.z,r.w,.28,r.d,'#b9aa8e',this.world,'stone');
   const stone=['pool','garage','washroom','corridor','foyer','passage'].includes(r.decor),floor=this.box(r.x,.06,r.z,r.w-.18,.04,r.d-.18,stone?'#ded7bf':'#dfcfad',this.world,stone?'stone':'wood');
   if(r.walkable){floor.userData.pick={type:'move',room:r.id};this.clickables.push(floor);}else this.obstacles.push({minX:r.x-r.w/2,maxX:r.x+r.w/2,minZ:r.z-r.d/2,maxZ:r.z+r.d/2});
   if(!stone)for(let z=r.z-r.d/2+.65;z<r.z+r.d/2;z+=1.1)this.box(r.x,.102,z,r.w-.3,.004,.018,'#c8b999');
   this.decorate(r);
  }
  for(const w of wallSegments(s.scene.rooms,s.scene.doors)){
   this.box(w.x,.1,w.z,w.w,.82,w.d,'#d4d6bf',this.world,'plaster',true);
   this.box(w.x,.92,w.z,w.w+.03,.055,w.d+.03,'#a5ad93');
  }
  for(const d of s.scene.doors){if(!d.open)continue;const horizontal=d.axis==='x';for(const side of [-1,1])this.box(d.x+(horizontal?side*d.width/2:0),.1,d.z+(horizontal?0:side*d.width/2),.19,1.9,.19,'#a69c81');}
  for(const p of s.scene.mapSpots){const g=new THREE.Group();g.position.set(p.x,0,p.z);this.world.add(g);this.prop(g,p.kind,p.onTable);g.userData.pick={type:'inspect',id:p.id,room:p.room};g.name='evidence-'+p.id;this.clickables.push(g);this.propObjects.set(p.id,g);
   if(!p.onTable&&!['door','rug','cane'].includes(p.kind))this.obstacles.push({minX:p.x-.44,maxX:p.x+.44,minZ:p.z-.36,maxZ:p.z+.36});
  }
  this.navigation=new NavigationWorld(this.obstacles,b,.25);
 }
 spawn(r,others=[]){const area={minX:r.x-r.w/2+.7,maxX:r.x+r.w/2-.7,minZ:r.z-r.d/2+.7,maxZ:r.z+r.d/2-.7};const count=others.filter(p=>p.x>=area.minX&&p.x<=area.maxX&&p.z>=area.minZ&&p.z<=area.maxZ).length;
  const seats=r.id==='dining'?[[0,11.5],[-3,6],[3,6],[-3,10],[3,10],[0,4]]:r.id==='meeting'?[[-14,5],...[-22,-20.3,-18.6,-16.9,-15.2].map(x=>[x,5.8]),...[-22,-20.3,-18.6,-16.9,-15.2].map(x=>[x,7.2])]:[];
  const seat=seats[count],p=this.navigation.nearest(seat?{x:seat[0],z:seat[1]}:{x:r.x,z:r.z+Math.min(r.d/2-1.1,2.4)},others,area);if(!p)throw Error('房间没有可站立的位置：'+r.id);return this.world.position.clone().set(p.x,0,p.z);
 }
 rebuild(s,previous){
  const saved=previous?.playerId===s.playerId&&previous?.room===s.room?this.player?.g.position.clone():null;
  this.world.traverse(o=>o.geometry?.dispose());this.world.clear();this.cast.clear();this.path=[];this.afterWalk=null;this.labels.replaceChildren();this.roomLabels=[];
  this.buildPlan(s);const occupied=[];
  for(const p of [s.self,...s.people]){
   const room=s.scene.rooms.find(r=>r.id===(p.id===s.playerId?s.room:p.location));if(!room)continue;
   const index=people.findIndex(a=>a.id===p.id),look={stride:.6,speed:1.4,...p,trousers:'#59665f',shoes:'#514f45'},features={eye:[.12+(index%3)*.007,.022,.025+(index%4)*.003,.021+(index%3)*.007,(index%3-1)*.09],brow:[.13,.137,.012+index%3*.003,.02,[[-.06,0],[0,.01],[.06,-.006]]]};
   const rig=createCharacter(this,p.id,{look,features,offset:index*.7,modern:true}),g=rig.root||rig.group||rig.body.parent;this.world.add(g);
   const pt=p.id===s.playerId&&saved&&this.navigation.free(saved)?saved:this.spawn(room,occupied);g.position.copy(pt);g.rotation.y=Math.PI*.12;occupied.push({x:pt.x,z:pt.z});
   const actor={g,rig,room:room.id};this.cast.set(p.id,actor);if(p.id!==s.playerId){g.userData.pick={type:'person',id:p.id,room:room.id};this.clickables.push(g);}else this.player=actor;
  }
  for(const r of s.scene.rooms.filter(r=>r.walkable&&r.decor!=='corridor')){const el=document.createElement('button');el.type='button';el.textContent=r.name;el.dataset.roomLabel=r.id;el.onclick=()=>{if(this.allowed())this.travel(r.id);};this.labels.append(el);this.roomLabels.push({el,point:new THREE.Vector3(r.x,.15,r.z+r.d/2-.6)});}
  if(!saved){this.cameraBookmark=null;this.focus();}
 }
 decorate(r){const x=r.x,z=r.z,d=r.decor;
  if(d==='table'){this.box(x,.8,z,3,.15,2.3,'#ac9473',this.world,'wood',true);for(const dx of [-1.2,1.2])for(const dz of [-.9,.9])this.box(x+dx,0,z+dz,.12,.8,.12,'#877b63');for(let i=0;i<6;i++){const dx=(i%3-1)*.9,dz=i<3?-1.7:1.7;this.box(x+dx,.4,z+dz,.6,.12,.6,'#a59e82');this.box(x+dx,.45,z+dz+(i<3?-.25:.25),.6,.65,.1,'#8b8e77');this.cylinder(this.world,x+dx,.97,z+(i<3?-.75:.75),.16,.035,'#eee7d1');}}
  if(d==='sofa'){this.box(x,.35,z,3,.45,1.2,'#919f8b',this.world,'cloth',true);this.box(x,.65,z-.5,3,.7,.22,'#89957f');this.box(x,.4,z+1.5,1.5,.12,.8,'#ae987c',this.world,'wood',true);}
  if(d==='bed'){this.box(x,.2,z,2,.45,3,'#948a71',this.world,'wood',true);this.box(x,.65,z,1.9,.15,2.9,'#d9d7bf',this.world,'cloth');this.box(x,.8,z-1,1.5,.17,.6,'#e9e3ce',this.world,'cloth');}
  if(d==='chapel'){this.box(x,.09,z,2.6,.025,r.d-1,'#953f3b',this.world,'cloth');for(const dx of [-2,2])for(const dz of [-1,1]){this.box(x+dx,.45,z+dz,1.25,.15,.55,'#a38c6a',this.world,'wood',true);this.box(x+dx,.5,z+dz-.23,1.25,.65,.12,'#8e7e63');}this.box(x,1.3,z-r.d/2+.15,.15,1.3,.15,'#766b54');this.box(x,2.05,z-r.d/2+.15,.8,.13,.15,'#766b54');}
  if(d==='pool'){this.box(x,.12,z,4,.2,4,'#a6b5ad',this.world,'stone',true);this.box(x,.33,z,3.6,.02,3.6,'#8caaa6');for(const dx of [-2,2])this.box(x+dx,.12,z,.17,.3,4,'#c1c7b3',this.world,'stone');}
  if(d==='study'||d==='shelves'){for(let i=0;i<3;i++){this.box(x,r.d>5?.3+i*.7:.3+i*.6,z-r.d/2+.4,r.w-1,.1,.7,'#95856d');for(let j=0;j<8;j++)this.box(x+(j-3.5)*(r.w-1)/9,.4+i*.6,z-r.d/2+.4,.2,.4,.4,['#8f9d8e','#a49a7d','#b0b5a1'][j%3]);}}
  if(d==='attic'){const cabinet=this.box(x,.15,z,2,.5,1.2,'#968870',this.world,'wood',true);cabinet.rotation.z=.14;}
  if(d==='control'){this.box(x,.7,z,2.6,.12,1.1,'#8e8c78',this.world,'wood',true);this.box(x,1,z-.25,1.5,.9,.12,'#4e625d');}
  if(d==='kitchen'){this.box(x,.1,z-r.d/2+.7,r.w-1,.85,.8,'#a8ae9b',this.world,'stone',true);}
  if(d==='unused-toys'){const ball=this.sphere(this.world,x,.8,z,.75,.75,.75,'#b1b9a3');ball.material=ball.material.clone();ball.material.transparent=true;ball.material.opacity=.65;this.obstacles.push({minX:x-1,maxX:x+1,minZ:z-1,maxZ:z+1});}
  if(d==='meeting'){this.box(x,.8,z-1.3,6.5,.14,2,'#ac9473',this.world,'wood',true);this.box(x,1.1,z+3.8,6,1.2,.12,'#c3c9b2');}
  if(d==='foyer'){this.box(x,.04,z+.95,2,.04,.1,'#8b8d76');}
  if(d==='corridor'){for(let t=z-r.d/2+3;t<z+r.d/2;t+=7)this.box(x-r.w/2+.25,.4,t,.2,.1,1.2,'#b0b69e');}
  if(d==='garage'){this.box(x,.3,z,2,.6,3.3,'#9caa9c',this.world,'stone',true);this.box(x,.9,z-.3,1.8,.7,1.7,'#bac5b4');}
  if(d==='bed'){this.box(x-3.4,.72,z+2,1.8,.12,1,'#ad997b',this.world,'wood',true);this.box(x-3.4,.85,z+1.8,.8,.55,.09,'#596b61');this.box(x-2,0,z-3.4,2,1.8,.8,'#b6a58a',this.world,'wood',true);}
  if(r.id==='lounge'){this.box(x,.11,z,7,.02,5,'#c3cbb1',this.world,'cloth');this.box(x+4.8,.2,z-5,2.5,.55,.7,'#aa987a',this.world,'wood',true);this.box(x+4.8,.8,z-5,2.4,1.3,.12,'#4e6056');for(const dx of [-4.8,4.8]){this.box(x+dx,.35,z+4,1.2,.45,1.2,'#9aa78d',this.world,'cloth',true);this.box(x+dx,.7,z+3.5,1.2,.55,.2,'#89997f');}}
  if(r.id==='dining'){this.box(x-5,.1,z-2,1,.9,3,'#b0a083',this.world,'wood',true);for(const t of [-.8,0,.8])this.cylinder(this.world,x-5,1.05,z-2+t,.18,.08,'#eee8d5');}
  if(['table','sofa','bed','study'].includes(d)){this.cylinder(this.world,x+r.w/2-1,.35,z+r.d/2-1,.3,.6,'#b4a78a');this.sphere(this.world,x+r.w/2-1,.85,z+r.d/2-1,.45,.55,.4,'#92a181');}
  if(d==='washroom'){this.box(x,.5,z,1,.15,.7,'#d7dbcc');this.cylinder(this.world,x,.6,z,.3,.08,'#f0e9d6');}
 }
 prop(g,kind,onTable=false){const b=(x,y,z,w,h,d,c)=>this.box(x,y,z,w,h,d,c,g),s=(x,y,z,rx,ry,rz,c)=>this.sphere(g,x,y,z,rx,ry,rz,c),c=(x,y,z,r,h,color)=>this.cylinder(g,x,y,z,r,h,color);
  if(kind==='door'){b(0,0,0,.8,1.8,.12,'#8a917b');b(.27,.9,.09,.08,.1,.07,'#d2bc86');return;}
  if(kind==='shroud'){s(0,.2,0,.4,.15,.85,'#d6d8c4');return;}
  if(kind==='rug'){b(0,.1,0,.8,.035,1.2,'#9b4841');return;}
  if(kind==='cane'){c(0,.7,0,.028,1.4,'#4d4a40');s(.04,1.42,0,.15,.04,.05,'#b6b294');return;}
  if(kind==='ball'){s(0,.55,0,.5,.5,.5,'#abb7aa');c(0,.6,.4,.2,.15,'#e0dcc7');return;}
  if(!onTable){b(0,.65,0,.85,.1,.6,'#9d9076');for(const x of [-.3,.3])b(x,0,0,.06,.65,.4,'#817b68');}else g.position.y=.2;
  if(kind==='phone'){b(0,.76,0,.21,.04,.39,'#444d46');b(0,.803,0,.17,.009,.3,'#b5c7b3');}
  else if(kind==='photo'){b(0,.76,0,.5,.05,.36,'#f0e6cd');s(0,.83,0,.08,.02,.1,'#9d9d86');}
  else if(kind==='keypad'){b(0,.76,0,.5,.05,.45,'#656f61');for(let i=0;i<9;i++)b((i%3-1)*.12,.82,(Math.floor(i/3)-1)*.12,.07,.02,.07,'#d6d6bf');}
  else if(kind==='console'||kind==='screen'){b(0,.76,0,.7,.5,.08,'#52665e');b(0,.81,.05,.59,.36,.01,'#a5bcaa');}
  else if(kind==='camera'){b(0,.76,0,.45,.3,.25,'#626c63');c(0,.91,.2,.1,.2,'#3c4841');}
  else if(kind==='mask'){s(0,.84,0,.2,.08,.3,'#ede8d4');s(-.07,.92,-.05,.04,.015,.055,'#5a6257');s(.07,.92,-.05,.04,.015,.055,'#5a6257');}
  else if(kind==='paint'){for(let i=0;i<3;i++)c((i-1)*.2,.84,0,.09,.12,['#8c9184','#98443a','#dfd8ba'][i]);}
  else if(kind==='pump'){c(0,1,0,.08,.45,'#5a6659');b(0,1.2,0,.4,.06,.08,'#b2ad90');}
  else if(kind==='wine'){for(const x of [-.15,.15]){c(x,.88,0,.025,.2,'#c6c9b5');s(x,1.01,0,.07,.09,.07,'#b1bba9');}}
  else if(kind==='grate'){for(let i=0;i<6;i++)b((i-2.5)*.1,.78,0,.025,.02,.5,'#6e7568');}
  else if(kind==='pan'){c(0,.82,0,.19,.08,'#606b61');b(.26,.8,0,.27,.03,.04,'#5f6658');}
  else if(kind==='lighter'){b(0,.76,0,.12,.25,.06,'#a34138');b(0,1.01,0,.12,.04,.06,'#b0b7a3');}
  else if(kind==='key'){b(0,.8,0,.28,.02,.04,'#b4a674');c(-.15,.82,0,.06,.02,'#b4a674');}
  else if(kind==='tape'){c(0,.84,0,.13,.12,'#b4a778');b(.15,.8,0,.3,.02,.06,'#d3c991');}
  else if(kind==='dial'){c(0,.92,0,.17,.14,'#808e7f');}
  else{b(0,.78,0,.5,.025,.4,'#eae2c9');for(let i=0;i<4;i++)b(0,.807,(i-1.5)*.06,.32,.002,.009,'#a8ab96');}
 }
 focus(actor){
  if(actor){if(!this.cameraBookmark)this.cameraBookmark={target:this.controls.target.clone(),position:this.camera.position.clone(),zoom:this.camera.zoom};const target=this.cast.get(actor)?.g.position;if(!target)return;this.controls.target.copy(target).add(new THREE.Vector3(0,1,0));this.camera.position.copy(this.controls.target).add(new THREE.Vector3(4,3,6));this.camera.zoom=2.4;}
  else if(this.cameraBookmark){this.controls.target.copy(this.cameraBookmark.target);this.camera.position.copy(this.cameraBookmark.position);this.camera.zoom=this.cameraBookmark.zoom;this.cameraBookmark=null;}
  else{const p=this.player?.g.position||new THREE.Vector3();this.controls.target.copy(p);this.camera.position.copy(p).add(new THREE.Vector3(22,32,36));this.camera.zoom=1;}
  this.controls.update();this.resize();
 }
 overview(){this.cameraBookmark=null;const b=this.bounds;this.controls.target.set((b.minX+b.maxX)/2,0,(b.minZ+b.maxZ)/2);this.camera.position.copy(this.controls.target).add(this.controls.target.clone().set(22,42,36));this.camera.zoom=1;this.controls.update();this.resize();let mx=0,my=0;for(const x of [b.minX,b.maxX])for(const z of [b.minZ,b.maxZ])for(const y of [0,2.5]){const p=this.controls.target.clone().set(x,y,z).project(this.camera);mx=Math.max(mx,Math.abs(p.x));my=Math.max(my,Math.abs(p.y));}this.camera.zoom=Math.min(.92/mx,.72/my);this.camera.updateProjectionMatrix();}
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;const span=w<600?10:16,aspect=w/h;this.camera.left=-span;this.camera.right=span;this.camera.top=span/aspect;this.camera.bottom=-span/aspect;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);this.composer.setSize(w,h);this.comic.setSize?.(w,h);}
 free(x,z){return this.navigation.free({x,z});}
 others(){return [...this.cast.entries()].filter(([id])=>id!==this.state.playerId).map(([,a])=>({x:a.g.position.x,z:a.g.position.z}));}
 walk(point,then,area){
  if(!this.player)return false;const path=this.navigation.path(this.player.g.position,point,this.others(),area);if(!path.length){this.host.dispatchEvent(new CustomEvent('travel-blocked',{detail:'这边暂时走不过去，请换一个落点。'}));return false;}
  this.path=path.map(p=>new THREE.Vector3(p.x,0,p.z));this.afterWalk=then;this.follow=true;this.host.dataset.walking='true';return true;
 }
 async arrive(room,action){
  this.arriving=true;try{if(room&&room!==this.state.room)await this.pick({type:'move',room});if(action)await this.pick(action);}finally{this.arriving=false;}
 }
 travel(id,point){
  if(!this.allowed())return false;const r=this.state.scene.rooms.find(r=>r.id===id&&r.walkable);if(!r)return false;
  const area={minX:r.x-r.w/2+.7,maxX:r.x+r.w/2-.7,minZ:r.z-r.d/2+.7,maxZ:r.z+r.d/2-.7};
  return this.walk(point||this.spawn(r,this.others()),()=>this.arrive(id),area);
 }
 approach(point,room,then){
  const r=this.state.scene.rooms.find(r=>r.id===room&&r.walkable);if(!r)return false;
  const choices=[];for(const distance of [1.15,1.65,2.1])for(let i=0;i<16;i++){const a=i*Math.PI/8,p={x:point.x+Math.cos(a)*distance,z:point.z+Math.sin(a)*distance};if(roomAt([r],p)&&this.navigation.free(p,this.others()))choices.push(p);}
  choices.sort((a,b)=>Math.hypot(a.x-this.player.g.position.x,a.z-this.player.g.position.z)-Math.hypot(b.x-this.player.g.position.x,b.z-this.player.g.position.z));
  for(const p of choices){const path=this.navigation.path(this.player.g.position,p,this.others());if(path.length){this.path=path.map(v=>new THREE.Vector3(v.x,0,v.z));this.afterWalk=then;this.follow=true;this.host.dataset.walking='true';return true;}}
  return false;
 }
 talking(id,value){this.talker=value?id:null;const a=this.cast.get(id);if(a)a.rig.inConversation=!!value;}
 frame(t){
  this.raf=requestAnimationFrame(this.frame);if(!this.active||document.hidden||t-(this.last||0)<1000/35)return;const dt=Math.min((t-(this.last||t))/1000,.05);this.last=t;let moving=false;
  if(this.path?.length&&this.player&&this.allowed()){
   const p=this.player.g.position,target=this.path[0],v=target.clone().sub(p);v.y=0;
   if(v.length()<.08)this.path.shift();else{const delta=v.normalize().multiplyScalar(Math.min(dt*7,p.distanceTo(target)));p.add(delta);this.player.g.rotation.y=Math.atan2(v.x,v.z);moving=true;if(this.follow){this.controls.target.add(delta);this.camera.position.add(delta);}}
  }else if(!this.path?.length&&this.afterWalk&&this.allowed()){const cb=this.afterWalk;this.afterWalk=null;this.host.dataset.walking='false';cb();}
  for(const [id,a] of this.cast)animateCharacter(a.rig,dt,id===this.state.playerId&&moving?1:0,id===this.talker?'talk':'idle');
  this.controls.update();for(const label of this.roomLabels){const p=label.point.clone().project(this.camera),visible=!this.cameraBookmark&&p.z<1&&Math.abs(p.x)<.97&&Math.abs(p.y)<.84;label.el.hidden=!visible;if(visible)label.el.style.transform=`translate(${(p.x+1)*this.host.clientWidth/2}px,${(1-p.y)*this.host.clientHeight/2}px) translate(-50%,-50%)`;}
  this.composer.render();
 }
 destroy(){this.active=false;cancelAnimationFrame(this.raf);this.resizeObserver.disconnect();this.controls.dispose();this.world.traverse(o=>o.geometry?.dispose());this.composer.dispose();this.renderer.dispose();this.host.replaceChildren();}
}
