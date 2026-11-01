import {sendAudioFile} from './audio-file.mjs';
import {archiveFormat,activeRole,selectScript,rotateToken,newArchive,migrateArchive,activeGame,archiveView,menuView,assertSlot,activeToken,selectRole,continueRole,resetRole,assertPlayable,roleUnlocked,rememberBestScore} from './role-saves.mjs';
import {presentNames} from '../shared/story-names.mjs';
import {installVoice,voiceStatus} from './qwen-voice.mjs';
import {ensureInvestigation} from './investigation.mjs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import {readFile,writeFile,mkdir,rename,stat,copyFile} from 'node:fs/promises';
import {act,converse,shareEvidence} from './scripts.mjs';
import {configure,status,generate} from './provider.mjs';
import {generateAmbient,commitAmbient,projectAmbient} from './ambient.mjs';
const root=path.resolve(import.meta.dirname,'..'),data=process.env.MYSTERY_DATA_DIR||path.join(root,'.data');
const cookiePath=process.env.MYSTERY_COOKIE_PATH||'/';
if(!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(cookiePath))throw new Error('Invalid cookie path');
const cookieSecurity=process.env.MYSTERY_SECURE_COOKIE==='1'?'; Secure':'';
await mkdir(data,{recursive:true});
if(process.env.DEEPSEEK_API_KEY)configure(async()=>({apiKey:process.env.DEEPSEEK_API_KEY,baseUrl:process.env.DEEPSEEK_BASE_URL||'https://api.deepseek.com',model:process.env.DEEPSEEK_MODEL||'deepseek-v4-flash'}));
const legacyFiles=new Set(),locks=new Set(),cache=new Map(),loads=new Map(),ambientPending=new Set(),ambientNext=new Map();
const save=async(id,s)=>{rememberBestScore(s);const file=path.join(data,id+'.json'),tmp=file+'.tmp';if(legacyFiles.has(id)){try{await copyFile(file,file+'.before-scripts-v2',1);}catch(e){if(e.code!=='EEXIST')throw e;}legacyFiles.delete(id);}await writeFile(tmp,JSON.stringify(s),{mode:0o600});await rename(tmp,file);const previous=cache.get(id);cache.set(id,s);if(previous&&activeToken(previous)!==activeToken(s))server.emit('mystery-slot-changed',id);};
const load=async id=>{
 if(cache.has(id))return cache.get(id);if(loads.has(id))return loads.get(id);
 const pending=(async()=>{try{
  const file=path.join(data,id+'.json'),raw=JSON.parse(await readFile(file,'utf8')),s=migrateArchive(raw);if(raw.format!==archiveFormat)legacyFiles.add(id);
  cache.set(id,s);return s;
 }catch(e){if(e.code!=='ENOENT')throw e;const s=newArchive();await save(id,s);return s;}})();
 loads.set(id,pending);try{return await pending;}finally{loads.delete(id);}
};
const send=(res,code,body)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(presentNames(body)));};
const mimes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  if(u.pathname==='/api/voice/status'){send(res,200,await voiceStatus());return;}
  if(u.pathname==='/api/health'){send(res,200,{ok:true,version:'mystery-1',ai:status()});return;}
  if(u.pathname.startsWith('/api/')){
   if(!['GET','POST'].includes(req.method)){send(res,405,{error:'不支持这个请求。'});return;}
   if(req.method==='POST'&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){send(res,403,{error:'请求来源不正确。'});return;}
   let id=(req.headers.cookie||'').match(/(?:^|;\s*)mystery_sid=([a-f0-9]{32})(?:;|$)/)?.[1];
   if(!id){id=crypto.randomBytes(16).toString('hex');res.setHeader('Set-Cookie',`mystery_sid=${id}; Path=${cookiePath}; HttpOnly; SameSite=Strict; Max-Age=31536000${cookieSecurity}`);}
   const archive=await load(id),s=activeGame(archive);
   if(req.method==='GET'&&u.pathname==='/api/menu'){send(res,200,menuView(archive,status()));return;}
   if(req.method==='GET'&&u.pathname==='/api/state'){send(res,200,archiveView(archive,status()));return;}
   if(req.method!=='POST'||!['/api/action','/api/chat','/api/reset','/api/ambient','/api/role','/api/continue','/api/script'].includes(u.pathname)){send(res,404,{error:'没有这个入口。'});return;}
   let content='';for await(const chunk of req){content+=chunk;if(content.length>15000){send(res,413,{error:'内容太长。'});return;}}
   let input;try{input=JSON.parse(content);}catch{send(res,400,{error:'请求内容无效。'});return;}
   if(await load(id)!==archive){send(res,409,{error:'进度刚刚变化，请刷新后继续。'});return;}
   assertSlot(archive,input.slotToken);
   if(['/api/role','/api/continue','/api/script'].includes(u.pathname)){
    if(locks.has(id)){send(res,409,{error:'上一句话还没说完，请稍后切换。'});return;}
    locks.add(id);try{const next=structuredClone(archive);if(u.pathname==='/api/script')selectScript(next,input.scriptId);else if(u.pathname==='/api/continue')continueRole(next);else selectRole(next,input.role);await save(id,next);send(res,200,{state:u.pathname==='/api/script'?menuView(next,status()):archiveView(next,status())});}finally{locks.delete(id);}return;
   }
   if(!s){send(res,409,{error:'先选一位主角，再开始调查。'});return;}
   assertPlayable(archive);
   if(u.pathname==='/api/ambient'){
    const now=Date.now(),remaining=(ambientNext.get(id)||0)-now;
    if(remaining>0||ambientPending.has(id)||locks.has(id)||s.room!==(s.scriptId==='suspect7'?(s.chapterId>=5?'meeting':'dining'):'hall')||!s.started||s.ending||s.investigation?.challenge||s.briefing&&!s.briefing.complete){send(res,200,{event:null,cooldownMs:Math.max(remaining,15000)});return;}
    ambientPending.add(id);ambientNext.set(id,now+85000+Math.random()*35000);
    try{
     const revision=s.revision,event=await generateAmbient(structuredClone(s),status().ready?generate:null),currentArchive=await load(id),current=activeGame(currentArchive);
     // Model generation runs outside the player's lock. Never overwrite a
     // question, room change or reset that completed while it was in flight.
     if(currentArchive!==archive||current!==s||current.revision!==revision||locks.has(id)){send(res,200,{event:null,cooldownMs:85000});return;}
     const nextArchive=structuredClone(currentArchive),next=activeGame(nextArchive);if(commitAmbient(next,event)){locks.add(id);try{await save(id,nextArchive);}finally{locks.delete(id);}send(res,200,{event:projectAmbient(event),cooldownMs:85000});}else send(res,200,{event:null,cooldownMs:15000});
    }finally{ambientPending.delete(id);}return;
   }
   if(locks.has(id)){send(res,409,{error:'上一句话还没说完。'});return;}locks.add(id);
   const streaming=u.pathname==='/api/chat'&&req.headers.accept?.includes('text/event-stream');let heartbeat;
   const writeEvent=(event,body)=>{if(!res.destroyed&&!res.writableEnded)res.write(`event: ${event}\ndata: ${JSON.stringify(presentNames(body))}\n\n`);};
   try{
    if(streaming){
     res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store','X-Accel-Buffering':'no'});res.flushHeaders();
     heartbeat=setInterval(()=>{if(!res.destroyed&&!res.writableEnded)res.write(': keep-alive\n\n');},10000);heartbeat.unref();
    }
    const nextArchive=structuredClone(archive);let next=activeGame(nextArchive),result={};
    if(u.pathname==='/api/reset'){if(input.confirm!=='new-case')throw Error('请先确认重新开始。');resetRole(nextArchive);next=activeGame(nextArchive);}
    else if(u.pathname==='/api/chat')result=await converse(next,input,generate,streaming?{onSpeech:speech=>writeEvent('speech',{speech})}:undefined);
    else if(input.type==='share')result=await shareEvidence(next,input,generate);
    else result=act(next,input);
    if(next.playerId!==s.playerId||next.viewpointMode!==s.viewpointMode)rotateToken(nextArchive);
    await save(id,nextArchive);
    const body={...result,state:archiveView(nextArchive,status())};
    if(streaming){writeEvent('done',body);res.end();}else send(res,200,body);
   }catch(e){
    if(!streaming)throw e;
    writeEvent('error',{error:e.message?.includes('fetch')?'回复连接中断，输入已保留，可以重试。':e.message||'回复未能完成，请重试。'});res.end();
   }finally{clearInterval(heartbeat);locks.delete(id);}return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){send(res,405,{error:'不支持这个请求。'});return;}
  const relative=decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname),file=path.resolve(root,'dist','.'+relative),staticRoot=path.join(root,'dist');
  if(!file.startsWith(staticRoot+path.sep)){send(res,404,{error:'找不到文件。'});return;}
  try{const info=await stat(file);if(!info.isFile())throw Error();if(['.m4a','.mp3'].includes(path.extname(file))){sendAudioFile(req,res,file,info.size);return;}const body=await readFile(file);res.writeHead(200,{'Content-Type':mimes[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:body);}catch{send(res,404,{error:'找不到文件。'});}
 }catch(e){send(res,e.status||500,{error:e.message?.includes('fetch')?'网络暂时没有回应，输入已保留。':e.message||'这一步没有完成，请重试。'});}
});
installVoice(server,async req=>{const id=(req.headers.cookie||'').match(/(?:^|;\s*)mystery_sid=([a-f0-9]{32})(?:;|$)/)?.[1];if(!id)return null;const archive=await load(id);return activeGame(archive)&&roleUnlocked(archive,activeRole(archive))?{visitorId:id,id:id+':'+activeToken(archive),state:activeGame(archive),slotToken:activeToken(archive)}:null;});
server.listen(Number(process.env.PORT||4331),'127.0.0.1',()=>console.log(`Mystery ready http://127.0.0.1:${process.env.PORT||4331}`));
