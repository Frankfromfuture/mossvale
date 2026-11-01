import {generateCaseAmbient,commitCaseAmbient} from './suspect7/social.mjs';
import {hallActivity} from '../shared/hall-activities.mjs';
import {playerId} from '../shared/player.mjs';
import crypto from 'node:crypto';
import {cast} from '../shared/layout.mjs';
import {personas} from './scenario.mjs';
import {availableInteractions,personDossier} from './people.mjs';

const gestures=new Set(['talk','listen','nod','glance','sip','write','adjust']);
const name=id=>cast.find(p=>p.id===id)?.name||'';
export const projectAmbient=event=>({...event,lines:event.lines.map(line=>({...line,speech:event.scope==='private'?'':line.speech}))});
export function ambientContext(s,actor,event,previous=[]){
 return {kind:'ambient',actor,name:name(actor),style:personas[actor].style,
  biography:personDossier(s,cast.find(p=>p.id===actor)).biography,
  place:event.scope==='private'?'厅堂角落的两张椅子':hallActivity(event)?.name||'厅堂长桌',scope:event.scope,
  partner:name(event.pair.find(id=>id!==actor)),activity:event.activity,
  present:event.scope==='private'?'两人在角落座椅上低声交谈。':'两人起身走到当前活动点，添茶、翻书、看盆栽或暖手，之后各自休息。',
  recent:previous.map(line=>({name:name(line.actor),speech:line.speech})),
  message:'自然接一句眼前的闲话，或者沉默并给出可见的细微动作。不补充案情。'};
}
function validated(raw,actor){
 if(typeof raw?.action!=='string'||raw.action.length>32||!raw.action.trim()||/[<>\r\n]|心想|内心|暗想|想起|回忆|秘密|真相|凶手|尸体|毒针/.test(raw.action))throw Error('Invalid ambient action');
 if(typeof raw.speech!=='string'||raw.speech.length>80||/[<>]|系统|模型|JSON|昨|前天|上次|以前|当年|今早|早上|早晨|烧水|曾经|杀|毒|凶|遗骸|身份|面具|玉珏|戒指|桐原|孪生|双胞胎/.test(raw.speech))throw Error('Invalid ambient speech');
 const gesture=gestures.has(raw.gesture)?raw.gesture:'listen',actions={talk:'略微抬起手，轻声开口',listen:'侧过脸，安静地听着',nod:'轻轻点了点头',glance:'目光在对方脸上停了一下',sip:'端起茶杯，轻抿一口',write:'低头在手记上记了几个字',adjust:'轻轻整了整衣襟'};
 const action=/茶壶|(?:茶碗|茶杯).*(?:推|递)|(?:推|递).*(?:茶碗|茶杯)|给.*添|替.*倒|桌沿/.test(raw.action)?actions[gesture]:raw.action.replace(/[（）()]/g,'').trim();
 return {actor,action,speech:raw.speech.trim(),gesture};
}
export async function generateAmbient(s,generate,random=Math.random){
 if(s.scriptId==='suspect7')return generateCaseAmbient(s,generate,random);
 const choices=availableInteractions(s).filter(e=>e.id!==s.ambientLog?.at(-1)?.template);
 if(!choices.length)return null;
 const option=choices[Math.floor(random()*choices.length)],scope=option.scope||'public';
 const event={id:crypto.randomUUID(),template:option.id,station:option.station,room:'hall',pair:option.pair,scope,zone:scope==='private'?(s.chatSetting?.zone==='left'?'right':option.zone||'left'):'table',activity:option.activity,lines:[],createdAt:Date.now(),source:'local',usage:{calls:0,input:0,output:0}};
 const station=hallActivity(event);
 for(const [i,actor]of option.pair.entries()){
  const fallback=option.lines.find(line=>line[0]===actor)?.[1]||'先坐一会儿吧。';
  let line={actor,action:station?.actions[i]||(i?'抬眼看向对方，轻轻点头':'放下手里的东西，转头看向对方'),speech:fallback,gesture:station?.gestures[i]||(i?'nod':'talk')};
  if(generate){try{event.usage.calls++;const raw=await generate(ambientContext(s,actor,event,event.lines));event.usage.input+=raw.usage?.prompt_tokens||0;event.usage.output+=raw.usage?.completion_tokens||0;line=validated(raw,actor);event.source='deepseek';}catch{ /* Keep the authored, non-evidentiary reaction if a model turn fails. */ }}
  event.lines.push(line);
 }
 return event;
}
export function commitAmbient(s,event){
 if(s.scriptId==='suspect7')return commitCaseAmbient(s,event);
 if(!event||s.room!=='hall'||!event.pair.every(id=>s.positions[id]==='hall')||event.pair.includes(s.chatSetting?.actor))return false;
 const publicWitnesses=cast.filter(p=>s.positions[p.id]==='hall').map(p=>p.id),listeners=event.scope==='private'?event.pair:publicWitnesses;
 for(const line of event.lines){
  for(const id of listeners){s.heard[id]||=[];s.heard[id].push({source:name(line.actor),text:`（${line.action}）${line.speech}`,kind:'ambient',scope:event.scope});s.heard[id]=s.heard[id].slice(-50);}
 }
 s.ambientLog||=[];s.ambientLog.push(event);s.ambientLog=s.ambientLog.slice(-30);
 const observed=event.lines.map(l=>`${name(l.actor)}（${l.action}）${event.scope==='private'?'':l.speech}`).join(' ');
 s.events.push({id:`ambient-${event.id}`,text:observed,who:[playerId(s)],kind:'ambient',step:s.step});
 s.usage.calls+=event.usage.calls;s.usage.input+=event.usage.input;s.usage.output+=event.usage.output;s.revision++;
 return true;
}
