import {randomUUID} from 'node:crypto';
import {people,person} from '../../shared/suspect7/cast.mjs';

const exchanges=[
 ['paper','reading','翻看手记','纸边卷起来了，我把它压平。','这边还有空白的，先拿着。'],
 ['pause','plants','稍事歇息','坐得有些僵，起来站一会儿。','嗯，我也活动一下。'],
 ['quiet',null,'安静坐着','先缓一缓吧。','好，我在这里坐一会儿。']
];
export function caseInteractions(s){
 const room=s.chapterId>=5?'meeting':'dining';
 if(!s.started||s.ending||s.room!==room)return [];
 const cast=(s.chapterId>=5?people:people.slice(0,6)).filter(p=>p.id!==s.playerId&&p.id!==s.chatSetting?.actor);
 return cast.map((p,i)=>{const q=cast[(i+1)%cast.length],[id,station,activity,a,b]=exchanges[i%exchanges.length];return {id:id+'-'+p.id,station,room,pair:[p.id,q.id],scope:'public',activity,lines:[[p.id,a],[q.id,b]]};});
}
export async function generateCaseAmbient(s,generate,random=Math.random){
 const choices=caseInteractions(s).filter(e=>e.id!==s.ambientLog?.at(-1)?.template);if(!choices.length)return null;
 const option=choices[Math.floor(random()*choices.length)],event={...option,id:randomUUID(),template:option.id,createdAt:Date.now(),source:'local',lines:[],usage:{calls:0,input:0,output:0}};
 for(const [i,actor]of option.pair.entries()){
  let line={actor,action:i?'轻轻点头':'抬眼看向对方',speech:option.lines[i][1],gesture:i?'nod':'talk'};
  if(generate)try{
   event.usage.calls++;const p=person(actor),raw=await generate({kind:'ambient',actor,name:p.name,style:p.style,biography:p.role,place:s.chapterId>=5?'临时案情室':'餐厅',scope:'public',partner:person(option.pair[1-i]).name,activity:option.activity,recent:event.lines.map(l=>({name:person(l.actor).name,speech:l.speech})),message:'只接眼前的闲话，不谈案情。'});
   event.usage.input+=raw.usage?.prompt_tokens||0;event.usage.output+=raw.usage?.completion_tokens||0;
   if(typeof raw.action==='string'&&raw.action.trim()&&raw.action.length<=28&&typeof raw.speech==='string'&&raw.speech.length<=80&&!/[<>\n]|心想|内心|秘密|凶手|尸体|昨|前天|当年|杀|毒|玉|身份|洪|手机|时间|钟|墓|车祸/.test(raw.action+raw.speech)){line={actor,action:raw.action.replace(/[（）()]/g,''),speech:raw.speech,gesture:['talk','listen','nod','glance','write','adjust'].includes(raw.gesture)?raw.gesture:'listen'};event.source='deepseek';}
  }catch{/* Retain the authored present-tense exchange. */}
  event.lines.push(line);
 }
 return event;
}
export function commitCaseAmbient(s,event){
 if(!event||!caseInteractions(s).some(e=>e.id===event.template&&e.pair.every((id,i)=>id===event.pair[i])))return false;
 const audience=(s.chapterId>=5?people:people.slice(0,6)).map(p=>p.id).filter(id=>id!==s.chatSetting?.actor&&(!s.chatSetting||id!==s.playerId));
 for(const l of event.lines)s.chatLog.push({id:randomUUID(),actor:l.actor,text:'（'+l.action+'）'+l.speech,kind:'ambient',chapter:s.chapterId,viewpoint:s.playerId,audience:[...audience]});
 s.ambientLog||=[];s.ambientLog.push(event);s.ambientLog=s.ambientLog.slice(-30);s.revision++;return true;
}
