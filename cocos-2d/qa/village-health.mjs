import fs from 'node:fs';
import assert from 'node:assert/strict';
process.env.MOSSVALE_SCENE='cafe-2d';process.env.MOSSVALE_LAYOUT=new URL('../assets/resources/town-layout.json',import.meta.url).pathname;
const {seed,record,advance}=await import('../../server/engine.mjs');
const {initializeLife,initializeGridResidents,layout,routeBetween,walkable}=await import('../../server/life.mjs');
const {initializeObjects}=await import('../../server/objects.mjs');
const {initializeEconomy}=await import('../../server/economy.mjs');
const {installTownMind,ensureSchedule}=await import('../../server/calendar.mjs');
const {installLongMemory}=await import('../../server/long-memory.mjs');
export function make(){const w=seed();initializeLife(w,seed(),record);initializeObjects(w);initializeGridResidents(w,seed(),record);Object.assign(w.player,layout.spawn);initializeEconomy(w);installLongMemory(w);installTownMind(w);for(const r of w.residents)ensureSchedule(w,r,layout.places);return w;}
const w=make(),days=Number(process.argv[2]||14),start=w.minute,samples=[];
const routes=layout.places.map(p=>({id:p.id,walkable:walkable(p.x,p.z,w),route:!!routeBetween(layout.spawn,p,w)}));assert.ok(routes.every(r=>r.walkable&&r.route));
for(let i=0;i<days*96;i++){advance(w,15,{offline:true});if(i%96===95)samples.push({day:i/96+1,residents:w.residents.map(r=>({id:r.id,cash:w.economy.accounts['person:'+r.id],hunger:r.hunger,work:r.economicDay.workMinutes})),town:w.economy.accounts.town,businesses:Object.fromEntries(Object.keys(w.economy.businesses).map(id=>[id,w.economy.accounts['biz:'+id]]))});}
const e=w.economy,initial=e.ledger.filter(t=>t.kind==='initial').reduce((n,t)=>n+t.amount,0),externalIn=e.ledger.filter(t=>t.from.startsWith('visitor:')).reduce((n,t)=>n+t.amount,0),externalOut=e.ledger.filter(t=>t.to==='outside').reduce((n,t)=>n+t.amount,0),cash=Object.entries(e.accounts).filter(([id])=>!id.startsWith('visitor:')).reduce((n,[,v])=>n+v,0);
assert.equal(cash,initial+externalIn-externalOut);assert.ok(Object.values(e.accounts).every(v=>Number.isInteger(v)&&v>=0));assert.ok(Object.values(e.businesses).every(b=>Object.values(b.stock).every(v=>Number.isInteger(v)&&v>=0)));
const out={days,elapsed:w.minute-start,routes,visitors:e.visitorSeq,stayPayments:e.ledger.filter(t=>t.kind==='lodging').length,businesses:Object.fromEntries(Object.entries(e.businesses).map(([id,b])=>[id,{cash:e.accounts['biz:'+id],sales:b.sales,stock:b.stock}])),residents:w.residents.map(r=>({id:r.id,cash:e.accounts['person:'+r.id],hunger:r.hunger,energy:r.energy,activities:w.events.filter(e=>e.type==='activity'&&e.participants.includes(r.id)).length})),wages:e.ledger.filter(t=>t.kind==='wage').reduce((n,t)=>n+t.amount,0),workShifts:w.events.filter(e=>e.type==='work_shift'&&e.pay).length,activityKinds:[...new Set(w.events.filter(e=>e.type==='activity').map(e=>e.activity))],touristPurchaseKinds:[...new Set(e.visitorHistory.flatMap(v=>v.purchases.map(p=>p.product)))],conservation:{cash,initial,externalIn,externalOut,error:cash-initial-externalIn+externalOut},samples,events:w.events.length};
fs.writeFileSync(new URL(`village-health-${days}d.json`,import.meta.url),JSON.stringify(out,null,2));console.log(JSON.stringify({...out,routes:undefined,samples:undefined}));
