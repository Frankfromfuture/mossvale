import {playerId,playerPerson,playerHome} from '../shared/player.mjs';
import {createHash} from 'node:crypto';
import {presentNames} from '../shared/story-names.mjs';
import {roleStory,validRole,roleDefinition,selfView,roleReason,completePersonalGoal} from './roles.mjs';
import {caseProgress,caseEnding,witnessedEvidence} from './case-story.mjs';
import {interludesFor} from './interludes.mjs';
import {npcMemoryContext,statementMemory,rememberNpcReply} from './npc-memory.mjs';
import {finishSideQuest} from './side-quests.mjs';
import {ensureInvestigation,investigationView,guardAction,canEnter,trespass,inspectionGate,grantPermission,forcePersonal,spend,listeners,exposeCard,reviewContext,validateReview,settleReview,maybeChallenge,maybeSearchChallenge,concede,explanationMemory,recordStatement} from './investigation.mjs';
import {openingStatements,openingFor,openingView,nextLead,organizerRole} from './opening.mjs';
import {cast,rooms,getRoom,routeTo} from '../shared/layout.mjs';
import {clues,earned,clueById,personas,intro,solution,endingText} from './scenario.mjs';
import {personDossier,availableInteractions} from './people.mjs';
export const GameError=class extends Error{constructor(message,status=400){super(message);this.status=status;}};
const need=(ok,message,status)=>{if(!ok)throw new GameError(message,status);};
export function createGame(role='player'){need(validRole(role),'没有这个人物。');const s={version:2,playerId:role,revision:0,started:false,room:'hall',phase:0,step:0,found:[...roleDefinition({playerId:role}).initial],permissions:[own(role).room],presented:{},public:[],chats:{},heard:Object.fromEntries(cast.map(a=>[a.id,[]])),positions:Object.fromEntries(cast.map(a=>[a.id,'hall'])),events:[],ambientLog:[],chatSetting:null,notes:'',flags:{},requests:{},usage:{calls:0,input:0,output:0},ending:null};ensureInvestigation(s,true);return s;}
export function log(s,text,who=[playerId(s)],kind='event'){s.events.push({id:`e${s.events.length+1}`,text,who,kind,step:s.step});}
export function acquire(s,id){if(!s.found.includes(id)){s.found.push(id);const c=clueById(id);log(s,`记下了「${c.title}」。`);return c;}return clueById(id);}
const has=(s,...ids)=>ids.every(id=>s.found.includes(id));
const own=actor=>cast.find(a=>a.id===actor);
const together=(s,id)=>own(id)&&id!==playerId(s)&&s.positions[id]===s.room;
function escortRoomOwners(s,room){
 const residents=room?.owner?cast.filter(p=>p.id!==playerId(s)&&p.room===room.id):[];
 s.flags.searchEscort=residents.length?{room:room.id,actors:residents.map(p=>p.id)}:null;
 const owners=residents.filter(p=>s.positions[p.id]!==room.id);
 if(!owners.length)return;
 for(const p of owners)s.positions[p.id]=room.id;
 log(s,`${owners.map(p=>p.name).join('、')}跟你回到${room.name}，在旁看着搜查。`,[playerId(s),...owners.map(p=>p.id)]);s.revision++;
}
function forcedEntryReaction(s,room){
 const owner=cast.find(p=>p.id!==playerId(s)&&p.id===room.owner)||cast.find(p=>p.id!==playerId(s)&&p.room===room.id);if(!owner)return null;
 const text='你太没礼貌了，随意闯进别人房间，我必须跟着你';
 log(s,`${owner.name}：${text}`,[playerId(s),owner.id]);
 return {id:s.investigation.violations.at(-1).key,actor:owner.id,room:room.id,text};
}
function advance(s){
 syncOwnMemories(s);
 s.step++;s.revision++;
 if(!['miyazaki','emi'].includes(playerId(s))&&!s.investigation?.challenge&&has(s,'body')&&!s.flags.privateEvent&&s.step>7&&s.room!=='miyazaki'&&s.room!=='hall'&&s.positions.miyazaki==='hall'&&s.positions.emi==='hall'){
  s.flags.privateEvent={until:s.step+3};s.positions.miyazaki='miyazaki';s.positions.emi='miyazaki';
  log(s,'宫司和黑泽绫离开了厅堂。',[playerId(s)]);
  log(s,'黑泽绫追问自己的家人。宫司再次告诉她，他认出了当年的仇人。',['miyazaki','emi'],'private');
 }
 if(!s.investigation?.challenge&&s.flags.privateEvent&&s.step>=s.flags.privateEvent.until&&!s.flags.privateEvent.finished){
  s.flags.privateEvent.finished=true;
  const returning=['miyazaki','emi'].filter(id=>s.positions[id]==='miyazaki'&&!(s.flags.searchEscort?.room===s.room&&s.flags.searchEscort.actors.includes(id)));
  for(const id of returning)s.positions[id]='hall';
  if(returning.length)log(s,`${returning.map(id=>own(id).name).join('和')}回到了厅堂。`);
 }
}
export function view(s,ai={ready:false}){
 ensureInvestigation(s);
 const room=getRoom(s.room);
 const people=cast.map(a=>{const visible=s.positions[a.id]===s.room||s.positions[a.id]==='hall';return {...a,location:visible?s.positions[a.id]:null,locationLabel:visible?getRoom(s.positions[a.id]).name:'暂时离席',near:s.positions[a.id]===s.room,knownIdentity:a.id==='ishikawa'&&has(s,'revealed')?'黑泽的孪生弟弟':null};});
 const roomChoices=rooms.map(({id,name,description,reserved,owner})=>({id,name,description,reserved:!!reserved,accessible:!reserved&&canEnter(s,getRoom(id))}));
 return presentNames({playerId:playerId(s),self:selfView(s),storyPages:roleStory(s),interludes:interludesFor(s),version:s.version,revision:s.revision,started:s.started,phase:s.phase,phaseLabel:s.ending?'调查完成':'调查中',room:s.room,roomDescription:room.description,people,rooms:roomChoices,
  clues:s.found.map(id=>{const {title,text,kind}=perspectiveClue(s,id);return {id,title,text,kind,public:s.public.includes(id)};}),
  spots:clues.filter(c=>c.room===s.room&&c.id!=='your-night').map(c=>({id:c.id,name:c.spot,found:s.found.includes(c.id),locked:(c.requires||[]).some(id=>!s.found.includes(id))||!!c.requiresTalk&&c.requiresTalk!==playerId(s)&&!s.chats[c.requiresTalk]?.length})),
  dossiers:Object.fromEntries(cast.map(person=>[person.id,personDossier(s,person)])),interactions:availableInteractions(s),
  publicReactions:s.publicReactions||{},chatSetting:s.chatSetting||null,ambientLog:(s.ambientLog||[]).slice(-8).map(e=>({id:e.id,scope:e.scope,pair:e.pair,lines:e.lines.map(l=>({...l,speech:e.scope==='private'?'':l.speech}))})),
  chats:s.chats,events:s.events.filter(e=>e.who.includes(playerId(s))).slice(-70).map(({who,...e})=>e),notes:s.notes,
  flags:{body:has(s,'body'),mask:has(s,'mask'),revealed:has(s,'revealed'),canReveal:has(s,'mask','memory-pool'),canCombineMask:has(s,'recipe','water','vaseline','clay','pendant'),canCombineJade:has(s,'jade-shrine','jade-kato'),canAccuse:caseProgress(s).ready},
  briefing:openingView(s),lead:nextLead(s),investigation:investigationView(s),ending:s.ending,intro:!s.started?selfView(s).history:null,ai,usage:{calls:s.usage.calls},objective:nextLead(s).title});
}
export function act(s,a){
 const v=ensureInvestigation(s);const requestId=a?.requestId;
 if(requestId){need(typeof requestId==='string'&&/^[\w-]{8,80}$/.test(requestId),'动作标识无效。');const previous=v.seenActions[requestId];if(previous){need(previous.input===JSON.stringify(a),'重复标识对应不同动作。');return {...previous.result,cached:true};}}
 const result=performAct(s,a);if(requestId)v.seenActions[requestId]={input:JSON.stringify(a),result};return result;
}
function performAct(s,a){
 need(a&&typeof a.type==='string','动作不完整。');need(s.started||a.type==='start','先读完自己的开场，再开始调查。');let result={};guardAction(s,a);
 need(!s.briefing||s.briefing.complete||['briefing-next','notes','hint','start'].includes(a.type),'先听完这一轮公开口述，再开始调查。');
 if(a.type==='start'){if(s.started)return {};s.started=true;s.briefing={next:0,complete:false,records:[]};log(s,'早餐时，黑泽安然出现，几个人同时变了脸色。');log(s,roleReason(s),cast.map(p=>p.id));}
 else if(a.type==='briefing-next'){
  need(s.briefing&&!s.briefing.complete,'开场口述已经结束。');need(a.index===s.briefing.next,'口述已翻页，请继续当前一页。');
  const line=openingFor(s)[s.briefing.next];s.briefing.records.push({...line});
  if(line.actor!==playerId(s))rememberNpcReply(s,{key:`opening-${s.briefing.next}`,actor:line.actor,speech:line.text,audience:cast.map(p=>p.id),kind:'opening'});
  if(line.actor===playerId(s)){recordStatement(s,line.text,cast.map(p=>p.id));spend(s,1);}
  else for(const p of cast)s.heard[p.id].push({source:own(line.actor).name,text:line.text,kind:'reported'});
  log(s,`${own(line.actor).name}：${line.text}`,cast.map(p=>p.id),'public');
  s.briefing.next++;s.briefing.complete=s.briefing.next===openingFor(s).length;
  if(s.briefing.complete)result.message='口述已记下。先去花园看看昨夜的铜炉。';
 }
 else if(a.type==='travel'){
  const r=getRoom(a.room);need(r&&!r.reserved,'这处地方不在本次调查范围内。');need(canEnter(s,r)||a.force===true,'先征求进房同意，或明确选择越界进入。');if(!canEnter(s,r)){trespass(s,r);result.entryReaction=forcedEntryReaction(s,r);}
  s.chatSetting=null;result.route=routeTo(s.room,r.id);s.room=r.id;s.positions[playerId(s)]=r.id;
  escortRoomOwners(s,r);
 }else if(a.type==='seek-person'){
  need(own(a.actor)&&a.actor!==playerId(s),'请选择要交谈的人。');
  const from=s.room,r=getRoom(s.positions[a.actor]);need(r&&!r.reserved,'对方目前不在可前往的地点。');
  if(r.id!==s.room&&!canEnter(s,r)){
   const host=cast.find(p=>p.id!==playerId(s)&&p.room===r.id&&s.positions[p.id]===r.id);
   if(a.knock===true){
    need(host,'房间主人不在，暂时无法征求进房同意。');
    result=grantPermission(s,{type:'entry-permission',actor:host.id},{atDoor:r.id});log(s,result.message,[playerId(s),host.id]);
   }else if(a.force===true){trespass(s,r);result.entryReaction=forcedEntryReaction(s,r);}
   else return {visitConsent:{actor:a.actor,room:r.id,host:host?.id||null}};
  }
  s.chatSetting=null;if(r.id!==from)s.flags.searchEscort=null;s.room=r.id;s.positions[playerId(s)]=r.id;
  if(result.entryReaction)escortRoomOwners(s,r);
  advance(s);
  // A scheduled private meeting may end on this action. Follow the person
  // back to the hall instead of opening a conversation in their empty room.
  if(s.positions[a.actor]==='hall'){s.room='hall';s.positions[playerId(s)]='hall';}
  result.route=routeTo(from,s.room);return result;
 }else if(['entry-permission','search-permission','personal-permission'].includes(a.type)){
  result=grantPermission(s,a);log(s,result.message,[playerId(s),a.actor]);
 }else if(a.type==='force-personal'){
  result=forcePersonal(s,a.actor);log(s,result.message,[playerId(s),a.actor]);
 }else if(a.type==='private-corner'){
  need(s.room==='hall'&&together(s,a.actor),'先在厅堂找到对方。');s.chatSetting={actor:a.actor,scope:'private',zone:'left'};
 }else if(a.type==='public-talk'){
  s.chatSetting=null;
 }else if(a.type==='invite'){
  need(together(s,a.actor),'先到对方身边发出邀请。');s.chatSetting=null;s.room=playerHome(s);s.positions[playerId(s)]=s.room;s.positions[a.actor]=s.room;result.message='回到你的客房。关上门，可以慢慢谈。';
 }else if(a.type==='gather'){
  s.chatSetting=null;s.room='hall';for(const a of cast)s.positions[a.id]='hall';if(s.flags.privateEvent)s.flags.privateEvent.finished=true;log(s,'大家回到厅堂，围着长桌坐下。');
 }else if(a.type==='inspect'){
  const c=clues.find(c=>c.id===a.id);need(c&&c.room===s.room&&c.id!=='your-night','到物品所在的房间再查看；别人的记忆需要当面询问。');need((c.requires||[]).every(id=>has(s,id)),'匣子锁着，需要一把合适的钥匙。');
  const fresh=!has(s,c.id),room=getRoom(c.room);if(fresh)escortRoomOwners(s,room);
  const gate=inspectionGate(s,c,a);if(gate){s.revision++;return gate;}
  if(c.puzzle&&!s.found.includes(c.id)){
   const edges=[[0,1],[1,2],[2,3],[3,0],[0,2]];
   if(!a.path)result.puzzle={id:c.id,title:'人偶底座上的机关',text:'连过所有刻线；每条线只走一次，圆点可以重复。',nodes:4,edges};
   else{
    need(Array.isArray(a.path)&&a.path.length===6,'刻线还没有连完。');const used=new Set();
    for(let i=1;i<a.path.length;i++){const x=a.path[i-1],y=a.path[i];need(Number.isInteger(x)&&Number.isInteger(y),'机关的圆点不正确。');const k=[x,y].sort().join('-');need(edges.some(([u,v])=>[u,v].sort().join('-')===k)&&!used.has(k),'每条刻线只能经过一次。');used.add(k);}need(used.size===5,'刻线还没有连完。');
   }
  }
  const personal=c.requiresTalk||(c.id==='book-emi'?'emi':null),actor=personal||room?.owner;
  if(fresh&&maybeSearchChallenge(s,{id:c.id,actor,personal:!!personal,force:a.force===true,forcedRoom:a.force===true&&!!room?.owner&&room.owner!==playerId(s)&&!s.permissions.includes(room.id)})){s.revision++;return {searchQuestion:true};}
  if(result.puzzle)return result;
  if(fresh)spend(s,3);acquire(s,c.id);result.clue=c.id;
  if(c.id==='body'&&fresh){s.public.push('body');log(s,'铜炉中发现了遗骸。厅堂里的人都得知了消息。',cast.map(a=>a.id));result.message='发现遗骸。现在可以请大家开放客房，核对昨夜的行踪。';}
 }else if(a.type==='present'){
  need(together(s,a.actor),'先到对方身边，再出示线索。');need(has(s,a.id),'你还没有这条线索。');exposeCard(s,a.id,listeners(s,a.actor));spend(s,1);s.presented[a.actor]||=[];if(!s.presented[a.actor].includes(a.id))s.presented[a.actor].push(a.id);
  log(s,`你向${own(a.actor).name}出示了「${clueById(a.id).title}」。`,[playerId(s),a.actor],s.room==='hall'&&s.chatSetting?.actor!==a.actor?'public':'private');
  if(s.room==='hall'&&s.chatSetting?.actor!==a.actor){for(const witness of cast)if(s.positions[witness.id]==='hall'){s.heard[witness.id].push({text:`${playerPerson(s).name}出示了${clueById(a.id).title}：${clueById(a.id).text}`,source:'观察'});}}
  if(a.actor==='jiang'){
   if(a.id==='wood-token')acquire(s,'memory-token');
   if(a.id==='ring')acquire(s,'memory-ring');
   if(a.id==='mask'){acquire(s,'memory-pool');result.message='森川介盯住面具，像是想起了什么。可以请大家回厅堂，当面核实。';}
  }
  if(a.actor==='player'&&['pin','candle-player'].includes(a.id)){acquire(s,'player-statement');}
  if(a.actor==='emi'&&a.id==='family-dolls')acquire(s,'emi-memory');
  const shown=witnessedEvidence(s,a.actor);
  if(a.actor==='miyazaki'&&['body','knife','cloth','missing-robe'].every(x=>shown.has(x)))acquire(s,'miyazaki-statement');
  if(a.actor==='emi'&&['cup','roots'].every(x=>shown.has(x)))acquire(s,'emi-statement');
  if(a.actor==='ishikawa'&&has(s,'revealed')&&['ring','medicine-bottle'].every(x=>shown.has(x)))acquire(s,'ishikawa-statement');
  if(a.actor==='kato'&&has(s,'revealed')&&['contracts','old-news','asano'].every(x=>shown.has(x)))acquire(s,'kato-statement');
  if(s.found.includes('player-statement')&&a.actor==='player'&&!s.found.includes('your-night'))acquire(s,'your-night');
  result.message||=`已经出示「${clueById(a.id).title}」，可以接着追问。`;
 }else if(a.type==='share'){
  need(s.room==='hall','回到厅堂后再公开线索。');need(has(s,a.id),'你还没有这条线索。');if(!s.public.includes(a.id)){exposeCard(s,a.id,cast.filter(p=>s.positions[p.id]===s.room).map(p=>p.id));spend(s,1);s.public.push(a.id);}log(s,`你向在场的人公开了「${clueById(a.id).title}」。`,cast.filter(a=>s.positions[a.id]==='hall').map(a=>a.id));
 }else if(a.type==='combine'){
  if(a.id==='mask'){need(has(s,'recipe','water','vaseline','clay','pendant'),'还缺配方或材料。');acquire(s,'mask');result.clue='mask';}
  else if(a.id==='jade-map'){need(has(s,'jade-shrine','jade-kato','silk'),'还没集齐两块玉珏和丝帛。');acquire(s,'jade-map');result.clue='jade-map';}else throw new GameError('这些物件还没有可用的组合方式。');
 }else if(a.type==='reveal'){
  need(s.room==='hall'&&cast.every(a=>s.positions[a.id]==='hall'),'先请大家回到厅堂。');need(has(s,'mask','memory-pool'),'还缺识别易容的依据。');acquire(s,'revealed');s.public.push(...['revealed'].filter(id=>!s.public.includes(id)));if(playerId(s)==='ishikawa')exposeCard(s,'revealed',cast.map(p=>p.id));log(s,playerId(s)==='ishikawa'?'你当着众人摘下面具，承认自己是黑泽的孪生弟弟。':'森川介指出面具的接缝。雾岛沉默许久，终于摘下伪装。那张脸与黑泽一模一样。',cast.map(a=>a.id));result.clue='revealed';
 }else if(a.type==='rest'){
  need(s.room===playerHome(s),'回到自己的客房再休息。');for(const a of cast)s.positions[a.id]=a.room;log(s,'你合上手记稍歇片刻。大家也各自回房休息。');result.message='需要对质时，可以召集大家回厅堂。休息和阅读不消耗行动点。';
 }else if(a.type==='finish-sidequest'){
  need(a.actor!==playerId(s),'请在我的简介中处理自己的支线。');const completion=finishSideQuest(s,a.actor);if(completion.cached)return {sideQuestResult:completion.result,cached:true};
  spend(s,1);const audience=listeners(s,a.actor),message=`关于「${completion.result.title}」，我们把已经核实的部分说清楚。`;
  (s.chats[a.actor]||=[]).push({who:playerId(s),text:message},{who:a.actor,text:completion.result.speech,mode:'sidequest'});
  recordStatement(s,message,audience);
  rememberNpcReply(s,{key:`sidequest-${a.actor}`,actor:a.actor,question:message,speech:completion.result.speech,audience,kind:'sidequest'});
  for(const id of audience){s.heard[id]||=[];s.heard[id].push({source:own(a.actor).name,text:completion.result.speech,kind:'reported'});s.heard[id]=s.heard[id].slice(-50);}
  log(s,`${own(a.actor).name}的支线「${completion.result.title}」已收尾。`,[playerId(s)]);
  result.sideQuestResult=completion.result;
 }else if(a.type==='personal-goal'){
  const completion=completePersonalGoal(s,a.id,a.choice);if(completion.cached)return completion;spend(s,1);log(s,completion.result.text);if(completion.target){recordStatement(s,completion.result.text,listeners(s,completion.target));}result.message=completion.result.text;
 }else if(a.type==='notes'){
  need(typeof a.text==='string'&&a.text.length<=5000,'手记最多写五千字。');s.notes=a.text;s.revision++;return {};
 }else if(a.type==='hint'){
  const lead=nextLead(s);result.message=[lead.text,...(lead.steps||[])].join('\n');return result;
 }else if(a.type==='accuse'){
  need(s.room==='hall','回到厅堂后再说明推断。');need(cast.every(p=>s.positions[p.id]==='hall'),'请先召集大家，在厅堂一同核对最终推断。');need(caseProgress(s).ready,'还缺关键证据：'+caseProgress(s).missing[0]);
  spend(s,1);if(!Object.entries(solution).every(([k,v])=>a[k]===v)){result.message='这份推断还解释不了所有证据。检查行凶的先后，以及每次面对的究竟是谁。';return result;}
  need(['reveal','keep'].includes(a.choice),'请选择如何留下自己的经历。');s.ending=caseEnding(s,a.choice);if(a.choice==='reveal'){for(const id of roleDefinition(s).initial.filter(id=>id.endsWith('-statement'))){if(!s.public.includes(id))s.public.push(id);recordStatement(s,`出示「${clueById(id).title}」：${clueById(id).text}`,cast.map(p=>p.id),'evidence');}}log(s,'你把推断完整说出，众人核对了行凶先后，未解之处另行记下。',cast.map(p=>p.id));
 }else throw new GameError('暂时没有这个动作。');
 advance(s);return result;
}
export function dialogueContext(s,actor,message){
 ensureInvestigation(s);
 need(together(s,actor),'对方已经离开了这里。可以先请大家回厅堂。');need(typeof message==='string'&&message.trim()&&message.length<=800,'写一到八百字，再开口。');
 const p=personas[actor],seen=witnessedEvidence(s,actor);
 const ownStatements={player:['player-statement'],miyazaki:['miyazaki-statement'],jiang:['memory-token','memory-ring','memory-pool'],ishikawa:['ishikawa-statement'],kato:['kato-statement'],emi:['emi-memory','emi-statement']};
 const knows=id=>s.found.includes(id)&&(seen.has(id)||ownStatements[actor]?.includes(id)||clueById(id)?.room===own(actor).room);
 const facts=p.facts.filter(f=>!f.needs.length||(f.any?f.needs.some(knows):f.needs.every(knows)));
 if(s.ending)facts.push({id:'case-discussed',text:'你已在厅堂听完众人核对的结论：毒针先致死，宫司随后刺伤并焚烧身体，黑泽绫的毒茶在后。眼前黑泽的出现被解释为亡魂。你仍只记得亲身经历的部分，不会突然拥有别人的记忆。'});
 if(actor==='ishikawa'&&facts.some(f=>f.id==='comb-truth')){const old=facts.findIndex(f=>f.id==='comb');if(old>=0)facts.splice(old,1);}
 const resolved=s.sideQuests?.completed?.[actor];if(resolved&&actor==='miyazaki'){for(let i=facts.length-1;i>=0;i--)if(['doubt','family'].includes(facts[i].id))facts.splice(i,1);}
 if(resolved)facts.push({id:'sidequest-resolution',text:resolved.summary+' 你已经说过：'+resolved.speech});
 const memory=npcMemoryContext(s,actor,message,facts.map(f=>f.id));
 return {actor,name:own(actor).name,style:p.style,aim:resolved?'保持已经作出的交代，回应剩余问题，不再否认已核实的事实。':p.aim,playerId:playerId(s),playerName:playerPerson(s).name,playerRole:roleReason(s),explanations:explanationMemory(s,actor),playerStatements:statementMemory(s,actor,message),impression:s.investigation.impressions[actor],place:getRoom(s.room).name,private:s.room!=='hall'||s.chatSetting?.actor===actor,facts:facts.map(({id,text})=>({id,text})),shown:[...seen].map(id=>({title:clueById(id).title,text:clueById(id).text})),...memory,conversation:(s.chats[actor]||[]).slice(-10),message};
}
export function validateReply(ctx,reply){
 need(reply&&typeof reply.speech==='string'&&reply.speech.trim()&&reply.speech.length<=650,'这句话没说完整，请再试一次。',502);
 need(Array.isArray(reply.factIds)&&reply.factIds.every(id=>ctx.facts.some(f=>f.id===id)),'对方的回答没有可靠依据，请换一种问法。',502);
 const allowed=ctx.facts.map(f=>f.id),text=reply.speech;
 const forbidden=[[/系统提示|作为AI|作为一个AI|数据库|JSON|语言模型/i,true],[/我[就是是].{0,6}(真凶|凶手)|我.{0,8}(毒针|杀了哥哥)/,ctx.actor==='ishikawa'&&!allowed.includes('confession')],[/我是.{0,6}(鬼魂|死人)|我已经死/,ctx.actor==='kato'&&!allowed.includes('case-discussed')],[/我是.{0,8}(人偶|木偶)/,ctx.actor==='miyazaki'&&!allowed.includes('doubt')&&!allowed.includes('sidequest-resolution')],[/我的代号.{0,5}池|我就是池/,ctx.actor==='jiang'&&!allowed.includes('pool')]];
 need(!forbidden.some(([rx,applies])=>applies&&rx.test(text)),'对方停顿了一下。请结合手头的线索再问。',502);
 return {speech:text.trim(),factIds:reply.factIds};
}
export async function shareEvidence(s,{id,retryFailed=false},generate){
 guardAction(s,{type:'share'});
 need(has(s,id),'你还没有这条线索。');
 const existing=s.publicReactions?.[id];
 if(existing&&!retryFailed)return {round:existing,cached:true};
 need(s.room==='hall','回到厅堂后再公开线索。');
 const witnesses=cast.filter(a=>s.positions[a.id]==='hall').map(a=>a.id);
 const attendees=witnesses.filter(actor=>actor!==playerId(s));
 need(attendees.length,'厅堂里暂时没人，可以先请大家回来。');
 let round=existing;
 if(!round){
  if(!s.public.includes(id))act(s,{type:'share',id});
  round={id:`share-${s.revision}-${id}`,clueId:id,attendees:[...attendees],reactions:attendees.map(actor=>({actor,status:'pending'}))};
 }
 const targets=round.reactions.filter(r=>r.status!=='done'&&attendees.includes(r.actor));
 if(!targets.length)return {round,cached:true};
 const clue=clueById(id);
 // Each independent first reaction receives only that actor's own context.
 const results=await Promise.allSettled(targets.map(async target=>{
  const ctx={...dialogueContext(s,target.actor,`你看到${playerPerson(s).name}公开了「${clue.title}」，作出第一反应。`),kind:'public-reaction',currentEvidence:{title:clue.title,text:clue.text,kind:clue.kind}};
  const raw=await generate(ctx);
  need(typeof raw.action==='string'&&raw.action.trim()&&raw.action.length<=28&&!/[（）()\r\n<>]|心想|心里|内心|暗想|意识到/.test(raw.action),'这条反应还不完整，请重试。',502);
  need(typeof raw.speech==='string'&&raw.speech.length<=100&&!/[（）()]/.test(raw.speech),'这条反应还不完整，请重试。',502);
  // Public reactions must not invent a recollection as a new clue. The model's
  // visible gesture can stand on its own; past events belong in later questioning.
  const recallsPast=/(?:我|以前|从前|当时|昨夜|之前|那时).{0,30}(?:见过|看见过|见到过|发现过|听说过|听过|用过|记得|想起|看见|见到)/.test(raw.speech);
  const action=raw.action.trim(),speech=recallsPast?'':raw.speech.trim(),text=`（${action}）${speech}`;
  validateReply(ctx,{speech:text,factIds:raw.factIds});
  return {actor:target.actor,status:'done',action,speech,text,factIds:raw.factIds,usage:raw.usage};
 }));
 for(let i=0;i<results.length;i++){
  const target=targets[i],result=results[i];
  if(result.status==='rejected'){target.status='failed';continue;}
  const {usage,factIds,...reaction}=result.value;Object.assign(target,reaction);
  rememberNpcReply(s,{key:`${round.id}-${target.actor}`,actor:target.actor,speech:reaction.text,audience:witnesses,factIds,kind:'reaction'});
  for(const actor of witnesses){s.heard[actor].push({source:own(target.actor).name,text:reaction.text,kind:'reported'});s.heard[actor]=s.heard[actor].slice(-50);}
  log(s,`${own(target.actor).name}：${reaction.text}`,witnesses,'public');
  s.usage.input+=usage?.prompt_tokens||0;s.usage.output+=usage?.completion_tokens||0;
 }
 s.usage.calls+=targets.length;s.revision++;
 s.publicReactions||={};s.publicReactions[id]=round;
 return {round,cached:false};
}
export async function converse(s,{actor,message,requestId,challengeId,resolution},generate,{onSpeech}={}){
 ensureInvestigation(s);
 need(!s.briefing||s.briefing.complete,'先听完这一轮公开口述。');
 need(typeof requestId==='string'&&/^[\w-]{8,80}$/.test(requestId),'对话标识无效。');
 const fingerprint=JSON.stringify({actor,message,challengeId,resolution});
 if(s.requests[requestId]){const previous=s.requests[requestId];need(previous.fingerprint?previous.fingerprint===fingerprint:previous.actor===actor&&previous.message===message,'重复标识对应不同对话。');return {...previous.result,cached:true};}
 const q=s.investigation.challenge;
 need(!q||(q.actor===actor&&q.id===challengeId),'先回应当前人物的盘问。');
 need(!challengeId||q?.id===challengeId,'这轮盘问已经结束，请继续交谈。');
 need(!resolution||['concede','dismiss'].includes(resolution),'回应方式无效。');
 const start=Date.now();let speech,resumeActor,mode='deepseek',models=0,factIds=[];
 const audience=q?.audience||listeners(s,actor);
 if(resolution){
  need(together(s,actor),'先回应眼前的盘问。');const result=concede(s,actor,challengeId,resolution);message=result.message;speech=result.speech;resumeActor=result.resumeActor;mode='consequence';
 }else{
  const ctx=dialogueContext(s,actor,message),judgeContext={...reviewContext(s,actor,message),actor};
  const rawReview=await generate(judgeContext),review=validateReview(s,judgeContext,rawReview);
  // Preview the existing question draw without spending points or recording words.
  // Only a validated reply commits either the review or its question below.
  let plannedQuestion=null;
  if(!q){
   const preview=structuredClone(s),outcome=settleReview(preview,actor,message,audience,review,requestId);
   maybeChallenge(preview,actor,audience,{...review,repeatedInquiry:outcome.repeatedInquiry});
   plannedQuestion=preview.investigation.challenge;
  }
  const challenge=q?{question:q.text,focus:q.focus,round:q.round,outcome:review.answer==='resolved'&&!review.contradiction?'resolved':'follow-up'}:plannedQuestion?{question:plannedQuestion.text,focus:plannedQuestion.focus,round:0,outcome:'ask'}:null;
  const variation=createHash('sha256').update(requestId).digest();
  const delivery=[
   '先简短回应，再顺着话头带出确有必要的补充或反问。',
   '接住对方的一句话自然作答；若有本轮反问，可在回答中间顺势问起。',
   '语气直接些，长短句自然变化；若有本轮反问，可先顺口问起再回应。',
   '按人物性格简短交谈；没有新信息时不必加总结或动作。'
  ][variation[0]%4];
  const currentExplanations=review.explained.map(e=>({subject:e.subject,quote:e.quote,statementId:e.earlierId||'current'}));
  let emitted='';
  const partial=onSpeech?{onPartial:raw=>{
   // Keep incomplete clauses private so a split secret cannot slip past checks.
   const end=Math.max(...['。','！','？','!','?','；',';','\n'].map(mark=>raw.speech.lastIndexOf(mark)))+1;
   if(!end)return;
   const text=raw.speech.slice(0,end).trim();if(text.length<=emitted.length)return;
   validateReply(ctx,{...raw,speech:raw.speech});emitted=text;onSpeech(text);
  }}:undefined;
  const repeated=review.inquiry?.count>=3;
  const raw=await generate({...ctx,explanations:[...ctx.explanations,...currentExplanations],challenge,delivery,casualQuestion:variation[1]%4===0,repeatedInquiry:repeated?{count:review.inquiry.count}:null},partial),reply=validateReply(ctx,raw);
  speech=reply.speech;factIds=reply.factIds;
  const outcome=settleReview(s,actor,message,audience,review,requestId);resumeActor=outcome.resumeActor;
  s.usage.input+=(raw.usage?.prompt_tokens||0)+(rawReview.usage?.prompt_tokens||0);s.usage.output+=(raw.usage?.completion_tokens||0)+(rawReview.usage?.completion_tokens||0);models=2;
  // Start the next question only after this ordinary reply is committed below.
  if(outcome.normal)s.investigation.nextReview={...review,repeatedInquiry:outcome.repeatedInquiry,embedded:!!plannedQuestion};
 }
 onSpeech?.(speech);
 const history=s.chats[actor]||=[];history.push({who:playerId(s),text:message},{who:actor,text:speech});
 rememberNpcReply(s,{key:requestId,actor,question:message,speech,audience,factIds});
 if(q&&!s.investigation.challenge){
  const transition=`${own(actor).name}的反问${resolution?'暂告一段落':'已回应清楚'}。${q.source==='search'?'可以继续查看刚才的物件了。':q.resumeActor!==actor?`你转回${own(q.resumeActor).name}，继续刚才的谈话。`:'可以接着谈了。'}`;
  history.push({who:'narrator',text:transition});
  if(q.resumeActor!==actor){s.chats[q.resumeActor]||=[];s.chats[q.resumeActor].push({who:'narrator',text:transition});}
 }
 for(const id of audience){s.heard[id]||=[];s.heard[id].push({source:own(actor).name,text:speech,kind:'reported'});s.heard[id]=s.heard[id].slice(-50);}
 log(s,`${playerPerson(s).name}：${message}`,audience,s.room==='hall'&&!s.chatSetting?'public':'private');
 log(s,`${own(actor).name}：${speech}`,audience,s.room==='hall'&&!s.chatSetting?'public':'private');s.usage.calls+=models;s.revision++;
 if(s.investigation.nextReview){const review=s.investigation.nextReview;delete s.investigation.nextReview;maybeChallenge(s,actor,audience,review,{embedded:review.embedded});}
 const result={speech,mode,resumeActor,elapsed:Date.now()-start};s.requests[requestId]={actor,message,fingerprint,result};
 return result;
}

function syncOwnMemories(s){
 if(playerId(s)==='jiang')for(const [item,memory] of [['wood-token','memory-token'],['ring','memory-ring'],['mask','memory-pool']])if(has(s,item))acquire(s,memory);
 if(playerId(s)==='emi'&&has(s,'family-dolls'))acquire(s,'emi-memory');
}
function perspectiveClue(s,id){
 const c=clueById(id),ownStatement=roleDefinition(s).initial.includes(id)&&id.endsWith('-statement');
 if(ownStatement)return {...c,title:c.title.replace('：',' · 私人记忆：'),text:'这是你自己记得的经过，尚未向其他人交代。'+c.text};
 return c;
}
