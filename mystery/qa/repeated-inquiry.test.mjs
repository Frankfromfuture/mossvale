import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,converse} from '../server/game.mjs';

const clean={answer:'resolved',confidence:.99,disclosures:[],explained:[],contradiction:null,mistreatment:null};
const fixture=()=>{const s=createGame();s.started=true;s.investigation.cooldown=1000000;return s;};
const judge=async ctx=>ctx.kind==='player-review'?{...clean,inquiry:ctx.challenge?null:{quote:ctx.message,previousId:ctx.inquiries.find(q=>/昨夜|昨晚|昨天晚上/.test(q.quote)&&/昨夜|昨晚|昨天晚上/.test(ctx.message))?.id||null}}:{speech:ctx.repeatedInquiry?'（不悦）你还在问这件事，究竟哪里没弄清？':'我记得当时就在厅堂。',factIds:[]};
let seq=0;
const ask=(s,message,actor='jiang',generate=judge,requestId=`inquiry-test-${++seq}`)=>converse(s,{actor,message,requestId,challengeId:s.investigation.challenge?.id},generate);
const repeats=s=>s.investigation.penalties.filter(p=>p.key.endsWith('-repeat-inquiry'));

test('third equivalent inquiry costs one point, angers its NPC and asks back exactly once',async()=>{
 const s=fixture();
 await ask(s,'你昨晚去了哪里？');await ask(s,'昨夜你在什么地方？');
 assert.equal(repeats(s).length,0);assert.equal(s.investigation.challenge,null);
 const third=await ask(s,'昨天晚上，你人在哪里？');
 assert.match(third.speech,/不悦/);assert.equal(repeats(s).length,1);assert.equal(repeats(s)[0].points,1);
 assert.equal(s.investigation.challenge.actor,'jiang');assert.equal(s.investigation.challenge.source,'repeated-inquiry');
 assert.match(s.investigation.challenge.transition,/生气/);
 await ask(s,'我想把大家的行踪核对清楚。');
 assert.equal(s.investigation.challenge,null);assert.equal(s.investigation.inquiries[0].count,3);
 const loaded=JSON.parse(JSON.stringify(s));await ask(loaded,'你昨晚去了哪里？');
 assert.equal(repeats(loaded).length,2);assert.equal(loaded.investigation.inquiries[0].count,4);assert.equal(loaded.investigation.challenge,null);
 assert.equal(loaded.chats.jiang.filter(x=>x.who==='narrator'&&/显然生气/.test(x.text)).length,1);
});

test('other people, new questions, new evidence and non-questions stay separate',async()=>{
 const s=fixture();await ask(s,'你昨晚去了哪里？');await ask(s,'昨夜你在什么地方？');
 await ask(s,'你昨晚去了哪里？','kato');await ask(s,'你是做什么工作的？');
 assert.equal(repeats(s).length,0);assert.deepEqual(s.investigation.inquiries.map(q=>q.count),[2,1,1]);
 s.found.push('body');await ask(s,'你昨晚去了哪里？');assert.equal(s.investigation.inquiries.at(-1).count,1);
 const count=s.investigation.inquiries.length;
 for(let i=0;i<3;i++)await ask(s,'我不知道是谁。','jiang',async ctx=>ctx.kind==='player-review'?{...clean,inquiry:null}:{speech:'好。',factIds:[]});
 assert.equal(s.investigation.inquiries.length,count);assert.equal(repeats(s).length,0);
 // The model cannot select a different NPC's inquiry as a repeat source.
 const other=s.investigation.inquiries.find(q=>q.actor==='kato');
 await ask(s,'你听说过那件事吗？','jiang',async ctx=>ctx.kind==='player-review'?{...clean,inquiry:{quote:ctx.message,previousId:other.id}}:{speech:'好。',factIds:[]});
 assert.equal(s.investigation.inquiries.at(-1).count,1);assert.equal(repeats(s).length,0);
});

test('failed reply, same-request retry and reload cannot inflate counts or double-charge',async()=>{
 const s=fixture();const exact=async ctx=>ctx.kind==='player-review'?clean:{speech:'我记得当时就在厅堂。',factIds:[]};
 await ask(s,'你昨晚去了哪里？','jiang',exact);const before=JSON.stringify(s);
 await assert.rejects(ask(s,'你昨晚去了哪里？','jiang',async ctx=>ctx.kind==='player-review'?clean:Promise.reject(Error('offline'))),/offline/);
 assert.equal(JSON.stringify(s),before);
 await ask(s,'你昨晚去了哪里？','jiang',exact,'repeat-request-002');const accepted=JSON.stringify(s);
 assert.equal((await ask(s,'你昨晚去了哪里？','jiang',()=>{throw Error('unexpected model call');},'repeat-request-002')).cached,true);assert.equal(JSON.stringify(s),accepted);
 const loaded=JSON.parse(accepted);const input={actor:'jiang',message:'你昨晚去了哪里？',requestId:'repeat-request-003'};
 await converse(loaded,input,exact);assert.equal(repeats(loaded).length,1);const committed=JSON.stringify(loaded);
 assert.equal((await converse(loaded,input,()=>{throw Error('unexpected model call');})).cached,true);assert.equal(JSON.stringify(loaded),committed);
});
