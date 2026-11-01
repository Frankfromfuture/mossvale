import * as THREE from 'three';
import {wallSegments,sceneBounds} from '../shared/suspect7/spatial.mjs';
import {people} from '../shared/suspect7/cast.mjs';

// Case content only. Rendering, camera, navigation and actor control belong to TownScene.
class VillaDressing{
 constructor(scene,parent){this.town=scene;this.world=parent;}
 red(color){return this.town.definition?.redAsGrey?'#85847b':color;}
 mat(c,k='wood'){return this.town.mat(c,k);}
 box(x,y,z,w,h,d,c,parent=this.world,kind='wood',obstacle=false){return this.town.roundBox(x,y,z,w,h,d,c,parent,Math.min(.08,w/4,h/4,d/4),kind);}
 sphere(parent,x,y,z,rx,ry,rz,c){return this.town.ball(x,y,z,1,c,parent,[rx,ry,rz]);}
 cylinder(parent,x,y,z,r,h,c){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),this.mat(c));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
 decorate(r){const x=r.x,z=r.z,d=r.decor;
  if(d==='sofa'){this.box(x,.35,z,3,.45,1.2,'#919f8b',this.world,'cloth',true);this.box(x,.65,z-.5,3,.7,.22,'#89957f');this.box(x,.4,z+1.5,1.5,.12,.8,'#ae987c',this.world,'wood',true);}
  if(d==='bed'){this.box(x,.2,z,2,.45,3,'#948a71',this.world,'wood',true);this.box(x,.65,z,1.9,.15,2.9,'#d9d7bf',this.world,'cloth');this.box(x,.8,z-1,1.5,.17,.6,'#e9e3ce',this.world,'cloth');}
  if(d==='chapel'){this.box(x,.28,z,2.6,.025,r.d-1,this.red('#953f3b'),this.world,'cloth');for(const dx of [-2,2])for(const dz of [-1,1]){this.box(x+dx,.45,z+dz,1.25,.15,.55,'#a38c6a',this.world,'wood',true);this.box(x+dx,.5,z+dz-.23,1.25,.65,.12,'#8e7e63');}this.box(x,1.3,z-r.d/2+.15,.15,1.3,.15,'#766b54');this.box(x,2.05,z-r.d/2+.15,.8,.13,.15,'#766b54');}
  if(d==='pool'){this.box(x,.12,z,4,.2,4,'#a6b5ad',this.world,'stone',true);this.box(x,.33,z,3.6,.02,3.6,'#8caaa6');for(const dx of [-2,2])this.box(x+dx,.12,z,.17,.3,4,'#c1c7b3',this.world,'stone');}
  if(d==='study'||d==='shelves'){for(let i=0;i<3;i++){this.box(x,r.d>5?.3+i*.7:.3+i*.6,z-r.d/2+.4,r.w-1,.1,.7,'#95856d');for(let j=0;j<8;j++)this.box(x+(j-3.5)*(r.w-1)/9,.4+i*.6,z-r.d/2+.4,.2,.4,.4,['#8f9d8e','#a49a7d','#b0b5a1'][j%3]);}}
  if(d==='attic'){const cabinet=this.box(x,.15,z,2,.5,1.2,'#968870',this.world,'wood',true);cabinet.rotation.z=.14;}
  if(d==='control'){this.box(x,.7,z,2.6,.12,1.1,'#8e8c78',this.world,'wood',true);this.box(x,1,z-.25,1.5,.9,.12,'#4e625d');}
  if(d==='kitchen'){this.box(x,.1,z-r.d/2+.7,r.w-1,.85,.8,'#a8ae9b',this.world,'stone',true);}
  if(d==='unused-toys'){const ball=this.sphere(this.world,x,.8,z,.75,.75,.75,'#b1b9a3');ball.material=ball.material.clone();ball.material.transparent=true;ball.material.opacity=.65;}
  if(d==='foyer'){this.box(x,.04,z+.95,2,.04,.1,'#8b8d76');}
  if(d==='corridor'){for(let t=z-r.d/2+3;t<z+r.d/2;t+=7){if((this.town.definition.doors||[]).some(p=>Math.hypot(p.x-(x-r.w/2+.25),p.z-t)<2.4))continue;this.box(x-r.w/2+.25,.4,t,.2,.1,1.2,'#b0b69e');}}
  if(d==='garage'){this.box(x,.3,z,2,.6,3.3,'#9caa9c',this.world,'stone',true);this.box(x,.9,z-.3,1.8,.7,1.7,'#bac5b4');}
  if(d==='bed'){this.box(x-3.4,.72,z+2,1.8,.12,1,'#ad997b',this.world,'wood',true);this.box(x-3.4,.85,z+1.8,.8,.55,.09,'#596b61');this.box(x-2,0,z-3.4,2,1.8,.8,'#b6a58a',this.world,'wood',true);}
  if(r.id==='lounge'){this.box(x,.11,z,7,.02,5,'#c3cbb1',this.world,'cloth');this.box(x+4.8,.2,z-5,2.5,.55,.7,'#aa987a',this.world,'wood',true);this.box(x+4.8,.8,z-5,2.4,1.3,.12,'#4e6056');for(const dx of [-4.8,4.8]){this.box(x+dx,.35,z+4,1.2,.45,1.2,'#9aa78d',this.world,'cloth',true);this.box(x+dx,.7,z+3.5,1.2,.55,.2,'#89997f');}}
  if(r.id==='dining'){for(const t of [-.8,0,.8])this.cylinder(this.world,x-5,1.16,z-2+t,.18,.08,'#eee8d5');}
  if(['table','sofa','bed','study'].includes(d)){this.cylinder(this.world,x+r.w/2-1,.35,z+r.d/2-1,.3,.6,'#b4a78a');this.sphere(this.world,x+r.w/2-1,.85,z+r.d/2-1,.45,.55,.4,'#92a181');}
  if(d==='washroom'){this.box(x,.5,z,1,.15,.7,'#d7dbcc');this.cylinder(this.world,x,.6,z,.3,.08,'#f0e9d6');}
 }

 prop(g,kind,onTable=false){const b=(x,y,z,w,h,d,c)=>this.box(x,y,z,w,h,d,c,g),s=(x,y,z,rx,ry,rz,c)=>this.sphere(g,x,y,z,rx,ry,rz,c),c=(x,y,z,r,h,color)=>this.cylinder(g,x,y,z,r,h,color);
  if(kind==='door'){b(0,0,0,.8,1.8,.12,'#8a917b');b(.27,.9,.09,.08,.1,.07,'#d2bc86');return;}
  if(kind==='shroud'){s(0,.4,0,.4,.15,.85,'#d6d8c4');return;}
  if(kind==='rug'){b(0,.28,0,.8,.035,1.2,this.red('#9b4841'));return;}
  if(kind==='cane'){c(0,.7,0,.028,1.4,'#4d4a40');s(.04,1.42,0,.15,.04,.05,'#b6b294');return;}
  if(kind==='ball'){s(0,.55,0,.5,.5,.5,'#abb7aa');c(0,.6,.4,.2,.15,'#e0dcc7');return;}
  if(!onTable){b(0,.65,0,.85,.1,.6,'#9d9076');for(const x of [-.3,.3])b(x,0,0,.06,.65,.4,'#817b68');}else g.position.y=.4;
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
  else if(kind==='lighter'){b(0,.76,0,.12,.25,.06,this.red('#a34138'));b(0,1.01,0,.12,.04,.06,'#b0b7a3');}
  else if(kind==='key'){b(0,.8,0,.28,.02,.04,'#b4a674');c(-.15,.82,0,.06,.02,'#b4a674');}
  else if(kind==='tape'){c(0,.84,0,.13,.12,'#b4a778');b(.15,.8,0,.3,.02,.06,'#d3c991');}
  else if(kind==='dial'){c(0,.92,0,.17,.14,'#808e7f');}
  else{b(0,.78,0,.5,.025,.4,'#eae2c9');for(let i=0;i<4;i++)b(0,.807,(i-1.5)*.06,.32,.002,.009,'#a8ab96');}
 }}

