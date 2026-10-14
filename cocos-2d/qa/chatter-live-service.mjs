// Headless, in-memory acceptance service. Never reads or writes player towns.
import {app} from 'electron';
import {readFile,writeFile} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {seed,record,advance,publicWorld} from '../../server/engine.mjs';
import {initializeLife,initializeGridResidents,layout} from '../../server/life.mjs';
import {initializeObjects} from '../../server/objects.mjs';
import {initializeEconomy} from '../../server/economy.mjs';
import {installTownMind} from '../../server/calendar.mjs';
import {installLongMemory} from '../../server/long-memory.mjs';
import {routineFor} from '../../server/personality.mjs';
import {createJevLife} from '../../server/jev-life.mjs';
import {decide,aiStatus} from '../../server/ai.mjs';
import {createNewsHub} from '../../server/news.mjs';
import {createWorldStream} from '../../server/world-stream.mjs';
import {speechFrames} from '../../server/speech-stream.mjs';
const hub=createNewsHub();await hub.start();
function fixture(){
 const w=seed();initializeLife(w,seed(),record);initializeObjects(w);initializeGridResidents(w,seed(),record);initializeEconomy(w);installLongMemory(w);installTownMind(w);
 Object.assign(w,{minute:1140,paused:false});Object.assign(w.economy,{nextPulse:1160,playerOnlineUntil:3000,nextVisitor:3000,tasks:{}});
 const point=layout.places.find(p=>p.id==='cafe');for(const r of w.residents){Object.assign(r,{busy:true,hunger:20,energy:85,location:'cafe',action:'在咖啡馆歇脚',economicDay:{day:0,meal:true,care:true,workMinutes:1000,habits:Object.fromEntries(routineFor(r).habits.map(h=>[h.id,'completed']))}});Object.assign(r.life,{x:point.x,z:point.z,phase:'doing',engagedUntil:0,aiHoldUntil:0,route:[],speech:'',speechUntil:1140});}
 const a=w.residents.find(r=>r.id==='xu'),b=w.residents.find(r=>r.id==='tang');a.busy=false;b.busy=false;
 w.economy.tasks.xu={actor:'xu',kind:'leisure',phase:'doing',due:1141,started:1110,duration:30,place:'cafe',point,label:'歇脚',activity:'tea',route:[]};w.economy.tasks.tang={actor:'tang',kind:'habit',phase:'doing',due:1200,started:1110,duration:90,place:'cafe',point,label:'整理花材',activity:'garden',route:[]};
 Object.assign(w.player,{x:point.x,z:point.z,route:[]});w.chatter={version:1,rng:1,seen:{}};return w;
}
let w=fixture(),report={ready:true,news:hub.articles().length},sequence=0,loop;
const root=path.resolve('cocos-2d/build/web-mobile'),payload=()=>({sync:{epoch:'growth-qa',sequence:++sequence,sentAt:Date.now()},speech:speechFrames(w)}),snapshot=()=>({...publicWorld(w,aiStatus()),...payload()}),live=createWorldStream({snapshot,touch:()=>{}});
async function trigger(kind){
 loop?.cancel(w);w=fixture();if(kind==='scene')w.chatter.rng=99000;report={kind,done:false,requests:[]};
 const article=hub.articles().find(a=>a.source==='BBC'&&a.tags.includes('science'))||hub.articles()[0];assert.ok(article,'fresh publisher feed');
 loop=createJevLife({isCurrent:(_,x)=>x===w,enabled:()=>true,news:()=>[article],choose:async()=>({choice:'chat',mode:'fixture',elapsedMs:0}),save:async()=>live.publish('qa',w),publishSpeech:()=>live.publishSpeech('qa',payload()),decide:async(ctx,usage,task,options)=>{
  const start=performance.now(),row={name:ctx.resident.name,cue:ctx.chatter};report.requests.push(row);
  if(kind==='failure'){options.onSpeech('这段草稿会被撤回');throw Error('fixture-unavailable');}
  const result=await decide(ctx,usage,task,{...options,onSpeech:text=>{row.firstTextMs??=Math.round(performance.now()-start);options.onSpeech(text);}});row.completeMs=Math.round(performance.now()-start);row.speech=result.speech;row.mode=result.mode;return result;
 }});
 live.publish('qa',w);loop.attach('qa',w);advance(w,1);await loop.drain();const events=w.events.filter(e=>e.type==='dialogue');assert.equal(events.length,2);assert.equal(events[1].replyTo,events[0].id);assert.ok(speechFrames(w).every(f=>f.status==='complete'));
 if(kind==='news')assert.ok(events[0].news,'news discussion must have a source');
 report.events=events.map(({id,text,replyTo,news,mode})=>({id,text,replyTo,news,mode}));report.samples=w.jevLife.samples.filter(s=>s.kind==='speech');report.passed=true;report.done=true;await writeFile(`cocos-2d/qa/chatter-live-${kind}.json`,JSON.stringify(report,null,2));
}
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1:4323'),json=v=>{res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(v));};
 if(u.pathname==='/api/session')return json({token:'growth-isolated-qa'});if(u.pathname==='/api/arrive')return json({world:snapshot()});if(u.pathname==='/api/world')return json(snapshot());if(u.pathname==='/api/world-stream')return live.attach('qa',w,res);if(u.pathname==='/api/presence')return json({ok:true});if(u.pathname==='/report')return json(report);
 if(u.pathname==='/trigger'){json({ok:true});void trigger(u.searchParams.get('kind')||'news').catch(e=>{report.done=true;report.failure=e.message;});return;}
 if(u.pathname==='/shutdown'){json({ok:true});live.close('qa');server.close(()=>app.exit(0));return;}
 const file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));if(!file.startsWith(root+path.sep))throw Error('path');const data=await readFile(file);res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.png':'image/png','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream'});res.end(data);
 }catch{res.writeHead(404);res.end();}});server.listen(4323,'127.0.0.1',()=>console.log('Isolated growth/chatter service ready on 4323'));
