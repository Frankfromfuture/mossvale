// Small, local sounds: no downloads, service calls, or investigation-save state.
export function createFeedbackBuffer(context,kind){
 const duration={click:.055,bubble:.13,paper:.28}[kind];
 if(!duration)return null;
 const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0);
 let seed=23719,low=0,slow=0,phase=0,peak=0;
 for(let i=0;i<data.length;i++){
  const t=i/context.sampleRate,u=t/duration;
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const noise=seed/2147483648-1;low+=(noise-low)*.2;slow+=(noise-slow)*.025;
  const edge=Math.min(1,t/.003,(duration-t)/.015);
  let value;
  if(kind==='click')value=(.65*low+.35*Math.sin(2*Math.PI*680*t))*Math.exp(-t*95);
  else if(kind==='bubble'){
   phase+=2*Math.PI*(340+470*Math.exp(-t*34))/context.sampleRate;
   value=(Math.sin(phase)+.08*Math.sin(phase*2))*Math.exp(-t*30);
  }else value=(low-slow)*Math.pow(Math.sin(Math.PI*u),1.4)*(.72+.28*Math.sin(2*Math.PI*24*t));
  data[i]=value*edge;peak=Math.max(peak,Math.abs(data[i]));
 }
 const level={click:.28,bubble:.18,paper:.15}[kind];
 if(peak)for(let i=0;i<data.length;i++)data[i]*=level/peak;
 return buffer;
}

export function createInteractionFeedback({env=window,root=env.document.getElementById('app'),motionTarget=()=>env.document.getElementById('scene')}={}){
 const soundKey='mystery-effects-enabled',motionKey='mystery-haptics-enabled';
 let enabled=env.localStorage.getItem(soundKey)!=='0',haptics=env.localStorage.getItem(motionKey)!=='0';
 let context=null,gain=null,recording=false,speaking=false,animation=null,lastAttention=-Infinity;
 const buffers=new Map(),sources=new Set(),lastSound=new Map(),seen=new Set();
 const reduced=env.matchMedia('(prefers-reduced-motion:reduce)');
 const audible=()=>enabled&&!recording&&!env.document.hidden;
 function level(){
  if(!gain)return;
  const t=context.currentTime;gain.gain.cancelScheduledValues(t);
  gain.gain.setTargetAtTime(audible()?(speaking ? .085 : .26):0,t,.015);
 }
 function stop(){for(const source of sources){try{source.stop();}catch{}}sources.clear();}
 function prepare(){
  if(!audible())return;
  try{
   if(!context){const AudioContext=env.AudioContext||env.webkitAudioContext;if(!AudioContext)return;
    context=new AudioContext();gain=context.createGain();gain.gain.value=.26;gain.connect(context.destination);level();
   }
   if(context.state!=='running'&&context.state!=='closed')return context.resume().catch(()=>{});
  }catch{}
 }
 function play(kind){
  if(!audible())return;
  const now=env.performance.now(),interval={click:65,bubble:140,paper:220}[kind];
  if(!interval||now-(lastSound.get(kind)??-Infinity)<interval)return;
  const ready=prepare();if(!context)return;
  lastSound.set(kind,now);
  const start=()=>{
   if(!audible()||context.state!=='running'||sources.size>=3||env.performance.now()-now>250)return;
   try{
    if(!buffers.has(kind))buffers.set(kind,createFeedbackBuffer(context,kind));
    const source=context.createBufferSource();source.buffer=buffers.get(kind);source.connect(gain);
    sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();};source.start();
   }catch{}
  };
  if(context.state==='running')start();else ready?.then(start);
 }
 function attention(kind,key){
  if(!key||seen.has(key))return;seen.add(key);if(seen.size>128)seen.delete(seen.values().next().value);
  const now=env.performance.now();
  if(!haptics||env.document.hidden||reduced.matches||now-lastAttention<250)return;
  lastAttention=now;
  try{env.navigator.vibrate?.(kind==='entry'?18:12);}catch{}
  const distance=kind==='entry'?1.8:1.2;
  animation?.cancel();
  animation=motionTarget()?.animate?.([
   {translate:'0px 0px'},{translate:`${distance}px 0px`},
   {translate:`${-distance*.65}px .3px`},{translate:`${distance*.3}px 0px`},{translate:'0px 0px'}
  ],{duration:180,easing:'ease-out'});
 }
 const paperButtons='[data-action="book"],[data-action="story"],[data-action="self"],[data-clue],[data-clue-choice],[data-chat-profile],#person-notes,#speaker-profile,#open-book,#keep-clue,#story-next,#story-prev';
 function clicked(event){
  const target=event.target.closest?.('button,a[href],[role="button"],input[type="checkbox"],input[type="radio"],.chat-bubble');
  if(!target||target.disabled||target.closest('[inert]'))return;
  // These actions cue only after the conversation opens or the message is accepted.
  if(target.matches('[data-person],.person-label,#mic,#voice-conversation,#save-notes')||target.closest('#chat-form'))return;
  const kind=target.matches(paperButtons)?'paper':target.matches('.chat-bubble,#opening-next')?'bubble':'click';
  // Carousel swipes may cancel the synthetic click later in the event path.
  const carousel=target.closest('.script-viewport');
  env.queueMicrotask(()=>{if(!(carousel&&event.defaultPrevented)&&!(kind==='bubble'&&env.getSelection()?.toString()))play(kind);});
 }
 function setEnabled(value){enabled=!!value;env.localStorage.setItem(soundKey,enabled?'1':'0');if(!enabled)stop();else prepare();level();}
 function setHaptics(value){haptics=!!value;env.localStorage.setItem(motionKey,haptics?'1':'0');if(!haptics){animation?.cancel();try{env.navigator.vibrate?.(0);}catch{}}}
 function setVoiceState(voice){recording=['starting','listening','finishing'].includes(voice.phase);speaking=!!voice.speaking;if(recording)stop();level();}
 function visibility(){level();if(env.document.hidden){stop();animation?.cancel();}}
 root?.addEventListener('click',clicked,true);
 env.document.addEventListener('pointerdown',prepare,{passive:true});env.document.addEventListener('keydown',prepare);
 env.document.addEventListener('visibilitychange',visibility);env.addEventListener('pagehide',stop);
 return {play,attention,setEnabled,setHaptics,setVoiceState,snapshot:()=>({enabled,haptics})};
}
