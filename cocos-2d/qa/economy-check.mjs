// Explicit acceptance run for the mayor/hotel iteration; never run on a user save.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
process.env.MOSSVALE_SCENE='cafe-2d';process.env.MOSSVALE_LAYOUT=path.join(root,'cocos-2d/assets/resources/town-layout.json');
const {seed,record,advance,publicWorld}=await import('../../server/engine.mjs');
const {initializeLife,initializeGridResidents,layout,walkable,routeBetween,repathResidents}=await import('../../server/life.mjs');
const {initializeObjects,objectAction,resolveObject}=await import('../../server/objects.mjs');
const {initializeEconomy,hotelRooms,economyAction,visitorInteraction,returnMayor,validateHotelPlacement,applyEconomyPlan,publicEconomy}=await import('../../server/economy.mjs');
const make=()=>{const w=seed();initializeLife(w,seed(),record);initializeObjects(w);initializeGridResidents(w,seed(),record);Object.assign(w.player,layout.spawn);initializeEconomy(w);return w;};
let serial=0;
const action=(w,action,payload={})=>economyAction(w,{action,...payload,revision:w.economy.revision,requestId:`acceptance-${++serial}`});
const object=(w,id,action,point={})=>objectAction(w,{object:id,action,...point,revision:resolveObject(w,id).revision,requestId:`object-check-${++serial}`},{record,layout,walkable,routeBetween,repathResidents,validatePlacement:validateHotelPlacement});
const w=make(),initialBalances=structuredClone(w.economy.accounts),initialFurniture=Object.keys(w.objectWorld.instances||{}).length;
assert.equal(w.residents.length,11);assert.equal(hotelRooms(w).filter(r=>r.ready).length,2);assert.equal(initializeEconomy(w),false);assert.deepEqual(w.economy.accounts,initialBalances);assert.equal(Object.keys(w.objectWorld.instances||{}).length,initialFurniture);
assert.ok(w.archivedResidents.find(r=>r.id==='ye'));assert.ok(w.events.some(e=>e.participants.includes('ye')));
const buy={action:'buy',product:'bed',revision:w.economy.revision,requestId:'purchase-idempotence'};
const first=economyAction(w,buy),balance=w.coins;assert.equal(balance,40);assert.deepEqual(economyAction(w,buy),first);assert.equal(w.coins,balance);
assert.throws(()=>economyAction(w,{...buy,product:'lamp'}),/标识/);
Object.assign(w.player,{x:25.5,z:-5.5});object(w,first.objectId,'move',{x:21,z:-7.5});
const lamp=action(w,'buy',{product:'lamp'});object(w,lamp.objectId,'move',{x:20.5,z:-6.5});
assert.equal(hotelRooms(w).filter(r=>r.ready).length,3);
const persisted=JSON.parse(JSON.stringify(w));initializeObjects(persisted);assert.equal(initializeEconomy(persisted),false);assert.equal(hotelRooms(persisted).filter(r=>r.ready).length,3);assert.equal(persisted.coins,w.coins);
Object.assign(w.player,{x:21.5,z:-6.5});object(w,lamp.objectId,'pack');assert.ok(resolveObject(w,lamp.objectId).state.stored);object(w,lamp.objectId,'move',{x:20.5,z:-6.5});
action(w,'transfer',{direction:'withdraw',amount:20});const desk=action(w,'buy',{product:'desk'});Object.assign(w.player,{x:22.5,z:-6.5});const navBefore=w.objectWorld.navRevision;assert.throws(()=>object(w,desk.objectId,'move',{x:25.5,z:-4.5}),/通道|位置|通路/);assert.equal(w.objectWorld.navRevision,navBefore);
const invitation=action(w,'invite',{resident:'lin'});assert.match(invitation.speech,/傍晚/);
// Let paid work appear, then accept a genuine job while the mayor is online.
w.economy.playerOnlineUntil=w.minute+200;advance(w,95);const job=w.economy.chores.find(j=>j.status==='open');assert.ok(job,'actual chore exists');
returnMayor(w);const laborBefore=w.economy.totals.labor;action(w,'job',{job:job.id});
while(w.economy.tasks.player){const t=w.economy.tasks.player;advance(w,Math.max(1,t.due-w.minute));}
assert.ok(w.economy.totals.labor>laborBefore);assert.equal(job.status,'done');assert.throws(()=>action(w,'job',{job:job.id}),/已经/);
advance(w,1600);
assert.ok(w.economy.hotel.invitations.some(i=>i.resident==='lin'&&i.status==='visited'));
assert.ok(w.economy.hotel.reviews.some(r=>r.name==='林夏'));
assert.ok(w.events.some(e=>e.type==='hotel_reception'));
assert.ok(w.economy.ledger.some(t=>t.kind==='lodging'));
const v=w.economy.visitors[0];assert.ok(v);Object.assign(w.player,{x:v.life.x,z:v.life.z});
for(let i=0;i<v.maxInteractions;i++)visitorInteraction(w,{visitor:v.id,message:'这趟玩得怎么样？',revision:w.economy.revision,requestId:`visitor-check-${i}`});
assert.throws(()=>visitorInteraction(w,{visitor:v.id,message:'再聊聊',revision:w.economy.revision,requestId:'visitor-limit-check'}),/继续逛逛/);
const ownedRooms=hotelRooms(w).filter(r=>w.economy.hotel.rooms[r.id].guest);if(ownedRooms.length){const room=ownedRooms[0];Object.assign(w.player,room.point);assert.throws(()=>object(w,room.bed,'pack'),/预约|使用/);}
const planBefore=JSON.stringify(w.economy.businesses);assert.throws(()=>applyEconomyPlan(w,{businesses:[{id:'cafe',mode:'stock',product:'bed'}]},Math.floor(w.minute/1440)),/超出能力/);assert.equal(JSON.stringify(w.economy.businesses),planBefore);
const originalMinutes=w.minute;const summaryBefore=w.economy.totals.share;advance(w,1440);returnMayor(w);assert.ok(w.economy.offlineSummary.to>originalMinutes);assert.ok(w.economy.totals.share>=summaryBefore);returnMayor(w);assert.equal(w.economy.offlineSummary.labor,0);assert.equal(w.economy.offlineSummary.hotelNet,0);
const evidence={residents:w.residents.length,initialReadyRooms:2,thirdRoomOpens:true,purchaseRetrySafe:true,warehousePersistence:true,blockedPlacementRejected:true,paidWork:true,hotelReception:true,guestRevenue:true,invitedResidentFeedback:true,visitorDialogueLimit:true,invalidModelPlanRejected:true,repeatedReturnDoesNotRepeatIncome:true,archivedHistoryPreserved:true};
fs.writeFileSync(path.join(root,'cocos-2d/qa/economy-acceptance.json'),JSON.stringify(evidence,null,2));
fs.writeFileSync('/tmp/mossvale-economy-ui-world.json',JSON.stringify(w));console.log(JSON.stringify(evidence));
