// Focused, isolated acceptance and live latency comparison. Never loads a user's town.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {app} from 'electron';
import {seed,record,advance} from '../../server/engine.mjs';
import {initializeLife,initializeGridResidents,layout} from '../../server/life.mjs';
import {initializeObjects} from '../../server/objects.mjs';
import {initializeEconomy,idleOptions} from '../../server/economy.mjs';
import {routineFor} from '../../server/personality.mjs';
import {createJevLife,idleQuestion,reactionQuestion,decisionMind} from '../../server/jev-life.mjs';
import {requestJev,resolveJevChoice} from '../../server/jev.mjs';
import {decide} from '../../server/ai.mjs';
import {autonomousContext} from '../../server/autonomy.mjs';
const root=path.resolve(import.meta.dirname,'../..');
const result={environment:'Local Mac, Brizo encrypted provider configuration, isolated in-memory towns',live:[],checks:{},latencies:{}};
const make=()=>{const w=seed();initializeLife(w,seed(),record);initializeObjects(w);initializeGridResidents(w,seed(),record);initializeEconomy(w);w.minute=1140;w.economy.nextPulse=1140;w.economy.playerOnlineUntil=3000;w.economy.nextVisitor=3000;w.economy.tasks={};w.paused=false;
 for(const r of w.residents){r.busy=true;r.hunger=20;r.energy=85;r.economicDay={day:0,meal:true,care:true,workMinutes:1000,lastBreakWork:1000,habits:Object.fromEntries(routineFor(r).habits.map(h=>[h.id,'completed']))};r.life.phase='doing';r.life.engagedUntil=0;r.life.aiHoldUntil=0;r.location='cafe';const p=layout.places.find(p=>p.id==='cafe');Object.assign(r.life,{x:p.x,z:p.z,route:[]});r.action='稍作休息';}return w;};
