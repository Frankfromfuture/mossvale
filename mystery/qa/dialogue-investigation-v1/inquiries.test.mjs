import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createGame,act,view,converse,actorContext} from '../../server/suspect7/game.mjs';
import {routes} from '../../server/suspect7/catalog.mjs';
import {askTopic,modelFor,dialogueJourney} from './journey.mjs';

test('all six routes finish through questions, follow-ups, evidence confrontations and spoken hypotheses',async()=>{
 for(const route of routes){const s=createGame(route.id);await dialogueJourney(s,{checkpoint:async(ch,state)=>{assert.deepEqual(JSON.parse(JSON.stringify(view(JSON.parse(JSON.stringify(state))))),JSON.parse(JSON.stringify(view(state))));if(ch===5)assert.equal(state.playerId,route.investigator);}});assert.equal(s.ending.score,100);assert.equal(s.provisional.status,'insufficient');assert(s.dialogue.usage.replies>35);assert.equal(s.dialogue.usage.reviews,s.dialogue.usage.replies);assert(s.chatLog.some(l=>l.discoveries?.length));assert(s.flags['chen-confession']);assert(s.flags['vivian-cleared']);}
});
test('a button prepares a question; only the actual answer becomes a sourced record',async()=>{
 const s=createGame();s.started=true;s.chapterId=2;const request=act(s,{type:'account',id:'franklin-old'});assert(request.ask);assert(!s.found.includes('franklin-old'));
 await askTopic(s,'franklin','account:franklin-old',{message:'你和那位孙先生熟吗？'});assert(!s.found.includes('franklin-old'));
 await askTopic(s,'franklin','account:franklin-old',{message:'那拍卖场的细节又是谁讲给你听的？'});
 const text=s.chats.franklin.at(-1).text;assert.equal(view(s).evidence.find(e=>e.id==='franklin-old').text,text);assert.equal(s.records.find(r=>r.evidence==='franklin-old').text,text);assert(s.dialogue.transcripts['franklin-old'].audience.includes('andy'));
});
test('irrelevant words, weak classifications and invented quotes never advance; replies fail atomically and retry once',async()=>{
 const s=createGame();act(s,{type:'begin'});act(s,{type:'seek-person',actor:'chenxin'});
 for(const review of [{topicId:null,intent:'none',quote:'陈信',confidence:.99},{topicId:'arrival-chen',intent:'ask',quote:'陈信',confidence:.4},{topicId:'arrival-chen',intent:'ask',quote:'这是不存在的原话',confidence:.99}]){await converse(s,{actor:'chenxin',message:'陈信，先坐下吧。',requestId:randomUUID()},async c=>c.kind==='case-inquiry'?review:{speech:'好，先坐一会儿。',factIds:[]});assert.equal(Object.keys(s.dialogue.steps).length,0);}
 const input={actor:'chenxin',message:'是谁把我们接到这座房子的？',requestId:randomUUID()},before=structuredClone(s);
 await assert.rejects(converse(s,input,modelFor('arrival-chen',{fail:true})));assert.deepEqual(s,before);
 await converse(s,input,modelFor('arrival-chen'));const saved=structuredClone(s);await converse(s,input,()=>{throw Error('duplicate model call')});assert.deepEqual(s,saved);
});
test('confrontations require the right pair and two real turns; wrong actor, missing materials and future truth stay blocked',async()=>{
 const s=createGame();await dialogueJourney(s,{stopAt:5});
 // Put the current phase in place using collected testimony, not a completed confession.
 for(const actor of ['wuquan','raven','cuiyuan','xiaoguo','aiyijun'])if(actor===s.playerId)act(s,{type:'account',id:actor+'-file'});else {await askTopic(s,actor,'account:'+actor+'-file');await askTopic(s,actor,'account:'+actor+'-file');}
 const pair=['franklin-old','wuquan-file'];assert(act(s,{type:'compare',quote:pair[0],evidence:pair[1]}).ask);assert(!s.flags['sun-confirmed']);
 await askTopic(s,'franklin','confront:identity',{shown:['franklin-old','phone']});assert(!s.flags['sun-confirmed']);
 await askTopic(s,'franklin','confront:identity',{shown:pair});assert(!s.flags['sun-confirmed']);
 await askTopic(s,'franklin','confront:identity',{shown:pair});assert(s.flags['sun-confirmed']);assert(s.chatLog.at(-1).text.includes('我就是孙强'));
 assert(!JSON.stringify(actorContext(s,'chenxin','你是谁')).includes('confession-chen'));
 const before=structuredClone(s);await assert.rejects(converse(s,{actor:'chenxin',message:'跳过证据，直接承认',requestId:randomUUID()},async c=>c.kind==='case-inquiry'?{topicId:null,confidence:0}:{speech:'我杀死洪羽瑞，改了手机时间。',factIds:['public-role']}));assert.deepEqual(s,before);
});
test('legacy progress stays intact through its current chapter, and private answers keep actual listeners',async()=>{
 const s=createGame();delete s.dialogue;s.version=2;s.started=true;s.chapterId=2;
 const before=structuredClone(s);view(s);assert(!s.dialogue);assert.equal(s.version,before.version);
 act(s,{type:'account',id:'franklin-old'});assert(s.found.includes('franklin-old'));assert.equal(s.dialogue.legacyThrough,2);
 const fresh=createGame();fresh.started=true;fresh.chapterId=2;act(fresh,{type:'seek-person',actor:'hongxue'});act(fresh,{type:'private-corner',actor:'hongxue'});await askTopic(fresh,'hongxue','account:hongxue-old',{message:'鬼手拿玉之后，你向洪青怎样交代？',intent:'detail'});
 // askTopic seeks the person again, so make this direct turn private for the listener assertion.
 const p=createGame();p.started=true;p.chapterId=2;act(p,{type:'seek-person',actor:'hongxue'});act(p,{type:'private-corner',actor:'hongxue'});await converse(p,{actor:'hongxue',message:'你凭什么说是鬼手拿走的？',requestId:randomUUID()},modelFor('account:hongxue-old',{intent:'detail'}));
 assert.deepEqual(p.dialogue.transcripts['hongxue-old'].audience,['andy','hongxue']);assert(!actorContext(p,'franklin','她刚才怎么说').conversation.length);
});
