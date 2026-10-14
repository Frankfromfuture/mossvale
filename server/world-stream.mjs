// One latest snapshot per connection; slow readers never accumulate a history.
export function createWorldStream({snapshot,touch}){
 const towns=new Map(),scheduled=new Map(),queued=new Set();
 function attach(id,w,res){
  res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'});
  res.flushHeaders();
  let clients=towns.get(id);if(!clients){clients=new Set();towns.set(id,clients);}
  const client={res,blocked:false,pending:new Map()};clients.add(client);
  const flush=()=>{for(const [kind,frame] of client.pending){if(client.blocked||res.destroyed)return;client.pending.delete(kind);client.blocked=!res.write(frame);}};
  client.send=(frame,kind='world')=>{client.pending.set(kind,frame);flush();};
  res.on('drain',()=>{client.blocked=false;flush();});
  const heartbeat=setInterval(()=>{if(res.destroyed)return;touch(id);if(!client.blocked)client.blocked=!res.write(': heartbeat\n\n');},15000);heartbeat.unref();
  res.once('close',()=>{clearInterval(heartbeat);clients.delete(client);if(!clients.size)towns.delete(id);});
  client.send('event: world\ndata: '+JSON.stringify(snapshot(w))+'\n\n');
 }
 function publish(id,w){
  if(!towns.has(id))return;scheduled.set(id,w);
  // Multiple decisions completing in the same turn share one fresh snapshot.
  if(queued.has(id))return;queued.add(id);
  queueMicrotask(()=>{
   const latest=scheduled.get(id);scheduled.delete(id);queued.delete(id);
   const clients=towns.get(id);if(!clients?.size)return;
   const frame='event: world\ndata: '+JSON.stringify(snapshot(latest))+'\n\n';
   for(const client of clients)client.send(frame);
  });
 }
 function close(id){for(const c of towns.get(id)||[])c.res.end();towns.delete(id);}
 function publishSpeech(id,payload){const frame='event: speech\ndata: '+JSON.stringify(payload)+'\n\n';for(const client of towns.get(id)||[])client.send(frame,'speech');}
 return {attach,publish,publishSpeech,close};
}
