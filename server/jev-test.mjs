// Manual, local-only diagnostics. Worlds and test quotas never touch game saves.
import {seed,record,advance} from './engine.mjs';
import {initializeLife,initializeGridResidents,layout} from './life.mjs';
import {initializeObjects} from './objects.mjs';
import {initializeEconomy} from './economy.mjs';
import {routineFor} from './personality.mjs';
import {createJevLife} from './jev-life.mjs';
import {requestJev,jevConfigured} from './jev.mjs';
import {decide} from './ai.mjs';

const jevUsage={},speechUsage={};
let running=false;
export const jevTestStatus=()=>({configured:jevConfigured(),running});
function fixture(){
 const w=seed();initializeLife(w,seed(),record);initializeObjects(w);initializeGridResidents(w,seed(),record);initializeEconomy(w);
 Object.assign(w,{minute:1140,paused:false,usage:speechUsage,jevUsage});
 Object.assign(w.economy,{nextPulse:1140,playerOnlineUntil:3000,nextVisitor:3000,tasks:{}});
 const cafe=layout.places.find(p=>p.id==='cafe');
 for(const r of w.residents){
  Object.assign(r,{busy:true,hunger:20,energy:85,location:'cafe',action:'稍作休息',economicDay:{day:0,meal:true,care:true,workMinutes:1000,lastBreakWork:1000,habits:Object.fromEntries(routineFor(r).habits.map(h=>[h.id,'completed']))}});
  Object.assign(r.life,{phase:'doing',engagedUntil:0,aiHoldUntil:0,x:cafe.x,z:cafe.z,route:[]});
 }
 return w;
}

export async function runJevTest({scenario,rounds},{emit,signal}){
 if(!['idle','encounter','both'].includes(scenario)||![1,3].includes(rounds))throw Error('invalid-test');
 if(running)throw Error('test-busy');
 running=true;
 try{
  emit({type:'start',at:new Date().toISOString(),scenario,rounds});
  for(let round=1;round<=rounds;round++)for(const kind of scenario==='both'?['idle','encounter']:[scenario]){
   if(signal.aborted)return;
   const w=fixture(),a=w.residents.find(r=>r.id==='xu'),b=w.residents.find(r=>r.id==='tang');a.busy=false;b.busy=false;
   if(kind==='encounter'){
    w.economy.nextPulse=1160;const point=layout.places.find(p=>p.id==='cafe');
    w.economy.tasks[a.id]={kind:'leisure',actor:a.id,phase:'doing',due:1141,started:1110,duration:30,place:'cafe',point,label:'坐下歇口气',activity:'tea',route:[]};
    w.economy.tasks[b.id]={kind:'habit',actor:b.id,phase:'doing',due:1200,started:1110,duration:90,place:'cafe',point,label:'整理花材',activity:'water',route:[]};
   }
   const seen=new Set(),started=performance.now();
   emit({type:'scenario',round,scenario:kind});
   const capture=async()=>{
    if(signal.aborted)return;
    for(const s of w.jevLife?.samples||[]){
     if(seen.has(s))continue;seen.add(s);
     const r=w.residents.find(r=>r.id===s.resident),task=w.economy.tasks[s.resident];
     emit({type:'sample',round,scenario:kind,resident:r.id,name:r.name,kind:s.kind,mode:s.mode,reason:s.reason||null,
      selection:s.selection||null,confidence:s.confidence??null,basis:s.basis||null,basisKind:s.basisKind||null,
      requestMs:s.elapsedMs,firstTextMs:s.firstTextMs??null,observedAfterTriggerMs:Math.round(performance.now()-started),applied:s.applied,
      action:r.action,task:task?.label||null,speech:s.kind==='speech'?r.life.speech:null});
    }
   };
   const speech=async(ctx,usage,kind,options)=>{
    const start=performance.now();try{return await decide(ctx,usage,kind,{...options,onSpeech:text=>{options?.onSpeech?.(text);if(!signal.aborted)emit({type:'speech-delta',round,name:ctx.resident.name,resident:w.residents.find(r=>r.name===ctx.resident.name)?.id,text,elapsedMs:Math.round(performance.now()-start)});}});}catch(e){
     if(!signal.aborted)emit({type:'speech-error',round,scenario:'encounter',resident:w.residents.find(r=>r.name===ctx.resident.name)?.id,reason:['rules','budget','busy','configuration'].includes(e.message)?e.message:'unavailable',elapsedMs:Math.round(performance.now()-start)});
     throw e;
    }
   };
   const loop=createJevLife({isCurrent:(_,x)=>x===w&&!signal.aborted,save:capture,decide:speech,choose:requestJev,enabled:()=>true});
   const cancel=()=>loop.cancel(w);signal.addEventListener('abort',cancel,{once:true});
   try{
    loop.attach('manual-jev-test',w);advance(w,1);await loop.drain();await capture();
    if(signal.aborted)return;
    const samples=w.jevLife?.samples||[];
    if(samples.filter(s=>s.kind===kind).length!==2)throw Error('scenario-not-triggered');
    emit({type:'scenario-complete',round,scenario:kind,durationMs:Math.round(performance.now()-started),speechCount:samples.filter(s=>s.kind==='speech').length,
     events:w.events.filter(e=>e.at>=1141&&['encounter','dialogue'].includes(e.type)).map(e=>({type:e.type,text:e.text}))});
   }finally{signal.removeEventListener('abort',cancel);loop.cancel(w);}
  }
  if(!signal.aborted)emit({type:'complete'});
 }finally{running=false;}
}
