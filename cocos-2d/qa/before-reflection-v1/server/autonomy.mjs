import {decide} from './ai.mjs';
import {context,record,clamp} from './engine.mjs';
import {venues} from './life.mjs';
import {chooseIntent,available,personalLine,personalReply,socialInterval} from './personality.mjs';

const venue=id=>venues.find(p=>p.id===id);
const distance=(a,b)=>Math.hypot(a.life.x-b.life.x,a.life.z-b.life.z);
const free=(w,r)=>!w.economy?.tasks[r.id]&&!w.paused&&!r.busy&&!(r.life.engagedUntil>w.minute)&&r.life.phase==='doing'&&available(w,venue(r.location));
const environment=(w,r)=>JSON.stringify([w.weather,Math.floor(w.minute/1440),r.persona.revision,r.trust,(w.chats[r.id]||[]).length,w.party?.status,w.party?.at,w.party?.accepted.includes(r.id)]);

// Every call has one resident's mind. A partner contributes only observable identity and speech.
export function autonomousContext(w,r,partner=null,heard=null){
 const nearby=w.residents.filter(o=>o!==r&&o.location===r.location&&r.life.phase!=='walking'&&o.life.phase!=='walking'&&distance(r,o)<3.5);
 const ctx=context(w,r,`${r.goal} ${r.action} ${nearby.map(o=>o.name).join(' ')} ${heard?.text||''}`);
 const privateIds=new Set(w.events.filter(e=>e.private||e.type==='secret').map(e=>e.id));
 const memories=[...r.memories.slice(-3),...ctx.memory];
 ctx.memory=[...new Map(memories.filter(m=>!privateIds.has(m.eventId)&&!m.evidence?.some(id=>privateIds.has(id))).map(m=>[m.eventId,m])).values()].slice(0,8).map(({text,eventId,kind,evidence})=>({text,eventId,kind,evidence}));
 delete ctx.conversation;delete ctx.belief;delete ctx.state.trust;delete ctx.knownResidents;
 ctx.state.placeId=r.location;ctx.state.phase=r.life.phase;
 ctx.places=venues.map(p=>({id:p.id,name:p.short,activity:p.activity,open:available(w,p)}));
 ctx.nearby=nearby.map(o=>({id:o.id,name:o.name,action:o.action,relationship:r.relations[o.id]??30,available:free(w,o)}));
 ctx.commitments=w.party?.accepted.includes(r.id)&&w.party.status==='planned'?{at:w.party.at,place:'cafe',accepted:true}:null;
 const need=chooseIntent(w,r,venues);ctx.mandatory=need.priority==='preference'?null:need;
 if(partner)ctx.partner={id:partner.id,name:partner.name,action:partner.action,relationship:r.relations[partner.id]??30};
 if(heard)ctx.heard=heard;
 ctx.request=partner?'决定是否与眼前的邻居交流。':'安排接下来的生活。';
 return ctx;
}

