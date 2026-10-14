import http from 'node:http';
import {readFile,writeFile,rename,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {seed,record,retrieve,context,advance,destination,fallBack,applyInteraction,publicWorld,clamp} from './engine.mjs';
import {initializeLife,migrateLayout,layout,presence,playerActivity} from './life.mjs';
import {configureProvider,decide,aiStatus} from './ai.mjs';
const root=path.resolve(import.meta.dirname,'..');
const staticRoot=path.resolve(process.env.MOSSVALE_STATIC_DIR||path.join(root,'dist'));
const cafeStreet=process.env.MOSSVALE_SCENE==='cafe-street';
function newWorld(){
 const w=seed();
 if(cafeStreet)initializeLife(w,seed(),record);
 return w;
}
const dataDir=process.env.MOSSVALE_DATA_DIR||path.join(root,'.data');await mkdir(dataDir,{recursive:true,mode:0o700});
if(process.env.DEEPSEEK_API_KEY)configureProvider(async()=>({apiKey:process.env.DEEPSEEK_API_KEY,baseUrl:process.env.DEEPSEEK_BASE_URL||'https://api.deepseek.com',model:process.env.DEEPSEEK_MODEL||'deepseek-chat'}),'DeepSeek · 环境配置');
const worlds=new Map(),writes=new Map(),touched=new Map(),loading=new Map();
const port=Number(process.env.PORT)||4317;
const json=(res,obj,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
async function save(id,w){const content=JSON.stringify(w);const job=(writes.get(id)||Promise.resolve()).catch(()=>{}).then(async()=>{const f=path.join(dataDir,id+'.json');await writeFile(f+'.tmp',content,{mode:0o600});await rename(f+'.tmp',f);});writes.set(id,job);await job;}
async function world(id){
 if(worlds.has(id))return worlds.get(id);
 if(loading.has(id))return loading.get(id);
 const task=loadWorld(id);loading.set(id,task);try{return await task;}finally{loading.delete(id);}
}
async function loadWorld(id){
 let w;try{w=JSON.parse(await readFile(path.join(dataDir,id+'.json'),'utf8'));if(w.version!==1)throw new Error('version');}catch(e){if(e.code==='ENOENT')w=newWorld();else throw new Error('存档读取失败，原文件已保留');}
 if(cafeStreet&&w.lifeVersion!==1){
  const file=path.join(dataDir,id+'.json');
  try{await copyFile(file,file+'.before-life-v1',1);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}
  initializeLife(w,seed(),record);
 }
 if(cafeStreet&&w.layoutVersion!==layout.version){
  const file=path.join(dataDir,id+'.json');
  try{await copyFile(file,file+'.before-layout-v'+layout.version,1);}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}
  migrateLayout(w);
 }
 for(const r of w.residents){r.busy=false;for(const m of r.memories){const e=w.events.find(e=>e.id===m.eventId);if(e&&['chat','secret','dialogue','apologize'].includes(e.type))m.kind='reported';}}
 if(w.player)w.player.updatedAt=Date.now();
 const offline=Math.min(1440,Math.floor((Date.now()-w.lastReal)/2000)*(w.speed||1));
 if(offline>5&&!w.paused)advance(w,offline,{offline:true});w.lastReal=Date.now();w.lastAuto=Date.now();worlds.set(id,w);await save(id,w);return w;
}
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>6000)throw new Error('内容太长');}return text?JSON.parse(text):{};}
const isId=s=>/^[a-f0-9]{48}$/.test(s||'');
async function interact(w,r,kind,message){
 if(r.busy)throw new Error('这位居民正在回应，请稍等');
 if(w.residents.some(x=>x.busy))throw new Error('请先等上一位居民回应');
 if(kind==='help'&&r.lastHelpAt!=null&&w.minute-r.lastHelpAt<120)throw new Error('刚帮过忙，让这位居民先忙一会儿吧');
 if(kind==='gift'&&w.coins<10)throw new Error('镇币不足');
 if(kind==='invite'&&w.party?.status==='planned'&&w.party.invited.includes(r.id))throw new Error('已经邀请过这位居民');
 r.busy=true;
 const invitationAt=w.party?.status==='planned'?w.party.at:(Math.floor(w.minute/1440)+(w.minute%1440>=900?1:0))*1440+960;
 const requests={help:'玩家已经帮你完成手边的工作。回应这次实际帮助，不追问玩家是否要来帮忙。',gift:'玩家花10枚镇币给你送了一份点心。回应这次礼物。',invite:`玩家邀请你在第${Math.floor(invitationAt/1440)+1}天16:00来咖啡馆参加下午茶。结合工作时间、性格、信任与经历，明确接受或婉拒。`,apologize:'玩家为之前失约道歉，愿意下次提前说。如果你没有这段经历，请如实说明。'};
 const environment=`${w.weather}:${r.location}`,ctx=context(w,r,message||requests[kind]||kind);
 let result,notice;
 try{result=await decide(ctx,w.usage,kind);}catch(e){result=fallBack(r,kind);notice=e.message==='rules'?'当前使用规则模式':e.message==='budget'?'今日调用已到上限，继续按既定规则生活':e.message==='busy'?'居民们正忙，先按既定规则回应':'DeepSeek 本次未完成，已使用规则回应';}
 try{if(environment!==`${w.weather}:${r.location}`)throw new Error('环境已经变化，请重新与居民交流');return {...applyInteraction(w,r,kind,message,result),notice};}finally{r.busy=false;}
}
const server=http.createServer(async(req,res)=>{
 try{
  const host=req.headers.host;if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(host))return json(res,{error:'仅允许本机访问'},403);
  if(req.headers.origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port,'http://127.0.0.1:4318'].includes(req.headers.origin))return json(res,{error:'来源未授权'},403);
  const url=new URL(req.url,'http://'+host);
  if(url.pathname.startsWith('/api/')){
   if(req.method==='POST'&&req.headers['x-mossvale']!=='1')return json(res,{error:'缺少请求标识'},403);
   let id=req.headers.cookie?.match(/(?:^|; )mossvale=([a-f0-9]+)/)?.[1]||req.headers['x-town-token'];
   if(!isId(id)){id=randomBytes(24).toString('hex');res.setHeader('Set-Cookie',`mossvale=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`);}
   const w=await world(id);touched.set(id,Date.now());
   if(url.pathname==='/api/world'&&req.method==='GET')return json(res,publicWorld(w,aiStatus()));
   if(url.pathname==='/api/session'&&req.method==='GET')return json(res,{token:id});
   if(url.pathname==='/api/export'&&req.method==='GET'){res.setHeader('Content-Disposition','attachment; filename="mossvale-save.json"');return json(res,w);}
   if(req.method!=='POST')return json(res,{error:'未找到接口'},404);
   const b=await body(req);let result={};
   if(url.pathname==='/api/presence'&&w.lifeVersion){presence(w,b);return json(res,{ok:true});}
   if(url.pathname==='/api/activity'&&w.lifeVersion){
    if(w.residents.some(r=>r.busy))throw new Error('请等邻居回应后再试');
    result=playerActivity(w,b,record);
   }else if(url.pathname==='/api/interact'){
    const r=w.residents.find(r=>r.id===b.resident);if(!r)throw new Error('找不到居民');
    const kind=String(b.kind||'chat');if(!['chat','secret','help','gift','invite','apologize'].includes(kind))throw new Error('未知互动');
    const message=String(b.message||'').trim().slice(0,600);if(['chat','secret'].includes(kind)&&!message)throw new Error('先写一句话吧');
    result=await interact(w,r,kind,message);
   }else if(url.pathname==='/api/control'){
    if(w.residents.some(r=>r.busy))throw new Error('请等居民回应后再调整时间或环境');
    if(b.action==='pause')w.paused=!w.paused;
    else if(b.action==='speed')w.speed=w.speed===1?4:1;
    else if(b.action==='weather'){
     w.weather=w.weather==='sun'?'rain':'sun';record(w,'weather',w.weather==='rain'?'雨落了下来，户外的居民开始寻找避雨的地方。':'雨停了，阳光重新照进苔溪镇。',w.residents.map(r=>r.id),5);
     if(w.weather==='rain')for(const r of w.residents.filter(r=>['park','square','orchard','river','studio','shop'].includes(r.target))){destination(w,r,r.traits[0]>60?'cafe':'home');r.thought=r.traits[0]>60?'下雨了，去咖啡馆碰个面吧。':'想回家听一会儿雨。';}
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
    const fresh=newWorld();worlds.set(id,fresh);await save(id,fresh);return json(res,{world:publicWorld(fresh,aiStatus())});
   }else return json(res,{error:'未找到接口'},404);
   await save(id,w);return json(res,{world:publicWorld(w,aiStatus()),result});
  }
  const safe=path.resolve(staticRoot,'.'+decodeURIComponent(url.pathname));const dist=staticRoot;if(!safe.startsWith(dist+path.sep)&&safe!==dist)throw new Error('无效路径');
  let f=safe;let content;try{content=await readFile(f);}catch{if(path.extname(url.pathname))return json(res,{error:'未找到文件'},404);f=path.join(dist,'index.html');content=await readFile(f);}
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.json':'application/json','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8'};
  res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(content);
 }catch(e){json(res,{error:String(e.message||'请求未完成').slice(0,100)},400);}
});
let ticking=false;
setInterval(async()=>{
 if(ticking)return;ticking=true;
 try{for(const [id,w] of worlds){
  if(Date.now()-(touched.get(id)||0)>300000){await save(id,w);worlds.delete(id);continue;}
  if(!w.paused&&!w.residents.some(r=>r.busy)){advance(w,w.speed);await save(id,w);
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
