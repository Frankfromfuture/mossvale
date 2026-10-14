import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '/Users/frankfan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:4323',report={at:new Date().toISOString(),environment:'Headless Chrome 390x844; isolated in-memory world; real DeepSeek stream',scenarios:[]};
try{
 await page.goto(base+'/?view=grid',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!globalThis.System?.import,{},{timeout:45000});
 await page.evaluate(async()=>{window.__cc=await System.import('cc');});
 await page.waitForFunction(()=>{const g=window.__cc.director.getScene()?.getComponentsInChildren('Mossvale')[0];return !!g?.state&&g.api.liveConnected;},{},{timeout:45000});
 await page.evaluate(()=>{
  const g=window.__cc.director.getScene().getComponentsInChildren('Mossvale')[0];window.__town=g;
  window.__frames=[];window.__speechMessages=0;
  const original=g.setSpeech.bind(g);g.setSpeech=u=>{window.__speechMessages++;original(u);};
  let last='';function observe(){const visible=Object.entries(g.hud.ambient).filter(([,b])=>b.node.active).map(([resident,b])=>({resident,text:b.label.string}));const key=JSON.stringify(visible);if(key!==last){last=key;window.__frames.push({at:Date.now(),visible,recorded:g.state.events.filter(e=>e.type==='dialogue'&&e.at>=1141).length});}requestAnimationFrame(observe);}requestAnimationFrame(observe);
 });
 for(const kind of ['chat','decline','failure']){
  await page.evaluate(()=>{window.__frames=[];window.__speechMessages=0;});
  await page.request.post(base+'/trigger?kind='+kind);
  await page.waitForFunction(async()=>{const r=await fetch('/report').then(r=>r.json());return r.done;},{},{timeout:25000});
  // Browser predicates must stay synchronous; explicitly poll the service for completion.
  let result;for(let i=0;i<100;i++){result=await(await page.request.get(base+'/report')).json();if(result.done)break;await new Promise(r=>setTimeout(r,100));}
  assert.ok(result.passed,result.failure||'Scenario did not complete');
  if(kind!=='failure')await page.waitForFunction(()=>window.__frames.some(f=>f.visible.some(v=>v.resident==='tang')),{},{timeout:18000});
  else await page.waitForFunction(()=>!window.__town.speechPlayback.lines.some(l=>l.status==='streaming'),{},{timeout:3000});
  const ui=await page.evaluate(()=>({frames:window.__frames,messages:window.__speechMessages,live:window.__town.api.liveConnected}));
  assert.ok(ui.live);assert.ok(ui.frames.some(f=>f.recorded===0&&f.visible.some(v=>v.resident==='xu'&&v.text.length>0)),'First text must reach the real bubble before full speech commits');
  assert.ok(ui.frames.every(f=>f.visible.every(v=>!v.text.includes('thought')&&!v.text.includes('eventId'))));
  if(kind!=='failure'){
   const first=ui.frames.find(f=>f.visible.some(v=>v.resident==='xu'));
   const second=ui.frames.find(f=>f.visible.some(v=>v.resident==='tang'));
   assert.ok(second.at-first.at>=2500,'Reply must preserve reading time');
  }
  report.scenarios.push({kind,firstTextMs:result.samples.map(s=>s.firstTextMs),completeMs:result.samples.map(s=>s.elapsedMs),ui});
  await page.screenshot({path:`cocos-2d/qa/speech-stream-${kind}.png`});
 }
 const playback=await page.evaluate(()=>{
  const p=new window.__town.speechPlayback.constructor(),text='甲'.repeat(42)+'乙'.repeat(18),frames=[];
  p.receive([{id:'long',resident:'xu',text,status:'complete'}]);
  for(let i=0;i<300;i++){const f=p.tick(.06,()=>true,true);if(f)frames.push(f.text);}
  return {first:frames.includes('甲'.repeat(42)),second:frames.includes('乙'.repeat(18)),finished:p.lines.length===0};
 });
 assert.deepEqual(playback,{first:true,second:true,finished:true});assert.deepEqual(errors,[]);
 report.pagination=playback;report.passed=true;
}catch(e){report.passed=false;report.failure=e.message;process.exitCode=1;}
finally{await writeFile('cocos-2d/qa/speech-stream-browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failure:report.failure,scenarios:report.scenarios.map(s=>({kind:s.kind,firstTextMs:s.firstTextMs,completeMs:s.completeMs,updates:s.ui.messages,frames:s.ui.frames.length})),errors}));await browser.close();}
