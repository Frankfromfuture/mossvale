// Keep vertical reading native; horizontal gestures turn the script page.
export function bindScriptCarousel(root){
 const viewport=root.querySelector('.script-viewport'),track=root.querySelector('.script-track');
 const pages=[...root.querySelectorAll('.script-page')];
 const previous=root.querySelector('.script-previous'),next=root.querySelector('.script-next'),status=root.querySelector('.script-page-status');
 let index=0,gesture=null,suppressClick=false;
 function show(value){
  index=Math.max(0,Math.min(pages.length-1,value));
  const focused=document.activeElement;
  pages.forEach((page,i)=>{page.inert=i!==index;page.setAttribute('aria-hidden',String(i!==index));});
  track.style.transform=`translateX(-${index*100}%)`;
  previous.disabled=index===0;next.disabled=index===pages.length-1;
  status.textContent=`${index+1} / ${pages.length}`;
  if(focused?.closest('.script-page')?.inert||focused?.disabled)(index===0?next:previous).focus({preventScroll:true});
 }
 previous.onclick=()=>show(index-1);next.onclick=()=>show(index+1);
 root.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
  event.preventDefault();show(index+(event.key==='ArrowRight'?1:-1));
 });
 viewport.addEventListener('pointerdown',event=>{
  suppressClick=false;
  if(!event.isPrimary||event.button!==0){gesture=null;return;}
  gesture={id:event.pointerId,x:event.clientX,y:event.clientY,horizontal:false};
 });
 viewport.addEventListener('pointermove',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
  if(!gesture.horizontal&&Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){gesture=null;return;}
  if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.25){
   gesture.horizontal=true;suppressClick=true;
   viewport.setPointerCapture(event.pointerId);event.preventDefault();
  }
 });
 viewport.addEventListener('pointerup',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y,swiped=gesture.horizontal;
  gesture=null;
  if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
  if(swiped&&Math.abs(dx)>=48&&Math.abs(dx)>Math.abs(dy)*1.25){
   // With two pages either swipe direction reveals the other page.
   show(pages.length===2?1-index:index+(dx<0?1:-1));
  }
 });
 for(const type of ['pointercancel','lostpointercapture'])viewport.addEventListener(type,event=>{
  if(type==='pointercancel'||event.target===viewport)gesture=null;
 });
 viewport.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopPropagation();suppressClick=false;}},true);
 show(0);
}
