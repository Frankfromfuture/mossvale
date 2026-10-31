import * as THREE from 'three';
import {buildings} from '../shared/layout.mjs';

function softMask(round){
 const c=document.createElement('canvas');c.width=c.height=96;const ctx=c.getContext('2d'),im=ctx.createImageData(96,96);
 for(let y=0;y<96;y++)for(let x=0;x<96;x++){
  const a=Math.abs((x+.5)/48-1),b=Math.abs((y+.5)/48-1),q=round?Math.hypot(a,b):Math.pow(a**6+b**6,1/6),t=Math.max(0,1-q),i=(y*96+x)*4;
  im.data[i]=im.data[i+1]=im.data[i+2]=255;im.data[i+3]=Math.round(255*t*t*(3-2*t));
 }
 ctx.putImageData(im,0,0);return new THREE.CanvasTexture(c);
}
export function createContactShadows(){
 const rectangle=softMask(false),circle=softMask(true),material=map=>new THREE.MeshBasicMaterial({color:'#625a48',map,transparent:true,opacity:.25,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const actorMaterial=material(circle);actorMaterial.opacity=.28;
 const floorAt=(x,z)=>buildings.some(b=>Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2)?.259:Math.abs(x)<3&&z>1&&z<4?.169:.1;
 function actorShadow(){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.88),actorMaterial);mesh.rotation.x=-Math.PI/2;mesh.position.y=.259;mesh.raycast=()=>{};mesh.name='soft-foot-contact';return mesh;}
 function buildStatic(town){
  town.scene.updateMatrixWorld(true);const vertices=[],uv=[],indices=[];let count=0;
  function patch(x,z,w,d,y){const k=vertices.length/3;vertices.push(x-w/2,y,z-d/2,x-w/2,y,z+d/2,x+w/2,y,z+d/2,x+w/2,y,z-d/2);uv.push(0,0,0,1,1,1,1,0);indices.push(k,k+1,k+2,k,k+2,k+3);count++;}
  for(const mesh of town.obstacleMeshes){const b=new THREE.Box3().setFromObject(mesh);if(b.min.y<.40&&b.max.y>.50&&b.max.x-b.min.x<7&&b.max.z-b.min.z<7)patch((b.min.x+b.max.x)/2,(b.min.z+b.max.z)/2,b.max.x-b.min.x+.24,b.max.z-b.min.z+.24,floorAt((b.min.x+b.max.x)/2,(b.min.z+b.max.z)/2));}
  for(const b of buildings){const shell=town.shells.get(b.id);for(const s of shell.walls.userData.wallSegments.filter(s=>s.y<1)){
   const x0=Math.max(s.x-s.w/2-.23,b.x-b.w/2+.16),x1=Math.min(s.x+s.w/2+.23,b.x+b.w/2-.16),z0=Math.max(s.z-s.d/2-.23,b.z-b.d/2+.16),z1=Math.min(s.z+s.d/2+.23,b.z+b.d/2-.16);
   if(x1>x0&&z1>z0)patch((x0+x1)/2,(z0+z1)/2,x1-x0,z1-z0,.259);
  }}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeBoundingSphere();
  const mesh=new THREE.Mesh(g,material(rectangle));mesh.name='furniture-wall-contact';mesh.raycast=()=>{};mesh.userData.patches=count;town.scene.add(mesh);return mesh;
 }
 function updateActors(actors){for(const {g,rig}of actors.values())rig.shadow.position.y=floorAt(g.position.x,g.position.z);}
 return {actorShadow,buildStatic,updateActors};
}
