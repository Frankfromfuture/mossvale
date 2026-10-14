// Extract only the first, top-level speech string. Never expose thought or JSON scaffolding.
export function speechPrefix(raw){
 const start=/^\s*(?:```json\s*)?\{\s*"speech"\s*:\s*"/.exec(raw);
 if(!start)return '';
 let encoded='';
 for(let i=start[0].length;i<raw.length;i++){
  const ch=raw[i];if(ch==='"')break;
  if(ch==='\\'){
   if(i+1>=raw.length)break;
   const escape=raw[++i];
   if(escape==='u'){
    if(i+4>=raw.length)break;
    const hex=raw.slice(i+1,i+5);if(!/^[a-f\d]{4}$/i.test(hex))throw Error('invalid-output');
    encoded+='\\u'+hex;i+=4;
   }else{if(!'"\\/bfnrt'.includes(escape))throw Error('invalid-output');encoded+='\\'+escape;}
  }else{if(ch<' ')throw Error('invalid-output');encoded+=ch;}
 }
 // A split surrogate pair is withheld until its second half arrives.
 return JSON.parse('"'+encoded+'"').replace(/[\uD800-\uDBFF]$/,'');
}

export async function readSpeechStream(response,onSpeech,{maxSpeechLength=90}={}){
 if(!response.body)throw Error('invalid-output');
 const reader=response.body.getReader(),decoder=new TextDecoder();
 let pending='',raw='',last='',done=false,finish=null,usage;
 try{
  while(!done){
   const chunk=await reader.read();if(chunk.done)break;
   pending+=decoder.decode(chunk.value,{stream:true});
   if(pending.length>131072)throw Error('invalid-output');
   let end;
   while((end=pending.indexOf('\n'))>=0){
    const line=pending.slice(0,end).replace(/\r$/,'');pending=pending.slice(end+1);
    if(!line.startsWith('data:'))continue;
    const data=line.slice(5).trim();if(!data)continue;
    if(data==='[DONE]'){done=true;break;}
    const event=JSON.parse(data);if(event.error)throw Error('invalid-output');
    if(event.usage)usage=event.usage;
    const choice=event.choices?.find(c=>(c.index??0)===0);if(!choice)continue;
    if(choice.finish_reason)finish=choice.finish_reason;
    if(typeof choice.delta?.content==='string'){
     raw+=choice.delta.content;if(raw.length>16384)throw Error('invalid-output');
     const speech=speechPrefix(raw);if(speech.length>maxSpeechLength)throw Error('invalid-output');
     if(speech&&speech!==last){last=speech;onSpeech(speech);}
    }
   }
  }
  if(!done||finish!=='stop')throw Error('invalid-output');
  return {choices:[{message:{content:raw}}],usage};
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}

// Drafts are transport-only: never part of world saves, memory retrieval or heard.
const drafts=new WeakMap();
export function setSpeechFrame(w,frame,valid=()=>true){
 let frames=drafts.get(w);if(!frames){frames=new Map();drafts.set(w,frames);}
 frames.set(frame.id,{frame,valid,expires:Date.now()+30000});
 while(frames.size>32)frames.delete(frames.keys().next().value);
}
export function clearSpeechFrame(w,id){drafts.get(w)?.delete(id);}
export function speechFrames(w){
 const frames=drafts.get(w);if(!frames)return [];
 for(const [id,v] of frames)if(v.expires<Date.now()||!v.valid())frames.delete(id);
 return [...frames.values()].map(v=>v.frame);
}
