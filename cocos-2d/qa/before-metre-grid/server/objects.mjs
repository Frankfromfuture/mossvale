import {readFileSync} from 'node:fs';
const enabled=process.env.MOSSVALE_SCENE==='cafe-2d';
export const objectCatalog=enabled?JSON.parse(readFileSync(new URL('../cocos-2d/assets/resources/object-catalog.json',import.meta.url),'utf8')):null;
const originals=new Map((objectCatalog?.instances||[]).map(o=>[o.id,o]));
const navCache=new WeakMap();
const cap=(n,max=100)=>Math.max(0,Math.min(max,n));
export function initializeObjects(w){
 if(!enabled)return false;const changed=w.objectWorld?.version!==objectCatalog.version;
 if(!w.objectWorld)w.objectWorld={version:objectCatalog.version,revision:0,navRevision:0,lastGrowthMinute:w.minute,patches:{},requests:[]};
 if(changed)w.objectWorld.version=objectCatalog.version;
 const bag=w.inventory||={};for(const [key,value] of Object.entries({wood:3,water:5,coffee:0,flowers:0,stones:0}))bag[key]??=value;
 if(w.player){w.player.energy??=80;w.player.knowledge??=0;}
 return changed;
}
export function resolveObject(w,id){
 const source=originals.get(id);if(!source)return null;
 const definition=objectCatalog.definitions[source.defId],patch=w.objectWorld?.patches[id]||{};
 return {...definition,...source,...patch,state:{...definition.initial,...source.state,...patch.state},revision:patch.revision||0};
}
export function objectBounds(o){const angle=o.rotation*Math.PI/180,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));return {x:o.x,z:o.z,w:c*o.size.w+s*o.size.d,d:s*o.size.w+c*o.size.d};}
export function blocksObject(o){return o.blocking&&!o.state.removed&&!(o.defId==='door'&&o.state.open);}
export function objectObstacles(w){
 if(!w?.objectWorld)return null;const version=w.objectWorld.navRevision,old=navCache.get(w);if(old?.version===version)return old.rects;
 const rects=[];for(const id of originals.keys()){const o=resolveObject(w,id);if(blocksObject(o))rects.push({...objectBounds(o),id});}
 navCache.set(w,{version,rects});return rects;
}
export function objectDistance(p,o){const r=objectBounds(o);return Math.hypot(Math.max(0,Math.abs(p.x-r.x)-r.w/2),Math.max(0,Math.abs(p.z-r.z)-r.d/2));}
function ancestors(w,o){const ids=new Set([o.id]);while(o.parentId&&!ids.has(o.parentId)){ids.add(o.parentId);o=resolveObject(w,o.parentId);if(!o)break;}return ids;}
export function canReachObject(w,o){
 if(objectDistance(w.player,o)>o.range+.05)return false;
 const skip=ancestors(w,o),rects=objectObstacles(w)||[],dx=o.x-w.player.x,dz=o.z-w.player.z,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));
 for(let i=1;i<steps;i++){const x=w.player.x+dx*i/steps,z=w.player.z+dz*i/steps;if(rects.some(r=>!skip.has(r.id)&&Math.abs(x-r.x)<r.w/2+.03&&Math.abs(z-r.z)<r.d/2+.03))return false;}
 return true;
}
function patchObject(w,o,changes){const old=w.objectWorld.patches[o.id]||{};w.objectWorld.patches[o.id]={...old,...changes,revision:(old.revision||0)+1,...(changes.state?{state:{...old.state,...changes.state}}:{})};}
export function publicObjects(w,id){
 if(id){const o=resolveObject(w,id);if(!o)throw new Error('找不到这件物品');return {...o,children:objectCatalog.instances.filter(s=>resolveObject(w,s.id).parentId===id).map(s=>s.id)};}
 return {schema:objectCatalog.schema,version:objectCatalog.version,revision:w.objectWorld.revision,objects:objectCatalog.instances.map(o=>resolveObject(w,o.id))};
}
function group(w,o){const result=[o];for(let i=0;i<result.length;i++)for(const s of objectCatalog.instances){const item=resolveObject(w,s.id);if(item.parentId===result[i].id&&!item.state.removed)result.push(item);}return result;}
function occupied(w,o){const r=objectBounds(o);return [w.player,...w.residents.map(r=>r.life)].some(p=>p&&Math.abs(p.x-r.x)<r.w/2+.42&&Math.abs(p.z-r.z)<r.d/2+.42);}
export function objectAction(w,b,{record,layout,walkable,routeBetween,repathResidents}){
 if(!w.objectWorld)throw new Error('这个小镇尚未启用部件');
 const requestId=String(b.requestId||'');if(!/^[a-zA-Z0-9_-]{8,100}$/.test(requestId))throw new Error('操作标识缺失，请重试');
 const previous=w.objectWorld.requests.find(r=>r.id===requestId);if(previous){if(previous.object!==b.object||previous.action!==b.action)throw new Error('操作标识已经使用');return previous.result;}
 const o=resolveObject(w,String(b.object||''));if(!o||o.state.removed)throw new Error('这件物品已经不在这里');
 if(w.paused)throw new Error('小镇正在休息');
 if(!Number.isInteger(b.revision)||b.revision!==o.revision)throw new Error('物品刚有变化，再试一次吧');
 const action=String(b.action||'');if(!o.actions.includes(action))throw new Error('这件物品没有这个用法');
 if(!canReachObject(w,o))throw new Error('走到物品旁边再试吧');
 const s={...o.state},bag=w.inventory,changes={state:s};let speech='',geometry=false,playerMoved=false;
 if(action==='clean'){if(s.cleanliness>=100)throw new Error('已经很整洁啦');s.cleanliness=100;s.uses++;speech=`你把${o.name}整理干净了。`;}
 else if(action==='repair'){if(s.health>=o.maxHealth)throw new Error('现在完好，暂时不用修');if(bag.wood<1)throw new Error('需要一份木料，可以到木箱取');bag.wood--;s.health=Math.min(o.maxHealth,s.health+30);speech=`你用一份木料修好了${o.name}的一处磨损。`;}
 else if(action==='toggle'){
  if(o.defId==='door'){if(s.open&&occupied(w,o))throw new Error('门口有人，等让开后再关');s.open=!s.open;geometry=true;speech=`${o.name}${s.open?'打开':'关上'}了。`;}
  else if(o.defId==='lamp'){s.lit=!s.lit;speech=s.lit?'提灯亮了。':'提灯熄灭了。';}
  else if(o.defId==='fountain'){s.running=!s.running;speech=s.running?'喷泉又流起来了。':'喷泉暂时停下了。';}
 }
 else if(action==='sit'){
  if(s.occupiedBy&&s.occupiedUntil>w.minute)throw new Error('这里有人坐着');
  if(w.residents.some(r=>Math.hypot(r.life.x-o.x,r.life.z-o.z)<.8))throw new Error('等邻居让开再坐吧');
  if(!walkable(o.x,o.z,w))throw new Error('座位被别的东西挡住了');
  s.occupiedBy='player';s.occupiedUntil=w.minute+3;s.uses++;Object.assign(w.player,{x:o.x,z:o.z,updatedAt:Date.now(),energy:cap(w.player.energy+12),pose:{kind:'sit',object:o.id,until:w.minute+3}});playerMoved=true;speech='坐一会儿，精神好多了。';
 }
 else if(action==='read'||action==='browse'){if(w.minute-(s.lastRead??-60)<30)throw new Error('刚读过，过一会儿再翻吧');s.lastRead=w.minute;s.uses++;w.player.knowledge++;speech=o.defId==='shelf'?'你翻看了书架，记下一条有意思的小知识。':'你读了几页旧书，记下了喜欢的句子。';}
 else if(action==='water'){if(bag.water<1)throw new Error('水壶空了，先去喷泉装水吧');if(s.moisture>=90)throw new Error('土壤还湿，先让它晒晒太阳');bag.water--;s.moisture=100;s.lastTended=w.minute;speech=`给${o.name}浇了水，水壶还剩 ${bag.water} 份。`;}
 else if(action==='pick'){if(s.growth<80)throw new Error('花还没长好，过些时候再来');s.growth=15;bag.flowers++;speech='摘下一枝开好的雏菊，放进口袋。';}
 else if(action==='harvest'){if(s.stock<1)throw new Error('果子摘完了，等下一轮成熟吧');s.stock--;s.regrowAt=w.minute+360;bag.peaches++;speech=`摘下一颗桃子，树上还剩 ${s.stock} 颗。`;}
 else if(action==='prune'){if(w.minute-(s.lastPruned??-90)<90)throw new Error('刚修剪过，让枝叶长一会儿吧');s.lastPruned=w.minute;s.health=100;bag.wood++;speech='修去枯枝，得到一份可用木料。';}
 else if(action==='brew'){if(s.stock<1)throw new Error('咖啡豆用完了');s.stock--;s.uses++;bag.coffee++;speech=`做好一杯咖啡，机器还剩 ${s.stock} 份豆子。`;}
 else if(action==='drink'){if(s.volume<1)throw new Error('杯子已经空了');s.volume=0;s.uses++;w.player.energy=cap(w.player.energy+8);speech='喝完一杯桂花茶，暖暖的。';}
 else if(action==='water-fill'){if(!s.running)throw new Error('先打开喷泉再装水吧');if(bag.water>=10)throw new Error('水壶已经装满了');bag.water=Math.min(10,bag.water+5);s.uses++;speech=`装好了水，水壶里现在有 ${bag.water} 份。`;}
 else if(action==='take'){if(s.stock<1)throw new Error('木箱空了');s.stock--;bag.wood++;speech=`取出一份木料，箱里还剩 ${s.stock} 份。`;}
 else if(action==='store'){if(bag.wood<1)throw new Error('口袋里没有木料');if(s.stock>=s.capacity)throw new Error('木箱已经满了');s.stock++;bag.wood--;speech=`放入一份木料，箱里现在有 ${s.stock} 份。`;}
 else if(action==='craft'){if(bag.wood<1)throw new Error('需要一份木料');bag.wood--;bag.snacks??=0;bag.craftedBoards=(bag.craftedBoards||0)+1;s.uses++;s.health=Math.max(1,s.health-1);speech='打磨好一块木板，收进口袋。';}
 else if(action==='collect'){s.removed=true;bag.stones++;geometry=true;speech='把这块小石头收进口袋，地面腾出来了。';}
 else if(action==='move'||action==='rotate'){
  if(!o.movable)throw new Error('这件物品固定在这里');if(s.occupiedBy&&s.occupiedUntil>w.minute)throw new Error('座位正有人使用');
  const x=action==='move'?Number(b.x):o.x,z=action==='move'?Number(b.z):o.z;
  if(!Number.isFinite(x)||!Number.isFinite(z)||Math.hypot(x-o.x,z-o.z)>6.01)throw new Error('请在附近六步之内摆放');
  const members=group(w,o),ids=new Set(members.map(p=>p.id)),turn=action==='rotate'?90:0;
  const candidate={...w,objectWorld:{...w.objectWorld,navRevision:w.objectWorld.navRevision+1,patches:{...w.objectWorld.patches}}};
  for(const item of members){const dx=item.x-o.x,dz=item.z-o.z;patchObject(candidate,item,{x:x+(turn?-dz:dx),z:z+(turn?dx:dz),rotation:(item.rotation+turn)%360,...(item.id===o.id?{parentId:null}:{})});}
  const bounds=layout.bounds,others=objectCatalog.instances.filter(a=>!ids.has(a.id)).map(a=>resolveObject(w,a.id)).filter(a=>a.category!=='terrain'&&!a.state.removed);
  const moved=resolveObject(candidate,o.id),r=objectBounds(moved);
  const support=['item','plant','appliance'].includes(moved.category)&&!moved.blocking&&others.find(a=>{const b=objectBounds(a);return a.surface&&Math.abs(r.x-b.x)+r.w/2<=b.w/2+.02&&Math.abs(r.z-b.z)+r.d/2<=b.d/2+.02;});
  candidate.objectWorld.patches[o.id].parentId=support?support.id:null;
  if(r.x-r.w/2<bounds.minX||r.x+r.w/2>bounds.maxX||r.z-r.d/2<bounds.minZ||r.z+r.d/2>bounds.maxZ)throw new Error('这里超出了可摆放的街区');
  if(others.some(a=>{if(a.id===support?.id)return false;const b=objectBounds(a);return Math.abs(r.x-b.x)<(r.w+b.w)/2-.05&&Math.abs(r.z-b.z)<(r.d+b.d)/2-.05;}))throw new Error('这里已经放了别的东西');
  if(!support&&[w.player,...w.residents.map(r=>r.life)].some(p=>Math.abs(p.x-r.x)<r.w/2+.32&&Math.abs(p.z-r.z)<r.d/2+.32))throw new Error('有人站在这里，换个地方吧');
  if([w.player,...w.residents.map(r=>r.life)].some(p=>!walkable(p.x,p.z,candidate)))throw new Error('有人站在这里，换个地方吧');
  const destinations=[...layout.places,...w.residents.map(r=>r.life)];
  if(destinations.some(p=>routeBetween(w.player,p,w)&&!routeBetween(w.player,p,candidate)))throw new Error('摆在这里会堵住通路');
  for(const item of members)w.objectWorld.patches[item.id]=candidate.objectWorld.patches[item.id];
  geometry=true;speech=action==='move'?`把${o.name}搬到了新位置。`:`把${o.name}转了一个方向。`;
 }
 if(!speech)throw new Error('这次操作没有完成');
 if(action!=='move'&&action!=='rotate')patchObject(w,o,changes);
 w.objectWorld.revision++;if(geometry){w.objectWorld.navRevision++;repathResidents(w);}
 const witnesses=w.residents.filter(r=>Math.hypot(r.life.x-o.x,r.life.z-o.z)<4&&canReachObject({...w,player:r.life},o)).map(r=>r.id);
 const e=record(w,'object_interaction',speech,witnesses,4,{objectId:o.id,action,player:true,place:o.group});
 const result={speech,eventId:e.id,objectId:o.id,playerMoved};w.revision++;
 w.objectWorld.requests.push({id:requestId,object:o.id,action,result});w.objectWorld.requests=w.objectWorld.requests.slice(-40);
 return result;
}
export function tickObjects(w){
 if(!w.objectWorld)return;let changed=false;
 const periods=Math.max(0,Math.min(96,Math.floor(w.minute/30)-Math.floor((w.objectWorld.lastGrowthMinute??w.minute)/30)));
 for(const src of objectCatalog.instances){const o=resolveObject(w,src.id),s=o.state;if(s.removed)continue;const update={};
  if(s.occupiedBy&&(s.occupiedUntil<=w.minute||Math.hypot(w.player.x-o.x,w.player.z-o.z)>1.2)){update.occupiedBy='';update.occupiedUntil=0;}
  if(o.defId==='tree'&&s.stock<s.capacity&&s.regrowAt&&w.minute>=s.regrowAt){update.stock=Math.min(s.capacity,s.stock+1+Math.floor((w.minute-s.regrowAt)/360));update.regrowAt=w.minute+360;}
  if(o.category==='plant'&&periods){update.moisture=cap(s.moisture-periods*2);update.growth=cap(s.growth+Math.min(periods,Math.max(0,Math.ceil((s.moisture-20)/2)))*3);}
  if(Object.keys(update).length){patchObject(w,o,{state:update});changed=true;}
 }
 if(w.player.pose&&(w.player.pose.until<=w.minute||resolveObject(w,w.player.pose.object)?.state.occupiedBy!=='player'))delete w.player.pose;
 w.objectWorld.lastGrowthMinute=w.minute;if(changed)w.objectWorld.revision++;
}
