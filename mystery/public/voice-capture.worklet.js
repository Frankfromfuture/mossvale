class VoiceCapture extends AudioWorkletProcessor {
 constructor(){super();this.sum=0;this.count=0;this.phase=0;this.buffer=new Int16Array(1600);this.index=0;}
 process(inputs){
  const channels=inputs[0];if(!channels?.length)return true;
  for(let i=0;i<channels[0].length;i++){
   let value=0;for(const ch of channels)value+=ch[i]/channels.length;
   this.sum+=value;this.count++;this.phase+=16000;
   if(this.phase>=sampleRate){
    this.phase-=sampleRate;const x=Math.max(-1,Math.min(1,this.sum/this.count));this.sum=0;this.count=0;
    this.buffer[this.index++]=Math.round(x*(x<0?32768:32767));
    if(this.index===1600){this.port.postMessage(this.buffer.buffer,[this.buffer.buffer]);this.buffer=new Int16Array(1600);this.index=0;}
   }
  }
  return true;
 }
}
registerProcessor('qwen-voice-capture',VoiceCapture);
