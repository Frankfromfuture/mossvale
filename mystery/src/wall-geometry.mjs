import * as THREE from 'three';
const key=p=>p.x+','+p.z,round=n=>Math.round(n*1e6)/1e6;
const rectangle=(x0,z0,x1,z1)=>({x0:round(Math.min(x0,x1)),z0:round(Math.min(z0,z1)),x1:round(Math.max(x0,x1)),z1:round(Math.max(z0,z1))});
const contains=(r,x,z)=>x>r.x0&&x<r.x1&&z>r.z0&&z<r.z1;
const area=ps=>ps.reduce((n,p,i)=>{const q=ps[(i+1)%ps.length];return n+p.x*q.z-q.x*p.z;},0)/2;
/** Rectilinear union first: no coincident faces or per-tile caps at L/T junctions. */
export function footprintLoops(rectangles,holes=[]){
 if(!rectangles.length)return [];
 const all=[...rectangles,...holes],xs=[...new Set(all.flatMap(r=>[r.x0,r.x1]))].sort((a,b)=>a-b),zs=[...new Set(all.flatMap(r=>[r.z0,r.z1]))].sort((a,b)=>a-b),nx=xs.length-1,nz=zs.length-1,cells=new Uint8Array(nx*nz);
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=(xs[i]+xs[i+1])/2,z=(zs[j]+zs[j+1])/2;cells[j*nx+i]=rectangles.some(r=>contains(r,x,z))&&!holes.some(r=>contains(r,x,z))?1:0;}
 const occupied=(i,j)=>i>=0&&j>=0&&i<nx&&j<nz&&cells[j*nx+i],edges=[],starts=new Map();
 const edge=(x,z,ex,ez)=>{const e={a:{x,z},b:{x:ex,z:ez},used:false};edges.push(e);const k=key(e.a),list=starts.get(k)||[];list.push(e);starts.set(k,list);};
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++)if(occupied(i,j)){const x0=xs[i],x1=xs[i+1],z0=zs[j],z1=zs[j+1];if(!occupied(i,j-1))edge(x0,z0,x1,z0);if(!occupied(i+1,j))edge(x1,z0,x1,z1);if(!occupied(i,j+1))edge(x1,z1,x0,z1);if(!occupied(i-1,j))edge(x0,z1,x0,z0);}
 const loops=[];
 for(const first of edges){if(first.used)continue;const points=[];let e=first,guard=0;while(e&&!e.used&&guard++<=edges.length){e.used=true;points.push(e.a);const options=(starts.get(key(e.b))||[]).filter(a=>!a.used);if(key(e.b)===key(first.a))break;const dx=e.b.x-e.a.x,dz=e.b.z-e.a.z;options.sort((a,b)=>{const turn=a=>Math.atan2(dx*(a.b.z-a.a.z)-dz*(a.b.x-a.a.x),dx*(a.b.x-a.a.x)+dz*(a.b.z-a.a.z));return turn(b)-turn(a);});e=options[0];}
  const simple=points.filter((p,i)=>{const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];return Math.abs((p.x-a.x)*(b.z-p.z)-(p.z-a.z)*(b.x-p.x))>1e-9;});if(simple.length>=3)loops.push(simple);
 }
 return loops;
}
function inside(p,loop){let yes=false;for(let i=0,j=loop.length-1;i<loop.length;j=i++){const a=loop[i],b=loop[j];if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)yes=!yes;}return yes;}
function roundedPath(path,points,radius){
 const corners=points.map((p,i)=>{const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length],la=Math.hypot(a.x-p.x,a.z-p.z),lb=Math.hypot(b.x-p.x,b.z-p.z),r=Math.min(radius,la*.45,lb*.45);return {p:{x:p.x,y:-p.z},a:{x:p.x+(a.x-p.x)*r/la,y:-(p.z+(a.z-p.z)*r/la)},b:{x:p.x+(b.x-p.x)*r/lb,y:-(p.z+(b.z-p.z)*r/lb)}};});
 path.moveTo(corners[0].a.x,corners[0].a.y);for(let i=0;i<corners.length;i++){const c=corners[i];if(i)path.lineTo(c.a.x,c.a.y);path.quadraticCurveTo(c.p.x,c.p.y,c.b.x,c.b.y);}path.closePath();return path;
}
export function extrudeFootprint(rectangles,holes,low,high,color,radius=.055){
 const loops=footprintLoops(rectangles,holes),outer=loops.filter(p=>area(p)>0),voids=loops.filter(p=>area(p)<0),shapes=outer.map(p=>roundedPath(new THREE.Shape(),p,radius));
 for(const p of voids){const owner=outer.findIndex(a=>inside(p[0],a));if(owner>=0)shapes[owner].holes.push(roundedPath(new THREE.Path(),p,radius));}
 if(!shapes.length)return null;
 const geometry=new THREE.ExtrudeGeometry(shapes,{depth:high-low,bevelEnabled:false,curveSegments:4,steps:1});geometry.rotateX(-Math.PI/2);geometry.translate(0,low,0);const c=new THREE.Color(color),count=geometry.attributes.position.count,colors=new Float32Array(count*3);for(let i=0;i<count;i++){colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.userData={loops:loops.length,radius,low,high};return geometry;
}
export function mergeWallGeometry(parts){
 const result=new THREE.BufferGeometry(),attributes=['position','normal','color','uv'];for(const name of attributes){const length=parts.reduce((n,g)=>n+g.attributes[name].array.length,0),data=new Float32Array(length);let at=0;for(const g of parts){data.set(g.attributes[name].array,at);at+=g.attributes[name].array.length;}result.setAttribute(name,new THREE.BufferAttribute(data,name==='uv'?2:3));}result.computeBoundingBox();result.computeBoundingSphere();for(const g of parts)g.dispose();return result;
}
export function wallNetwork(walls,doors,b,width=.24){
 const half=width/2,rects=[rectangle(b.minX-half,b.minZ-half,b.maxX+half,b.minZ+half),rectangle(b.minX-half,b.maxZ-half,b.maxX+half,b.maxZ+half),rectangle(b.minX-half,b.minZ,b.minX+half,b.maxZ),rectangle(b.maxX-half,b.minZ,b.maxX+half,b.maxZ)],inner=walls.filter(o=>o.x>b.minX+.2&&o.x<b.maxX-.2&&o.z>b.minZ+.2&&o.z<b.maxZ-.2);let corners=0,tees=0;
 for(const o of inner){const neighbors=walls.filter(p=>p.id!==o.id&&((Math.abs(p.z-o.z)<.02&&Math.abs(p.x-o.x)<1.05)||(Math.abs(p.x-o.x)<.02&&Math.abs(p.z-o.z)<1.05)));const directions=new Set(neighbors.map(p=>Math.abs(p.x-o.x)>.1?(p.x>o.x?'E':'W'):(p.z>o.z?'S':'N')));if(directions.size===3)tees++;if(directions.size===2&&!(directions.has('E')&&directions.has('W'))&&!(directions.has('N')&&directions.has('S')))corners++;
  if(!neighbors.length)rects.push(rectangle(o.x-.5,o.z-half,o.x+.5,o.z+half));
  for(const p of neighbors)rects.push(rectangle(Math.min(o.x,p.x)-half,Math.min(o.z,p.z)-half,Math.max(o.x,p.x)+half,Math.max(o.z,p.z)+half));
  // A free end occupies its half-cell; a turn/T node stops at its joined wall face.
  if(directions.size===1){const p=neighbors[0],dx=Math.sign(o.x-p.x),dz=Math.sign(o.z-p.z);rects.push(rectangle(Math.min(o.x,o.x+dx*.5)-half*(dz?1:0),Math.min(o.z,o.z+dz*.5)-half*(dx?1:0),Math.max(o.x,o.x+dx*.5)+half*(dz?1:0),Math.max(o.z,o.z+dz*.5)+half*(dx?1:0)));}
 }
 for(const o of doors){const outside=Math.min(Math.abs(o.x-b.minX),Math.abs(o.x-b.maxX),Math.abs(o.z-b.minZ),Math.abs(o.z-b.maxZ))<.65;if(outside)continue;const turned=o.rotation%180===90;rects.push(rectangle(o.x-(turned?half:o.size.w/2+.06),o.z-(turned?o.size.w/2+.06:half),o.x+(turned?half:o.size.w/2+.06),o.z+(turned?o.size.w/2+.06:half)));}
 return {rects,corners:corners+4,tees};
}
export const openingRectangle=(axis,center,at,width)=>axis==='x'?rectangle(center-width/2,at-.65,center+width/2,at+.65):rectangle(at-.65,center-width/2,at+.65,center+width/2);
