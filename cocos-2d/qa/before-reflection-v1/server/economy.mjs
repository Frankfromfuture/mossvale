import {economicReport} from './economy-report.mjs';
import {record} from './engine.mjs';
import {layout,routeBetween,walkable} from './life.mjs';
import {objectCatalog,allObjects,objectSources,resolveObject,patchObject,createObject,objectBounds,tickObjects} from './objects.mjs';
import {BUSINESS_DEFS,GOODS,CONCEPTS,FURNITURE,MILESTONES,DEFAULTS} from './economy-data.mjs';
export {DEFAULTS} from './economy-data.mjs';
const cap=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const money=n=>(n/100).toFixed(2).replace(/\.00$/,'');
const day=w=>Math.floor(w.minute/1440);
const hour=w=>w.minute%1440/60;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const def=id=>BUSINESS_DEFS.find(b=>b.id===id);
const biz=(w,id)=>w.economy.businesses[id];
const account=(w,id)=>w.economy.accounts[id]||0;
const person=id=>'person:'+id;
const business=id=>'biz:'+id;
const sourceName=(w,id)=>id==='town'?'镇公共资金':id==='outside'?'镇外供应商':id==='person:player'?'村长':id.startsWith('escrow:')?'预留劳动报酬':id.startsWith('visitor:')?'游客':id.startsWith('biz:')?biz(w,id.slice(4))?.name:w.residents.find(r=>person(r.id)===id)?.name||id;
const props=w=>objectSources(w).filter(o=>objectCatalog.definitions[o.defId].category!=='terrain').map(o=>resolveObject(w,o.id)).filter(o=>!o.state.removed&&!o.state.stored);
const atHotel=o=>o.group==='hotel'&&!o.state.stored&&!o.state.removed;
const inside=(p,r)=>Math.abs(p.x-r.x)<r.w/2&&Math.abs(p.z-r.z)<r.d/2;
function random(w){let n=w.economy.rng>>>0;n^=n<<13;n^=n>>>17;n^=n<<5;w.economy.rng=n>>>0;return (n>>>0)/4294967296;}
function note(w,type,text,ids=[],extra={}){return record(w,type,text,ids,5,{economic:true,...extra});}
function daily(w){return w.economy.days[day(w)]||=( {day:day(w),externalIn:0,externalOut:0,tax:0,hotelRevenue:0,hotelCosts:0,wages:0,visitors:0,reviews:[],finished:false} );}
export function transfer(w,from,to,amount,kind,description,extra={}){
 if(!Number.isSafeInteger(amount)||amount<0)throw new Error('账目金额无效');
 if(!amount)return null;if(from===to)throw new Error('付款双方相同');
 const e=w.economy;if(from!=='outside'&&account(w,from)<amount)throw new Error('余额不足');
 if(from!=='outside')e.accounts[from]-=amount;if(to!=='outside')e.accounts[to]=account(w,to)+amount;
 const tx={id:`t${++e.txSeq}`,at:w.minute,from,to,amount,kind,description,...extra};e.ledger.push(tx);
 const d=daily(w),initial=kind==='initial';
 const externalFrom=from==='outside'||from.startsWith('visitor:'),externalTo=to==='outside'||to.startsWith('visitor:');
 if(!initial&&externalFrom&&!externalTo)d.externalIn+=amount;
 if(!initial&&!externalFrom&&externalTo)d.externalOut+=amount;
 if(!initial&&to==='biz:hotel'&&!['deposit','refund'].includes(kind)){d.hotelRevenue+=amount;e.totals.hotelIncome+=amount;}
 if(kind==='refund'&&to==='biz:hotel'){d.hotelCosts-=amount;e.totals.hotelCosts-=amount;}
 if(!initial&&from==='biz:hotel'&&!['withdraw','deposit'].includes(kind)){d.hotelCosts+=amount;e.totals.hotelCosts+=amount;}
 if(kind==='tax')d.tax+=amount;if(kind==='wage')d.wages+=amount;
 if(to==='person:player')e.totals[kind==='tax-share'?'share':kind==='wage'?'labor':kind==='withdraw'?'withdrawals':'otherIncome']+=amount;
 if(from==='person:player')e.totals.spending+=amount;
 w.coins=account(w,'person:player')/100;e.revision++;
 return tx;
}
function payWage(w,bid,worker,amount,label){if(account(w,business(bid))<amount)return false;transfer(w,business(bid),person(worker),amount,'wage',label);return true;}
function sell(w,bid,product,buyer,quantity=1,{wholesale=false,worker=null}={}){
 const b=biz(w,bid),g=GOODS[product],price=(wholesale?(g.wholesale||g.price):g.price)*quantity;
 if(!price||!Number.isInteger(quantity)||quantity<1||account(w,buyer)<price||(!g.service&&(b.stock[product]||0)<quantity))return null;
 if(!g.service)b.stock[product]-=quantity;
 const tx=transfer(w,buyer,business(bid),price,wholesale?'wholesale':'sale',`${sourceName(w,buyer)}购买${g.name} ×${quantity}`,{product,quantity});
 if(!wholesale){const tax=Math.round(price*DEFAULTS.taxRate);transfer(w,business(bid),'town',tax,'tax',`${b.name}营业税`);b.sales+=price;b.sold++;if(worker)payWage(w,bid,worker,Math.min(100,Math.floor(price*.12)),`${g.name}服务报酬`);}
 b.lastSale=w.minute;return tx;
}
export function initializeEconomy(w){
 if(w.economy)return false;
 const former=w.residents.filter(r=>r.id==='ye');w.archivedResidents=[...(w.archivedResidents||[]),...former];w.residents=w.residents.filter(r=>r.id!=='ye');
 if(w.party){(w.archivedParties||=[]).push(w.party);w.party=null;}w.milestones={};
 const startCash=Math.round((Number.isFinite(w.coins)?w.coins:100)*100);
 w.economy={version:1,revision:1,accounts:{},ledger:[],txSeq:0,rng:173483901,days:{},businesses:{},visitors:[],visitorHistory:[],visitorSeq:0,tasks:{},nextPulse:w.minute+1,nextVisitor:w.minute+20,arrivalDay:day(w),arrivalsToday:0,chores:[],choreSeq:0,requests:{},orderQueue:[],hotel:{reviews:[],invitations:[],initialAssets:['hotel-bed-1','hotel-bed-2'],rooms:{},snacks:2},reputation:10,attractiveness:{score:0,parts:[]},milestones:{},playerOnlineUntil:w.minute+DEFAULTS.leaseMinutes,totals:{labor:0,share:0,withdrawals:0,otherIncome:0,spending:0,hotelIncome:0,hotelCosts:0},lastVisitTotals:{labor:0,share:0,withdrawals:0,otherIncome:0,spending:0,hotelIncome:0,hotelCosts:0},lastVisitMinute:w.minute,planner:{day:-1,mode:'rules'},positiveDays:0,furnitureSeq:0};
 const e=w.economy;transfer(w,'outside','person:player',startCash,'initial','保留村长个人资金');transfer(w,'outside','town',50000,'initial','镇公共资金期初余额');
 for(const r of w.residents){transfer(w,'outside',person(r.id),5000,'initial',`${r.name}个人期初余额`);r.economicDay={day:day(w),meal:false,leisure:false,workMinutes:0};r.life.route=[];r.route=[];r.busy=false;}
 for(const b of [...BUSINESS_DEFS,{id:'hotel',name:'苔溪小酒店',owner:'player',workers:[],products:[],place:'hotel'}]){
  e.businesses[b.id]={id:b.id,name:b.name,owner:b.owner,stock:{},concept:CONCEPTS[b.id]?.[0].id||'default',sales:0,sold:0,lastSale:w.minute,plan:'balanced',status:'营业',orders:{}};
  transfer(w,'outside',business(b.id),20000,'initial',`${b.name}期初经营资金`);
 }
 for(const b of BUSINESS_DEFS)for(const id of b.products)if(!GOODS[id].service)biz(w,b.id).stock[id]=GOODS[id].defId?1:4;
 for(const id of ['flour','beans','wood','paper','seed','cloth'])biz(w,'shop').stock[id]=8;
 e.totals={labor:0,share:0,withdrawals:0,otherIncome:0,spending:0,hotelIncome:0,hotelCosts:0};
 for(const r of layout.hotel.rooms)e.hotel.rooms[r.id]={guest:null,stays:0};
 Object.assign(w.player,{name:'村长',action:'照看小酒店',hunger:20,energy:80});
 note(w,'mayor_start','你接任村长，接手了两间已能入住的客房。前台和大厅已经备好，先迎接第一位客人。',[],{player:true});
 if(former.length)note(w,'departure','叶小满外出求学，过去的交谈与经历留在镇里的旧记录中。');
 refreshEconomy(w);return true;
}
function position(w,id){return id==='player'?w.player:w.residents.find(r=>r.id===id)?.life||w.economy.visitors.find(v=>v.id===id)?.life;}
function actor(w,id){return id==='player'?w.player:w.residents.find(r=>r.id===id)||w.economy.visitors.find(v=>v.id===id);}
function speech(w,id,text){const a=actor(w,id);if(!a)return;const l=id==='player'?a:a.life;l.speech=text;l.speechAt=w.minute;l.speechUntil=w.minute+25;}
function useSpot(w,o){
 const b=objectBounds(o),points=[];
 for(let x=Math.floor(b.x-b.w/2)-1;x<=Math.ceil(b.x+b.w/2);x++)for(let z=Math.floor(b.z-b.d/2)-1;z<=Math.ceil(b.z+b.d/2);z++){
  const p={x:x+.5,z:z+.5};if(walkable(p.x,p.z,w))points.push(p);
 }
 points.sort((a,b)=>dist(a,o)-dist(b,o));return points.find(p=>dist(p,o)<Math.max(b.w,b.d)/2+1.5)||null;
}
const roomCache=new WeakMap();
export function hotelRooms(w){
 const stamp=w.objectWorld.revision,old=roomCache.get(w);if(old?.stamp===stamp)return old.rooms;
 const objects=props(w).filter(atHotel),frontdesk=objects.some(o=>o.id==='hotel-frontdesk'),rooms=layout.hotel.rooms.map(r=>{
  const items=objects.filter(o=>inside(o,r)),bed=items.find(o=>o.defId==='bed'),lamp=items.find(o=>o.defId==='lamp'&&o.state.lit),door=resolveObject(w,r.id+'-door');
  const cleanliness=items.length?Math.round(items.reduce((n,o)=>n+o.state.cleanliness,0)/items.length):0;
  const point=bed&&useSpot(w,bed);const accessible=!!(point&&door?.state.open&&routeBetween(layout.hotel.entry,point,w));
  const types=new Set(items.map(o=>o.defId)),comfort=Math.round(cap((bed?25:0)+(lamp?15:0)+(['desk','armchair','sofa','shelf','rug','pot'].filter(id=>types.has(id)).length*7)+cleanliness*.1));
  return {...r,bed:bed?.id,point,cleanliness,comfort,ready:frontdesk&&!!bed&&!!lamp&&cleanliness>=60&&accessible,reason:!frontdesk?'前台尚未摆出':!bed?'缺少床':!lamp?'缺少亮着的灯':!accessible?'入口或床边不通':cleanliness<60?'需要打扫':'可以入住',price:1800+Math.floor(comfort/10)*100,items:items.map(o=>o.id)};
 });roomCache.set(w,{stamp,rooms});return rooms;
}
export function validateHotelPlacement(w,o){
 if(!w.economy)return;
 if(o.owner==='村长'){
  const b=objectBounds(o),h=layout.hotel.bounds;
  if(b.x-b.w/2<h.x-h.w/2+1||b.x+b.w/2>h.x+h.w/2-1||b.z-b.d/2<h.z-h.d/2+1||b.z+b.d/2>h.z+h.d/2-1)throw new Error('酒店家具请摆在室内');
 }
 for(const room of hotelRooms(w)){const door=resolveObject(w,room.id+'-door');if(!door.state.open)continue;
  if(!walkable(room.spot.x,room.spot.z,w)||!routeBetween(layout.hotel.lobby,room.spot,w))throw new Error('这里会堵住客房通道');
  if(room.bed&&!room.point)throw new Error('请给床边留一个落脚位置');
 }
}
function mark(w,key,text){if(w.economy.milestones[key])return;const e=note(w,'achievement',text,[],{player:true});w.economy.milestones[key]={at:w.minute,eventId:e.id};}
export function refreshEconomy(w){
 if(!w.economy)return;const e=w.economy,objects=props(w),publicObjects=objects.filter(o=>o.group!=='hotel'&&o.defId!=='wall'),rooms=hotelRooms(w);
 const average=(xs,fn)=>xs.length?xs.reduce((s,x)=>s+fn(x),0)/xs.length:0;
 const environment=Math.round(average(publicObjects,o=>o.state.cleanliness)/100*25);
 const facilities=Math.round(average(publicObjects.filter(o=>!o.movable||o.defId==='bench'),o=>o.state.health/o.maxHealth)*20);
 const themes=new Set(Object.values(e.businesses).filter(b=>CONCEPTS[b.id]&&b.concept!==CONCEPTS[b.id][0].id).map(b=>b.concept));
 const soldKinds=new Set(e.visitors.flatMap(v=>v.purchases.map(p=>p.product)));
 const variety=Math.min(20,8+themes.size*2+Math.min(4,soldKinds.size)),hotel=Math.round(rooms.reduce((s,r)=>s+(r.ready?r.comfort:0),0)/400*15);
 e.attractiveness={score:environment+facilities+variety+e.reputation+hotel,parts:[{name:'环境整洁',value:environment,max:25,reason:'来自街区实际清洁度'},{name:'公共设施',value:facilities,max:20,reason:'来自设施耐久与可用情况'},{name:'店铺特色',value:variety,max:20,reason:'来自正在经营的店铺概念'},{name:'服务口碑',value:e.reputation,max:20,reason:'根据离镇客人的实际体验，每日最多变化1分'},{name:'酒店体验',value:hotel,max:15,reason:`${rooms.filter(r=>r.ready).length}间可营业客房及其舒适度`}]};
 if(rooms.every(r=>r.ready))mark(w,'rooms','四间客房都已能接待住客。');
 const improved=rooms.slice(0,2).some(r=>r.items.some(id=>w.objectWorld.instances?.[id]));if(improved)mark(w,'improve','你给基础客房添了新家具，客人有了新的使用选择。');
 w.coins=account(w,'person:player')/100;
}
function setAction(w,id,text,place){const a=actor(w,id);if(!a)return;a.action=text;if(place){a.target=place;if(id!=='player')a.life.activity=layout.places.find(p=>p.id===place)?.activity||'rest';}}
function startTask(w,id,spec){
 if(w.economy.tasks[id])return false;const p=position(w,id);if(!p||!spec.point||!walkable(spec.point.x,spec.point.z,w))return false;
 const route=routeBetween(p,spec.point,w);if(!route)return false;const length=route.reduce((s,q,i)=>s+dist(i?route[i-1]:p,q),0);
 const travel=Math.ceil(length/.95),t={...spec,actor:id,phase:travel?'walking':'doing',route:route.map(q=>({...q})),travelEnd:w.minute+travel,due:w.minute+travel+(travel?0:spec.duration),started:w.minute,lastMove:w.minute};
 w.economy.tasks[id]=t;const a=actor(w,id),l=id==='player'?a:a.life;l.phase=t.phase;l.route=t.route;l.until=t.due;if(id!=='player')a.route=l.route;
 setAction(w,id,travel?`前往${spec.label}`:spec.label,spec.place);if(!travel)arriveTask(w,t);return true;
}
function arriveTask(w,t){
 const a=actor(w,t.actor),p=position(w,t.actor);if(!a)return;
 Object.assign(p,{x:t.point.x,z:t.point.z,phase:'doing',route:[],until:w.minute+t.duration});t.phase='doing';t.due=w.minute+t.duration;t.route=[];
 a.location=t.place||a.location;setAction(w,t.actor,t.label,t.place);
 if(t.object){const o=resolveObject(w,t.object);if(o&&!o.state.stored)patchObject(w,o,{state:{occupiedBy:t.actor,occupiedUntil:t.due,uses:o.state.uses+1}});w.objectWorld.revision++;}
 if(t.kind==='stay'){
  const v=a;v.checkedIn=true;const room=w.economy.hotel.rooms[t.room];room.guest=v.id;
  note(w,'hotel_checkin',`${v.name}入住${hotelRooms(w).find(r=>r.id===t.room).name}号客房。`,[],{visitor:v.id,player:true});mark(w,'guest','小酒店迎来了第一位住客。');
  speech(w,v.id,'床和灯都备好了，我先放下行李。');
 }
 if(t.kind==='invite'){note(w,'hotel_visit',`${a.name}应邀来到酒店，${t.label}。`,[a.id],{player:true});mark(w,'invite',`${a.name}来酒店做客了。`);}
}
function moveTask(w,t,to){
 if(t.phase!=='walking')return;const p=position(w,t.actor);if(!p)return;
 if(t.pauseUntil>to)return;let left=Math.max(0,to-Math.max(t.lastMove,t.pauseUntil||0))*.95;t.lastMove=to;
 while(t.route.length&&left>0){const q=t.route[0],d=dist(p,q);if(d<=left){p.x=q.x;p.z=q.z;left-=d;t.route.shift();}else{p.x+=(q.x-p.x)/d*left;p.z+=(q.z-p.z)/d*left;left=0;}}
 p.route=t.route;const a=actor(w,t.actor);if(t.actor!=='player')a.route=t.route;
}
function clearTask(w,t){
 if(t.object){const o=resolveObject(w,t.object);if(o?.state.occupiedBy===t.actor){patchObject(w,o,{state:{occupiedBy:'',occupiedUntil:0}});w.objectWorld.revision++;}}
 const p=position(w,t.actor);if(p){p.route=[];p.phase='doing';}const a=actor(w,t.actor);if(a)a.action=t.actor==='player'?'在小镇走走':'稍作休息';delete w.economy.tasks[t.actor];
}
function feedback(w,id,objectId,roomId=null){
 const a=actor(w,id),o=resolveObject(w,objectId);if(!a||!o||o.state.stored)return;
 const items=props(w).filter(atHotel),near=items.filter(x=>dist(x,o)<4),light=near.some(x=>x.defId==='lamp'&&x.state.lit),books=near.some(x=>x.defId==='shelf'||x.defId==='book'),plant=near.some(x=>x.defId==='pot');
 let text=o.defId==='bed'?(light?'床边有灯，晚上看东西很方便。':'这张床能好好休息，床边再添一盏灯就更好了。'):['chair','armchair','sofa'].includes(o.defId)?(books?'坐下就能翻书，我愿意多待一会儿。':plant?'坐在这里能看到绿植，挺舒服。':'终于能坐下来歇会儿了，再添点书或花就更好了。'):'这件家具用得上，屋里比空着的时候方便。';
 if(o.state.cleanliness<60)text='这里该打扫一下了，坐着有些不舒服。';
 const rating=cap(Math.round(3+(light?.5:0)+(plant?.5:0)+(books?.5:0)+(o.state.cleanliness>=80?.5:-.5)),1,5);
 speech(w,id,text);const event=note(w,'hotel_feedback',`${a.name}使用${o.name}后说：“${text}”`,w.residents.some(r=>r.id===id)?[id]:[],{player:true,objectId,roomId,visitor:id.startsWith('visitor:')?id:undefined});
 const review={id:event.id,at:w.minute,visitor:id,name:a.name,object:objectId,text,rating,room:roomId};w.economy.hotel.reviews.push(review);daily(w).reviews.push(rating);
 if(id.startsWith('visitor:')){mark(w,'review','住客留下了第一条实际体验评价。');a.rating=rating;}
 return review;
}
function reservePay(w,t,from,amount){
 if(account(w,from)<amount)return false;t.pay={from,amount,escrow:`escrow:${t.actor}:${w.economy.txSeq+1}`};transfer(w,from,t.pay.escrow,amount,'payroll-reserve',`${t.label}预留报酬`);return true;
}
function completePay(w,t){if(!t.pay)return;transfer(w,t.pay.escrow,person(t.actor),t.pay.amount,'wage',`${t.label}劳动报酬`);delete w.economy.accounts[t.pay.escrow];}
function finishTask(w,t){
 const a=actor(w,t.actor),e=w.economy;if(!a){clearTask(w,t);return;}
 if(t.phase==='walking'){arriveTask(w,t);return;}
 clearTask(w,t);
 if(t.kind==='produce'){
  const b=biz(w,t.business),g=GOODS[t.product];b.stock[t.product]=(b.stock[t.product]||0)+g.yield;completePay(w,t);
  note(w,'production',`${a.name}完成${g.name} ×${g.yield}，领到 ${money(t.pay?.amount||150)} 镇币报酬。`,[a.id],{business:b.id,product:t.product,quantity:g.yield,materials:t.materials});
  speech(w,a.id,`${g.name}做好了，先放到店里。`);a.economicDay.workMinutes+=t.duration;
 }else if(t.kind==='import'){
  for(const [id,qty] of Object.entries(t.goods))biz(w,'shop').stock[id]=(biz(w,'shop').stock[id]||0)+qty;
  note(w,'delivery',`${a.name}从镇外收到一批原料，已入杂货铺库存。`,[a.id],{goods:t.goods});completePay(w,t);
 }else if(t.kind==='consume'){
  const tx=sell(w,t.business,t.product,person(t.actor),1,{worker:t.worker});
  if(tx){a.hunger=cap((a.hunger||30)-45);a.energy=cap((a.energy||70)+8);if(a.economicDay){if(t.product==='bread')a.economicDay.meal=true;else a.economicDay.care=true;}note(w,'consumption',`${a.name||'村长'}花 ${money(tx.amount)} 镇币买了${GOODS[t.product].name}。`,t.actor==='player'?[]:[t.actor],{player:t.actor==='player',transaction:tx.id});}
 if(t.worker&&e.tasks[t.worker]?.customer===t.actor)delete e.tasks[t.worker].customer;
 }else if(t.kind==='visitor-buy'){
  const tx=sell(w,t.business,t.product,t.actor,1,{worker:t.worker});
  if(tx){a.spent+=tx.amount;a.purchases.push({product:t.product,amount:tx.amount,at:w.minute});speech(w,a.id,`买到了${GOODS[t.product].name}，这趟没白来。`);note(w,'visitor_sale',`${a.name}在${biz(w,t.business).name}消费 ${money(tx.amount)} 镇币，购买${GOODS[t.product].name}。`,t.worker?[t.worker]:[],{visitor:a.id,transaction:tx.id});}
  else {a.disappointments++;speech(w,a.id,'这次没买到想要的，去别处看看。');}
  if(t.worker){const work=e.tasks[t.worker];if(work?.customer===a.id)delete work.customer;}
  a.stops++;
 }else if(t.kind==='stay'){
  const room=hotelRooms(w).find(r=>r.id===t.room),payment=transfer(w,a.id,'biz:hotel',t.price,'lodging',`${a.name}结算${room.name}号客房住宿`,{room:t.room,visitor:a.id});
  transfer(w,'biz:hotel','town',Math.round(t.price*.1),'tax','酒店住宿营业税');biz(w,'hotel').sales+=t.price;biz(w,'hotel').sold++;
  a.spent+=t.price;a.reserved=0;a.booking=null;a.stayed=true;e.hotel.rooms[t.room].guest=null;e.hotel.rooms[t.room].stays++;
  feedback(w,a.id,t.object,t.room);const bed=resolveObject(w,t.object);patchObject(w,bed,{state:{cleanliness:Math.max(0,bed.state.cleanliness-18)}});w.objectWorld.revision++;
  note(w,'hotel_checkout',`${a.name}退房，支付 ${money(t.price)} 镇币。`,[],{player:true,visitor:a.id,transaction:payment.id});
  a.stops++;
 }else if(t.kind==='invite'){
  const invitation=e.hotel.invitations.find(x=>x.id===t.invitation);if(invitation)invitation.status='visited';
  feedback(w,t.actor,t.object);a.trust=cap(a.trust+2);a.mood=cap(a.mood+3);
 }else if(t.kind==='chore'){
  const job=e.chores.find(j=>j.id===t.job),o=job&&resolveObject(w,job.object);
  if(job&&o){
   if(job.action==='reception'){const v=e.visitors.find(v=>v.id===job.visitor);if(v?.booking){v.booking.ready=true;speech(w,a.id,'房间已安排好，欢迎住下。');note(w,'hotel_reception',`${a.name||'村长'}在前台为${v.name}办好入住。`,t.actor==='player'?[]:[t.actor],{player:true,visitor:v.id});}}
   if(job.action==='clean')patchObject(w,o,{state:{cleanliness:100}});
   if(job.action==='repair')patchObject(w,o,{state:{health:o.maxHealth}});
   if(job.action==='water')patchObject(w,o,{state:{moisture:100}});
   if(job.action==='delivery')e.hotel.snacks+=t.snacks||0;
   w.objectWorld.revision++;job.status='done';job.finishedAt=w.minute;job.materials=null;completePay(w,t);
   note(w,'paid_work',`${a.name||'村长'}完成${job.label}，获得 ${money(job.pay)} 镇币。`,t.actor==='player'?[]:[t.actor],{player:t.actor==='player',objectId:o.id,job:job.id});speech(w,t.actor,`${job.label}完成了。`);
  }
 }else if(t.kind==='leave'){
  const summary={id:a.id,name:a.name,code:a.code,arrived:a.arrived,left:w.minute,spent:a.spent,rating:a.rating||Math.max(2,4-a.disappointments),purchases:a.purchases,interactions:a.interactions,stayed:a.stayed};
  e.visitorHistory.push(summary);daily(w).reviews.push(summary.rating);note(w,'visitor_departure',`${a.name}离开小镇，本次消费 ${money(a.spent)} 镇币${a.stayed?'，住了一晚':''}。`,[],{visitor:a.id});
  delete e.accounts[a.id];e.visitors=e.visitors.filter(v=>v.id!==a.id);
 }else if(t.kind==='rest'){
  a.energy=cap((a.energy||70)+25);if(t.actor==='player')note(w,'mayor_life','村长回酒店休息了一会儿。',[],{player:true});
  else {note(w,'activity',`${a.name}在${layout.places.find(p=>p.id===t.place)?.short||'小镇'}休息。`,[a.id]);
   const other=w.residents.find(r=>r.id!==a.id&&dist(r.life,a.life)<3.5&&!e.tasks[r.id]?.business);
   if(other&&w.minute-(a.lastEconomySocial||0)>120){a.lastEconomySocial=w.minute;const text=`${a.name}和${other.name}碰面，聊了聊今天的生活。`;const ev=note(w,'encounter',text,[a.id,other.id]);const line=a.traits[0]>60?'忙完一起散会儿步吧。':'今天想在这儿安静坐一会儿。';speech(w,a.id,line);note(w,'dialogue',`${a.name}对${other.name}说：“${line}”`,[a.id,other.id],{evidence:[ev.id],autonomous:true});a.relations[other.id]=cap((a.relations[other.id]||30)+1);}
  }
 }
 refreshEconomy(w);
}
function availableObject(w,id){const o=resolveObject(w,id);return o&&!o.state.stored&&!o.state.removed&&!(o.state.occupiedBy&&o.state.occupiedUntil>w.minute)&&!Object.values(w.economy.tasks).some(t=>t.object===id)?o:null;}
function makeChores(w){
 const e=w.economy;e.chores=e.chores.filter(j=>j.status!=='done'||w.minute-j.finishedAt<1440);
 const waiting=e.visitors.find(v=>v.booking&&!v.booking.ready&&!e.chores.some(j=>j.visitor===v.id&&j.status!=='done'));
 if(waiting&&!e.chores.some(j=>j.action==='reception'&&j.status!=='done')&&account(w,'biz:hotel')>=150)e.chores.unshift({id:`job-${++e.choreSeq}`,object:'hotel-frontdesk',action:'reception',visitor:waiting.id,label:`为${waiting.name}办理入住`,pay:150,payer:'biz:hotel',duration:10,status:'open',point:layout.hotel.frontdesk,created:w.minute});
 const existing=new Set(e.chores.filter(j=>j.status!=='done').map(j=>j.object+':'+j.action));
 const add=(o,action,label,pay,payer,duration=30)=>{if(existing.has(o.id+':'+action)||e.chores.filter(j=>j.status==='open').length>=8||account(w,payer)<pay)return;e.chores.push({id:`job-${++e.choreSeq}`,object:o.id,action,label,pay,payer,duration,status:'open',point:useSpot(w,o),created:w.minute});existing.add(o.id+':'+action);};
 for(const o of props(w).filter(o=>o.defId!=='wall'&&o.defId!=='door')){
  if(o.state.occupiedUntil>w.minute)continue;const hotel=atHotel(o),payer=hotel?'biz:hotel':'town';
  if(o.state.cleanliness<(hotel?80:72))add(o,'clean',`打扫${hotel?'酒店':'街区'}${o.name}`,hotel?250:200,payer);
  if(o.state.health<o.maxHealth*.85)add(o,'repair',`修理${o.name}`,350,payer,40);
  if(o.category==='plant'&&o.state.moisture<40)add(o,'water',`给${o.name}浇水`,150,payer,20);
 }
 if(e.hotel.snacks<2){const counter=resolveObject(w,'hotel-frontdesk');add(counter,'delivery','给酒店补充茶点',200,'biz:hotel',25);}
}
function takeChore(w,id,job){
 if(job.action==='reception'){const v=w.economy.visitors.find(v=>v.id===job.visitor);if(!v?.booking||v.location!=='hotel')return false;}
 if(job.status!=='open'||!job.point||!availableObject(w,job.object)||account(w,job.payer)<job.pay)return false;
 const o=resolveObject(w,job.object);if(!o||!routeBetween(position(w,id),job.point,w))return false;
 if(job.action==='clean'&&o.state.cleanliness>=100||job.action==='water'&&o.state.moisture>=90||job.action==='repair'&&o.state.health>=o.maxHealth){job.status='done';job.finishedAt=w.minute;return false;}
 let material=null;
 if(job.action==='repair'&&!job.materials){
  if((biz(w,'shop').stock.wood||0)<1||account(w,job.payer)<job.pay+GOODS.wood.wholesale)return false;
  material=sell(w,'shop','wood',job.payer,1,{wholesale:true});job.materials={wood:1};
 }
 let snacks=0;
 if(job.action==='delivery'&&!job.materials){
  if((biz(w,'cafe').stock.bread||0)<2||account(w,job.payer)<job.pay+GOODS.bread.price*2)return false;
  material=sell(w,'cafe','bread',job.payer,2,{wholesale:true});job.materials={bread:2};
 }
 snacks=job.materials?.bread||0;
 if(!startTask(w,id,{kind:'chore',job:job.id,label:job.label,point:job.point,object:job.object,place:o.group==='hotel'?'hotel':o.group==='outdoors'?'park':o.group,duration:job.duration,snacks}))return false;
 job.status='working';job.worker=id;reservePay(w,w.economy.tasks[id],job.payer,job.pay);return true;
}
function production(w,r,b){
 const state=biz(w,b.id);if(Object.values(w.economy.tasks).some(t=>t.business===b.id&&['produce','import'].includes(t.kind)))return false;
 if(b.id==='shop'){
  const goods={};for(const id of ['flour','beans','wood','paper','seed','cloth','provisions'])if((state.stock[id]||0)<3)goods[id]=id==='wood'?6:4;
  const cost=Object.entries(goods).reduce((sum,[id,qty])=>sum+GOODS[id].import*qty,0);if(!cost||account(w,'biz:shop')<cost+100)return false;
  const o=availableObject(w,b.station),point=o&&useSpot(w,o);if(!o||!point)return false;
  if(startTask(w,r.id,{kind:'import',business:b.id,goods,point,object:o.id,place:b.place,label:'清点镇外来货',duration:40})){transfer(w,'biz:shop','outside',cost,'import','向镇外采购原料',{goods});reservePay(w,w.economy.tasks[r.id],'biz:shop',100);return true;}return false;
 }
 const concept=CONCEPTS[b.id]?.find(c=>c.id===state.concept),priority=state.priority&&b.products.includes(state.priority)?[state.priority]:[];
 const products=[...new Set([...Object.keys(state.orders).filter(id=>state.orders[id]>0),...priority,...(concept?.products||b.products)])];
 for(const id of products){
  const g=GOODS[id];if(!g?.recipe)continue;
  const target=g.defId?(state.orders[id]||0)>0?2:1:state.plan==='conserve'?3:state.plan==='stock'?8:5;
  const stock=state.stock[id]||0;if(stock>=target)continue;
  const missing=Object.fromEntries(Object.entries(g.recipe).map(([key,qty])=>[key,Math.max(0,qty-(state.stock[key]||0))]).filter(([,q])=>q));
  const cost=Object.entries(missing).reduce((n,[key,qty])=>n+GOODS[key].wholesale*qty,0);
  if(account(w,business(b.id))<cost+150||Object.entries(missing).some(([key,qty])=>(biz(w,'shop').stock[key]||0)<qty))continue;
  const o=availableObject(w,b.station),point=o&&useSpot(w,o);if(!o||!point)return false;
  if(!startTask(w,r.id,{kind:'produce',business:b.id,product:id,point,object:o.id,place:b.place,label:`制作${g.name}`,duration:g.minutes}))return false;
  for(const [key,qty] of Object.entries(missing)){sell(w,'shop',key,business(b.id),qty,{wholesale:true});state.stock[key]=(state.stock[key]||0)+qty;}
  for(const [key,qty] of Object.entries(g.recipe))state.stock[key]-=qty;
  w.economy.tasks[r.id].materials={...g.recipe};reservePay(w,w.economy.tasks[r.id],business(b.id),150);state.orders[id]=Math.max(0,(state.orders[id]||0)-g.yield);state.status='营业';return true;
 }
 return false;
}
function applyConcept(w,b){
 const state=biz(w,b.id),pending=state.pendingConcept;if(!pending||Object.values(w.economy.tasks).some(t=>t.business===b.id&&t.kind!=='staff'))return;
 if(account(w,business(b.id))<DEFAULTS.conceptCost){state.pendingConcept=null;return;}
 transfer(w,business(b.id),'outside',DEFAULTS.conceptCost,'concept','采购新招牌与展示材料');state.concept=pending;state.pendingConcept=null;
 note(w,'business_concept',`${b.name}改为“${CONCEPTS[b.id].find(c=>c.id===pending).name}”，接下来调整备货。`,b.workers,{business:b.id,player:true});
}
function chooseResident(w,r){
 const e=w.economy;if(e.tasks[r.id]||r.busy||r.life.engagedUntil>w.minute||r.life.aiHoldUntil>Date.now())return;
 if(r.economicDay.day!==day(w))r.economicDay={day:day(w),meal:false,leisure:false,workMinutes:0};
 const h=hour(w),home=layout.places.find(p=>p.id==='home');
 if(h>=22||h<7){startTask(w,r.id,{kind:'rest',point:home,place:'home',label:'回去睡觉',duration:h<7?Math.ceil((7-h)*60):Math.ceil((31-h)*60)});return;}
 if(h>=11&&!r.economicDay.meal&&account(w,person(r.id))>=GOODS.bread.price&&(biz(w,'cafe').stock.bread||0)>0){startTask(w,r.id,{kind:'consume',business:'cafe',product:'bread',point:layout.places.find(p=>p.id==='cafe'),place:'cafe',label:'吃点面包',duration:15});return;}
 const clinician=staffFor(w,'clinic');
 if(h>=13&&h<17&&!r.economicDay.care&&(day(w)+w.residents.indexOf(r))%3===0&&r.id!=='su'&&clinician&&account(w,person(r.id))>=GOODS.care.price){
  if(startTask(w,r.id,{kind:'consume',business:'clinic',product:'care',worker:clinician,point:layout.places.find(p=>p.id==='clinic'),place:'clinic',label:'接受日常照护',duration:25})){const t=e.tasks[clinician];t.customer=r.id;t.due=Math.max(t.due,e.tasks[r.id].travelEnd+26);return;}
 }
 const invitation=e.hotel.invitations.find(x=>x.resident===r.id&&x.status==='accepted');
 if(invitation&&h>=17&&h<21){
  const o=props(w).filter(atHotel).find(o=>['armchair','sofa','shelf'].includes(o.defId)&&!layout.hotel.rooms.some(room=>inside(o,room))&&availableObject(w,o.id));
  if(o&&e.hotel.snacks>0&&startTask(w,r.id,{kind:'invite',invitation:invitation.id,object:o.id,point:useSpot(w,o),place:'hotel',label:o.defId==='shelf'?'翻看大厅的书':'坐下来喝茶',duration:25})){e.hotel.snacks--;invitation.status='arriving';return;}
 }
 const reception=e.chores.find(j=>j.status==='open'&&j.action==='reception');if(reception&&takeChore(w,r.id,reception))return;
 const b=BUSINESS_DEFS.find(b=>b.workers.includes(r.id));applyConcept(w,b);
 if(h>=8&&h<18&&r.economicDay.workMinutes<480){
  if(production(w,r,b))return;
  const job=e.chores.find(j=>j.status==='open'&&j.payer==='biz:hotel')||e.chores.find(j=>j.status==='open'&&(w.minute>=e.playerOnlineUntil||w.minute-j.created>=60));
  // At least one person stays available in businesses with multiple workers.
  const otherServing=b.workers.some(id=>id!==r.id&&e.tasks[id]?.kind==='staff');
  const serviceOnly=b.products.every(id=>GOODS[id].service);
  if((!serviceOnly||h>=14)&&(b.workers.length===1||otherServing||r.economicDay.workMinutes>=90)&&job&&takeChore(w,r.id,job)){r.economicDay.workMinutes+=job.duration;return;}
  const p=layout.places.find(p=>p.id===b.place);startTask(w,r.id,{kind:'staff',business:b.id,point:p,place:b.place,label:`照看${b.name}`,duration:60});r.economicDay.workMinutes+=60;return;
 }
 const p=layout.places.find(p=>p.id===(r.traits[0]>60?'square':'park'));startTask(w,r.id,{kind:'rest',point:p,place:p.id,label:'闲逛休息',duration:60});
}
function chooseMayor(w){
 const e=w.economy;if(e.tasks.player||w.minute<e.playerOnlineUntil)return;
 const h=hour(w);if(h<7||h>=22){startTask(w,'player',{kind:'rest',point:layout.hotel.lobby,place:'hotel',label:'回酒店休息',duration:h<7?Math.ceil((7-h)*60):Math.ceil((31-h)*60)});return;}
 if(!w.player.economicDay||w.player.economicDay.day!==day(w))w.player.economicDay={day:day(w),meal:false};
 if(h>=11&&!w.player.economicDay.meal&&account(w,'person:player')>=GOODS.bread.price&&biz(w,'cafe').stock.bread){startTask(w,'player',{kind:'consume',business:'cafe',product:'bread',point:layout.places.find(p=>p.id==='cafe'),place:'cafe',label:'买面包吃',duration:15});return;}
 const jobs=e.chores.filter(j=>j.status==='open');for(const job of jobs)if(takeChore(w,'player',job))return;
 startTask(w,'player',{kind:'rest',point:layout.hotel.lobby,place:'hotel',label:'在大厅歇脚',duration:90});
}
function spawnVisitor(w){
 const e=w.economy;if(day(w)!==e.arrivalDay){e.arrivalDay=day(w);e.arrivalsToday=0;}
 const quota=2+Math.floor(e.attractiveness.score/10),h=hour(w);
 if(h<8||h>=19||e.arrivalsToday>=quota||e.visitors.length>=6){e.nextVisitor=w.minute+30;return;}
 const number=++e.visitorSeq,code=[4,5,6,7,8,9].map(n=>'B'+n).find(c=>!e.visitors.some(v=>v.code===c));
 const interests=['food','books','nature','photo','music','travel','rest'],interest=interests[Math.floor(random(w)*interests.length)],budget=Math.round((3500+Math.floor(random(w)*3000))*(1+e.attractiveness.score/100));
 const id=`visitor:${number}`,p=layout.hotel.visitorEntry,v={id,name:`游客${number}`,code,interest,budget,spent:0,reserved:0,purchases:[],interactions:0,maxInteractions:1+Math.floor(random(w)*3),arrived:w.minute,stops:0,disappointments:0,wantsStay:number===1||random(w)<.5,stayed:false,location:'square',action:'刚到小镇',thought:'先逛逛，看看有什么喜欢的。',life:{...p,route:[],phase:'doing',activity:'watch',speech:'听说这里有一家小酒店，顺路来看看。',speechAt:w.minute,speechUntil:w.minute+30}};
 e.accounts[id]=budget;e.visitors.push(v);e.arrivalsToday++;daily(w).visitors++;e.nextVisitor=w.minute+Math.max(60,Math.floor(600/quota));
 note(w,'visitor_arrival',`${v.name}来到小镇，想体验${({food:'吃喝',books:'阅读',nature:'花草',photo:'旅拍',music:'音乐',travel:'观光',rest:'休息照护'})[interest]}。`,[],{visitor:id});
}
function staffFor(w,bid){return def(bid)?.workers.find(id=>{const t=w.economy.tasks[id];return t?.kind==='staff'&&t.phase==='doing'&&!t.customer;});}
function chooseVisitor(w,v){
 const e=w.economy;if(e.tasks[v.id]||v.engagedUntil>w.minute)return;
 if(v.booking&&!v.checkedIn){
  const room=hotelRooms(w).find(r=>r.id===v.booking.room);
  if(v.booking.ready&&room?.ready){const duration=cap((day(w)+1)*1440+480-w.minute,120,1200);
   startTask(w,v.id,{kind:'stay',room:room.id,price:v.booking.price,object:room.bed,point:room.point,place:'hotel',label:`入住${room.name}号客房`,duration});return;
  }
  if(w.minute-v.booking.at>180||!room?.ready){
   e.hotel.rooms[v.booking.room].guest=null;v.booking=null;v.reserved=0;v.wantsStay=false;v.disappointments++;
   for(const j of e.chores.filter(j=>j.visitor===v.id&&j.status==='open')){j.status='done';j.finishedAt=w.minute;}
   speech(w,v.id,'这次先不住了，下次再来看看。');
  }else{startTask(w,v.id,{kind:'checkin-wait',point:{x:24.5,z:1.5},place:'hotel',label:'在前台等候入住',duration:15});return;}
 }
 if(v.wantsStay&&!v.stayed&&v.stops>=1){
  const room=hotelRooms(w).find(r=>r.ready&&!e.hotel.rooms[r.id].guest&&account(w,v.id)>=r.price&&availableObject(w,r.bed));
  if(room&&props(w).some(o=>o.id==='hotel-frontdesk')){
   if(startTask(w,v.id,{kind:'checkin-wait',point:{x:24.5,z:1.5},place:'hotel',label:'到前台办理入住',duration:10})){e.hotel.rooms[room.id].guest=v.id;v.reserved=room.price;v.booking={room:room.id,price:room.price,at:w.minute,ready:false};return;}
  }
  v.wantsStay=false;
 }
 if(v.stayed||v.stops>=2||w.minute-v.arrived>480){startTask(w,v.id,{kind:'leave',point:layout.hotel.visitorEntry,place:'square',label:'离开小镇',duration:1});return;}
 const choices=[];
 for(const b of BUSINESS_DEFS){
  const state=biz(w,b.id),concept=CONCEPTS[b.id]?.find(c=>c.id===state.concept);
  for(const id of b.products){const g=GOODS[id];if(g.defId||!g.price||g.price>account(w,v.id)-v.reserved||v.purchases.some(p=>p.product===id))continue;
   const worker=staffFor(w,b.id);if(g.service&&!worker||!g.service&&!(state.stock[id]>0))continue;
   choices.push({b,id,g,worker,score:(g.tags?.includes(v.interest)?5:0)+(id==='care'&&v.interest==='rest'?2:0)+(concept?.tags.includes(v.interest)?3:0)+(state.plan==='welcome'?1:0)});
  }
 }
 choices.sort((a,b)=>b.score-a.score||a.g.price-b.g.price);
 const c=choices[0];if(c){
  const point=layout.places.find(p=>p.id===c.b.place);
  if(startTask(w,v.id,{kind:'visitor-buy',business:c.b.id,product:c.id,worker:c.worker,point,place:c.b.place,label:`体验${c.g.name}`,duration:c.g.service?c.g.minutes:12})){
   if(c.worker&&c.g.service){const t=e.tasks[c.worker];t.customer=v.id;t.due=Math.max(t.due,e.tasks[v.id].travelEnd+c.g.minutes+1);}
   return;
  }
 }
 v.stops++;v.disappointments++;startTask(w,v.id,{kind:'wander',point:layout.places.find(p=>p.id==='park'),place:'park',label:'在花园散步',duration:25});
}
function settleDay(w,previous){
 const e=w.economy,d=e.days[previous];if(!d||d.finished)return;d.finished=true;
 const share=Math.min(account(w,'town'),Math.round(d.tax*DEFAULTS.mayorShare));if(share){transfer(w,'town','person:player',share,'tax-share',`第${previous+1}天村长税收分成`);note(w,'tax_share',`第${previous+1}天实际税款 ${money(d.tax)} 镇币，村长分得 ${money(share)} 镇币。`,[],{player:true});}
 if(d.reviews.length){const mean=d.reviews.reduce((a,b)=>a+b,0)/d.reviews.length;e.reputation=cap(e.reputation+(mean>=4?1:mean<3?-1:0),0,20);}
 e.positiveDays=d.externalIn>d.externalOut?e.positiveDays+1:0;if(e.positiveDays>=3)mark(w,'profit','小镇连续三个营业日对外收入高于支出。');
 for(const b of BUSINESS_DEFS){const cash=account(w,business(b.id)),payout=Math.min(800,Math.max(0,cash-15000));if(payout)transfer(w,business(b.id),person(b.owner),payout,'owner-income',`${b.name}经营所得`);}
 note(w,'daily_accounts',`第${previous+1}天：游客消费 ${money(d.externalIn)}，镇外采购 ${money(d.externalOut)}，对外净收入 ${money(d.externalIn-d.externalOut)} 镇币。`,[],{player:true});
 // Wear belongs to objects and actual elapsed days, not to login events.
 for(const o of props(w).filter(o=>o.defId!=='wall'&&o.defId!=='door')){const dirty=atHotel(o)?1:2;patchObject(w,o,{state:{cleanliness:Math.max(0,o.state.cleanliness-dirty),health:Math.max(50,o.state.health-.4)}});}
 w.objectWorld.revision++;e.arrivalDay=day(w);e.arrivalsToday=0;
}
function pulse(w){
 const e=w.economy;tickObjects(w);refreshEconomy(w);makeChores(w);
 if(w.minute>=e.nextVisitor)spawnVisitor(w);
 for(const r of w.residents){r.hunger=cap(r.hunger+.8);chooseResident(w,r);}
 chooseMayor(w);for(const v of [...e.visitors])chooseVisitor(w,v);
 // Produce honest shop states without destroying the business on a bad day.
 for(const b of BUSINESS_DEFS){const s=biz(w,b.id);s.status=b.products.some(id=>GOODS[id].service||s.stock[id]>0)?'营业':account(w,business(b.id))<200?'暂时歇业，安排兼职':'补货中';}
 e.nextPulse=w.minute+15;e.revision++;
}
export function advanceEconomy(w,minutes){
 if(!Number.isFinite(minutes)||minutes<0)return;
 const end=w.minute+Math.floor(minutes),e=w.economy;
 while(w.minute<end){
  const midnight=(day(w)+1)*1440,taskDue=Object.values(e.tasks).reduce((n,t)=>Math.min(n,t.due),Infinity);
  const next=Math.min(end,midnight,Math.max(w.minute,e.nextPulse),Math.max(w.minute,taskDue));
  for(const t of Object.values(e.tasks))moveTask(w,t,next);
  const before=day(w);w.minute=next;
  if(day(w)!==before)settleDay(w,before);
  for(const t of Object.values(e.tasks).sort((a,b)=>a.due-b.due||a.actor.localeCompare(b.actor)))if(t.due<=w.minute&&e.tasks[t.actor]===t)finishTask(w,t);
  if(e.nextPulse<=w.minute)pulse(w);
  // Completed jobs choose their next action at shared pulse boundaries.
 }
 refreshEconomy(w);w.revision++;
}
export function returnMayor(w){
 const e=w.economy;e.playerOnlineUntil=w.minute+DEFAULTS.leaseMinutes;
 const t=e.tasks.player;if(t){
  moveTask(w,t,w.minute);
  if(t.pay){transfer(w,t.pay.escrow,t.pay.from,t.pay.amount,'refund','村长回来，未完成工作退回预留报酬');delete e.accounts[t.pay.escrow];}
  if(t.kind==='chore'){const job=e.chores.find(j=>j.id===t.job);if(job){job.status='open';delete job.worker;}}
  clearTask(w,t);
 }
 const totals=e.totals,old=e.lastVisitTotals;e.offlineSummary={from:e.lastVisitMinute,to:w.minute,labor:totals.labor-old.labor,share:totals.share-old.share,spending:totals.spending-old.spending,hotelNet:(totals.hotelIncome-old.hotelIncome)-(totals.hotelCosts-old.hotelCosts),visits:e.hotel.reviews.filter(r=>r.at>e.lastVisitMinute).slice(-3)};
 e.lastVisitTotals={...totals};e.lastVisitMinute=w.minute;w.player.action='在小镇走走';
}
function requestKey(b){return JSON.stringify(Object.fromEntries(Object.entries(b).filter(([k])=>!['revision','requestId'].includes(k)).sort(([a],[b])=>a.localeCompare(b))));}
function beginRequest(w,b){
 const e=w.economy;if(!e)throw new Error('这个小镇尚未启用经营');
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(String(b.requestId||'')))throw new Error('操作标识缺失');
 const previous=e.requests[b.requestId];if(previous){if(previous.key!==requestKey(b))throw new Error('操作标识已被使用');return previous.result;}
 if(w.paused)throw new Error('小镇已暂停');
 if(!Number.isInteger(b.revision)||b.revision!==e.revision)throw new Error('经营情况刚有变化，请再试一次');
 return null;
}
function finishRequest(w,b,result){w.economy.requests[b.requestId]={key:requestKey(b),result};w.economy.revision++;w.revision++;refreshEconomy(w);return result;}
function nextFurnitureCode(w,defId){const letter=objectCatalog.letters[defId],used=new Set(objectSources(w).map(o=>o.code));for(let i=1;i<=9;i++)if(!used.has(letter+i))return letter+i;throw new Error('这种家具已达到九件，先用好现有的吧');}
export function economyAction(w,b){
 const previous=beginRequest(w,b);if(previous)return previous;const e=w.economy;let result;
 if(b.action==='buy'){
  const g=GOODS[b.product];if(!g?.defId)throw new Error('找不到这件家具');const code=nextFurnitureCode(w,g.defId),shop=biz(w,g.business);
  if(!shop.stock[b.product]){shop.orders[b.product]=Math.max(1,shop.orders[b.product]||0);result={speech:`${g.name}暂时售罄，已经请${shop.name}补货，不扣款。`,ordered:true};}
  else {if(account(w,'person:player')<g.price)throw new Error('个人镇币不足，先做些杂活吧');const tx=sell(w,g.business,b.product,'person:player');const id=`owned-${++e.furnitureSeq}`;createObject(w,g.defId,id,code);note(w,'furniture_purchase',`你花 ${money(g.price)} 镇币买了${g.name}，放入酒店仓库。`,[shop.owner],{player:true,objectId:id,transaction:tx.id});result={speech:`${g.name}已送到酒店仓库。`,objectId:id};}
 }else if(b.action==='transfer'){
  const amount=Math.round(Number(b.amount)*100);if(!Number.isFinite(amount)||amount<=0||!Number.isSafeInteger(amount)||!['deposit','withdraw'].includes(b.direction))throw new Error('请输入有效金额');
  const deposit=b.direction==='deposit';transfer(w,deposit?'person:player':'biz:hotel',deposit?'biz:hotel':'person:player',amount,b.direction,deposit?'村长投入酒店经营资金':'村长提取酒店资金');result={speech:`${deposit?'投入酒店':'转入个人钱包'} ${money(amount)} 镇币。`};
 }else if(b.action==='concept'){
  const d=def(b.business),shop=d&&biz(w,d.id),concept=CONCEPTS[d?.id]?.find(c=>c.id===b.concept);if(!d||!concept)throw new Error('店铺概念无效');
  if(shop.concept===concept.id||shop.pendingConcept===concept.id)throw new Error('已经采用或正在准备这个概念');
  if(account(w,business(d.id))<DEFAULTS.conceptCost)throw new Error('店里暂时没有足够的换装资金');
  if(concept.requires&&!props(w).some(o=>o.group===d.place&&o.defId===concept.requires))throw new Error('店里还缺少这个概念需要的物件');
  shop.pendingConcept=concept.id;note(w,'concept_agreement',`你与${w.residents.find(r=>r.id===d.owner).name}商定改为“${concept.name}”，现有订单完成后更换。`,[d.owner],{player:true});result={speech:`店主同意了。当前订单完成后换成${concept.name}，店铺支付20镇币材料费。`};
 }else if(b.action==='invite'){
  const r=w.residents.find(r=>r.id===b.resident);if(!r)throw new Error('找不到这位村民');
  if(e.hotel.invitations.some(i=>i.resident===r.id&&(['accepted','arriving'].includes(i.status)||Math.floor(i.at/1440)===day(w))))throw new Error('已经邀请过了，让邻居按自己的时间来吧');
  const accepted=r.trust>=25&&r.energy>=20;const invitation={id:`invitation-${e.hotel.invitations.length+1}`,resident:r.id,at:w.minute,status:accepted?'accepted':'declined'};e.hotel.invitations.push(invitation);
  const line=accepted?'好，我忙完后傍晚过来坐坐。':'今天想留点时间休息，改天再去。';note(w,'hotel_invitation',`你邀请${r.name}到酒店做客。${r.name}说：“${line}”`,[r.id],{player:true});result={speech:line};
 }else if(b.action==='job'){
  const job=e.chores.find(j=>j.id===b.job);if(!job||job.status!=='open')throw new Error('这件杂活已经有人接了');
  if(e.tasks.player)throw new Error('先完成手里的工作');if(!takeChore(w,'player',job))throw new Error('这件工作暂时缺少材料、资金或通路');
  note(w,'job_started',`你接下了${job.label}，准备走过去完成。`,[],{player:true,job:job.id});result={speech:`开始${job.label}，完成后收入 ${money(job.pay)} 镇币。`,playerWorking:true};
 }else if(b.action==='cancel-job'){
  const t=e.tasks.player;if(!t||t.kind!=='chore')throw new Error('没有正在进行的杂活');
  if(t.pay){transfer(w,t.pay.escrow,t.pay.from,t.pay.amount,'refund','取消未完成的工作');delete e.accounts[t.pay.escrow];}
  const job=e.chores.find(j=>j.id===t.job);if(job){job.status='open';delete job.worker;}clearTask(w,t);result={speech:'工作已暂停，没有结算报酬。'};
 }else throw new Error('未知经营操作');
 return finishRequest(w,b,result);
}
export function visitorInteraction(w,b){
 const previous=beginRequest(w,b);if(previous)return previous;const v=w.economy.visitors.find(v=>v.id===b.visitor);if(!v)throw new Error('这位游客已经离镇');
 if(dist(w.player,v.life)>4)throw new Error('走近游客再说吧');if(v.interactions>=v.maxInteractions)throw new Error('游客想继续逛逛了');
 const message=String(b.message||'').trim().slice(0,300);if(!message)throw new Error('先说一句话吧');
 v.interactions++;v.engagedUntil=w.minute+3;
 let line=/酒店|住|房/.test(message)?`${hotelRooms(w).filter(r=>r.ready&&!w.economy.hotel.rooms[r.id].guest).length}间客房现在有空，我会看看合不合适。`:/花|植物/.test(message)?'我会去花圃转转，能带一盆回去就好了。':v.purchases.length?`刚买了${GOODS[v.purchases.at(-1).product].name}，接下来随便走走。`:'第一次来这里，我想先自己逛逛。';
 if(v.interactions===v.maxInteractions)line+=' 我继续逛啦。';
 const event=note(w,'visitor_dialogue',`你对${v.name}说：“${message}” ${v.name}说：“${line}”`,[],{player:true,visitor:v.id});speech(w,v.id,line);
 return finishRequest(w,b,{speech:line,eventId:event.id,remaining:v.maxInteractions-v.interactions});
}
export function economyActivity(w,b){
 // Old scene actions no longer mint items or burn coins outside the ledger.
 const d=BUSINESS_DEFS.find(x=>x.place===b.place);if(!d)return {speech:b.place==='hotel'?'两间客房已经营业，点酒店查看账本、家具和杂活。':'在这里走走，看看邻居正在忙什么。'};
 const product=d.products.find(id=>!GOODS[id].defId&&!GOODS[id].service&&biz(w,d.id).stock[id]>0);if(!product)return {speech:`${d.name}正在安排营业，稍后再来看看。`};
 const p=layout.places.find(p=>p.id===d.place);if(dist(w.player,p)>4)throw new Error('走近店铺再试吧');const tx=sell(w,d.id,product,'person:player');if(!tx)throw new Error('余额或库存不足');
 note(w,'consumption',`你在${d.name}买了${GOODS[product].name}，花费 ${money(tx.amount)} 镇币。`,[d.owner],{player:true,transaction:tx.id});w.revision++;return {speech:`买了${GOODS[product].name}，花费 ${money(tx.amount)} 镇币。`};
}
export function economyGift(w,r){
 const tx=sell(w,'cafe','bread','person:player');if(!tx)throw new Error('点心售罄或个人余额不足');
 note(w,'gift',`你买了一份面包送给${r.name}，花费 ${money(tx.amount)} 镇币。`,[r.id],{player:true,transaction:tx.id});r.trust=cap(r.trust+3);r.hunger=cap(r.hunger-20);return {speech:'谢谢，正好忙完吃一点。',delta:3,mode:'rules'};
}
export function publicEconomy(w){
 const e=w.economy;if(!e)return null;
 const rooms=hotelRooms(w).map(r=>({...r,guest:e.hotel.rooms[r.id].guest,stays:e.hotel.rooms[r.id].stays}));
 return {report:economicReport(w),version:e.version,revision:e.revision,attractiveness:e.attractiveness,treasury:account(w,'town'),wallet:account(w,'person:player'),hotelBalance:account(w,'biz:hotel'),playerWorking:!!e.tasks.player,playerTask:e.tasks.player?{label:e.tasks.player.label,due:e.tasks.player.due,phase:e.tasks.player.phase}:null,
  businesses:BUSINESS_DEFS.map(d=>({...biz(w,d.id),balance:account(w,business(d.id)),place:d.place,workers:d.workers,concepts:(CONCEPTS[d.id]||[]).map(c=>({...c,cost:DEFAULTS.conceptCost}))})),
  residents:w.residents.map(r=>({id:r.id,balance:account(w,person(r.id))})),
  furniture:FURNITURE.map(g=>({id:g.id,name:g.name,price:g.price,defId:g.defId,business:g.business,stock:biz(w,g.business).stock[g.id]||0,size:objectCatalog.definitions[g.defId].size})),
  warehouse:allObjects(w).filter(o=>o.owner==='村长'&&o.state.stored).map(o=>({id:o.id,name:o.name,code:o.code,defId:o.defId})),
  hotel:{rooms,reviews:e.hotel.reviews.slice(-20),invitations:e.hotel.invitations.slice(-20),snacks:e.hotel.snacks},
  chores:e.chores.filter(j=>j.status!=='done').map(j=>({...j})),
  ledger:e.ledger.filter(t=>t.kind!=='initial').slice(-50).map(t=>({...t,fromName:sourceName(w,t.from),toName:sourceName(w,t.to)})),
  days:Object.values(e.days).slice(-14),offlineSummary:e.offlineSummary,visitorHistory:e.visitorHistory.slice(-12).map(v=>({...v,purchases:v.purchases.map(p=>({...p,name:GOODS[p.product]?.name||'商品'}))})),
  milestones:MILESTONES.map(([id,name])=>({id,name,done:!!e.milestones[id]})),planner:{mode:e.planner.mode,day:e.planner.day}};
}
export function publicVisitors(w){return (w.economy?.visitors||[]).map(v=>({id:v.id,name:v.name,code:v.code,role:'游客',tags:[v.interest],thought:v.thought,location:v.location,action:v.action,trust:0,mood:70,goal:'来小镇逛逛',memories:[],life:v.life,visitor:true,remaining:v.maxInteractions-v.interactions,spent:v.spent}));}
export function economyPlanContext(w){return {day:day(w),businesses:BUSINESS_DEFS.map(d=>({id:d.id,name:d.name,workers:d.workers,products:d.products,balance:account(w,business(d.id)),stock:biz(w,d.id).stock,concept:biz(w,d.id).concept,orders:biz(w,d.id).orders})),attractiveness:w.economy.attractiveness.score,visitors:w.economy.visitors.length,rooms:hotelRooms(w).map(r=>({ready:r.ready,comfort:r.comfort})),publicJobs:w.economy.chores.filter(j=>j.status==='open').length};}
export function applyEconomyPlan(w,plan,expectedDay){
 if(day(w)!==expectedDay)return false;
 if(!Array.isArray(plan.businesses)||plan.businesses.length>BUSINESS_DEFS.length)throw new Error('无效经营安排');
 const accepted=[];for(const p of plan.businesses){const b=def(p.id);if(!b||!['balanced','conserve','stock','welcome'].includes(p.mode)||p.product&&!b.products.includes(p.product))throw new Error('经营安排超出能力');accepted.push(p);}
 for(const p of accepted){const b=biz(w,p.id);b.plan=account(w,business(p.id))<500?'conserve':p.mode;b.priority=p.product||null;}
 w.economy.planner.mode='deepseek';w.economy.revision++;w.revision++;return true;
}
export function repathEconomy(w){
 if(!w.economy)return;
 for(const t of Object.values(w.economy.tasks))if(t.phase==='walking'){
  const p=position(w,t.actor),route=routeBetween(p,t.point,w);if(!route)continue;
  const length=route.reduce((s,q,i)=>s+dist(i?route[i-1]:p,q),0);t.route=route;t.lastMove=w.minute;t.travelEnd=Math.max(w.minute,t.pauseUntil||0)+Math.max(1,Math.ceil(length/.95));t.due=t.travelEnd;p.route=route;
 }
}
