import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,dialogueContext,validateReply} from '../server/game.mjs';
import {reviewContext,recordStatement} from '../server/investigation.mjs';
import {rememberNpcReply} from '../server/npc-memory.mjs';
import {configure,generate} from '../server/provider.mjs';

test('actor recalls quotes without memory citation IDs; judge keeps original statement references',async t=>{
 const s=createGame();s.started=true;
 const question='昨夜是谁去检查蜡烛？',speech='昨夜我想去检查蜡烛，宫司让我休息，由他去。';
 recordStatement(s,question,['jiang']);rememberNpcReply(s,{key:'memory-reference-case',actor:'jiang',question,speech,audience:['player','jiang'],factIds:['night']});
 const actor=dialogueContext(s,'jiang','最后去检查蜡烛的是你，还是宫司？'),before=structuredClone(actor),requests=[];
 assert.ok(actor.recollections.some(x=>x.id&&x.quote===speech));
 configure(async()=>({apiKey:'test-only',baseUrl:'https://api.deepseek.com',model:'deepseek-v4-flash'}));
 t.mock.method(globalThis,'fetch',async(url,options)=>{requests.push(JSON.parse(JSON.parse(options.body).messages[1].content));return new Response(JSON.stringify({choices:[{message:{content:'{"factIds":["night"],"speech":"是宫司去的。"}'}}]}));});
 const reply=await generate(actor);validateReply(actor,reply);assert.deepEqual(actor,before);
 assert.deepEqual(requests[0].facts,actor.facts);assert.ok(requests[0].recollections.every(x=>!('id'in x)));assert.ok(requests[0].recollections.some(x=>x.quote===speech));
 assert.throws(()=>validateReply(actor,{speech:'是宫司去的。',factIds:['memory-1']}));
 const judge={...reviewContext(s,'jiang',question),actor:'jiang'};await generate(judge);assert.deepEqual(requests[1].previous,judge.previous);assert.ok(requests[1].previous.some(x=>x.id));
});
