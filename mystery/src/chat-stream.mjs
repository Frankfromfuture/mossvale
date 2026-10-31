import {readEvents} from '../shared/event-stream.mjs';
export async function streamChat(input,onSpeech,{fetcher=fetch}={}){
 const response=await fetcher('api/chat',{method:'POST',headers:{'Content-Type':'application/json',Accept:'text/event-stream'},body:JSON.stringify(input),signal:AbortSignal.timeout(90000)});
 if(!response.ok){const body=await response.json();throw new Error(body.error||'暂时没有回应，输入已保留。');}
 if(!response.headers.get('content-type')?.includes('text/event-stream'))return response.json();
 for await(const item of readEvents(response)){
  const data=JSON.parse(item.data);
  if(item.event==='speech'&&typeof data.speech==='string')onSpeech(data.speech);
  else if(item.event==='done'){if(!data.state||typeof data.speech!=='string')throw new Error('回复还没说完，请重试。');return data;}
  else if(item.event==='error')throw new Error(data.error||'回复中断，输入已保留，可以重试。');
 }
 throw new Error('回复连接中断，输入已保留，可以重试。');
}
