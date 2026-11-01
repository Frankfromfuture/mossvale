import * as THREE from 'three';
import {bounds} from '../shared/layout.mjs';
import {destinations,placeAnchor} from './location-map.mjs';

export function captureSceneMap(scene){
 const bounds=scene.layoutBounds,locations=scene.definition?scene.layoutRooms.filter(r=>r.walkable!==false):destinations;
 const {renderer,composer,camera}=scene,size=renderer.getSize(new THREE.Vector2()),ratio=renderer.getPixelRatio(),saved=camera.clone();
 const distant=scene.distantPass.enabled,outline=scene.outline.enabled,width=1100,height=800;
 try{
  renderer.setPixelRatio(1);renderer.setSize(width,height,false);composer.setPixelRatio(1);composer.setSize(width,height);
  camera.left=-18*width/height;camera.right=18*width/height;camera.top=18;camera.bottom=-18;
  camera.position.set(70,95,100);camera.lookAt(0,1.15,0);camera.updateMatrixWorld(true);
  const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion),rw=bounds.maxX-bounds.minX+2,rd=bounds.maxZ-bounds.minZ+2;
  camera.zoom=Math.min(36*width/height/(Math.abs(right.x)*rw+Math.abs(right.z)*rd),36/(Math.abs(up.x)*rw+Math.abs(up.z)*rd+Math.abs(up.y)*3.4))*.91;
  camera.updateProjectionMatrix();scene.distantPass.enabled=false;scene.outline.enabled=false;composer.render();
  const markers=locations.map(r=>{const a=placeAnchor(r),p=new THREE.Vector3(a.x,a.y,a.z).project(camera);return {id:r.id,x:(p.x+1)/2,y:(1-p.y)/2};});
  return {url:renderer.domElement.toDataURL('image/png'),width,height,markers};
 }finally{
  camera.copy(saved);camera.updateMatrixWorld(true);renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);composer.setPixelRatio(ratio);composer.setSize(size.x,size.y);
  scene.distantPass.enabled=distant;scene.outline.enabled=outline;scene.distantPass.uniforms.resolution.value.copy(renderer.getDrawingBufferSize(new THREE.Vector2()));composer.render();
 }
}
