import {animateFace,animateEmotion} from './character-expression.mjs';
import * as THREE from 'three';

// Silhouettes and public identities follow the existing illustrated portraits.
// Hidden identities never enter this visual character sheet.
export const characterLooks={
 player:{height:1,skin:'#ebc8a3',hair:'#514638',coat:'#c6a16a',trousers:'#697469',shoes:'#685444',stride:.64,speed:1.65,description:'圆眼镜、短发、赭色旅行外套、斜挎皮包；步子轻而有目的。'},
 miyazaki:{height:1.06,skin:'#eac4a2',hair:'#484539',coat:'#e9e2cc',trousers:'#748b78',shoes:'#77735f',stride:.58,speed:1.15,description:'束发、交领白衣、苔绿袴与宽袖；站姿端正，拢袖轻点头。'},
 jiang:{height:.98,skin:'#d9b494',hair:'#a8a698',coat:'#7e97a4',trousers:'#5f7077',shoes:'#6b685d',stride:.63,speed:1.35,description:'蓬松灰发、胡茬、蓝色劳作服、围裙与肩巾；略微含胸，偶尔挠头。'},
 ishikawa:{height:1.01,skin:'#e9c5a4',hair:'#4d443d',coat:'#a48191',trousers:'#716878',shoes:'#5e5553',stride:.56,speed:1.2,description:'侧分短发、发侧铅笔、紫色开衫、白衬领与随身册；抱书观察，低头记字。'},
 kato:{height:1.08,skin:'#dfba94',hair:'#51473b',coat:'#b79b73',trousers:'#80735f',shoes:'#574d3e',stride:.66,speed:1.3,description:'后梳发、小胡子、三件式西装、领带与表链；挺胸站立，习惯整理袖口。'},
 emi:{height:.97,skin:'#eac6ac',hair:'#625044',coat:'#cc9e8e',trousers:'#d7c8a5',shoes:'#8a7060',stride:.5,speed:1.08,description:'盘发、花纹交领衣、珊瑚色披肩与束带；双臂拢着衣襟，动作小而克制。'}
};
const mix=THREE.MathUtils.damp;
// Resting features belong to the person; expressions are offsets from these shapes.
const facialFeatures={
 player:{eye:[.128,.025,.027,.041,-.035],brow:[.133,.142,.014,0,[[-.061,-.006],[-.012,.014],[.06,-.004]]]},
 miyazaki:{eye:[.13,.022,.034,.022,.07],brow:[.136,.131,.016,.035,[[-.061,0],[0,.004],[.064,-.002]]]},
 jiang:{eye:[.137,.013,.026,.031,-.13],brow:[.144,.137,.019,-.07,[[-.061,.004],[-.015,.014],[.061,-.013]]]},
 ishikawa:{eye:[.124,.029,.035,.019,.14],brow:[.13,.145,.012,.065,[[-.058,-.008],[.008,.012],[.066,.005]]]},
 kato:{eye:[.12,.018,.028,.023,.02],brow:[.129,.128,.021,.09,[[-.063,-.004],[-.016,.012],[.061,.008]]]},
 emi:{eye:[.132,.027,.031,.028,-.085],brow:[.14,.151,.01,-.03,[[-.062,-.014],[-.008,.018],[.06,-.008]]]}
};
export function createCharacter(scene,id,options={}){
 const look=options.look||characterLooks[id],root=new THREE.Group(),body=new THREE.Group(),head=new THREE.Group();root.name='character-'+id;root.add(body);body.position.y=.27;body.scale.setScalar(look.height*.88);
 const mat=c=>scene.mat(c),ink='#504a40';
 const mesh=(geometry,color,parent,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const ell=(parent,x,y,z,rx,ry,rz,c)=>{const m=mesh(new THREE.SphereGeometry(1,16,12),c,parent,x,y,z);m.scale.set(rx,ry,rz);return m;};
 const box=(parent,x,y,z,w,h,d,c)=>mesh(new THREE.BoxGeometry(w,h,d),c,parent,x,y,z);
 const taper=(parent,x,y,z,top,bottom,h,c,depth=1)=>{const m=mesh(new THREE.CylinderGeometry(top,bottom,h,12),c,parent,x,y,z);m.scale.z=depth;return m;};
 const line=(parent,points,c=ink,r=.012)=>{const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(curve,Math.max(4,points.length*3),r,5,false),c,parent);};
 const patch=(parent,points,c)=>{const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const m=mesh(new THREE.ShapeGeometry(shape),c,parent,0,0,.235);m.material=mat(c);return m;};
 const torso=new THREE.Group();body.add(torso);torso.position.y=.88;
 taper(torso,0,.26,0,.27,id==='emi'?.34:.3,.76,look.coat,.77);
 const skirt=['miyazaki','emi','ishikawa'].includes(id);let robe;
 if(skirt){robe=new THREE.Group();body.add(robe);taper(robe,0,.6,-.02,.25,id==='miyazaki'?.35:.32,.67,look.trousers,.75);for(const x of [-.2,-.08,.08,.2])line(robe,[[x*.8,.89,.19],[x,.33,.24]],id==='emi'?'#c0b195':'#797b70',.009);}
 const legs=[],knees=[],arms=[],elbows=[];
 for(const side of [-1,1]){
  const hip=new THREE.Group();hip.position.set(side*.145,.8,0);body.add(hip);legs.push(hip);
  taper(hip,0,-.17,0,.112,.095,.36,look.trousers,.92);
  const knee=new THREE.Group();knee.position.y=-.34;hip.add(knee);knees.push(knee);taper(knee,0,-.18,0,.095,.082,.36,look.trousers);
  ell(knee,0,-.38,.06,.12,.08,.195,look.shoes);
  const shoulder=new THREE.Group();shoulder.position.set(side*.275,.57,0);torso.add(shoulder);arms.push(shoulder);
  taper(shoulder,0,-.15,0,.13,id==='miyazaki'?.17:.11,.34,look.coat,.84);
  const elbow=new THREE.Group();elbow.position.set(0,-.32,0);shoulder.add(elbow);elbows.push(elbow);
  taper(elbow,0,-.13,0,id==='miyazaki'?.165:.11,id==='miyazaki'?.16:.095,.28,look.coat,.85);
  ell(elbow,0,-.29,.015,.085,.103,.075,look.skin);
 }
 body.add(head);head.position.set(0,1.78,0);
 const skin=ell(head,0,0,.015,.34,.39,.315,look.skin);
 // Sample the actual faceted skin, so short hairs touch even at the jaw's edge.
 const surface=new THREE.Mesh(skin.geometry);surface.position.copy(skin.position);surface.scale.copy(skin.scale);surface.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,0,-1));
 const depthAt=(x,y)=>{ray.ray.origin.set(x,y,1);return ray.intersectObject(surface,false)[0]?.point.z??.015;};
 const features=options.features||facialFeatures[id],face={eyes:[],brows:[],depthAt,offset:options.offset??Object.keys(characterLooks).indexOf(id)*.73,open:0};
 for(const side of [-1,1]){
  ell(head,side*.328,-.055,.01,.065,.105,.075,look.skin);
  const [ex,ey,ew,eh,tilt]=features.eye,eye=ell(head,side*ex,ey,depthAt(side*ex,ey)+.002,ew,eh,.012,ink);
  eye.rotation.set(0,side*.26,side*tilt);eye.userData.restHeight=eh;face.eyes.push(eye);
  const [bx,by,width,angle,points]=features.brow,brow=new THREE.Group(),rotation=side*angle;
  brow.position.set(side*bx,by,depthAt(side*bx,by)+.002);brow.rotation.z=rotation;head.add(brow);
  line(brow,points.map(([x,y])=>{const px=side*x,rx=px*Math.cos(rotation)-y*Math.sin(rotation),ry=px*Math.sin(rotation)+y*Math.cos(rotation);return [px,y,depthAt(side*bx+rx,by+ry)+.002-brow.position.z];}),look.hair,width);
  brow.userData.rest={y:by,angle:rotation};face.brows.push(brow);
 }
 ell(head,.015,-.062,.316,.038,.061,.045,look.skin);
 face.mouth=new THREE.Group();face.mouth.position.set(0,-.185,.31);head.add(face.mouth);line(face.mouth,[[-.065,0,-.006],[.012,-.011,.01],[.074,.004,-.011]],'#99775f',.01);face.openMouth=ell(head,0,-.191,.316,.052,.003,.014,'#76594e');face.openMouth.visible=false;
 if(options.modern){
  const shirt=look.shirt||'#e6dcc3';box(torso,0,.34,.212,.32,.53,.035,shirt);
  const collar=look.outfit!=='knit';
  if(collar){patch(torso,[[-.14,.62],[0,.46],[-.1,.31]],shirt);patch(torso,[[.14,.62],[0,.46],[.1,.31]],shirt);}
  if(['suit','blazer','jacket'].includes(look.outfit))for(const side of [-1,1])patch(torso,[[side*.25,.61],[side*.06,.39],[side*.16,.12],[side*.27,.43]],look.coat);
  if(look.outfit==='knit')for(const y of [.18,.28,.38])line(torso,[[-.14,y,.236],[.14,y,.236]],'#626a50',.007);
  if(look.outfit==='cardigan'){for(const side of [-1,1])line(torso,[[side*.18,.58,.236],[side*.12,-.08,.237]],look.coat,.025);for(const y of [.15,0])ell(torso,.06,y,.24,.015,.015,.01,'#b4a58a');}
  if(look.tie)patch(torso,[[0,.47],[-.046,.37],[0,.05],[.046,.37]],look.tie);
  if(look.glasses){for(const side of [-1,1]){
   if(look.glasses==='square')line(head,[[side*.035,.1,.34],[side*.22,.1,.33],[side*.22,-.052,.33],[side*.035,-.052,.34],[side*.035,.1,.34]],ink,.011);
   else{const rim=mesh(new THREE.TorusGeometry(.095,.012,6,24),ink,head,side*.128,.025,.337);rim.scale.y=look.glasses==='sun'?.79:.95;if(look.glasses==='sun')ell(head,side*.128,.025,.338,.088,.071,.013,'#42463e');}
   line(head,[[side*.22,.045,.333],[side*.325,.015,.1]],ink,.01);
  }line(head,[[-.035,.035,.34],[0,.047,.35],[.035,.035,.34]],ink,.01);}
  if(look.look==='cane'){mesh(new THREE.CylinderGeometry(.025,.025,1.18,8),'#544d43',body,.39,.5,.17);line(body,[[.39,1.06,.17],[.39,1.19,.17],[.48,1.24,.17],[.54,1.18,.17]],'#b6a379',.032);}
  if(look.stubble)for(const side of [-1,1])for(let i=0;i<6;i++){const x=side*(.055+i*.033),y=-.21-i*.008;line(head,[[x,y,depthAt(x,y)+.002],[x+side*.005,y-.021,depthAt(x+side*.005,y-.021)+.002]],look.hair,.005);}
  if(look.moustache)for(const side of [-1,1])line(head,[[side*.015,-.12,depthAt(side*.015,-.12)+.008],[side*.07,-.14,depthAt(side*.07,-.14)+.008],[side*.11,-.13,depthAt(side*.11,-.13)+.005]],look.hair,.016);
  if(look.earrings)for(const side of [-1,1]){ell(head,side*.335,-.137,.07,.028,.028,.024,'#dfc49a');if(look.earrings==='drop')ell(head,side*.335,-.19,.07,.023,.04,.02,'#ece1c5');}
  if(look.book){box(elbows[0],0,-.18,.12,.3,.4,.065,'#625b4e');box(elbows[0],.015,-.18,.158,.25,.35,.015,'#e9dec4');}
  if(look.ageLines)for(const y of [.16,.22])line(head,[[-.13,y,depthAt(-.13,y)+.002],[0,y+.01,depthAt(0,y+.01)+.002],[.13,y,depthAt(.13,y)+.002]],'#b89b80',.005);
  torso.scale.x=look.shoulders||1;
 }
 // The shared rig keeps each modern character's silhouette visible at map scale.
 if(options.modern){
  const style=look.hairStyle;
  if(style!=='receding')mesh(new THREE.SphereGeometry(.35,18,12,0,Math.PI*2,0,style==='crew'?1.05:1.35),look.hair,head,0,.08,-.03).scale.set(1,style==='crew'?.86:1,1.03);
  if(['bob','waves','curly','ponytail','receding'].includes(style))for(const side of [-1,1]){
   ell(head,side*.29,style==='receding'?.06:-.055,-.08,.085,style==='bob'?.3:style==='receding'?.23:.38,.23,look.hair);
   if(['waves','curly'].includes(style))for(let j=0;j<5;j++){const lock=ell(head,side*(.28+Math.sin(j*1.6)*.035),.21-j*.15,-.06,.105,.14,.2,look.hair);lock.rotation.z=side*.25*Math.sin(j);}
  }
  if(style==='ponytail')ell(head,-.12,-.18,-.35,.15,.4,.14,look.hair);
  if(style==='receding'){ell(head,0,.26,-.19,.28,.12,.2,look.hair);}
  else if(style!=='crew')for(let i=0;i<4;i++){const lock=ell(head,-.23+i*.13,.26-Math.sin(i*.8)*.035,.16,.09,.14,.1,look.hair);lock.rotation.z=['side','swept','bob','ponytail'].includes(style)?.65:-.4+i*.2;}
  if(look.greyTemples)for(const side of [-1,1])ell(head,side*.3,.085,.03,.025,.14,.1,'#a09e8c');
 }else{
 // Hair cap is an actual back/side shell, leaving the forehead and face clear.
 mesh(new THREE.SphereGeometry(.35,18,12,0,Math.PI*2,0,1.35),look.hair,head,0,.08,-.03).scale.set(1,1,1.03);
 if(id==='kato'){ell(head,0,.28,-.04,.31,.15,.29,look.hair);for(const x of [-.16,-.02,.12])line(head,[[x,.34,.17],[x+.035,.42,0],[x+.04,.35,-.21]],'#65594a',.01);}
 else if(id==='miyazaki'){for(const side of [-1,1]){const lock=ell(head,side*.16,.23,.16,.12,.17,.12,look.hair);lock.rotation.z=side*.55;}}
 else if(id==='emi'){const wave=ell(head,-.11,.26,.16,.22,.12,.13,look.hair);wave.rotation.z=.28;ell(head,.25,.1,.06,.09,.23,.17,look.hair);}
 else for(let i=0;i<4;i++){const lock=ell(head,-.23+i*.13,.24-Math.sin(i*.8)*.035,.17,.09,.16,.11,look.hair);lock.rotation.z=id==='ishikawa'?.55:-.35+i*.12;}
 if(id==='player'||id==='ishikawa')for(const side of [-1,1])ell(head,side*.29,-.03,-.04,.09,.27,.25,look.hair);
 }
 if(id==='player'){
  for(const side of [-1,1]){const rim=mesh(new THREE.TorusGeometry(.096,.012,6,24),ink,head,side*.128,.025,.337);rim.scale.y=.9;line(head,[[side*.22,.045,.333],[side*.325,.015,.1]],ink,.01);}
  line(head,[[-.03,.028,.34],[0,.045,.35],[.03,.028,.34]],ink,.009);
  patch(torso,[[-.23,.6],[-.05,.47],[-.15,.15],[-.28,.47]],'#e0be84');patch(torso,[[.23,.6],[.05,.47],[.14,.16],[.28,.47]],'#d8b47b');
  box(torso,0,.4,.205,.15,.38,.025,'#6e6452');
  line(torso,[[-.25,.65,.2],[-.02,.24,.26],[.29,-.08,.22]],'#80644b',.036);
  const bag=box(torso,.32,-.13,.07,.27,.36,.22,'#997753');box(bag,0,.08,.118,.28,.17,.025,'#ad8a61');box(bag,0,.015,.14,.045,.07,.025,'#d1b27a');
 }else if(id==='miyazaki'){
  ell(head,0,.25,-.31,.15,.16,.14,look.hair);
  patch(torso,[[-.24,.61],[.02,.4],[-.08,.17],[-.29,.52]],'#fbf0d7');patch(torso,[[.25,.61],[-.05,.32],[.02,.2],[.29,.53]],'#d0c9ad');
  for(const side of [-1,1])box(torso,side*.18,.25,.23,.11,.65,.04,'#81937a');
  taper(torso,0,-.07,0,.3,.3,.12,'#687c6c',.83);
 }else if(id==='jiang'){
  for(let i=0;i<7;i++){const tuft=ell(head,Math.cos(i*2.4)*.24,.29+Math.sin(i)*.035,Math.sin(i*2.4)*.2,.1,.15,.08,look.hair);tuft.rotation.z=i*.5;}
  for(const side of [-1,1])for(let j=0;j<4;j++){
   const x=side*(.1+j*.04),y=-.19-j*.01;
   const hair=line(head,[[x,y,depthAt(x,y)+.002],[x+side*.005,y-.015,depthAt(x+side*.005,y-.015)+.002],[x+side*.01,y-.03,depthAt(x+side*.01,y-.03)+.002]],'#8d8676',.007);hair.name='fitted-stubble';
  }
  box(torso,0,.08,.235,.37,.57,.035,'#c8bea0');line(torso,[[-.19,.57,.19],[-.13,.37,.26],[.13,.37,.26],[.19,.57,.19]],'#e1d7bc',.026);
  for(const side of [-1,1])box(torso,side*.205,.4,.24,.115,.46,.05,'#e7dcc0');box(torso,.02,-.03,.263,.2,.16,.024,'#afa58b');
 }else if(id==='ishikawa'){
  patch(torso,[[-.2,.61],[0,.43],[-.12,.31]],'#f3e9d5');patch(torso,[[.2,.61],[0,.43],[.12,.31]],'#e5dbc7');
  const pencil=box(head,-.29,.11,.22,.025,.28,.025,'#c9a451');pencil.rotation.z=-.45;
  box(elbows[0],0,-.18,.12,.32,.4,.065,'#625e58');box(elbows[0],.015,-.18,.158,.27,.35,.015,'#e9dec4');box(elbows[0],-.14,-.18,.17,.04,.4,.025,'#858177');
  const pen=box(elbows[1],0,-.32,.05,.018,.22,.018,'#c4a56d');pen.rotation.x=-.6;
 }else if(id==='kato'){
  for(const side of [-1,1]){
   const geometry=new THREE.SphereGeometry(1,20,12),positions=geometry.attributes.position;
   for(let i=0;i<positions.count;i++){
    const u=positions.getX(i),v=positions.getY(i),w=positions.getZ(i),x=side*.053+u*.057,y=-.127+v*.019-side*u*.012;
    positions.setXYZ(i,x,y,depthAt(x,y)+.002+w*.007);
   }
   geometry.computeVertexNormals();const moustache=mesh(geometry,look.hair,head);moustache.name='fitted-moustache';
  }
  box(torso,0,.28,.22,.24,.51,.035,'#786c57');patch(torso,[[-.12,.61],[0,.45],[-.06,.35]],'#f2e8d1');patch(torso,[[.12,.61],[0,.45],[.06,.35]],'#f2e8d1');
  patch(torso,[[0,.46],[-.05,.35],[0,.06],[.05,.35]],'#7c875f');
  patch(torso,[[-.25,.62],[-.06,.29],[-.2,.06],[-.27,.36]],'#c9ad83');patch(torso,[[.25,.62],[.06,.29],[.2,.06],[.27,.36]],'#c9ad83');
  box(torso,.19,.36,.25,.1,.055,.018,'#ece2c9');line(torso,[[.04,.03,.26],[.15,-.03,.265],[.23,.05,.25]],'#cfb270',.012);
  for(const y of [.17,.03])ell(torso,0,y,.254,.021,.021,.014,'#cbb074');
 }else if(id==='emi'){
  ell(head,0,-.045,-.28,.23,.24,.17,look.hair);ell(head,.15,-.1,-.33,.16,.17,.13,look.hair);
  patch(torso,[[-.23,.6],[.07,.32],[-.05,-.04],[-.25,.32]],'#eee1c5');patch(torso,[[.22,.6],[-.02,.3],[.04,-.04],[.26,.32]],'#e1d3b5');
  for(const side of [-1,1]){const shawl=box(torso,side*.24,.27,.095,.15,.64,.32,look.coat);shawl.rotation.z=side*.12;}
  taper(torso,0,-.05,0,.3,.3,.14,'#a88577',.85);
  for(const [x,y]of [[-.1,.31],[.11,.13],[-.12,-.35],[.14,-.45]]){const parent=y<0?body:torso,py=y<0?y+.9:y;for(let k=0;k<5;k++)ell(parent,x+Math.cos(k*1.26)*.034,py+Math.sin(k*1.26)*.034,.25,.024,.026,.009,'#c49d89');ell(parent,x,py,.263,.015,.015,.008,'#d7bb7e');}
 }
 // Soft contact shadow stays on the floor, independent of gait/body sway.
 const shadow=scene.contacts?.actorShadow()||new THREE.Mesh(new THREE.CircleGeometry(.43,24),new THREE.MeshBasicMaterial({color:'#606a54',transparent:true,opacity:.17,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.272;root.add(shadow);
 let tray;
 if(id==='jiang'){
  tray=new THREE.Group();tray.position.set(0,.03,.34);torso.add(tray);tray.visible=false;
  taper(tray,0,0,0,.32,.3,.035,'#a58b64',.5);ell(tray,-.11,.105,0,.1,.09,.08,'#b8c4aa');
  taper(tray,-.11,.2,0,.065,.07,.025,'#9eae90');line(tray,[[-.05,.1,0],[.005,.12,0],[.025,.16,0]],'#b8c4aa',.025);
  taper(tray,.15,.065,0,.055,.04,.09,'#e9dfc5');
 }
 const cup=new THREE.Group();elbows[1].add(cup);cup.position.set(0,-.32,.04);taper(cup,0,0,0,.063,.045,.1,'#e8ddc2');cup.visible=false;
 const rig={root,body,torso,head,legs,knees,arms,elbows,look,id,cup,tray,robe,shadow,face,mood:'neutral',speakingUntil:0,sit:0,sitTarget:0,gazeYaw:0,phase:0,blend:0,time:0};
 root.userData.character={id,description:look.description};return rig;
}
export function animateCharacter(rig,dt,speed=0,gesture='idle'){
 const {body,torso,head,legs,knees,arms,elbows,look,id}=rig;rig.time+=dt;rig.cadence=mix(rig.cadence||0,Math.min(2.1,speed/(look.stride*2)),8,dt);rig.phase+=rig.cadence*Math.PI*2*dt;rig.blend=mix(rig.blend,Math.min(1,speed/.7),9,dt);
 const t=rig.time,p=rig.phase,w=rig.blend,idle=1-w,swing=Math.sin(p),breath=Math.sin(t*1.7)*.006;
 body.position.y=.27+Math.abs(swing)*.018*w;torso.position.y=.88+breath;torso.rotation.z=swing*.035*w;
 torso.rotation.x=id==='jiang'?.075:id==='kato'?-.035:id==='aiyijun'?.045:.015;
 head.rotation.y=Math.sin(t*.45)*.1*idle;head.rotation.x=(id==='emi'?.06:0)+(gesture==='listen'?Math.sin(t*3)*.035:Math.sin(t*.9)*.012)*idle;
 for(let i=0;i<2;i++){const sign=i?1:-1,armSwing=-sign*Math.sin(p-.16);legs[i].rotation.x=sign*swing*.43*w;knees[i].rotation.x=Math.max(0,-sign*swing)*.48*w;arms[i].rotation.set(armSwing*.38*w,0,sign*(.055+.025*w));elbows[i].rotation.set(-.14-Math.max(0,-armSwing)*.18*w,0,0);}
 const poseArm=(i,x,z,elbow)=>{arms[i].rotation.x=THREE.MathUtils.lerp(arms[i].rotation.x,x,idle);arms[i].rotation.z=THREE.MathUtils.lerp(arms[i].rotation.z,z,idle);elbows[i].rotation.x=THREE.MathUtils.lerp(elbows[i].rotation.x,elbow,idle);};
 const fold=(amount=.5)=>{poseArm(0,-amount,-.15,-.6);poseArm(1,-amount,.15,-.6);};
 if(id==='miyazaki')fold(.32);
 if(id==='emi')fold(.63);
 if(id==='ishikawa'){arms[0].rotation.x=-.45+swing*.13*w;elbows[0].rotation.x=-.85+.1*w;arms[0].rotation.z=-.16;poseArm(1,-.5,.28,-.8+Math.sin(t*3)*.07);head.rotation.x+=.12*idle;}
 if(look.book){arms[0].rotation.x=-.45+swing*.09*w;elbows[0].rotation.x=-.85;arms[0].rotation.z=-.16;}
 if(id==='franklin')poseArm(1,-.12,.035,-.1);
 if(['hongxue','cuiyuan'].includes(id)&&!look.book)fold(.25);
 head.rotation.z=0;
 if(!rig.inConversation&&gesture!=='talk'){
  if(id==='jiang'&&t%15>11){poseArm(1,-1.7,.3,-.8);head.rotation.z=Math.sin(t*3)*.025*idle;}
  if(id==='kato'&&t%13>9){poseArm(0,-.55,-.055,-.14);poseArm(1,-.75,.25,-.7);}
  if(id==='player'&&t%12>9)poseArm(1,-.15,.13,-.6);
 }
 rig.sit=mix(rig.sit,rig.sitTarget||0,9,dt);const seated=rig.sit;
 body.position.y-=.18*seated;torso.rotation.x+=.045*seated;
 for(let i=0;i<2;i++){legs[i].rotation.x=THREE.MathUtils.lerp(legs[i].rotation.x,-1.48,seated);knees[i].rotation.x=THREE.MathUtils.lerp(knees[i].rotation.x,1.5,seated);}
 if(rig.robe){rig.robe.scale.y=1-.22*seated;rig.robe.position.z=.1*seated;}
 rig.gaze= mix(rig.gaze||0,rig.gazeYaw||0,5,dt);head.rotation.y+=rig.gaze;torso.rotation.y=rig.gaze*.12-swing*.035*w;
 if(gesture==='nod')head.rotation.x+=Math.sin(t*3)*.06;
 if(gesture==='glance')head.rotation.y+=Math.sin(t*1.3)*.16;
 rig.cup.visible=gesture==='sip';
 if(gesture==='sip'){arms[1].rotation.x=-1.1;elbows[1].rotation.x=-.8;}
 animateFace(rig,dt,gesture);
 animateEmotion(rig,dt,gesture);
 if(!rig.inConversation&&w<.2){
  if(gesture==='write'){head.rotation.x+=.18;arms[1].rotation.x=-.65;elbows[1].rotation.x=-.65+Math.sin(t*4)*.09;}
  if(gesture==='tend'){torso.rotation.x+=.1;arms[1].rotation.x=-.78+Math.sin(t*1.8)*.09;elbows[1].rotation.x=-.4;head.rotation.x+=.1;}
  if(gesture==='warm'){for(let i=0;i<2;i++){arms[i].rotation.x=-.65;elbows[i].rotation.x=-.45+Math.sin(t*1.4+i)*.035;}head.rotation.x+=.04;}
 }
 if(rig.tray){rig.tray.visible=!!rig.task;if(rig.task){for(let i=0;i<2;i++){arms[i].rotation.set(-.57,0,i?.06:-.06);elbows[i].rotation.x=-.6;}rig.tray.rotation.z=Math.sin(t*1.8)*.012;}}
}
