import {playerId,playerHome,playerPerson} from '../shared/player.mjs';
import {roleSecrets,roleGoals} from './roles.mjs';
import {randomBytes} from 'node:crypto';
import {cast,getRoom} from '../shared/layout.mjs';
import {clueById} from './scenario.mjs';
import {conductPenalties} from '../shared/investigation-rules.mjs';
import {inquiryContext,validateInquiry,recordInquiry} from './repeated-inquiry.mjs';

export const scoreRules=[
 {id:'deduction',name:'案件推理',max:30,rule:'发现遗骸、核实身份、核对机关和现场各得5分，正确结案得10分。'},
 {id:'secrets',name:'秘密保护',max:25,rule:'寻玉来意、与真野的关系各扣2分，家族身份扣5分，夜探经过扣5分，毒簪伤人扣8分；同一秘密只扣一次。'},
 {id:'credibility',name:'回答可信度',max:20,rule:'盘问中明显回避扣1分，有原话依据的前后矛盾扣3分；强行结束反问或承认隐瞒各扣3分。'},
 {id:'courtesy',name:'交谈分寸',max:10,rule:'直接辱骂扣1分，羞辱或威胁扣3分。向同一人物重复问同一件事，第3次起每次扣1分，第3次会惹怒对方并触发一次反问；新线索下追问另计。正常质疑、拒绝和引用别人的话不扣分，本项最低0分。'},
 {id:'conduct',name:'调查规矩',max:10,rule:`擅入客房扣${conductPenalties.entry}分，越界翻找扣${conductPenalties.search}分，未经同意强行检查本人扣${conductPenalties.personal}分。本项最低为0分，同次行为只记一次。`},
 {id:'time',name:'行动效率',max:5,rule:'初始360行动点。每轮玩家对话、申请许可、出示或公开线索消耗1点，首次搜证消耗3点。用尽后每额外消耗15点扣1分，最多扣5分。走路、阅读、等待和离线不消耗行动点。'}
];
export const secrets=[
 {id:'family',title:'家族身份',text:'家族旧身份、丝帛来历与衣物内衬的菊纹。',points:5,cards:['crest']},
 {id:'jade',title:'寻玉来意',text:'你为寻找两块玉珏而来，丝帛是父亲留下的寻亲线索。',points:2,cards:['silk','jade-map']},
 {id:'asano',title:'与真野的关系',text:'真野是你的挚友。你正追查他的死，并怀疑黑泽与此有关。',points:2,cards:['asano']},
 {id:'night',title:'昨夜夜探',text:'百物语结束后，你曾离开客房，经过花园、偏殿，随后躲入大殿。',points:5,cards:['your-night']},
 {id:'pin',title:'毒簪伤人',text:'你在偏殿被袭击后，用淬毒发簪刺中过那个像黑泽的男人。',points:8,cards:['pin','your-night']}
];
const name=id=>cast.find(p=>p.id===id)?.name||id;
const fail=message=>{const e=new Error(message);e.status=409;throw e;};
export function ensureInvestigation(s,fresh=false){
 if(s.investigation){upgradeMemory(s);return s.investigation;}
 const legacy=!fresh&&(s.started||s.step>0||Object.values(s.chats||{}).some(h=>h.length));
 const v=s.investigation={version:1,legacy,minutes:0,budget:360,turn:0,cooldown:0,rng:randomBytes(4).readUInt32LE(),sequence:0,
  penalties:[],exposures:{},entry:[...(s.permissions||[playerId(s)])],personal:[],itemConsent:[],statements:[],topics:{},challenge:null,
  impressions:Object.fromEntries(cast.filter(p=>p.id!==playerId(s)).map(p=>[p.id,{suspicion:0,rapport:0}])),seenActions:{},warnings:[],violations:[]};
 if(legacy){
  v.personal=cast.filter(p=>(s.chats[p.id]||[]).length).map(p=>p.id);
  for(const secret of roleSecrets(s)){
   const listeners=cast.filter(p=>p.id!==playerId(s)&&secret.cards.some(id=>(s.public||[]).includes(id)||(s.presented?.[p.id]||[]).includes(id))).map(p=>p.id);
   if(listeners.length)v.exposures[secret.id]={listeners,legacy:true};
  }
 }
 upgradeMemory(s);return v;
}
function upgradeMemory(s){
 const v=s.investigation;if(v.memoryVersion===2)return;
 v.explanations||=[];const older=[];
 // Old direct conversations establish knowledge only for the actual speaker.
 for(const [actor,history] of Object.entries(s.chats||{}))for(const line of history){
  if(line.who!==playerId(s)||!line.text||v.statements.some(w=>w.text===line.text&&w.audience.includes(actor)))continue;
  older.push({id:`word-${++v.sequence}`,text:line.text,audience:[actor],kind:'statement',turn:0,legacy:true});
 }
 v.statements.unshift(...older);v.memoryVersion=2;
}
export const subjects={night:'百物语散场后的行踪',purpose:'来访与调查的目的',rules:'如何取得搜查许可',jade:'关心玉珏的缘由',asano:'打听真野的立场',family:'来访与家人的关系'};
const topicSubject=id=>({'host-purpose':'purpose','host-night':'night','keeper-night':'night','keeper-rules':'rules','writer-night':'night','merchant-jade':'jade','merchant-asano':'asano','merchant-purpose':'purpose','emi-asano':'asano','emi-family':'family','emi-intent':'purpose'}[id]|| (id.endsWith('-night')?'night':id.endsWith('-purpose')?'purpose':null));
export function explanationMemory(s,actor){
 const v=ensureInvestigation(s);
 return v.explanations.filter(e=>e.audience.includes(actor)).map(e=>({subject:e.subject,topic:subjects[e.subject],quote:e.quote,statementId:e.statementId}));
}
function remember(s,subject,statement,quote=statement.text){
 if(!subjects[subject])return;const v=ensureInvestigation(s);
 const previous=v.explanations.find(e=>e.subject===subject&&e.statementId===statement.id);
 if(previous){previous.audience=[...new Set([...previous.audience,...statement.audience])];return;}
 v.explanations.push({subject,statementId:statement.id,quote,audience:[...statement.audience]});
}
function penalty(s,category,points,reason,key,evidence=''){
 const v=ensureInvestigation(s);if(s.ending||v.penalties.some(p=>p.key===key))return;
 const max=scoreRules.find(r=>r.id===category).max,used=v.penalties.filter(p=>p.category===category).reduce((n,p)=>n+p.points,0);
 const actual=Math.min(points,max-used);if(actual<=0)return;
 v.penalties.push({id:`score-${++v.sequence}`,category,points:actual,reason,key,evidence,minute:v.minutes});
}
// Keep the legacy minutes/minute storage keys so existing saves retain their action counts.
// These counters are action points; elapsed or wall-clock time never changes them.
export function spend(s,points){
 const v=ensureInvestigation(s);if(s.ending)return;
 v.minutes+=points;
 for(const mark of [270,330,360])if(v.minutes>=mark&&!v.warnings.includes(mark))v.warnings.push(mark);
 for(let i=1;i<=Math.min(5,Math.floor((v.minutes-v.budget)/15));i++)penalty(s,'time',1,`超出行动点预算${i*15}点。`,`time-${i}`);
}
export function listeners(s,actor){return s.room!=='hall'||s.chatSetting?.actor===actor?[playerId(s),actor]:cast.filter(p=>s.positions[p.id]===s.room).map(p=>p.id);}
export function recordStatement(s,text,audience,kind='statement'){
 const v=ensureInvestigation(s),entry={id:`word-${++v.sequence}`,text,audience:audience.filter(id=>id!==playerId(s)),kind,turn:v.turn};
 v.statements.push(entry);
 for(const id of entry.audience){s.heard[id]||=[];s.heard[id].push({source:playerPerson(s).name,text,kind:'reported'});s.heard[id]=s.heard[id].slice(-50);}
 return entry;
}
function expose(s,secret,audience,key,quote){
 const v=ensureInvestigation(s),previous=v.exposures[secret.id],heard=audience.filter(id=>id!==playerId(s));if(!heard.length)return;
 if(!previous)penalty(s,'secrets',secret.points,`暴露了「${secret.title}」。`,`secret-${secret.id}`,quote);
 const added=heard.filter(id=>!previous?.listeners.includes(id));
 v.exposures[secret.id]={listeners:[...new Set([...(previous?.listeners||[]),...heard])],legacy:previous?.legacy||false};
 for(const id of added)v.impressions[id].suspicion=Math.min(100,v.impressions[id].suspicion+secret.points*2);
}
export function exposeCard(s,id,audience){
 for(const secret of roleSecrets(s).filter(x=>x.cards.includes(id)))expose(s,secret,audience,`card-${id}`,`出示「${clueById(id).title}」`);
 recordStatement(s,`出示「${clueById(id).title}」：${clueById(id).text}`,audience,'evidence');
}
export function guardAction(s,a){
 const v=ensureInvestigation(s),q=v.challenge;
 if(q&&!['notes','hint'].includes(a.type)&&!(a.type==='present'&&a.actor===q.actor))fail('先回应眼前的盘问。可以翻阅手记或出示已有线索。');
}
export function canEnter(s,room){const v=ensureInvestigation(s);return !room.owner||v.entry.includes(room.id)||s.permissions.includes(room.id);}
export function trespass(s,room){
 const v=ensureInvestigation(s),audience=cast.filter(p=>p.id!==playerId(s)&&s.positions[p.id]===room.id).map(p=>p.id);
 violation(s,'entry',room.id,conductPenalties.entry,`未经同意进入${room.name}。`,audience);
}
function violation(s,kind,target,points,reason,audience){
 const v=ensureInvestigation(s),key=`${kind}-${target}-${++v.sequence}`;
 penalty(s,'conduct',points,reason,key);v.violations.push({key,kind,target,reason,audience});
 for(const id of audience){v.impressions[id].rapport=Math.max(-100,v.impressions[id].rapport-points*4);v.impressions[id].suspicion=Math.min(100,v.impressions[id].suspicion+points*2);s.heard[id].push({source:'亲眼所见',text:reason,kind:'observed'});}
}
export function inspectionGate(s,c,a){
 const v=ensureInvestigation(s);if(s.found.includes(c.id))return null;
 const actor=c.requiresTalk||(c.id==='book-emi'?'emi':null);
 if(actor&&actor!==playerId(s)&&s.positions[actor]!==s.room)fail('本人不在这里，先到本人身边再查看。');
 if(actor&&actor!==playerId(s)&&!v.personal.includes(actor)&&!v.itemConsent.includes(c.id)){
  if(!a.force)return {consent:{kind:'personal',actor,id:c.id,title:c.title,near:s.positions[actor]===s.room}};
  if(s.positions[actor]!==s.room)fail('本人不在这里，先当面征求同意。');
  violation(s,'personal',actor,conductPenalties.personal,`未经同意，试图强行检查${name(actor)}的私人物品或身体线索。`,listeners(s,actor).filter(x=>x!==playerId(s)));
  spend(s,3);maybeSearchChallenge(s,{id:c.id,actor,personal:true,force:true});return {message:`${name(actor)}拦住了你。调查规矩已扣分；这条线索仍需本人同意。`};
 }
 const room=getRoom(c.room);
 if(room?.owner&&room.owner!==playerId(s)&&!s.permissions.includes(room.id)&&!v.searchChecks?.[c.id]?.forcedRoom){
  if(!a.force)return {consent:{kind:'search',actor:room.owner,id:c.id,title:c.title,near:s.positions[room.owner]===s.room}};
  violation(s,'search',c.id,conductPenalties.search,`未经同意翻找${room.name}的「${c.title}」。`,cast.filter(p=>p.id!==playerId(s)&&s.positions[p.id]===s.room).map(p=>p.id));
 }
 return null;
}
export function grantPermission(s,a,{atDoor=null}={}){
 const v=ensureInvestigation(s),person=cast.find(p=>p.id===a.actor&&p.id!==playerId(s));
 const answeringDoor=person&&a.type==='entry-permission'&&atDoor===person.room&&s.positions[a.actor]===atDoor;
 if(!person||s.positions[a.actor]!==s.room&&!answeringDoor)fail('先到本人身边征求同意。');
 if(!s.found.includes('body'))fail('先确认花园发生了什么，再商量搜查。');
 if(a.type==='entry-permission'){if(!v.entry.includes(person.room))v.entry.push(person.room);}
 else if(a.type==='personal-permission'){if(!v.personal.includes(a.actor))v.personal.push(a.actor);}
 else {if(!s.permissions.includes(person.room))s.permissions.push(person.room);if(!v.entry.includes(person.room))v.entry.push(person.room);}
 spend(s,1);
 return {message:`${person.name}同意你${a.type==='entry-permission'?'进入客房，翻找物件仍需另行商量':a.type==='personal-permission'?'查看随身物品，并自愿展示相关身体线索':'进入并搜查客房；其他住客的私人物品需另行商量'}。`};
}
export function forcePersonal(s,actor){
 if(!cast.some(p=>p.id===actor&&actor!==playerId(s))||s.positions[actor]!==s.room)fail('先到本人身边。');
 if(ensureInvestigation(s).personal.includes(actor))return {message:'对方已经同意展示，按许可查看即可。'};
 violation(s,'personal',actor,conductPenalties.personal,`未经同意，试图强行检查${name(actor)}的私人物品或身体线索。`,listeners(s,actor).filter(x=>x!==playerId(s)));
 spend(s,3);maybeSearchChallenge(s,{id:`personal-${actor}`,actor,personal:true,force:true});return {message:`${name(actor)}拦住了你。调查规矩已扣分，线索仍需本人同意。`};
}

