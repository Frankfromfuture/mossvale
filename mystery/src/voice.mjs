import {createPCMPlayer,captureMicrophone} from './voice-audio.mjs';
// Audio stays outside case saves. Only a completed transcript becomes a question.
export function createVoice({context,getDraft,setDraft,submit,changed,notice,env=window}){
 let mode='off',phase='idle',epoch=0,timer=null,recording=null,inputSocket=null,output=null,configured=false;
 const player=createPCMPlayer(env);
 const canListen=()=>configured&&env.isSecureContext!==false&&!!env.navigator?.mediaDevices?.getUserMedia&&!!env.AudioWorkletNode;
 const canSpeak=()=>configured&&!!(env.AudioContext||env.webkitAudioContext);
 const ready=actor=>{const c=context();return c.actor===actor&&!c.busy&&!c.blocked;};
 const snapshot=()=>({mode,phase,inputAvailable:canListen(),outputAvailable:canSpeak(),conversationAvailable:canListen()&&canSpeak(),speaking:!!output,provider:'Qwen'});
 const emit=()=>changed(snapshot());
 env.fetch('api/voice/status').then(r=>r.json()).then(s=>{configured=!!s.ready;emit();}).catch(()=>{configured=false;emit();});
 function socket(kind){const url=new URL('api/voice/'+kind,env.location.href);url.protocol=url.protocol==='https:'?'wss:':'ws:';const ws=new env.WebSocket(url);ws.binaryType='arraybuffer';return ws;}
 function silence(){
  epoch++;env.clearTimeout(timer);timer=null;recording?.stop();recording=null;
  inputSocket?.close();inputSocket=null;output?.socket.close();output=null;player.stop();
 }
 function stop(){silence();mode='off';phase='idle';emit();}
 function fail(message){stop();notice(message);}
 function laterListen(actor,token){if(mode==='conversation')timer=env.setTimeout(()=>{if(token===epoch&&ready(actor))listen();else stop();},300);}
 async function listen(){
  const actor=context().actor;if(!actor||!ready(actor)){stop();return;}
  const token=epoch,base=getDraft(),sentences=new Map();let ws,finalSeen=false,finishing=false,done=false,qwenReady=false;
  const valid=()=>epoch===token&&inputSocket===ws&&ready(actor);
  const text=()=>[...sentences.entries()].sort((a,b)=>a[0]-b[0]).map(([,v])=>v.text).join('');
  function finish(){if(finishing||!valid())return;finishing=true;recording?.stop();recording=null;phase='finishing';emit();if(qwenReady&&ws.readyState===1)ws.send(JSON.stringify({type:'finish'}));}
  try{
   phase='starting';emit();const ctx=player.unlock();
   ws=socket('asr');inputSocket=ws;
   ws.onopen=()=>{if(valid())ws.send(JSON.stringify({type:'start',actor,slotToken:context().slotToken}));};
   ws.onmessage=async event=>{
    if(!valid())return;
    let data;try{data=JSON.parse(event.data);}catch{fail('语音识别连接异常，文字已保留。');return;}
    if(data.type==='ready'){
     qwenReady=true;if(finishing){ws.send(JSON.stringify({type:'finish'}));return;}
     try{const capture=await captureMicrophone(env,ctx,audio=>{if(valid()&&!finishing&&ws.readyState===1){if(ws.bufferedAmount>160000){fail('语音上传过慢，文字已保留。');return;}ws.send(audio);}});
      if(!valid()||finishing){capture.stop();return;}recording=capture;phase='listening';emit();timer=env.setTimeout(finish,60000);
     }catch(e){if(valid())fail(e.name==='NotAllowedError'?'请允许麦克风，再点语音输入。':'麦克风未能启动，请检查设备。');}
    }else if(data.type==='transcript'){
     sentences.set(data.id,{text:data.text,final:data.final});setDraft((base+text()).slice(0,800));
     if(data.final&&data.text.trim()){finalSeen=true;finish();}
    }else if(data.type==='done'){
     done=true;env.clearTimeout(timer);recording?.stop();recording=null;inputSocket=null;ws.close();
     if(mode==='conversation'&&finalSeen){phase='thinking';emit();submit();}
     else{mode='off';phase='idle';emit();if(!finalSeen)notice('没有听清，文字已保留，可以修改后说出。');}
    }else if(data.type==='error')fail(data.error);
   };
   ws.onerror=()=>{if(valid())fail('Qwen 语音连接中断，文字已保留。');};
   ws.onclose=()=>{if(valid()&&!done)fail('语音识别中断，文字已保留，可以重新录音。');};
   // The mic button can finish a recording without canceling its final result.
   ws.finishInput=finish;
  }catch{if(token===epoch)fail('语音暂未能启动，请重试。');}
 }
 function start(continuous){
  if(!canListen()){notice(configured?'此浏览器暂未提供麦克风录音，请使用 HTTPS 或本机地址。':'Qwen 语音尚未就绪，请稍后重试。');return;}
  if(!ready(context().actor))return;
  if(continuous&&getDraft().trim()){notice('输入框里还有草稿，先说出或清空，再开启语音对话。');return;}
  silence();mode=continuous?'conversation':'input';listen();
 }
 function toggleInput(){if(mode==='conversation'){stop();return;}if(inputSocket){inputSocket.finishInput?.();return;}start(false);}
 function toggleConversation(){if(mode==='conversation')stop();else start(true);}
 function beforeSend(){const continuous=mode==='conversation';silence();try{if(canSpeak())player.unlock();}catch{}mode=continuous?'conversation':'off';phase=continuous?'thinking':'idle';emit();return epoch;}
 const clean=text=>String(text||'').replace(/（[^）]*(?:）|$)|\([^)]*(?:\)|$)/g,'').replace(/[*#_`]/g,'').trim();
 function beginOutput(actor,{force=false,turn}={}){
  if(turn!==undefined&&turn!==epoch)return null;
  if(context().actor!==actor||context().blocked)return null;
  if(mode!=='conversation'&&!context().readReplies&&!force)return null;
  if(!canSpeak()){fail('Qwen 台词朗读暂不可用，文字可继续查看。');return null;}
  player.unlock();const token=epoch,ws=socket('tts'),session={socket:ws,actor,token,ready:false,text:'',pending:[],finished:false,done:false,audio:false};output=session;phase='speaking';emit();
  const valid=()=>epoch===token&&output===session&&context().actor===actor&&!context().blocked;
  const flush=()=>{if(!session.ready)return;for(const text of session.pending)ws.send(JSON.stringify({type:'text',text}));session.pending=[];if(session.finished)ws.send(JSON.stringify({type:'finish'}));};
  session.flush=flush;ws.onopen=()=>{if(valid())ws.send(JSON.stringify({type:'start',actor,slotToken:context().slotToken}));};
  ws.onmessage=e=>{
   if(!valid())return;
   if(e.data instanceof ArrayBuffer){session.audio=true;try{player.play(e.data);}catch{fail('音频播放未能继续，文字可继续查看。');}return;}
   let data;try{data=JSON.parse(e.data);}catch{fail('台词音频连接异常，请点重听。');return;}
   if(data.type==='ready'){session.ready=true;flush();}
   else if(data.type==='done'){session.done=true;ws.close();player.end(()=>{if(!valid())return;output=null;phase='idle';emit();laterListen(actor,token);});}
   else if(data.type==='error')fail(data.error);
  };
  ws.onerror=()=>{if(valid())fail('Qwen 朗读连接中断，文字仍保留。');};
  ws.onclose=()=>{if(valid()&&!session.done)fail('朗读连接已断开，可点重听。');};return session;
 }
 function partial(text,actor,options={}){
  if(options.turn!==undefined&&options.turn!==epoch)return;
  const spoken=clean(text);if(!spoken)return;
  let session=output;try{session||=beginOutput(actor,options);}catch{fail('台词音频未能启动，文字可继续查看。');return;}if(!session||session.actor!==actor||session.finished)return;
  if(!spoken.startsWith(session.text)){fail('台词已更新，请点重听完整回答。');return;}
  const extra=spoken.slice(session.text.length);session.text=spoken;
  if(extra){session.pending.push(extra);session.flush();}
 }
 function reply(text,actor,options={}){
  if(options.turn!==undefined&&options.turn!==epoch)return;
  partial(text,actor,options);
  const session=output;if(session&&session.actor===actor){session.finished=true;session.flush();}
  else if(mode==='conversation'){phase='idle';emit();laterListen(actor,epoch);}
 }
 return {snapshot,level:()=>output?player.level():null,stop,toggleInput,toggleConversation,beforeSend,partial,reply,failed:stop};
}
