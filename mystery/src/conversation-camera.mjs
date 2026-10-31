import * as THREE from 'three';
export class ConversationCamera{
 constructor(scene){this.scene=scene;this.actor=null;this.saved=null;}
 reset(){const s=this.scene,v=this.saved;this.setActor(null);if(v){s.camera.position.copy(v.position);s.controls.target.copy(v.target);s.camera.zoom=v.zoom;s.controls.maxZoom=v.maxZoom;s.controls.enabled=v.enabled;s.distantPass.enabled=v.tilt;s.camera.lookAt(v.target);s.camera.updateProjectionMatrix();}this.saved=null;}
 setActor(id){
  if(id===this.actor)return;
  const s=this.scene;if(id&&!s.actors.get(id)?.g.visible)id=null;
  if(id&&!this.saved)this.saved={position:s.camera.position.clone(),target:s.controls.target.clone(),zoom:s.camera.zoom,maxZoom:s.controls.maxZoom,enabled:s.controls.enabled,tilt:s.distantPass.enabled,width:s.host.clientWidth,height:s.host.clientHeight};
  this.actor=id;s.host.dataset.focusActor=id||'';document.body.classList.toggle('dialogue-closeup',!!id);
  if(this.saved){s.controls.enabled=false;s.controls.maxZoom=12;s.focusTarget=null;}
 }
 tick(dt){
  const s=this.scene,saved=this.saved;if(!saved)return false;
  const a=1-Math.exp(-dt*5.5);let target,position,zoom;
  if(this.actor){
   const actor=s.actors.get(this.actor);if(!actor?.g.visible){this.setActor(null);return this.tick(dt);}
   const w=s.host.clientWidth,h=s.host.clientHeight,panel=document.querySelector('.rpg-dialogue')?.getBoundingClientRect(),ribbon=document.querySelector('.people-ribbon')?.getBoundingClientRect();
   const top=Math.max(78,(ribbon?.bottom||85)+12),bottom=Math.max(top+60,(panel?.top||h*.53)-14),space=bottom-top;
   zoom=THREE.MathUtils.clamp(36*space/h/1.8,2.6,10.5);
   actor.g.updateMatrixWorld(true);const face=actor.rig.head.getWorldPosition(new THREE.Vector3());face.y-=.14;
   const yaw=actor.g.rotation.y+(actor.rig.gaze||0)+.48,direction=new THREE.Vector3(Math.sin(yaw),.42,Math.cos(yaw)).normalize();
   const up=new THREE.Vector3(0,1,0).addScaledVector(direction,-direction.y).normalize();
   target=face.addScaledVector(up,((top+bottom)/2-h/2)*36/h/zoom);
   position=target.clone().addScaledVector(direction,45);s.distantPass.enabled=false;
  }else{target=saved.target;position=saved.position;zoom=saved.zoom;}
  const distance=s.camera.position.distanceTo(s.controls.target),goalRotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(position,target,new THREE.Vector3(0,1,0)));
  s.controls.target.lerp(target,a);s.camera.quaternion.slerp(goalRotation,a);s.camera.position.copy(s.controls.target).addScaledVector(new THREE.Vector3(0,0,1).applyQuaternion(s.camera.quaternion),THREE.MathUtils.lerp(distance,position.distanceTo(target),a));s.camera.zoom=THREE.MathUtils.lerp(s.camera.zoom,zoom,a);s.camera.updateProjectionMatrix();
  if(!this.actor&&s.camera.position.distanceTo(position)<.015&&Math.abs(s.camera.zoom-zoom)<.005){s.camera.position.copy(position);s.controls.target.copy(target);s.camera.zoom=zoom;s.controls.maxZoom=saved.maxZoom;s.controls.enabled=saved.enabled;s.distantPass.enabled=saved.tilt;s.camera.lookAt(target);s.camera.updateProjectionMatrix();this.saved=null;if(saved.width!==s.host.clientWidth||saved.height!==s.host.clientHeight)s.focus(s.current.room,s.overview);}
  return true;
 }
}