// Questions are authored from public circumstances; hidden plot facts never enter the speaker prompt.
const topics=[
 {id:'host-purpose',actor:'miyazaki',text:'你说是来借宿的，为什么这么在意神社里的旧物？',focus:'说明来访目的与关心旧物的缘由。',secrets:['jade','family']},
 {id:'host-night',actor:'miyazaki',text:'百物语散了以后，你还去过哪些地方？',focus:'回答昨夜的去向，可以承认记忆不全。',secrets:['night','pin']},
 {id:'keeper-night',actor:'jiang',text:'昨夜散场后，你就回房歇着了吗？',focus:'回答是否回房、后来是否又出门。',secrets:['night']},
 {id:'keeper-rules',actor:'jiang',text:'搜东西前，你会先问主人一声吧？你打算怎么查？',focus:'说明会如何取得许可和开展搜查。',secrets:[]},
 {id:'writer-night',actor:'ishikawa',text:'你先把自己的昨夜说清楚吧。散场以后，你去了哪里？',focus:'说明自己的夜间行踪；前后说法须一致。',secrets:['night','pin']},
 {id:'writer-conflict',actor:'ishikawa',requires:'conflict',text:'你刚才的两种说法对不上。能解释一下吗？',focus:'解释所指出的两句原话之间的矛盾。',secrets:['night','pin']},
 {id:'merchant-jade',actor:'kato',requires:'玉珏',text:'你刚才提到玉珏。你对它的兴趣，是从哪里来的？',focus:'解释为什么关心玉珏。',secrets:['jade','family']},
 {id:'merchant-asano',actor:'kato',requires:'真野',text:'你为什么一直问真野？你和他是什么关系？',focus:'回答与真野的关系或打听他的缘由。',secrets:['asano']},
 {id:'merchant-purpose',actor:'kato',text:'你到这里，是特意找什么东西，还是找什么人？',focus:'回答来意，可以保留具体姓名或物品。',secrets:['jade','family','asano']},
 {id:'emi-asano',actor:'emi',requires:'真野',text:'你提起真野时很认真。你是替谁来问这些事的？',focus:'说明问起真野的立场。',secrets:['asano']},
 {id:'emi-family',actor:'emi',requires:'家人',text:'你刚才也提到了家人。你来这里，与他们有关吗？',focus:'回答家人与来访的关系，可以保留身份细节。',secrets:['family','jade']},
 {id:'emi-intent',actor:'emi',text:'你问了我这么多，你自己想从这件事里弄清什么？',focus:'说明调查目的，回应对方的顾虑。',secrets:['asano','jade']}
];
function questionTopics(s){if(playerId(s)==='player')return topics;return cast.filter(p=>p.id!==playerId(s)).flatMap(p=>[
 {id:`${p.id}-night`,actor:p.id,text:'百物语散场以后，你去过哪些地方？哪些是你确实记得的？',focus:'说明自己的夜间行踪，记忆断处可以直说。',secrets:[]},
 {id:`${p.id}-purpose`,actor:p.id,text:'你现在最想弄清什么？为什么要问这件事？',focus:'说明本次调查的目的，承接对方的疑问。',secrets:[]}]);}
