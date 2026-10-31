import * as THREE from 'three';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';

export function makeToonRamp(){
 const ramp=new THREE.DataTexture(new Uint8Array([120,179,242]),3,1,THREE.RedFormat);
 ramp.minFilter=ramp.magFilter=THREE.NearestFilter;ramp.generateMipmaps=false;ramp.needsUpdate=true;
 return ramp;
}

// Reuse the beauty pass depth, so ink needs no extra geometry/normal render.
// A second depth difference ignores the steady slope of floors and walls.
export class ComicInkPass extends ShaderPass{
 constructor(camera){
  super({uniforms:{tDiffuse:{value:null},tDepth:{value:null},pixel:{value:new THREE.Vector2(1,1)},depthRange:{value:600},worldPixel:{value:.01},cameraWorld:{value:new THREE.Matrix4()},projectionInverse:{value:new THREE.Matrix4()},ink:{value:new THREE.Color('#000000')},strength:{value:.85}},
   vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:`uniform sampler2D tDiffuse,tDepth; uniform vec2 pixel; uniform float depthRange,worldPixel,strength; uniform vec3 ink; uniform mat4 cameraWorld,projectionInverse; varying vec2 vUv;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){
    vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
   }
   void main(){
    vec4 source=texture2D(tDiffuse,vUv);
    float depth=texture2D(tDepth,vUv).x;
    vec4 position=cameraWorld*projectionInverse*vec4(vUv*2.-1.,depth*2.-1.,1.);
    vec3 world=position.xyz/position.w;
    // Marks belong to the scene, not the frame: no time noise or crawling grain.
    vec2 paper=vec2(world.x+world.y*.47,world.z+world.y*.73);
    float pressure=noise(paper*6.3);
    float width=.9+pressure*.25;
    vec2 wobble=vec2(noise(paper*8.7),noise(paper*8.7+vec2(19.3,7.1)))-.5;
    vec2 uv=vUv+pixel*wobble*.2;
    vec2 stride=pixel*width;
    float c=texture2D(tDepth,uv).x;
    float l=texture2D(tDepth,uv-vec2(stride.x,0.)).x;
    float r=texture2D(tDepth,uv+vec2(stride.x,0.)).x;
    float b=texture2D(tDepth,uv-vec2(0.,stride.y)).x;
    float t=texture2D(tDepth,uv+vec2(0.,stride.y)).x;
    float bend=max(abs(l+r-2.*c),abs(t+b-2.*c))*depthRange;
    float threshold=max(.035,worldPixel*width*.8);
    float contour=smoothstep(threshold,threshold*1.8,bend);
    // Fine graphite strokes retain slight pressure variation without wax pinholes.
    float grain=noise(paper*vec2(180.,32.));
    float tooth=mix(.9,1.,grain);
    float deposit=mix(.93,1.,noise(paper*23.+vec2(7.7,11.3)));
    float nearer=step(c,min(min(l,r),min(b,t))+.000015);
    float edge=contour*mix(.62,1.,nearer)*tooth*deposit;
    gl_FragColor=vec4(mix(source.rgb,min(source.rgb,ink),edge*strength),source.a);
   }`});
  this.camera=camera;
 }
 render(renderer,writeBuffer,readBuffer,deltaTime,maskActive){
  const ratio=renderer.getPixelRatio(),width=readBuffer.width,height=readBuffer.height;
  this.uniforms.tDepth.value=readBuffer.depthTexture;
  this.uniforms.pixel.value.set(ratio/width,ratio/height);
  this.uniforms.depthRange.value=this.camera.far-this.camera.near;
  this.uniforms.worldPixel.value=(this.camera.top-this.camera.bottom)/this.camera.zoom/height*ratio;
  this.uniforms.cameraWorld.value.copy(this.camera.matrixWorld);
  this.uniforms.projectionInverse.value.copy(this.camera.projectionMatrixInverse);
  super.render(renderer,writeBuffer,readBuffer,deltaTime,maskActive);
 }
}
