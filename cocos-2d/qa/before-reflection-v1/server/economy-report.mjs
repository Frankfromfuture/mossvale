import {personalityFor} from './personality.mjs';
import {layout} from './life.mjs';
import {BUSINESS_DEFS} from './economy-data.mjs';

const cache=new WeakMap();
const blank=()=>({income:0,expense:0,wages:0,ownerIncome:0,taxShare:0,transferIn:0,transferOut:0});
const duties={lin:'咖啡馆经营与饮品',wen:'面包与早餐制作',xu:'书屋经营与阅读服务',zhou:'杂货经营与原料采购',chen:'家具制作与维修',tang:'花圃经营与花艺',gu:'花圃育苗',shen:'植物养护',su:'照护服务',lu:'摄影与导览',a:'演奏与音乐体验'};
const placeNames={homes:'住宅区',meadow:'草地',home:'家中',park:'花园',square:'广场',shop:'杂货铺',garden:'花圃'};
function placeName(id){return layout.places.find(p=>p.id===id)?.short||placeNames[id]||'小镇散步';}
function profile(r){
 const p=personalityFor(r);return {age:p?.identity.age??null,personality:p?.daily_life.summary||r.persona?.summary||r.tags.join('、'),tags:p?.identity.tags||r.tags,
  habits:Object.entries(p?.daily_life.rhythm||{}).map(([time,places])=>({time:({morning:'上午',afternoon:'下午',evening:'傍晚'})[time]||time,text:`偏爱${places.map(placeName).filter((v,i,a)=>a.indexOf(v)===i).join('、')}`}))};
}
function add(stats,t,incoming){
 if(t.kind==='initial')return;
 if(['deposit','withdraw'].includes(t.kind)){stats[incoming?'transferIn':'transferOut']+=t.amount;return;}
 if(t.kind==='refund'&&incoming){stats.expense-=t.amount;return;}
 stats[incoming?'income':'expense']+=t.amount;
 if(incoming){if(t.kind==='wage')stats.wages+=t.amount;else if(t.kind==='owner-income')stats.ownerIncome+=t.amount;else if(t.kind==='tax-share')stats.taxShare+=t.amount;}
}
function indexedAccounts(w){
 const e=w.economy,currentDay=Math.floor(w.minute/1440);let c=cache.get(w);
 if(!c||c.count>e.ledger.length){c={count:0,day:currentDay,accounts:new Map()};cache.set(w,c);}
 if(c.day!==currentDay){c.day=currentDay;for(const a of c.accounts.values())a.today=blank();}
 for(let i=c.count;i<e.ledger.length;i++){
  const t=e.ledger[i];for(const [id,incoming] of [[t.to,true],[t.from,false]]){
   if(!id.startsWith('person:')&&!id.startsWith('biz:')&&id!=='town')continue;
   let a=c.accounts.get(id);if(!a){a={today:blank(),total:blank(),recent:[]};c.accounts.set(id,a);}
   add(a.total,t,incoming);if(Math.floor(t.at/1440)===currentDay)add(a.today,t,incoming);
   if(t.kind!=='initial'){a.recent.push({id:t.id,at:t.at,amount:t.amount,incoming,kind:t.kind,description:t.description});if(a.recent.length>12)a.recent.shift();}
  }
 }
 c.count=e.ledger.length;return c.accounts;
}
/** Read-only view. Index new transactions once; polling never rescans the full history. */
export function economicReport(w){
 const e=w.economy,index=indexedAccounts(w),currentDay=Math.floor(w.minute/1440);
 const finance=id=>{const a=index.get(id);return {balance:e.accounts[id]||0,today:a?.today||blank(),total:a?.total||blank(),recent:a?.recent||[]};};
 const people=[{id:'player',code:'A1',name:'你 · 村长',age:null,personality:'由你扮演村长，选择怎样与邻居相处。',tags:['村长'],habits:[{time:'离线时',text:'处理杂活、照看酒店，也会吃饭和休息。'}],job:'村长与酒店经营',workplace:'苔溪小酒店',action:w.player.action||'在小镇走走',task:e.tasks.player?.label||'',location:e.tasks.player?placeName(e.tasks.player.place):'小镇',...finance('person:player')},
  ...w.residents.map(r=>{const b=BUSINESS_DEFS.find(b=>b.workers.includes(r.id)),t=e.tasks[r.id];return {id:r.id,code:layout.actors.find(a=>a.id===r.id)?.code||'',name:r.name,...profile(r),job:duties[r.id]||r.role,workplace:b?.name||'小镇',action:r.action,task:t?.label||'',location:placeName(r.location),...finance('person:'+r.id)};})];
 const zero=()=>({externalIn:0,externalOut:0,tax:0,wages:0,hotelRevenue:0,hotelCosts:0,visitors:0});
 const total=zero();for(const d of Object.values(e.days))for(const key of Object.keys(total))total[key]+=d[key]||0;
 const today={...zero(),...e.days[currentDay]};
 return {day:currentDay+1,localCash:Object.entries(e.accounts).filter(([id])=>!id.startsWith('visitor:')).reduce((s,[,amount])=>s+amount,0),today,total,people,
  businesses:[...BUSINESS_DEFS,{id:'hotel',name:'苔溪小酒店',workers:['player']}].map(b=>({id:b.id,name:b.name,workers:b.workers.map(id=>people.find(p=>p.id===id)?.name||id),status:e.businesses[b.id].status,...finance('biz:'+b.id)})),publicAccount:finance('town')};
}
