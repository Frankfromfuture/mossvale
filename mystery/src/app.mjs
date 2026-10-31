import {createBackgroundMusic} from './music.mjs';
import {createInteractionFeedback} from './interaction-feedback.mjs';
import {bindMenuScenery,menuSceneryMarkup} from './menu-scenery.mjs';
import {bindScriptCarousel} from './script-carousel.mjs';
import {playerId} from '../shared/player.mjs';
import {streamChat} from './chat-stream.mjs';
import {sideQuestOverview} from './side-quest-ui.mjs';
import {conductPenalties} from '../shared/investigation-rules.mjs';
import {actionPointsHud,scoreHud,rulesContent,selfContent,challengeBanner,goalsHud,leadHud} from './investigation-ui.mjs';
import {personSheet} from './person-sheet.mjs';
import {installPersonLinks} from './person-links.mjs';
import {icon} from './ui-icons.mjs';
import {TownScene} from './scene.mjs';
import {bindDialogueFrame,speakerBadge} from './dialogue-frame.mjs';
import {dialogueGlyph} from './dialogue-controls.mjs';
import {createVoice} from './voice.mjs';
import {storySpread,storySeenKey} from './storybook.mjs';
import {mapContent,positionMapPins} from './location-map.mjs';
import {rooms,cast,getRoom} from '../shared/layout.mjs';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const portrait=(a,cls='')=>a.portrait==null?`<span class="portrait portrait-unknown ${cls}" role="img" aria-label="${esc(a.name)}的资料">${icon('book')}</span>`:`<span class="portrait ${cls}" style="--col:${a.portrait%3};--row:${Math.floor(a.portrait/3)}" role="img" aria-label="${esc(a.name)}的头像"></span>`;
const menuScenery=bindMenuScenery($('overlay'));
const introReady=($('loading').querySelector('img')?.decode().catch(()=>{})||Promise.resolve()).then(()=>new Promise(resolve=>setTimeout(resolve,900)));
let inStartMenu=true,menuState=null;
// Enable reading once on this update, then keep the player's later choice.
if(localStorage.getItem('mystery-read-default')!=='1'){localStorage.setItem('mystery-read','1');localStorage.setItem('mystery-read-default','1');}
let state,selected=null,busy=false,lastReply='',lastMode='',bookTab='clues',storyPage=0,storyTurning=false,bookFilter='全部',selectedClue=null,modalName=null,toastTimer,retry=null,voice=localStorage.getItem('mystery-read')!=='0',draft='';
let actionPending=false,actionRetry=null,pendingConversation=null,liveReply=null,sideGoalsOpen=false;
let disconnectMap,disconnectDialogueFrame,profileId=null,profileTrail=[];
const music=createBackgroundMusic({notice:toast});
const feedback=createInteractionFeedback();
const speech=createVoice({
 context:()=>({actor:selected,slotToken:state?.slotToken,busy:busy||actionPending,blocked:!!modalName||document.hidden,readReplies:voice}),
 getDraft:()=>draft,setDraft:text=>{draft=text;localStorage.setItem(storageKey('mystery-draft'),draft);if($('chat-input')){$('chat-input').value=draft;fitChatInput();}},
 submit:()=>sendChat(),changed:renderVoice,notice:toast
});
const backgroundPeople=[{id:'asano',name:'真野',role:'白川的挚友',locationLabel:'已故',portrait:null}];
const profilePeople=()=>[...(state?.people||cast),...backgroundPeople];
function clearDialogue(){scene?.setConversation(null);disconnectDialogueFrame?.();disconnectDialogueFrame=null;$('dialogue').innerHTML='';}
let scene;try{scene=new TownScene($('scene'),pick);}catch(e){$('loading').textContent='三维画面未能启动，请使用支持 WebGL 的浏览器。';console.error(e);}
if(scene)scene.onTravelComplete=finishPendingConversation;
let ambientPending=false;
if(scene)scene.social.onNeedEvent=async()=>{
 if(ambientPending||busy||selected||pendingConversation||modalName||document.hidden||state?.room!=='hall'||!state?.started)return;
 const slot=state.slotToken;ambientPending=true;try{const result=await api('ambient',{});if(state.slotToken!==slot)return;if(result.event)scene.social.enqueue(result.event);scene.social.nextModelAt=Date.now()+(result.cooldownMs||90000);}catch{scene.social.nextModelAt=Date.now()+120000;}finally{ambientPending=false;}
};
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),5200);}
async function api(path,data){const response=await fetch('api/'+path,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify({...data,slotToken:inStartMenu?menuState?.slotToken:state?.slotToken}):undefined});const body=await response.json();if(!response.ok)throw new Error(body.error||'暂时没有回应。');return body;}
function storageKey(key){return key+':'+(state?.slotToken||'lobby');}
function apply(s,route){
 if(s.roleSelection){menuState=s;inStartMenu=true;renderHud();showMainMenu();return;}
 const before=state,switched=!state?.self||state.slotToken!==s.slotToken;
 if(switched){speech.stop();selected=null;pendingConversation=null;retry=null;actionRetry=null;liveReply=null;profileTrail=[];clearDialogue();const old=state;state=s;draft=localStorage.getItem(storageKey('mystery-draft'))||'';if(!old&&s.playerId==='player'&&!draft)draft=localStorage.getItem('mystery-draft')||'';}

 const previousActor=selected;
 const previous=switched?null:before?.investigation,oldQuestion=previous?.challenge,newQuestion=s.investigation?.challenge;
 if(newQuestion&&newQuestion.id!==oldQuestion?.id){
  pendingConversation=null;
  if(!switched&&before){localStorage.setItem(storageKey('mystery-interrupted'),JSON.stringify({actor:selected||newQuestion.resumeActor,draft}));draft='';localStorage.removeItem(storageKey('mystery-draft'));}
  else if(!localStorage.getItem(storageKey('mystery-interrupted')))localStorage.setItem(storageKey('mystery-interrupted'),JSON.stringify({actor:newQuestion.resumeActor,draft:''}));
  selected=newQuestion.actor;
 }else if(oldQuestion&&!newQuestion){
  let saved;try{saved=JSON.parse(localStorage.getItem(storageKey('mystery-interrupted')));}catch{}
  selected=oldQuestion.resumeActor;draft=saved?.draft||'';localStorage.removeItem(storageKey('mystery-interrupted'));localStorage.setItem(storageKey('mystery-draft'),draft);
 }
 if(previousActor!==selected)speech.stop();
 state=s;if(newQuestion?.source==='search'&&newQuestion.id!==oldQuestion?.id&&modalName)closeModal(true);scene?.update(s,route);renderHud();
 if(selected&&!s.people.find(p=>p.id===selected)?.near){speech.stop();selected=null;clearDialogue();}else if(selected)renderDialogue();
 if(!switched){
  if(newQuestion&&newQuestion.id!==oldQuestion?.id)feedback.attention('question',`${s.slotToken}:question:${newQuestion.id}`);
  const known=new Set(before?.clues?.map(clue=>clue.id));
  if(s.clues.some(clue=>!known.has(clue.id)))feedback.play('paper');
 }
 if(previous){const added=s.investigation.penalties.slice(previous.penalties.length);if(added.length)toast(added.map(p=>`−${p.points}：${p.reason}`).join(' '));
  const before=previous.pointsSpent??previous.minutes,now=s.investigation.pointsSpent;if(before<360&&now>=360)toast('行动点已用完。之后每额外消耗15点扣1分，仍可继续调查。');else if(before<330&&now>=330)toast('还剩30行动点。');else if(before<270&&now>=270)toast('还剩90行动点。');}
}
function lockedQuestion(){if(!state.investigation?.challenge)return false;toast('先回应对方的盘问；可以翻阅手记和自己的简介。');return true;}
async function action(a,{quiet=false}={}){
 if(busy||actionPending){toast('等这一步完成后再行动。');return {error:'正在处理'};}
 speech.stop();
 if(a.type!=='seek-person')pendingConversation=null;
 const key=JSON.stringify(a);if(actionRetry?.key!==key)actionRetry={key,input:{...a,requestId:crypto.randomUUID()}};
 actionPending=true;
 try{const r=await api('action',actionRetry.input);actionRetry=null;if(r.state)apply(r.state,r.route);if(r.entryReaction){scene?.showEntryReaction(r.entryReaction);feedback.attention('entry',`${state.slotToken}:entry:${r.entryReaction.id}`);}if(a.type==='notes')feedback.play('paper');if(r.consent){showConsent(r.consent);return r;}if(r.puzzle){puzzle(r.puzzle);return r;}if(r.message&&!quiet)toast(r.message);if(r.clue&&!quiet)showClue(r.clue);if(a.type==='accuse'&&state.ending)showEnding();return r;}catch(e){toast(e.message);return {error:e.message};}finally{actionPending=false;}
}
function showLead(){
 if(state.briefing?.current){showOpening();return;}
 const lead=state.lead;modal('接下来做什么',`<h3>${esc(lead.title)}</h3><p>${esc(lead.text)}</p><p class="score-note">你负责整理口述与核对物证。原话可以存疑，结论要有证据。</p><button id="follow-lead" class="primary">${lead.action==='garden'?'去花园':lead.action==='gather'?'回厅堂':'翻看手记'}</button>`,'lead-modal');
 $('follow-lead').onclick=()=>{closeModal();if(lead.action==='garden')travel('garden');else if(lead.action==='gather'){if(!lockedQuestion())action({type:'gather'});}else book();};
}
function showOpening(){
 const b=state.briefing,line=b?.current;if(!line){closeModal(true);return;}
 const person=state.people.find(p=>p.id===line.actor);
 modal('先把各自的昨夜说出来',`<p class="opening-role">${esc(b.role)}</p><article class="opening-speaker">${portrait(person)}<div><small>公开口述 · ${b.next+1} / ${b.total}</small><h3>${person.name}${line.actor===playerId(state)?' · 轮到你了':''}</h3></div></article><blockquote>${esc(line.text)}</blockquote><p class="score-note">这是本人愿意公开的说法，尚待核实。私下经历仍由你自己决定何时说明。</p><div class="modal-foot"><button id="opening-next" class="primary">${line.actor===playerId(state)?'这样介绍自己，开始调查 · 1行动点':'记下，听下一位'}</button></div>`,'opening-modal');
 $('close-modal').hidden=true;$('opening-next').focus();$('opening-next').onclick=async()=>{const button=$('opening-next');button.disabled=true;const r=await action({type:'briefing-next',index:b.next},{quiet:true});if(r.error){button.disabled=false;return;}if(state.briefing.current)showOpening();else{closeModal(true);toast('六人的口述已收进手记。先去花园查看铜炉。');}};
}
function showSelf({focusSecret=null}={}){
 modal('我的简介',selfContent(state,{esc,portrait}),'self-profile');
 $('overlay').querySelectorAll('[data-personal-visit]').forEach(b=>b.onclick=()=>startConversation(b.dataset.personalVisit));
 $('overlay').querySelectorAll('[data-personal-goal]').forEach(b=>b.onclick=async()=>{const r=await action({type:'personal-goal',id:b.dataset.personalGoal,choice:Number(b.dataset.choice)},{quiet:true});if(!r.error)showSelf({focusSecret});});
 const entry=focusSecret?$('self-secret-'+focusSecret):null;
 if(entry){
  $('overlay').querySelector('.self-profile').dataset.focusSecret=focusSecret;
  requestAnimationFrame(()=>{if(!entry.isConnected)return;const scroll=entry.closest('.self-scroll');scroll.scrollTop+=entry.getBoundingClientRect().top-scroll.getBoundingClientRect().top-8;entry.focus({preventScroll:true});});
 }
}
function showScoreRules(){modal('调查分数 · '+state.investigation.total+' / 100',rulesContent(state.investigation,esc),'score-modal');}
function searchPermissions(){
 if(lockedQuestion())return;const actor=selected,person=state.people.find(p=>p.id===actor);
 modal('与'+person.name+'商量搜查',`<p class="consent-description">进入客房、翻找房间和检查本人分别征求同意。每次新申请消耗1行动点。</p><div class="consent-actions"><button data-permit="entry-permission">只申请进入客房</button><button data-permit="search-permission">申请进入并搜查客房</button><button data-permit="personal-permission">申请查看随身物品与身体线索</button><button id="force-personal" class="danger">未经同意强行检查（规矩 −${conductPenalties.personal}）</button></div>`,'consent-modal');
 $('overlay').querySelectorAll('[data-permit]').forEach(b=>b.onclick=async()=>{const r=await action({type:b.dataset.permit,actor});if(!r.error)closeModal();});
 $('force-personal').onclick=()=>confirmPersonal(actor);
}
function confirmPersonal(actor){
 modal('仍要强行检查？',`<p class="consent-description">本人会当场制止。调查规矩扣${conductPenalties.personal}分，搜证消耗3行动点，仍需本人同意后才能取得线索。</p><div class="consent-actions"><button id="cancel-force">先征求同意</button><button id="confirm-force" class="danger">确认强行尝试</button></div>`,'consent-modal');
 $('cancel-force').onclick=searchPermissions;$('confirm-force').onclick=async()=>{const r=await action({type:'force-personal',actor});if(!r.error)closeModal();};
}
function showConsent(c){
 const person=state.people.find(p=>p.id===c.actor),personal=c.kind==='personal';
 modal('先征求同意',`<p class="consent-description">${esc(c.title)}需要${esc(person.name)}同意${personal?'查看本人私人物品或展示身体线索':'搜查房间'}。${personal?`强行尝试会被制止，并扣${conductPenalties.personal}分。`:`越界翻找会扣${conductPenalties.search}分。`}</p><div class="consent-actions"><button id="request-consent">${c.near?'向本人申请许可':'先回去找本人商量'}</button>${!personal||c.near?'<button id="force-inspect" class="danger">'+(personal?`仍然强行尝试（−${conductPenalties.personal}）`:`仍然翻找（−${conductPenalties.search}）`)+'</button>':''}</div>`,'consent-modal');
 $('request-consent').onclick=async()=>{if(!c.near){closeModal();toast('可回厅堂找本人，或前往对方所在房间。');return;}const r=await action({type:personal?'personal-permission':'search-permission',actor:c.actor});if(!r.error){closeModal();await inspect(c.id);}};
 $('force-inspect')?.addEventListener('click',async()=>{closeModal();await action({type:'inspect',id:c.id,force:true});});
}

