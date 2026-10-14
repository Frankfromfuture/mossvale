import fs from 'node:fs';import assert from 'node:assert/strict';
import {chromium} from '/Users/frankfan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const base='http://127.0.0.1:4323',tokens=JSON.parse(fs.readFileSync('cocos-2d/qa/realtime-fixtures.json','utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={at:new Date().toISOString(),environment:'Headless Chrome, 390x844; isolated local service on 4323; actual Jev and DeepSeek',scenarios:[],errors:[]};
async function open(scenario){
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.addCookies([{name:'mossvale2d',value:tokens[scenario],url:base}]);
 await context.addInitScript(token=>localStorage.setItem('mossvale2d-session',token),tokens[scenario]);
 const page=await context.newPage(),requests=[];page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(r.url()===base+'/api/world')requests.push(Date.now());});
 await page.goto(base+'/?view=grid',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!globalThis.System?.import,{},{timeout:45000});
 await page.evaluate(async()=>{window.__cc=await System.import('cc');});
 await page.waitForFunction(()=>{const g=window.__cc.director.getScene()?.getComponentsInChildren('Mossvale')[0];return !!g?.state&&g.api.liveConnected;},{},{timeout:45000});
 await page.evaluate(async()=>{
  const g=window.__cc.director.getScene().getComponentsInChildren('Mossvale')[0];window.__town=g;window.__initial=structuredClone(g.state);window.__samples=[];const seen=new Set(),original=g.setWorld.bind(g);
  g.setWorld=w=>{
   original(w);if(g.state!==w)return;
   for(const s of w.jevLife?.samples||[]){const key=[s.kind,s.resident,s.at].join(':');if(seen.has(key))continue;seen.add(key);
    const r=w.residents.find(r=>r.id===s.resident);const row={kind:s.kind,resident:s.resident,mode:s.mode,reason:s.reason||null,modelMs:s.elapsedMs,selected:s.selected,applied:s.applied,applyMs:Date.now()-w.sync.sentAt,phase:r.life.phase,action:r.action};window.__samples.push(row);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{row.frameMs=Date.now()-w.sync.sentAt;row.hudUpdated=g.hud.state===g.state;row.nodeExists=!!g.actors.find(a=>a.id===s.resident)?.node?.isValid;}));
   }
  };
  const actor=g.actors.find(a=>a.id==='xu');g.cameraX=actor.x;g.cameraZ=actor.z;g.manualView=true;
 });
 return {context,page,requests};
}
async function command(c,action,minutes){const r=await c.request.post(base+'/api/control',{headers:{'X-Mossvale':'1'},data:{action,minutes}});assert.equal(r.status(),200);return r.json();}
try{
 const idle=await open('idle'),encounter=await open('encounter');
 const initialPolls=idle.requests.length;
 await command(idle.context,'pause');await command(idle.context,'advance',1);
 await idle.page.waitForFunction(()=>window.__samples.filter(s=>s.kind==='idle').length===2&&window.__samples.every(s=>s.frameMs!==undefined),{},{timeout:12000});
 const start=await idle.page.evaluate(()=>{const a=window.__town.actors.find(a=>a.id==='xu');return{x:a.x,z:a.z};});
 await idle.page.waitForFunction(p=>{const a=window.__town.actors.find(a=>a.id==='xu');return Math.hypot(a.x-p.x,a.z-p.z)>.05;},start,{timeout:3000});
 const idleResult=await idle.page.evaluate(()=>({samples:window.__samples,live:window.__town.api.liveConnected}));assert.ok(idleResult.live);assert.ok(idleResult.samples.every(s=>s.applied&&s.frameMs<500&&s.hudUpdated&&s.nodeExists));
 assert.equal(idle.requests.length,initialPolls,'Healthy streaming should not poll /api/world');
 assert.equal(await encounter.page.evaluate(()=>window.__town.state.jevLife.samples.length),0,'Other session must stay isolated');
 const staleRejected=await idle.page.evaluate(()=>{const g=window.__town,sequence=g.state.sync.sequence;g.setWorld(window.__initial);return g.state.sync.sequence===sequence;});assert.ok(staleRejected);
 const walkClockPreserved=await idle.page.evaluate(()=>{const g=window.__town,a=g.actors.find(a=>a.id==='xu'),before=a.snapshotAt,w=structuredClone(g.state);w.sync.sequence+=.01;g.setWorld(w);return before===a.snapshotAt;});assert.ok(walkClockPreserved);
 await idle.page.screenshot({path:'cocos-2d/qa/realtime-idle.png'});
 await idle.page.route('**/api/world-stream',r=>r.abort());await idle.page.evaluate(()=>window.__town.api.stopLive());
 await idle.page.waitForResponse(r=>r.url()===base+'/api/world'&&r.status()===200,{timeout:8000});
 const fallbackPolls=idle.requests.length-initialPolls;assert.ok(fallbackPolls>0);
 await idle.page.unroute('**/api/world-stream');await idle.page.waitForFunction(()=>window.__town.api.liveConnected,{},{timeout:10000});
 report.scenarios.push({kind:'idle',...idleResult,healthyWorldPolls:initialPolls,fallbackPolls,reconnected:true,staleRejected,walkClockPreserved,actorMoved:true,sessionIsolated:true});
 await command(idle.context,'pause');await idle.context.close();
 await command(encounter.context,'pause');await command(encounter.context,'advance',1);
 await encounter.page.waitForFunction(()=>window.__samples.filter(s=>s.kind==='encounter').length===2,{},{timeout:12000});
 const continued=await encounter.page.evaluate(()=>window.__samples.find(s=>s.kind==='encounter'&&s.resident==='xu').selected==='continue');
 if(!continued)await encounter.page.waitForFunction(()=>window.__samples.filter(s=>s.kind==='speech').length===2&&window.__samples.every(s=>s.frameMs!==undefined),{},{timeout:27000});
 const encounterResult=await encounter.page.evaluate(()=>({samples:window.__samples,live:window.__town.api.liveConnected}));assert.ok(encounterResult.samples.every(s=>s.frameMs<500&&s.hudUpdated));
 await encounter.page.screenshot({path:'cocos-2d/qa/realtime-encounter.png'});report.scenarios.push({kind:'encounter',...encounterResult});
 await command(encounter.context,'pause');await encounter.context.close();assert.deepEqual(report.errors,[]);
 report.passed=true;
}catch(e){report.passed=false;report.failure=e.message;process.exitCode=1;}finally{fs.writeFileSync('cocos-2d/qa/realtime-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();}
