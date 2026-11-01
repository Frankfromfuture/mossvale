import {cast} from '../shared/layout.mjs';
import {playerId} from '../shared/player.mjs';
import {presentNames} from '../shared/story-names.mjs';

const name=id=>cast.find(p=>p.id===id)?.name||id;
const normal=text=>presentNames(String(text||'')).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const stop=new Set(['什么','怎么','为何','为什么','我们','你们','他们','我的','你的','他的','她的','这个','那个','事情','一下','知道','记得','之前','刚才','已经','有没有','是不是','可以','说过']);
const topics=[['面具','易容','样片','接缝'],['戒指','毒针','机关'],['木牌','代号'],['玉珏','丝帛','寻玉'],['家人','身世','桐原','父母'],['许可','允许','搜查','同意'],['配方','材料','制作']];
function tokens(text){
 const value=normal(text),items=new Set();
 for(let i=0;i<value.length-1;i++){const t=value.slice(i,i+2);if(!stop.has(t))items.add(t);}
 topics.forEach((terms,i)=>{if(terms.some(t=>value.includes(t)))items.add('topic:'+i);});
 return items;
}
const commitment=text=>/答应|说好|我会|我愿意|我可以|交给我|帮你|替你|保管|保密/.test(text);
function relevance(query,text){
 const a=tokens(query),b=tokens(text);let matches=0,topic=false;
 for(const t of a)if(b.has(t)){matches+=t.startsWith('topic:')?3:1;topic||=t.startsWith('topic:');}
 return matches>=2||topic?matches/Math.sqrt(Math.max(1,a.size)):0;
}
function selectRelevant(items,message,{limit=6,budget=4000,text=x=>x.text}={}){
 const askPromise=/答应|承诺|约好|说好/.test(message);
 const ranked=items.map((item,index)=>({item,index,score:relevance(message,text(item))+(askPromise&&item.commitment?3:0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||b.index-a.index);
 const selected=[];let used=0;
 for(const r of ranked){const size=text(r.item).length;if(used+size>budget)continue;selected.push(r);used+=size;if(selected.length===limit)break;}
 return selected.sort((a,b)=>a.index-b.index).map(x=>x.item);
}
const channelFor=(question,speech,kind,facts=[])=>facts.length||['opening','reaction','sidequest'].includes(kind)||/昨夜|昨晚|百物语|蜡烛|行踪|花园|偏殿|客房|铜炉|遗骸|死|血|面具|易容|样片|戒指|毒|木牌|代号|玉珏|丝帛|家人|身世|桐原|真野|搜查|配方|手记/.test(question+speech)?'case':'social';

export function ensureNpcMemory(s){
 const v=s.investigation;if(v.npcMemory?.version===1)return v.npcMemory;
 const memory=v.npcMemory={version:1,sequence:0,episodes:[]};
 const append=(actor,question,speech,audience,kind)=>{
  if(!speech||!cast.some(p=>p.id===actor)||actor===playerId(s))return;
  const existing=memory.episodes.find(e=>e.actor===actor&&e.question===question&&e.speech===speech);
  if(existing){existing.audience=[...new Set([...existing.audience,...audience])];return;}
  memory.episodes.push({id:`memory-${++memory.sequence}`,actor,question,speech,audience:[...new Set([actor,...audience])],kind,channel:channelFor(question,speech,kind),turn:0,factIds:[],commitment:commitment(speech),legacy:true});
 };
 // Old paired chats prove knowledge for that addressee only. Never infer an
 // audience from today's room or publish their accompanying private question.
 for(const [actor,history]of Object.entries(s.chats||{})){
  let question='';for(const line of history){if(line.who===playerId(s))question=line.text;else if(line.who===actor){append(actor,question,line.text,[actor],'dialogue');question='';}else question='';}
 }
 // Recorded witnesses can remember an old NPC statement, without obtaining
 // the private player question from a separate chat with the same wording.
 for(const event of s.events||[]){
  if(!['public','private'].includes(event.kind)||!Array.isArray(event.who))continue;
  const text=presentNames(event.text),person=cast.find(p=>text.startsWith(p.name+'：'));
  if(person)append(person.id,'',text.slice(person.name.length+1),event.who,'reported');
 }
 for(const [listener,heard]of Object.entries(s.heard||{}))for(const line of heard){
  if(line.kind==='ambient')continue;
  const person=cast.find(p=>p.name===presentNames(line.source));
  if(person)append(person.id,'',line.text,[listener],'reported');
 }
 return memory;
}

export function rememberNpcReply(s,{key,actor,question='',speech,audience,factIds=[],kind='dialogue'}){
 const memory=ensureNpcMemory(s);
 if(memory.episodes.some(e=>e.key===key))return;
 memory.episodes.push({id:`memory-${++memory.sequence}`,key,actor,question,speech,audience:[...new Set([actor,...audience])],factIds:[...factIds],kind,channel:channelFor(question,speech,kind,factIds),turn:s.investigation.turn,commitment:commitment(speech)});
}

export function statementMemory(s,actor,message){
 const known=s.investigation.statements.filter(w=>w.audience.includes(actor)&&w.kind==='statement'),recent=known.slice(-35);
 const older=selectRelevant(known.slice(0,-35),message);
 return [...older,...recent].map(({id,text})=>({id,text}));
}

export function npcMemoryContext(s,actor,message,allowedFacts){
 const memory=ensureNpcMemory(s),allowed=new Set(allowedFacts);
 const available=memory.episodes.filter(e=>(e.actor===actor||e.audience.includes(actor))&&(e.actor!==actor||e.factIds.every(id=>allowed.has(id))));
 const recentConversation=new Set((s.chats[actor]||[]).slice(-10).map(l=>l.text));
 const unique=new Map();
 for(const e of available){
  if(e.actor===actor&&recentConversation.has(e.speech))continue;
  const key=JSON.stringify([e.actor,e.question,e.speech]);unique.set(key,e);
 }
 const recollections=selectRelevant([...unique.values()],message,{limit:6,budget:4000,text:e=>e.question+' '+e.speech}).map(e=>({id:e.id,speaker:name(e.actor),question:e.question,quote:e.speech,kind:e.kind,commitment:e.commitment}));
 // NPC testimony has durable storage. Ambient chatter has its own small
 // channel and cannot evict it, even after the old heard buffer has rolled over.
 const testimony=available.filter(e=>e.actor!==actor&&e.channel==='case').slice(-6).map(e=>({source:name(e.actor),text:e.speech,kind:'reported'}));
 const observed=(s.heard[actor]||[]).filter(e=>e.kind!=='ambient'&&!cast.some(p=>p.name===presentNames(e.source))).slice(-4);
 const heard=[...testimony,...observed].filter((e,i,a)=>a.findIndex(x=>x.source===e.source&&x.text===e.text)===i);
 const social=available.filter(e=>e.actor!==actor&&e.channel==='social').slice(-3).map(e=>({source:name(e.actor),text:e.speech,kind:'conversation'}));
 return {recollections,heard,ambient:[...social,...(s.heard[actor]||[]).filter(e=>e.kind==='ambient')].slice(-3)};
}
