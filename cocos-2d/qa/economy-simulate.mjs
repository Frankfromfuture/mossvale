// Focused seven-day acceptance simulation; uses an isolated in-memory save.
import path from 'node:path';
const base=path.resolve(import.meta.dirname,'../..')+'/';
process.env.MOSSVALE_SCENE='cafe-2d';
process.env.MOSSVALE_LAYOUT=base+'cocos-2d/assets/resources/town-layout.json';
const {seed,record,advance,publicWorld}=await import(base+'server/engine.mjs');
const {initializeLife,initializeGridResidents,layout}=await import(base+'server/life.mjs');
const {initializeObjects}=await import(base+'server/objects.mjs');
const {initializeEconomy,hotelRooms}=await import(base+'server/economy.mjs');
const fs=await import('node:fs');
const w=seed();initializeLife(w,seed(),record);initializeObjects(w);initializeGridResidents(w,seed(),record);Object.assign(w.player,layout.spawn);initializeEconomy(w);
console.log(JSON.stringify({initial:{residents:w.residents.length,rooms:hotelRooms(w).map(r=>({name:r.name,ready:r.ready,reason:r.reason,point:r.point})),attraction:w.economy.attractiveness.score}}));
const split=structuredClone(w),start=w.minute,now=Date.now();
advance(w,7*1440,{offline:true});
for(let i=0;i<7*24;i++)advance(split,60,{offline:true});
const compare=x=>JSON.stringify({minute:x.minute,accounts:x.economy.accounts,ledger:x.economy.ledger,days:x.economy.days,hotel:x.economy.hotel,tasks:x.economy.tasks,rng:x.economy.rng,visitors:x.economy.visitors,objects:x.objectWorld});
const initial=w.economy.ledger.filter(t=>t.kind==='initial').reduce((n,t)=>n+t.amount,0),flows=Object.values(w.economy.days).reduce((n,d)=>n+d.externalIn-d.externalOut,0),localCash=Object.entries(w.economy.accounts).filter(([id])=>!id.startsWith('visitor:')).reduce((n,[,v])=>n+v,0);
const evidence={seconds:(Date.now()-now)/1000,days:7,minute:w.minute,continuousEqualsSplit:compare(w)===compare(split),accountsConserved:localCash===initial+flows,initial,localCash,externalNet:flows,noNegativeAccounts:Object.values(w.economy.accounts).every(v=>Number.isSafeInteger(v)&&v>=0),noNegativeInventory:Object.values(w.economy.businesses).every(b=>Object.values(b.stock).every(v=>Number.isInteger(v)&&v>=0)),rooms:hotelRooms(w).map(r=>({name:r.name,ready:r.ready,stays:w.economy.hotel.rooms[r.id].stays})),visitors:w.economy.visitorHistory.length,transactions:w.economy.ledger.length,events:w.events.length,daysDetail:Object.values(w.economy.days),mayor:w.economy.totals,businesses:Object.values(w.economy.businesses).map(b=>({id:b.id,balance:w.economy.accounts['biz:'+b.id],sales:b.sales,status:b.status,stock:b.stock})),milestones:w.economy.milestones};
console.log(JSON.stringify(evidence));fs.writeFileSync('/tmp/mossvale-economy-sim-world.json',JSON.stringify(w));fs.writeFileSync('/tmp/mossvale-economy-sim-split.json',JSON.stringify(split));fs.writeFileSync(base+'cocos-2d/qa/economy-simulation.json',JSON.stringify(evidence,null,2));
