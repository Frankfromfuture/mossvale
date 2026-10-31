import * as THREE from 'three';

// Reusable physical props, placed on furniture or on the floor, never floating markers.
export function makeEvidenceProp(scene,spec){
 const g=new THREE.Group(),color=spec.color||'#c2a77d';g.name='evidence-prop';
 const soft=['book','coat','wardrobe','rag','doll','dolls','ringbox','case','chest','token','pouch'].includes(spec.model);
 const box=(x,y,z,w,h,d,c=color)=>soft&&w>.1&&h>.025&&d>.05?scene.roundBox(x,y,z,w,h,d,c,g,Math.min(.11,w*.18,d*.18)):scene.box(x,y,z,w,h,d,c,g);
 const ball=(x,y,z,r,c,scale)=>scene.ball(x,y,z,r,c,g,scale);
 const cylinder=(x,y,z,r,h,c=color)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r*.92,h,16),scene.mat(c));m.position.set(x,y+h/2,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
 const ring=(x,y,z,r,t,c)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,20),scene.mat(c));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);g.add(m);return m;};
 const paper=(c='#eae0bd')=>{box(0,0,0,.62,.035,.75,c);for(let i=0;i<4;i++)box(-.04,.04,-.2+i*.12,.38,.006,.016,'#8b8973');};
 const candle=(x,z,h=.55)=>{cylinder(x,0,z,.17,.06,'#9c9175');cylinder(x,.06,z,.1,h,'#ebe2be');box(x,h+.06,z,.025,.06,.025,'#6e6955');};
 const doll=(x,z,c,scale=1)=>{box(x,0,z,.35*scale,.58*scale,.32*scale,c);ball(x,.78*scale,z,.23*scale,'#ead7b3');ball(x,.9*scale,z-.04,.24*scale,'#62594c',[1,.58,1]);};
 switch(spec.model){
  case 'paper':case 'letter':paper();if(spec.model==='letter')box(0,.05,0,.16,.012,.17,'#b78d79');break;
  case 'book':box(0,0,0,.65,.13,.77,color);box(0,.13,0,.57,.025,.69,'#e6dfc5');for(let i=0;i<3;i++)box(-.07,.16,-.13+i*.13,.33,.008,.018,'#9e977e');break;
  case 'photo':box(0,0,0,.57,.04,.7,'#c0aa83');box(0,.04,0,.45,.025,.57,'#d9d4bc');ball(0,.09,-.05,.13,'#aa8c81',[1,.1,1]);break;
  case 'hairpin':box(0,.04,0,.045,.045,.48,'#8b7959');ball(0,.08,-.22,.075,'#776f5d');break;
  case 'pendant':ring(0,.05,0,.23,.024,'#797e6b');ball(0,.1,.18,.16,'#d7b789',[1,.35,1]);break;
  case 'candle':candle(0,0);break;
  case 'candles':for(let i=0;i<6;i++)candle((i%3-1)*.43,Math.floor(i/3)*.5-.25,.15+(i%2)*.14);break;
  case 'coat':box(0,0,0,.8,.09,.7,'#d2bf94');box(-.42,.02,0,.2,.07,.5,'#d2bf94');box(.42,.02,0,.2,.07,.5,'#d2bf94');ring(.1,.1,.1,.12,.025,'#a99564');break;
  case 'wardrobe':box(0,0,0,1.6,1.8,.65);box(0,.05,.34,.025,1.7,.025,'#948365');for(const x of [-.12,.12])ball(x,.85,.37,.035,'#766d55');break;
  case 'furnace':cylinder(0,0,0,.77,.78,'#90917a');ring(0,.8,0,.8,.075,'#797b66');cylinder(0,.8,0,.66,.025,'#555e52');for(const x of [-.5,.5])box(x,-.08,0,.16,.2,.18,'#71765f');break;
  case 'key':box(0,0,0,.9,.03,.65,'#aaa693');ring(-.2,.08,0,.12,.033,'#b49b5e');box(.05,.065,0,.4,.05,.065,'#b49b5e');box(.2,.065,.08,.06,.05,.14,'#b49b5e');break;
  case 'stain':for(let i=0;i<6;i++)ball(Math.sin(i*3)*.3,.025,Math.cos(i*2)*.4,.25,'#a5917f',[1,.035,1]);break;
  case 'footprints':for(let i=0;i<4;i++)ball((i%2-.5)*.35,.025,(i-1.5)*.4,.16,'#a89b7f',[.65,.05,1.35]);break;
  case 'roots':box(0,0,0,1.1,.05,.75,'#b19d7e');for(let i=0;i<3;i++){const m=box((i-1)*.24,.06,0,.12,.13,.55,'#a7956c');m.rotation.y=(i-1)*.35;ball((i-1)*.25,.27,-.16,.17,'#9bab7f',[.4,1.4,.6]);}break;
  case 'bowl':cylinder(0,0,0,.36,.2,'#c5cebc');cylinder(0,.2,0,.31,.025,'#a2bdc3');break;
  case 'rag':for(let i=0;i<4;i++){const m=box((i-1.5)*.16,.02*i,0,.27,.06,.7,'#b6b39f');m.rotation.y=.1*i;}box(.15,.25,.16,.16,.012,.23,'#91796e');break;
  case 'hair':for(let i=0;i<8;i++){const m=box((i-4)*.06,.04,0,.028,.028,.65,'#666154');m.rotation.y=i*.09-.3;}break;
  case 'jar':cylinder(0,0,0,.29,.4,color);cylinder(0,.4,0,.31,.07,'#817e6b');box(0,.13,.28,.34,.17,.012,'#e7dfc2');break;
  case 'doll':doll(0,0,color,1.3);break;
  case 'dolls':for(let i=0;i<5;i++)doll((i-2)*.27,0,['#acbda2','#b69b94','#b3bdc5'][i%3],i<3?.5:.35);break;
  case 'knife':box(0,0,0,.78,.045,.58,'#b99e76');const blade=box(.05,.06,0,.55,.055,.14,'#abb5ae');blade.rotation.y=-.2;box(-.3,.06,.07,.3,.09,.14,'#83755e');break;
  case 'ringbox':box(0,0,0,.62,.19,.55,'#9e8675');box(0,.2,0,.5,.025,.43,'#766e64');ring(0,.26,0,.14,.035,'#baa367');ball(0,.3,.13,.06,'#bd9284');break;
  case 'comb':box(0,0,0,.7,.06,.12,'#b49974');for(let i=0;i<9;i++)box((i-4)*.07,0,.14,.025,.05,.3,'#b49974');break;
  case 'bottle':cylinder(0,0,0,.17,.4,'#a8bdae');cylinder(0,.4,0,.09,.13,'#a8bdae');cylinder(0,.53,0,.1,.05,'#9b866b');break;
  case 'case':box(0,0,0,.75,.24,.55,'#b09384');box(0,.24,-.25,.75,.35,.06,'#b09384');box(0,.25,0,.6,.035,.4,'#d5cbb0');break;
  case 'brazier':cylinder(0,0,0,.39,.4,color);cylinder(0,.4,0,.33,.03,'#6d7364');for(let i=0;i<3;i++)ball((i-1)*.14,.46,.05,.12,spec.color?'#8e9282':'#ba9c77');break;
  case 'chest':box(0,0,0,.85,.5,.6,'#b69972');box(0,.5,0,.89,.1,.64,'#baa27e');box(0,.3,.32,.14,.2,.035,'#d2bb7e');break;
  case 'token':box(0,0,0,.45,.1,.65,'#9b8266');ring(0,.12,.02,.13,.035,'#625e50');break;
  case 'pouch':ball(0,.2,0,.32,'#c4bca0',[1,.65,.8]);box(0,.4,0,.35,.04,.16,'#8c9078');break;
  case 'plant':cylinder(0,0,0,.3,.35,'#b7a084');for(let i=0;i<3;i++){box((i-1)*.13,.35,0,.035,.35,.035,'#8e9e7a');ball((i-1)*.13,.78,0,.13,['#c4b6cc','#d6c89b','#c1adc1'][i]);}break;
 }
 return g;
}
