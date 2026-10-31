import {createReadStream} from 'node:fs';

// Support seeking and looping without downloading the soundtrack again.
export function sendAudioFile(req,res,file,size){
 let start=0,end=size-1,status=200;
 const headers={'Content-Type':file.endsWith('.mp3')?'audio/mpeg':'audio/mp4','Accept-Ranges':'bytes','Cache-Control':'no-cache'};
 if(req.headers.range){
  const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if(match&&(match[1]||match[2])){
   if(match[1]){start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),end);}
   else{const suffix=Number(match[2]);start=Math.max(0,size-suffix);if(!suffix)start=size;}
  }else start=size;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start){res.writeHead(416,{...headers,'Content-Range':`bytes */${size}`,'Content-Length':0});res.end();return;}
  status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;
 }
 headers['Content-Length']=end-start+1;res.writeHead(status,headers);
 if(req.method==='HEAD'){res.end();return;}
 const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.once('close',()=>stream.destroy());stream.pipe(res);
}
