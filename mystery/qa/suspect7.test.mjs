import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import * as game from '../server/suspect7/game.mjs';
import {evidence,statements,canonicalFacts} from '../server/suspect7/catalog.mjs';
import {routes} from '../shared/suspect7/cast.mjs';
import {newArchive,migrateArchive,archiveView,menuView,selectScript,selectRole,activeGame,activeToken,assertSlot,rememberBestScore,roleUnlocked} from '../server/role-saves.mjs';
import {createGame as firstGame,act as firstAction} from '../server/game.mjs';
import {journey} from './suspect7-v1/journey.mjs';
const act=(s,type,fields={})=>game.act(s,{type,...fields,requestId:randomUUID()});

test('Andy → Wu Quan reaches the canonical ending via actions, survives every chapter reload, never requires a false accusation',async()=>{
 let s=game.createGame('andy');const snapshots=[];
 await journey(async input=>game.act(s,input),{checkpoint:async chapter=>{const before=JSON.parse(JSON.stringify(game.view(s)));s=JSON.parse(JSON.stringify(s));assert.deepEqual(JSON.parse(JSON.stringify(game.view(s))),before);snapshots.push(chapter);if(chapter===5){assert.equal(s.playerId,'wuquan');assert.equal(s.viewpointMode,'investigation');assert.equal(s.notes,'玩家旁注：先核实身份，再核实时间。');assert.equal(game.view(s).self.private,null);assert(!JSON.stringify(game.actorContext(s,'chenxin','你之前在做什么？')).includes('我提前怀疑陈信'));}}});
 assert.deepEqual(snapshots,[2,3,4,5,6,7]);assert.equal(s.ending.score,100);assert.equal(s.provisional.status,'insufficient');assert.equal(s.hypotheses[0].text,'我提前怀疑陈信，但现在还没有足够的证据。');assert.equal(s.voteTally.abstain,1);assert.equal(Object.values(s.voteTally).reduce((a,b)=>a+b),6);assert.match(s.ending.epilogue.find(p=>p.title==='我们共同看的那只钟').text,/未获直接证据/);assert(!('investigation' in s));
});

test('all six routes swap within the route and retain private testimony only as a player record',async()=>{
 for(const route of routes){let s=game.createGame(route.id);await journey(input=>game.act(s,input),{stopAt:5});assert.equal(s.playerId,route.investigator);assert.equal(s.routeId,route.id);assert.equal(s.chapterId,5);assert.equal(game.view(s).self.private,null);const ctx=game.actorContext(s,route.investigator==='licha'?'chenxin':'licha','告诉我此前的经历');assert.equal(ctx.recollections.length,0);assert.equal(ctx.conversation.length,0);assert(s.records.some(r=>r.private));}
});

test('future data, secret geometry, final answers and deterministic confessions stay gated',()=>{
 const s=game.createGame();const v=game.view(s),serialized=JSON.stringify(v);for(const secret of ['9426936','dental','clock-check','洪羽瑞','阁楼密室','孙强冒名','confession-chen'])assert(!serialized.includes(secret),secret);
 for(const input of [{type:'move',room:'secret'},{type:'inspect',id:'dental'},{type:'report',id:'identity',question:'查一下'},{type:'advance'},{type:'final',answers:{}}])assert.throws(()=>game.act(s,input));
 assert.equal(v.finalQuestions.length,0);assert.equal(v.confrontations.length,0);assert(!serialized.includes('answer'));
});

