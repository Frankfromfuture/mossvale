// Manual, bounded latency comparison. No game saves or credential contents are read here.
import {app} from 'electron';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {seed,record,advance} from '../../server/engine.mjs';
import {initializeLife,initializeGridResidents,layout} from '../../server/life.mjs';
import {initializeObjects} from '../../server/objects.mjs';
import {initializeEconomy} from '../../server/economy.mjs';
import {routineFor} from '../../server/personality.mjs';
import {createJevLife} from '../../server/jev-life.mjs';
import {decide,aiStatus} from '../../server/ai.mjs';

const phase=process.env.MOSSVALE_SPEECH_PHASE||'after';
assert.ok(['before','after'].includes(phase));
const nativeFetch=globalThis.fetch,requests=[];
globalThis.fetch=async(url,options)=>{
 const payload=JSON.parse(options.body),started=performance.now();
 if(phase==='after'){
  const ctx=JSON.parse(payload.messages[1].content);
  assert.ok(ctx.resident.soul.personality&&ctx.resident.soul.boundaries&&ctx.resident.soul.speech);
  assert.ok(!ctx.places&&!ctx.nearby&&!ctx.mandatory);
  assert.ok(Array.isArray(ctx.memory));assert.equal(payload.max_tokens,160);
 }
 const response=await nativeFetch(url,options);
 const body=await response.clone().json();
 requests.push({ms:Math.round(performance.now()-started),inputChars:payload.messages.reduce((n,m)=>n+m.content.length,0),inputTokens:body.usage?.prompt_tokens,outputTokens:body.usage?.completion_tokens});
 return response;
};
function fixture(){
 const w=seed();initializeLife(w,seed(),record);initializeObjects(w);initializeGridResidents(w,seed(),record);initializeEconomy(w);
 Object.assign(w,{minute:1140,paused:false,usage:{},jevUsage:{}});
 Object.assign(w.economy,{nextPulse:1160,playerOnlineUntil:3000,nextVisitor:3000,tasks:{}});
 const point=layout.places.find(p=>p.id==='cafe');
 for(const r of w.residents){
  Object.assign(r,{busy:true,hunger:20,energy:85,location:'cafe',action:'稍作休息',economicDay:{day:0,meal:true,care:true,workMinutes:1000,lastBreakWork:1000,habits:Object.fromEntries(routineFor(r).habits.map(h=>[h.id,'completed']))}});
  Object.assign(r.life,{phase:'doing',engagedUntil:0,aiHoldUntil:0,x:point.x,z:point.z,route:[],speech:'',speechUntil:1140});
 }
 const a=w.residents.find(r=>r.id==='xu'),b=w.residents.find(r=>r.id==='tang');a.busy=false;b.busy=false;
 w.economy.tasks[a.id]={kind:'leisure',actor:a.id,phase:'doing',due:1141,started:1110,duration:30,place:'cafe',point,label:'坐下歇口气',activity:'tea',route:[]};
 w.economy.tasks[b.id]={kind:'habit',actor:b.id,phase:'doing',due:1200,started:1110,duration:90,place:'cafe',point,label:'整理花材',activity:'water',route:[]};
 b.action='整理花材';
 return {w,a,b};
}
const report={at:new Date().toISOString(),phase,environment:'Mac headless Electron; isolated in-memory worlds; real configured DeepSeek; fixed Jev reactions',scenarios:[],requests};
try{
 for(const reaction of ['chat','continue']){
  const {w,a,b}=fixture(),started=performance.now(),calls=[],saves=[];let choices=0;
  const loop=createJevLife({isCurrent:(_,x)=>x===w,enabled:()=>true,choose:async()=>({choice:choices++===0?'chat':reaction,mode:'jev',elapsedMs:0}),
   save:async()=>{const events=w.events.filter(e=>e.type==='dialogue'&&e.at>=1141);saves.push({count:events.length,ms:Math.round(performance.now()-started),visible:[a,b].filter(r=>r.life.speech&&r.life.speechUntil>w.minute).map(r=>r.id)});},
   decide:async(ctx,usage,kind)=>{
    if(calls.length){const first=w.events.find(e=>e.type==='dialogue'&&e.at>=1141);assert.ok(first&&saves.some(s=>s.count===1));assert.deepEqual(ctx.heard,{eventId:first.id,speaker:a.name,text:a.life.speech});assert.deepEqual(Object.keys(ctx.heard).sort(),['eventId','speaker','text']);}
    const call={speaker:ctx.resident.name,heard:ctx.heard||null};calls.push(call);
    const start=performance.now(),line=await decide(ctx,usage,kind);Object.assign(call,{ms:Math.round(performance.now()-start),speech:line.speech});return line;
   }});
  loop.attach('speech-latency',w);advance(w,1);await loop.drain();loop.cancel(w);
  const events=w.events.filter(e=>e.type==='dialogue'&&e.at>=1141);
  assert.equal(calls.length,2);assert.equal(events.length,2);assert.equal(events[1].replyTo,events[0].id);
  const first=saves.find(s=>s.count===1),reply=saves.find(s=>s.count===2);
  if(phase==='after'){assert.deepEqual(reply.visible,[b.id]);assert.equal(b.life.speechAt,w.minute);}
  report.scenarios.push({reaction,calls,firstPublishedMs:first.ms,replyPublishedMs:reply.ms,replyVisible:reply.visible,sequential:true,replyTo:true});
 }
 report.model=aiStatus().model;
 if(phase==='after'){
  const {w,a,b}=fixture();let choices=0,calls=0;
  globalThis.fetch=async()=>{
   if(++calls===2)throw Error('controlled-provider-failure');
   return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({speech:'这会儿挺安静，我在这坐一会儿。',evidence:['not-a-real-event']})}}]}),{headers:{'Content-Type':'application/json'}});
  };
  const loop=createJevLife({isCurrent:(_,x)=>x===w,enabled:()=>true,choose:async()=>({choice:'chat',mode:'jev',elapsedMs:0}),save:async()=>{},decide});
  loop.attach('speech-failure',w);advance(w,1);await loop.drain();loop.cancel(w);
  const events=w.events.filter(e=>e.type==='dialogue'&&e.at>=1141);
  assert.equal(calls,2);assert.equal(events.length,1);assert.ok(a.life.speechUntil>w.minute);assert.ok(b.life.speechUntil<=w.minute);
  assert.ok(!a.memories.find(m=>m.eventId===events[0].id).evidence.includes('not-a-real-event'));
  report.failureRecovery={replyFailurePreservesFirst:true,unrecognizedEvidenceFiltered:true};
 }
 await writeFile(new URL(`speech-latency-${phase}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));app.exit(0);
}catch(e){console.error(e.message);app.exit(1);}