function button(label,act,ico,cls=''){return `<button class="${cls}" data-action="${act}">${ico?icon(ico):''}<span>${label}</span></button>`;}
function renderHud(){
 if(inStartMenu||!state?.self){$('hud').innerHTML='';return;}
 scene?.setConversation(selected);scene?.social.setPaused(!!selected||!!pendingConversation||!!modalName||busy);
 $('hud').innerHTML=`<header class="masthead"><nav class="tools" aria-label="调查工具">${button('故事','story','story')}${button('手记','book','book')}${button('地图','map','map')}${button('回厅堂','gather','home')}${button('设置','settings','gear')}<button class="self-tool" data-action="self" aria-label="我的简介">${portrait(state.people.find(p=>p.id===playerId(state)))}<span>我的简介</span></button></nav></header>${goalsHud(state,esc,sideGoalsOpen)}<div class="people-ribbon" aria-label="人物">${state.people.filter(p=>p.id!==playerId(state)).map(p=>`<button class="person-tab ${p.id===(modalName==='person-sheet'?profileId:selected)?'selected':''} ${p.location===null?'away':''}" data-person="${p.id}" title="${p.name} · ${p.locationLabel}">${portrait(p)}<span>${p.name}</span><i>${p.near?'在身边':p.locationLabel}</i></button>`).join('')}</div><footer class="bottom-tools"><div class="scene-status">${leadHud(state,esc)}${scoreHud(state.investigation,esc)}${actionPointsHud(state.investigation)}</div></footer>`;
 $('hud').querySelectorAll('[data-person]').forEach(b=>b.onclick=()=>startConversation(b.dataset.person));
 $('hud').querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>({story:()=>showIntro(),book:()=>book(),map:()=>map(),settings:()=>settings(),self:()=>showSelf(),gather:async()=>{if(lockedQuestion())return;closeModal();await action({type:'gather'});}}[b.dataset.action]?.()));
 $('score-button')?.addEventListener('click',showScoreRules);$('current-lead')?.addEventListener('click',showLead);$('current-goal')?.addEventListener('click',showSelf);
 $('toggle-side-goals')?.addEventListener('click',()=>{sideGoalsOpen=!sideGoalsOpen;$('toggle-side-goals').setAttribute('aria-expanded',String(sideGoalsOpen));$('hud-side-goals').hidden=!sideGoalsOpen;});
 $('hud').querySelectorAll('[data-self-goal]').forEach(b=>b.onclick=showSelf);
 $('hud').querySelectorAll('[data-side-person]').forEach(b=>b.onclick=()=>showPersonProfile(b.dataset.sidePerson,{focusQuest:true}));
 fitGuidance();
}
function fitGuidance(){
 const guide=$('hud').querySelector('.investigation-guidance');if(!guide)return;
 const dialogue=$('dialogue').querySelector('.rpg-dialogue'),bottom=dialogue?dialogue.getBoundingClientRect().top-10:(window.visualViewport?.height||innerHeight)-120;
 guide.style.maxHeight=Math.max(88,bottom-guide.getBoundingClientRect().top)+'px';
}
function pick(p){if(inStartMenu||!state?.self||modalName||busy)return;if(p.type==='person')startConversation(p.id);else if(p.type==='room')travel(p.id);else if(p.type==='spot')inspect(p.id);}
async function travel(id,force=false){
 if(busy){toast('等这句话说完再离开。');return;}if(lockedQuestion())return;if(id===state.room){toast('你已经在这里。');return;}
 const room=state.rooms.find(r=>r.id===id);if(room?.reserved){toast('这里不在本次调查范围内。');return;}
 if(!room?.accessible&&!force){modal('客房尚未获准进入',`<p class="consent-description">${esc(room?.name)}尚未取得进房许可。可以先找主人商量，直接进入会扣${conductPenalties.entry}分。</p><div class="consent-actions entry-consent-actions"><button id="ask-entry">先去商量</button><button id="force-entry" class="danger">仍然进入（规矩 −${conductPenalties.entry}）</button></div>`,'consent-modal');$('ask-entry').onclick=()=>{closeModal();toast('在对话的“搜查”里向主人申请许可。');};$('force-entry').onclick=()=>travel(id,true);return;}
 closeDialogue();closeModal();await action({type:'travel',room:id,force});
}
function openConversation(id){
 speech.stop();selected=id;
 feedback.play('bubble');
 lastReply=(state.chats[id]||[]).filter(x=>x.who===id).at(-1)?.text||({miyazaki:'早餐还温着。你昨夜……也没睡好吗？',jiang:'你也觉得今天早上不对劲？',player:'你想先核对哪一段？',ishikawa:'有事想问我？',kato:'大家怎么都盯着我？',emi:'我有点冷。你坐过来，好吗？'}[id]);
 lastMode='';renderHud();renderDialogue();
}
function finishPendingConversation(){
 const visit=pendingConversation;if(inStartMenu||!visit||scene?.travelRoom||scene?.entrySpeech||modalName||busy)return;
 pendingConversation=null;
 if(state.people.find(p=>p.id===visit.id)?.near)openConversation(visit.id);else renderHud();
}
async function startConversation(id,options={}){
 if(state.investigation?.challenge&&id!==state.investigation.challenge.actor){lockedQuestion();return;}
 if(id===playerId(state)){showPersonProfile(id);return;}
 if(busy||actionPending){toast('等这一步完成后再换人。');return;}
 const person=state.people.find(p=>p.id===id);if(!person)return;
 closeModal(true);speech.stop();
 const visit={id};pendingConversation=visit;renderHud();
 if(!person.near||state.chatSetting&&state.chatSetting.actor!==id){
  const result=await action({type:'seek-person',actor:id,...options},{quiet:true});
  if(pendingConversation!==visit)return;
  if(result.error){pendingConversation=null;renderHud();return;}
  if(result.visitConsent){pendingConversation=null;showVisitConsent(result.visitConsent);return;}
 }
 selected=null;clearDialogue();renderHud();
 if(scene?.travelRoom)toast(`正在前往${state.people.find(p=>p.id===id).name}身边，到达后开始交谈。`);
 finishPendingConversation();
}
function showVisitConsent(c){
 const person=state.people.find(p=>p.id===c.actor),room=getRoom(c.room);
 modal('先商量进房',`<p class="consent-description">${esc(person.name)}在${esc(room.name)}。${c.host?'先敲门征求进房同意，翻找物件仍需另行商量。':'房间主人不在，暂时无法征求进房同意。'}</p><div class="consent-actions entry-consent-actions">${c.host?'<button id="knock-entry">敲门商量 · 1行动点</button>':''}<button id="visit-force-entry" class="danger">仍然进入（规矩 −${conductPenalties.entry}）</button></div>`,'consent-modal');
 $('knock-entry')?.addEventListener('click',()=>startConversation(c.actor,{knock:true}));
 $('visit-force-entry').onclick=()=>startConversation(c.actor,{force:true});
}

