import * as THREE from 'three';
import {villaStations} from '../shared/suspect7/activities.mjs';

export function buildVillaLife(town,room,root){
 const group=new THREE.Group();group.name='villa-daily-objects-'+room.id;root.add(group);
 const box=(x,y,z,w,h,d,c,k='wood')=>town.roundBox(x,y,z,w,h,d,c,group,Math.min(.06,h/4),k);
 const ball=(x,y,z,r,c,scale=[1,1,1])=>town.ball(x,y,z,r,c,group,scale);
 const cylinder=(x,y,z,r,h,c)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r*.88,h,12),town.mat(c));m.position.set(x,y+h/2,z);m.castShadow=true;group.add(m);return m;};
 const paper=(x,y,z,w=.55,d=.65)=>{box(x,y,z,w,.018,d,'#eee6cf','paper');for(let i=0;i<3;i++)box(x,y+.02,z-d*.25+i*d*.2,w*.65,.004,.008,'#b2ad94','paper');};
 const book=(x,y,z,c,w=.45,d=.6)=>{box(x,y,z,w,.09,d,c);box(x,y+.025,z+.02,w-.03,.045,d-.05,'#e7dfc7','paper');};
 const plant=(x,y,z)=>{cylinder(x,y,z,.3,.4,'#bea180');cylinder(x,y+.4,z,.27,.02,'#827b60');for(let i=0;i<6;i++){const a=i*2.4,dx=Math.cos(a)*.27,dz=Math.sin(a)*.22;box(x+dx,y+.4,z+dz,.025,.4+i*.035,.025,'#8b9871');const leaf=ball(x+dx,y+.8+i*.035,z+dz,.22,i%2?'#a9bb91':'#8fA57d',[1.4,.32,.7]);leaf.rotation.z=Math.sin(a)*.45;}};
 const cup=(x,y,z)=>{cylinder(x,y,z,.17,.025,'#c8baa0');cylinder(x,y+.025,z,.11,.16,'#e4dfc8');cylinder(x,y+.185,z,.09,.006,'#998261');};
 const stations=villaStations(room),tea=stations.tea.at,reading=stations.reading.at;
 // Fixed shallow cabinets leave the door and both sides of the discussion table open.
 box(tea.x,.28,tea.z,1.8,.84,.9,'#ac987a');box(tea.x,1.12,tea.z,1.92,.08,1,'#c3ae8b');
 for(const dx of [-.43,.43]){box(tea.x+dx,.4,tea.z+.46,.77,.6,.035,'#b5a181');box(tea.x+dx,.7,tea.z+.5,.2,.035,.04,'#786e59');}
 box(tea.x,1.2,tea.z,1.55,.035,.67,'#8b8f7c');
 ball(tea.x-.43,1.42,tea.z,.22,'#bdc9b1',[1,.85,1]);cylinder(tea.x-.43,1.59,tea.z,.12,.035,'#899d84');
 const spout=cylinder(tea.x-.2,1.36,tea.z,.045,.23,'#bdc9b1');spout.rotation.z=-.9;
 const handle=new THREE.Mesh(new THREE.TorusGeometry(.13,.03,6,14),town.mat('#8e9b81'));handle.position.set(tea.x-.65,1.44,tea.z);group.add(handle);
 cup(tea.x+.15,1.24,tea.z);cup(tea.x+.57,1.24,tea.z);
 if(room.id==='lounge')town.table(reading.x,reading.z,1.9,1,group);
 book(reading.x-.25,1.14,reading.z,'#899f91');paper(reading.x+.35,1.14,reading.z,.52,.7);
 cylinder(reading.x+.65,1.14,reading.z-.2,.12,.23,'#aa9878');for(let i=0;i<3;i++)box(reading.x+.59+i*.06,1.31,reading.z-.2,.024,.24,.024,['#81795e','#8e9c87','#b19a78'][i]);
 if(room.id==='lounge'){
  const x=room.x,z=room.z;
  box(x,.28,z-4.6,3.4,.48,1.25,'#8f9e89','cloth');box(x,.76,z-5.12,3.4,.65,.23,'#83937e','cloth');
  for(const side of [-1,1]){box(x+side*1.55,.65,z-4.6,.28,.46,1.25,'#89977f','cloth');box(x+side*.9,.76,z-4.6,.65,.16,.65,side<0?'#c9b58f':'#b1baa1','cloth');}
  box(x,.28,z,2.9,.52,1.8,'#ac9474');box(x,.8,z,3.05,.08,1.95,'#c3ac86');
  book(x-.7,.88,z,'#96a394');box(x+.55,.88,z+.1,.6,.09,.37,'#c5b699');for(let i=0;i<4;i++)paper(x+.5,.98+i*.006,z+.1,.36,.23);
  const chess=stations.chess.at;town.table(chess.x,chess.z,1.8,1,group);box(chess.x,1.14,chess.z,.86,.035,.86,'#b5a17e');
  for(let a=0;a<6;a++)for(let b=0;b<6;b++)if((a+b)%2===0)box(chess.x+(a-2.5)*.13,1.178,chess.z+(b-2.5)*.13,.126,.006,.126,'#73816c');
  for(const [dx,dz,c] of [[-.32,-.32,'#606c60'],[-.06,.2,'#ddd5be'],[.2,-.06,'#606c60'],[.32,.32,'#ddd5be']]){cylinder(chess.x+dx,1.19,chess.z+dz,.055,.09,c);ball(chess.x+dx,1.31,chess.z+dz,.052,c);}
  box(chess.x+.64,1.14,chess.z,.28,.035,.28,'#a2ac95');plant(stations.plants.at.x,.28,stations.plants.at.z);
  // Low bookcase, radio, framed print and lamp fill the perimeter without blocking sightlines.
  box(x+8.8,.28,z-1.9,.65,1.45,2.5,'#b4a080');for(let row=0;row<2;row++)for(let i=0;i<6;i++)box(x+8.8,.4+row*.65,z-2.85+i*.34,.45,.42,.2,['#8c9b87','#b9a88a','#a1b6b0'][i%3]);
  box(x+8.8,1.74,z-1.7,.5,.35,.75,'#7c8c79');for(let i=0;i<4;i++)box(x+9.06,1.8,z-1.95+i*.14,.015,.2,.02,'#c8c7aa');
  box(x-8.7,.28,z+.5,.12,1.6,.12,'#8c856f');cylinder(x-8.7,1.88,z+.5,.43,.42,'#e4d5b4');
  box(x-2.9,.8,z-6.65,1.45,1.15,.07,'#9c8b6d');box(x-2.9,.91,z-6.6,1.2,.93,.025,'#b6c2a4','paper');
 }else if(room.id==='meeting'){
  const board=stations.board.at;box(board.x,.28,board.z,2.8,.75,.55,'#ac987b');box(board.x,1.2,board.z,2.8,1.2,.12,'#a3ac92');
  for(let i=0;i<4;i++)box(board.x-.9+i*.58,1.44+(i%2)*.24,board.z+.075,.38,.42,.012,'#e5dabe','paper');
  box(reading.x,1.14,reading.z-.65,.8,.18,.36,'#8d9d8a');for(let i=0;i<3;i++)book(reading.x-.24+i*.22,1.16,reading.z-.65,['#9bac9a','#b9a681','#91a8a1'][i],.2,.3);
  box(room.x+6.8,.28,room.z-1.1,.6,1.65,1.5,'#b4a080');for(let row=0;row<2;row++)for(let i=0;i<4;i++)box(room.x+6.8,.43+row*.7,room.z-1.62+i*.32,.42,.48,.22,['#a3b3a0','#bfae8d','#8d9f96'][i%3]);
  box(room.x+.4,1.14,room.z,1.1,.04,.7,'#bac2b0');for(let i=0;i<3;i++)paper(room.x+.4,1.18+i*.025,room.z,.75,.5);cylinder(room.x-.7,1.14,room.z,.1,.21,'#ad9874');
  plant(room.x-7,.28,room.z+5.1);
 }
 return group;
}
