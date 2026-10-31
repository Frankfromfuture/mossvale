import * as THREE from 'three';

// Original, deterministic textures. Grain stays attached to the object.
function random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function texture(kind){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),r=random({wood:172,cloth:409,plaster:751,stone:839}[kind]);
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,256,256);
 if(kind==='wood'){
  for(let i=0;i<88;i++){
   const y=r()*256,a=1+r()*3,phase=r()*Math.PI*2;ctx.strokeStyle=`rgba(85,53,24,${.025+r()*.12})`;ctx.lineWidth=.35+r()*.85;
   for(const shift of [-256,0,256]){ctx.beginPath();for(let x=0;x<=256;x+=4){const py=y+shift+Math.sin(x/256*Math.PI*2+phase)*a+Math.sin(x/256*Math.PI*4+phase)*.7;x?ctx.lineTo(x,py):ctx.moveTo(x,py);}ctx.stroke();}
  }
  for(let i=0;i<7;i++){const y=r()*256;ctx.fillStyle='rgba(255,250,228,.35)';ctx.fillRect(0,y,256,.7);}
 }else if(kind==='cloth'){
  for(let n=0;n<256;n+=4){ctx.fillStyle=n%8?'rgba(72,65,52,.06)':'rgba(72,65,52,.1)';ctx.fillRect(n,0,1,256);ctx.fillRect(0,n,256,1);ctx.fillStyle='rgba(255,252,238,.45)';ctx.fillRect(n+1,0,1,256);}
 }else if(kind==='plaster'){
  for(let i=0;i<280;i++){ctx.fillStyle=`rgba(100,93,77,${.008+r()*.025})`;ctx.beginPath();ctx.ellipse(r()*256,r()*256,2+r()*9,.5+r()*2,r()*Math.PI,0,Math.PI*2);ctx.fill();}
 }else if(kind==='stone'){
  for(let i=0;i<140;i++){ctx.fillStyle=`rgba(76,78,67,${.03+r()*.09})`;ctx.beginPath();ctx.ellipse(r()*256,r()*256,2+r()*8,1+r()*5,r()*Math.PI,0,Math.PI*2);ctx.fill();}
 }
 for(let i=0;i<1800;i++){ctx.fillStyle=`rgba(73,67,55,${r()*(kind==='stone'?.13:.065)})`;ctx.fillRect(r()*256,r()*256,.5+r()*1.1,.5+r()*1.1);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;t.name='handmade-'+kind;return t;
}
export function createSurfaceMaterials(gradientMap){
 const maps=new Map(),materials=new Map();
 return (color,kind)=>{
  const key=kind+':'+color;if(materials.has(key))return materials.get(key);
  if(!maps.has(kind))maps.set(kind,texture(kind));
  const material=new THREE.MeshToonMaterial({color,map:maps.get(kind),gradientMap});material.name=key;material.userData.surface=kind;
  if(kind==='plaster'){
   material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float surfaceHeight;').replace('#include <begin_vertex>','#include <begin_vertex>\nsurfaceHeight=(modelMatrix*vec4(position,1.0)).y;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float surfaceHeight;').replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb*=mix(.84,1.,smoothstep(.15,.75,surfaceHeight));');
   };material.customProgramCacheKey=()=> 'plaster-foot-v1';
  }
  materials.set(key,material);return material;
 };
}

// Physical-scale UVs; a table top runs along its length, a leg along its height.
export function surfaceUVs(geometry,kind,w,h,d){
 const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv,scale=kind==='cloth'?2.2:kind==='stone'?1.3:.65;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));let u,v;
  if(ny>=nx&&ny>=nz){u=w>=d?x:z;v=w>=d?z:x;}
  else if(nx>nz){u=h>d?y:z;v=h>d?z:y;}
  else{u=h>w?y:x;v=h>w?x:y;}
  uv.setXY(i,u*scale,v*scale);
 }
 uv.needsUpdate=true;
}