function showPersonProfile(id,{refresh=false,focusQuest=false}={}){
 if(id===playerId(state)){showSelf();return;}
 if(busy){toast('等这句话说完再翻手记。');return;}
 const person=profilePeople().find(p=>p.id===id);if(!person)return;
 if(!refresh&&modalName==='person-sheet'&&profileId===id){if(focusQuest)focusPersonQuest();return;}
 speech.stop();
 if(!refresh)profileTrail.push({name:modalName,id:profileId,nodes:[...$('overlay').childNodes],focus:document.activeElement,scrolls:[...$('overlay').querySelectorAll('*')].filter(e=>e.scrollTop||e.scrollLeft).map(e=>[e,e.scrollTop,e.scrollLeft])});
 profileId=id;
 const dossier=id==='asano'?{biography:'真野是白川的挚友，出发前在家中遇害。关于他与黑泽的接触，还需核实。',related:state.clues.filter(c=>c.id==='asano').map(({id,title,kind})=>({id,title,kind})),conversations:0,shown:0,roomStatus:'不在神社',question:'关于真野的遭遇，还需要向认识他的人求证。'}:state.dossiers?.[id];
 modal(person.name,personSheet(person,dossier,{esc,portrait,icon}),'person-sheet',{keepTrail:true});
 $('overlay').querySelector('.modal-heading').insertAdjacentHTML('afterbegin',`<button id="profile-back" class="profile-back" aria-label="返回上一页">${icon('back')}</button>`);
 $('profile-back').onclick=returnFromProfile;$('profile-back').focus();
 $('overlay').querySelector('.eyebrow').textContent='人物札记';renderHud();
 if(focusQuest)focusPersonQuest();
 $('overlay').querySelectorAll('[data-person-clue]').forEach(button=>button.onclick=()=>showClue(button.dataset.personClue));
 $('finish-sidequest')?.addEventListener('click',async()=>{
  if(busy||actionPending||lockedQuestion())return;
  const button=$('finish-sidequest');button.disabled=true;
  const result=await action({type:'finish-sidequest',actor:id},{quiet:true});
  if(modalName==='person-sheet'&&profileId===id){if(result?.sideQuestResult)showPersonProfile(id,{refresh:true,focusQuest});else button.disabled=false;}
 });
}
function focusPersonQuest(){
 const content=$('overlay').querySelector('.person-sheet-content'),quest=content?.querySelector('.person-quest');if(!quest)return;
 content.prepend(quest);
 requestAnimationFrame(()=>{
  if(!content.isConnected)return;
  content.scrollTop+=quest.getBoundingClientRect().top-content.getBoundingClientRect().top-4;
  quest.tabIndex=-1;quest.focus({preventScroll:true});
 });
}
function returnFromProfile(){
 const previous=profileTrail.pop();
 if(!previous){closeModal(true);return;}
 if(previous.name==='ending-modal'||previous.name==='notebook'&&bookTab==='sidequests'){
  const scroll=previous.scrolls.find(([node])=>node.matches('.sidequest-list,.ending'))?.[1]||0;
  if(previous.name==='ending-modal')showEnding();else book();
  const target=$('overlay').querySelector(previous.name==='ending-modal'?'.ending':'.sidequest-list');if(target)target.scrollTop=scroll;return;
 }
 $('overlay').replaceChildren(...previous.nodes);modalName=previous.name;profileId=previous.id;renderHud();
 for(const [node,top,left]of previous.scrolls){node.scrollTop=top;node.scrollLeft=left;}
 const focus=previous.focus?.isConnected?previous.focus:$('overlay').querySelector('button')||$('speaker-profile');focus?.focus({preventScroll:true});
}
function closeDialogue(){pendingConversation=null;if(state.investigation?.challenge){confirmDismiss();return;}if(busy){toast('等这句话说完再离开。');return;}speech.stop();selected=null;clearDialogue();renderHud();}
function fitChatInput(){
 const input=$('chat-input');if(!input)return;
 input.style.height='0px';input.style.height=Math.min(input.scrollHeight,parseFloat(getComputedStyle(input).maxHeight))+'px';
}
const speechMarkup=text=>esc(text).replace(/（[^）]+）/g,text=>'<em class="speech-action">'+text+'</em>');
function chatBubbles(person,messages){
 const player=state.people.find(p=>p.id===playerId(state));
 const question=state.investigation?.challenge?.actor===person.id?state.investigation.challenge:null;
 return messages.map(line=>{
  if(line.who==='narrator'){
   const reminders=line.challenge===question?.id?question?.reminders:[];
   const links=reminders?.map(title=>{const secret=state.investigation.secrets.find(s=>s.title===title);return secret?`<a href="#self-secret-${esc(secret.id)}" data-self-secret="${esc(secret.id)}">${esc(title)}</a>`:esc(title);}).join('、');
   return `<p class="dialogue-transition" role="note">${esc(line.text)}${links?`<span class="challenge-secrets">要保密：${links}</span>`:''}</p>`;
  }
  const mine=line.who===playerId(state),speaker=mine?player:person;
  return `<article class="chat-row ${mine?'mine':'theirs'} ${line.pending?'pending':''} ${line.live?'live-reply':''}" ${line.live?'id="live-reply"':''} aria-label="${esc(speaker.name)}说"><button class="chat-avatar" data-chat-profile="${speaker.id}" aria-label="查看${speaker.name}的札记">${portrait(speaker)}</button><div class="chat-bubble"><p class="speech">${speechMarkup(line.text)}</p>${line.live?`<small class="reply-state ${line.failed?'interrupted':''}">${line.failed?'回复中断。':line.text?'正在回应…':'想一想…'}</small>${line.failed?'<button type="button" class="retry-reply" id="retry-reply">重试这句话</button>':''}`:''}</div></article>`;
 }).join('');
}
function renderDialogue(){
 if(inStartMenu){clearDialogue();return;}if(!selected)return;const question=state.investigation?.challenge?.actor===selected?state.investigation.challenge:null;const p=state.people.find(x=>x.id===selected);
 const messages=(state.chats[selected]||[]).filter(line=>line.who===playerId(state)||line.who===selected||line.who==='narrator');
 const live=liveReply?.actor===selected&&retry?.requestId===liveReply.requestId?liveReply:null;
 const pending=(busy||live?.failed)&&retry?.actor===selected;
 const revision=`${selected}:${messages.length}:${pending?'pending':'saved'}`;
 const previous=$('dialogue-thread'),scrollTop=previous?.scrollTop||0,followEnd=!previous||previous.dataset.revision!==revision;
 const shown=messages.length?[...messages]:[{who:selected,text:lastReply}];
 if(pending){shown.push({who:playerId(state),text:retry.message,pending:true});shown.push({who:selected,text:live?.text||'',live:true,failed:live?.failed});}
 disconnectDialogueFrame?.();
 $('dialogue').innerHTML=`<section class="rpg-dialogue ${question?'being-questioned':''}" aria-label="与${p.name}交谈">
  <svg class="dialogue-frame" aria-hidden="true" focusable="false"></svg>
  <header class="dialogue-header"><button class="speaker-portrait" id="speaker-profile" aria-label="查看${p.name}的人物资料">${portrait(p)}</button><span class="speaker-badge">${speakerBadge}<strong>${p.name}</strong></span><span class="dialogue-place">${state.room==='hall'?(state.chatSetting?.actor===selected?'窗边 · 私下交谈':'厅堂 · 公开交谈'):'客房 · 私下交谈'}</span><div class="voice-tools" role="group" aria-label="语音工具"><span id="voice-status" role="status" aria-live="polite"></span><button type="button" class="mic-button" id="mic" aria-label="语音输入" title="语音输入：转文字后点说出">${dialogueGlyph('voice')}</button><button type="button" id="replay-voice" aria-label="重听人物回答" title="重听人物回答">${dialogueGlyph('replay')}</button><button type="button" id="voice-conversation" aria-label="语音对话" title="语音对话" aria-pressed="false">${dialogueGlyph('listen')}</button></div><button class="close-dialogue" aria-label="${question?'结束反问，可信度扣3分':'关闭对话'}" title="${question?'结束反问，可信度扣3分':'关闭对话'}">${icon('close')}</button></header>
  <div class="dialogue-thread" id="dialogue-thread" data-revision="${revision}" role="log" aria-label="与${p.name}的对话" aria-live="polite" aria-relevant="additions text" tabindex="0">${chatBubbles(p,shown)}</div>
  <form id="chat-form"><textarea id="chat-input" rows="1" maxlength="800" aria-label="想问的话" placeholder="${question?'回应对方的盘问…':'想问些什么？'}" ${busy?'disabled':''}>${esc(busy?'':draft)}</textarea><button class="send-button" type="submit" ${busy?'disabled':''} aria-label="发送" title="说出这句话"><span>说出</span>${dialogueGlyph('say')}</button></form>
  <nav class="dialogue-actions" aria-label="交谈行动"><button id="show-evidence" title="出示线索" aria-label="出示线索">${dialogueGlyph('evidence')}<span>出示</span></button>${question?challengeBanner(question,esc):`<button id="search-room" title="搜查客房" aria-label="搜查客房">${dialogueGlyph('search')}<span>搜查</span></button><button id="private-talk" title="${state.room==='hall'?(state.chatSetting?.actor===selected?'回桌边公开交谈':'去角落私谈'):'回到厅堂'}" aria-label="${state.room==='hall'?(state.chatSetting?.actor===selected?'回桌边公开交谈':'去角落私谈'):'回到厅堂'}">${dialogueGlyph('private')}<span>${state.room==='hall'?(state.chatSetting?.actor===selected?'回桌边':'私谈'):'回厅堂'}</span></button><button id="ask-person" title="向当前人物问起其他人" aria-label="向当前人物问起其他人">${dialogueGlyph('people')}<span>问人</span></button>`}<button id="person-notes" title="查看人物札记" aria-label="查看人物札记">${dialogueGlyph('notes')}<span>札记</span></button></nav>
 </section>`;
 $('dialogue').querySelector('.close-dialogue').onclick=closeDialogue;$('chat-input').oninput=e=>{speech.stop();draft=e.target.value;localStorage.setItem(storageKey('mystery-draft'),draft);fitChatInput();};$('chat-input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();sendChat();}};$('chat-form').onsubmit=e=>{e.preventDefault();sendChat();};$('mic').onclick=()=>speech.toggleInput();
 $('voice-conversation').onclick=()=>speech.toggleConversation();
 $('replay-voice').onclick=()=>{if(speech.snapshot().speaking){speech.stop();return;}speech.stop();speech.reply(lastReply,selected,{force:true});};
 $('retry-reply')?.addEventListener('click',()=>{if(retry)sendChat(retry.resolution,retry.message===draft.trim()?undefined:retry.message);});
 $('speaker-profile').onclick=$('person-notes').onclick=()=>showPersonProfile(selected);
 $('dialogue').querySelectorAll('[data-self-secret]').forEach(link=>link.onclick=e=>{e.preventDefault();showSelf({focusSecret:link.dataset.selfSecret});});
 $('show-evidence').onclick=()=>evidencePicker();$('search-room')?.addEventListener('click',searchPermissions);$('private-talk')?.addEventListener('click',()=>action({type:state.room==='hall'?(state.chatSetting?.actor===selected?'public-talk':'private-corner'):'gather',actor:selected}));$('ask-person')?.addEventListener('click',personQuestionPicker);$('dialogue').querySelectorAll('.dialogue-actions button').forEach(b=>b.disabled=busy||!!question&&!['show-evidence','person-notes'].includes(b.id));
 if(question){$('dialogue').querySelector('.close-dialogue').disabled=busy;$('concede-question').disabled=busy;$('concede-question').onclick=confirmConcede;$('dismiss-question').disabled=busy;$('dismiss-question').onclick=confirmDismiss;}
 fitChatInput();
 renderVoice();
 fitGuidance();
 const thread=$('dialogue-thread'),unbindFrame=bindDialogueFrame($('dialogue').querySelector('.rpg-dialogue'));
 let atEnd=followEnd;
 const restoreScroll=()=>{thread.scrollTop=followEnd?thread.scrollHeight:scrollTop;atEnd=thread.scrollHeight-thread.clientHeight-thread.scrollTop<24;};
 restoreScroll();requestAnimationFrame(()=>{if(thread.isConnected)restoreScroll();});
 thread.onscroll=()=>{atEnd=thread.scrollHeight-thread.clientHeight-thread.scrollTop<24;};
 const observer=new ResizeObserver(()=>{if(atEnd)thread.scrollTop=thread.scrollHeight;});observer.observe(thread);
 disconnectDialogueFrame=()=>{unbindFrame();observer.disconnect();};
}
function confirmDismiss(){
 if(busy||actionPending)return;
 modal('结束这轮反问？','<p>可信度扣3分，消耗1行动点。对方会记下这个疑问，你可以继续调查。</p><div class="consent-actions"><button id="keep-answering">继续作答</button><button id="end-question">结束反问（可信度 −3）</button></div>','consent-modal');
 $('keep-answering').onclick=closeModal;$('end-question').onclick=()=>{closeModal();sendChat('dismiss');};
}
function confirmConcede(){
 modal('承认有所隐瞒？','<p class="consent-description">对方会记下你回避了这个问题，可信度扣3分，本轮盘问结束。具体秘密仍由你保留。</p><div class="consent-actions"><button id="keep-answering">继续作答</button><button id="admit-concealment">承认隐瞒并接受扣分</button></div>','consent-modal');
 $('keep-answering').onclick=closeModal;$('admit-concealment').onclick=()=>{closeModal();sendChat('concede');};
}
async function sendChat(resolution,questionText){
 const directQuestion=typeof questionText==='string',originalDraft=draft;
 if(busy||actionPending||!selected||!resolution&&!(directQuestion?questionText:draft).trim())return;
 feedback.play('bubble');
 const question=state.investigation?.challenge,message=resolution==='dismiss'?'这个问题先到这里，我要继续调查。':resolution?'这件事我有所隐瞒，现在还不愿把它说出来。':(directQuestion?questionText:draft).trim(),actor=selected;
 if(!retry||retry.actor!==actor||retry.message!==message||retry.resolution!==resolution)retry={actor,message,requestId:crypto.randomUUID(),challengeId:question?.id,resolution};
 const voiceTurn=speech.beforeSend();liveReply={actor,requestId:retry.requestId,text:'',failed:false};busy=true;renderDialogue();
 try{
  const r=await streamChat({...retry,slotToken:state.slotToken},text=>{
   liveReply.text=text;speech.partial(text,actor,{turn:voiceTurn});syncCharacterPerformance();
   const row=$('live-reply'),thread=$('dialogue-thread');if(!row||!thread)return;
   const follow=thread.scrollHeight-thread.clientHeight-thread.scrollTop<24;
   row.querySelector('.speech').innerHTML=speechMarkup(text);row.querySelector('.reply-state').textContent='正在回应…';
   if(follow)thread.scrollTop=thread.scrollHeight;
  });
  lastReply=r.speech;lastMode='';draft=directQuestion?originalDraft:'';if(draft)localStorage.setItem(storageKey('mystery-draft'),draft);else localStorage.removeItem(storageKey('mystery-draft'));retry=null;liveReply=null;busy=false;apply(r.state);speech.reply(r.speech,actor,{turn:voiceTurn});
 }catch(e){busy=false;liveReply.failed=true;speech.failed();renderDialogue();toast(e.name==='TimeoutError'?'回复等待超时，输入已保留，可以重试。':e.message);}
}
function syncCharacterPerformance(){
 if(!scene||!selected)return;
 const live=liveReply?.actor===selected?liveReply:null,text=busy?(live?.text||''):(state.chats[selected]||[]).filter(l=>l.who===selected).at(-1)?.text||lastReply;
 scene.setDialoguePerformance({text,thinking:busy&&!live?.text,voiceSpeaking:speech.snapshot().speaking,voiceLevel:speech.level,questioning:state.investigation?.challenge?.actor===selected,paused:!!modalName||document.hidden});
}
function renderVoice(){
 const v=speech.snapshot();music.setVoiceState(v);feedback.setVoiceState(v);syncCharacterPerformance();
 const mic=$('mic'),button=$('voice-conversation'),status=$('voice-status'),replay=$('replay-voice');if(!mic||!button||!status)return;
 const continuous=v.mode==='conversation',listening=['starting','listening','finishing'].includes(v.phase);
 mic.disabled=busy||!v.inputAvailable;mic.classList.toggle('recording',listening);mic.setAttribute('aria-pressed',String(listening));mic.setAttribute('aria-label',listening?'停止语音输入':'语音输入');mic.title=listening?'停止语音输入':'语音输入：转文字后点说出';
 button.disabled=!continuous&&(busy||!v.conversationAvailable);button.setAttribute('aria-pressed',String(continuous));button.setAttribute('aria-label',continuous?'结束语音对话':'语音对话');
 button.title=continuous?'结束语音对话':v.conversationAvailable?'语音对话：说完自动发送，回答后继续听':'此浏览器暂未提供完整语音功能';
 status.textContent=v.phase==='starting'?'等待麦克风…':v.phase==='finishing'?'正在整理这句话…':continuous?({listening:'正在听，说完会自动发送',thinking:'等对方回答…',speaking:'正在朗读，随后继续听',idle:'准备继续听…'}[v.phase]):listening?'正在听，文字可修改后说出':v.speaking?'正在朗读…':!v.inputAvailable?'可用键盘上的语音输入':'语音输入转文字，点说出发送';
 replay.disabled=busy&&!v.speaking||!v.outputAvailable||!lastReply;replay.setAttribute('aria-pressed',String(v.speaking));replay.setAttribute('aria-label',v.speaking?'停止朗读':'重听人物回答');replay.title=v.speaking?'停止朗读':'重听人物回答';
}
function modal(title,body,cls='',{keepTrail=false}={}){speech.stop();pendingConversation=null;disconnectMap?.();disconnectMap=null;if(!keepTrail){profileTrail=[];profileId=null;}modalName=cls||title;scene?.social.setPaused(true);$('overlay').classList.toggle('menu-active',inStartMenu);$('overlay').innerHTML=`${inStartMenu?menuSceneryMarkup:''}<div class="veil"><section class="paper-modal ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="modal-heading"><div><span class="eyebrow">${inStartMenu?'青苔镇':esc(state?.self?.name||'雾灯未眠')+'的手记'}</span><h2>${title}</h2></div><button id="close-modal" aria-label="关闭">${icon('close')}</button></header>${body}</section></div>`;menuScenery.setActive(inStartMenu&&cls==='start-menu');$('close-modal').onclick=closeModal;$('overlay').querySelector('.veil').onclick=e=>{if(e.target.classList.contains('veil'))closeModal();};$('close-modal').focus();}
function closeModal(force=false){if(inStartMenu){if(modalName==='start-menu')return;if(modalName==='role-picker'){showScripts();return;}showMainMenu();return;}if(modalName==='opening-modal'&&state.briefing?.current&&force!==true){toast('听完这一轮口述后，就可以开始调查。');return;}if(modalName==='person-sheet'&&force!==true){returnFromProfile();return;}if(modalName==='storybook'&&force!==true){finishStory();return;}const returnSecret=modalName==='self-profile'?$('overlay').querySelector('.self-profile')?.dataset.focusSecret:null;disconnectMap?.();disconnectMap=null;modalName=null;profileId=null;profileTrail=[];$('overlay').innerHTML='';renderHud();if(returnSecret)[...$('dialogue').querySelectorAll('[data-self-secret]')].find(link=>link.dataset.selfSecret===returnSecret)?.focus({preventScroll:true});}
async function finishStory(){
 if(storyTurning)return;if(!state.started){const r=await action({type:'start'});if(r?.error)return;}
 localStorage.setItem(storageKey(storySeenKey),'1');closeModal(true);if(state.briefing?.current)showOpening();
}
function showIntro(index=0){
 if(busy){toast('等这句话说完再翻书。');return;}storyPage=index;drawStory();
}
function drawStory(direction=0){
 clearTimeout(toastTimer);$('toast').classList.remove('show');
 const last=storyPage===state.storyPages.length-1;
 modal('雾灯未眠',storySpread(state.storyPages[storyPage],{portrait,cast,esc})+`<footer class="story-navigation"><button id="story-prev" ${storyPage===0?'disabled':''} aria-label="上一页">${icon('back')}<span>上一页</span></button><span class="story-page-number" aria-live="polite">${storyPage+1} / ${state.storyPages.length}</span><button id="story-next" class="${last?'primary':''}" aria-label="${last?(state.started?'合上故事册':'开始调查'):'下一页'}"><span>${last?(state.started?'合上故事册':'开始调查'):'下一页'}</span>${icon(last&&state.started?'close':'arrow')}</button></footer>`,'storybook');
 $('overlay').querySelector('.eyebrow').textContent='前情 · 百物语之夜';
 $('story-prev').onclick=()=>turnStory(-1);$('story-next').onclick=()=>last?finishStory():turnStory(1);$('close-modal').setAttribute('aria-label','合上故事册');
 const paper=$('overlay').querySelector('.story-spread');if(direction)paper.classList.add(direction>0?'page-forward':'page-back');
 let startX=0,startY=0;paper.onpointerdown=e=>{startX=e.clientX;startY=e.clientY;};paper.onpointerup=e=>{const dx=e.clientX-startX,dy=e.clientY-startY;if(Math.abs(dx)>75&&Math.abs(dy)<45)turnStory(dx<0?1:-1);};
 $('story-next').focus();
}
function turnStory(direction){if(storyTurning)return;const next=storyPage+direction;if(next<0||next>=state.storyPages.length)return;storyTurning=true;storyPage=next;drawStory(direction);setTimeout(()=>{storyTurning=false;},280);}

async function inspect(id){const r=await action({type:'inspect',id});return r;}
function clueDetails(c){return `<div class="evidence-detail"><span class="evidence-stamp">${c.kind}</span><div class="clue-drawing">${icon(c.kind==='文书'||c.kind==='记忆'?'book':c.kind==='证词'?'gather':'search')}</div><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p><div class="paper-rule"></div><small>已收进调查手记。</small></div>`;}
function showClue(id){const c=state.clues.find(c=>c.id===id);if(!c)return;modal('记下一条线索',clueDetails(c)+`<div class="modal-foot">${selected?'<button class="primary" id="present-now">出示给'+state.people.find(p=>p.id===selected).name+'</button>':'<button class="primary" id="keep-clue">收进手记 '+icon('check')+'</button>'}<button id="open-book">翻看手记</button></div>`,'clue-modal');$('keep-clue')?.addEventListener('click',closeModal);$('present-now')?.addEventListener('click',async()=>{await action({type:'present',actor:selected,id},{quiet:true});draft=`这${c.kind==='证词'?'段话':'件东西'}，你怎么解释？`;closeModal();renderDialogue();toast('线索已出示，可以接着问。');});$('open-book').onclick=()=>{selectedClue=id;book();};}
function evidencePicker(){modal('拿什么问？',`<p class="compact-description">出示后，你可以用自己的话追问。</p><div class="evidence-picker">${state.clues.map(c=>`<button data-present="${c.id}"><span>${icon(c.kind==='证词'?'gather':'book')}</span><strong>${esc(c.title)}</strong><small>${c.kind}</small></button>`).join('')}</div>`,'picker-modal');$('overlay').querySelectorAll('[data-present]').forEach(b=>b.onclick=async()=>{const id=b.dataset.present;const r=await action({type:'present',actor:selected,id},{quiet:true});if(!r?.error){draft=`关于「${state.clues.find(c=>c.id===id).title}」，你知道些什么？`;closeModal();renderDialogue();toast(r.message||'线索已出示。');}});}
function personQuestionPicker(){
 if(busy||actionPending||!selected)return;speech.stop();
 const speaker=state.people.find(p=>p.id===selected),people=state.people.filter(p=>p.id!==playerId(state)&&p.id!==selected);
 modal('问起谁？',`<div class="person-inquiry-grid">${people.map(p=>`<button data-ask-person="${p.id}">${portrait(p)}<span><strong>${esc(p.name)}</strong><small>${esc(p.knownIdentity||p.role)}</small></span></button>`).join('')}</div><footer class="modal-foot person-inquiry-foot"><button id="chat-history">谈话记录</button></footer>`,'person-inquiry');
 $('overlay').querySelector('.eyebrow').textContent='向'+speaker.name+'询问';
 $('chat-history').onclick=history;
 $('overlay').querySelectorAll('[data-ask-person]').forEach(button=>button.onclick=()=>{
  if(busy||actionPending||selected!==speaker.id)return;
  const target=people.find(p=>p.id===button.dataset.askPerson);if(!target)return;
  draft=`关于「${target.name}」，你知道些什么？`;
  localStorage.setItem(storageKey('mystery-draft'),draft);
  closeModal();renderDialogue();
  $('chat-input').focus({preventScroll:true});$('chat-input').setSelectionRange(draft.length,draft.length);
 });
}

function openClueMention(ids){
 if(busy){toast('等这句话说完再翻线索。');return;}
 const cards=state.clues.filter(c=>ids.includes(c.id));if(!cards.length)return;
 if(cards.length===1){showClue(cards[0].id);return;}
 modal('你说的是哪一件？',`<div class="evidence-picker">${cards.map(c=>`<button data-clue-choice="${c.id}">${icon('evidence')}<strong>${esc(c.title)}</strong><small>${esc(c.kind)}</small></button>`).join('')}</div>`,'picker-modal');
 $('overlay').querySelectorAll('[data-clue-choice]').forEach(button=>button.onclick=()=>showClue(button.dataset.clueChoice));
}
function history(){const p=state.people.find(x=>x.id===selected);modal('与'+p.name+'的交谈',`<div class="chat-archive">${chatBubbles(p,state.chats[selected]||[])||'<p class="empty">还没有说上话。</p>'}</div>`,'history-modal');}
function showPublicReactions(id,round=null,loading=false){
 const clue=state.clues.find(c=>c.id===id);if(!clue)return;
 const reactions=round?.reactions||state.people.filter(p=>p.id!==playerId(state)&&p.near).map(p=>({actor:p.id,status:'pending'}));
 const rows=reactions.map(reaction=>{
  const person=state.people.find(p=>p.id===reaction.actor),done=reaction.status==='done';
  return `<article class="public-reaction" data-reaction-person="${person.id}">${portrait(person)}<div><header><strong>${esc(person.name)}</strong>${done?`<button data-follow-reaction="${person.id}" ${loading?'disabled':''}>追问</button>`:''}</header>${done?`<p class="reaction-action">（${esc(reaction.action)}）</p>${reaction.speech?`<p class="reaction-speech">${esc(reaction.speech)}</p>`:''}`:`<p class="reaction-pending" role="status">${loading?'…':'暂未取得回应'}</p>`}</div></article>`;
 }).join('');
 modal('众人的反应',`<div class="public-item">${icon('evidence')}<div><strong>${esc(clue.title)}</strong><p>${esc(clue.text)}</p></div></div><div class="public-reaction-list">${rows}</div><footer class="modal-foot public-reaction-foot">${!loading&&reactions.some(r=>r.status!=='done')?'<button id="retry-reactions">重试未完成的回应</button>':''}<button class="primary" id="leave-reactions">${loading?'先合上':'继续调查'}</button></footer>`,'public-reactions');
 $('overlay').querySelector('.eyebrow').textContent=loading?'厅堂 · 公开物品':'厅堂 · 公开记录';
 $('leave-reactions').onclick=closeModal;
 $('retry-reactions')?.addEventListener('click',()=>publishClue(id,true));
 $('overlay').querySelectorAll('[data-follow-reaction]').forEach(button=>button.onclick=()=>{
  const person=state.people.find(p=>p.id===button.dataset.followReaction);
  draft=`关于「${clue.title}」，你刚才的反应是什么意思？`;localStorage.setItem(storageKey('mystery-draft'),draft);startConversation(person.id);
 });
}
async function publishClue(id,retryFailed=false){
 if(lockedQuestion())return;
 if(busy){toast('等这句话说完再公开。');return;}
 const saved=state.publicReactions?.[id];
 if(saved&&!retryFailed){showPublicReactions(id,saved);return;}
 if(state.room!=='hall'){toast('回到厅堂后再公开线索。');return;}
 if(!state.people.some(p=>p.id!==playerId(state)&&p.near)){toast('厅堂里暂时没人，可以先请大家回来。');return;}
 if(selected)closeDialogue();busy=true;renderHud();showPublicReactions(id,saved,true);
 try{
  const result=await api('action',{type:'share',id,retryFailed});busy=false;apply(result.state);
  if(modalName==='public-reactions')showPublicReactions(id,result.round);
 }catch(error){
  busy=false;renderHud();
  if(modalName==='public-reactions')showPublicReactions(id,saved||null);
  toast(error.message);
 }
}
function book(){
 if(!state.clues.some(c=>c.id===selectedClue))selectedClue=state.clues[0]?.id;
 const tabs=[['clues','线索'],['people','人物'],['sidequests','支线'],['opening','口述'],['notes','随记'],['case','推断']];
 let body='';
 if(bookTab==='clues'){
 const items=state.clues.filter(c=>bookFilter==='全部'||(bookFilter==='证词'?['证词','记忆','事件'].includes(c.kind):!['证词','记忆','事件'].includes(c.kind)));
 let c=items.find(x=>x.id===selectedClue)||items[0];if(c)selectedClue=c.id;
 body=`<div class="notebook-pages"><div class="notebook-index"><div class="filter-tabs">${['全部','物证','证词'].map(t=>`<button data-filter="${t}" class="${t===bookFilter?'active':''}">${t}</button>`).join('')}</div><div class="clue-index">${items.map(x=>`<button data-clue="${x.id}" class="${x.id===selectedClue?'active':''}"><span class="index-mark">${x.public?'✳':'·'}</span><span>${esc(x.title)}</span><small>${x.kind}</small></button>`).join('')}</div><span class="page-number">已记下 ${state.clues.length} 条</span></div><div class="notebook-detail">${c?clueDetails(c):'<p>这一页还是空的。</p>'}<div class="clue-commands">${c?'<button id="share-clue">'+(state.publicReactions?.[c.id]?'查看公开反应':'在厅堂公开')+'</button>':''}${state.flags.canCombineMask&&!state.flags.mask?'<button id="craft-mask" class="primary">按配方制作</button>':''}${state.flags.canCombineJade&&!state.clues.some(c=>c.id==='jade-map')?'<button id="join-jade">拼合玉珏</button>':''}</div></div></div>`;
 }else if(bookTab==='people'){body=`<div class="people-pages">${state.people.map(p=>`<button data-profile="${p.id}">${portrait(p)}<div><h3>${p.name}</h3><span>${p.knownIdentity||p.role}</span><p>${p.id===playerId(state)?esc(state.self.openingTitle):p.near?'此刻与你在同一处。':p.locationLabel}</p><small>谈话 ${(state.chats[p.id]||[]).filter(l=>l.who===playerId(state)).length} 次</small></div></button>`).join('')}</div>`;
 }else if(bookTab==='sidequests'){body=sideQuestOverview(state,esc);
 }else if(bookTab==='opening'){body=`<div class="opening-records"><h3>厅堂里的第一轮口述</h3><p class="score-note">各人的自述尚待核实。后续对话仍保存在各自的谈话记录中。</p>${state.briefing?.records?.length?state.briefing.records.map(line=>`<article><strong>${esc(state.people.find(p=>p.id===line.actor).name)}</strong><p>${esc(line.text)}</p></article>`).join(''):'<p>这份调查在开场口述加入前已经开始。沿用原有对话与线索，不补写过去的发言。</p>'}</div>`;
 }else if(bookTab==='notes'){body=`<div class="notes-page"><textarea id="notes" aria-label="调查随记" maxlength="5000" placeholder="谁的说法对不上？把你的猜测写在这里。">${esc(state.notes)}</textarea><button class="primary" id="save-notes">记下来</button><div class="event-list">${state.events.slice(-12).reverse().map(e=>`<p class="${e.kind==='ambient'?'natural-text':''}">${esc(e.text)}</p>`).join('')}</div></div>`;
 }else{body=`<div class="case-page"><h3>同一张脸，几段不同的经历</h3><p>遗骸是谁？谁真正造成了死亡？把毒针、短刃和茶杯放回各自的时间。</p><div class="deduction-lines"><div><span>${state.flags.body?icon('check'):'○'}</span>找到遗骸</div><div><span>${state.flags.revealed?'✓':'○'}</span>核实易容与身份</div><div><span>${state.clues.some(c=>c.id==='memory-ring')?'✓':'○'}</span>查明戒指的用途</div><div><span>${state.clues.some(c=>c.id==='cloth')?'✓':'○'}</span>核对现场血迹</div><div><span>${['miyazaki-statement','ishikawa-statement','emi-statement'].every(id=>state.clues.some(c=>c.id===id))?'✓':'○'}</span>核对三人的行凶供述</div><div><span>${['poison-book','cold-brazier','chronicle'].every(id=>state.clues.some(c=>c.id===id))?'✓':'○'}</span>查阅毒物、火盆与神社旧册</div></div>${!state.flags.canAccuse&&!state.ending?`<p class="fine-print">下一条待查：${esc(state.lead.text)}</p>`:''}<div class="case-actions">${state.flags.canReveal&&!state.flags.revealed?`<button class="primary" id="reveal-mask">${state.playerId==='ishikawa'?'当众摘下面具 · 身份暴露扣5分':state.playerId==='jiang'?'当面指出伪装的接缝':'请森川介当面核实'}</button>`:''}<button class="primary" id="accuse-form">向大家说明推断</button>${state.ending?'<button id="read-ending">重读结局</button>':''}</div><p class="fine-print">没有把握时，可以继续调查。猜测不会自动成为事实。</p></div>`;}
 modal('调查手记',`<nav class="book-tabs">${tabs.map(([id,label])=>`<button data-tab="${id}" class="${id===bookTab?'active':''}">${label}</button>`).join('')}</nav>${body}`,'notebook');
 $('overlay').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{bookTab=b.dataset.tab;book();});$('overlay').querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{bookFilter=b.dataset.filter;book();});$('overlay').querySelectorAll('[data-clue]').forEach(b=>b.onclick=()=>{selectedClue=b.dataset.clue;book();});
 $('overlay').querySelectorAll('[data-profile]').forEach(b=>b.onclick=()=>showPersonProfile(b.dataset.profile,{focusQuest:b.classList.contains('quest-person')}));
 $('share-clue')?.addEventListener('click',()=>publishClue(selectedClue));$('craft-mask')?.addEventListener('click',()=>action({type:'combine',id:'mask'}));$('join-jade')?.addEventListener('click',()=>action({type:'combine',id:'jade-map'}));$('save-notes')?.addEventListener('click',async()=>{await action({type:'notes',text:$('notes').value});toast('记好了。');});$('reveal-mask')?.addEventListener('click',()=>action({type:'reveal'}));$('accuse-form')?.addEventListener('click',accusation);$('read-ending')?.addEventListener('click',showEnding);
}
function map(){
 let snapshot;try{snapshot=scene?.captureMap();}catch(e){console.error('Map capture failed',e);}
 modal('灯守神社 · 地点与事件',mapContent(state,snapshot,esc),'map-modal panorama-modal');
 disconnectMap=positionMapPins($('overlay').querySelector('.panorama-picture'));
 $('overlay').querySelectorAll('[data-map-room]').forEach(b=>b.onclick=()=>travel(b.dataset.mapRoom));
 $('rest').onclick=async()=>{if(lockedQuestion()||busy)return;closeDialogue();const r=await action({type:'travel',room:state.self.homeRoom});if(!r.error){await action({type:'rest'});closeModal();}};
}
function puzzle(p){let path=[];const xy=[[25,25],[75,25],[75,75],[25,75]];const render=()=>{const used=new Set(path.slice(1).map((n,i)=>[path[i],n].sort().join('-')));modal('人偶的机关',`<p class="compact-description">${p.text}</p><div class="puzzle"><svg viewBox="0 0 100 100">${p.edges.map(([a,b])=>`<line x1="${xy[a][0]}" y1="${xy[a][1]}" x2="${xy[b][0]}" y2="${xy[b][1]}" class="${used.has([a,b].sort().join('-'))?'traced':''}"/>`).join('')}</svg>${xy.map(([x,y],i)=>`<button data-node="${i}" style="left:${x}%;top:${y}%" class="${path.at(-1)===i?'active':''}">${i+1}</button>`).join('')}</div><div class="modal-foot"><span>已连 ${used.size} / 5 条</span><button id="reset-puzzle">重新连</button><button id="solve-puzzle" class="primary">打开底座</button></div>`,'puzzle-modal');$('overlay').querySelectorAll('[data-node]').forEach(b=>b.onclick=()=>{const n=+b.dataset.node;if(path.length&&(!p.edges.some(([a,b])=>[a,b].sort().join('-')===[path.at(-1),n].sort().join('-'))||used.has([path.at(-1),n].sort().join('-')))){toast('这条刻线走过了，或者两点之间没有刻线。');return;}if(path.length<6)path.push(n);render();});$('reset-puzzle').onclick=()=>{path=[];render();};$('solve-puzzle').onclick=()=>action({type:'inspect',id:p.id,path});};render();}
function accusation(){const options=state.people.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');modal('把这一夜说清楚',`<form id="verdict" class="verdict-form"><label>铜炉中的遗骸属于谁？<select name="victim"><option value="">选择人物</option>${options}</select></label><label>谁造成了最初的死亡？<select name="culprit"><option value="">选择人物</option>${options}</select></label><label>真正致死的方式<select name="method"><option value="">选择方式</option><option value="tea">茶中下毒</option><option value="knife">短刃刺伤</option><option value="needle">戒指毒针</option><option value="pin">发簪刺伤</option></select></label><label>毒针、短刃与茶杯的先后<select name="order"><option value="">排列先后</option><option value="needle-knife-tea">毒针 → 短刃 → 茶杯</option><option value="knife-needle-tea">短刃 → 毒针 → 茶杯</option><option value="tea-knife-needle">茶杯 → 短刃 → 毒针</option></select></label><fieldset><legend>${esc(state.self.finalQuestion)}</legend><label><input type="radio" name="choice" value="keep" checked> ${esc(state.self.finalChoices.keep)}</label><label><input type="radio" name="choice" value="reveal"> ${esc(state.self.finalChoices.reveal)}</label></fieldset><button class="primary" type="submit">说出推断</button></form>`,'verdict-modal');$('verdict').onsubmit=async e=>{e.preventDefault();const fields=Object.fromEntries(new FormData(e.target));await action({type:'accuse',...fields});};}
function showEnding(){$('toast').classList.remove('show');const e=state.ending;if(!e)return;modal(e.title,`<div class="ending"><span class="case-closed">此案已记 · ${state.investigation.total} / 100 分</span>${state.investigation.legacy?'<p class="score-note">本档中途启用评分，过去的行为未追扣。</p>':''}<p>${esc(e.text).replace(/\n/g,'</p><p>')}</p><div class="paper-rule"></div><p class="epilogue">${esc(e.epilogue)}</p><section class="ending-personal"><h3>我的支线</h3>${state.investigation.goals.filter(g=>g.kind==='支线').map(g=>`<p><strong>${esc(g.title)}</strong> · ${g.done?'已作决定':'待完成'}<br>${esc(g.result||g.text)}</p>`).join('')}<button id="ending-self">查看我的目标</button></section>${sideQuestOverview(state,esc,true)}<small>此处为单人改编版结局。</small><div class="modal-foot"><button id="return-case">继续翻看手记</button></div></div>`,'ending-modal');$('ending-self').onclick=showSelf;$('return-case').onclick=()=>{bookTab='clues';book();};$('overlay').querySelectorAll('[data-profile]').forEach(b=>b.onclick=()=>showPersonProfile(b.dataset.profile,{focusQuest:b.classList.contains('quest-person')}));}
async function resetCurrentRole(){
 if(busy||actionPending){toast('等当前这一步完成后再重新开始。');return;}
 const slot=state.slotToken,role=playerId(state),confirm=$('confirm-reset'),cancel=$('cancel-reset');
 actionPending=true;confirm.disabled=true;cancel.disabled=true;speech.stop();
 try{
  let result;
  try{result=await api('reset',{confirm:'new-case'});}
  catch(error){
   // A lost reset reply must not leave this page using the retired slot token.
   let current;try{current=await api('state');}catch{}
   if(!current||current.roleSelection||current.slotToken===slot||playerId(current)!==role||current.started)throw error;
   result={state:current};
  }
  localStorage.removeItem(storageKey('mystery-interrupted'));localStorage.removeItem(storageKey('mystery-draft'));
  draft='';selected=null;lastReply='';retry=null;actionRetry=null;storyTurning=false;
  clearDialogue();apply(result.state);scene?.focus(state.room);showIntro();
 }catch(error){toast(error.message);}
 finally{actionPending=false;if(confirm.isConnected){confirm.disabled=false;cancel.disabled=false;}}
}
function settings(){
 const soundtrack=music.snapshot(),effects=feedback.snapshot();
 modal('设置',`<div class="settings"><label><span>背景音乐</span><input id="music-toggle" type="checkbox" ${soundtrack.enabled?'checked':''}></label><label class="music-volume" for="music-volume"><span>音乐音量</span><output id="music-volume-value" for="music-volume">${Math.round(soundtrack.volume*100)}%</output><input id="music-volume" type="range" min="0" max="100" step="5" value="${Math.round(soundtrack.volume*100)}" ${soundtrack.enabled?'':'disabled'} aria-label="音乐音量"></label><label><span>交互音效</span><input id="effects-toggle" type="checkbox" ${effects.enabled?'checked':''}></label><label><span>轻微震动</span><input id="haptics-toggle" type="checkbox" ${effects.haptics?'checked':''}></label><label><span>朗读人物台词</span><input id="read-toggle" type="checkbox" ${voice?'checked':''}></label><div class="settings-actions">${inStartMenu?'<button id="settings-back" class="menu-return">'+icon('back')+'<span>返回开始菜单</span></button>':'<button id="return-menu" class="menu-return">'+icon('back')+'<span>返回开始菜单</span></button><button id="new-game" class="danger"><span>重开当前主角</span></button>'}</div></div>`,'settings-modal');
 $('music-toggle').onchange=e=>{music.setEnabled(e.target.checked);$('music-volume').disabled=!e.target.checked;};
 $('music-volume').oninput=e=>{music.setVolume(Number(e.target.value)/100);$('music-volume-value').textContent=e.target.value+'%';};
 $('effects-toggle').onchange=e=>feedback.setEnabled(e.target.checked);
 $('haptics-toggle').onchange=e=>feedback.setHaptics(e.target.checked);
 $('read-toggle').onchange=e=>{voice=e.target.checked;localStorage.setItem('mystery-read',voice?'1':'0');if(!voice)speech.stop();};
 if(inStartMenu){$('settings-back').onclick=showMainMenu;return;}
 $('return-menu').onclick=openStartMenu;
 $('new-game').onclick=()=>{modal('重新翻开这一页？','<p>只清空当前主角的调查、对话和手记；其他五人的进度保留。</p><div class="modal-foot"><button id="cancel-reset">留下这份记录</button><button id="confirm-reset" class="danger">重新开始</button></div>','reset-modal');$('cancel-reset').onclick=closeModal;$('confirm-reset').onclick=resetCurrentRole;};
}
window.addEventListener('keydown',e=>{if(modalName==='storybook'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();turnStory(e.key==='ArrowRight'?1:-1);}if(e.key==='Escape'){if(modalName)closeModal();else if(selected)closeDialogue();}if(e.key==='Tab'&&modalName){const nodes=[...$('overlay').querySelectorAll('button,a[href],input,textarea,select')].filter(n=>!n.disabled&&!n.closest('[inert]')&&n.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
window.addEventListener('pagehide',()=>speech.stop());
document.addEventListener('visibilitychange',()=>{if(document.hidden)speech.stop();});
let viewportWidth=innerWidth,fullViewportHeight=Math.max(innerHeight,window.visualViewport?.height||0);
function syncViewport(){
 const height=window.visualViewport?.height||innerHeight;
 // Some mobile browsers resize both viewports when the keyboard opens.
 if(viewportWidth!==innerWidth){viewportWidth=innerWidth;fullViewportHeight=Math.max(innerHeight,height);}
 else fullViewportHeight=Math.max(fullViewportHeight,innerHeight,height);
 document.documentElement.style.setProperty('--app-height',height+'px');
 document.documentElement.classList.toggle('keyboard-open',document.activeElement?.id==='chat-input'&&height<fullViewportHeight-100);
 fitChatInput();
 fitGuidance();
}
window.visualViewport?.addEventListener('resize',syncViewport);
window.addEventListener('resize',syncViewport);
document.addEventListener('focusin',syncViewport);
document.addEventListener('focusout',()=>requestAnimationFrame(syncViewport));
syncViewport();
installPersonLinks($('app'),profilePeople,showPersonProfile,{getClues:()=>state?.clues||[],openClue:openClueMention});
$('app').addEventListener('click',event=>{const avatar=event.target.closest('[data-chat-profile]');if(avatar){event.preventDefault();showPersonProfile(avatar.dataset.chatProfile);}});
try{[menuState]=await Promise.all([api('menu'),introReady]);showMainMenu();$('loading').remove();}catch(e){$('loading').textContent='暂时没能翻开手记。刷新页面重试。';console.error(e);}

function menuBack(handler=showMainMenu){
 $('overlay').querySelector('.modal-heading').insertAdjacentHTML('afterbegin',`<button id="menu-back" class="profile-back" aria-label="返回">${icon('back')}</button>`);
 $('menu-back').onclick=handler;
}
function showMainMenu(){
 music.setActive(false);inStartMenu=true;speech.stop();pendingConversation=null;selected=null;clearDialogue();renderHud();scene?.social.setPaused(true);
 const progress=menuState.continueProgress,scriptName=menuState.scripts[0]?.name;
 const continueLabel=scriptName?`继续《${scriptName}》调查`:'继续调查';
 modal('青苔镇 Mossvale',`<img class="start-menu-logo" src="art/brand/mossvale-logo-v2-calligraphy.png" alt="青苔镇 Mossvale" width="1536" height="1024" fetchpriority="high" draggable="false"><p class="start-menu-tagline">AI 模拟单人沉浸式场景探险</p><div class="start-menu-actions"><button id="select-script" class="start-menu-button primary"><span>剧本选择</span><span aria-hidden="true">→</span></button><button id="continue-progress" class="start-menu-button continue-case" ${progress?'':'disabled'}><span>${esc(continueLabel)}</span></button><button id="menu-settings" class="start-menu-button"><span>设置</span></button></div>`,'start-menu');
 $('overlay').insertAdjacentHTML('beforeend','<footer class="start-menu-footer"><a href="https://github.com/Frankfromfuture/mossvale" target="_blank" rel="noopener noreferrer">github.com/Frankfromfuture/mossvale</a></footer>');
 $('close-modal').hidden=true;$('select-script').onclick=showScripts;$('menu-settings').onclick=settings;
 $('continue-progress').onclick=()=>loadProgress('continue',{});$('select-script').focus();
}
async function openStartMenu(){
 if(busy||actionPending){toast('等当前这一步完成后再返回。');return;}
 speech.stop();try{menuState=await api('menu');showMainMenu();}catch(e){toast(e.message);}
}
function showScripts(){
 modal('剧本选择',`<div class="script-carousel" role="region" aria-roledescription="轮播" aria-label="剧本目录"><div class="script-viewport"><div class="script-track">${menuState.scripts.map((script,i)=>`<div class="script-page" role="group" aria-roledescription="幻灯片" aria-label="${i+1} / ${menuState.scripts.length+1}"><button class="script-choice" data-script="${esc(script.id)}" aria-label="${esc(script.name)}，选择主角"><span class="script-cover"><img src="${esc(script.cover)}" alt="雾中的山间神社，一盏未熄的灯" draggable="false"/><span class="script-cover-type">山中怪谈 · 六个人的秘密</span><strong>${esc(script.name)}</strong></span><span class="script-summary"><b>${esc(script.tagline)}</b><span>${esc(script.description)}</span><small>走进故事 <span aria-hidden="true">→</span></small></span></button></div>`).join('')}<div class="script-page" role="group" aria-roledescription="幻灯片" aria-label="${menuState.scripts.length+1} / ${menuState.scripts.length+1}"><div class="script-coming-soon">${icon('book')}<p>新剧本待添加</p></div></div></div></div><nav class="script-pagination" aria-label="剧本翻页"><button class="script-previous" aria-label="上一个剧本">${icon('back')}</button><span class="script-page-status" role="status" aria-live="polite"></span><button class="script-next" aria-label="下一个剧本">${icon('back')}</button></nav></div>`,'script-picker');menuBack();
 bindScriptCarousel($('overlay').querySelector('.script-carousel'));
 $('overlay').querySelectorAll('[data-script]').forEach(b=>b.onclick=showRoles);
}
function showRoles(){
 modal('选择主角',`<div class="role-picker-scroll" tabindex="0" aria-label="主角列表"><p class="role-picker-intro">先从白川澄的故事开始。结案分数越高，能走进的故事越多；解锁后会一直保留。</p><p class="role-unlock-record">最高结案调查分数：<strong>${menuState.bestScore}</strong> 分</p><div class="role-grid">${menuState.roles.map(p=>`<button class="role-card ${p.locked?'locked':'available'}" data-role="${p.id}" ${p.locked?'disabled':''}>${portrait(p)}<span class="role-card-heading"><strong>${esc(p.name)}</strong></span><span class="role-continue">${p.locked?`达到调查分数 <span class="unlock-threshold">${p.unlockScore} 分</span>后解锁`:p.saved?'继续这个故事 →':'开始这个故事 →'}</span></button>`).join('')}</div></div>`,'role-picker');menuBack(showScripts);
 $('overlay').querySelectorAll('[data-role]:not(:disabled)').forEach(b=>b.onclick=()=>loadProgress('role',{role:b.dataset.role}));
}
async function loadProgress(path,input){
 if(actionPending)return;actionPending=true;music.prepare();
 $('overlay').querySelectorAll('button').forEach(b=>b.disabled=true);
 try{const r=await api(path,input);inStartMenu=false;music.setActive(true);modalName=null;menuScenery.setActive(false);$('overlay').classList.remove('menu-active');$('overlay').innerHTML='';apply(r.state);scene?.focus(state.room);if(state.briefing?.current)showOpening();else if(!state.started)showIntro();}
 catch(e){toast(e.message);try{menuState=await api('menu');}catch{}showMainMenu();}
 finally{actionPending=false;}
}
