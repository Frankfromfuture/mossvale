import * as THREE from 'three';

function noise(t,seed){const hash=n=>{let x=Math.imul(n+seed,374761393);x=Math.imul(x^(x>>>13),1274126177);return ((x^(x>>>16))>>>0)/4294967295;},i=Math.floor(t),f=t-i,s=f*f*(3-2*f);return (hash(i)*(1-s)+hash(i+1)*s)*2-1;}
function flowTexture(){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#9fc2c4';ctx.fillRect(0,0,1024,256);
 let seed=4021;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<38;i++){const y=random()*256;ctx.strokeStyle=i%2?'#87b1b326':'#c3d8cc25';ctx.lineWidth=4+random()*18;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(340,y-5,680,y+5,1024,y);ctx.stroke();}
 for(let i=0;i<140;i++){
  const x=random()*1024,y=12+random()*232,length=12+random()*56,bend=(random()-.5)*8;
  ctx.strokeStyle=i%3?'rgba(230,239,218,.42)':'rgba(103,152,157,.3)';ctx.lineWidth=.7+random()*1.6;ctx.lineCap='round';
  for(const wrap of [-1024,0,1024]){ctx.beginPath();ctx.moveTo(x+wrap,y);ctx.quadraticCurveTo(x+wrap+length*.5,y+bend,x+wrap+length,y);ctx.stroke();}
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;return texture;
}

export function buildRiver(scene,{enhanced=false,surfaceMaterial=null,offset=[0,0]}={}){
 const curve=new THREE.CatmullRomCurve3([[-45,58],[-39,34],[-34,8],[-34,-19],[-22,-32],[2,-34],[30,-33],[55,-43]].map(([x,z])=>new THREE.Vector3(x+offset[0],0,z+offset[1])));
 const samples=256,centerline=curve.getSpacedPoints(samples),length=curve.getLength(),edges=centerline.map((p,i)=>{
  const s=i/samples*length,dir=curve.getTangentAt(i/samples),normal=new THREE.Vector2(dir.z,-dir.x).normalize();
  return {p,s,normal,left:2.65+.40*noise(s/7,12)+.18*noise(s/1.9,31),right:2.65+.43*noise(s/8,53)+.19*noise(s/2.3,82)};
 });
 const ribbon=(margin,y,color,map=null)=>{
  const vertices=[],uv=[],indices=[];
  for(let i=0;i<=samples;i++){const {p,s,normal,left,right}=edges[i],fray=margin?.10*noise(s/2.5,101):0;vertices.push(p.x+normal.x*(left+margin+fray),y,p.z+normal.y*(left+margin+fray),p.x-normal.x*(right+margin-fray),y,p.z-normal.y*(right+margin-fray));uv.push(s/14,0,s/14,1);if(i<samples){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,map,side:THREE.DoubleSide}));scene.add(mesh);return mesh;
 };
 const banks=[ribbon(1.65,.066,'#aab99f'),ribbon(.78,.071,'#b7c6aa')],texture=flowTexture(),water=ribbon(0,.078,'#ffffff',texture);water.name='flowing-river';
 let time;
 if(enhanced){
  banks.forEach((bank,i)=>{bank.material.dispose();bank.material=new THREE.MeshBasicMaterial({map:shoreTexture(i),transparent:true,depthWrite:false,side:THREE.DoubleSide});bank.renderOrder=0;});
  time={value:0};water.material.dispose();water.material=flowMaterial(time);
 }
 const dressing=enhanced?dressBanks(scene,edges,surfaceMaterial):null;
 return {water,banks,centerline,edges,texture,dressing,update:dt=>{texture.offset.x=(texture.offset.x-dt*.035)%1;if(time)time.value+=dt;}};
}


