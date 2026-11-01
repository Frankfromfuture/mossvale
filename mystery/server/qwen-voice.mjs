import {people as suspect7People} from '../shared/suspect7/cast.mjs';
import {currentNames,presentNames} from '../shared/story-names.mjs';
import {playerId} from '../shared/player.mjs';
import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import WebSocket,{WebSocketServer} from 'ws';
export const characterVoices={
 miyazaki:{voice:'longnan_v3.1',name:'龙楠',rate:1.08,delivery:'用普通话，像坐在桌边对面前的一个人自然接话。句中高低起伏更鲜明一点，重要的词轻轻点出；安慰时柔和，疑问时轻扬，解释到转折处稍停，节奏有松有紧。每句话最后两三个字逐渐减轻音量，尾字短、轻、自然地收住。问句的上扬放在句中，最后一个字仍轻收。整体保持日常说话的音量与亲近感。',style:'年轻成年男性，待客温和、有礼，声音清朗。谈到疑点会犹豫一下再继续，保持日常交谈的分寸。'},
 jiang:{voice:'longsanshu_v3.1',name:'龙三叔',rate:1.0925,pitch:.94,style:'六十岁左右的年长男声，中低声区，厚实温和，带轻微沙哑和岁月感。话语里有关切，疑问带一点探询，重要的事实说得笃定，气息舒展。'},
 ishikawa:{voice:'longtian_v3.1',name:'龙天',rate:1.121,style:'成年男性，思路清楚，边回想边自然接话；解释时流畅，遇到疑点略有迟疑，关键处重音清楚。'},
 kato:{voice:'longxiaocheng_v3.1',name:'龙小诚',rate:1.121,pitch:.92,style:'五六十岁的年长男声，低沉粗厚，带一点沙哑，干脆爽直。说事实有底气，反问稍有力度，关心对方时语气放软，词句连贯。'},
 emi:{voice:'longyan_v3.1',name:'龙颜',rate:1.14,style:'成年女性，柔和清亮，说话利落。像熟人间交谈，安慰时温暖，疑问时轻轻上扬；台词涉及不安时稍放轻，情绪细腻而自然。'},
 player:{voice:'yezhiqing_v3.1',name:'叶知晴',rate:1.0925,style:'成年女性，清楚自然，带认真倾听后的好奇；询问时轻微扬起，解释时从容连贯。'}
};
characterVoices.narrator={voice:'longnan_v3.1',name:'旁白',rate:1.04,pitch:1,style:'平静清楚的故事讲述，停顿自然，不用预告片腔。'};
Object.assign(characterVoices,{
 andy:{voice:'longnan_v3.1',name:'安迪',rate:1.09,pitch:1.02,style:'35岁的中国男性，贸易平台经营者，谈吐从容，清楚地听完问题再回答。',delivery:'日常交谈，轻松但不油滑。谈到收藏和机关时略快，其他地方保持平稳。句尾轻收，不把每句话念成谜语。'},
 franklin:{voice:'longxiaocheng_v3.1',name:'富兰克林',rate:1.02,pitch:.96,style:'外表五十多岁的商人，措辞讲究，喜欢交代消息来自哪里。',delivery:'低沉而有分寸的普通话，不模仿夸张外国口音。解释时稍慢，受到追问时句子变短。克制，不用反派腔。'},
 hongxue:{voice:'yezhiqing_v3.1',name:'红雪',rate:1.03,pitch:.98,style:'32岁的拍卖行负责人，语言准确，性格克制。',delivery:'清楚、平静的日常女声。句间留很短的停顿，谈到养父时放轻，不哭腔，不拖长尾音。'},
 vivian:{voice:'longyan_v3.1',name:'薇薇安',rate:1.1,pitch:1.02,style:'30岁的女主播，擅长接话和照顾气氛，对外表现年轻。',delivery:'轻快自然，有语义重音和细小起伏。解释朋友的事时稍急，仍咬字清楚。成熟成人声音，不装小女孩，不用直播叫卖腔。'},
 chenxin:{voice:'longtian_v3.1',name:'陈信',rate:1.05,pitch:.96,style:'成年男性保镖，习惯简短汇报，长期工作带来疲惫。',delivery:'稳、短、直接。回答行踪前稍作停顿，情绪压住但不刻意阴沉，不主动渲染秘密。'},
 licha:{voice:'longnan_v3.1',name:'李察',rate:1.02,pitch:.95,style:'40岁的刑侦队长，习惯核对依据，说话干脆。',delivery:'成熟男性日常口语，低一些，重音放在时间、人物和依据上。语气稳定，不训人、不用播报腔。'},
 wuquan:{voice:'longxiaocheng_v3.1',name:'吴全',rate:1.1,pitch:1.01,style:'45岁的私家侦探，务实，追查哥哥之死时有些急切。',delivery:'略带沙哑的直接交谈，短问句利落，提到哥哥时声音收紧一点。每句自然收尾，不夸张表演。'},
 raven:{voice:'longnan_v3.1',name:'拉文',rate:1.07,pitch:1.04,style:'国际案件调查者，重视来源，分得清亲见和转述。',delivery:'条理清晰的普通话，节奏均匀，提出反证时轻轻强调。无需外国口音，避免机械列点。'},
 cuiyuan:{voice:'yezhiqing_v3.1',name:'崔媛',rate:1.08,pitch:1.03,style:'28岁的律师，耐心、敏锐，善于把复杂问题问清楚。',delivery:'温和明亮的成年女声，问句重音放在关键动词，末尾轻落。听起来是在与人交谈，不是法庭宣读。'},
 xiaoguo:{voice:'longtian_v3.1',name:'萧过',rate:1.06,pitch:1.04,style:'34岁的律师，出身富裕家庭，最初相信亲人的解释。',delivery:'干净、有礼的日常男声。谈家事稍放松，遇到矛盾时先停一下再重新措辞，不摆架子。'},
 aiyijun:{voice:'longsanshu_v3.1',name:'艾义军',rate:.98,pitch:1,style:'退休资深律师，失去儿子的父亲，年长而清醒。',delivery:'语速稍缓，温厚中带坚定，清楚交代每个事实。提到儿子时放轻半句，保持完整呼吸，不刻意颤抖或苍老。'}
});
characterVoices.dingyuanhou={voice:'longxiaocheng_v3.1',name:'定远侯',rate:1.05,pitch:.93,style:'克制的成年男声，逐句宣读，固定台词，不临场接话。'};
characterVoices.narrator7={voice:'yezhiqing_v3.1',name:'供述旁白',rate:1.08,style:'平静、清楚的现代悬疑叙述，不夸张表演。'};
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
  parameters:{format:'pcm',sample_rate:16000,intermediate_result_enabled:true,disfluency_removal_enabled:false,vocabulary:{'白川澄':5,'神谷朔':5,'森川介':5,'雾岛律':5,'黑泽修':5,'黑泽绫':5,'玉珏':5,'神社':3,...Object.fromEntries(suspect7People.map(p=>[p.name,5])),'定远玉':5,'定远侯':5,'洪青':5,'洪羽瑞':5,'梁炎豪':5,'孙强':5}},input:{context:presentNames(context)}
 }:{task_group:'audio',task:'tts',function:'SpeechSynthesizer',model:config.ttsModel,parameters:{text_type:'PlainText',voice:profile.voice,format:'pcm',sample_rate:24000,volume:50,rate:profile.rate,pitch:profile.pitch??1,language_hints:['zh'],instruction:(profile.delivery??conversationStyle)+profile.style},input:{}}));
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
    const slotChanged=id=>{if(id===session.visitorId){client.close();cleanup();}};
    server.on('mystery-slot-changed',slotChanged);
    const cleanup=()=>{clearTimeout(ttl);upstream?.close();active.delete(key);server.off('mystery-slot-changed',slotChanged);};
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
       const s=session.state,fixed=kind==='tts'&&(['narrator','narrator7'].includes(actor)||s.scriptId==='suspect7'&&actor==='dingyuanhou'&&s.started);if(!fixed&&s.positions[actor]!==s.room)throw Error('先到对方身边再开始语音。');
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
