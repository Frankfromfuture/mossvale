import {currentNames,presentNames} from '../shared/story-names.mjs';
import {playerId} from '../shared/player.mjs';
import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import WebSocket,{WebSocketServer} from 'ws';
export const characterVoices={
 miyazaki:{voice:'longnan_v3.1',name:'龙楠',rate:1.026,style:'年长男性，安稳温厚；安慰时亲切柔和，谈到疑点时语气稍凝重。'},
 jiang:{voice:'longsanshu_v3.1',name:'龙三叔',rate:1.0925,pitch:.94,style:'六十岁左右的年长男声，中低声区，厚实温和，带轻微沙哑和岁月感。话语里有关切，疑问带一点探询，重要的事实说得笃定，气息舒展。'},
 ishikawa:{voice:'longtian_v3.1',name:'龙天',rate:1.121,style:'成年男性，思路清楚，边回想边自然接话；解释时流畅，遇到疑点略有迟疑，关键处重音清楚。'},
 kato:{voice:'longxiaocheng_v3.1',name:'龙小诚',rate:1.121,pitch:.92,style:'五六十岁的年长男声，低沉粗厚，带一点沙哑，干脆爽直。说事实有底气，反问稍有力度，关心对方时语气放软，词句连贯。'},
 emi:{voice:'longyan_v3.1',name:'龙颜',rate:1.14,style:'成年女性，柔和清亮，说话利落。像熟人间交谈，安慰时温暖，疑问时轻轻上扬；台词涉及不安时稍放轻，情绪细腻而自然。'},
 player:{voice:'yezhiqing_v3.1',name:'叶知晴',rate:1.0925,style:'成年女性，清楚自然，带认真倾听后的好奇；询问时轻微扬起，解释时从容连贯。'}
};
const conversationStyle='用普通话，像面对面自然接话。以完整意群连贯地说，词组紧接，语义转折处短停，句间自然换气。重音落在关键事实和疑问上，问句轻轻上扬，解释自然回落；安慰更柔和，迟疑稍放轻，追问稍有力度。情绪随台词变化，整体温和克制；句尾留自然余韵，衔接下一句时保持气息连贯。';
export async function voiceConfig(){
 let saved={};try{saved=JSON.parse(await readFile(process.env.MYSTERY_QWEN_CONFIG||path.join(homedir(),'.config/mossvale-mystery/qwen.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw Error('本机 Qwen 配置未能读取。');}
 const region=process.env.QWEN_REGION||saved.region||'cn-beijing',workspace=process.env.QWEN_WORKSPACE_ID||saved.workspaceId;
 return {...saved,apiKey:process.env.DASHSCOPE_API_KEY||saved.apiKey,asrModel:saved.asrModel||'qwen-audio-3.1-asr-flash-message',ttsModel:saved.ttsModel||'qwen-audio-3.1-tts-flash',url:saved.url||(workspace?`wss://${workspace}.${region}.maas.aliyuncs.com/api-ws/v1/inference`:`wss://${region==='cn-beijing'?'dashscope':'dashscope-intl'}.aliyuncs.com/api-ws/v1/inference`)};
}
export async function voiceStatus(){try{const c=await voiceConfig();return {ready:!!c.apiKey,provider:'Qwen',asrModel:c.asrModel,ttsModel:c.ttsModel,voices:Object.fromEntries(Object.entries(characterVoices).map(([id,v])=>[id,{voice:v.voice,name:v.name}]))};}catch{return {ready:false,provider:'Qwen'};}}
export function openQwenTask(config,kind,actor,callbacks={},context=[]){
 if(!config.apiKey)throw Error('尚未配置 Qwen 语音。');
 const taskId=randomUUID(),profile=characterVoices[actor];if(!profile)throw Error('请选择交谈人物。');
 const socket=new WebSocket(config.url,{headers:{Authorization:`Bearer ${config.apiKey}`,...config.workspaceId?{'X-DashScope-WorkSpace':config.workspaceId}:{}},handshakeTimeout:10000,maxPayload:2*1024*1024});
 let ready=false,ended=false;
 const command=(action,payload={input:{}})=>{if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({header:{action,task_id:taskId,streaming:'duplex'},payload}));};
 const close=()=>{ended=true;clearTimeout(timer);socket.close();};
 const fail=message=>{if(ended)return;callbacks.error?.(message);close();};
 const timer=setTimeout(()=>fail('Qwen 语音等待超时，请重试。'),70000);timer.unref();
 socket.on('open',()=>command('run-task',kind==='asr'?{
  task_group:'audio',task:'asr',function:'recognition',model:config.asrModel,
  parameters:{format:'pcm',sample_rate:16000,intermediate_result_enabled:true,disfluency_removal_enabled:false,vocabulary:{'白川澄':5,'神谷朔':5,'森川介':5,'雾岛律':5,'黑泽修':5,'黑泽绫':5,'玉珏':5,'神社':3}},input:{context:presentNames(context)}
 }:{task_group:'audio',task:'tts',function:'SpeechSynthesizer',model:config.ttsModel,parameters:{text_type:'PlainText',voice:profile.voice,format:'pcm',sample_rate:24000,volume:50,rate:profile.rate,pitch:profile.pitch??1,language_hints:['zh'],instruction:conversationStyle+profile.style},input:{}}));
 socket.on('message',(data,binary)=>{
  if(ended)return;
  if(binary){if(kind==='tts'&&ready)callbacks.audio?.(data);return;}
  let event;try{event=JSON.parse(data.toString());}catch{fail('Qwen 语音返回格式异常，请重试。');return;}
  if(event.header?.task_id&&event.header.task_id!==taskId)return;
  const type=event.header?.event;
  if(type==='task-started'){ready=true;callbacks.ready?.({sampleRate:kind==='asr'?16000:24000,voice:kind==='tts'?profile.voice:undefined});}
  else if(type==='result-generated'&&kind==='asr'){const s=event.payload?.output?.sentence;if(s&&!s.heartbeat)callbacks.sentence?.({id:s.sentence_id??s.begin_time,text:s.text||'',final:!!s.sentence_end});}
  else if(type==='task-finished'){callbacks.done?.();close();}
  else if(type==='task-failed')fail(`Qwen 语音未完成（${event.header.error_code||'task-failed'}）。请检查模型权限或稍后重试。`);
 });
 socket.on('unexpected-response',(_,response)=>{response.resume();fail(`Qwen 语音鉴权失败（HTTP ${response.statusCode}）。`);socket.terminate();});
 socket.on('error',()=>fail('Qwen 语音连接中断，请重试。'));
 socket.on('close',()=>{if(!ended)fail('Qwen 语音连接已断开，已保留文字。');});
 return {audio:bytes=>{if(ready&&!ended)socket.send(bytes,{binary:true});},text:text=>{if(ready&&!ended)command('continue-task',{input:{text:currentNames(text)}});},finish:()=>{if(ready&&!ended)command('finish-task');},close};
}
export function installVoice(server,getSession){
 const wss=new WebSocketServer({noServer:true,maxPayload:65536}),active=new Map();
 server.on('upgrade',async(req,socket,head)=>{
  const pathname=new URL(req.url,'http://localhost').pathname,kind=pathname==='/api/voice/asr'?'asr':pathname==='/api/voice/tts'?'tts':null;
  if(!kind){socket.destroy();return;}
  const deny=code=>{socket.end(`HTTP/1.1 ${code} Rejected\r\nConnection: close\r\n\r\n`);};
  try{
   if(!req.headers.origin||new URL(req.headers.origin).host!==req.headers.host){deny(403);return;}
   const session=await getSession(req);if(!session){deny(401);return;}
   const key=session.id+':'+kind;if(active.has(key)||active.size>=32){deny(429);return;}
   active.set(key,true);
   wss.handleUpgrade(req,socket,head,client=>{
    let upstream,bytes=0,characters=0,started=false,finished=false;
    const send=(type,body={})=>{if(client.readyState===WebSocket.OPEN)client.send(JSON.stringify({type,...body}));};
    const cleanup=()=>{clearTimeout(ttl);upstream?.close();active.delete(key);};
    const fail=error=>{send('error',{error});client.close();cleanup();};
    const ttl=setTimeout(()=>fail('这次语音已到时限，文字已保留。'),70000);ttl.unref();
    client.on('close',cleanup);client.on('error',cleanup);
    client.on('message',async(data,binary)=>{
     try{
      const current=await getSession(req);if(!current||current.slotToken!==session.slotToken)throw Error('主角已切换，请重新开始语音。');
      if(binary){bytes+=data.length;if(kind!=='asr'||!started||finished||bytes>1920000)throw Error('录音已停止或超过一分钟，请重新开始。');upstream?.audio(data);return;}
      const message=JSON.parse(data.toString());
      if(message.type==='start'&&!started){
       if(message.slotToken!==session.slotToken)throw Error('主角已切换，请刷新页面。');started=true;const actor=message.actor;if(!characterVoices[actor]||actor===playerId(session.state))throw Error('请选择交谈人物。');
       const s=session.state;if(s.positions[actor]!==s.room)throw Error('先到对方身边再开始语音。');
       const config=await voiceConfig();if(client.readyState!==WebSocket.OPEN)return;
       const history=(s.chats[actor]||[]).filter(l=>l.who===playerId(s)||l.who===actor).slice(-4),context=[];
       for(let i=0;i<history.length-1;i++)if(history[i].who===playerId(s)&&history[i+1].who===actor){const a=history[i],b=history[++i];context.push({role:'user',content:[{type:'input_text',text:a.text.slice(0,90)}]},{role:'assistant',content:[{type:'text',text:b.text.slice(0,90)}]});}
       upstream=openQwenTask(config,kind,actor,{ready:info=>send('ready',info),audio:chunk=>{if(client.readyState===WebSocket.OPEN){if(client.bufferedAmount>2000000){fail('音频传输过慢，请重试。');return;}client.send(chunk,{binary:true});}},sentence:s=>send('transcript',s),done:()=>{send('done');client.close();},error:fail},context);
      }else if(message.type==='text'&&kind==='tts'&&started&&!finished){
       if(typeof message.text!=='string'||message.text.length>1000||(characters+=message.text.length)>2000)throw Error('台词过长，请分段重听。');upstream?.text(message.text);
      }else if(message.type==='finish'&&started&&!finished){finished=true;upstream?.finish();}
      else throw Error('语音操作无效，请重新开始。');
     }catch(e){fail(e.message||'语音未能开始。');}
    });
   });
  }catch{active.delete(sessionKey(req,kind));deny(503);}
 });
}
function sessionKey(req,kind){return (req.headers.cookie||'').match(/mystery_sid=([a-f0-9]{32})/)?.[1]+':'+kind;}
