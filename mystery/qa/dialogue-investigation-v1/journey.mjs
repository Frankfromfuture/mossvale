import {randomUUID} from 'node:crypto';
import {act,converse,view} from '../../server/suspect7/game.mjs';
import {topics,stepOf} from '../../server/suspect7/inquiries.mjs';
import {people,confrontations} from '../../server/suspect7/catalog.mjs';

// The reviewer and actor are deliberately deterministic here; live-model acceptance is separate.
export function modelFor(topicId,{intent='ask',quote,confidence=.99,fail=false}={}){
 return async c=>{
  if(c.kind==='case-inquiry')return {topicId,intent,quote:quote??c.message,confidence};
  if(fail)throw Error('isolated actor failure');
  const f=c.facts.find(f=>f.id===c.caseTurn?.factId);
  return {speech:f?.text||'这件事我还需要想一想。',factIds:f?[f.id]:[]};
 };
}
export async function askTopic(s,actor,id,{message,intent,shown}={}){
 act(s,{type:'seek-person',actor});
 const t=topics(s,actor).find(t=>t.id===id);if(!t)throw Error('Missing topic '+id);
 const input={actor,message:message||(stepOf(s,t)?t.follow:t.prompt),shown,requestId:randomUUID()};
 return converse(s,input,modelFor(id,{intent:intent||(t.kind==='report'?'request':t.kind==='theory'?'theory':'ask')}));
}
export async function dialogueJourney(s,{stopAt=7,checkpoint=async()=>{}}={}){
 const a=(type,fields={})=>act(s,{type,...fields,requestId:randomUUID()});
 const inspect=(room,ids)=>{a('move',{room});for(const id of ids)a('inspect',{id});};
 const finish=async(actor,id,shown)=>{for(let i=0;i<2;i++){const t=topics(s,actor).find(t=>t.id===id);if(stepOf(s,t)===2)break;await askTopic(s,actor,id,{shown});}};
 a('begin');a('notes',{text:'先核实身份，再核实时间。'});
 for(const [actor,id] of [['chenxin','arrival-chen'],['licha','arrival-licha']])if(actor!==s.playerId)await finish(actor,id);
 inspect('dining',['phone']);inspect('kitchen',['kitchen']);inspect('landing',['stairs']);inspect('garden',['exit']);a('move',{room:'dining'});a('play-call',{id:'call1'});a('advance');await checkpoint(2,s);if(stopAt===2)return;
 for(const p of people.slice(0,6))if(p.id!==s.playerId)await finish(p.id,'account:'+p.id+'-old');
 inspect('lounge',['lighter']);inspect('activity',['toys']);inspect('chapel',['carpet']);a('confession');await askTopic(s,s.playerId==='licha'?'hongxue':'licha','case-theory');a('advance');await checkpoint(3,s);if(stopAt===3)return;
 a('play-call',{id:'call2'});await finish(s.playerId==='licha'?'hongxue':'licha','call-difference');a('move',{room:'chapel'});a('vote',{choice:'abstain'});a('advance');await checkpoint(4,s);if(stopAt===4)return;
 for(const [actor,id] of [['franklin','franklin-shadow'],['hongxue','hongxue-shadow'],['chenxin','chenxin-time']])if(actor!==s.playerId)await finish(actor,'account:'+id);
 inspect('attic',['injury','keypad','toolbox']);inspect('study',['cane','measure','photo','paternity']);a('measure');inspect('garage',['body','key','garage-gate']);inspect('pool',['temperature','pool-items','outlet']);inspect('storage',['spare-ball']);a('move',{room:'attic'});a('unlock',{code:'9426936'});inspect('secret',['console','relay','camera','paint','pump','monitor','autodial','wine','passage']);a('reconstruct',{order:['load','seal','inflate','transport','release']});await askTopic(s,s.playerId==='licha'?'hongxue':'licha','case-theory');a('advance');await checkpoint(5,s);if(stopAt===5)return;
 await finish('chenxin','account:chen-after-noon');
 for(const actor of ['wuquan','raven','cuiyuan','xiaoguo','aiyijun'])if(actor===s.playerId)a('account',{id:actor+'-file'});else await finish(actor,'account:'+actor+'-file');
 inspect('meeting',['robbery-file','hong-record','cable','blood','phone-check','no-gas']);
 for(const c of confrontations.filter(c=>c.chapter===5))await finish(c.actor,'confront:'+c.id,[c.quote,c.evidence]);
 await askTopic(s,s.playerId==='licha'?'hongxue':'licha','case-theory');a('advance');await checkpoint(6,s);if(stopAt===6)return;
 inspect('meeting',['vivian-record','funds','car-fire','driver','dna']);
 for(const id of ['identity','departure','clock','chen']){const p=people.find(p=>p.id!==s.playerId&&topics(s,p.id).some(t=>t.id==='report:'+id));await finish(p.id,'report:'+id);}
 for(const c of confrontations.filter(c=>c.chapter===6))await finish(c.actor,'confront:'+c.id,[c.quote,c.evidence]);
 a('final',{oldAnswers:{sun:'孙强',ghost:'安迪',assault:'孙强',jade:'红雪藏在周雪墓中'},answers:{victim:'洪羽瑞',killer:'陈信',motive:'与洪青合作，摆脱卧底处境并解决经济压力',window:'第一次去教堂：12:45—13:15'},chains:{'body-chain':'dental','clock-chain':'clock-check','vivian-chain':'vivian-record','escape-chain':'passage'},choice:'disclose'});await checkpoint(7,s);
 return view(s);
}
