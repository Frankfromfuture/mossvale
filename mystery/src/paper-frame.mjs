// Decoration belongs to the visible window, outside its scrolling content.
export function bindPaperFrame(root){
 let resize=null;
 const attach=()=>{
  resize?.disconnect();
  const panel=root.querySelector('.paper-modal'),veil=panel?.parentElement;
  if(!panel||!veil)return;
  let frame=veil.querySelector(':scope > .paper-window-frame');
  if(!frame){frame=document.createElement('div');frame.className='paper-window-frame';frame.setAttribute('aria-hidden','true');veil.append(frame);}
  frame.hidden=panel.classList.contains('start-menu');
  if(frame.hidden)return;
  const draw=()=>{
   const box=panel.getBoundingClientRect(),origin=veil.getBoundingClientRect();
   // Match the former 8px inset inside the 2px outer border.
   const inset=10;
   Object.assign(frame.style,{left:`${box.left-origin.left+inset}px`,top:`${box.top-origin.top+inset}px`,width:`${Math.max(0,box.width-inset*2)}px`,height:`${Math.max(0,box.height-inset*2)}px`});
  };
  draw();resize=new ResizeObserver(draw);resize.observe(panel);resize.observe(veil);
 };
 // Every modal replacement and reading-history restore passes through this root.
 const changes=new MutationObserver(attach);changes.observe(root,{childList:true});attach();
 return ()=>{changes.disconnect();resize?.disconnect();};
}
