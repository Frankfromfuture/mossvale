import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {OutlinePass} from 'three/examples/jsm/postprocessing/OutlinePass.js';
import {ComicInkPass,makeToonRamp} from './comic-render.mjs';
import {createSurfaceMaterials,surfaceUVs} from './surface-materials.mjs';
import {createCharacter,animateCharacter} from './characters.mjs';
import {people} from '../shared/suspect7/cast.mjs';
const ink='#57594e';
export class VillaScene{
 constructor(host,pick){
  this.host=host;this.pick=pick;this.active=true;this.materials=new Map();this.toonRamp=makeToonRamp();this.surface=createSurfaceMaterials(this.toonRamp);this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#d9dfd2');
  this.renderer=new THREE.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.append(this.renderer.domElement);
  this.camera=new THREE.OrthographicCamera(-9,9,9,-9,.1,180);this.camera.position.set(17,22,27);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.enableRotate=false;this.controls.minZoom=.7;this.controls.maxZoom=2.8;this.controls.mouseButtons.LEFT=THREE.MOUSE.PAN;this.controls.touches.ONE=THREE.TOUCH.PAN;
  this.scene.add(new THREE.HemisphereLight('#fff5dc','#839385',2));const sun=new THREE.DirectionalLight('#fff5df',1.6);sun.position.set(-9,18,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.intensity=.4;Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15});this.scene.add(sun);
  this.world=new THREE.Group();this.scene.add(this.world);this.cast=new Map();this.clickables=[];this.obstacles=[];this.clock=0;
  const rt=new THREE.WebGLRenderTarget(1,1,{samples:2,depthTexture:new THREE.DepthTexture(1,1)});this.composer=new EffectComposer(this.renderer,rt);this.composer.addPass(new RenderPass(this.scene,this.camera));this.comic=new ComicInkPass(this.camera);this.composer.addPass(this.comic);this.outline=new OutlinePass(new THREE.Vector2(1,1),this.scene,this.camera);this.outline.edgeStrength=3;this.outline.edgeThickness=1.4;this.outline.visibleEdgeColor.set('#af8d52');this.outline.hiddenEdgeColor.set('#af8d52');this.composer.addPass(this.outline);this.composer.addPass(new OutputPass());
  const canvas=this.renderer.domElement;canvas.setAttribute('aria-label','伴山别墅当前楼层三维场景');canvas.addEventListener('pointerdown',e=>this.down=[e.clientX,e.clientY]);canvas.addEventListener('pointerup',e=>{if(!this.down||Math.hypot(e.clientX-this.down[0],e.clientY-this.down[1])>6)return;const b=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),this.camera);const hit=ray.intersectObjects(this.clickables,true)[0];if(hit){let o=hit.object;while(o&&!o.userData.pick)o=o.parent;if(o?.userData.pick){this.approach(o.position,()=>this.pick(o.userData.pick));return;}}const pt=new THREE.Vector3();if(ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-.15),pt))this.walk(pt);});
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();this.frame=this.frame.bind(this);this.raf=requestAnimationFrame(this.frame);
 }
 mat(color,kind='plaster'){return this.surface(color,kind);}
 box(x,y,z,w,h,d,color,parent=this.world,kind='wood',obstacle=false){const geo=new THREE.BoxGeometry(w,h,d);surfaceUVs(geo,kind,w,h,d);const m=new THREE.Mesh(geo,this.mat(color,kind));m.position.set(x,y+h/2,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);if(obstacle)this.obstacles.push({x,z,w:w+.7,d:d+.7});return m;}
 sphere(parent,x,y,z,rx,ry,rz,c){const m=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),this.mat(c));m.scale.set(rx,ry,rz);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
 cylinder(parent,x,y,z,r,h,c){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),this.mat(c));m.position.set(x,y,z);parent.add(m);return m;}
 update(s){
  this.state=s;const key=s.room+':'+s.playerId+':'+s.scene.spots.map(p=>p.id).join(',');if(key!==this.key){this.key=key;this.rebuild(s);}
  this.outline.selectedObjects=this.clickables.filter(o=>o.userData.pick?.type==='inspect'&&!s.evidence.some(e=>e.id===o.userData.pick.id));
 }
 rebuild(s){
  this.world.traverse(o=>{if(o.geometry)o.geometry.dispose();});this.world.clear();this.cast.clear();this.clickables=[];this.obstacles=[];this.path=[];this.afterWalk=null;
  const r=s.scene;this.bounds={minX:r.x-r.w/2+.5,maxX:r.x+r.w/2-.5,minZ:r.z-r.d/2+.5,maxZ:r.z+r.d/2-.5};
  this.box(0,-.25,0,r.footprint.w,.25,r.footprint.d,'#c8cbb6',this.world,'stone');
  for(const room of r.rooms){const active=room.id===s.room;this.box(room.x,-.22,room.z,room.w,.3,room.d,active?'#d6c5a5':'#c7c8b6',this.world,room.floor===0?'stone':'wood');this.box(room.x,0,room.z-room.d/2,room.w,2.6,.13,'#cccdbb',this.world,'plaster');this.box(room.x-room.w/2,0,room.z,.13,1,room.d,'#c7cabb',this.world,'plaster');this.box(room.x+room.w/2,0,room.z,.12,.45,room.d,'#b7bdac',this.world,'plaster');if(!active){const floor=this.box(room.x,.1,room.z,room.w-.5,.015,room.d-.5,'#c9cdbd');floor.userData.pick={type:'move',room:room.id};this.clickables.push(floor);}}
  this.decorate(r);
  const spots=s.scene.spots,n=spots.length;spots.forEach((p,i)=>{const count=Math.ceil(n/2),side=i<count?-1:1,index=i%count,x=r.x+side*(r.w/2-.65),z=r.z-r.d/2+1.1+(r.d-2.2)*(count===1?.5:index/(count-1));const g=new THREE.Group();g.position.set(x,0,z);this.world.add(g);this.prop(g,p.kind);g.userData.pick={type:'inspect',id:p.id};g.name='evidence-'+p.id;this.clickables.push(g);this.obstacles.push({x,z,w:1.1,d:1.1});});
  const spotsForPeople=[];for(let z=this.bounds.maxZ-.15;z>=this.bounds.minZ;z-=.9)for(let x=this.bounds.minX+.2;x<=this.bounds.maxX;x+=.95)if(this.free(x,z))spotsForPeople.push({x,z});
  spotsForPeople.sort((a,b)=>Math.abs(a.x-r.x)-Math.abs(b.x-r.x)||b.z-a.z);
  const shown=[s.self,...s.people.filter(p=>p.near)].slice(0,11);shown.forEach((p,i)=>{const index=people.findIndex(a=>a.id===p.id),look={stride:.6,speed:1.4,...p,trousers:'#59665f',shoes:'#514f45'},features={eye:[.12+(index%3)*.007,.022,.025+(index%4)*.003,.021+(index%3)*.007,(index%3-1)*.09],brow:[.13,.137,.012+index%3*.003,.02,[[-.06,0],[0,.01],[.06,-.006]]]};const rig=createCharacter(this,p.id,{look,features,offset:index*.7,modern:true});const g=rig.root||rig.group||rig.body.parent;this.world.add(g);g.position.set(spotsForPeople[i]?.x??r.x,0,spotsForPeople[i]?.z??r.z);g.rotation.y=Math.PI*.12;const actor={g,rig};this.cast.set(p.id,actor);if(p.id!==s.playerId){g.userData.pick={type:'person',id:p.id};this.clickables.push(g);}else this.player=actor;});
  this.focus();this.host.dataset.floor=String(r.floor);this.host.dataset.room=s.room;
 }
 decorate(r){const x=r.x,z=r.z,d=r.decor;
  if(['table','meeting'].includes(d)){this.box(x,.8,z,3,.15,2.3,'#ac9473',this.world,'wood',true);for(const dx of [-1.2,1.2])for(const dz of [-.9,.9])this.box(x+dx,0,z+dz,.12,.8,.12,'#877b63');for(let i=0;i<6;i++){const dx=(i%3-1)*.9,dz=i<3?-1.7:1.7;this.box(x+dx,.4,z+dz,.6,.12,.6,'#a59e82');this.box(x+dx,.45,z+dz+(i<3?-.25:.25),.6,.65,.1,'#8b8e77');this.cylinder(this.world,x+dx,.97,z+(i<3?-.75:.75),.16,.035,'#eee7d1');}}
  if(d==='sofa'){this.box(x,.35,z,3,.45,1.2,'#919f8b',this.world,'cloth',true);this.box(x,.65,z-.5,3,.7,.22,'#89957f');this.box(x,.4,z+1.5,1.5,.12,.8,'#ae987c',this.world,'wood',true);}
  if(d==='bed'){this.box(x,.2,z,2,.45,3,'#948a71',this.world,'wood',true);this.box(x,.65,z,1.9,.15,2.9,'#d9d7bf',this.world,'cloth');this.box(x,.8,z-1,1.5,.17,.6,'#e9e3ce',this.world,'cloth');}
  if(d==='chapel'){this.box(x,.09,z,2.6,.025,r.d-1,'#953f3b',this.world,'cloth');for(const dx of [-2,2])for(const dz of [-1,1]){this.box(x+dx,.45,z+dz,1.25,.15,.55,'#a38c6a',this.world,'wood',true);this.box(x+dx,.5,z+dz-.23,1.25,.65,.12,'#8e7e63');}this.box(x,1.3,z-r.d/2+.15,.15,1.3,.15,'#766b54');this.box(x,2.05,z-r.d/2+.15,.8,.13,.15,'#766b54');}
  if(d==='pool'){this.box(x,.12,z,4,.2,4,'#a6b5ad',this.world,'stone',true);this.box(x,.33,z,3.6,.02,3.6,'#8caaa6');for(const dx of [-2,2])this.box(x+dx,.12,z,.17,.3,4,'#c1c7b3',this.world,'stone');}
  if(d==='study'||d==='shelves'){for(let i=0;i<3;i++){this.box(x,r.d>5?.3+i*.7:.3+i*.6,z-r.d/2+.4,r.w-1,.1,.7,'#95856d');for(let j=0;j<8;j++)this.box(x+(j-3.5)*(r.w-1)/9,.4+i*.6,z-r.d/2+.4,.2,.4,.4,['#8f9d8e','#a49a7d','#b0b5a1'][j%3]);}}
  if(d==='attic'){const cabinet=this.box(x,.15,z,2,.5,1.2,'#968870',this.world,'wood',true);cabinet.rotation.z=.14;}
  if(d==='control'){this.box(x,.7,z,2.6,.12,1.1,'#8e8c78',this.world,'wood',true);this.box(x,1,z-.25,1.5,.9,.12,'#4e625d');}
  if(d==='kitchen'){this.box(x,.1,z-r.d/2+.7,r.w-1,.85,.8,'#a8ae9b',this.world,'stone',true);}
  if(d==='toys'){const ball=this.sphere(this.world,x,.8,z,.75,.75,.75,'#b1b9a3');ball.material=ball.material.clone();ball.material.transparent=true;ball.material.opacity=.65;this.obstacles.push({x,z,w:2,d:2});}
  if(d==='stairs')for(let i=0;i<7;i++)this.box(x,.16*i,z+i*.22-1,1.2,.16,.25,'#a6a68f');
  if(d==='garage'){this.box(x,.3,z,2,.6,3.3,'#9caa9c',this.world,'stone',true);this.box(x,.9,z-.3,1.8,.7,1.7,'#bac5b4');}
  if(d==='washroom'){this.box(x,.5,z,1,.15,.7,'#d7dbcc');this.cylinder(this.world,x,.6,z,.3,.08,'#f0e9d6');}
 }
 prop(g,kind){const b=(x,y,z,w,h,d,c)=>this.box(x,y,z,w,h,d,c,g),s=(x,y,z,rx,ry,rz,c)=>this.sphere(g,x,y,z,rx,ry,rz,c),c=(x,y,z,r,h,color)=>this.cylinder(g,x,y,z,r,h,color);
  if(kind==='door'){b(0,0,0,.8,1.8,.12,'#8a917b');b(.27,.9,.09,.08,.1,.07,'#d2bc86');return;}
  if(kind==='shroud'){s(0,.2,0,.4,.15,.85,'#d6d8c4');return;}
  if(kind==='rug'){b(0,.1,0,.8,.035,1.2,'#9b4841');return;}
  if(kind==='cane'){c(0,.7,0,.028,1.4,'#4d4a40');s(.04,1.42,0,.15,.04,.05,'#b6b294');return;}
  if(kind==='ball'){s(0,.55,0,.5,.5,.5,'#abb7aa');c(0,.6,.4,.2,.15,'#e0dcc7');return;}
  b(0,.65,0,.85,.1,.6,'#9d9076');for(const x of [-.3,.3])b(x,0,0,.06,.65,.4,'#817b68');
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
 focus(actor){const r=this.state.scene,target=actor?this.cast.get(actor)?.g.position:new THREE.Vector3(r.x,0,r.z);if(!target)return;this.controls.target.copy(target).add(new THREE.Vector3(0,actor?1:0,0));this.camera.position.copy(this.controls.target).add(new THREE.Vector3(actor?4:17,actor?3:22,actor?6:27));this.camera.zoom=actor?1.8:1;this.controls.update();this.resize();}
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;const r=this.state?.scene,span=r?Math.max(r.w,r.d)*.82:10,aspect=w/h;this.camera.left=-span;this.camera.right=span;this.camera.top=span/aspect;this.camera.bottom=-span/aspect;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);this.composer.setSize(w,h);this.comic.setSize?.(w,h);}
 free(x,z){const b=this.bounds;return x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ&&!this.obstacles.some(o=>Math.abs(x-o.x)<o.w/2&&Math.abs(z-o.z)<o.d/2);}
 walk(point,then){if(!this.player)return;const p=this.player.g.position,step=.25,b=this.bounds,cell=v=>[Math.round((v.x-b.minX)/step),Math.round((v.z-b.minZ)/step)],key=c=>c.join(','),world=c=>new THREE.Vector3(b.minX+c[0]*step,0,b.minZ+c[1]*step),start=cell(p),goal=cell(point),queue=[start],prev=new Map([[key(start),null]]);let end=null;
  for(let n=0;n<queue.length&&n<6500;n++){const a=queue[n],v=world(a);if(Math.hypot(v.x-point.x,v.z-point.z)<.5){end=a;break;}for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){const next=[a[0]+d[0],a[1]+d[1]],k=key(next),w=world(next);if(!prev.has(k)&&this.free(w.x,w.z)){prev.set(k,a);queue.push(next);}}}
  if(!end){then?.();return;}const path=[];for(let c=end;c;c=prev.get(key(c)))path.unshift(world(c));this.path=path;this.afterWalk=then;
 }
 approach(point,then){const choices=[[0,.9],[0,-.9],[.9,0],[-.9,0]].map(([x,z])=>new THREE.Vector3(point.x+x,0,point.z+z)).filter(p=>this.free(p.x,p.z));choices.sort((a,b)=>a.distanceTo(this.player.g.position)-b.distanceTo(this.player.g.position));this.walk(choices[0]||this.player.g.position,then);}
 talking(id,value){this.talker=value?id:null;const a=this.cast.get(id);if(a)a.rig.inConversation=!!value;}
 frame(t){this.raf=requestAnimationFrame(this.frame);if(!this.active||document.hidden||t-(this.last||0)<1000/35)return;const dt=Math.min((t-(this.last||t))/1000,.05);this.last=t;let moving=false;if(this.path?.length&&this.player){const p=this.player.g.position,target=this.path[0],v=target.clone().sub(p);v.y=0;if(v.length()<.08)this.path.shift();else{p.add(v.normalize().multiplyScalar(Math.min(dt*2.8,p.distanceTo(target))));this.player.g.rotation.y=Math.atan2(v.x,v.z);moving=true;}}else if(this.afterWalk){const cb=this.afterWalk;this.afterWalk=null;cb();}for(const [id,a] of this.cast)animateCharacter(a.rig,dt,id===this.state.playerId&&moving?1:0,id===this.talker?'talk':'idle');this.controls.update();this.composer.render();}
 destroy(){this.active=false;cancelAnimationFrame(this.raf);this.resizeObserver.disconnect();this.controls.dispose();this.world.traverse(o=>o.geometry?.dispose());this.composer.dispose();this.renderer.dispose();this.host.replaceChildren();}
}
