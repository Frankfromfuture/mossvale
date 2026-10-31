// Draw in CSS pixels: resizing the panel keeps pencil strokes and corners intact.
export function bindDialogueFrame(panel) {
 const svg=panel.querySelector('.dialogue-frame');
 let previous='';
 const draw=()=>{
  const {width,height}=panel.getBoundingClientRect();
  const w=Math.round(width*10)/10,h=Math.round(height*10)/10,key=`${w}:${h}`;
  if(key===previous||w<40||h<40)return;
  previous=key;svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  const edge=`M 27 7 H ${w-27} Q ${w-7} 7 ${w-7} 27 V ${h-27} Q ${w-7} ${h-7} ${w-27} ${h-7} H 27 Q 7 ${h-7} 7 ${h-27} V 27 Q 7 7 27 7 Z`;
  const corner='M 24 0 H 8 V 5 H 0 V 0 H 5 V 8 H 0 V 24';
  svg.innerHTML=`
   <path d="${edge}" fill="#fcf8ec" stroke="#c4bda7" stroke-width="1"/>
   <path d="${edge}" fill="none" stroke="#807c67" stroke-width="2" filter="url(#crayon-outline)"/>
   <path class="dialogue-challenge-edge" d="${edge}" fill="none" stroke="#f3dc88" stroke-width="3"/>
   <g class="dialogue-inner-frame" fill="none" stroke="#d8d1bb" stroke-width=".6" opacity=".65" stroke-linecap="butt" stroke-linejoin="miter">
    <path d="M 35 11 H ${w-35} M ${w-11} 35 V ${h-35} M ${w-35} ${h-11} H 35 M 11 ${h-35} V 35"/>
    <path d="${corner}" transform="translate(11 11)"/>
    <path d="${corner}" transform="translate(${w-11} 11) scale(-1 1)"/>
    <path d="${corner}" transform="translate(${w-11} ${h-11}) scale(-1 -1)"/>
    <path d="${corner}" transform="translate(11 ${h-11}) scale(1 -1)"/>
   </g>`;

 };
 draw();
 const observer=new ResizeObserver(draw);observer.observe(panel);
 return ()=>observer.disconnect();
}

export const speakerBadge=`<svg class="speaker-badge-art" viewBox="0 0 112 42" aria-hidden="true" focusable="false"><rect x="5" y="5" width="102" height="32" rx="6" fill="#e7e5cc" stroke="#b4b69c" stroke-width="1"/><rect x="5" y="5" width="102" height="32" rx="6" fill="none" stroke="#83886c" stroke-width="1.5" filter="url(#crayon-outline)"/></svg>`;
