// One bounded live run through the production Jev decision loop. No user save is loaded.
import fs from 'node:fs';
import path from 'node:path';
import {app} from 'electron';
import {seed,record,advance} from '../../server/engine.mjs';
import {initializeLife,initializeGridResidents,layout} from '../../server/life.mjs';
import {initializeObjects} from '../../server/objects.mjs';
import {initializeEconomy} from '../../server/economy.mjs';
import {routineFor} from '../../server/personality.mjs';
import {createJevLife} from '../../server/jev-life.mjs';
import {requestJev} from '../../server/jev.mjs';
import {decide} from '../../server/ai.mjs';
const output=path.join(import.meta.dirname,'jev-key-latency.json');
const result={at:new Date().toISOString(),environment:'Local Mac; production Jev endpoint and encrypted Mossvale credential; isolated in-memory towns',scope:'Server request and applied task/encounter. Browser polling and visual movement are not included.',rounds:[],decisions:[],speech:[]};
const write=()=>fs.writeFileSync(output,JSON.stringify(result,null,2));
const make=()=>{const w=seed();initializeLife(w,seed(),record);initializeObjects(w);initializeGridResidents(w,seed(),record);initializeEconomy(w);w.minute=1140;w.economy.nextPulse=1140;w.economy.playerOnlineUntil=3000;w.economy.nextVisitor=3000;w.economy.tasks={};w.paused=false;
 for(const r of w.residents){r.busy=true;r.hunger=20;r.energy=85;r.economicDay={day:0,meal:true,care:true,workMinutes:1000,lastBreakWork:1000,habits:Object.fromEntries(routineFor(r).habits.map(h=>[h.id,'completed']))};r.life.phase='doing';r.life.engagedUntil=0;r.life.aiHoldUntil=0;r.location='cafe';const p=layout.places.find(p=>p.id==='cafe');Object.assign(r.life,{x:p.x,z:p.z,route:[]});r.action='稍作休息';}return w;};
async function run(kind,round){
 const w=make(),a=w.residents.find(r=>r.id==='xu'),b=w.residents.find(r=>r.id==='tang');a.busy=false;b.busy=false;
 if(kind==='encounter'){
  w.economy.nextPulse=1160;const p=layout.places.find(p=>p.id==='cafe');
  w.economy.tasks[a.id]={kind:'leisure',actor:a.id,phase:'doing',due:1141,started:1110,duration:30,place:'cafe',point:p,label:'坐下歇口气',activity:'tea',route:[]};
  w.economy.tasks[b.id]={kind:'habit',actor:b.id,phase:'doing',due:1200,started:1110,duration:90,place:'cafe',point:p,label:'整理画稿',activity:'write',route:[]};
 }
 const seen=new Set(),started=performance.now(),rows=[];
 const capture=async()=>{
  for(const s of w.jevLife?.samples||[]){if(seen.has(s))continue;seen.add(s);const r=w.residents.find(r=>r.id===s.resident),t=w.economy.tasks[s.resident];
   const row={round,scenario:kind,name:r.name,resident:s.resident,kind:s.kind,mode:s.mode,reason:s.reason||null,selected:s.selected||null,requestMs:s.elapsedMs,applied:s.applied,observedAfterTriggerMs:Math.round(performance.now()-started),action:r.action,phase:r.life.phase,task:t?{kind:t.kind,label:t.label,phase:t.phase,routeSteps:t.route?.length||0}:null};
   (s.kind==='speech'?result.speech:result.decisions).push(row);rows.push(row);
  }
 };
 const loop=createJevLife({isCurrent:(_,x)=>x===w,save:capture,decide,choose:requestJev});loop.attach('latency',w);advance(w,1);await loop.drain();await capture();
 const decisions=rows.filter(r=>r.kind===kind);if(decisions.length!==2)throw Error('scenario-did-not-trigger');
 result.rounds.push({round,scenario:kind,durationMs:Math.round(performance.now()-started),decisions:decisions.length,encounterRecorded:w.events.some(e=>e.type==='encounter'&&e.at>=1141),dialogue:w.events.filter(e=>e.type==='dialogue'&&e.at>=1141).map(e=>e.text)});
 write();console.log(JSON.stringify({round,scenario:kind,rows:rows.map(({name,kind,mode,reason,selected,requestMs,observedAfterTriggerMs,applied,action})=>({name,kind,mode,reason,selected,requestMs,observedAfterTriggerMs,applied,action}))}));
 if(decisions.every(r=>['http-401','http-403'].includes(r.reason)))throw Error('credential-rejected');
}
const stats=rows=>{const n=rows.map(r=>r.requestMs).sort((a,b)=>a-b),m=rows.map(r=>r.observedAfterTriggerMs).sort((a,b)=>a-b),accepted=rows.filter(r=>r.mode===(r.kind==='speech'?'deepseek':'jev')).length;return {count:n.length,accepted,fallbacks:n.length-accepted,timeouts:rows.filter(r=>r.reason==='timeout').length,minMs:n[0],medianMs:n.length%2?n[Math.floor(n.length/2)]:(n[n.length/2-1]+n[n.length/2])/2,maxMs:n.at(-1),averageMs:Math.round(n.reduce((a,b)=>a+b,0)/n.length),appliedMaxMs:m.at(-1)};};
try{
 for(let round=1;round<=3;round++){await run('idle',round);await run('encounter',round);}
 result.summary={all:stats(result.decisions),idle:stats(result.decisions.filter(r=>r.kind==='idle')),encounter:stats(result.decisions.filter(r=>r.kind==='encounter')),speech:result.speech.length?stats(result.speech):null};
 result.checks={twelveDecisions:result.decisions.length===12,idleApplied:result.decisions.filter(r=>r.kind==='idle').every(r=>r.applied&&r.task?.kind==='leisure'),encountersRecorded:result.rounds.filter(r=>r.scenario==='encounter').every(r=>r.encounterRecorded),noAuthRejection:result.decisions.every(r=>!['http-401','http-403'].includes(r.reason)),deepseekSpeechPreserved:result.speech.every(r=>r.mode==='deepseek')};
 write();console.log(JSON.stringify({stage:'complete',summary:result.summary,checks:result.checks}));app.exit(0);
}catch(e){result.error=['credential-rejected','scenario-did-not-trigger'].includes(e.message)?e.message:'measurement-failed';write();console.error(JSON.stringify({stage:'failed',reason:result.error}));app.exit(1);}
