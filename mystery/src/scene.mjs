import {placeSpeechBubble} from './speech-bubble.mjs';
import {ConversationCamera} from './conversation-camera.mjs';
import {dialogueMood} from './character-expression.mjs';
import {createSurfaceMaterials,surfaceUVs} from './surface-materials.mjs';
import {createContactShadows} from './contact-shadows.mjs';
import {playerId} from '../shared/player.mjs';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {bounds,buildings,rooms,cast,getRoom} from '../shared/layout.mjs';
import {propLayout} from '../shared/prop-layout.mjs';
import {makeEvidenceProp} from './evidence-props.mjs';
import {buildGuestRoom,placeRoomEvidence} from './room-dressing.mjs';
import {buildSoftWalls} from './soft-walls.mjs';
import {buildRiver} from './river.mjs';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {OutlinePass} from 'three/examples/jsm/postprocessing/OutlinePass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {SceneSocial} from './scene-social.mjs';
import {buildHallLife} from './hall-life.mjs';
import {hallSeats,homeSeat,cornerSeats} from '../shared/hall-seating.mjs';
import {createCharacter,animateCharacter} from './characters.mjs';
import {NavigationWorld,actorRadius} from './navigation.mjs';
import {ComicInkPass,makeToonRamp} from './comic-render.mjs';
import {destinations,placeName,placeAnchor} from './location-map.mjs';
import {captureSceneMap} from './scene-map.mjs';
export const walkSpeedMultiplier=3;
const ink='#4d4d43', palette={grass:'#c9d1aa',wood:'#c6aa83',cream:'#f2e8ca',sage:'#a9b79f',blue:'#b7c9cd',rose:'#d8b5a7'};
function grain(seed=17){let a=seed;return ()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296;};}
const distantFocusShader={
 uniforms:{tDiffuse:{value:null},resolution:{value:new THREE.Vector2(1,1)},strength:{value:1},haze:{value:new THREE.Color('#d6dcc8')}},
 vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:`uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float strength; uniform vec3 haze;
 varying vec2 vUv;
 void main(){
  vec4 source=texture2D(tDiffuse,vUv);
  float distanceFromFocus=abs(vUv.y-.5);
  // Keep the central subject band untouched, including its pencil contours.
  if(distanceFromFocus<=.17){gl_FragColor=source;return;}
  float fade=smoothstep(.17,.39,distanceFromFocus)*strength;
  vec2 stepSize=vec2(1.0)/resolution*(.75+2.65*fade);
  // A dense Gaussian kernel avoids repeated outlines at wider blur radii.
  vec3 soft=vec3(0.0);
  for(int y=-2;y<=2;y++){
   float wy=y==0?6.0:((y==-1||y==1)?4.0:1.0);
   for(int x=-2;x<=2;x++){
    float wx=x==0?6.0:((x==-1||x==1)?4.0:1.0);
    soft+=texture2D(tDiffuse,vUv+vec2(float(x),float(y))*stepSize).rgb*(wx*wy/256.0);
   }
  }
  vec3 color=mix(source.rgb,soft,fade*.96);
  color=mix(color,haze,fade*.028);
  gl_FragColor=vec4(color,source.a);
 }`
};
export class TownScene{
 constructor(container,onPick){
  this.comic=new URLSearchParams(location.search).get('look')!=='volume';this.toonRamp=this.comic?makeToonRamp():null;this.scenery=new URLSearchParams(location.search).get('scenery')!=='classic';this.surfaceMaterial=createSurfaceMaterials(this.toonRamp);this.contacts=this.scenery?createContactShadows():null;
  this.host=container;this.onPick=onPick;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#d6dcc8');this.scene.fog=new THREE.Fog('#d6dcc8',165,320);
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;container.append(this.renderer.domElement);
  this.camera=new THREE.OrthographicCamera(-20,20,20,-20,.1,600);this.camera.position.set(70,95,100);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.12;this.controls.enableRotate=false;this.controls.minZoom=.2;this.controls.maxZoom=6;this.controls.screenSpacePanning=true;this.controls.target.set(0,0,-10);this.controls.mouseButtons.LEFT=THREE.MOUSE.PAN;this.controls.touches.ONE=THREE.TOUCH.PAN;this.controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
  this.materials=new Map();this.clickable=[];this.shells=new Map();this.placeLabels=new Map();this.interiors=new Map();this.actors=new Map();this.props=new Map();this.labels=document.createElement('div');this.labels.className='scene-labels';container.append(this.labels);this.ray=new THREE.Raycaster();this.mouse=new THREE.Vector2();this.obstacleMeshes=[];this.wallObstacles=[];this.captureObstacles=true;this.focusTarget=null;this.last=0;this.pointerStart=null;this.current=null;
  this.scene.add(new THREE.HemisphereLight('#fff5d9','#829581',this.comic?1.6:1.8));const sun=new THREE.DirectionalLight('#fff9eb',this.comic?1.35:1.65);sun.position.set(-20,32,18);sun.castShadow=true;sun.shadow.intensity=this.comic?(this.scenery?.5:.4):1;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;sun.shadow.normalBias=this.scenery?.025:.04;this.scene.add(sun);this.sun=sun;
  this.buildGround();this.buildArchitecture();this.captureObstacles=false;this.buildEvidence();this.buildNavigation();this.buildPeople();this.contactMesh=this.contacts?.buildStatic(this);this.social=new SceneSocial(this);this.entryBubble=this.label('',new THREE.Vector3(),'ambient-bubble natural-text entry-reaction');this.entryBubble.el.hidden=true;this.entryBubble.el.setAttribute('role','status');this.entryBubble.el.setAttribute('aria-live','polite');this.entryReactionsSeen=new Set();
  const target=new THREE.WebGLRenderTarget(1,1,{samples:4,depthTexture:this.comic?new THREE.DepthTexture(1,1):null});this.composer=new EffectComposer(this.renderer,target);this.composer.addPass(new RenderPass(this.scene,this.camera));this.comicPass=new ComicInkPass(this.camera);this.comicPass.enabled=this.comic;this.composer.addPass(this.comicPass);this.distantPass=new ShaderPass(distantFocusShader);this.distantPass.enabled=this.comic;this.composer.addPass(this.distantPass);
  this.outline=new OutlinePass(new THREE.Vector2(1,1),this.scene,this.camera);this.outline.edgeStrength=4.2;this.outline.edgeThickness=2.2;this.outline.edgeGlow=.08;this.outline.visibleEdgeColor.set('#df9d45');this.outline.hiddenEdgeColor.set('#ae8654');this.composer.addPass(this.outline);this.composer.addPass(new OutputPass());
  this.conversationCamera=new ConversationCamera(this);
  this.host.dataset.roofs='0';this.host.dataset.look=this.comic?'comic':'volume';this.host.dataset.scenery=this.scenery?'crafted':'classic';
  const canvas=this.renderer.domElement;
  canvas.addEventListener('pointerdown',e=>{this.pointerStart=[e.clientX,e.clientY];});
  canvas.addEventListener('pointerup',e=>{if(!this.pointerStart||Math.hypot(e.clientX-this.pointerStart[0],e.clientY-this.pointerStart[1])>7)return;const rect=canvas.getBoundingClientRect();this.mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.mouse,this.camera);const hits=this.ray.intersectObjects(this.clickable,true).filter(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});if(hits.length){let o=hits[0].object;while(o&&!o.userData.pick)o=o.parent;if(o?.userData.pick){if(o.userData.pick.type==='room'&&o.userData.pick.id===this.current?.room)this.walkInside(hits[0].point);else this.onPick(o.userData.pick);}}else{const point=new THREE.Vector3();if(this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-.12),point))this.walkInside(point);}});
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(container);this.resize();this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);
 }
 mat(color,surface='paper'){if(this.scenery&&surface!=='paper')return this.surfaceMaterial(color,surface);if(!this.materials.has(color)){const tex=document.createElement('canvas');tex.width=tex.height=64;const ctx=tex.getContext('2d'),r=grain();ctx.fillStyle=color;ctx.fillRect(0,0,64,64);for(let i=0;i<180;i++){ctx.fillStyle=i%2?'rgba(255,250,231,.17)':'rgba(61,62,47,.05)';ctx.fillRect(r()*64,r()*64,1+r()*3,.5+r());}const map=new THREE.CanvasTexture(tex);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;this.materials.set(color,new THREE.MeshToonMaterial({color:0xffffff,map,gradientMap:this.toonRamp}));}return this.materials.get(color);}
 box(x,y,z,w,h,d,color,parent=this.scene,outline=true,radius=0,surface='paper'){const roundedHeight=Math.max(h,2*radius),geometry=radius?new RoundedBoxGeometry(w,roundedHeight,d,3,radius):new THREE.BoxGeometry(w,h,d);if(radius&&roundedHeight!==h)geometry.scale(1,h/roundedHeight,1);if(this.scenery&&surface!=='paper')surfaceUVs(geometry,surface,w,h,d);const mesh=new THREE.Mesh(geometry,this.mat(color,surface));mesh.userData.surface=surface;mesh.position.set(x,y+h/2,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);if(this.captureObstacles&&y+h>.34&&y<2.25)this.obstacleMeshes.push(mesh);if(outline){const lines=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:this.comic?0x000000:ink,transparent:true,opacity:.55}));mesh.add(lines);}return mesh;}
 // Rounded faces keep the original extents; the depth pass traces their silhouette.
 roundBox(x,y,z,w,h,d,color,parent,radius,surface='paper'){return this.box(x,y,z,w,h,d,color,parent,false,radius,surface);}
 ball(x,y,z,r,color,parent=this.scene,scale=[1,1,1]){const m=new THREE.Mesh(new THREE.SphereGeometry(r,10,7),this.mat(color));m.position.set(x,y,z);m.scale.set(...scale);m.castShadow=true;parent.add(m);return m;}
 label(text,world,cls='',pick=null){const el=document.createElement(pick?'button':'div');el.className='world-label '+cls;el.textContent=text;el.type='button';if(pick)el.onclick=e=>{e.stopPropagation();this.onPick(pick);};else el.tabIndex=-1;this.labels.append(el);return {el,world};}
 buildGround(){
  this.box(0,-.45,0,420,.5,420,palette.grass,this.scene,false);
  const r=grain(981),size=2048,groundCanvas=document.createElement('canvas');groundCanvas.width=groundCanvas.height=size;const ctx=groundCanvas.getContext('2d');ctx.fillStyle=palette.grass;ctx.fillRect(0,0,size,size);
  for(let i=0;i<110;i++){const x=r()*size,y=r()*size;ctx.fillStyle=i%2?'#edf0d519':'#90aa8220';ctx.beginPath();ctx.ellipse(x,y,25+r()*135,12+r()*75,r()*Math.PI,0,Math.PI*2);ctx.fill();}
  for(let i=0;i<30000;i++){ctx.strokeStyle=i%3===0?'#b9c49d':i%3===1?'#d5d9b8':'#c0c99f';ctx.lineWidth=.6+r()*1.4;const x=r()*size,y=r()*size;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2+r()*5,y-2-r()*6);ctx.stroke();}
  const gt=new THREE.CanvasTexture(groundCanvas);gt.colorSpace=THREE.SRGBColorSpace;gt.wrapS=gt.wrapT=THREE.RepeatWrapping;gt.repeat.set(2,2);const gm=new THREE.Mesh(new THREE.PlaneGeometry(420,420),new THREE.MeshToonMaterial({map:gt,gradientMap:this.toonRamp}));gm.rotation.x=-Math.PI/2;gm.position.y=.06;gm.receiveShadow=true;this.scene.add(gm);this.landscape={ground:gm};
  this.buildDistantLandscape();
  const path=(x,z,w,d)=>this.box(x,.07,z,w,.025,d,'#e0d8bd',this.scene,false,0,'stone');
  const courtyard=getRoom('courtyard'),garden=getRoom('garden'),gate=getRoom('gate');
  path(0,7,2.8,22);path(-9,2,2,12);path(9,2,2,12);path(0,8,20,2);path(0,14.5,16,1.5);path(0,-4,22,2);path(-9,-7.5,2,9);path(9,-7.5,2,9);path(-13,-11,10,2);path(13,-11,10,2);path(13,9,10,2);path(16,10,2,4);
  this.box(courtyard.x,.1,courtyard.z,courtyard.w,.045,courtyard.d,'#ddd4b8',this.scene,false);
  for(let x=courtyard.x-courtyard.w/2+1;x<courtyard.x+courtyard.w/2;x+=2)for(let z=courtyard.z-courtyard.d/2+.5;z<courtyard.z+courtyard.d/2;z+=1)this.box(x,.15,z,1.92,.015,.92,(x+z)%4?'#e5ddc8':'#ded6bf',this.scene,false);
  // The exterior remains scenery, bounded independently of the old town.
  for(let i=0;i<76;i++){let x=(r()-.5)*58,z=(r()-.5)*50;if(Math.abs(x)<25&&Math.abs(z)<21){i--;continue;}const h=2.8+r()*3;this.box(x,.1,z,.25,h,.25,'#8e856c',this.scene,false);const g=new THREE.Mesh(new THREE.ConeGeometry(1.3+r()*.8,h,7),this.mat(i%2?'#a1b394':'#91a58e'));g.position.set(x,h/2+1,z);g.castShadow=true;this.scene.add(g);}
  for(let i=0;i<40;i++){const x=(i%2?-1:1)*(garden.w/2-2+r()),z=garden.z-garden.d/2+.7+r()*(garden.d-1.4);this.ball(x,.25,z,.4,palette.sage);this.ball(x,.65,z,.13,i%2?'#d7b6a3':'#e6c986');}
  this.box(-4,.1,garden.z,1.5,.7,1.5,'#9aab9e',this.scene,true,0,'stone');const water=new THREE.Mesh(new THREE.CircleGeometry(.65,24),this.mat('#a9c6c8'));water.rotation.x=-Math.PI/2;water.position.set(-4,.82,garden.z);this.scene.add(water);

  for(const x of [-2.3,2.3])this.box(x,.1,gate.z,.35,3,.35,'#8f8b78');this.box(0,2.8,gate.z,5.7,.35,.55,'#7c8e7b');
 }
 buildDistantLandscape(){
  const stream=buildRiver(this.scene,{enhanced:this.scenery,surfaceMaterial:this.surfaceMaterial}),centerline=stream.centerline;this.landscape.stream=stream;this.landscape.river=stream.water;
  const random=grain(6492),trees=[],riverPoints=centerline.filter((_,i)=>i%4===0);
  for(let attempts=0;trees.length<165&&attempts<3500;attempts++){
   const x=(random()-.5)*140,z=(random()-.5)*126;
   if(Math.abs(x)<29&&Math.abs(z)<25)continue;
   if(riverPoints.some(p=>Math.hypot(p.x-x,p.z-z)<7))continue;
   trees.push({x,z,height:2.2+random()*3.3,broad:random()<.34,turn:random()*Math.PI*2});
  }
  const trunkGeometry=new THREE.CylinderGeometry(.13,.18,1,6),coneGeometry=new THREE.ConeGeometry(1,1,7),broadGeometry=new THREE.IcosahedronGeometry(1,0),dummy=new THREE.Object3D();
  const trunks=new THREE.InstancedMesh(trunkGeometry,this.mat('#9c9279'),trees.length);
  const conifers=new THREE.InstancedMesh(coneGeometry,this.mat('#a5b798'),trees.filter(tree=>!tree.broad).length);
  const broadleaf=new THREE.InstancedMesh(broadGeometry,this.mat('#b2c09e'),trees.filter(tree=>tree.broad).length);
  let coneIndex=0,broadIndex=0;
  for(let i=0;i<trees.length;i++){
   const tree=trees[i],stem=.65+tree.height*.14;
   dummy.position.set(tree.x,stem/2+.08,tree.z);dummy.rotation.y=tree.turn;dummy.scale.set(.75,stem,.75);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
   if(tree.broad){dummy.position.y=stem+tree.height*.38;dummy.scale.set(1.2+tree.height*.16,tree.height*.42,1.2+tree.height*.16);dummy.updateMatrix();broadleaf.setMatrixAt(broadIndex++,dummy.matrix);}
   else{dummy.position.y=stem+tree.height*.43;dummy.scale.set(.8+tree.height*.14,tree.height,.8+tree.height*.14);dummy.updateMatrix();conifers.setMatrixAt(coneIndex++,dummy.matrix);}
  }
  for(const mesh of [trunks,conifers,broadleaf]){mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;this.scene.add(mesh);}
  this.landscape.trees=trees;this.landscape.treeMeshes=[trunks,conifers,broadleaf];
 }
 wall(parent,axis,fixed,start,end,door,color){
  const segments=parent.userData.wallSegments??=[];
  const add=(a,b,y,h)=>{if(b>a)segments.push({x:axis==='x'?(a+b)/2:fixed,z:axis==='x'?fixed:(a+b)/2,w:axis==='x'?b-a:.2,d:axis==='x'?.2:b-a,y,h,color});};
  if(door!==null){add(start,door-.7,.15,2.7);add(door+.7,end,.15,2.7);add(door-.7,door+.7,2.4,.45);}
  else add(start,end,.15,2.7);
 }
 buildArchitecture(){
  for(const b of buildings){const root=new THREE.Group();this.scene.add(root);this.roundBox(b.x,.1,b.z,b.w,.12,b.d,'#b9a68a',root,.13,'stone');this.box(b.x,.23,b.z,b.w-.3,.025,b.d-.3,'#e0cfab',root,false,0,'wood');for(let z=b.z-b.d/2+.7;z<b.z+b.d/2;z+=.85)this.box(b.x,.255,z,b.w-.4,.006,.018,'#c5b795',root,false);
   const walls=new THREE.Group();root.add(walls);const left=b.x-b.w/2,right=b.x+b.w/2,north=b.z-b.d/2,south=b.z+b.d/2;
   this.wall(walls,'x',north,left,right,null,b.color);this.wall(walls,'x',south,left,right,['west','east'].includes(b.id)?null:b.id==='old'?14:b.x,b.color);this.wall(walls,'z',left,north,south,['east','hall'].includes(b.id)?-4:null,b.color);this.wall(walls,'z',right,north,south,['west','hall'].includes(b.id)?-4:null,b.color);
   if(['west','east'].includes(b.id)){for(const z of [-5,-3]){this.wall(walls,'x',z,left,b.x,b.x-3,b.color);this.wall(walls,'x',z,b.x,right,b.x+3,b.color);}for(const [a,c]of [[north,-5],[-3,south]])this.wall(walls,'z',b.x,a,c,null,b.color);}
   if(b.id==='old')this.wall(walls,'z',16,north,south,11.5,b.color);
   this.wallObstacles.push(...buildSoftWalls(this,walls));this.shells.set(b.id,{root,walls});
  }
  for(const r of destinations){const g=new THREE.Group();this.scene.add(g);this.interiors.set(r.id,g);
   const floor=new THREE.Mesh(new THREE.PlaneGeometry(r.w-.2,r.d-.2),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));floor.rotation.x=-Math.PI/2;floor.position.set(r.x,.27,r.z);floor.userData.pick={type:'room',id:r.id};g.add(floor);this.clickable.push(floor);
   if(r.owner)buildGuestRoom(this,r,g);
  }
  const hall=this.interiors.get('hall');this.table(0,-11,5.2,2.3,hall);for(const x of [-1.7,0,1.7]){this.box(x,1.12,-11,.32,.1,.32,palette.cream,hall);}this.table(-5.4,-14,2,1,hall);this.table(5.4,-14,2,1,hall);this.roundBox(-6,.3,-7,2,.7,1.1,'#a4b5a0',hall,.23,'cloth');this.roundBox(-6,1,-7.4,2,.6,.25,'#a4b5a0',hall,.12,'cloth');this.roundBox(6,.3,-7,1.6,1.8,.5,palette.wood,hall,.085,'wood');for(let j=0;j<3;j++)for(let i=0;i<6;i++)this.box(5.4+i*.22,.6+j*.46,-6.7,.16,.32,.23,['#a4b5a0','#c9b18e','#b5c6c8'][i%3],hall,false);
  for(const seat of hallSeats)this.chair(seat.x,seat.z,seat.angle,hall,seat.id);
  for(const x of [-5,5]){this.table(x,-4.7,1.5,.7,hall);this.box(x,.29,-1.2,3,.025,2.8,'#c3cbb1',hall,false,0,'cloth');}
  // Low screens mark private corners without sealing them into extra rooms.
  for(const x of [-2.5,2.5])this.box(x,.28,-3.3,.14,1.15,2.2,'#b2bca1',hall,true,0,'cloth');
  this.roundBox(0,.3,-15.6,2.5,1.1,.8,'#b6ab97',hall,.11,'stone');this.box(0,.48,-15.1,1.25,.65,.06,'#6d6a5c',hall);this.ball(0,.72,-15,.25,'#d9b876',hall,[1,.8,.25]);
  this.hallLife=buildHallLife(this,hall);
  const kitchen=this.interiors.get('kitchen');this.roundBox(-18,.3,-16.8,3.5,.8,.8,palette.wood,kitchen,.12,'wood');this.roundBox(-19,.3,-13.5,1.2,1,1.2,'#b4bbaf',kitchen,.14,'stone');this.table(-16.5,-14,1.8,1.2,kitchen);
  const shrine=this.interiors.get('shrine');this.roundBox(16,.3,-16.9,6,.65,1,palette.wood,shrine,.10,'wood');this.box(16,.3,-14,3,.035,2,'#b7c6b5',shrine,false,0,'cloth');
  for(const id of ['old','archive','storage']){const g=this.interiors.get(id),r=getRoom(id);this.table(r.x+(id==='old'?-.4:id==='archive'?.4:0),r.z,Math.min(2,r.w-1),1,g);}
  for(const r of destinations){const a=placeAnchor(r),label=this.label(placeName(r),new THREE.Vector3(a.x,a.y,a.z),'room-label',{type:'room',id:r.id});label.el.dataset.destination=r.id;label.el.setAttribute('aria-label','前往'+placeName(r));this.placeLabels.set(r.id,label);}
 }
 table(x,z,w,d,g,color=palette.wood){this.roundBox(x,1,z,w,.12,d,color,g,.11,'wood');for(const dx of [-w/2+.15,w/2-.15])for(const dz of [-d/2+.15,d/2-.15])this.box(x+dx,.28,z+dz,.12,.72,.12,'#9f8d73',g,false,0,'wood');}
 chair(x,z,a,g,seatId=null,color='#c3b290'){const group=new THREE.Group();group.userData.seatId=seatId;group.position.set(x,0,z);group.rotation.y=a;g.add(group);this.roundBox(0,.65,0,.7,.12,.7,color,group,.10,'wood');this.roundBox(0,.65,-.3,.7,.7,.1,color,group,.045,'wood');for(const dx of [-.25,.25])for(const dz of [-.25,.25])this.box(dx,.28,dz,.09,.37,.09,'#ab997b',group,false,0,'wood');}
 buildNavigation(){
  this.scene.updateMatrixWorld(true);
  const obstacles=[...this.wallObstacles,...this.obstacleMeshes.map(mesh=>{const b=new THREE.Box3().setFromObject(mesh);let parent=mesh,id;while(parent){if(parent.userData.seatId){id=parent.userData.seatId;break;}parent=parent.parent;}return {id,minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z};})];
  for(const {bounds:b}of this.props.values())if(b.min.y<.6&&b.max.y>.55&&b.max.y-b.min.y>.25)obstacles.push({minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z});
  this.navigation=new NavigationWorld(obstacles);this.host.dataset.navigation='furniture-walls';
 }
 buildPeople(){for(const a of cast){
  const rig=createCharacter(this,a.id),g=rig.root;g.userData.pick={type:'person',id:a.id};this.scene.add(g);this.clickable.push(g);
  const pos=this.navigation.nearest({x:a.seat[0],z:a.seat[1]},this.actorObstacles());g.position.set(pos.x,0,pos.z);g.rotation.y=.35;
  const label=this.label(a.name,new THREE.Vector3(),'person-label '+(a.id===playerId(this.current)?'you':''),{type:'person',id:a.id});
  this.actors.set(a.id,{g,rig,label,name:a.name,base:a.seat,path:[],speed:0,gesture:'idle',blocked:0});
 }}
 // Seated bodies fit the 0.7m chair; the chair itself remains a static obstacle.
 actorObstacles(except){return [...this.actors.entries()].filter(([id,a])=>id!==except&&a.g.visible).map(([id,a])=>({id,x:a.g.position.x,z:a.g.position.z,radius:a.seat?.35:actorRadius}));}
 roomArea(id){const r=getRoom(id);return {minX:r.x-r.w/2+.55,maxX:r.x+r.w/2-.55,minZ:r.z-r.d/2+.55,maxZ:r.z+r.d/2-.55};}
 moving(actor){return !!(actor.path.length||actor.dock||actor.plan||actor.targetSeat);}
 sitActor(id,seatId,instant=false,kind='social'){
  const actor=this.actors.get(id),seat=hallSeats.find(s=>s.id===seatId);if(!seat||[...this.actors.values()].some(a=>a!==actor&&a.g.visible&&(a.seat?.id===seatId||a.targetSeat?.id===seatId)))return false;
  if(actor.seat?.id===seatId)return true;
  if(instant){actor.g.position.set(seat.x,0,seat.z);actor.g.rotation.y=seat.angle;actor.seat=seat;actor.rig.sit=1;actor.rig.sitTarget=1;actor.path=[];actor.dock=null;actor.plan=null;return true;}
  this.setActorPath(id,seat.approach,'hall',kind);actor.targetSeat=seat;return true;
 }
 setActorPath(id,target,room=null,kind='walk'){
  const actor=this.actors.get(id);actor.targetSeat=null;actor.pathKind=kind;actor.destination={x:target.x,z:target.z};actor.area=room?this.roomArea(room):null;actor.blocked=0;
  if(actor.seat||actor.dock?.mode==='rise'){
   if(actor.seat){actor.dock={mode:'rise',seat:actor.seat,progress:0};actor.seat=null;}
   actor.plan={target:{...actor.destination},room,kind};actor.path=[];return true;
  }
  if(actor.dock){actor.dock=null;actor.rig.sitTarget=0;}
  actor.path=this.navigation.path(actor.g.position,actor.destination,this.actorObstacles(id),actor.area);
  return actor.path.length>0;
 }
 dockActor(id,actor,dt){
  const dock=actor.dock,seat=dock.seat,rising=dock.mode==='rise',progress=Math.min(1,dock.progress+dt/1.25),blend=progress*progress*(3-2*progress);
  const a=rising?seat:seat.approach,b=rising?seat.approach:seat,next={x:a.x+(b.x-a.x)*blend,z:a.z+(b.z-a.z)*blend};
  if(!this.navigation.clear(actor.g.position,next,this.actorObstacles(id),seat.id))return;
  dock.progress=progress;actor.g.position.set(next.x,0,next.z);actor.rig.sitTarget=rising?1-blend:blend;
  const delta=Math.atan2(Math.sin(seat.angle-actor.g.rotation.y),Math.cos(seat.angle-actor.g.rotation.y));actor.g.rotation.y+=delta*(1-Math.exp(-dt*10));
  if(progress===1){actor.dock=null;if(rising){const plan=actor.plan;actor.plan=null;actor.path=this.navigation.path(actor.g.position,plan.target,this.actorObstacles(id),actor.area);}else{actor.seat=seat;actor.targetSeat=null;actor.rig.sitTarget=1;}}
 }
 faceActor(actor,target,dt){const dx=target.x-actor.g.position.x,dz=target.z-actor.g.position.z;if(Math.hypot(dx,dz)<.01)return;const goal=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(goal-actor.g.rotation.y),Math.cos(goal-actor.g.rotation.y));if(actor.seat){actor.rig.gazeYaw=THREE.MathUtils.clamp(delta,-.85,.85);return;}actor.rig.gazeYaw=0;actor.g.rotation.y+=delta*(1-Math.exp(-dt*8));}
 moveActor(id,actor,dt){
  const paused=id!==playerId(this.current)&&this.social.paused&&actor.pathKind!=='travel',target=actor.path[0];let travelled=0;
  if(actor.dock&&(!paused||actor.pathKind==='conversation'||actor.pathKind==='travel'))this.dockActor(id,actor,dt);
  else if(!target&&actor.targetSeat&&(!paused||actor.pathKind==='conversation'||actor.pathKind==='travel')){const approach=actor.targetSeat.approach;if(Math.hypot(actor.g.position.x-approach.x,actor.g.position.z-approach.z)>.04){if(this.navigation.free(approach,this.actorObstacles(id)))actor.path=this.navigation.path(actor.g.position,approach,this.actorObstacles(id),actor.area);}else actor.dock={mode:'sit',seat:actor.targetSeat,progress:0};}
  else if(target&&(!paused||actor.pathKind==='conversation')){
   const p=actor.g.position,distance=Math.hypot(target.x-p.x,target.z-p.z),last=actor.path.length===1;
   this.faceActor(actor,target,dt);
   const desired=actor.rig.look.speed*walkSpeedMultiplier*(last?Math.min(1,Math.max(.2,distance/.45)):1);actor.speed=THREE.MathUtils.damp(actor.speed,desired,5,dt);
   const step=Math.min(distance,actor.speed*dt),next={x:p.x+(target.x-p.x)/Math.max(distance,.001)*step,z:p.z+(target.z-p.z)/Math.max(distance,.001)*step};
   if(this.navigation.clear(p,next,this.actorObstacles(id))){p.x=next.x;p.z=next.z;travelled=step;actor.blocked=0;if(distance-step<.01)actor.path.shift();}
   else{actor.speed=0;actor.blocked+=dt;if(actor.blocked>.8){const path=this.navigation.path(p,actor.destination,this.actorObstacles(id),actor.area);if(path.length)actor.path=path;actor.blocked=0;}}
  }else actor.speed=THREE.MathUtils.damp(actor.speed,0,12,dt);
  if(this.conversation&&[playerId(this.current),this.conversation].includes(id)&&!travelled){const other=this.actors.get(id===playerId(this.current)?this.conversation:playerId(this.current));if(other)this.faceActor(actor,other.g.position,dt);}
  if(!actor.seat&&!actor.dock)actor.rig.sitTarget=0;animateCharacter(actor.rig,dt,travelled/dt,this.conversation===id?(actor.rig.voiceSpeaking||actor.rig.speakingUntil>actor.rig.time?'talk':'listen'):actor.gesture);
 }
 buildEvidence(){
  for(const [id,spec]of Object.entries(propLayout)){const room=getRoom(spec.room),placement=placeRoomEvidence(room,spec,id),g=makeEvidenceProp(this,placement?{...spec,color:placement.color}:spec);
   if(placement){g.position.set(placement.x,placement.y,placement.z);g.rotation.y=placement.angle;g.scale.x=placement.mirror;g.userData.carrier=placement.carrier;}
   else{const offsetX=spec.y===1.14&&room.id==='old'?-.4:spec.y===1.14&&room.id==='archive'?.4:0;g.position.set(room.x+spec.x+offsetX,spec.y,room.z+spec.z);}
   g.userData.pick={type:'spot',id};this.scene.add(g);
   const button=document.createElement('button');button.className='prop-hit';button.dataset.prop=id;button.hidden=true;button.type='button';button.innerHTML='<span class="prop-caption"></span>';button.onclick=e=>{e.stopPropagation();this.onPick({type:'spot',id});};button.onpointerenter=button.onfocus=()=>{this.hoverProp=id;this.refreshOutline();};button.onpointerleave=button.onblur=()=>{this.hoverProp=null;this.refreshOutline();};this.labels.append(button);
   this.props.set(id,{g,button,room:spec.room,bounds:new THREE.Box3().setFromObject(g),active:false,found:false});
  }
 }
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.composer?.setSize(w,h);this.distantPass?.uniforms.resolution.value.copy(this.renderer.getDrawingBufferSize(new THREE.Vector2()));this.camera.left=-18*w/h;this.camera.right=18*w/h;this.camera.top=18;this.camera.bottom=-18;this.camera.updateProjectionMatrix();if(this.current&&!this.conversationCamera?.saved)this.focus(this.current.room,this.overview);}
 focus(id,overview=false){
  const r=getRoom(id)||getRoom('hall');this.overview=overview;const w=this.host.clientWidth,h=this.host.clientHeight,mobile=w<600;
  this.camera.updateMatrixWorld();const right=new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(this.camera.quaternion);
  const top=mobile?205:h<540?90:125,bottom=75,availableH=Math.max(h*.45,h-top-bottom);
  const fit=(rw,rd)=>{const spanX=Math.abs(right.x)*rw+Math.abs(right.z)*rd,spanY=Math.abs(up.x)*rw+Math.abs(up.z)*rd+Math.abs(up.y)*3.4;return Math.min(5.2,(36*w/h*(mobile?.88:.78))/spanX,36*(availableH/h)/spanY);};
  this.controls.minZoom=fit(bounds.maxX-bounds.minX+4,bounds.maxZ-bounds.minZ+4);
  this.targetZoom=overview?this.controls.minZoom:fit(r.w+1.3,r.d+1.3);
  if(!overview&&r.building&&r.id!=='hall')this.targetZoom=Math.min(5.2,this.targetZoom*(mobile?1.45:1.15));
  this.targetZoom=Math.max(this.controls.minZoom,this.targetZoom);this.camera.zoom=Math.max(this.controls.minZoom,this.camera.zoom);this.camera.updateProjectionMatrix();this.distantPass.enabled=this.comic||overview;
  this.focusTarget=new THREE.Vector3(overview?0:r.x,1.15,overview?0:r.z).addScaledVector(up,overview?0:(top-bottom)/2/h*36/this.targetZoom);
  this.host.dataset.view=overview?'overview':'room';this.host.dataset.room=id;this.refreshLabels();this.refreshOutline();
 }
 showEntryReaction(reaction){
  const actor=this.actors.get(reaction.actor);if(!actor||this.entryReactionsSeen.has(reaction.id))return;
  this.entryReactionsSeen.add(reaction.id);this.entrySpeech={...reaction,remaining:6,hold:2.4,started:false};
  this.entryBubble.el.textContent=actor.name+'：'+reaction.text;this.entryBubble.el.hidden=false;this.entryBubble.el.dataset.actor=reaction.actor;this.entrySpeech.started=placeSpeechBubble(this,this.entryBubble,actor);
  this.social.cancel();actor.rig.mood='stern';actor.rig.speakingUntil=actor.rig.time+5;
  if(this.travelRoom)this.focusTarget=null;
 }
 clearEntryReaction(){this.entrySpeech=null;this.entryBubble.el.hidden=true;}
 drawEntryReaction(dt){
  const speech=this.entrySpeech;if(!speech)return;
  const actor=this.actors.get(speech.actor);
  if(!actor?.g.visible){this.clearEntryReaction();this.onTravelComplete?.(this.current.room);return;}
  if(placeSpeechBubble(this,this.entryBubble,actor))speech.started=true;
  if(!speech.started)return;
  speech.hold-=dt;speech.remaining-=dt;
  if(speech.remaining<=0){this.clearEntryReaction();this.onTravelComplete?.(this.current.room);}
 }
 setConversation(id){
  if(this.conversation===id)return;
  const previous=this.actors.get(this.conversation)?.rig;if(previous){previous.inConversation=false;previous.voiceSpeaking=false;previous.voiceLevel=null;previous.speakingUntil=0;previous.thinking=false;previous.mood='neutral';previous.performancePaused=false;}
  this.conversation=id;const rig=this.actors.get(id)?.rig;if(rig){rig.inConversation=true;rig.lastSpokenText=null;rig.performancePaused=false;}
  this.conversationCamera.setActor(id);
 }
 setDialoguePerformance({text='',thinking=false,voiceSpeaking=false,voiceLevel=null,questioning=false,paused=false}={}){
  const rig=this.actors.get(this.conversation)?.rig;if(!rig)return;
  const voiceEnded=rig.voiceSpeaking&&!voiceSpeaking;
  rig.thinking=thinking&&!paused;rig.voiceSpeaking=voiceSpeaking&&!paused;rig.voiceLevel=voiceLevel;rig.performancePaused=paused;rig.mood=dialogueMood(text,questioning);
  if(text&&text!==rig.lastSpokenText){rig.lastSpokenText=text;const words=text.replace(/（[^）]*(?:）|$)|\([^)]*(?:\)|$)/g,'').trim();rig.speakingUntil=words?rig.time+Math.min(14,.8+words.length*.11):0;}
  if(paused||thinking||voiceEnded)rig.speakingUntil=0;
 }
 captureMap(){return captureSceneMap(this);}
 refreshLabels(){if(!this.current)return;for(const [id,label]of this.placeLabels){label.el.hidden=false;label.el.dataset.current=String(id===this.current.room);label.el.title=placeName(getRoom(id))+(this.current.rooms.find(r=>r.id===id)?.accessible?' · 点击前往':' · 先征求进房同意');}}
 syncWalls(){
  const p=this.actors.get(playerId(this.current)).g.position,inside=buildings.find(b=>Math.abs(p.x-b.x)<b.w/2&&Math.abs(p.z-b.z)<b.d/2)?.id||null;
  if(this.insideBuilding===inside)return;this.insideBuilding=inside;
  for(const [id,sh]of this.shells)if(sh.walls)sh.walls.traverse(o=>{if(o.isMesh||o.isLineSegments){if(!o.userData.ownMaterial){const base=o.material;o.material=base.clone();o.material.onBeforeCompile=base.onBeforeCompile;o.material.customProgramCacheKey=base.customProgramCacheKey;o.userData.ownMaterial=true;}o.material.transparent=id===inside||o.isLineSegments;o.material.opacity=id===inside?(o.isLineSegments?.14:.28):(o.isLineSegments?.55:1);o.material.depthWrite=id!==inside;}});
  this.host.dataset.wallOpacity=inside?'0.28':'1';this.host.dataset.insideBuilding=inside||'outside';
 }
 update(state,route=null){const switched=this.current?.slotToken!==state.slotToken;const previous=switched?null:this.current;if(switched){this.clearEntryReaction();this.entryReactionsSeen.clear();this.setConversation(null);this.conversationCamera.reset();this.social.cancel();this.travelRoom=null;for(const a of this.actors.values()){a.path=[];a.seat=null;a.targetSeat=null;a.dock=null;a.plan=null;}}this.current=state;this.host.dataset.playerId=playerId(state);for(const [id,a]of this.actors)a.label.el.classList.toggle('you',id===playerId(state));
  if(previous&&previous.room!==state.room){this.clearEntryReaction();this.setConversation(null);this.conversationCamera.reset();}
  if(previous&&(previous.room!==state.room||JSON.stringify(previous.chatSetting)!==JSON.stringify(state.chatSetting)))this.social.cancel();
  // Existing actors keep their actual position. A room change plans the whole
  // journey through real door gaps, rather than teleporting to the last leg.
  const arrivalTargets=[];
  for(const p of state.people){
   const a=this.actors.get(p.id),wasVisible=a.g.visible,visible=p.location===state.room;a.g.visible=visible;a.label.el.hidden=!visible;
   if(!visible){a.path=[];a.seat=null;a.dock=null;a.plan=null;a.targetSeat=null;a.rig.sitTarget=0;continue;}
   const r=getRoom(p.location),pos=p.location==='hall'?cast.find(c=>c.id===p.id).seat:[r.x+(p.portrait%2?.8:-.8),r.z+.6];
   const changed=!previous||previous.room!==state.room||previous.people.find(q=>q.id===p.id)?.location!==p.location;
   if(changed){
    if(!previous&&p.location==='hall'){this.sitActor(p.id,homeSeat(p.id).id,true);continue;}
    const destination=this.navigation.nearest({x:pos[0],z:pos[1]},[...this.actorObstacles(p.id),...arrivalTargets],this.roomArea(p.location));
    if(!destination)continue;
    arrivalTargets.push({...destination,id:p.id,radius:actorRadius});
    if(previous&&(p.id===playerId(this.current)||wasVisible)&&(a.seat||a.dock||this.navigation.free(a.g.position))){this.setActorPath(p.id,destination,p.location,'travel');if(p.id===playerId(this.current)&&previous.room!==state.room)this.travelRoom=state.room;}
    else{a.path=[];a.g.position.set(destination.x,0,destination.z);if(p.location==='hall')this.sitActor(p.id,homeSeat(p.id).id,true);}
    if(previous&&p.location==='hall')this.sitActor(p.id,homeSeat(p.id).id,false,'travel');
   }
  }
  if(state.room==='hall'&&JSON.stringify(previous?.chatSetting)!==JSON.stringify(state.chatSetting)){
   if(state.chatSetting?.scope==='private'){const seats=cornerSeats(state.chatSetting.zone);for(const [id,a]of this.actors)if(![playerId(this.current),state.chatSetting.actor].includes(id)&&[a.seat?.zone,a.targetSeat?.zone,a.dock?.seat.zone].includes(state.chatSetting.zone))this.sitActor(id,homeSeat(id).id,false,'conversation');this.sitActor(playerId(this.current),seats[0].id,false,'conversation');this.sitActor(state.chatSetting.actor,seats[1].id,false,'conversation');}
   else if(previous?.chatSetting){for(const id of [playerId(this.current),previous.chatSetting.actor])if(this.actors.get(id)?.g.visible)this.sitActor(id,homeSeat(id).id,false,'conversation');}
  }
  if(!previous||previous.room!==state.room)this.focus(state.room);
  this.contacts?.updateActors(this.actors);this.syncWalls();this.social.setState(state);this.setSpots(state);this.refreshLabels();this.sun.intensity=state.phase?(this.comic?.95:1.05):(this.comic?1.35:1.65);const haze=state.phase?'#c9caba':'#d6dcc8';this.scene.background.set(haze);this.scene.fog.color.set(haze);this.distantPass.uniforms.haze.value.set(haze);
 }
 setSpots(state){
  this.hoverProp=null;this.clickable=this.clickable.filter(g=>g.userData.pick?.type!=='spot');
  for(const [id,p]of this.props){const spot=state.spots.find(s=>s.id===id);p.active=!!spot;p.found=!!spot?.found;p.button.hidden=!p.active;if(spot){p.button.setAttribute('aria-label','查看'+spot.name);p.button.querySelector('span').textContent=spot.name+(spot.found?' · 已看过':'');p.button.dataset.found=String(spot.found);this.clickable.push(p.g);}}
  this.refreshOutline();
 }
 refreshOutline(){
  if(!this.outline)return;
  this.outline.selectedObjects=this.overview?[]:[...this.props.values()].filter(p=>p.active).map(p=>p.g);
 }
 walkInside(point){
  if(!this.current||this.conversation)return;const area=this.roomArea(this.current.room);
  if(point.x<area.minX||point.x>area.maxX||point.z<area.minZ||point.z>area.maxZ)return;
  // A tap on a table stops at its edge; an empty destination gets a clear path.
  this.setActorPath(playerId(this.current),point,this.current.room);
 }
 frame(t){requestAnimationFrame(this.frame);if(this.suspended||document.hidden||t-this.last<1000/40)return;const dt=Math.min((t-this.last)/1000,.05);this.last=t;this.landscape.stream.update(dt);
  const entryHold=this.entrySpeech?.started&&this.entrySpeech.hold>0&&this.entryBubble.inView;
  if(this.travelRoom&&!entryHold){const player=this.actors.get(playerId(this.current));if(this.moving(player)){
   const up=new THREE.Vector3(0,1,0).applyQuaternion(this.camera.quaternion),h=this.host.clientHeight,top=this.host.clientWidth<600?205:h<540?90:125;
   this.targetZoom=Math.min(this.targetZoom,1.6);this.focusTarget=player.g.position.clone().add(new THREE.Vector3(0,1.15,0)).addScaledVector(up,(top-75)/2/h*36/this.targetZoom);
  }else{const room=this.travelRoom;this.travelRoom=null;this.focus(room);this.onTravelComplete?.(room);}}
  if(this.focusTarget&&!this.conversationCamera.saved){const delta=this.focusTarget.clone().sub(this.controls.target).multiplyScalar(.12);this.controls.target.add(delta);this.camera.position.add(delta);this.camera.zoom+=(this.targetZoom-this.camera.zoom)*.13;this.camera.updateProjectionMatrix();if(delta.length()<.002&&Math.abs(this.camera.zoom-this.targetZoom)<.005)this.focusTarget=null;}
  this.social.tick(dt);for(const [id,actor]of this.actors)if(actor.g.visible){if(entryHold)animateCharacter(actor.rig,dt,0,id===this.entrySpeech.actor?'talk':'idle');else this.moveActor(id,actor,dt);}this.contacts?.updateActors(this.actors);this.syncWalls();const cinematic=this.conversationCamera.tick(dt);if(!cinematic)this.controls.update();this.camera.zoom=Math.max(this.controls.minZoom,this.camera.zoom);const target=this.controls.target,clampedX=cinematic?target.x:THREE.MathUtils.clamp(target.x,bounds.minX,bounds.maxX),clampedZ=cinematic?target.z:THREE.MathUtils.clamp(target.z,bounds.minZ,bounds.maxZ);this.camera.position.x+=clampedX-target.x;this.camera.position.z+=clampedZ-target.z;target.x=clampedX;target.z=clampedZ;this.camera.updateProjectionMatrix();this.composer.render();this.host.dataset.zoom=this.camera.zoom.toFixed(3);const w=this.host.clientWidth,h=this.host.clientHeight;
  const project=(label,above=false)=>{if(label.el.hidden)return;const p=label.world.clone().project(this.camera);label.el.style.transform=`translate(${(p.x+1)*w/2}px,${(-p.y+1)*h/2}px) translate(-50%,${above?'-100%':'-50%'})${above?' translateY(-4px)':''}`;label.el.style.visibility=p.z<1&&p.x>-1.1&&p.x<1.1&&p.y>-1.1&&p.y<1.1?'visible':'hidden';};
  placeSpeechBubble(this,this.social.bubble,this.actors.get(this.social.bubble.actor));this.drawEntryReaction(dt);
  for(const a of this.actors.values()){a.label.world.copy(a.g.position).add(new THREE.Vector3(0,2.65-(a.rig.sit||0)*.3,0));project(a.label,true);if(this.social.bubble.inView&&this.social.bubble.actor===a.rig.id||this.entrySpeech&&this.entryBubble.inView&&this.entrySpeech.actor===a.rig.id)a.label.el.style.visibility='hidden';}for(const label of this.placeLabels.values())project(label);for(const p of this.props.values()){p.button.hidden=!p.active||this.overview;if(p.button.hidden)continue;const min=new THREE.Vector2(Infinity,Infinity),max=new THREE.Vector2(-Infinity,-Infinity);for(const x of [p.bounds.min.x,p.bounds.max.x])for(const y of [p.bounds.min.y,p.bounds.max.y])for(const z of [p.bounds.min.z,p.bounds.max.z]){const q=new THREE.Vector3(x,y,z).project(this.camera);const sx=(q.x+1)*w/2,sy=(-q.y+1)*h/2;min.x=Math.min(min.x,sx);min.y=Math.min(min.y,sy);max.x=Math.max(max.x,sx);max.y=Math.max(max.y,sy);}const bw=Math.max(40,max.x-min.x+6),bh=Math.max(40,max.y-min.y+6);p.button.style.width=bw+'px';p.button.style.height=bh+'px';p.button.style.transform=`translate(${(min.x+max.x)/2}px,${(min.y+max.y)/2}px) translate(-50%,-50%)`;p.button.style.visibility=max.x>0&&min.x<w&&max.y>0&&min.y<h?'visible':'hidden';}
 }
}
