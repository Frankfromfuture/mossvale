// Isolated UI acceptance: no real save, credentials, model requests or visible browser.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {chromium} from '/Users/frankfan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
process.env.MOSSVALE_SCENE='cafe-2d';process.env.MOSSVALE_LAYOUT=path.resolve('cocos-2d/assets/resources/town-layout.json');
const {seed,record,publicWorld}=await import('../../server/engine.mjs');
const {initializeLife,initializeGridResidents}=await import('../../server/life.mjs');
const {initializeObjects}=await import('../../server/objects.mjs');
const {initializeEconomy}=await import('../../server/economy.mjs');
const w=seed();initializeLife(w,seed(),record);initializeObjects(w);initializeGridResidents(w,seed(),record);initializeEconomy(w);w.paused=true;w.player={...w.player,x:-6.5,z:-9.5};
w.economy.visitors.push({id:'visitor:qa',name:'游客甲',code:'B4',interest:'travel',thought:'看溪边的风景',action:'稍作休息',location:'cafe',purchases:[],interactions:0,maxInteractions:3,spent:0,life:{x:-4.5,z:-9.5,route:[],phase:'doing',speech:'你好。',speechUntil:0}});
w.economy.accounts['visitor:qa']=6000;
const staticRoot=path.resolve('cocos-2d/build/web-mobile'),mainDir=path.join(staticRoot,'assets/main'),mainName=fs.readdirSync(mainDir).find(n=>/^index.*\.js$/.test(n));
let bundle=fs.readFileSync(path.join(mainDir,mainName),'utf8');
const preview=process.argv[2]!=='built';
if(preview){
 const require=createRequire(import.meta.url),ts=require('/Users/frankfan/Applications/CocosCreator-3.8.8/CocosCreator.app/Contents/Resources/app.asar.unpacked/node_modules/typescript');
 for(const mod of ['VillageUi','TownHud','SpeechPlayback']){
  const marker=`System.register("chunks:///_virtual/${mod}.ts",`,start=bundle.indexOf(marker),tree=ts.createSourceFile('bundle.js',bundle,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS),statement=tree.statements.find(s=>s.getStart(tree)===start);
  assert.ok(statement,`Module ${mod} must exist`);
  const code=ts.transpileModule(fs.readFileSync(`cocos-2d/assets/scripts/${mod}.ts`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2018,module:ts.ModuleKind.System}}).outputText.replace('System.register([',marker+' [').replace(/"\.\/([^".]+)"/g,'"./$1.ts"');
  bundle=bundle.slice(0,start)+code+bundle.slice(statement.getEnd());
 }
}
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){
  res.setHeader('Content-Type','application/json');
  if(url.pathname==='/api/session')return res.end(JSON.stringify({token:'whole-bubbles-fixture'}));
  if(url.pathname==='/api/arrive')return res.end(JSON.stringify({world:publicWorld(w,{mode:'rules'})}));
  if(url.pathname==='/api/world')return res.end(JSON.stringify(publicWorld(w,{mode:'rules'})));
  if(url.pathname==='/api/presence')return res.end('{}');
  res.statusCode=404;return res.end('{}');
 }
 const file=path.join(staticRoot,url.pathname==='/'?'index.html':decodeURIComponent(url.pathname));
 try{const ext=path.extname(file);res.setHeader('Content-Type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.png':'image/png'})[ext]||'application/octet-stream');res.end(file===path.join(mainDir,mainName)?bundle:fs.readFileSync(file));}catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(4323,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const report={environment:'Headless Chrome 390×844, isolated paused town',sourcePreview:preview};
const long='今早我从溪湾一路走过来，看见果园里有人修剪枝条，集市也开始摆摊了。等忙完手上的活，我想去书屋借一本讲植物的书，再到凉亭坐一会儿。要是你也有空，咱们带点茶过去，看看河边的新景色，顺便聊聊这几天镇里的生活。';
try{
 await page.goto('http://127.0.0.1:4323/?view=grid',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.System?.import,null,{timeout:45000});await page.evaluate(async()=>window.cc=await System.import('cc'));
 await page.waitForFunction(()=>!!window.cc.director.getScene()?.getComponentsInChildren('Mossvale')[0]?.state,null,{timeout:45000});
 report.dialogue=await page.evaluate(text=>{
  const g=window.cc.director.getScene().getComponentsInChildren('Mossvale')[0];window.g=g;g.enabled=false;const hud=g.hud,results=[];
  for(const r of [g.state.residents.find(r=>r.id==='xu'),g.state.visitors[0]]){
   hud.showResident(r);const d=hud.dialogue,read=()=>({width:d.width,height:d.height,lines:d.speech.string.split('\n').length,font:d.speech.fontSize,nameFont:d.badge.children.find(n=>n.name==='Resident name').getComponent(window.cc.Label).fontSize,nameCenter:d.badge.position.y,top:d.height/2,paddingX:(d.width-d.speech.node.getComponent(window.cc.UITransform).width)/2,paddingY:(d.height-d.speech.node.getComponent(window.cc.UITransform).height)/2});
   hud.showReply('好。');hud.anchorSpeech(0,0);const short=read();hud.showReply(text);hud.anchorSpeech(0,0);const full=read();hud.advanceSpeech();results.push({visitor:!!r.visitor,short,full,complete:d.speech.string.replaceAll('\n','')===text,pages:hud.pages.length,pagerNode:!!d.node.getChildByName('Dialogue page'),input:!!hud.input});
  }
  return results;
 },long);
 for(const r of report.dialogue){assert.equal(r.full.nameCenter,r.full.top);assert.equal(r.full.font,r.full.nameFont);assert.equal(r.full.paddingX,16);assert.equal(r.full.paddingY,16);assert.ok(r.full.lines>3&&r.full.height>r.short.height);assert.equal(r.pages,1);assert.ok(r.complete&&r.input&&!r.pagerNode);}
 await page.screenshot({path:'cocos-2d/qa/whole-bubbles-long.png'});
 report.ambient=await page.evaluate(text=>{const hud=window.g.hud;hud.closeCard();return ['xu','visitor:qa'].map((id,i)=>{hud.showAmbient(id,text,i?-55:55,25);const e=hud.ambient[id];return {id,font:e.label.fontSize,lines:e.label.string.split('\n').length,height:e.height,complete:e.label.string.replaceAll('\n','')===text,paddingY:(e.height-e.label.node.getComponent(window.cc.UITransform).height)/2};});},long);
 for(const r of report.ambient){assert.equal(r.font,13);assert.equal(r.paddingY,16);assert.ok(r.complete&&r.lines>3);}
 report.streaming=await page.evaluate(async text=>{
  const {SpeechPlayback}=await System.import('chunks:///_virtual/SpeechPlayback.ts'),p=new SpeechPlayback(),frame={id:'one',resident:'xu',text:text.slice(0,34),status:'streaming'};p.receive([frame]);const draft=p.tick(.016,()=>true,true).text;p.receive([{...frame,text,status:'complete'}]);const full=p.tick(.016,()=>true,true).text;
  const withdrawal=new SpeechPlayback();withdrawal.receive([frame]);withdrawal.receive([]);
  const h=window.g.hud;h.showResident(window.g.state.residents.find(r=>r.id==='xu'));h.showReply(text);h.setWaiting(true);h.showStreamingReply(text.slice(0,56));const part=h.dialogue.speech.string.replaceAll('\n','');h.showStreamingReply(text);const all=h.dialogue.speech.string.replaceAll('\n','');h.messageFailed();const restored=h.dialogue.speech.string.replaceAll('\n','');h.setWaiting(false);h.anchorSpeech(0,0);
  return {draftPrefix:full.startsWith(draft),fullAmbient:full===text,withdrawn:withdrawal.tick(.016,()=>true,true)===null,playerPart:part===text.slice(0,56),playerFull:all===text,failureRestored:restored===text};
 },long);
 assert.ok(Object.values(report.streaming).every(Boolean));
 // Closest regression: the untouched pixel presentation keeps its pagination and fonts.
 const pixel=await browser.newPage({viewport:{width:390,height:844}});pixel.on('pageerror',e=>errors.push(e.message));await pixel.goto('http://127.0.0.1:4323/?view=pixel',{waitUntil:'domcontentloaded'});await pixel.waitForFunction(()=>!!window.System?.import,null,{timeout:45000});await pixel.evaluate(async()=>window.cc=await System.import('cc'));await pixel.waitForFunction(()=>!!window.cc.director.getScene()?.getComponentsInChildren('Mossvale')[0]?.state,null,{timeout:45000});
 report.pixel=await pixel.evaluate(text=>{const g=window.cc.director.getScene().getComponentsInChildren('Mossvale')[0];g.enabled=false;g.hud.showResident(g.state.residents[0]);g.hud.showReply(text);return {residentFont:g.hud.ambient.xu.label.fontSize,visitorFont:g.hud.ambient['visitor:qa'].label.fontSize,pages:g.hud.pages.length,compact:!!g.hud.dialogue};},long);
 assert.equal(report.pixel.residentFont,11);assert.equal(report.pixel.visitorFont,13);assert.ok(report.pixel.pages>1&&!report.pixel.compact);assert.deepEqual(errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;}finally{report.errors=errors;fs.writeFileSync('cocos-2d/qa/whole-bubbles.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
