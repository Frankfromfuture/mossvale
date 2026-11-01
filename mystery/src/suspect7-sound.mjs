// Small, fixed scene cues. They never drive the case clock or replace captions.
export function createVillaSound(){
 let context=null,source=null;
 function stop(){try{source?.stop();}catch{}source=null;}
 function cue(kind){
  if(document.hidden||localStorage.getItem('mystery-effects-enabled')==='0')return;
  try{context||=new (window.AudioContext||window.webkitAudioContext)();context.resume();stop();const duration=kind==='phone'?1.3:kind==='pool'?1.6:.6,b=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),a=b.getChannelData(0);let seed=31,low=0;
   for(let i=0;i<a.length;i++){const t=i/context.sampleRate,edge=Math.min(1,t/.025,(duration-t)/.08);seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;low+=(noise-low)*.06;let v=0;if(kind==='phone')v=(Math.sin(2*Math.PI*620*t)+Math.sin(2*Math.PI*790*t))*.012*(Math.sin(t*18)>0?1:0);else if(kind==='pool')v=(low*.022+Math.sin(t*2*Math.PI*90)*.006)*.7;else if(kind==='chapel')v=low*.03*Math.exp(-t*15);else v=Math.sin(2*Math.PI*(kind==='impact'?75:120)*t)*.035*Math.exp(-t*(kind==='impact'?10:18));a[i]=v*edge;}
   source=context.createBufferSource();source.buffer=b;source.connect(context.destination);source.start();
  }catch{}
 }
 const hidden=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hidden);
 return {cue,stop,destroy(){stop();context?.close();document.removeEventListener('visibilitychange',hidden);}};
}
