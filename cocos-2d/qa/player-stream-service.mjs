// Isolated manual acceptance entry: production routes, fixture saves, no player data.
import {mkdir,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {seed,record,applyInteraction} from '../../server/engine.mjs';
import {initializeLife,initializeGridResidents,layout} from '../../server/life.mjs';
import {initializeObjects} from '../../server/objects.mjs';
import {initializeEconomy} from '../../server/economy.mjs';
import {initializeNeighborhood} from '../../server/neighborhood.mjs';
import {installReflections} from '../../server/reflection.mjs';

const directory=path.resolve('cocos-2d/qa/player-stream-data');await mkdir(directory,{recursive:true});
process.env.MOSSVALE_DATA_DIR=directory;process.env.PORT='4323';process.env.MOSSVALE_STATIC_DIR=path.resolve('cocos-2d/build/web-mobile');
const w=seed();initializeLife(w,seed(),record);initializeObjects(w);initializeGridResidents(w,seed(),record);initializeEconomy(w);initializeNeighborhood(w);installReflections(w);
Object.assign(w,{paused:true,minute:1140,lastReal:Date.now()});
const cafe=layout.places.find(p=>p.id==='cafe');Object.assign(w.player,{x:cafe.x,z:cafe.z,route:[]});
w.economy.planner={day:0,mode:'rules'};
for(const [i,r] of w.residents.entries()){
 Object.assign(r,{busy:false,location:'cafe',action:'坐下休息'});
 Object.assign(r.life,{x:cafe.x+(r.id==='xu'?0:10+i),z:cafe.z,phase:'doing',route:[],speech:'今天想慢慢聊。',speechUntil:1139});
 r.reflection.lastDay=0;
}
const xu=w.residents.find(r=>r.id==='xu');
applyInteraction(w,xu,'chat','我喜欢雨后安静的小路。',{action:'talk',speech:'那可以慢慢走，挑人少的时候。',thought:'愿意聊聊散步。',mode:'rules',evidence:[]});
const token=randomBytes(24).toString('hex');await writeFile(path.join(directory,token+'.json'),JSON.stringify(w),{mode:0o600});
await writeFile('cocos-2d/qa/player-stream-fixture.json',JSON.stringify({token}),{mode:0o600});
const nativeFetch=globalThis.fetch,requests=[];let interrupted=0;
const longSpeech='雨后的路会让人想把步子放慢，先听听脚边的水声，再看看树叶上有没有还没落下来的雨珠。要起名字的话，我可能会选一个念起来很轻的名字，让人想到安静，也留一点自己想象的地方。你说的风铃小径就很好，像走过去时能听见一点细细的声音。等你有空，我们还可以再想几个，不急着现在就选定。';
globalThis.fetch=async(url,options)=>{
 const body=JSON.parse(options.body),ctx=JSON.parse(body.messages[1].content);
 assert.equal(body.stream,true);assert.equal(body.temperature,.8);assert.equal(body.max_tokens,420);
 assert.ok(ctx.resident.soul.personality&&ctx.resident.soul.routine&&ctx.places.length&&ctx.conversation.length>=2);
 assert.ok(body.messages[0].content.includes('一到三句'));assert.ok(!body.messages[0].content.includes('15至35'));
 const row={kind:ctx.kind,request:ctx.request,conversation:ctx.conversation.map(m=>({role:m.role,content:m.content})),contextKeys:Object.keys(ctx),fullSoul:true,budget:body.max_tokens,temperature:body.temperature};requests.push(row);
 await writeFile('cocos-2d/qa/player-stream-requests.json',JSON.stringify(requests,null,2)+'\n');
 if(!ctx.request.includes('断流测试'))return nativeFetch(url,options);
 const broken=interrupted++===0,raw=JSON.stringify({speech:longSpeech,thought:'保留自己的想法，不进入台词草稿。',action:'talk',evidence:[]});
 let offset=0,ended=false;
 return new Response(new ReadableStream({async pull(controller){
  await new Promise(r=>setTimeout(r,35));
  if(broken&&offset>=55){controller.close();return;}
  if(offset<raw.length){const content=raw.slice(offset,offset+=5);controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({choices:[{index:0,delta:{content}}]})+'\n\n'));}
  else if(!ended){ended=true;controller.enqueue(new TextEncoder().encode('data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'));}
  else controller.close();
 }}),{headers:{'Content-Type':'text/event-stream'}});
};
await import('../../server/main.mjs');
