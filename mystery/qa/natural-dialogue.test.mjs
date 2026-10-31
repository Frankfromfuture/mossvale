import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,converse} from '../server/game.mjs';

const clean={answer:'resolved',confidence:.99,disclosures:[],explained:[],contradiction:null,mistreatment:null,inquiry:null};
const fixture=()=>{const s=createGame();s.started=true;s.investigation.rng=12345;return s;};

test('a planned question joins one streamed reply; follow-up never appends internal directions',async()=>{
 const s=fixture(),contexts=[],chunks=[];
 const generate=async(ctx,options)=>{
  if(ctx.kind==='player-review')return {...clean,answer:ctx.challenge?'evasive':'resolved',basis:ctx.challenge?ctx.message:undefined};
  contexts.push(ctx);
  const reply={factIds:[],speech:ctx.challenge.outcome==='ask'?'我记得的都说了。你散场后又去了哪里？':'歇一会儿也好。不过，散场后的去向你还没说。'};
  options?.onPartial?.(reply);return reply;
 };
 const first=await converse(s,{actor:'jiang',message:'昨夜发生了什么？',requestId:'natural-question-001'},generate,{onSpeech:speech=>chunks.push(speech)});
 assert.equal(contexts[0].challenge.outcome,'ask');assert.ok(s.investigation.challenge.embedded);
 assert.equal(s.chats.jiang.filter(line=>line.who==='jiang').length,1);
 assert.equal(s.heard.jiang.filter(line=>line.text===first.speech).length,1);
 assert.ok(s.chats.jiang.some(line=>line.who==='narrator'&&line.challenge));
 assert.equal(chunks.at(-1),first.speech);
 const q=s.investigation.challenge;
 const second=await converse(s,{actor:'jiang',message:'先歇一会儿吧。',requestId:'natural-question-002',challengeId:q.id},generate);
 assert.equal(contexts[1].challenge.outcome,'follow-up');assert.equal(q.round,1);
 assert.equal(second.speech,'歇一会儿也好。不过，散场后的去向你还没说。');
 assert.ok(!second.speech.includes(q.focus));
 const third=await converse(s,{actor:'jiang',message:'散场后我回房了，后来的事记不清。',requestId:'natural-question-003',challengeId:q.id},async ctx=>ctx.kind==='player-review'?clean:{factIds:[],speech:'好，记不清的就先放一放。'});
 assert.equal(s.investigation.challenge,null);assert.equal(third.speech,'好，记不清的就先放一放。');
});

test('a failed planned reply leaves question draw, points and history untouched; retry commits once',async()=>{
 const s=fixture(),input={actor:'jiang',message:'昨夜发生了什么？',requestId:'natural-retry-001'},before=JSON.stringify(s),contexts=[];
 await assert.rejects(converse(s,input,async ctx=>{
  if(ctx.kind==='player-review')return clean;contexts.push(ctx);throw Error('offline');
 }),/offline/);
 assert.equal(JSON.stringify(s),before);
 const reply=await converse(s,input,async ctx=>{
  if(ctx.kind==='player-review')return clean;contexts.push(ctx);return {factIds:[],speech:'我记得的都说了。你散场后又去了哪里？'};
 });
 assert.deepEqual(contexts[0],contexts[1]);assert.ok(s.investigation.challenge);
 assert.equal(s.usage.calls,2);const after=JSON.stringify(s);
 const cached=await converse(s,input,()=>{throw Error('must not call');});
 assert.ok(cached.cached);assert.equal(cached.speech,reply.speech);assert.equal(JSON.stringify(s),after);
});
