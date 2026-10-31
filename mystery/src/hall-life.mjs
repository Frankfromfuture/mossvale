import * as THREE from 'three';
import {hallActivities} from '../shared/hall-activities.mjs';

export function buildHallLife(scene,hall){
 const root=new THREE.Group();root.name='hall-daily-objects';hall.add(root);
 const cylinder=(x,y,z,r,h,color)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r*.85,h,14),scene.mat(color));mesh.position.set(x,y+h/2,z);mesh.castShadow=true;root.add(mesh);return mesh;};
 const tea=hallActivities.tea.at;
 scene.roundBox(tea.x,1.125,tea.z,1.6,.045,.7,'#a58c69',root,.06,'wood');
 scene.ball(tea.x-.35,1.35,tea.z,.23,'#b3c3ae',root,[1,.8,1]);cylinder(tea.x-.35,1.5,tea.z,.12,.045,'#8f9f86');
 const spout=cylinder(tea.x-.12,1.32,tea.z,.055,.24,'#b3c3ae');spout.rotation.z=-1.0;
 const handle=new THREE.Mesh(new THREE.TorusGeometry(.14,.035,7,16),scene.mat('#8f9f86'));handle.position.set(tea.x-.59,1.36,tea.z);root.add(handle);
 for(const x of [.18,.53]){cylinder(tea.x+x,1.17,tea.z,.14,.025,'#d4c5a2');cylinder(tea.x+x,1.195,tea.z,.09,.12,'#e9dfc3');cylinder(tea.x+x,1.315,tea.z,.075,.005,'#8c7858');}
 const reading=hallActivities.reading.at;
 for(const side of [-1,1]){const page=scene.box(reading.x+side*.23,1.14,reading.z,.45,.035,.63,'#efe6ca',root,false);page.rotation.z=side*.055;for(let i=0;i<4;i++)scene.box(reading.x+side*.23,1.18,reading.z-.2+i*.12,.28,.005,.012,'#a49a82',root,false);}
 scene.roundBox(reading.x+.72,1.13,reading.z+.04,.3,.16,.48,'#a2b4a2',root,.025);scene.box(reading.x-.72,1.13,reading.z,.035,.035,.52,'#8b806b',root,false);
 const plant=hallActivities.plants.at;
 cylinder(plant.x,1.13,plant.z,.23,.32,'#c9ae89');cylinder(plant.x,1.45,plant.z,.21,.018,'#8d8367');
 for(let i=0;i<5;i++){const angle=i*2.4,x=plant.x+Math.cos(angle)*.23,z=plant.z+Math.sin(angle)*.15;scene.box(x,1.45,z,.025,.35+i*.035,.025,'#8c9b75',root,false);const leaf=scene.ball(x,1.76+i*.035,z,.18,i%2?'#aaba91':'#91a681',root,[1.35,.35,.65]);leaf.rotation.z=Math.sin(angle)*.5;}
 const fire=hallActivities.fire.at;scene.roundBox(fire.x+3.4,.29,fire.z,.65,.35,.55,'#b7a185',root,.07,'wood');
 for(let i=0;i<3;i++)scene.box(fire.x+3.2+i*.16,.64,fire.z,.11,.1,.5,'#9c896d',root,false);
 return root;
}
