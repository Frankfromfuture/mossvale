import * as THREE from 'three';
import {footprintLoops} from './wall-geometry.mjs';

const area=points=>points.reduce((a,p,i)=>{const q=points[(i+1)%points.length];return a+p.x*q.z-q.x*p.z;},0)/2;
function inside(p,loop){let yes=false;for(let i=0,j=loop.length-1;i<loop.length;j=i++){const a=loop[i],b=loop[j];if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)yes=!yes;}return yes;}
function roundedPath(path,points,radius){
 const corners=points.map((p,i)=>{const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length],la=Math.hypot(a.x-p.x,a.z-p.z),lb=Math.hypot(b.x-p.x,b.z-p.z),r=Math.min(radius,la*.45,lb*.45);return {p,a:{x:p.x+(a.x-p.x)*r/la,z:p.z+(a.z-p.z)*r/la},b:{x:p.x+(b.x-p.x)*r/lb,z:p.z+(b.z-p.z)*r/lb}};});
 path.moveTo(corners[0].a.x,-corners[0].a.z);
 for(const c of corners){path.lineTo(c.a.x,-c.a.z);path.quadraticCurveTo(c.p.x,-c.p.z,c.b.x,-c.b.z);}path.closePath();return path;
}
function shapes(rectangles,radius){
 const loops=footprintLoops(rectangles),outer=loops.filter(p=>area(p)>0),result=outer.map(p=>roundedPath(new THREE.Shape(),p,radius));
 for(const loop of loops.filter(p=>area(p)<0)){const owner=outer.findIndex(p=>inside(loop[0],p));if(owner>=0)result[owner].holes.push(roundedPath(new THREE.Path(),loop,radius));}
 return result;
}

// Join the wall plan before rounding, so L/T corners have one continuous edge.
export function buildSoftWalls(scene,parent){
 const segments=parent.userData.wallSegments,rect=s=>({x0:s.x-s.w/2,x1:s.x+s.w/2,z0:s.z-s.d/2,z1:s.z+s.d/2});
 const lower=segments.filter(s=>s.y<1).map(rect),upper=segments.map(rect),positions=[],normals=[],uvs=[];
 function addBand(rectangles,low,high,topBevel,keep){
  const bevel=.055,depth=high-low-(topBevel?bevel:0),geometry=new THREE.ExtrudeGeometry(shapes(rectangles,.14),{depth,steps:1,curveSegments:6,bevelEnabled:topBevel,bevelThickness:bevel,bevelSize:.04,bevelOffset:-.04,bevelSegments:3});
  geometry.rotateX(-Math.PI/2);geometry.translate(0,low,0);
  const p=geometry.attributes.position,n=geometry.attributes.normal;
  for(let i=0;i<p.count;i+=3){const ys=[p.getY(i),p.getY(i+1),p.getY(i+2)];if(!keep(ys,n.getY(i)))continue;
   for(let j=i;j<i+3;j++){const x=p.getX(j),y=p.getY(j),z=p.getZ(j);positions.push(x,y,z);normals.push(n.getX(j),n.getY(j),n.getZ(j));uvs.push((x+z)*.35,y*.35);}
  }geometry.dispose();
 }
 // The lower band has no hidden top cap; the upper band has no lower bevel.
 addBand(lower,.15,2.4,false,(ys,ny)=>!(ny>.9&&ys.every(y=>y>2.399)));
 addBand(upper,2.4,2.85,true,(ys,ny)=>ys.every(y=>y>=2.39999)&&!(ny<-.9));
 // Only the lintels need a visible underside at the join between the bands.
 for(const s of segments.filter(s=>s.y>2)){
  const g=new THREE.PlaneGeometry(s.w,s.d);g.rotateX(Math.PI/2);g.translate(s.x,2.4,s.z);const p=g.toNonIndexed();
  for(let i=0;i<p.attributes.position.count;i++){positions.push(p.attributes.position.getX(i),p.attributes.position.getY(i),p.attributes.position.getZ(i));normals.push(0,-1,0);uvs.push(p.attributes.position.getX(i)*.35,p.attributes.position.getZ(i)*.35);}p.dispose();g.dispose();
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const mesh=new THREE.Mesh(geometry,scene.mat(segments[0].color,'plaster'));mesh.castShadow=true;mesh.receiveShadow=true;mesh.name='continuous-rounded-walls';parent.add(mesh);
 return segments.filter(s=>s.y<2.25).map(s=>({minX:s.x-s.w/2,maxX:s.x+s.w/2,minZ:s.z-s.d/2,maxZ:s.z+s.d/2}));
}
