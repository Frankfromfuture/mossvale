// Incremental SSE decoding shared by the provider and browser client.
export async function* readEvents(response){
 if(!response.body)throw new Error('回复连接未能建立，请重试。');
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',event='message',data=[];
 try{
  while(true){
   const {value,done}=await reader.read();buffer+=done?decoder.decode():decoder.decode(value,{stream:true});
   if(buffer.length>1000000)throw new Error('回复内容过长，请重试。');
   let index;
   while((index=buffer.indexOf('\n'))>=0){
    const line=buffer.slice(0,index).replace(/\r$/,'');buffer=buffer.slice(index+1);
    if(!line){if(data.length)yield {event,data:data.join('\n')};event='message';data=[];}
    else if(line.startsWith('event:'))event=line.slice(6).trim();
    else if(line.startsWith('data:'))data.push(line.slice(5).replace(/^ /,''));
   }
   if(done)break;
  }
 }finally{try{await reader.cancel();}catch{}reader.releaseLock();}
}
