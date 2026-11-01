import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import WebSocket from '../../node_modules/ws/wrapper.mjs';
import {createGame} from '../../server/game.mjs';
import {journey} from './journey.mjs';
const dir=await mkdtemp(path.join(tmpdir(),'mossvale-suspect7-qa-')),port=4437,url='http://127.0.0.1:'+port;
const ids={main:'a'.repeat(32),legacy:'b'.repeat(32),mobile:'c'.repeat(32),ending:'e'.repeat(32),fresh:'f'.repeat(32)};
const first=createGame('player');first.started=true;first.notes='第一部旧档旁注';const legacy={format:'six-roles-v1',active:'player',slots:{player:first},tokens:{player:'legacy-token'},menuToken:'legacy-menu',bestScore:62};const old=JSON.stringify(legacy);await writeFile(path.join(dir,ids.legacy+'.json'),old);await writeFile(path.join(dir,'voice-disabled.json'),'{}');
const child=spawn(process.execPath,['mystery/server/main.mjs'],{cwd:process.cwd(),detached:true,env:{...process.env,PORT:String(port),MYSTERY_DATA_DIR:dir,DEEPSEEK_API_KEY:'',DASHSCOPE_API_KEY:'',MYSTERY_QWEN_CONFIG:path.join(dir,'voice-disabled.json')},stdio:['ignore','pipe','pipe']});child.stderr.on('data',b=>process.stderr.write(b));await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
let state;const request=async(sid,endpoint,input,token)=>{const r=await fetch(url+'/api/'+endpoint,{method:input?'POST':'GET',headers:{Cookie:'mystery_sid='+sid,...input?{'Content-Type':'application/json'}:{}},body:input?JSON.stringify({...input,slotToken:token}):undefined});return {status:r.status,body:await r.json()};};
const report={realModelCalls:0,realVoiceCalls:0,isolatedData:true,checks:[]};
try{
 state=(await request(ids.main,'menu')).body;assert.equal(state.scripts.length,2);state=(await request(ids.main,'script',{scriptId:'suspect7'},state.slotToken)).body.state;state=(await request(ids.main,'role',{role:'andy'},state.slotToken)).body.state;
 await journey(async input=>{if(input.type==='final')await writeFile(path.join(dir,ids.ending+'.json'),await readFile(path.join(dir,ids.main+'.json')));const prior=state,resp=await request(ids.main,'action',input,state.slotToken);assert.equal(resp.status,200,resp.body.error);state=resp.body.state;if(prior.playerId!==state.playerId){assert.notEqual(state.slotToken,prior.slotToken);assert.equal((await request(ids.main,'action',{type:'notes',text:'stale'},prior.slotToken)).status,409);}}, {checkpoint:async ch=>{const roundtrip=(await request(ids.main,'state')).body;assert.deepEqual(roundtrip,state);if(ch===4)await writeFile(path.join(dir,ids.mobile+'.json'),await readFile(path.join(dir,ids.main+'.json')));}});
 assert.equal(state.ending.score,100);assert(state.roles.every(r=>!r.locked));report.checks.push('Andy → Wu Quan: all chapters, vote, password, reconstruction, insufficient-evidence theory, four reports, confrontation, 100-point ending, per-chapter reload');
 let firstView=(await request(ids.legacy,'state')).body;assert.equal(firstView.notes,'第一部旧档旁注');assert.equal(await readFile(path.join(dir,ids.legacy+'.json'),'utf8'),old);
 const originalFirst=structuredClone(firstView),voice=new WebSocket(url.replace('http','ws')+'/api/voice/tts',{headers:{Origin:url,Cookie:'mystery_sid='+ids.legacy}});await new Promise((resolve,reject)=>{voice.once('open',resolve);voice.once('error',reject);});const closed=new Promise(resolve=>voice.once('close',resolve));
 let r=await request(ids.legacy,'script',{scriptId:'suspect7'},firstView.slotToken);assert.equal(r.status,200);await Promise.race([closed,new Promise((_,reject)=>setTimeout(()=>reject(Error('stale voice stayed connected')),2000))]);assert.equal(await readFile(path.join(dir,ids.legacy+'.json.before-scripts-v2'),'utf8'),old);
 let token=r.body.state.slotToken;r=await request(ids.legacy,'role',{role:'andy'},token);token=r.body.state.slotToken;assert.equal((await request(ids.legacy,'chat',{actor:'chenxin',message:'stale'},originalFirst.slotToken)).status,409);r=await request(ids.legacy,'script',{scriptId:'hanyu'},token);r=await request(ids.legacy,'continue',{},r.body.state.slotToken);firstView=r.body.state;
 for(const key of ['playerId','clues','notes','investigation','chats','ending'])assert.deepEqual(firstView[key],originalFirst[key],key);assert.equal(firstView.bestScore,62);report.checks.push('Legacy read is read-only; first mutation backup exact; script roundtrip preserves first case; stale action/chat/voice rejected');
 assert.equal((await request(ids.mobile,'state')).body.chapterId,4);assert.equal((await request(ids.legacy,'state')).body.scriptId,'hanyu');report.checks.push('Visitors and routes isolated');report.passed=true;
 await writeFile('mystery/qa/suspect7-v1/http-verification.json',JSON.stringify(report,null,2));await writeFile('/tmp/mossvale-suspect7-qa-session.json',JSON.stringify({dir,url,port,ids,pid:child.pid}));console.log(JSON.stringify({passed:true,checks:report.checks,session:'/tmp/mossvale-suspect7-qa-session.json'}));
 // Keep this isolated server available for the visual checks; the parent owns cleanup.
 child.unref();child.stdout.destroy();child.stderr.destroy();
}catch(e){console.error(e);child.kill();process.exitCode=1;}