function random(seed){return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
const seat=(id,x,z,angle,zone,owner=null)=>({id,x,z,angle,zone,owner,approach:{x:x+Math.sin(angle)*.97,z:z+Math.cos(angle)*.97}});
export function villaContent(state){
 const rooms=state.scene.rooms.map(r=>({...r,building:r.outdoor?null:r.id})),known=new Set(rooms.map(r=>r.id));
 const publicRoom=state.publicRoom,discussion=rooms.find(r=>r.id===publicRoom),cast=state.people.map(p=>({...p}));
 const seats=cast.map((p,i)=>{const side=i%2?-1:1,row=Math.floor(i/2),z=discussion.z-(Math.ceil(cast.length/2)-1)*.825+row*1.65;return seat('home-'+p.id,discussion.x+side*3.5,z,side>0?-Math.PI/2:Math.PI/2,'table',p.id);});
 for(const [zone,side] of [['left',-1],['right',1]])for(let i=0;i<2;i++)seats.push(seat(zone+'-'+i,discussion.x+side*(discussion.w/2-1.4),discussion.z+discussion.d/2-2.5-i*1.7,side>0?-Math.PI/2:Math.PI/2,zone));
 for(const p of cast){const at=seats.find(s=>s.owner===p.id);p.seat=[at.x,at.z];}
 const stations={reading:{name:'边桌',at:{x:discussion.x-5,z:discussion.z-2},spots:[{x:discussion.x-6.1,z:discussion.z-2},{x:discussion.x-5,z:discussion.z-.6}],gestures:['write','glance'],actions:['在空白页上记了几笔','低头看着桌上的纸']},plants:{name:'盆栽旁',at:{x:discussion.x+discussion.w/2-1,z:discussion.z+discussion.d/2-1},spots:[{x:discussion.x+discussion.w/2-2.1,z:discussion.z+discussion.d/2-1},{x:discussion.x+discussion.w/2-1,z:discussion.z+discussion.d/2-2.2}],gestures:['glance','tend'],actions:['站起身，舒展了一下肩膀','轻轻拨开垂下的叶子']}};
 const exteriors=state.scene.exteriors||[],bounds=sceneBounds([...rooms,...exteriors],3),buildings=rooms.filter(r=>!r.outdoor);
 return {id:'suspect7',key:JSON.stringify([state.slotToken,state.scene.layoutVersion,rooms.map(r=>r.id),state.scene.mapSpots.map(p=>p.id)]),rooms,cast,seats,bounds,buildings,doors:state.scene.doors,publicRoom,redAsGrey:state.playerId==='andy',activity:event=>stations[event?.station]||null,
  characterOptions:id=>{const p=people.find(p=>p.id===id),i=people.indexOf(p);return {modern:true,offset:i*.71,look:{stride:.6,speed:1.4,trousers:'#59665f',shoes:'#514f45',...p},features:p.features||{eye:[.128,.022,.028,.029,-.03],brow:[.136,.14,.014,0,[[-.06,0],[0,.012],[.06,-.006]]]}};},
  ground:town=>{
   // Seeded placement keeps trees and furniture in place after a reload.
   const rand=random(7713),path=(x,z,w,d)=>town.box(x,.08,z,w,.07,d,'#ded7bd',town.scene,false,0,'stone');
   const fence=(x,z,w,d)=>{town.roundBox(x,.08,z,w,2.45,d,'#c2c5ad',town.scene,.08,'plaster');};
   fence(bounds.minX+.5,(bounds.minZ+bounds.maxZ)/2,.35,bounds.maxZ-bounds.minZ-1);fence(bounds.maxX-.5,(bounds.minZ+bounds.maxZ)/2,.35,bounds.maxZ-bounds.minZ-1);fence((bounds.minX+bounds.maxX)/2,bounds.minZ+.5,bounds.maxX-bounds.minX-1,.35);fence((bounds.minX-1)/2,32,-bounds.minX-1,.35);fence((bounds.maxX+1)/2,32,bounds.maxX-1,.35);
   path(-13,-2,6,40);path(0,25,3.2,18);path(-7,25,14,2.2);path(7,29,14,2.2);
   for(let z=-20;z<18;z+=1.5)for(const x of [-14.5,-12.5,-10.7])town.box(x,.16,z,.9+rand()*.6,.018,1.15+rand()*.2,'#e5ddc7',town.scene,false,0,'stone');
   const tree=(x,z,size)=>{town.box(x,.1,z,.25,size,.25,'#95866c',town.scene,false);town.ball(x,size+1,z,1.5,'#a4b68e',town.scene,[1,size*.44,1]);town.ball(x-.65,size+.5,z+.4,1,'#b4bf9e');};
   for(let i=0;i<42;i++){const x=bounds.minX-3+rand()*(bounds.maxX-bounds.minX+6),z=bounds.minZ-3+rand()*(bounds.maxZ-bounds.minZ+6);if([...rooms,...exteriors].some(r=>Math.abs(x-r.x)<r.w/2+1.7&&Math.abs(z-r.z)<r.d/2+1.7))continue;tree(x,z,1.8+rand()*1.7);}
   for(const [x,z] of [[-8,22],[9,23],[-9,30],[10,30]]){tree(x,z,1.8+rand());for(let j=0;j<5;j++)town.ball(x+(rand()-.5)*3,.32,z+(rand()-.5)*3,.35,'#9dad8b');}
   for(const [x,z]of [[-14.7,16],[-14.7,6],[-14.7,-5],[-14.7,-16],[-2,29],[2,20]]){town.box(x,.1,z,.12,2.5,.12,'#777f6a',town.scene,false);town.roundBox(x,2.5,z,.45,.38,.45,'#eee0b7',town.scene,.07);town.box(x,2.9,z,.6,.05,.6,'#7a8069');}
   town.roundBox(5,.17,26,3,.45,2,'#adbaa6',town.scene,.2,'stone');town.box(5,.63,26,2.6,.015,1.6,'#a4c0b9',town.scene,false);
  },
  architecture:town=>{
   for(const r of rooms){
    const root=new THREE.Group();town.scene.add(root);town.interiors.set(r.id,root);
    if(!r.outdoor){town.roundBox(r.x,.1,r.z,r.w,.13,r.d,'#b6a68b',root,.12,'stone');town.box(r.x,.235,r.z,r.w-.25,.025,r.d-.25,['pool','garage','washroom'].includes(r.decor)?'#d9d6c0':'#dfcfad',root,false,0,['pool','garage','washroom'].includes(r.decor)?'stone':'wood');}
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(r.w-.18,r.d-.18),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));floor.rotation.x=-Math.PI/2;floor.position.set(r.x,.27,r.z);floor.userData.pick={type:'room',id:r.id};root.add(floor);if(r.walkable)town.clickable.push(floor);
    if(!r.outdoor){const walls=new THREE.Group();root.add(walls);walls.userData.wallSegments=[];for(const w of wallSegments([r],state.scene.doors)){town.box(w.x,.27,w.z,w.w,2.7,w.d,'#d9d9c3',walls,false,0,'plaster');walls.userData.wallSegments.push({...w,y:.27,h:2.7});}town.shells.set(r.id,{root,walls});}
    const dressing=new VillaDressing(town,root);dressing.decorate(r);
    if(r.id===publicRoom){town.table(r.x-5,r.z-2,1.3,2,root);for(let i=0;i<3;i++)town.box(r.x-5,1.13+i*.014,r.z-2,.6,.012,.8,'#e8dfc5',root,false);town.table(r.x,r.z,3.6,cast.length>6?9.3:8.5,root);for(const s of seats)town.chair(s.x,s.z,s.angle,root,s.id);for(const s of seats.filter(s=>s.owner)){const side=s.x>r.x?1:-1;dressing.cylinder(root,r.x+side*1.25,1.15,s.z,.18,.035,'#eee4cc');}town.roundBox(r.x+r.w/2-1.5,.28,r.z-3,.8,1.6,.45,'#ae9b7b',root,.08,'wood');}
    // The original dining furniture remains when the investigation moves west.
    if(r.id==='dining'&&publicRoom!=='dining'){town.table(r.x,r.z,3.6,8.5,root);town.table(r.x-5,r.z-2,1.3,2,root);for(let i=0;i<6;i++){const side=i%2?-1:1;town.chair(r.x+side*3.5,r.z-1.65+Math.floor(i/2)*1.65,side>0?-Math.PI/2:Math.PI/2,root);}}
    if(!r.outdoor&&!['corridor','passage','pool','attic'].includes(r.decor)){
     const rand=random([...r.id].reduce((n,c)=>n+c.charCodeAt(0),187));
     for(const side of [-1,1]){const x=r.x+side*(r.w/2-1),z=r.z-r.d/2+1.1;if(state.scene.doors.some(p=>Math.hypot(p.x-x,p.z-z)<2.4))continue;town.roundBox(x,.28,z,.8,.65,.65,'#b4a387',root,.1,'wood');if(rand()>.3){dressing.cylinder(root,x,1,z,.17,.26,'#c3b08e');town.ball(x,1.3,z,.3,'#8c9e7b',root,[1,1.2,1]);}else for(let i=0;i<3;i++)town.box(x,.94+i*.08,z,.45,.06,.3,['#a2ae97','#bca184','#d5c9aa'][i],root,false);}
    }
    if(r.walkable){const label=town.label(r.name,new THREE.Vector3(r.x,.36,r.z+r.d/2-.75),'room-label',{type:'room',id:r.id});label.el.dataset.destination=r.id;town.placeLabels.set(r.id,label);}
   }
   town.roofs=[];const capture=town.captureObstacles;town.captureObstacles=false;
   for(const r of exteriors){const g=new THREE.Group();town.scene.add(g);town.box(r.x,.12,r.z,r.w,2.8,r.d,'#babda6',g,false,0,'plaster');const roof=town.roundBox(r.x,2.92,r.z,r.w+.6,.28,r.d+.6,'#879881',g,.1,'wood');for(let z=r.z-r.d/2;z<r.z+r.d/2;z+=.7)town.box(r.x,3.21,z,r.w+.5,.025,.05,'#a0ab92',g,false);g.userData.envelope=r;town.roofs.push(g);const depth=r.d,z=r.z;town.wallObstacles.push({minX:r.x-r.w/2,maxX:r.x+r.w/2,minZ:z-depth/2,maxZ:z+depth/2});}
   town.captureObstacles=capture;
  },
  evidence:town=>{
   for(const p of state.scene.mapSpots){const g=new THREE.Group();g.position.set(p.x,0,p.z);town.scene.add(g);new VillaDressing(town,g).prop(g,p.kind,p.onTable);g.userData.pick={type:'spot',id:p.id};
    const button=document.createElement('button');button.className='prop-hit';button.dataset.prop=p.id;button.hidden=true;button.type='button';button.innerHTML='<span class="prop-caption"></span>';button.onclick=e=>{e.stopPropagation();town.onPick({type:'spot',id:p.id});};town.labels.append(button);town.props.set(p.id,{g,button,room:p.room,bounds:new THREE.Box3().setFromObject(g),active:false,found:false});
   }
  },
  syncRoofs:(town,inside)=>{for(const g of town.roofs){const r=g.userData.envelope;g.visible=true;}}
 };
}