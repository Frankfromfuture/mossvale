export function createPCMPlayer(env){
 let context,next=0,sources=new Set(),finish=null,carry=null,analyser,samples;
 function unlock(){context||=new (env.AudioContext||env.webkitAudioContext)();context.resume().catch(()=>{});return context;}
 function stop(){finish=null;carry=null;for(const source of sources){source.onended=null;try{source.stop();}catch{}}sources.clear();next=0;}
 function drained(){if(finish&&!sources.size){const callback=finish;finish=null;callback();}}
 function play(bytes,rate=24000){
  const ctx=unlock();let input=new Uint8Array(bytes);if(carry!==null){const joined=new Uint8Array(input.length+1);joined[0]=carry;joined.set(input,1);input=joined;carry=null;}
  if(input.length%2){carry=input.at(-1);input=input.subarray(0,input.length-1);}if(!input.length)return;
  const view=new DataView(input.buffer,input.byteOffset,input.byteLength),buffer=ctx.createBuffer(1,input.length/2,rate),values=buffer.getChannelData(0);
  for(let i=0;i<values.length;i++)values[i]=view.getInt16(i*2,true)/32768;
  if(!analyser){analyser=ctx.createAnalyser();analyser.fftSize=256;samples=new Float32Array(analyser.fftSize);analyser.connect(ctx.destination);}
  const source=ctx.createBufferSource();source.buffer=buffer;source.connect(analyser);sources.add(source);
  // Keep queued packets sample-contiguous; buffer only a fresh or starved stream.
  source.onended=()=>{sources.delete(source);drained();};if(next<=ctx.currentTime)next=ctx.currentTime+.08;source.start(next);next+=buffer.duration;
 }
 function level(){if(!sources.size||context?.state!=='running'||!analyser)return 0;analyser.getFloatTimeDomainData(samples);let sum=0;for(const v of samples)sum+=v*v;return Math.sqrt(sum/samples.length);}
 return {unlock,play,stop,level,end:callback=>{finish=callback;drained();},get context(){return unlock();}};
}
export async function captureMicrophone(env,context,onAudio){
 const stream=await env.navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
 let node,source,gain;
 const stop=()=>{node?.disconnect();source?.disconnect();gain?.disconnect();stream.getTracks().forEach(track=>track.stop());};
 try{
  await context.audioWorklet.addModule(new URL('voice-capture.worklet.js',env.location.href));
  source=context.createMediaStreamSource(stream);node=new env.AudioWorkletNode(context,'qwen-voice-capture');gain=context.createGain();gain.gain.value=0;
  node.port.onmessage=e=>onAudio(e.data);source.connect(node);node.connect(gain);gain.connect(context.destination);
  return {stop};
 }catch(e){stop();throw e;}
}
