import {createNewsHub} from './news.mjs';
import {initializeNeighborhood} from './neighborhood.mjs';
import {createJevLife} from './jev-life.mjs';
import {createWorldStream} from './world-stream.mjs';
import {speechFrames} from './speech-stream.mjs';
import {runJevTest,jevTestStatus} from './jev-test.mjs';
import {installReflections,createReflectionLoop} from './reflection.mjs';
import {initializeEconomy,repathEconomy,returnMayor,economyAction,economyGift,economyActivity,visitorInteraction,validateHotelPlacement,refreshEconomy,economyPlanContext,applyEconomyPlan,DEFAULTS} from './economy.mjs';
import http from 'node:http';
import {createAutonomy} from './autonomy.mjs';
import {readFile,writeFile,rename,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {seed,record,retrieve,context,advance,destination,fallBack,applyInteraction,publicWorld,clamp} from './engine.mjs';
import {initializeLife,holdEconomicActor,initializeGridResidents,migrateLayout,layout,presence,playerActivity,refreshOnArrival,walkable,routeBetween,repathResidents} from './life.mjs';
import {initializeObjects,objectCatalog,objectAction,publicObjects,tickObjects} from './objects.mjs';
import {configureProvider,decide,aiStatus} from './ai.mjs';
import {installPersonalities,personalityVersion,soulContext} from './personality.mjs';
import {installLongMemory} from './long-memory.mjs';
import {installTownMind,ensureSchedule,parseAppointment,ownCommitments,closeAppointment,adoptHotelInvitations} from './calendar.mjs';
const root=path.resolve(import.meta.dirname,'..');
const staticRoot=path.resolve(process.env.MOSSVALE_STATIC_DIR||path.join(root,'dist'));
const trial2d=process.env.MOSSVALE_SCENE==='cafe-2d';
const townMindEnabled=trial2d&&process.env.MOSSVALE_TOWN_MIND==='1';
const cafeStreet=process.env.MOSSVALE_SCENE==='cafe-street'||trial2d;
const threeSpeeds=trial2d&&layout.neighborhoodVersion>=1;
const cookieName=process.env.MOSSVALE_COOKIE_NAME||(trial2d?'mossvale2d':'mossvale');
function newWorld(){
 const w=seed();
 if(trial2d){
  const ids=new Set(layout.actors.map(a=>a.id));
  w.residents=w.residents.filter(r=>ids.has(r.id));
  for(const r of w.residents)r.relations=Object.fromEntries(Object.entries(r.relations).filter(([id])=>ids.has(id)));
  w.events=w.events.filter(e=>e.participants.every(id=>ids.has(id)));
  const eventIds=new Set(w.events.map(e=>e.id));
  for(const r of w.residents)r.memories=r.memories.filter(m=>eventIds.has(m.eventId));
 }
 if(cafeStreet)initializeLife(w,trial2d?w:seed(),record);
 if(trial2d&&layout.spawn)Object.assign(w.player,layout.spawn);
 if(trial2d){initializeObjects(w);initializeGridResidents(w,seed(),record);}
 if(trial2d){w.events=w.events.filter(e=>e.type!=='story'&&e.type!=='arrival');initializeEconomy(w);initializeNeighborhood(w);}
 if(townMindEnabled){installLongMemory(w);installTownMind(w);for(const r of w.residents)ensureSchedule(w,r,layout.places);}
 return w;
}
const dataDir=process.env.MOSSVALE_DATA_DIR||path.join(root,'.data');await mkdir(dataDir,{recursive:true,mode:0o700});
if(process.env.DEEPSEEK_API_KEY)configureProvider(async()=>({apiKey:process.env.DEEPSEEK_API_KEY,baseUrl:process.env.DEEPSEEK_BASE_URL||'https://api.deepseek.com',model:process.env.DEEPSEEK_MODEL||'deepseek-chat'}),'DeepSeek · 环境配置');
const newsHub=townMindEnabled?createNewsHub({cachePath:path.join(dataDir,'news-cache.json')}):null;if(newsHub)void newsHub.start();
const worlds=new Map(),writes=new Map(),touched=new Map(),loading=new Map();
const syncEpoch=randomBytes(12).toString('hex');let syncSequence=0;
function speechSnapshot(w){return {speech:speechFrames(w),sync:{epoch:syncEpoch,sequence:++syncSequence,sentAt:Date.now()}};}
function snapshot(w){return {...publicWorld(w,aiStatus()),...(trial2d?speechSnapshot(w):{})};}
const live=createWorldStream({snapshot,touch:id=>touched.set(id,Date.now())});
const autonomy=createAutonomy({save,isCurrent:(id,w)=>worlds.get(id)===w});
const jevLife=createJevLife({decide,save,news:()=>newsHub?.articles()||[],publishSpeech:(id,w)=>{if(trial2d&&worlds.get(id)===w)live.publishSpeech(id,speechSnapshot(w));},isCurrent:(id,w)=>worlds.get(id)===w});
const reflections=createReflectionLoop({decide,save,isCurrent:(id,w)=>worlds.get(id)===w,record,places:layout.places,soul:soulContext});
const port=Number(process.env.PORT)||4317;
const json=(res,obj,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
async function save(id,w){const content=JSON.stringify(w);const job=(writes.get(id)||Promise.resolve()).catch(()=>{}).then(async()=>{const f=path.join(dataDir,id+'.json');await writeFile(f+'.tmp',content,{mode:0o600});await rename(f+'.tmp',f);});writes.set(id,job);if(trial2d&&worlds.get(id)===w)live.publish(id,w);await job;}
async function world(id){
 if(worlds.has(id))return worlds.get(id);
 if(loading.has(id))return loading.get(id);
 const task=loadWorld(id);loading.set(id,task);try{return await task;}finally{loading.delete(id);}
}
async function loadWorld(id){
 let w;try{w=JSON.parse(await readFile(path.join(dataDir,id+'.json'),'utf8'));if(w.version!==1)throw new Error('version');}catch(e){if(e.code==='ENOENT')w=newWorld();else throw new Error('存档读取失败，原文件已保留');}
 if(trial2d&&layout.prototype==='grid'&&w.gridResidentsVersion!==1){
  const file=path.join(dataDir,id+'.json');try{await copyFile(file,file+'.before-grid-v1',1);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}
 }
 if(trial2d&&!w.objectWorld){const file=path.join(dataDir,id+'.json');try{await copyFile(file,file+'.before-objects-v1',1);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}}
 if(trial2d&&w.objectWorld&&w.objectWorld.version!==objectCatalog.version){
  const file=path.join(dataDir,id+'.json');try{await copyFile(file,file+'.before-metre-grid-v1',1);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}
 }
 if(trial2d&&!w.economy){const file=path.join(dataDir,id+'.json');try{await copyFile(file,file+'.before-economy-v1',1);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}}
 if(trial2d&&w.economy&&w.reflectionVersion!==1){const file=path.join(dataDir,id+'.json');try{await copyFile(file,file+'.before-reflection-v1',1);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}}
 if(trial2d&&w.economy&&w.jevLife?.version!==1){const file=path.join(dataDir,id+'.json');try{await copyFile(file,file+'.before-jev-v1',1);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}}
 if(trial2d&&layout.neighborhoodVersion&&w.neighborhoodVersion!==layout.neighborhoodVersion){const file=path.join(dataDir,id+'.json');try{await copyFile(file,file+'.before-neighborhood-v1',1);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}}
 if(townMindEnabled&&w.townMind?.version!==1){const file=path.join(dataDir,id+'.json');try{await copyFile(file,file+'.before-town-mind-v1',1);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}}
 if(trial2d&&layout.neighborhoodVersion>=2&&w.neighborhoodVersion!==layout.neighborhoodVersion){const file=path.join(dataDir,id+'.json');try{await copyFile(file,file+'.before-town-growth-v1',1);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}}
 if(trial2d){initializeObjects(w);initializeNeighborhood(w);}
 if(cafeStreet&&w.lifeVersion!==1){
  const file=path.join(dataDir,id+'.json');
  try{await copyFile(file,file+'.before-life-v1',1);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}
  initializeLife(w,seed(),record);
 }
 if(cafeStreet&&w.layoutVersion!==layout.version){
  const file=path.join(dataDir,id+'.json');
  try{await copyFile(file,file+'.before-layout-v'+layout.version,1);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}
  migrateLayout(w);if(layout.neighborhoodVersion&&w.economy)repathEconomy(w);
 }
 if(cafeStreet&&w.personalityVersion!==personalityVersion){
  const file=path.join(dataDir,id+'.json');
  try{await copyFile(file,file+'.before-personality-v'+personalityVersion,1);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}
  installPersonalities(w);
 }
 if(trial2d){initializeGridResidents(w,seed(),record);if(initializeEconomy(w))w.lastReal=Date.now();installReflections(w);}
 if(townMindEnabled){installLongMemory(w);installTownMind(w);for(const r of w.residents)ensureSchedule(w,r,layout.places);adoptHotelInvitations(w,record,layout.places);}
 for(const r of w.residents){r.busy=false;if(r.life){delete r.life.aiHoldUntil;delete r.life.aiConversation;}for(const m of r.memories){const e=w.events.find(e=>e.id===m.eventId);if(e&&['chat','secret','dialogue','apologize'].includes(e.type))m.kind='reported';}}
 if(w.autonomy?.pending){w.autonomy.stale+=w.autonomy.pending;w.autonomy.completed+=w.autonomy.pending;w.autonomy.pending=0;}
 if(w.player)w.player.updatedAt=Date.now();
 if(w.economy)settleClock(w);else {const offline=Math.min(1440,Math.floor((Date.now()-w.lastReal)/2000)*(w.speed||1));if(offline>5&&!w.paused)advance(w,offline,{offline:true});if(trial2d)tickObjects(w);w.lastReal=Date.now();}
 if(threeSpeeds&&![1,2,3].includes(w.speed)){w.speed=Number(w.speed)>3?3:1;w.lastReal=Date.now();}
 w.lastAuto=Date.now();worlds.set(id,w);if(w.economy)jevLife.attach(id,w);await save(id,w);return w;
}
function settleClock(w,now=Date.now()){
 newsHub?.tick();
 if(!w.economy)return;if(w.paused){w.lastReal=now;return;}
 const unit=DEFAULTS.minuteMs/(w.speed||1),minutes=Math.max(0,Math.floor((now-w.lastReal)/unit));
 if(minutes){advance(w,minutes,{offline:w.minute>=w.economy.playerOnlineUntil});w.lastReal+=minutes*unit;}
}
function planEconomy(id,w){
 if(!w.economy||w.paused)return;const day=Math.floor(w.minute/1440);if(w.economy.planner.day===day)return;
 w.economy.planner={day,mode:'rules'};const ctx=economyPlanContext(w);
 decide(ctx,w.usage,'economy-plan').then(plan=>{if(worlds.get(id)===w)applyEconomyPlan(w,plan,day);}).catch(()=>{}).finally(()=>{if(worlds.get(id)===w)save(id,w).catch(()=>{});});
}
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>6000)throw new Error('内容太长');}return text?JSON.parse(text):{};}
const isId=s=>/^[a-f0-9]{48}$/.test(s||'');
async function interact(w,r,kind,message,options={}){
 if(w.economy&&['help','invite'].includes(kind))throw new Error(kind==='help'?'请从杂活清单选择实际工作':'请使用酒店邀请');
 if(w.economy&&kind==='gift')return economyGift(w,r);
 if(r.busy)throw new Error('这位居民正在回应，请稍等');
 if(w.residents.some(x=>x.busy))throw new Error('请先等上一位居民回应');
 if(kind==='help'&&r.lastHelpAt!=null&&w.minute-r.lastHelpAt<120)throw new Error('刚帮过忙，让这位居民先忙一会儿吧');
 if(kind==='gift'&&w.coins<10)throw new Error('镇币不足');
 if(kind==='invite'&&w.party?.status==='planned'&&w.party.invited.includes(r.id))throw new Error('已经邀请过这位居民');
 if(w.economy){if(Math.hypot(w.player.x-r.life.x,w.player.z-r.life.z)>4)throw new Error('走近邻居再交谈');holdEconomicActor(w,r.id,w.minute+12);}
 r.busy=true;
 const invitationAt=w.party?.status==='planned'?w.party.at:(Math.floor(w.minute/1440)+(w.minute%1440>=900?1:0))*1440+960;
 const requests={help:'玩家已经帮你完成手边的工作。回应这次实际帮助，不追问玩家是否要来帮忙。',gift:'玩家花10枚镇币给你送了一份点心。回应这次礼物。',invite:`玩家邀请你在第${Math.floor(invitationAt/1440)+1}天16:00来咖啡馆参加下午茶。结合工作时间、性格、信任与经历，明确接受或婉拒。`,apologize:'玩家为之前失约道歉，愿意下次提前说。如果你没有这段经历，请如实说明。'};
 const environment=`${w.weather}:${r.location}`,ctx=context(w,r,message||requests[kind]||kind);
 const proposal=['chat','secret'].includes(kind)?parseAppointment(w,r,message,layout.places,{private:kind==='secret'}):null;
 if(proposal)ctx.proposedCommitment=proposal;
 const cancellable=w.townMind&&!/(不要|别|不想|如果|假如|是否|吗|？|\?)/.test(message)&&/取消.{0,8}(约定|见面|赴约)|(?:约定|见面|赴约).{0,8}取消/.test(message)?ownCommitments(w,r.id).filter(c=>c.participants.includes('player')):[];
 const cancel=cancellable.length===1?cancellable[0]:null;if(cancel)ctx.cancelledCommitment={id:cancel.id,place:cancel.place,at:cancel.at};
 let result,notice;
 const check=()=>{if(options.signal?.aborted)throw new Error('对话已停止');if(environment!==`${w.weather}:${r.location}`)throw new Error('环境已经变化，请重新与居民交流');};
 try{
  try{result=await decide(ctx,w.usage,kind,{...options,...(options.onSpeech?{onSpeech:text=>{check();options.onSpeech(text);}}:{})});}
  catch(e){if(options.onSpeech)throw new Error(options.signal?.aborted?'对话已停止':'这次没说完，请再试一次。');result=fallBack(r,kind);notice=e.message==='rules'?'当前使用规则模式':e.message==='budget'?'今日调用已到上限，继续按既定规则生活':e.message==='busy'?'居民们正忙，先按既定规则回应':'DeepSeek 本次未完成，已使用规则回应';}
  check();return {...applyInteraction(w,r,kind,message,result,{proposal,cancel}),...(notice?{notice}:{})};
 }finally{r.busy=false;}
}
const server=http.createServer(async(req,res)=>{
 try{
  const host=req.headers.host;if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(host))return json(res,{error:'仅允许本机访问'},403);
  if(req.headers.origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port,'http://127.0.0.1:4318'].includes(req.headers.origin))return json(res,{error:'来源未授权'},403);
  const url=new URL(req.url,'http://'+host);
  // Diagnostic routes precede session creation, so testing never loads a player save.
  if(trial2d&&url.pathname==='/jev-test'&&req.method==='GET'){
   const page=await readFile(path.join(root,'server/pages/jev-test.html'));
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(page);return;
  }
  if(url.pathname==='/api/jev-test'){
   if(!trial2d)return json(res,{error:'仅本机 2D 提供测试'},404);
   if(req.method==='GET')return json(res,jevTestStatus());
   if(req.method!=='POST')return json(res,{error:'请使用测试按钮'},405);
   if(req.headers['x-mossvale']!=='1')return json(res,{error:'缺少请求标识'},403);
   const options=await body(req);
   if(!['idle','encounter','both'].includes(options.scenario)||![1,3].includes(options.rounds))return json(res,{error:'请选择测试场景和轮数'},400);
   if(jevTestStatus().running)return json(res,{error:'已有测试正在运行，请稍后再试'},409);
   res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.flushHeaders();
   const controller=new AbortController();res.once('close',()=>controller.abort());
   const emit=row=>{if(!res.destroyed)res.write(JSON.stringify(row)+'\n');};
   try{await runJevTest(options,{emit,signal:controller.signal});}
   catch{emit({type:'error',message:'本轮测试未完成，请稍后重试。'});}
   finally{if(!res.destroyed)res.end();}return;
  }
  if(url.pathname.startsWith('/api/')){
   if(req.method==='POST'&&req.headers['x-mossvale']!=='1')return json(res,{error:'缺少请求标识'},403);
   let id=req.headers.cookie?.match(new RegExp(`(?:^|; )${cookieName}=([a-f0-9]+)`))?.[1]||req.headers['x-town-token'];
   if(!isId(id)){id=randomBytes(24).toString('hex');res.setHeader('Set-Cookie',`${cookieName}=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`);}
   const w=await world(id);touched.set(id,Date.now());if(w.economy)settleClock(w);
   if(trial2d&&url.pathname==='/api/world-stream'&&req.method==='GET'){live.attach(id,w,res);return;}
   if(url.pathname==='/api/world'&&req.method==='GET')return json(res,snapshot(w));
   if(trial2d&&req.method==='GET'&&url.pathname==='/api/objects')return json(res,publicObjects(w));
   if(trial2d&&req.method==='GET'&&url.pathname.startsWith('/api/objects/'))return json(res,publicObjects(w,decodeURIComponent(url.pathname.slice('/api/objects/'.length))));
   if(url.pathname==='/api/session'&&req.method==='GET')return json(res,{token:id});
   if(url.pathname==='/api/export'&&req.method==='GET'){res.setHeader('Content-Disposition','attachment; filename="mossvale-save.json"');return json(res,w);}
   if(req.method!=='POST')return json(res,{error:'未找到接口'},404);
   const b=await body(req);let result={};
   if(url.pathname==='/api/presence'&&w.lifeVersion){presence(w,b);return json(res,{ok:true});}
   if(url.pathname==='/api/arrive'&&w.lifeVersion){
    result={updated:refreshOnArrival(w,String(b.visitId||''))};
    if(result.updated){if(w.economy){returnMayor(w);planEconomy(id,w);}autonomy.arrival(id,w);}
   }else if(url.pathname==='/api/economy-action'&&trial2d){result=economyAction(w,b);
   }else if(url.pathname==='/api/visitor-interact'&&trial2d){result=visitorInteraction(w,b);
   }else if(url.pathname==='/api/commitment-action'&&townMindEnabled){
    if(b.action!=='cancel')throw new Error('请在交谈中提出有明确时间和地点的邀请');
    const c=w.commitments.active.find(c=>c.id===b.id&&c.participants.includes('player'));if(!c)throw new Error('找不到这项尚未结束的约定');
    closeAppointment(w,c,'cancelled','村长明确取消了约定。',record);result={speech:'约定已取消。'};
   }else if(url.pathname==='/api/object-action'&&trial2d){
    if(w.residents.some(r=>r.busy))throw new Error('请等邻居回应后再试');
    result=objectAction(w,b,{record,layout,walkable,routeBetween,repathResidents,validatePlacement:validateHotelPlacement});if(w.economy){repathEconomy(w);refreshEconomy(w);w.economy.revision++;}
   }else if(url.pathname==='/api/activity'&&w.lifeVersion){
    if(w.residents.some(r=>r.busy))throw new Error('请等邻居回应后再试');
    result=w.economy?economyActivity(w,b):playerActivity(w,b,record);
   }else if(url.pathname==='/api/interact'){
    const r=w.residents.find(r=>r.id===b.resident);if(!r)throw new Error('找不到居民');
    const kind=String(b.kind||'chat');if(!['chat','secret','help','gift','invite','apologize'].includes(kind))throw new Error('未知互动');
    const message=String(b.message||'').trim().slice(0,600);if(['chat','secret'].includes(kind)&&!message)throw new Error('先写一句话吧');
    if(trial2d&&['chat','secret'].includes(kind)&&req.headers.accept?.includes('application/x-ndjson')){
     const requestId=String(b.requestId||'');if(!/^[a-zA-Z0-9_-]{8,96}$/.test(requestId))throw new Error('缺少对话标识');
     const previous=(w.chatReceipts||[]).find(x=>x.id===requestId);
     if(previous&&(previous.resident!==r.id||previous.kind!==kind||previous.message!==message))throw new Error('对话标识不匹配');
     res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'});res.flushHeaders();
     const controller=new AbortController(),cancel=()=>controller.abort();res.once('close',cancel);
     const emit=frame=>{if(!res.destroyed)res.write(JSON.stringify(frame)+'\n');};
     try{
      // A retry after losing the final packet returns the committed reply without another model call.
      result=previous?.result||await interact(w,r,kind,message,{signal:controller.signal,onSpeech:text=>{if(res.writableLength<65536)emit({type:'speech',text});}});
      if(!previous){const receipts=w.chatReceipts||=[];receipts.push({id:requestId,resident:r.id,kind,message,result});if(receipts.length>20)receipts.splice(0,receipts.length-20);}
      await save(id,w);emit({type:'complete',world:snapshot(w),result});
     }catch(e){await save(id,w);emit({type:'error',message:String(e.message||'这次没说完，请再试一次。').slice(0,100)});}
     finally{res.removeListener('close',cancel);if(!res.destroyed)res.end();}return;
    }
    result=await interact(w,r,kind,message);
   }else if(url.pathname==='/api/control'){
    if(w.residents.some(r=>r.busy))throw new Error('请等居民回应后再调整时间或环境');if(w.economy)w.lastReal=Date.now();
    if(b.action==='pause'){w.paused=!w.paused;jevLife.cancel(w);}
    else if(b.action==='speed'){
     if(threeSpeeds){if(b.speed!==undefined&&![1,2,3].includes(b.speed))throw new Error('请选择 1、2 或 3 倍速');w.speed=b.speed??(w.speed>=3?1:w.speed+1);}
     else w.speed=w.speed===1?4:1;
    }
    else if(b.action==='weather'){
     w.weather=w.weather==='sun'?'rain':'sun';record(w,'weather',w.weather==='rain'?'雨落了下来，户外的居民开始寻找避雨的地方。':'雨停了，阳光重新照进苔溪镇。',w.residents.map(r=>r.id),5);
     if(w.weather==='rain'&&!w.economy)for(const r of w.residents.filter(r=>['park','square','orchard','river','studio','shop'].includes(r.target))){destination(w,r,r.traits[0]>60?'cafe':'home');r.thought=r.traits[0]>60?'下雨了，去咖啡馆碰个面吧。':'想回家听一会儿雨。';}
    }else if(b.action==='advance'){advance(w,Math.min(1440,Math.max(1,Number(b.minutes)||60)));}
    else if(b.action==='attend'){if(!w.party||w.party.status!=='planned')throw new Error('先邀请一位居民');w.party.playerAttending=true;record(w,'commitment','你确认会参加这次咖啡馆下午茶。',w.party.invited,5);}
    else if(b.action==='miss'){if(!w.party||w.party.status!=='planned')throw new Error('先邀请一位居民');w.party.playerAttending=false;advance(w,Math.max(1,w.party.at-w.minute));}
    else throw new Error('未知操作');w.revision++;
   }else if(url.pathname==='/api/think'){
    const r=w.residents.find(r=>r.id===b.resident);if(!r)throw new Error('找不到居民');if(r.busy)throw new Error('居民正在思考');r.busy=true;
    try{const ctx=context(w,r,'根据眼前情况与目标，决定接下来做什么。');let choice;try{choice=await decide(ctx,w.usage,'think');}catch{choice={...fallBack(r,'chat'),speech:r.thought};}
     if(choice.action==='move')destination(w,r,choice.target);
     if(choice.action==='rest')destination(w,r,'home');
     r.thought=choice.thought;record(w,'reflection',`${r.name}想：${r.thought}`,[r.id],6,{evidence:choice.evidence||retrieve(w,r,r.goal).slice(0,2).map(m=>m.eventId),mode:choice.mode});
     if(choice.action==='seek_shelter'&&w.weather==='rain')destination(w,r,r.traits[0]>60?'cafe':'home');result={mode:choice.mode};
    }finally{r.busy=false;}
   }else if(url.pathname==='/api/reset'){
    if(b.confirm!=='重新开始')throw new Error('请确认重新开始');if(w.residents.some(r=>r.busy))throw new Error('请等居民回应后再重开');
    autonomy.cancel(w);const fresh=newWorld();worlds.set(id,fresh);jevLife.cancel(w);if(fresh.economy)jevLife.attach(id,fresh);await save(id,fresh);return json(res,{world:snapshot(fresh)});
   }else return json(res,{error:'未找到接口'},404);
   await save(id,w);return json(res,{world:snapshot(w),result});
  }
  const safe=path.resolve(staticRoot,'.'+decodeURIComponent(url.pathname));const dist=staticRoot;if(!safe.startsWith(dist+path.sep)&&safe!==dist)throw new Error('无效路径');
  let f=safe;let content;try{content=await readFile(f);}catch{if(path.extname(url.pathname))return json(res,{error:'未找到文件'},404);f=path.join(dist,'index.html');content=await readFile(f);}
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.json':'application/json','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8'};
  res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(content);
 }catch(e){if(res.headersSent){if(!res.destroyed&&!res.writableEnded)res.end(JSON.stringify({type:'error',message:'保存未完成，请重试。'})+'\n');return;}json(res,{error:String(e.message||'请求未完成').slice(0,100)},400);}
});
let ticking=false;
setInterval(async()=>{
 if(ticking)return;ticking=true;
 try{for(const [id,w] of worlds){
  if(Date.now()-(touched.get(id)||0)>300000){autonomy.cancel(w);jevLife.cancel(w);await save(id,w);live.close(id);worlds.delete(id);continue;}
  if(w.economy){settleClock(w);planEconomy(id,w);reflections.tick(id,w);await save(id,w);continue;}
  if(!w.paused&&!w.residents.some(r=>r.busy)){advance(w,w.speed);if(trial2d)tickObjects(w);autonomy.tick(id,w);await save(id,w);
   if(!w.lifeVersion&&aiStatus().mode==='deepseek'&&w.usage.calls<80&&Date.now()-(w.lastAuto||Date.now())>120000&&!w.residents.some(r=>r.busy)){
    const r=w.residents.filter(r=>!r.route?.length&&r.location===r.target).sort((a,b)=>(a.lastThought||0)-(b.lastThought||0))[0];
    if(r){w.lastAuto=Date.now();r.lastThought=w.minute;r.busy=true;
     const ctx=context(w,r,'现在无需回应玩家。根据眼前情境和你自己的目标，想一想接下来做什么。');
     decide(ctx,w.usage,'observe').then(choice=>{
      r.thought=choice.thought;
      if(choice.action==='move')destination(w,r,choice.target);
      if(choice.action==='rest')destination(w,r,'home');
      record(w,'reflection',`${r.name}想：${r.thought}`,[r.id],6,{evidence:choice.evidence,mode:choice.mode});
      if(choice.action==='seek_shelter'&&w.weather==='rain')destination(w,r,r.traits[0]>60?'cafe':'home');
     }).catch(()=>{}).finally(async()=>{r.busy=false;await save(id,w);});
    }
   }
  }
 }}finally{ticking=false;}
},2000).unref();
server.listen(port,'127.0.0.1',()=>console.log(`Mossvale is ready at http://127.0.0.1:${port} (${aiStatus().mode})`));
