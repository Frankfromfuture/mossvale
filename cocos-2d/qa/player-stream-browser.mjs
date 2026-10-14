import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '/Users/frankfan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const {token}=JSON.parse(await readFile('cocos-2d/qa/player-stream-fixture.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:390,height:844}});
await context.addCookies([{name:'mossvale2d',value:token,domain:'127.0.0.1',path:'/'}]);
const page=await context.newPage(),base='http://127.0.0.1:4323',errors=[],sent=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url()===base+'/api/interact'&&r.method()==='POST')sent.push(r.postDataJSON());});
const report={at:new Date().toISOString(),environment:'Headless Chrome 390x844; isolated fixture save; production interaction route',scenarios:[]};
async function begin(message){
 return page.evaluate(message=>{const g=window.g;window.parts=[];window.sentAt=Date.now();const before=structuredClone(g.state.chats.xu||[]),pages=[...g.hud.pages];g.hud.input.string=message;g.hud.sendText();return {before,pages};},message);
}
async function completed(){await page.waitForFunction(()=>!window.g.busy&&!window.g.hud.waiting,{},{timeout:27000});}
try{
 await page.goto(base+'/?view=grid',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!globalThis.System?.import,{},{timeout:45000});await page.evaluate(async()=>window.cc=await System.import('cc'));
 await page.waitForFunction(()=>!!window.cc.director.getScene()?.getComponentsInChildren('Mossvale')[0]?.state,{},{timeout:45000});
 await page.evaluate(()=>{
  const g=window.cc.director.getScene().getComponentsInChildren('Mossvale')[0];window.g=g;g.open('xu');
  window.parts=[];const original=g.hud.showStreamingReply.bind(g.hud);
  g.hud.showStreamingReply=text=>{original(text);const frame={text,atMs:Date.now()-window.sentAt,recorded:g.state.chats.xu.length};window.parts.push(frame);requestAnimationFrame(()=>{frame.label=g.hud.speech?.string;frame.visible=g.hud.bubble?.activeInHierarchy;});};
 });
 for(const message of ['我想给一条安静的小路起名叫“风铃小径”，还没决定。你喜欢这个名字吗？也想听听你的想法。','刚才我给小路想的名字是什么？我们之前聊过我喜欢什么样的小路，结合这些再慢慢聊聊你的感觉吧。']){
  const initial=await begin(message);await completed();
  const result=await page.evaluate(()=>({parts:window.parts,chats:window.g.state.chats.xu,pages:window.g.hud.pages,doneMs:Date.now()-window.sentAt}));
  assert.equal(result.chats.length,initial.before.length+2);assert.deepEqual(result.chats.slice(0,-2),initial.before);
  assert.ok(result.parts.length>1&&result.parts.some(p=>p.recorded===initial.before.length&&p.visible&&p.label),'A real bubble must render before the committed reply');
  assert.ok(result.parts[0].text.length<result.chats.at(-1).content.length);
  assert.ok(result.parts.every(p=>!p.text.includes('"thought"')&&!p.text.includes('eventId')));
  report.scenarios.push({kind:report.scenarios.length?'followup':'chat',firstTextMs:result.parts[0].atMs,completeMs:result.doneMs,characters:result.chats.at(-1).content.length,partialUpdates:result.parts.length,historyPreserved:true});
 }
 const requests=JSON.parse(await readFile('cocos-2d/qa/player-stream-requests.json','utf8'));
 assert.ok(requests[1].conversation.some(m=>m.content===sent[0].message));assert.equal(requests[1].conversation.length,requests[0].conversation.length+2);
 const recoveryMessage='断流测试：请保留完整的长回复，不用压短。',initial=await begin(recoveryMessage);
 await completed();
 const failed=await page.evaluate(()=>({chats:window.g.state.chats.xu,input:window.g.hud.input.string,pages:window.g.hud.pages,busy:window.g.people().find(r=>r.id==='xu').busy,partialUpdates:window.parts.length}));
 assert.deepEqual(failed.chats,initial.before);assert.deepEqual(failed.pages,initial.pages);assert.equal(failed.input,recoveryMessage);assert.ok(failed.partialUpdates>0);
 await begin(recoveryMessage);await page.waitForFunction(()=>window.g.hud.waiting&&window.g.hud.pages.length>1,{},{timeout:8000});await page.evaluate(()=>window.g.hud.advanceSpeech());await completed();
 const recovered=await page.evaluate(()=>({chats:window.g.state.chats.xu,pages:window.g.hud.pages,page:window.g.hud.speechPage,usage:window.g.state.usage.calls}));
 assert.equal(recovered.chats.length,initial.before.length+2);assert.ok(recovered.chats.at(-1).content.length>90);assert.equal(recovered.page,1);assert.ok(recovered.pages.length>2);
 const request=sent.at(-1),count=JSON.parse(await readFile('cocos-2d/qa/player-stream-requests.json','utf8')).length;
 assert.equal(request.requestId,sent.at(-2).requestId);
 const replay=await context.request.post(base+'/api/interact',{headers:{'X-Mossvale':'1','Accept':'application/x-ndjson'},data:request});assert.equal(replay.status(),200);
 const receipt=JSON.parse((await replay.text()).trim().split('\n').at(-1));assert.equal(receipt.type,'complete');assert.deepEqual(receipt.world.chats.xu,recovered.chats);assert.equal(receipt.world.usage.calls,recovered.usage);
 assert.equal(JSON.parse(await readFile('cocos-2d/qa/player-stream-requests.json','utf8')).length,count);
 report.scenarios.push({kind:'interruption-and-retry',draftRestored:true,previousReplyRestored:true,noPartialHistory:true,longReplyCharacters:recovered.chats.at(-1).content.length,pagePreserved:recovered.page,duplicateRetryCreatesNoCallOrEvent:true});
 await page.screenshot({path:'cocos-2d/qa/player-stream-chat.png'});assert.deepEqual(errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=e.message;process.exitCode=1;}
finally{await writeFile('cocos-2d/qa/player-stream-browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,errors}));await browser.close();}
