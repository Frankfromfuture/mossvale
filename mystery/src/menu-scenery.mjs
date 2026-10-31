export const menuSceneryMarkup='<div class="menu-scenery" aria-hidden="true"><div class="menu-depth menu-depth-background"><div class="menu-art-plane"><img class="menu-background-art" src="art/menu/reading-valley-v3.png" width="1536" height="1024" alt="" draggable="false"/><div class="menu-atmosphere"><span class="menu-fog menu-fog-far"></span><span class="menu-fog menu-fog-middle"></span><span class="menu-fog menu-fog-near"></span><span class="menu-fog menu-fog-low"></span></div></div></div><div class="menu-depth menu-depth-foreground"><div class="menu-art-plane"><img class="menu-interior-art" src="art/menu/reading-interior-v3.png" width="1536" height="1024" alt="" draggable="false"/></div></div></div>';

// Only the title page responds to drags; buttons and scrollable panels keep native input.
export function bindMenuScenery(root){
 const reduced=window.matchMedia('(prefers-reduced-motion:reduce)');
 let active=false,gesture=null,frame=0;
 const clamp=n=>Math.max(-1,Math.min(1,n));
 function reset(){
  const id=gesture?.id;gesture=null;
  if(id!==undefined&&root.hasPointerCapture(id))root.releasePointerCapture(id);
  root.classList.remove('menu-dragging');
  root.style.setProperty('--menu-touch-x','0');root.style.setProperty('--menu-touch-y','0');
 }
 function refresh(){
  reset();
  const menu=root.querySelector('.start-menu');
  root.classList.toggle('menu-parallax-ready',active&&!reduced.matches&&!!menu&&menu.scrollHeight<=menu.clientHeight+1);
 }
 function setActive(value){
  active=!!value;reset();root.classList.remove('menu-parallax-ready');
  cancelAnimationFrame(frame);frame=requestAnimationFrame(refresh);
 }
 root.addEventListener('pointerdown',e=>{
  if(!e.isPrimary){reset();return;}
  if(!root.classList.contains('menu-parallax-ready')||e.button!==0||e.target.closest('button,a,input,textarea,select,[contenteditable]'))return;
  e.preventDefault();
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY};
  root.setPointerCapture(e.pointerId);root.classList.add('menu-dragging');
 });
 root.addEventListener('pointermove',e=>{
  if(!gesture||e.pointerId!==gesture.id)return;
  root.style.setProperty('--menu-touch-x',clamp((e.clientX-gesture.x)/Math.max(120,root.clientWidth*.4)).toFixed(4));
  root.style.setProperty('--menu-touch-y',clamp((e.clientY-gesture.y)/Math.max(120,root.clientHeight*.3)).toFixed(4));
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(type,e=>{if(e.pointerId===gesture?.id)reset();});
 window.addEventListener('resize',refresh);window.addEventListener('blur',reset);window.addEventListener('pagehide',reset);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 reduced.addEventListener('change',refresh);
 return {setActive};
}
