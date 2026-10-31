import * as THREE from 'three';
const ns='http://www.w3.org/2000/svg';
function tailFor(el){
 let svg=el.querySelector('.speech-tail');if(svg)return svg;
 el.classList.add('actor-bubble');svg=document.createElementNS(ns,'svg');svg.classList.add('speech-tail');svg.setAttribute('aria-hidden','true');
 for(const cls of ['speech-tail-paper','speech-tail-edge']){const path=document.createElementNS(ns,'path');path.classList.add(cls);svg.append(path);}
 el.append(svg);return svg;
}
// One projection for both the bubble and its pointer: the animated head's crown.
export function placeSpeechBubble(scene,label,actor){
 const el=label.el;label.inView=false;
 if(el.hidden||!actor?.g.visible){el.style.visibility='hidden';return false;}
 const svg=tailFor(el),w=scene.host.clientWidth,h=scene.host.clientHeight;
 actor.g.updateMatrixWorld(true);scene.camera.updateMatrixWorld(true);
 const crown=actor.rig.head.localToWorld(new THREE.Vector3(0,.51,0)).project(scene.camera),x=(crown.x+1)*w/2,y=(1-crown.y)*h/2;
 if(crown.z<-1||crown.z>1||x<5||x>w-5||y<5||y>h-5){el.style.visibility='hidden';return false;}
 const bw=el.offsetWidth,bh=el.offsetHeight,pad=10,half=5,depth=Math.sqrt(3)*half,inset=19;
 const centerX=THREE.MathUtils.clamp(x-bw/2,pad,Math.max(pad,w-bw-pad)),centerY=THREE.MathUtils.clamp(y-bh/2,pad,Math.max(pad,h-bh-pad));
 // Move the frame to the pointer; its three sides stay 10px even at screen edges.
 const candidates=[
  {left:centerX,top:y-depth-bh+1,side:'bottom'},
  {left:x+depth-1,top:centerY,side:'left'},
  {left:x-depth-bw+1,top:centerY,side:'right'},
  {left:centerX,top:y+depth-1,side:'top'}
 ];
 const box=candidates.find(b=>b.left>=pad&&b.top>=pad&&b.left+bw<=w-pad&&b.top+bh<=h-pad&&(['top','bottom'].includes(b.side)?x-b.left>=inset&&x-b.left<=bw-inset:y-b.top>=inset&&y-b.top<=bh-inset));
 if(!box){el.style.visibility='hidden';return false;}
 const {left,top,side}=box,tipX=x-left,tipY=y-top,horizontal=side==='left'||side==='right';
 const baseX=side==='left'?1:side==='right'?bw-1:tipX,baseY=side==='top'?1:side==='bottom'?bh-1:tipY;
 const ax=baseX-(horizontal?0:half),ay=baseY-(horizontal?half:0),bx=baseX+(horizontal?0:half),by=baseY+(horizontal?half:0);
 const edge=`M ${ax} ${ay} L ${tipX} ${tipY} L ${bx} ${by}`;
 svg.setAttribute('width',bw);svg.setAttribute('height',bh);svg.setAttribute('viewBox',`0 0 ${bw} ${bh}`);
 svg.style.width=bw+'px';svg.style.height=bh+'px';
 svg.style.left=-el.clientLeft+'px';svg.style.top=-el.clientTop+'px';
 svg.children[0].setAttribute('d',edge+' Z');svg.children[1].setAttribute('d',edge);
 el.style.transform=`translate(${left}px,${top}px)`;el.style.visibility='visible';
 el.dataset.actor=actor.rig.id;el.dataset.tailSide=side;label.anchor={x,y};label.tip={x:left+tipX,y:top+tipY};label.inView=true;return true;
}
