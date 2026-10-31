import * as THREE from 'three';

// Fixed arrangements keep each person's room recognisable across visits.
const styles={
 player:{mirror:1,wood:'#c2a17c',cloth:'#a7b9ad',throw:'#d8c3a1',rug:'#b7bda1',bed:[-1.54,-1.01,-.025],desk:[1.60,1.28,.025],cabinet:[-1.56,1.48,-.025],wardrobe:[1.69,-1.65,.012],chair:[-.09,-.97,.09]},
 miyazaki:{mirror:-1,wood:'#b3a181',cloth:'#c5c1a5',throw:'#93a690',rug:'#b9bfac',bed:[-1.56,-1.03,.018],desk:[1.53,1.22,-.035],cabinet:[-1.52,1.54,.025],wardrobe:[1.78,-1.62,-.02],chair:[.10,-.97,-.09]},
 jiang:{mirror:1,wood:'#c7af8e',cloth:'#a9bdc3',throw:'#b8bba0',rug:'#b5c4bd',bed:[-1.61,-.98,.03],desk:[1.62,1.16,-.028],cabinet:[-1.62,1.46,.03],wardrobe:[1.64,-1.54,.025],chair:[-.12,-.94,.14]},
 ishikawa:{mirror:-1,wood:'#b8a18d',cloth:'#c9afbd',throw:'#a9b8c0',rug:'#c5bdb6',bed:[-1.50,-1.02,-.025],desk:[1.58,1.32,.035],cabinet:[-1.60,1.49,-.035],wardrobe:[1.72,-1.67,.018],chair:[.13,-1.00,-.13]},
 kato:{mirror:1,wood:'#bea17b',cloth:'#c9b393',throw:'#a1aea2',rug:'#c8c0a7',bed:[-1.63,-1.01,.015],desk:[1.51,1.20,.018],cabinet:[-1.51,1.57,-.02],wardrobe:[1.81,-1.63,-.018],chair:[.08,-.96,.05]}
};
export const roomStyle=id=>styles[id];
const original={bed:[-1.4,-1],desk:[1.5,1.35],cabinet:[-1.45,1.5],wardrobe:[1.75,-1.6]};

function furnitureGroup(room,style,kind,parent){
 const [x,z,angle]=style[kind],group=new THREE.Group();
 group.name=`${room.id}-${kind}`;group.userData.furniture=kind;
 group.position.set(room.x+style.mirror*x,0,room.z+z);
 group.rotation.y=style.mirror*angle;group.scale.x=style.mirror;parent.add(group);
 return group;
}

export function buildGuestRoom(scene,room,parent){
 const style=roomStyle(room.id);if(!style)return;
 const bed=furnitureGroup(room,style,'bed',parent);
 scene.roundBox(0,.28,0,1.8,.48,2.5,style.wood,bed,.13,'wood');
 scene.roundBox(0,.76,0,1.75,.15,2.45,style.cloth,bed,.20,'cloth');
 if(room.id==='kato')for(const x of [-.36,.36])scene.roundBox(x,.925,-.72,.63,.15,.55,'#eee3c9',bed,.15,'cloth');
 else scene.roundBox(-.04,.925,-.70,1.25,.15,.57,'#eee3c9',bed,.18,'cloth');
 scene.roundBox(.015,.916,.70,1.66,.018,.48,style.throw,bed,.07,'cloth');
 scene.roundBox(0,.278,1.61,1.88,.016,.53,style.rug,bed,.16,'cloth');

 const cabinet=furnitureGroup(room,style,'cabinet',parent);
 scene.roundBox(0,.28,0,1.55,.65,.85,style.wood,cabinet,.10,'wood');
 for(const y of [.42,.68]){
  scene.roundBox(0,y,.427,1.30,.20,.025,style.wood,cabinet,.055,'wood');
  scene.roundBox(0,y+.08,.449,.23,.045,.045,'#8e8069',cabinet,.02);
 }
 if(room.id!=='miyazaki'){
  const wardrobe=furnitureGroup(room,style,'wardrobe',parent);
  scene.roundBox(0,.28,0,1.6,1.8,.65,style.wood,wardrobe,.11,'wood');
  scene.box(0,.39,.327,.018,1.56,.012,'#94836d',wardrobe,false);
  for(const x of [-.13,.13])scene.ball(x,1.15,.36,.035,'#83765f',wardrobe);
 }
 const desk=furnitureGroup(room,style,'desk',parent);
 scene.table(0,0,1.7,.9,desk,style.wood);
 scene.chair(style.chair[0],style.chair[1],Math.PI+style.chair[2],desk,null,style.wood);
}

// Evidence and its supporting furniture share the same placement transform.
export function placeRoomEvidence(room,spec,id){
 const style=roomStyle(room.id);if(!style)return null;
 const kind=spec.y===1.14?'desk':spec.y===.95?'cabinet':spec.y===.94?'bed':spec.y===2.1||spec.model==='wardrobe'?'wardrobe':null;
 let x=spec.x,z=spec.z,angle=0;
 if(kind){
  const [ox,oz]=original[kind],[ax,az,a]=style[kind];
  if(kind==='desk')x+=.2;
  if(kind==='cabinet'&&x>-.8)x-=.5;
  let dx=x-ox,dz=z-oz;
  if(kind==='desk')dx*=.8;
  x=ax+Math.cos(a)*dx+Math.sin(a)*dz;
  z=az-Math.sin(a)*dx+Math.cos(a)*dz;angle=a;
 }
 // Small fixed turns give loose papers and belongings a casually placed feel.
 let seed=0;for(const ch of id)seed=(Math.imul(seed,31)+ch.charCodeAt(0))>>>0;
 if(['paper','letter','photo','book','coat','ringbox','case','token','pouch'].includes(spec.model))angle+=((seed%101)/100-.5)*.14;
 return {x:room.x+style.mirror*x,y:spec.y,z:room.z+z,angle:style.mirror*angle,mirror:style.mirror,carrier:kind,color:spec.model==='wardrobe'?style.wood:spec.color};
}