function shoreTexture(wet){
 const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d'),im=ctx.createImageData(512,128);
 const base=wet?[148,153,126]:[173,186,145];
 for(let y=0;y<128;y++)for(let x=0;x<512;x++){
  const n=noise(x/20,17)+noise(x/5+y/11,73)*.5,edge=Math.min(y,127-y)/64,fade=THREE.MathUtils.smoothstep(edge,.01+Math.max(0,n)*.035,.13+Math.max(0,n)*.06),i=(y*512+x)*4;
  for(let k=0;k<3;k++)im.data[i+k]=base[k]+n*7;im.data[i+3]=Math.round(fade*255);
 }
 ctx.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;return t;
}
function flowMaterial(time){
 return new THREE.ShaderMaterial({side:THREE.DoubleSide,fog:true,uniforms:{...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),riverTime:time,deep:{value:new THREE.Color('#739fa4')},shallow:{value:new THREE.Color('#b9cdbb')},glint:{value:new THREE.Color('#e4ead3')}},
 vertexShader:`varying vec2 riverUV;
 #include <fog_pars_vertex>
 void main(){riverUV=uv;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
 #include <fog_vertex>
 }`,
 fragmentShader:`uniform float riverTime;uniform vec3 deep,shallow,glint;varying vec2 riverUV;
 #include <fog_pars_fragment>
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
 void main(){
  vec2 p=vec2(riverUV.x*14.,riverUV.y);float t=riverTime;
  float bank=pow(abs(p.y*2.-1.),2.4);vec3 color=mix(deep,shallow,smoothstep(.08,.98,bank));
  float broad=noise2(vec2(p.x*.48-t*.06,p.y*7.+sin(p.x*.18)*.25));color*=.94+.12*broad;
  // Short, broken highlights travel along the curve's arc-length UVs.
  float bend=sin(p.x*1.8-t*.48)*.018+sin(p.x*.71+t*.21)*.013;
  float wave=sin((p.y+bend)*103.+p.x*.7-t*.75);
  float gleam=smoothstep(.94,1.,wave)*smoothstep(.58,.82,noise2(vec2(p.x*2.-t*.36,p.y*28.)));
  color=mix(color,glint,gleam*.24);
  float shoreWave=sin(p.x*3.1-t*.56)*.0035;
  float rim=1.-smoothstep(.008,.035,min(p.y,1.-p.y)+shoreWave);
  rim*=smoothstep(.48,.76,noise2(vec2(p.x*.9-t*.025,p.y*4.)));
  color=mix(color,glint,rim*.34);
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
 }`});
}
function dressBanks(scene,edges,surfaceMaterial){
 const rocks=[],tufts=[];let seed=6839;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=4;i<edges.length-4;i+=4){
  const e=edges[i],side=random()<.5?-1:1,width=side>0?e.left:e.right,offset=width+.12+random()*.48;
  if(random()<.68)rocks.push({x:e.p.x+e.normal.x*offset*side,z:e.p.z+e.normal.y*offset*side,r:.13+random()*.19,turn:random()*Math.PI});
  if(random()<.72)tufts.push({x:e.p.x+e.normal.x*(width+.5+random()*.4)*side,z:e.p.z+e.normal.y*(width+.5+random()*.4)*side,h:.18+random()*.28,turn:random()*Math.PI});
 }
 const rockGeo=new THREE.SphereGeometry(1,8,5),rockMat=surfaceMaterial?surfaceMaterial('#aaa995','stone'):new THREE.MeshToonMaterial({color:'#aaa995'}),rockMesh=new THREE.InstancedMesh(rockGeo,rockMat,rocks.length),dummy=new THREE.Object3D();
 rocks.forEach((r,i)=>{dummy.position.set(r.x,.064+r.r*.35,r.z);dummy.rotation.set(.1,r.turn,.1);dummy.scale.set(r.r*1.3,r.r*.68,r.r);dummy.updateMatrix();rockMesh.setMatrixAt(i,dummy.matrix);rockMesh.setColorAt(i,new THREE.Color().setScalar(.85+random()*.15));});rockMesh.receiveShadow=true;rockMesh.name='river-rounded-stones';scene.add(rockMesh);
 const g=new THREE.BufferGeometry(),v=[];
 for(const a of [0,Math.PI/3,Math.PI*2/3]){const x=Math.cos(a)*.15,z=Math.sin(a)*.15;v.push(-x,0,-z,x,0,z,x*.4,1,z*.4);}
 g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();const grass=new THREE.InstancedMesh(g,new THREE.MeshToonMaterial({color:'#879c79',side:THREE.DoubleSide}),tufts.length);
 tufts.forEach((r,i)=>{dummy.position.set(r.x,.068,r.z);dummy.rotation.set(0,r.turn,0);dummy.scale.set(.7,r.h,.7);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);});grass.name='river-bank-grass';scene.add(grass);
 return {rocks:rockMesh,grass};
}