const output=()=>fs.writeFileSync(root+'/cocos-2d/qa/jev-acceptance.json',JSON.stringify(result,null,2));
async function baseline(w,r,kind,partner,options){const ctx=autonomousContext(w,r,partner||null);if(options)ctx.places=options.map(o=>({id:o.place,name:o.label,open:true}));const t=performance.now();try{const a=await decide(ctx,w.usage,kind);return {resident:r.id,kind,ms:Math.round(performance.now()-t),action:a.action,target:a.target,speech:a.speech,mode:a.mode};}catch{return {resident:r.id,kind,ms:Math.round(performance.now()-t),failed:true};}}
try{
 // 1. Real Jev idle choices, for two different personalities in the same situation.
 const w=make(),chosen=w.residents.filter(r=>['xu','tang'].includes(r.id));chosen.forEach(r=>r.busy=false);
 const before=structuredClone(w),choices=[];
 const loop=createJevLife({isCurrent:(_,x)=>x===w,save:async()=>{},decide,choose:async(...args)=>{const a=await requestJev(...args);choices.push(a);return a;}});
 loop.attach('idle',w);advance(w,1);await loop.drain();
 for(const r of chosen){const row=w.jevLife.samples.find(s=>s.resident===r.id&&s.kind==='idle');assert.ok(row?.applied);assert.ok(w.economy.tasks[r.id]?.kind==='leisure');result.live.push({...row,name:r.name,action:w.economy.tasks[r.id].label});}
 result.checks.idleApplied=true;result.latencies.jevIdle=choices.map(x=>x.elapsedMs);
 console.log(JSON.stringify({stage:'idle',results:result.live}));output();
 const old=[];for(const r of before.residents.filter(r=>['xu','tang'].includes(r.id)))old.push(await baseline(before,r,'autonomy-plan',null,idleOptions(before,r)));
 result.latencies.deepseekIdle=old;output();
 // 2. A real completion/nearby encounter. Each resident's reaction uses only their own context.
 const social=make(),a=social.residents.find(r=>r.id==='xu'),b=social.residents.find(r=>r.id==='tang');a.busy=false;b.busy=false;
 social.economy.nextPulse=1160;const p=layout.places.find(p=>p.id==='cafe');
 social.economy.tasks[a.id]={kind:'leisure',actor:a.id,phase:'doing',due:1141,started:1110,duration:30,place:'cafe',point:p,label:'坐下歇口气',activity:'tea',route:[]};
 social.economy.tasks[b.id]={kind:'habit',actor:b.id,phase:'doing',due:1200,started:1110,duration:90,place:'cafe',point:p,label:'整理画稿',activity:'write',route:[]};
 const socialBefore=structuredClone(social),socialLoop=createJevLife({isCurrent:(_,x)=>x===social,save:async()=>{},decide});socialLoop.attach('social',social);advance(social,1);await socialLoop.drain();
 const reactions=social.jevLife?.samples.filter(s=>s.kind==='encounter')||[];assert.equal(reactions.length,2);result.live.push(...reactions);result.checks.encounterApplied=reactions[0].applied;
 result.speech= social.events.filter(e=>e.type==='dialogue'&&e.at>=1141).map(e=>({text:e.text,mode:e.mode}));result.latencies.jevEncounter=reactions.map(r=>r.elapsedMs);result.checks.actualEncounter=social.events.some(e=>e.type==='encounter'&&e.at===1141);
 const oldSocial=[];for(const [r,o] of [[socialBefore.residents.find(r=>r.id==='xu'),socialBefore.residents.find(r=>r.id==='tang')],[socialBefore.residents.find(r=>r.id==='tang'),socialBefore.residents.find(r=>r.id==='xu')]])oldSocial.push(await baseline(socialBefore,r,'autonomy-open',o));
 result.latencies.deepseekEncounter=oldSocial;console.log(JSON.stringify({stage:'encounter',reactions,speech:result.speech}));output();
 // 3. Failure and permission boundary: a late answer loses to a new commitment; no secret sharing.
 const fault=make(),r=fault.residents.find(r=>r.id==='xu'),other=fault.residents.find(r=>r.id==='lin');r.busy=false;
 record(fault,'secret','隔离验收内容只属于林夏。',[other.id],8,{private:true});record(fault,'secret','许知远自己的私事。',[r.id],8,{private:true});
 assert.ok(!JSON.stringify(decisionMind(fault,r)).includes('私事'));assert.ok(!JSON.stringify(decisionMind(fault,r)).includes('隔离验收'));
 assert.throws(()=>resolveJevChoice({answers:{decision:{choice:'invented',confidence:1,probabilities:{invented:1}}}},{park:'散步'}));
 let release;const gate=new Promise(resolve=>release=resolve),faultLoop=createJevLife({isCurrent:(_,x)=>x===fault,save:async()=>{},decide,enabled:()=>true,choose:()=>gate});faultLoop.attach('fault',fault);advance(fault,1);await Promise.resolve();
 const reserved={kind:'invite',actor:r.id,phase:'doing',due:1190,label:'接受的邀请'};fault.economy.tasks[r.id]=reserved;release({choice:'park',mode:'jev',confidence:.9,elapsedMs:100});await faultLoop.drain();assert.equal(fault.economy.tasks[r.id],reserved);
 result.checks.newCommitmentWins=true;result.checks.privateMemoriesIsolated=true;result.checks.invalidChoiceRejected=true;
 const failed=make(),fr=failed.residents.find(r=>r.id==='xu');fr.busy=false;const fallbackLoop=createJevLife({isCurrent:(_,x)=>x===failed,save:async()=>{},decide,enabled:()=>true,choose:async()=>({choice:null,reason:'timeout',elapsedMs:3000,mode:'rules'})});fallbackLoop.attach('fallback',failed);advance(failed,1);await fallbackLoop.drain();assert.equal(failed.economy.tasks[fr.id].decision.mode,'rules');result.checks.timeoutContinuesLife=true;
 const transport=await requestJev({}, {continue:'继续',greet:'问候'}, {}, {provider:{endpoint:'https://api.typesafe.ai/v1/systemone',apiKey:'isolated-fixture'},instructions:'验收',fetchImpl:async()=>{throw new DOMException('fixture','TimeoutError');}});assert.equal(transport.reason,'timeout');result.checks.transportTimeoutHandled=true;
 // Representative existing behaviour: uninterrupted/offline time produce the same ledger and habits.
 const regression=make();regression.residents.forEach(r=>r.busy=false);const hourly=structuredClone(regression);advance(regression,1440,{offline:true});for(let i=0;i<24;i++)advance(hourly,60,{offline:true});assert.deepEqual(regression.economy.ledger,hourly.economy.ledger);assert.deepEqual(regression.residents,hourly.residents);result.checks.offlineParity=true;result.checks.moneyNonnegative=Object.values(regression.economy.accounts).every(n=>Number.isSafeInteger(n)&&n>=0);assert.ok(result.checks.moneyNonnegative);
 result.realJevAccepted=result.live.filter(s=>s.mode==='jev').length;result.checks.realJev=result.realJevAccepted>0;
 output();console.log(JSON.stringify({stage:'complete',checks:result.checks,realJevAccepted:result.realJevAccepted,latencies:result.latencies}));app.exit(0);
}catch(e){result.error=String(e.message).slice(0,200);output();console.error(JSON.stringify({stage:'failed',error:result.error}));app.exit(1);}
