import test from 'node:test';
import assert from 'node:assert/strict';
import {configure,generate} from '../server/provider.mjs';

test('dialogue request grounds both speakers and preserves the player’s original words',async()=>{
 const realFetch=globalThis.fetch,requests=[];
 configure(async()=>({baseUrl:'https://qa.invalid',apiKey:'fixture',model:'fixture'}));
 globalThis.fetch=async(_url,options)=>{
  requests.push(JSON.parse(options.body));
  return Response.json({choices:[{message:{content:JSON.stringify({factIds:[],speech:'请继续。'})}}]});
 };
 try{
  for(const [name,playerName,message]of [
   ['雾岛律','白川澄','往你房间去了'],
   ['黑泽绫','神谷朔','我回房了'],
   ['森川介','黑泽修','她说：“他拿走了我的书。”']
  ]){
   await generate({name,playerName,message,facts:[]});
   const [system,user]=requests.at(-1).messages;
   assert.ok(system.content.includes(`你是${name}，对面玩家是${playerName}`));
   assert.ok(system.content.includes('你应反问“往我房间去了？”'));
   assert.ok(system.content.includes('他拿走了你的书？'));
   assert.ok(system.content.includes('引语保留原说话人的视角'));
   assert.equal(JSON.parse(user.content).message,message);
  }
  await generate({kind:'player-review',message:'我回房了'});
  assert.ok(!requests.at(-1).messages[0].content.includes('本轮说话者：'));
 }finally{globalThis.fetch=realFetch;}
});