function random(v){v.rng=(Math.imul(v.rng,1664525)+1013904223)>>>0;return v.rng/4294967296;}
export function maybeChallenge(s,actor,audience,review,{embedded=false}={}){
 const v=ensureInvestigation(s);if(!s.started||s.ending||v.challenge)return;
 if(review.repeatedInquiry){
  if(review.repeatedInquiry.trigger){
   const topic={id:`repeat-${review.repeatedInquiry.id}`,actor,focus:'说明反复追问这件事的原因，以及你想确认什么。'};
   openChallenge(s,topic,actor,audience,'你反复追问这件事，到底想从我这里确认什么？',`${name(actor)}皱起眉，显然生气了，转过来质问你。`,{source:'repeated-inquiry',embedded});
  }
  return;
 }
 if(v.turn<v.cooldown)return;
 const candidates=questionTopics(s).filter(t=>t.actor===actor&&t.actor!==playerId(s)&&audience.includes(t.actor)&&(!v.topics[t.id]||t.requires==='conflict'&&review.contradiction)&&
  !v.explanations.some(e=>e.subject===topicSubject(t.id)&&e.audience.includes(t.actor))&&
  (!t.requires||(t.requires==='conflict'?review.contradiction&&review.contradiction.audience.includes(t.actor):v.statements.some(w=>w.audience.includes(t.actor)&&w.text.includes(t.requires)))));
 if(!candidates.length)return;
 const pressure=review.disclosures.length||review.contradiction||v.violations.some(e=>e.audience.includes(actor));
 if(random(v)> (pressure ? .45 : .25))return;
 let topic=candidates[Math.floor(random(v)*candidates.length)];
 if(review.contradiction){topic=candidates.find(t=>t.requires==='conflict')||topic;}
 let text=topic.text;
 if(topic.requires==='conflict')text=`你先前说「${review.contradiction.earlierQuote}」，刚才却说「${review.contradiction.quote}」。能解释一下吗？`;
 const reason=topic.requires==='conflict'?'想核对刚才两处不同的说法':topicSubject(topic.id)==='night'?'想先听清你昨夜的行踪':topic.requires?`听你提起${topic.requires}，想问清缘由`:topicSubject(topic.id)==='rules'?'想先约定搜查的分寸':'想弄清你参与调查的缘由';
 const transition=`${name(actor)}${embedded?'顺着谈话问起，':'停下回答，'}${reason}。`;
 openChallenge(s,topic,actor,audience,text,transition,{embedded});
}
function openChallenge(s,topic,actor,audience,text,transition,extra={}){
 const v=ensureInvestigation(s);
 v.challenge={id:`question-${++v.sequence}`,topic:topic.id,subject:topicSubject(topic.id),actor:topic.actor,resumeActor:actor,text,focus:topic.focus,transition,secretIds:roleSecrets(s).map(x=>x.id),round:0,audience:[...audience],status:'open'};
 Object.assign(v.challenge,extra);
 v.topics[topic.id]=(v.topics[topic.id]||0)+1;
 s.chats[topic.actor]||=[];s.chats[topic.actor].push({who:'narrator',text:transition,challenge:v.challenge.id});
 if(!extra.embedded)s.chats[topic.actor].push({who:topic.actor,text,challenge:v.challenge.id});
 if(topic.actor!==actor)s.chats[actor].push({who:'narrator',text:transition,challenge:v.challenge.id});
 if(!extra.embedded)for(const id of audience){s.heard[id].push({source:name(topic.actor),text,kind:'reported'});s.heard[id]=s.heard[id].slice(-50);}
}
// One persisted draw per new search target; retrying or reloading cannot reroll it.
export function maybeSearchChallenge(s,{id,actor,personal=false,force=false,forcedRoom=false}){
 const v=ensureInvestigation(s);
 if(!s.started||s.ending||v.challenge||!actor||actor===playerId(s)||!cast.some(p=>p.id===actor)||s.positions[actor]!==s.room||v.searchChecks?.[id])return false;
 v.searchChecks||={};v.searchTurn=(v.searchTurn||0)+1;
 const check=v.searchChecks[id]={actor,forcedRoom};
 if(v.searchTurn<(v.searchCooldown||0)||random(v)>(force ? .6 : .4))return false;
 const questions=personal?['你要查我的随身物品，先说说你在怀疑什么？','查看身体线索之前，你是不是该说明一下依据？']:['你翻这件东西，是想找什么？依据是什么？','先等等。为什么要查这里？你打算怎么查看？'];
 const text=questions[Math.floor(random(v)*questions.length)],topic={id:`search-${id}`,actor,focus:'说明搜查的依据，以及准备如何查看。'};
 openChallenge(s,topic,actor,listeners(s,actor),text,`${name(actor)}拦住了搜查，想先问清缘由。`,{source:'search',searchTarget:id});
 check.questionId=v.challenge.id;return true;
}
export function reviewContext(s,actor,message){
 const v=ensureInvestigation(s),audience=listeners(s,actor);
 const known=v.statements.filter(x=>x.audience.includes(actor)&&x.kind==='statement'),remembered=new Set(explanationMemory(s,actor).map(e=>e.statementId));
 return {kind:'player-review',message,inquiries:inquiryContext(s,actor),challenge:v.challenge?{question:v.challenge.text,focus:v.challenge.focus,round:v.challenge.round}:null,
  playerName:playerPerson(s).name,secrets:roleSecrets(s).map(({id,title,text})=>({id,title,text})),
  subjects,explanations:explanationMemory(s,actor),previous:[...new Map([...known.filter(w=>remembered.has(w.id)),...known.slice(-35)].map(w=>[w.id,w])).values()].map(({id,text})=>({id,text})),
  evidence:[...new Set([...(s.presented[actor]||[]),...s.public])].map(id=>({id,title:clueById(id).title,text:clueById(id).text})),audience};
}
export function validateReview(s,ctx,raw){
 if(!raw||!['resolved','evasive','uncertain'].includes(raw.answer)||!Array.isArray(raw.disclosures)||!Number.isFinite(raw.confidence)||raw.confidence<0||raw.confidence>1)fail('这次回答还没判断完整，文字已保留，请重试。');
 const quoted=q=>typeof q==='string'&&q.trim().length>=2&&q.length<=180&&ctx.message.includes(q);
 const certain=raw.confidence>=.9;
 const disclosures=certain?raw.disclosures.filter(d=>d&&roleSecrets(s).some(x=>x.id===d.id)&&quoted(d.quote)):[];
 let contradiction=null;
 if(certain&&raw.contradiction&&quoted(raw.contradiction.quote)){
  const c=raw.contradiction;
  // The candidate must be one of the actual statements supplied to this judge.
  const supplied=ctx.previous.find(x=>x.id===c.earlierId);
  const original=ensureInvestigation(s).statements.find(x=>x.id===c.earlierId);
  if(supplied&&typeof c.earlierQuote==='string'&&c.earlierQuote.length>=2&&supplied.text.includes(c.earlierQuote))contradiction={...c,audience:original.audience.filter(id=>ctx.audience.includes(id))};
 }
 const mistreatment=certain&&raw.mistreatment&&['insult','humiliation','threat'].includes(raw.mistreatment.kind)&&quoted(raw.mistreatment.quote)?raw.mistreatment:null;
 const explained=certain&&!contradiction?(Array.isArray(raw.explained)?raw.explained:[]).filter(e=>e&&subjects[e.subject]&&typeof e.quote==='string'&&e.quote.length>=2&&e.quote.length<=800&&(e.earlierId?ctx.previous.find(w=>w.id===e.earlierId)?.text.includes(e.quote):ctx.message.includes(e.quote))):[];
 return {answer:certain?raw.answer:'uncertain',basis:quoted(raw.basis)?raw.basis:'',disclosures,contradiction,mistreatment,explained,confidence:raw.confidence,inquiry:validateInquiry(s,ctx,raw)};
}
export function settleReview(s,actor,message,audience,review,key){
 const v=ensureInvestigation(s),q=v.challenge;
 for(const d of review.disclosures)expose(s,roleSecrets(s).find(x=>x.id===d.id),audience,key,d.quote);
 // One primary speech penalty per answer; an independently abusive act remains separate.
 if(!review.disclosures.length&&review.contradiction)penalty(s,'credibility',3,'前后说法矛盾。',`${key}-contradiction`,`${review.contradiction.earlierQuote} → ${review.contradiction.quote}`);
 else if(q&&!review.disclosures.length&&review.answer==='evasive'&&review.basis)penalty(s,'credibility',1,'盘问中没有回应所问的事情。',`${q.id}-evasive`,review.basis);
 if(review.mistreatment){const points=review.mistreatment.kind==='insult'?1:3;penalty(s,'courtesy',points,'这句话直接辱骂、羞辱或威胁了对方。',`${key}-courtesy`,review.mistreatment.quote);v.impressions[actor].rapport=Math.max(-100,v.impressions[actor].rapport-points*4);}
 if(review.contradiction||review.answer==='evasive')v.impressions[actor].suspicion=Math.min(100,v.impressions[actor].suspicion+3);
 const statement=recordStatement(s,message,audience);spend(s,1);
 const repeatedInquiry=q?null:recordInquiry(s,actor,message,review.inquiry);
 if(repeatedInquiry){penalty(s,'courtesy',1,`向${name(actor)}重复询问同一件事，第${repeatedInquiry.count}次。`,`${key}-repeat-inquiry`,message);v.impressions[actor].rapport=Math.max(-100,v.impressions[actor].rapport-4);}
 for(const e of review.explained||[]){const source=e.earlierId?v.statements.find(w=>w.id===e.earlierId):statement;if(source)remember(s,e.subject,source,e.quote);}
 if(q){
  q.round++;
  if(review.answer==='resolved'&&!review.contradiction){remember(s,q.subject||topicSubject(q.topic),statement);v.challenge=null;v.cooldown=v.turn+4;if(q.source==='search')v.searchCooldown=(v.searchTurn||0)+2;return {resolved:true,resumeActor:q.resumeActor};}
  return {resolved:false,focus:q.focus,round:q.round};
 }
 v.turn++;return {normal:true,repeatedInquiry};
}
export function concede(s,actor,questionId,resolution='concede'){
 const v=ensureInvestigation(s),q=v.challenge;
 if(!q||q.actor!==actor||q.id!==questionId)fail('这轮盘问已经变化，请刷新后再回应。');
 const dismiss=resolution==='dismiss';
 penalty(s,'credibility',3,dismiss?'你强行结束了这轮反问。':'你承认对这个问题有所隐瞒。',`${q.id}-${resolution}`,q.text);
 const message=dismiss?'这个问题先到这里，我要继续调查。':'这件事我有所隐瞒，现在还不愿把它说出来。';
 recordStatement(s,message,q.audience);spend(s,1);v.impressions[actor].suspicion=Math.min(100,v.impressions[actor].suspicion+8);
 v.challenge=null;v.cooldown=v.turn+4;
 if(q.source==='search')v.searchCooldown=(v.searchTurn||0)+2;
 return {message,speech:dismiss?'好，这个疑问我先记着。':'我记下了。等你愿意说清楚时，我们再谈。',resumeActor:q.resumeActor};
}
export function investigationView(s){
 const v=ensureInvestigation(s),earned=['body','revealed','memory-ring','cloth'].filter(id=>s.found.includes(id)).length*5+(s.ending?10:0);
 const scores=scoreRules.map(r=>({...r,rule:r.id==='secrets'?roleSecrets(s).map(x=>`${x.title}扣${x.points}分`).join('；')+'。同一秘密只扣一次。':r.rule,value:r.id==='deduction'?earned:Math.max(0,r.max-v.penalties.filter(p=>p.category===r.id).reduce((n,p)=>n+p.points,0))}));
 return {legacy:v.legacy,pointsSpent:v.minutes,budget:v.budget,remaining:Math.max(0,v.budget-v.minutes),scores,total:scores.reduce((n,r)=>n+r.value,0),
  penalties:v.penalties.map(({key,minute,...p})=>({...p,actionPointsSpent:minute,reason:p.category==='time'?`超出行动点预算${Math.max(0,minute-v.budget)}点。`:p.reason})),secrets:roleSecrets(s).map(({cards,points,...x})=>({...x,exposedTo:(v.exposures[x.id]?.listeners||[]).map(name)})),
  challenge:v.challenge?{...v.challenge,actorName:name(v.challenge.actor),audience:undefined,secretIds:undefined,reminders:roleSecrets(s).filter(x=>v.challenge.secretIds.includes(x.id)).map(x=>x.title)}:null,
  permissions:{entry:v.entry,personal:v.personal},
  goals:roleGoals(s)};
}