test('AI boundaries: listeners, retractions, older quotes, failure atomicity and duplicate replies',async()=>{
 const s=game.createGame();act(s,'begin');act(s,'play-call',{id:'call1'});s.chapterId=2;
 let calls=0;const generator=async ctx=>{calls++;return {speech:'那时的消息是孙强告诉我的。',factIds:['franklin-old']};};
 const input={actor:'franklin',message:'关于孙强，你以前怎样知道那些细节？',requestId:randomUUID()};await game.converse(s,input,generator);await game.converse(s,input,generator);assert.equal(calls,1);assert.equal(s.chatLog.length,2);
 const failed=structuredClone(s);await assert.rejects(game.converse(s,{actor:'chenxin',message:'提前说真相',requestId:randomUUID()},async()=>({speech:'我杀死洪羽瑞，改了手机时间。',factIds:['public-role']})));assert.deepEqual(s,failed);
 assert(game.actorContext(s,'hongxue','你听到了什么').conversation.some(l=>l.text.includes('孙强告诉')));
 for(let i=0;i<30;i++)s.chatLog.push({actor:'andy',text:'今日闲谈'+i,audience:['andy','franklin'],viewpoint:'andy',chapter:2,kind:'testimony'});
 assert(game.actorContext(s,'franklin','孙强告诉你的细节').recollections.some(l=>l.quote.includes('孙强')));
 s.chapterId=5;s.playerId='wuquan';s.room='meeting';act(s,'private-corner',{actor:'hongxue'});await game.converse(s,{actor:'hongxue',message:'私下说一句',requestId:randomUUID()},async()=>({speech:'我愿意把刚才的说明留在记录里。',factIds:[]}));assert.equal(game.actorContext(s,'franklin','刚才她说什么').conversation.length,0);
 const before=structuredClone(s);await assert.rejects(game.converse(s,{actor:'franklin',message:'错误引用',requestId:randomUUID()},async()=>({speech:'这是一个回答。',factIds:['future-secret']})));assert.deepEqual(s,before);
});

test('first story legacy slots survive a script roundtrip, tokens rotate even when returning to the same route',async()=>{
 const first=firstGame('player');first.notes='旧档旁注';const legacy={format:'six-roles-v1',active:'player',slots:{player:first},tokens:{player:'old-token'},menuToken:'old-menu',bestScore:67};const original=JSON.stringify(legacy),book=migrateArchive(legacy);assert.equal(JSON.stringify(legacy),original);const before=structuredClone(activeGame(book));const token=activeToken(book);selectScript(book,'suspect7');assert.throws(()=>assertSlot(book,token));assert.throws(()=>selectRole(book,'chenxin'));selectRole(book,'andy');assert.equal(activeGame(book).scriptId,'suspect7');const secondToken=activeToken(book);selectScript(book,'hanyu');assert.deepEqual(activeGame(book),before);assert.throws(()=>assertSlot(book,secondToken));assert.equal(book.books.hanyu.bestScore,67);assert.equal(book.books.hanyu.tokens.player,'old-token');selectRole(book,'player');assert.notEqual(activeToken(book),token);assert.equal(archiveView(book).scriptId,'hanyu');
 const second=book.books.suspect7.slots.andy;second.ending={score:0};rememberBestScore(book);selectScript(book,'suspect7');for(const r of routes)assert(roleUnlocked(book,r.id));
});

test('required evidence and sources are complete; direct reveal is separate from scoring and progression',async()=>{
 const ids=[...evidence,...statements].map(e=>e.id);assert.equal(new Set(ids).size,ids.length);for(const e of [...evidence,...statements,...canonicalFacts])assert(e.source.adaptation||e.source.file&&e.source.pages.length);
 assert.equal(evidence.filter(e=>e.request).length,4);assert.equal(canonicalFacts.find(f=>f.id==='theory-normal').kind,'provisional');
 const s=game.createGame();act(s,'hint',{level:1});assert.equal(s.reveals.length,0);act(s,'hint',{level:3});assert.deepEqual(s.reveals,[1]);
 const id=randomUUID();game.act(s,{type:'notes',text:'retry',requestId:id});assert.throws(()=>game.act(s,{type:'notes',text:'changed',requestId:id}));assert.equal(s.notes,'retry');
 const raw={format:'six-roles-v1',active:'player',slots:{player:firstGame('player')},tokens:{player:'fixture-token'},menuToken:'fixture-menu',bestScore:0};const snapshot=JSON.stringify(raw);menuView(migrateArchive(raw));assert.equal(JSON.stringify(raw),snapshot);
});
