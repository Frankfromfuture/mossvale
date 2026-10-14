// One focused acceptance exercise on new, isolated in-memory towns; no user's save.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
process.env.MOSSVALE_SCENE='cafe-2d';process.env.MOSSVALE_LAYOUT=root+'/cocos-2d/assets/resources/town-layout.json';
const {seed,record,advance,context,publicWorld}=await import('../../server/engine.mjs');
const {initializeLife,initializeGridResidents,layout}=await import('../../server/life.mjs');
const {initializeObjects}=await import('../../server/objects.mjs');
const {initializeEconomy,hotelRooms}=await import('../../server/economy.mjs');
const {installReflections,reflectionContext,applyReflection,reflectionFallback}=await import('../../server/reflection.mjs');
const {personalActivity,activityStatus}=await import('../../server/resident-routine.mjs');
const {routineFor}=await import('../../server/personality.mjs');
const {autonomousContext}=await import('../../server/autonomy.mjs');
function make(){const w=seed();initializeLife(w,seed(),record);initializeObjects(w);initializeGridResidents(w,seed(),record);Object.assign(w.player,layout.spawn);initializeEconomy(w);return w;}
const w=make(),split=structuredClone(w);advance(w,1440);for(let i=0;i<24;i++)advance(split,60);
const compare=x=>JSON.stringify({accounts:x.economy.accounts,ledger:x.economy.ledger,rng:x.economy.rng,tasks:x.economy.tasks,events:x.events,residents:x.residents});
assert.equal(compare(w),compare(split),'same day simulated continuously and in hourly chunks');
const habits=Object.fromEntries(w.residents.map(r=>[r.id,w.events.filter(e=>e.participants.includes(r.id)&&e.habit).map(e=>e.habit)]));
assert.ok(Object.values(habits).every(ids=>new Set(ids).size>=2),'each resident actually completed distinct personal habits');
assert.ok(new Set(w.residents.map(r=>routineFor(r).wake_minute)).size>=6);
const initial=w.economy.ledger.filter(t=>t.kind==='initial').reduce((n,t)=>n+t.amount,0),flows=Object.values(w.economy.days).reduce((n,d)=>n+d.externalIn-d.externalOut,0),cash=Object.entries(w.economy.accounts).filter(([id])=>!id.startsWith('visitor:')).reduce((n,[,v])=>n+v,0);
assert.equal(cash,initial+flows);assert.ok(Object.values(w.economy.accounts).every(n=>Number.isSafeInteger(n)&&n>=0));assert.equal(hotelRooms(w).filter(r=>r.ready).length,2);assert.ok(w.economy.ledger.some(t=>t.kind==='lodging'),'hotel still receives actual guest payments');
let example;
for(const original of w.residents){
 const town=structuredClone(w),r=town.residents.find(r=>r.id===original.id),ctx=reflectionContext(town,r,layout.places);if(!ctx)continue;
 const before=personalActivity(town,r,layout.places);
 for(const subject of ctx.subjects.filter(s=>s.kind==='place'&&s.id!==before.place&&s.id!=='home')){
  const evidence=ctx.observations.filter(o=>o.kind==='fact'&&o.subjects.includes(subject.key)).slice(-3).map(o=>o.eventId);
  const copy=structuredClone(town),resident=copy.residents.find(x=>x.id===r.id);
  applyReflection(copy,resident,ctx,{impressions:[{key:subject.key,direction:1,summary:`在${subject.name}有过几次实际活动，我愿意再去看看。`,evidence}]},{record});
  const after=personalActivity(copy,resident,layout.places);if(after.place!==before.place){example={resident:r.id,before:before.place,after:after.place,evidence};break;}
 }
 if(example)break;
}
assert.ok(example,'a sourced impression changes a real leisure choice');
const r=w.residents.find(r=>r.id===example.resident),ctx=reflectionContext(w,r,layout.places),ledger=JSON.stringify(w.economy.ledger),memories=structuredClone(r.memories),personality=structuredClone(r.persona),trust=r.trust;
const proposed=reflectionFallback(ctx);proposed.impressions[0].direction=1;
assert.equal(applyReflection(w,r,ctx,proposed,{record}),true);assert.equal(applyReflection(w,r,ctx,proposed,{record}),false,'duplicate response has no second effect');
assert.equal(JSON.stringify(w.economy.ledger),ledger);assert.deepEqual(r.persona,personality);assert.equal(r.trust,trust);assert.deepEqual(r.memories.slice(0,memories.length),memories);
assert.ok(context(w,r,'今天想去哪里').impressions.length);
const restored=JSON.parse(JSON.stringify(w)),saved=restored.residents.find(o=>o.id===r.id).reflection;assert.equal(installReflections(restored),false);assert.deepEqual(saved,r.reflection);
// History/security boundary: other people's secrets and unsupported evidence do not become beliefs.
const other=w.residents.find(o=>o.id!==r.id),secret=record(w,'secret','仅另一位居民知道的验收私事。',[other.id],8,{private:true,place:'library'});
for(let i=0;i<3;i++)record(w,'activity',`${r.name}在书屋完成了一段阅读。`,[r.id],6,{place:'library'});
const next=reflectionContext(w,r,layout.places);assert.ok(next);assert.ok(!next.observations.some(o=>o.eventId===secret.id));
const bad={impressions:[{key:'place:library',direction:-1,summary:'没有依据的看法',evidence:[secret.id,next.observations.at(-1).eventId]}]},savedReflection=JSON.stringify(r.reflection);
assert.throws(()=>applyReflection(w,r,next,bad,{record}),/invalid-evidence/);assert.equal(JSON.stringify(r.reflection),savedReflection);
applyReflection(w,r,next,{impressions:[{key:'place:library',direction:-1,summary:'这几次阅读之后，我也想给别的地方留一点时间。',evidence:next.observations.filter(o=>o.kind==='fact'&&o.subjects.includes('place:library')).slice(-3).map(o=>o.eventId)}]},{record});
assert.ok(r.reflection.history.length>=2);
const privateFact=record(w,'activity','我独自读了私人的手记。',[r.id],6,{place:'library',private:true});for(let i=0;i<2;i++)record(w,'activity','在书屋安静读书。',[r.id],6,{place:'library'});
const privateCtx=reflectionContext(w,r,layout.places);applyReflection(w,r,privateCtx,{impressions:[{key:'place:library',summary:'想保留自己的安静时间。',direction:1,evidence:[privateFact.id,...privateCtx.observations.filter(o=>o.kind==='fact'&&o.eventId!==privateFact.id).slice(-2).map(o=>o.eventId)]}]},{record});
assert.ok(!autonomousContext(w,r,other).impressions.some(e=>e.key==='place:library'),'private conclusions never enter neighbour dialogue');
const picture=publicWorld(w,{mode:'rules'});assert.ok(picture.residents.every(r=>r.currentActivity?.icon));
const evidence={dayMinutes:1440,residents:w.residents.length,habitsCompleted:habits,impressionChangesAction:example,sourceValidation:true,privateMemoriesIsolated:true,revisionHistory:true,duplicateSafe:true,persistedAfterReload:true,personalityAndLedgerUnchangedByReflection:true,continuousEqualsChunked:true,hotelPayments:true,cashConserved:true,activityIcons:picture.residents.map(r=>({id:r.id,...r.currentActivity}))};
fs.writeFileSync(root+'/cocos-2d/qa/reflection-acceptance.json',JSON.stringify(evidence,null,2));
fs.writeFileSync('/tmp/mossvale-reflection-ui-world.json',JSON.stringify(w));
console.log(JSON.stringify(evidence));
