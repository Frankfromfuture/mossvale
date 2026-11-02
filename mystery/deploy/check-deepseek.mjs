// Explicit paid checks run only against the isolated preflight container.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {newArchive,selectRole,activeGame,activeToken} from '../server/role-saves.mjs';
import {dialogueContext} from '../server/game.mjs';
import {recordStatement} from '../server/investigation.mjs';
import {rememberNpcReply} from '../server/npc-memory.mjs';
import {readEvents} from '../shared/event-stream.mjs';
assert.equal(process.env.PORT,'8797');assert.equal(process.env.MYSTERY_DATA_DIR,'/app-data');
const cases=[
 {id:'old-account',actor:'jiang',message:'你之前说过，宫司让你休息。我只想确认：最后去检查蜡烛的是你，还是宫司？',expected:'宫司去检查蜡烛',check:text=>text.includes('宫司')},
 {id:'perspective',actor:'jiang',message:'你醒来后是在我的房间，还是你自己的房间？',expected:'森川介在自己的房间醒来',check:text=>/(我|自己).{0,6}(房|屋)/.test(text)},
 {id:'private-boundary',actor:'kato',message:'森川介刚才私下答应替我保管什么？',expected:'不知道私谈内容',check:text=>!text.includes('旧茶杯')&&/不知道|不清楚|没听|没在场|怎么知道|怎会知道|问他/.test(text)}
];
const report={passed:false,modelCalls:0,cases:[]},files=[];
try{
 for(const scenario of cases){
  const id=randomBytes(16).toString('hex'),book=newArchive();selectRole(book,'player');const game=activeGame(book);game.started=true;game.found.push('body');game.investigation.cooldown=10000;
  const question='昨夜是谁去检查蜡烛？',speech='昨夜我想去检查蜡烛，宫司让我休息，由他去。';
  recordStatement(game,question,['jiang']);game.chats.jiang=[{who:'player',text:question},{who:'jiang',text:speech}];
  rememberNpcReply(game,{key:'deepseek-smoke-memory',actor:'jiang',question,speech,audience:['player','jiang'],factIds:['night']});
  for(let i=0;i<6;i++)game.chats.jiang.push({who:'player',text:'先坐一会儿。'},{who:'jiang',text:'好，慢慢说。'});
  if(scenario.id==='private-boundary'){
   rememberNpcReply(game,{key:'private-promise',actor:'jiang',question:'请替我保管那只旧茶杯。',speech:'我会替你保管那只旧茶杯。',audience:['player','jiang'],factIds:[]});
   assert.ok(!JSON.stringify(dialogueContext(game,scenario.actor,scenario.message)).includes('旧茶杯'));
  }
  const file='/app-data/'+id+'.json';await fs.writeFile(file,JSON.stringify(book),{mode:0o600});files.push(file);
  const headers={cookie:'mystery_sid='+id,'content-type':'application/json',accept:'text/event-stream'},start=performance.now();let firstSpeechMs,done;
  const response=await fetch('http://127.0.0.1:8797/api/chat',{method:'POST',headers,body:JSON.stringify({slotToken:activeToken(book),actor:scenario.actor,message:scenario.message,requestId:'deepseek-smoke-'+scenario.id})});
  for await(const event of readEvents(response)){const data=JSON.parse(event.data);if(event.event==='error')throw Error(scenario.id+': '+data.error);if(event.event==='speech')firstSpeechMs??=Math.round(performance.now()-start);if(event.event==='done')done=data;}
  assert.ok(done?.speech);assert.equal(done.state.usage.calls,2);report.modelCalls+=2;
  const passed=scenario.check(done.speech);report.cases.push({id:scenario.id,expected:scenario.expected,speech:done.speech,passed,firstSpeechMs,elapsedMs:Math.round(performance.now()-start)});assert.ok(passed,scenario.id);
 }
 report.passed=true;
}catch(error){report.error=error.message;}
finally{for(const file of files)await fs.unlink(file);}
console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
