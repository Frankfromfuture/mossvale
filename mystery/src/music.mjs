// One script soundtrack; audio preferences stay outside the investigation save.
export function createBackgroundMusic({env=window,notice=()=>{}}={}){
 const enabledKey='mystery-music-enabled',volumeKey='mystery-music-volume';
 const saved=env.localStorage.getItem(volumeKey),number=saved===null ? .2 : Number(saved);
 let enabled=env.localStorage.getItem(enabledKey)!=='0',volume=Number.isFinite(number)?Math.max(0,Math.min(1,number)):.2;
 let active=false,recording=false,speaking=false,audio=null,context=null,gain=null,notified=false;
 const wanted=()=>active&&enabled&&volume>0&&!recording&&!env.document.hidden;
 const snapshot=()=>({enabled,volume,active,recording,speaking,playing:!!audio&&!audio.paused});
 function ensure(){
  if(audio)return;
  context=new (env.AudioContext||env.webkitAudioContext)();gain=context.createGain();gain.gain.value=0;gain.connect(context.destination);
  audio=new env.Audio();audio.id='case-music';audio.hidden=true;audio.loop=true;audio.preload='none';audio.src=new URL('audio/mist-lantern-theme-v2.mp3',env.location.href).href;
  context.createMediaElementSource(audio).connect(gain);env.document.body.append(audio);
  audio.addEventListener('error',()=>{if(active&&enabled&&!notified){notified=true;notice('背景音乐暂时没能加载，可在设置中关闭后重试。');}});
 }
 function level(immediate=false){
  if(!gain)return;const target=wanted()?volume*(speaking ? .4 : 1):0;
  gain.gain.cancelScheduledValues(context.currentTime);
  if(immediate)gain.gain.setValueAtTime(target,context.currentTime);else gain.gain.setTargetAtTime(target,context.currentTime,speaking ? .12 : .32);
 }
 function play(){
  if(!audio)return;
  context.resume().catch(()=>{});
  audio.play().then(()=>{if(!wanted())audio.pause();else level();}).catch(error=>{
   if(wanted()&&error.name!=='AbortError'&&!notified){notified=true;notice(error.name==='NotAllowedError'?'点一下画面即可开启背景音乐。':'背景音乐暂时没能播放，可在设置中关闭后重试。');}
  });
 }
 function sync(){
  if(!wanted()){level(true);audio?.pause();return;}
  try{ensure();level();if(audio.paused)play();}catch{if(!notified){notified=true;notice('此浏览器暂时无法播放背景音乐。');}}
 }
 // Prime the media element inside the start/continue click, before the API await.
 function prepare(){if(!enabled||!volume)return;try{ensure();level(true);play();}catch{}}
 function setActive(value){active=!!value;sync();}
 function setEnabled(value){enabled=!!value;env.localStorage.setItem(enabledKey,enabled?'1':'0');notified=false;if(enabled&&audio?.error)audio.load();sync();}
 function setVolume(value){const n=Number(value);if(!Number.isFinite(n))return;volume=Math.max(0,Math.min(1,n));env.localStorage.setItem(volumeKey,String(volume));sync();}
 function setVoiceState(voice){
  const nextRecording=['starting','listening','finishing'].includes(voice.phase),nextSpeaking=!!voice.speaking;
  if(nextRecording===recording&&nextSpeaking===speaking)return;recording=nextRecording;speaking=nextSpeaking;sync();
 }
 const gesture=()=>{if(wanted())sync();};
 const hide=()=>{level(true);audio?.pause();};
 env.document.addEventListener('visibilitychange',sync);
 env.document.addEventListener('pointerdown',gesture,{passive:true});env.document.addEventListener('keydown',gesture);
 env.addEventListener('pagehide',hide);env.addEventListener('pageshow',sync);
 function destroy(){active=false;audio?.pause();audio?.remove();context?.close();env.document.removeEventListener('visibilitychange',sync);env.document.removeEventListener('pointerdown',gesture);env.document.removeEventListener('keydown',gesture);env.removeEventListener('pagehide',hide);env.removeEventListener('pageshow',sync);}
 return {prepare,setActive,setEnabled,setVolume,setVoiceState,snapshot,destroy};
}