export function createAutonomy({save,isCurrent}){
 const states=new WeakMap();let queue=[],running=0;
 const state=w=>{let s=states.get(w);if(!s){s={generation:0,locks:new Set(),socialQueued:false};states.set(w,s);}return s;};
 const current=job=>isCurrent(job.id,job.w)&&!job.cancelled;
 const valid=job=>current(job)&&(job.type!=='plan'||job.generation===state(job.w).generation);
 function pump(){
  queue=queue.filter(valid);
  while(running<2){
   const index=queue.findIndex(j=>j.people.every(id=>!state(j.w).locks.has(id)));
   if(index<0)return;
   const job=queue.splice(index,1)[0],s=state(job.w);running++;job.people.forEach(id=>s.locks.add(id));
   Promise.resolve().then(()=>job.type==='plan'?plan(job):conversation(job)).catch(()=>{
    // A failed background task never rejects the HTTP/tick loop or logs provider data.
   }).finally(async()=>{
    running--;job.people.forEach(id=>s.locks.delete(id));if(job.type==='social')s.socialQueued=false;
    if(current(job)){job.w.revision++;await save(job.id,job.w).catch(()=>{});}pump();
   });
  }
 }
 function arrival(id,w){
  if(!w.lifeVersion)return;
  if(w.economy){w.autonomy={...(w.autonomy||{}),enabled:true,conversations:w.autonomy?.conversations||0};return;}
  const s=state(w);s.generation++;
  w.autonomy={version:1,enabled:true,visitId:w.arrival.id,requestedAt:w.minute,requested:w.residents.length,completed:0,applied:0,fallback:0,stale:0,pending:w.residents.length,conversations:w.autonomy?.conversations||0};
  for(const r of w.residents)queue.push({id,w,type:'plan',people:[r.id],generation:s.generation,stats:w.autonomy});
  pump();
 }
 async function plan(job){
  const {w,stats}=job,r=w.residents.find(r=>r.id===job.people[0]),snapshot=environment(w,r);
  let outcome='fallback';
  try{
   if(!valid(job)||w.paused)return;
   const choice=await decide(autonomousContext(w,r),w.usage,'autonomy-plan');
   if(!valid(job))return;
   if(w.paused||snapshot!==environment(w,r)){outcome='stale';return;}
   const need=chooseIntent(w,r,venues),forced=need.priority!=='preference';
   const other=choice.action==='talk'?w.residents.find(o=>o.id===choice.target):null;
   if(!forced&&choice.action==='talk'&&(!other||!free(w,r)||!free(w,other)||other.location!==r.location||distance(r,other)>=3.5)){outcome='stale';return;}
   const target=forced?need.place:choice.action==='talk'?r.location:choice.target;
   if(!available(w,venue(target))){outcome='stale';return;}
   const next={place:target,reason:forced?need.reason:choice.thought,priority:need.priority,evidence:choice.evidence,at:w.minute,weather:w.weather,soulRevision:r.persona.revision,mode:'deepseek'};
   r.life.nextPlan=next;r.thought=next.reason;
   r.life.lastDecision={visitId:stats.visitId,at:w.minute,mode:'deepseek',action:forced?'move':choice.action,target:forced?target:choice.target,evidence:choice.evidence};
   if(!forced&&choice.action==='talk'){
    const other=w.residents.find(o=>o.id===choice.target);
    if(other&&free(w,r)&&free(w,other)&&other.location===r.location&&distance(r,other)<3.5){r.life.socialTarget=other.id;r.life.nextSocial=w.minute;}
   }
   if(free(w,r)){r.life.speech=forced?next.reason:choice.speech;r.life.speechAt=w.minute;r.life.speechUntil=w.minute+7;}
   outcome='applied';
  }catch(e){
   if(valid(job))r.life.lastDecision={visitId:stats.visitId,at:w.minute,mode:'rules',reason:['budget','rules','busy'].includes(e.message)?e.message:'unavailable'};
  }finally{
   if(valid(job)){stats.completed++;stats.pending--;stats[outcome]++;}
  }
 }
 function tick(id,w){
  if(!w.lifeVersion||!w.autonomy?.enabled||w.paused)return;
  const s=state(w);if(s.socialQueued)return;
  const ready=r=>free(w,r)&&!s.locks.has(r.id)&&w.minute>=r.life.nextSocial&&chooseIntent(w,r,venues).priority==='preference';
  for(const r of w.residents.filter(ready).sort((a,b)=>Number(!!b.life.socialTarget)-Number(!!a.life.socialTarget))){
   const other=w.residents.filter(o=>o!==r&&ready(o)&&o.location===r.location&&distance(r,o)<3.5).sort((a,b)=>Number(b.id===r.life.socialTarget)-Number(a.id===r.life.socialTarget))[0];
   if(!other)continue;
   s.socialQueued=true;queue.push({id,w,type:'social',people:[r.id,other.id]});pump();break;
  }
 }
 async function conversation(job){
  const {w}=job,[a,b]=job.people.map(id=>w.residents.find(r=>r.id===id));
  if(!current(job)||!free(w,a)||!free(w,b)||a.location!==b.location||distance(a,b)>=3.5)return;
  const weather=w.weather,place=a.location,started=w.minute,key=`${w.arrival?.id}:${a.id}:${b.id}:${started}`;
  const stillTogether=()=>current(job)&&!w.paused&&w.weather===weather&&a.location===place&&b.location===place&&a.life.phase!=='walking'&&b.life.phase!=='walking'&&distance(a,b)<3.5&&available(w,venue(place))&&[a,b].every(r=>!r.busy&&!(r.life.engagedUntil>w.minute)&&r.life.aiConversation===key&&r.life.aiHoldUntil>Date.now()&&chooseIntent(w,r,venues).priority==='preference');
  for(const r of [a,b]){r.life.aiConversation=key;r.life.aiHoldUntil=Date.now()+50000;r.life.nextSocial=w.minute+socialInterval(r);delete r.life.socialTarget;}
  let encounter,opening,reply;
  const speak=(speaker,listener,choice)=>{
   const event=record(w,'dialogue',`${speaker.name}对${listener.name}说：“${choice.speech}”`,[a.id,b.id],5,{place,autonomous:true,speaker:speaker.id,listener:listener.id,mode:choice.mode,evidence:[encounter.id]});
   // Only the speaker's own memory gets their private reasoning references.
   const own=speaker.memories.at(-1);own.evidence=[encounter.id,...(choice.evidence||[])];
   speaker.thought=choice.thought;return event;
  };
  try{
   try{opening=await decide(autonomousContext(w,a,b),w.usage,'autonomy-open');}
   catch{opening={action:'talk',speech:personalLine(a,a.life.activity,venue(place)),thought:a.thought,evidence:[],mode:'rules'};}
   if(!stillTogether())return;
   if(opening.action==='wait'){a.thought=opening.thought;return;}
   encounter=record(w,'encounter',`${a.name}在${venue(place).short}主动和${b.name}搭话。`,[a.id,b.id],6,{place,activity:'talk',autonomous:true,mode:opening.mode});
   const heard=speak(a,b,opening);
   for(const [r,o] of [[a,b],[b,a]]){Object.assign(r.life,{phase:'social',socialWith:o.id,until:w.minute+10,speechAt:w.minute,speechUntil:w.minute});r.action=`和${o.name}聊聊天`;}
   Object.assign(a.life,{speech:opening.speech,speechUntil:w.minute+24});w.revision++;await save(job.id,w);
   try{reply=await decide(autonomousContext(w,b,a,{eventId:heard.id,speaker:a.name,text:opening.speech}),w.usage,'autonomy-reply');}
   catch{reply={action:'talk',speech:personalReply(b),thought:b.thought,evidence:[],mode:'rules'};}
   if(!stillTogether())return;
   speak(b,a,reply);
   const duration=reply.action==='refuse'?6:10;
   Object.assign(a.life,{speech:opening.speech,speechAt:w.minute,speechUntil:w.minute+3});
   Object.assign(b.life,{speech:reply.speech,speechAt:w.minute+3,speechUntil:w.minute+duration});
   for(const [r,o] of [[a,b],[b,a]]){r.life.until=w.minute+duration;r.life.nextSocial=w.minute+socialInterval(r);if(reply.action==='talk'){r.relations[o.id]=clamp((r.relations[o.id]??30)+2);r.mood=clamp(r.mood+1);}}
   w.autonomy.conversations++;
  }finally{
   for(const r of [a,b])if(r.life.aiConversation===key){delete r.life.aiHoldUntil;delete r.life.aiConversation;if(!reply&&r.life.phase==='social'){r.life.until=w.minute+3;r.life.speechUntil=Math.min(r.life.speechUntil,w.minute+3);}}
  }
 }
 function cancel(w){
  const s=states.get(w);if(s)s.generation++;
  queue=queue.filter(j=>j.w!==w);
  for(const r of w.residents){if(r.life){delete r.life.aiHoldUntil;delete r.life.aiConversation;}}
 }
 return {arrival,tick,cancel};
}
