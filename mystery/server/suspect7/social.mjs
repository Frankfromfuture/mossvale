import {randomUUID} from 'node:crypto';
import {people,person} from '../../shared/suspect7/cast.mjs';
import {villaStations} from '../../shared/suspect7/activities.mjs';

export const casePublicRoom=s=>s.chapterId>=5?'meeting':'dining';
export const caseActivityRoom=s=>s.started&&s.room==='lounge'?'lounge':casePublicRoom(s);
export function casePositions(s){
 const cast=(s.chapterId>=5?people:people.slice(0,6)).filter(p=>p.id!==s.playerId),visitors=caseActivityRoom(s)==='lounge'?cast.slice(0,3).map(p=>p.id):[];
 return Object.fromEntries(cast.map(p=>[p.id,visitors.includes(p.id)?'lounge':casePublicRoom(s)]));
}
const exchanges={
 tea:['喝水歇息','杯子在这里，给你留了一只。','谢谢，我自己倒就好。'],
 reading:['翻看书刊','这页折了个角，我把它摊开。','别压太紧，纸有些薄。'],
 chess:['摆弄棋子','下一盘？随便摆摆也行。','先把棋子分好，我坐会儿。'],
 plants:['照看盆栽','这片叶子垂下来了。','托盘歪了，我扶一下。'],
 board:['整理便笺','这张纸总是翘起来。','夹子在旁边，用这个试试。'],
 sorting:['归拢文具','这些空文件夹放哪边？','放在托盘里吧，省得滑下去。']
};
export function caseInteractions(s){
 const room=caseActivityRoom(s),positions=casePositions(s);
 if(!s.started||s.ending||s.room!==room)return [];
 const cast=(s.chapterId>=5?people:people.slice(0,6)).filter(p=>positions[p.id]===room&&p.id!==s.chatSetting?.actor);
 if(cast.length<2)return [];
 const stations=room==='lounge'?['tea','reading','chess','plants']:room==='meeting'?['reading','tea','board','sorting']:['reading','tea'];
 return stations.flatMap(station=>cast.map((p,i)=>{const q=cast[(i+1)%cast.length],[activity,a,b]=exchanges[station];return {id:room+'-'+station+'-'+p.id,station,room,pair:[p.id,q.id],scope:'public',activity,lines:[[p.id,a],[q.id,b]]};}));
}
export async function generateCaseAmbient(s,generate,random=Math.random){
 const choices=caseInteractions(s).filter(e=>e.id!==s.ambientLog?.at(-1)?.template);if(!choices.length)return null;
 const option=choices[Math.floor(random()*choices.length)],event={...option,id:randomUUID(),template:option.id,createdAt:Date.now(),source:'local',lines:[],usage:{calls:0,input:0,output:0}};
 for(const [i,actor]of option.pair.entries()){
  const activity=villaStations({id:option.room,x:0,z:0})[option.station];
  let line={actor,action:activity.actions[i],speech:option.lines[i][1],gesture:activity.gestures[i]};
  if(generate)try{
   event.usage.calls++;const p=person(actor),raw=await generate({kind:'ambient',actor,name:p.name,style:p.style,biography:p.role,place:({lounge:'客厅',meeting:'临时案情室',dining:'餐厅'})[option.room],scope:'public',partner:person(option.pair[1-i]).name,activity:option.activity,recent:event.lines.map(l=>({name:person(l.actor).name,speech:l.speech})),message:'只接眼前的闲话，不谈案情。'});
   event.usage.input+=raw.usage?.prompt_tokens||0;event.usage.output+=raw.usage?.completion_tokens||0;
   if(typeof raw.action==='string'&&raw.action.trim()&&raw.action.length<=28&&typeof raw.speech==='string'&&raw.speech.length<=80&&!/[<>\n]|心想|内心|秘密|凶手|尸体|昨|前天|当年|杀|毒|玉|身份|洪|手机|时间|钟|墓|车祸/.test(raw.action+raw.speech)){line={actor,action:raw.action.replace(/[（）()]/g,''),speech:raw.speech,gesture:['talk','listen','nod','glance','write','adjust'].includes(raw.gesture)?raw.gesture:'listen'};event.source='deepseek';}
  }catch{/* Retain the authored present-tense exchange. */}
  event.lines.push(line);
 }
 return event;
}
export function commitCaseAmbient(s,event){
 if(!event||!caseInteractions(s).some(e=>e.id===event.template&&e.pair.every((id,i)=>id===event.pair[i])))return false;
 const positions=casePositions(s),audience=[s.playerId,...Object.keys(positions).filter(id=>positions[id]===event.room)].filter(id=>id!==s.chatSetting?.actor&&(!s.chatSetting||id!==s.playerId));
 for(const l of event.lines)s.chatLog.push({id:randomUUID(),actor:l.actor,text:'（'+l.action+'）'+l.speech,kind:'ambient',chapter:s.chapterId,viewpoint:s.playerId,audience:[...audience]});
 s.ambientLog||=[];s.ambientLog.push(event);s.ambientLog=s.ambientLog.slice(-30);s.revision++;return true;
}
