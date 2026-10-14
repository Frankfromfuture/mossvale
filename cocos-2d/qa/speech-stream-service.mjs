import {app} from 'electron';
import {readFile,writeFile} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {seed,record,advance,publicWorld} from '../../server/engine.mjs';
import {initializeLife,initializeGridResidents,layout} from '../../server/life.mjs';
import {initializeObjects} from '../../server/objects.mjs';
import {initializeEconomy} from '../../server/economy.mjs';
import {routineFor} from '../../server/personality.mjs';
import {createJevLife} from '../../server/jev-life.mjs';
import {decide,aiStatus} from '../../server/ai.mjs';
import {createWorldStream} from '../../server/world-stream.mjs';
import {speechFrames,readSpeechStream,speechPrefix} from '../../server/speech-stream.mjs';
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
 Object.assign(w.player,{x:point.x,z:point.z,route:[]});
 b.action='整理花材';
 return {w,a,b};
}

const root=path.resolve('cocos-2d/build/web-mobile'),nativeFetch=globalThis.fetch;
let w=fixture().w,epoch=randomUUID(),sequence=0,currentLoop,report={ready:true};
const payload=()=>({sync:{epoch,sequence:++sequence,sentAt:Date.now()},speech:speechFrames(w)});
const snapshot=()=>({...publicWorld(w,aiStatus()),...payload()});
const live=createWorldStream({snapshot,touch:()=>{}});
function publish(){live.publishSpeech('qa',payload());}
function responseChunks(text,{truncate=false}={}){
 const bytes=new TextEncoder().encode(text);let i=0;
 return new Response(new ReadableStream({pull(controller){if(i>=bytes.length){controller.close();return;}controller.enqueue(bytes.slice(i,i+=3));}}),{headers:{'Content-Type':'text/event-stream'}});
}
// One bounded framing check: UTF-8, escaped quotes, hidden fields and interrupted final JSON.
const content=JSON.stringify({speech:'你说“晚安”？\n明天见。🌿',thought:'PRIVATE_THOUGHT',action:'talk',evidence:[]});
const wire=[...content].map(c=>'data: '+JSON.stringify({choices:[{index:0,delta:{content:c}}]})+'\r\n\r\n').join('')+'data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n';
const prefixes=[];await readSpeechStream(responseChunks(wire),s=>prefixes.push(s));
assert.equal(prefixes.at(-1),JSON.parse(content).speech);assert.ok(prefixes.every(s=>!s.includes('PRIVATE')&&!s.includes('speech')));
await assert.rejects(readSpeechStream(responseChunks(wire.replace('data: [DONE]\n\n','')),()=>{}));
assert.equal(speechPrefix('{"thought":"secret","speech":"hello"}'),'');

async function trigger(kind){
 currentLoop?.cancel(w);w=fixture().w;epoch=randomUUID();let choices=0,calls=0;
 const started=performance.now(),notes=[],publications=[];
 report={kind,done:false,startedAt:Date.now(),calls:notes,publications,parserChecked:true};
 const failure=kind==='failure';
 globalThis.fetch=async(url,options)=>{
  const body=JSON.parse(options.body),ctx=JSON.parse(body.messages[1].content);
  assert.equal(body.stream,true);assert.equal(body.max_tokens,420);assert.equal(body.temperature,.8);
  assert.ok(ctx.places.length&&ctx.nearby.length&&ctx.resident.soul.daily_preferences&&ctx.resident.soul.personality);
  if(failure&&calls===2){
   const draft=JSON.stringify({speech:'这句会在断流后撤回'}).slice(0,-1);
   return responseChunks('data: '+JSON.stringify({choices:[{index:0,delta:{content:draft}}]})+'\n\n');
  }
  return nativeFetch(url,options);
 };
 currentLoop=createJevLife({isCurrent:(_,x)=>x===w,enabled:()=>true,
  choose:async()=>({choice:choices++===0?'chat':kind==='decline'?'continue':'chat',mode:'jev',elapsedMs:0}),
  publishSpeech:()=>{publications.push({atMs:Math.round(performance.now()-started),frames:speechFrames(w)});publish();},
  save:async()=>{live.publish('qa',w);},
  decide:async(ctx,usage,task,options)=>{
   const note={resident:ctx.resident.name,atMs:Math.round(performance.now()-started)};notes.push(note);calls++;
   if(calls===2){const first=w.events.find(e=>e.type==='dialogue'&&e.at>=1141);assert.ok(first);assert.equal(ctx.heard.eventId,first.id);assert.deepEqual(Object.keys(ctx.heard).sort(),['eventId','speaker','text']);}
   const result=await decide(ctx,usage,task,{...options,onSpeech:text=>{note.firstTextMs??=Math.round(performance.now()-started);options.onSpeech(text);}});
   Object.assign(note,{completeMs:Math.round(performance.now()-started),speech:result.speech,thought:result.thought});assert.ok(result.thought);return result;
  }});
 live.publish('qa',w);currentLoop.attach('qa',w);advance(w,1);await currentLoop.drain();
 const events=w.events.filter(e=>e.type==='dialogue'&&e.at>=1141);
 assert.equal(events.length,failure?1:2);if(!failure)assert.equal(events[1].replyTo,events[0].id);
 assert.equal(calls,2);assert.ok(notes[0].firstTextMs<notes[0].completeMs);
 assert.ok(!Object.hasOwn(w,'speech'));assert.ok(!JSON.stringify(w).includes('这句会在断流后撤回'));
 if(failure)assert.ok(speechFrames(w).every(f=>f.status==='complete'&&f.resident==='xu'));
 report.done=true;report.samples=w.jevLife.samples.filter(s=>s.kind==='speech');report.events=events.map(e=>({id:e.id,replyTo:e.replyTo,text:e.text}));report.passed=true;
 await writeFile(`cocos-2d/qa/speech-stream-${kind}.json`,JSON.stringify(report,null,2)+'\n');
}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:4323');
  const json=value=>{res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  if(url.pathname==='/api/session')return json({token:'speech-qa-session'});
  if(url.pathname==='/api/arrive')return json({world:snapshot()});
  if(url.pathname==='/api/world')return json(snapshot());
  if(url.pathname==='/api/world-stream')return live.attach('qa',w,res);
  if(url.pathname==='/api/presence')return json({ok:true});
  if(url.pathname==='/trigger'){json({ok:true});void trigger(url.searchParams.get('kind')).catch(e=>{report.done=true;report.failure=e.message;console.error(e.message);});return;}
  if(url.pathname==='/report')return json(report);
  if(url.pathname==='/shutdown'){json({ok:true});live.close('qa');server.close(()=>app.exit(0));return;}
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(root+path.sep))throw Error('invalid-path');
  const data=await readFile(file);res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.png':'image/png','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream'});res.end(data);
 }catch{res.writeHead(404);res.end();}
});
server.listen(4323,'127.0.0.1',()=>console.log('Isolated streaming fixture ready on 4323'));
