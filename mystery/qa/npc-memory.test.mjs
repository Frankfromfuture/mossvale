import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,converse,dialogueContext,view,act} from '../server/game.mjs';
import {recordStatement,reviewContext} from '../server/investigation.mjs';
import {commitAmbient} from '../server/ambient.mjs';
import {ensureNpcMemory,rememberNpcReply,npcMemoryContext} from '../server/npc-memory.mjs';

const clean={answer:'resolved',confidence:.99,disclosures:[],explained:[],contradiction:null,mistreatment:null,inquiry:null};
const fixture=()=>{const s=createGame();s.started=true;s.investigation.cooldown=10000;return s;};
const reply=speech=>async ctx=>ctx.kind==='player-review'?clean:{speech,factIds:[]};

test('old questions, NPC answers and promises return after many turns and a persisted reload',async()=>{
 const s=fixture(),question='你愿意替我保管这本手记吗？',promise='我会替你保管这本手记，等你回来再交还。';
 await converse(s,{actor:'jiang',message:question,requestId:'memory-promise-001'},reply(promise));
 for(let i=0;i<6;i++)await converse(s,{actor:'jiang',message:`先坐一会儿吧，第${i}次闲聊。`,requestId:`memory-padding-00${i}`},reply('茶还温着，慢慢喝。'));
 for(let i=0;i<40;i++)recordStatement(s,`我在这里等一等，这是第${i}句话。`,['jiang']);
 const saved=JSON.parse(JSON.stringify(s)),ctx=dialogueContext(saved,'jiang','你之前答应保管的那本手记，还记得吗？');
 assert.ok(!ctx.conversation.some(x=>x.text===promise));
 assert.ok(ctx.recollections.some(x=>x.quote===promise&&x.question===question&&x.commitment));
 assert.ok(ctx.playerStatements.some(x=>x.text===question));
 assert.ok(reviewContext(saved,'jiang',ctx.message).previous.some(x=>x.text===question));
 assert.equal(saved.investigation.npcMemory.episodes.filter(x=>x.key==='memory-promise-001').length,1);
 assert.ok(!ctx.facts.some(x=>x.text.includes('保管这本手记')));
 assert.equal(view(saved).investigation.npcMemory,undefined);
});

test('ambient chatter cannot evict a witnessed NPC account; absentees never receive private exchanges',async()=>{
 const s=fixture(),speech='昨夜宫司去检查蜡烛，让我先歇下。';
 await converse(s,{actor:'jiang',message:'昨夜是谁去检查蜡烛？',requestId:'memory-public-001'},reply(speech));
 for(let i=0;i<30;i++)assert.ok(commitAmbient(s,{id:`ambient-memory-${i}`,pair:['kato','emi'],scope:'public',lines:[{actor:'kato',action:'端杯',speech:'茶还温着。'},{actor:'emi',action:'点头',speech:'先坐一会儿。'}],usage:{calls:0,input:0,output:0}}));
 assert.ok(s.heard.kato.every(x=>x.kind==='ambient'));
 const witnessed=dialogueContext(s,'kato','森川介刚才怎么说检查蜡烛的事？');
 assert.ok(witnessed.heard.some(x=>x.text===speech));assert.ok(witnessed.recollections.some(x=>x.quote===speech));
 assert.ok(witnessed.heard.every(x=>x.kind!=='ambient'));assert.equal(witnessed.ambient.length,3);
 s.chatSetting={actor:'jiang'};
 await converse(s,{actor:'jiang',message:'这份手记里写着家族的往事，请替我保密。',requestId:'memory-private-001'},reply('这份手记我会替你保密。'));
 const stranger=JSON.stringify(dialogueContext(s,'kato','那份手记里写了什么家族往事？'));
 assert.ok(!stranger.includes('这份手记我会替你保密'));assert.ok(!stranger.includes('这份手记里写着家族'));
});

test('legacy backfill preserves recorded witnesses without attaching a private question to a public quote',async()=>{
 const s=fixture(),speech='我会等你回来，再接着谈。';s.chatSetting={actor:'jiang'};
 await converse(s,{actor:'jiang',message:'手记藏着我家族的秘密，请等我回来。',requestId:'memory-legacy-private'},reply(speech));
 act(s,{type:'gather'});
 await converse(s,{actor:'jiang',message:'先等我去拿茶杯。',requestId:'memory-legacy-public'},reply(speech));
 for(let i=0;i<6;i++)s.chats.jiang.push({who:'player',text:'歇一会儿吧。'},{who:'jiang',text:'茶还温着。'});
 delete s.investigation.npcMemory;const old=JSON.parse(JSON.stringify(s));
 const protectedFields=structuredClone({found:old.found,minutes:old.investigation.minutes,chats:old.chats,statements:old.investigation.statements,ending:old.ending});
 view(old);const size=old.investigation.npcMemory.episodes.length;view(old);assert.equal(old.investigation.npcMemory.episodes.length,size);
 assert.deepEqual({found:old.found,minutes:old.investigation.minutes,chats:old.chats,statements:old.investigation.statements,ending:old.ending},protectedFields);
 const observer=npcMemoryContext(old,'kato','你听见他答应等我回来了吗？',[]);
 assert.ok(observer.recollections.some(x=>x.quote===speech));assert.ok(observer.recollections.every(x=>!x.question.includes('家族')));
 const confidant=npcMemoryContext(old,'jiang','你答应保守手记里的秘密了吗？',[]);
 assert.ok(confidant.recollections.some(x=>x.question.includes('家族')));
 const another=createGame('emi');assert.equal(ensureNpcMemory(another).episodes.length,0);
});

test('failed and retried replies do not create memories; recall stays bounded and follows current fact gates',async()=>{
 const s=fixture(),input={actor:'jiang',message:'那本手记怎么办？',requestId:'memory-failure-001'},before=JSON.stringify(s);
 await assert.rejects(converse(s,input,async ctx=>ctx.kind==='player-review'?clean:{speech:'我就是池。',factIds:['pool']}));assert.equal(JSON.stringify(s),before);
 await converse(s,input,reply('手记先留在你身边。'));const count=s.investigation.npcMemory.episodes.length;
 await converse(s,input,()=>{throw Error('cached request must not generate');});assert.equal(s.investigation.npcMemory.episodes.length,count);
 for(let i=0;i<20;i++)rememberNpcReply(s,{key:`memory-budget-${i}`,actor:'miyazaki',question:'家人的手记在哪里？',speech:'我会保管家人的手记。'.repeat(45),audience:['jiang'],factIds:['family']});
 const own=npcMemoryContext(s,'miyazaki','答应保管家人手记的事呢？',[]);assert.equal(own.recollections.length,0);
 const observer=npcMemoryContext(s,'jiang','答应保管家人手记的事呢？',[]);assert.ok(observer.recollections.length<=6);assert.ok(observer.recollections.reduce((n,x)=>n+x.question.length+x.quote.length+1,0)<=4000);
});
