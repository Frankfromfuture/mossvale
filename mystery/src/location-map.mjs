import {rooms,getRoom} from '../shared/layout.mjs';
import {propLayout} from '../shared/prop-layout.mjs';

export const destinations=rooms.filter(r=>!r.reserved);
export const placeName=r=>({player:'白川的房间',miyazaki:'宫司的房间',jiang:'森川介的房间',ishikawa:'雾岛的房间',kato:'黑泽夫妇的房间'}[r.id]||r.name);
export const placeAnchor=r=>({x:r.x,y:.36,z:r.z+(r.id==='hall'?r.d/2-1:r.owner?-r.d/2+.65:0)});

export function mapEvents(state){
 return state.events.filter(e=>e.kind!=='ambient').slice(-8).reverse().map(e=>{
  const clue=state.clues.find(c=>e.text.includes(`「${c.title}」`));
  const room=clue?(propLayout[clue.id]?.room||null):e.text.includes('铜炉')?'garden':e.kind==='public'||/厅堂|早餐|六人|众人/.test(e.text)?'hall':null;
  return {text:e.text,room};
 });
}
export function mapContent(state,snapshot,esc){
 const events=mapEvents(state),lead=state.lead,leadRoom=lead?.action==='garden'?'garden':lead?.requiresHall||lead?.action==='gather'||lead?.action==='opening'?'hall':null;
 const markers=snapshot?.markers||[],number=id=>destinations.findIndex(r=>r.id===id)+1;
 return `<div class="panorama-guide"><div class="map-current-lead"><small>下一步</small><strong>${esc(lead?.title||state.objective)}</strong><p>${esc(lead?.text||'点击地点或场景中的文字前往。')}</p>${leadRoom?`<button data-map-room="${leadRoom}">前往${esc(placeName(getRoom(leadRoom)))} ›</button>`:''}</div><div class="panorama-layout"><div class="panorama-column"><div class="panorama-picture" aria-label="神社全景与地点标注">${snapshot?`<img src="${snapshot.url}" width="${snapshot.width}" height="${snapshot.height}" alt="当前3D场景的全景截图"><svg class="map-leaders" aria-hidden="true"></svg>${markers.map(m=>`<button class="map-pin ${state.room===m.id?'here':''} ${events.some(e=>e.room===m.id)?'has-event':''}" data-map-room="${m.id}" data-x="${m.x}" data-y="${m.y}" title="${esc(placeName(getRoom(m.id)))}" aria-label="前往${esc(placeName(getRoom(m.id)))}"><span>${number(m.id)}</span></button>`).join('')}`:'<p>全景图暂未生成，可从下方地点列表前往。</p>'}</div><p class="panorama-caption">点击编号或地点名即可前往。金色标记表示这里有已记录的事件。</p><div class="map-destinations">${destinations.map(r=>{const info=state.rooms.find(x=>x.id===r.id);return `<button data-map-room="${r.id}" class="${state.room===r.id?'here':''}"><i>${number(r.id)}</i><span>${esc(placeName(r))}</span><small>${state.room===r.id?'所在地点':info.accessible?'前往':'需进房许可'}</small></button>`;}).join('')}</div></div><aside class="map-events"><h3>已发生的事</h3>${events.length?events.map(e=>`<article>${e.room?`<button data-map-room="${e.room}">${number(e.room)} · ${esc(placeName(getRoom(e.room)))} ›</button>`:'<span>调查记录</span>'}<p>${esc(e.text)}</p></article>`).join(''):'<p>还没有新的记录。先听大家说完，再查看花园的铜炉。</p>'}</aside></div><footer class="modal-foot"><button id="rest">回客房歇一会儿</button></footer></div>`;
}

// Keep numbered targets apart on small screens and connect shifted pins to place anchors.
export function positionMapPins(picture){
 if(!picture)return ()=>{};
 const arrange=()=>{
  const w=picture.clientWidth,h=picture.clientHeight,placed=[],svg=picture.querySelector('svg');if(!svg||!w||!h)return;
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.innerHTML='';
  for(const pin of picture.querySelectorAll('.map-pin')){
   const ax=+pin.dataset.x*w,ay=+pin.dataset.y*h;let best={x:ax,y:ay},cost=Infinity;
   for(const distance of [0,25,40,56])for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2,Math.PI/4,-Math.PI/4,Math.PI*.75,-Math.PI*.75]){
    const x=Math.max(15,Math.min(w-15,ax+Math.cos(angle)*distance)),y=Math.max(15,Math.min(h-15,ay+Math.sin(angle)*distance));
    const score=Math.hypot(x-ax,y-ay)+placed.reduce((n,p)=>n+Math.max(0,30-Math.hypot(p.x-x,p.y-y))*100,0);
    if(score<cost){cost=score;best={x,y};}
   }
   placed.push(best);pin.style.left=best.x+'px';pin.style.top=best.y+'px';
   if(Math.hypot(best.x-ax,best.y-ay)>5){const line=document.createElementNS('http://www.w3.org/2000/svg','line');for(const [key,value]of Object.entries({x1:ax,y1:ay,x2:best.x,y2:best.y}))line.setAttribute(key,value);svg.append(line);}
  }
 };
 const observer=new ResizeObserver(arrange);observer.observe(picture);arrange();return ()=>observer.disconnect();
}
