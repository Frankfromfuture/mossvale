import {objectRegions} from '../shared/suspect7/object-regions.mjs';
import {createVillaSound} from './suspect7-sound.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,data='',cls='')=>`<button type="button" class="${cls}" data-case="${action}" ${data}>${label}</button>`;
const paragraphs=t=>String(t).split('\n').map(p=>`<p>${esc(p)}</p>`).join('');
const source=s=>s?.adaptation?'改编新增 · '+s.note:s?`${s.file.split('/').at(-1)} · 第${s.pages.join('、')}页`:'';
const names={load:'装入撞球中空处',seal:'封住开口',inflate:'用气泵充气',transport:'沿检修通道推送',release:'在池边释放'};
// Only case-specific reading/operations. App owns every surface, voice and navigation.
export class CaseTools{
 constructor(ui){this.ui=ui;this.root=this.overlay=ui.overlay;this.sound=createVillaSound();this.order=['inflate','release','load','transport','seal'];this.root.addEventListener('dragstart',e=>{const item=e.target.closest('[data-material]');if(item)e.dataTransfer.setData('text/plain',item.dataset.material);});this.root.addEventListener('dragover',e=>{if(e.target.closest('[data-desk-slot]'))e.preventDefault();});this.root.addEventListener('drop',e=>{const slot=e.target.closest('[data-desk-slot]');if(slot){e.preventDefault();this.placeMaterial(e.dataTransfer.getData('text/plain'),Number(slot.dataset.deskSlot));}});this.root.addEventListener('click',e=>{const b=e.target.closest('[data-case]');if(b&&!b.disabled&&this.state?.scriptId==='suspect7')this.handle(b.dataset.case,b).catch(err=>ui.notice(err.message));});}
 get state(){return this.ui.state();}
 art(e,cls){const r=e?.imageRegion;if(!r)return this.ui.art(e,cls);const sheet=r.url.includes('objects-b')?'b':'a',index=Math.round(r.y/r.size)*5+Math.round(r.x/r.size),crop=objectRegions[sheet][index];return this.ui.art({...e,imageRegion:{...r,x:crop[0],y:crop[1],width:crop[2],height:crop[3]}},cls);}
 get voice(){return this.ui.voice;}
 get busy(){return this.ui.busy();}
 notice(t){this.ui.notice(t);}
 async act(a,o){const r=await this.ui.action(a,o);return r?.error?null:r;}
 paper(title,html,panel='case'){this.stopCall();this.panel=panel;this.ui.modal(title,`<div class="reference-body case-content">${html}</div>`,'case-reading'+(panel==='compare'?' comparison-reading':''));}
 close(){this.stopCall();this.ui.close();}
 detail(id){this.ui.clue(id);}
 notebook(tab){this.ui.book(tab==='calls'?'opening':tab==='notes'?'notes':'case');}
 draftKey(kind){return 'mystery-case-draft:'+this.state.slotToken+':'+kind;}
 onVoice(snapshot){this.voiceSnapshot=snapshot;if(this.callPlaying&&snapshot.phase==='idle'&&!snapshot.speaking)this.scheduleFrame();}
 clueActions(id){const action={keypad:['输入密码','password'],measure:['核对尺寸','measure'],passage:['纸面复原','reconstruction'],phone:['接听／重看来电','calls'],carpet:['教堂投票','vote']}[id];return action&&!(id==='carpet'&&this.state.chapterId!==3)?button(action[0],action[1]):button('并排核对','compare',`data-id="${id}"`);}
 casePage(){const s=this.state;return `<div class="case-page">${this.nextQuestion()}<h3>${esc(s.chapter.title)}</h3><p>${esc(s.chapter.question)}</p><div class="deduction-lines">${s.progress.checks.map(c=>`<div><span>${c.done?'✓':'○'}</span>${esc(c.label)}</div>`).join('')}</div><div class="case-actions">${button('记下判断或疑问','hypothesis')}${button('双证据追问','compare')}${button('现场操作','objects')}${button('调查提示','hints')}${s.chapterId<6?button('进入下一章','advance',s.progress.ready?'':'disabled','primary'):button(s.ending?'查看结案':'最终结案','ending','','primary')}</div>${s.chapterId===5?button('保存阶段判断','ending','','primary'):''}${s.reports.map(r=>`<p>${button(esc(r.title),'report',`data-id="${r.id}" ${r.basis.every(id=>s.evidence.some(e=>e.id===id))?'':'disabled'}`)}</p>`).join('')}<h3>我的判断</h3>${s.hypotheses.map(h=>`<article><small>第${h.chapter}章 · ${h.status}</small><p>${esc(h.text)}</p>${h.status==='待核实'?button('撤回','withdraw',`data-id="${h.id}"`):''}</article>`).join('')||'<p>还没有写下判断。</p>'}</div>`;}
 accountsPage(){const s=this.state;return `<div class="opening-records"><p>${esc(s.testimonyBoundary)}</p>${s.accounts.map(q=>`<article><strong>${esc(q.title)}</strong><p>${q.read?esc(s.evidence.find(e=>e.id===q.id)?.text):'还没有收入记录。'}</p>${button(q.read?'重看原话':q.own?'整理自己的记录':'向'+(s.people.find(p=>p.id===q.actor)?.name||'本人')+'问起','account',`data-id="${q.id}"`)}</article>`).join('')}<h3>来电记录</h3>${this.callList()}${s.chapterId>=2&&s.chapterId<5?button('到教堂留下供述','confession'):''}${s.chapterId===3?button('教堂投票','vote'):''}</div>`;}
 progress(){const s=this.state;this.paper('当前调查',this.nextQuestion()+`<p>${esc(s.chapter.question)}</p><ul class="s7-checks">${s.progress.checks.map(r=>`<li class="${r.done?'done':''}">${r.done?'✓':'○'} ${esc(r.label)}</li>`).join('')}</ul>${s.chapterId<6?button('进入下一章','advance',s.progress.ready?'':'disabled','primary'):button(s.ending?'重看结案':'填写最终结案','ending','','primary')}<p class="s7-small">每一步完成后自动保存。阅读、等待回复和离开页面都不会改变案发时间。</p>`);}
 measureDiagram(){return `<div class="s7-measure-diagram"><svg viewBox="0 0 240 210" role="img" aria-label="储藏室宽12米、室内深8米，外缘墙基延伸至16米"><path d="M40 180V20H184V180Z" fill="none" stroke="#89977a" stroke-dasharray="5 4"/><rect x="40" y="100" width="144" height="80" fill="#d8cfb4" stroke="#64735b"/><text x="112" y="145" text-anchor="middle" font-size="15">储藏室 12×8m</text><text x="112" y="67" text-anchor="middle" font-size="13">外缘延伸，待核查</text></svg><p>室内北墙：8m<br>外缘墙基：16m<br>两项测量相差：8m</p></div>`;}
 objects(){const s=this.state;this.paper(s.scene.name+' · 可查看物件',`<p>可以直接点击三维场景中的实体，也可从这里选择。</p><div class="s7-evidence-list">${s.scene.spots.map(p=>button(`${this.ui.art(p,'prop-icon-inline')}<span>${esc(p.label)}</span><small>${p.found?'已查看':'查看'}</small>`,'inspect',`data-id="${p.id}"`)).join('')||'<p>这里没有新的可搜查物件。可以看看地图，继续去其他地方。</p>'}</div>${s.room==='attic'?button('输入七位密码','password'):''}${s.room==='study'?button('核对内外尺寸','measure'):''}${s.room==='secret'?button('打开纸面复原台','reconstruction'):''}${s.room==='chapel'&&s.chapterId===2?button('留下自己的供述','confession'):''}${s.room==='chapel'&&s.chapterId===3?button('参加投票','vote'):''}${s.room==='dining'?button('接听 / 重看来电','calls'):''}`);}
 hypothesis(){this.paper('先把判断写下来',`<p>可以写你怀疑谁、哪些说法冲突，或仅写“还缺什么证据”。</p><textarea id="s7-hypothesis" rows="6" maxlength="2500" placeholder="例如：我还不能确认死者是谁……">${esc(localStorage.getItem(this.draftKey('hypothesis'))||'')}</textarea>${button('保存为待核实推断','save-hypothesis','','primary')}`);const input=this.root.querySelector('#s7-hypothesis');input.oninput=()=>localStorage.setItem(this.draftKey('hypothesis'),input.value);input.focus();}
 nextQuestion(){const t=this.state.dialogue?.lead;return t?`<div class="case-next-question"><p>${esc(t.title)}</p>${button('去问'+esc(this.state.people.find(p=>p.id===t.actor)?.name||'当事人'),'ask-topic',`data-topic="${esc(t.id)}" data-actor="${esc(t.actor)}"`)}</div>`:'';}
 compare(preferred){
  const s=this.state,all=s.evidence;
  if(this.desk?.token!==s.slotToken)this.desk={token:s.slotToken,slots:[null,null],active:0,actor:null};
  this.desk.slots=this.desk.slots.map(id=>all.some(e=>e.id===id)?id:null);
  if(preferred&&!this.desk.slots.includes(preferred)){this.desk.slots[this.desk.active]=preferred;this.desk.active=1-this.desk.active;}
  this.renderDesk();
 }
 placeMaterial(id,side=this.desk.active){
  if(!this.state.evidence.some(e=>e.id===id))return;
  const other=1-side;if(this.desk.slots[other]===id)this.desk.slots[other]=this.desk.slots[side];
  this.desk.slots[side]=id;this.desk.active=other;
  const owner=this.state.evidence.find(e=>e.id===id)?.actor;
  if(owner&&owner!==this.state.playerId&&this.state.people.some(p=>p.id===owner))this.desk.actor=owner;
  this.renderDesk();
 }
 renderDesk(){
  const prior=this.panel==='compare'?{top:this.root.querySelector('.case-content')?.scrollTop||0,left:this.root.querySelector('.desk-tray')?.scrollLeft||0}:null;
  const s=this.state,d=this.desk,all=s.clues,selected=d.slots.map(id=>all.find(e=>e.id===id));
  const people=s.people.filter(p=>p.id!==s.playerId);
  if(!people.some(p=>p.id===d.actor))d.actor=selected.find(e=>e?.actor&&people.some(p=>p.id===e.actor))?.actor||people[0]?.id;
  const actor=people.find(p=>p.id===d.actor);
  const piece=(e,side)=>e?`<div class="desk-piece ${e.actor?'desk-testimony':'desk-object'}">${button((e.actor?'<span class="desk-quote-mark">“</span>':this.art(e,'desk-object-art'))+`<strong>${esc(e.title)}</strong>`,'choose-slot',`data-side="${side}" aria-label="更换${side?'右':'左'}边材料"`)}${e.actor?`<p class="desk-excerpt">${esc(e.text.slice(0,130))}${e.text.length>130?'……':''}</p>`:''}${button('细看这件材料','detail',`data-id="${esc(e.id)}"`,'desk-read')}</div>`:button('<span class="desk-empty-outline"></span><span>放一件材料</span><small>点下面的物件或口供</small>','choose-slot',`data-side="${side}"`,'desk-empty');
  this.paper('把两件材料放在一起',`<p class="desk-instruction">先看清它们各自说了什么，再问当事人。</p><div class="comparison-desk" aria-label="证据比对桌">${selected.map((e,i)=>`<section class="desk-place ${d.active===i?'is-active':''}" data-desk-slot="${i}" aria-label="${i?'右':'左'}侧材料"><span class="desk-place-label">${i?'右手边':'左手边'}</span>${piece(e,i)}</section>`).join('')}</div><div class="desk-tray-label">${d.active?'往右手边放':'往左手边放'} · 点选一件材料</div><div class="desk-tray" aria-label="已有材料">${all.map(e=>button(this.art(e,'desk-tray-art')+`<span>${esc(e.title)}</span>`,'place-material',`data-id="${esc(e.id)}" data-material="${esc(e.id)}" draggable="true" aria-pressed="${d.slots.includes(e.id)}"`,'desk-tray-item')).join('')}</div><p class="desk-ask-label">把材料拿给谁看？</p><div class="desk-people">${people.map(p=>button(this.ui.portrait(p)+`<span>${esc(p.name)}</span>`,'desk-actor',`data-id="${p.id}" aria-pressed="${d.actor===p.id}"`)).join('')}</div><div class="desk-footer">${button('拿给'+esc(actor?.name||'当事人')+'问清楚','submit-compare',selected.every(Boolean)?'':'disabled','primary')}</div>`,'compare');
  if(prior){this.root.querySelector('.case-content').scrollTop=prior.top;this.root.querySelector('.desk-tray').scrollLeft=prior.left;}
 }
 password(){this.paper('柜子后面的键盘',`<p>七位数字。6和9的表面已经磨亮。</p><label>密码<input id="s7-password" inputmode="numeric" pattern="[0-9]{7}" maxlength="7" autocomplete="off" aria-label="七位密码"></label><div class="s7-keypad">${[['1',''],['2','ABC'],['3','DEF'],['4','GHI'],['5','JKL'],['6','MNO'],['7','PQRS'],['8','TUV'],['9','WXYZ']].map(([n,t])=>button(n+`<small>${t}</small>`,'digit',`data-digit="${n}"`)).join('')}${button('删除','backspace')}</div>${button('开锁','unlock','','primary')} ${button('看看提示','hints')}`,'password');}
 reconstruction(){const ids=['spare-ball','pump','pool-items','passage'],materials=ids.map(id=>this.state.clues.find(e=>e.id===id));if(materials.some(e=>!e)){this.notice('先查看撞球、气泵、池中物品与通道结构。');return;}this.paper('运输复原台',`<p>把已经查过的物件摆在一起，排出一种能解释现场痕迹的顺序。</p><div class="case-model-objects">${materials.map(e=>`<figure>${this.ui.art(e,'clue-illustration')}<figcaption>${esc(e.title)}</figcaption></figure>`).join('')}</div><ol class="s7-order">${this.order.map((id,i)=>`<li><span>${names[id]}</span>${button('↑','order-up',`data-index="${i}" aria-label="上移${names[id]}" ${i===0?'disabled':''}`)}${button('↓','order-down',`data-index="${i}" aria-label="下移${names[id]}" ${i===4?'disabled':''}`)}</li>`).join('')}</ol>${button('检验这套顺序','submit-order','','primary')}<p class="s7-small">纸面模型只检验过去可能发生的过程。</p>`,'reconstruction');}
 callList(){return this.state.calls.map(c=>`<article><h3>${esc(c.title)}</h3><p>${this.state.flags[c.id]?'已收入记录，可分段重看。':'回到餐厅接听。'}</p>${button('打开演出','play-call',`data-id="${c.id}"`)}</article>`).join('')+(this.state.chapterId>=3?button('比较两次来电','call-compare'):'');}
 playCall(id){const call=this.state.calls.find(c=>c.id===id);if(!call)return;if(!this.state.flags[id]&&this.state.room!=='dining'){this.notice('先回餐厅接听。');return;}this.paper(call.title,'','call');this.call=call;this.frameIndex=0;this.callPlaying=false;this.sound.cue('phone');this.frame();}
 frame(){const c=this.call,f=c.frames[this.frameIndex];this.voice.stop();this.callActor=({'李察':'licha','定远侯':'dingyuanhou'})[f.speaker]||'narrator7';if(this.callActor===this.state.playerId)this.callActor='narrator7';this.overlay.querySelector('.case-content').innerHTML=`<img class="case-call-picture" src="art/suspect7/v2/call-screen.png" alt="电视里的蒙面人，声音从桌上的手机传来"><p class="s7-call-source">声音从手机传出 · 画面中的身份尚待核实</p><h3>${esc(f.speaker)}</h3><div class="s7-call-subtitles" aria-live="polite">${paragraphs(f.text)}</div><p class="s7-sound">声音记录：${esc(f.sound)}</p><nav class="s7-call-controls">${button('上一段','call-prev',this.frameIndex===0?'disabled':'')}${button(this.callPlaying?'暂停':'自动播放','call-toggle')}${button('下一段','call-next',this.frameIndex===c.frames.length-1?'disabled':'')}</nav><p class="s7-small">${this.frameIndex+1} / ${c.frames.length} · 字幕可暂停与重看</p>${this.frameIndex===c.frames.length-1?button(this.state.flags[c.id]?'合上记录':'听完并保存记录','call-complete','','primary'):''}`;
  if(this.callPlaying){this.voice.reply(f.text,this.callActor,{force:true});this.scheduleFrame();}
 }
 scheduleFrame(){clearTimeout(this.callTimer);if(!this.callPlaying||!this.call||this.voiceSnapshot?.speaking)return;this.callTimer=setTimeout(()=>{if(!this.callPlaying||!this.call)return;if(this.frameIndex<this.call.frames.length-1){this.frameIndex++;this.frame();}else{this.callPlaying=false;this.frame();}},Math.max(4500,(this.call.frames[this.frameIndex].text.length||20)*130));}
 stopCall(clear=true){clearTimeout(this.callTimer);this.callPlaying=false;if(clear){this.call=null;this.callActor=null;}}
 callCompare(){this.paper('电话另一头有没有在听？','<div class="comparison-desk call-comparison">'+this.state.calls.map((c,i)=>'<section class="desk-place"><span class="desk-place-label">'+(i?'第二次':'第一次')+'</span>'+this.art(this.state.clues.find(e=>e.id==='phone'),'desk-object-art')+'<h3>'+esc(c.title)+'</h3>'+button('重听这段来电','play-call','data-id="'+c.id+'"')+'</section>').join('')+'</div><p>有人插话时，电话另一头有什么反应？带着这个问题，去问当时在场的人。</p>'+button('找人谈谈两次来电','submit-calls','','primary'));}
 vote(){this.paper('教堂里的纸条',`<p>写下自己的意见。投票记录会留下，但它决定不了一个人是否应该被杀。</p>${[['yes','洪先生该死'],['no','洪先生不该死'],['abstain','弃权，反对用投票决定生死']].map(([id,label])=>button(label,'submit-vote',`data-choice="${id}"`)).join('')}<p class="s7-small">这是固定历史中的表达选择，已发生的案件保持原状。</p>`);}
 hints(){this.paper('调查提示',`<p>${esc(this.state.progress.next)}</p><div class="s7-hint-levels">${button('1 · 操作入口','hint','data-level="1"')}${button('2 · 思考方向','hint','data-level="2"')}${button('3 · 直接揭示本章答案','reveal-confirm')}</div>${this.state.hint?paragraphs(this.state.hint):''}<p class="s7-small">提示、阅读速度和修改假说不扣分。直接揭示单独记在结案记录里，仍会开放其他路线。</p>`);}
 async report(id){const r=this.state.reports.find(r=>r.id===id);if(!r)return;if(r.done){this.detail(({identity:'dental',departure:'departure',clock:'clock-check',chen:'chen-link'})[id]);return;}const result=await this.act({type:'report',id,question:r.title},{quiet:true});if(result?.ask)await this.ui.ask(result.ask);else if(result?.clue)this.detail(result.clue);}
 answersForm(defs,id,values={}){return `<div id="${id}" class="s7-answer-form">${defs.map(q=>`<label>${esc(q.title)}<select data-answer="${q.id}"><option value="">请选择</option>${q.options.map(o=>`<option ${values[q.id]===o?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`).join('')}</div>`;}
 ending(){const s=this.state;if(s.ending){this.paper('结案记录',`<p class="s7-score">${s.ending.score}<small> / 100</small></p><p>六条路线已经开放。${s.ending.reveals.length?'直接揭示记录：第'+s.ending.reveals.join('、')+'章。':'本轮未直接揭示答案。'}</p>${s.ending.epilogue.map(p=>`<article><h3>${esc(p.title)}</h3>${paragraphs(p.text)}<div>${p.evidence.map(id=>button(esc(s.evidence.find(e=>e.id===id)?.title||id),'detail',`data-id="${id}"`)).join('')}</div></article>`).join('')}<h3>留下自己的交代</h3><p>${esc(s.ending.closure)}</p><p>${esc(s.ending.choice)}</p><details><summary>调查评价明细</summary>${[...s.ending.old,...s.ending.main,...s.ending.chains].map(q=>`<p>${esc(q.title)}：${q.points}分<br>你的判断：${esc(q.chosen)}<br>核实结果：${esc(q.answer)}</p>`).join('')}</details>${button('返回剧本菜单','exit','','primary')}`,'ending');return;}
  if(s.chapterId<5){this.notice('获救后再提交案件判断。');return;}const final=s.chapterId===6;
  this.paper(final?'最终结案':'阶段判断',`${this.answersForm(s.oldQuestions,'s7-old-answers',s.oldAnswers)}${final?`${this.answersForm(s.finalQuestions,'s7-final-answers')}<h3>证据连接与排除</h3><div id="s7-chain-answers">${s.chainQuestions.map(q=>`<label>${esc(q.title)}<select data-answer="${q.id}"><option value="">选择已取得的依据</option>${s.evidence.map(e=>`<option value="${e.id}">${esc(e.title)}</option>`).join('')}</select></label>`).join('')}</div><label>个人收束<select id="s7-closure"><option value="keep">保留玩家旁注，案件证据照常留档</option><option value="disclose">主动留下完整交代</option></select></label>`:`<label>温泉命案的阶段结论<select id="s7-theory-status"><option value="insufficient">证据不足，继续核查</option><option value="other">已有其他怀疑，需要证据</option><option value="vivian-theory">暂存薇薇安复仇推论，身份仍待核实</option></select></label><textarea id="s7-theory-text" rows="4" maxlength="2500" placeholder="例如：死者身份未核实；共同使用的手机时间也需要检查。"></textarea>`}${button(final?'提交最终判断':'保存阶段判断','submit-ending',`data-final="${final}"`,'primary')}<p class="s7-small">旧案40分，主案40分，证据连接与排除20分。不以分数限制新路线。</p>`,'ending-form');}

 async handle(kind,b){if(this.busy)return;const id=b.dataset.id,value=q=>this.root.querySelector(q)?.value;
  switch(kind){
   case 'close':this.close();break;
   case 'objects':this.objects();break;
   case 'inspect':await this.act({type:'inspect',id});break;
   case 'detail':this.detail(id);break;
   case 'notebook':this.notebook();break;
   case 'calls':this.paper('来电记录',this.callList());break;
   case 'account':{const r=await this.act({type:'account',id});if(r?.ask)await this.ui.ask(r.ask);break;}
   case 'ask-topic':{const t=this.state.dialogue?.byActor[b.dataset.actor]?.find(t=>t.id===b.dataset.topic);if(t)await this.ui.ask({actor:t.actor,message:t.prompt,inquiry:t.id});break;}
   case 'choose-slot':this.desk.active=Number(b.dataset.side);this.renderDesk();break;
   case 'place-material':this.placeMaterial(id);break;
   case 'desk-actor':this.desk.actor=id;this.renderDesk();break;
   case 'confession':{const r=await this.act({type:'confession'},{quiet:true});if(r)this.paper('教堂供述',paragraphs(r.message));break;}
   case 'hypothesis':this.hypothesis();break;
   case 'save-hypothesis':if(await this.act({type:'hypothesis',text:value('#s7-hypothesis')})){localStorage.removeItem(this.draftKey('hypothesis'));this.notebook();}break;
   case 'withdraw':if(await this.act({type:'withdraw',id}))this.notebook();break;
   case 'advance':if(await this.act({type:'advance'}))this.close();break;
   case 'password':this.password();break;
   case 'digit':{const input=this.root.querySelector('#s7-password');if(input.value.length<7)input.value+=b.dataset.digit;break;}
   case 'backspace':this.root.querySelector('#s7-password').value=value('#s7-password').slice(0,-1);break;
   case 'unlock':if(await this.act({type:'unlock',code:value('#s7-password')}))this.close();break;
   case 'measure':if(await this.act({type:'measure'}))this.paper('核对内外尺寸',this.measureDiagram());break;
   case 'reconstruction':this.reconstruction();break;
   case 'order-up':case 'order-down':{const i=Number(b.dataset.index),j=i+(kind==='order-up'?-1:1);[this.order[i],this.order[j]]=[this.order[j],this.order[i]];this.reconstruction();break;}
   case 'submit-order':if(await this.act({type:'reconstruct',order:this.order}))this.notebook();break;
   case 'compare':this.compare(id);break;
   case 'submit-compare':{const [quote,evidence]=this.desk.slots;const r=await this.act({type:'compare',quote,evidence,actor:this.desk.actor},{quiet:true});if(r?.ask)await this.ui.ask(r.ask);else if(r)this.paper('追问记录',paragraphs(r.message)+button('继续核对','compare'));break;}
   case 'play-call':this.playCall(id);break;
   case 'call-toggle':this.callPlaying=!this.callPlaying;if(!this.callPlaying){clearTimeout(this.callTimer);this.voice.stop();}this.frame();break;
   case 'call-prev':case 'call-next':clearTimeout(this.callTimer);this.frameIndex+=kind==='call-next'?1:-1;this.frame();break;
   case 'call-complete':{const c=this.call;this.stopCall();if(await this.act({type:'play-call',id:c.id}))this.notebook('calls');break;}
   case 'call-compare':this.callCompare();break;
   case 'submit-calls':{const r=await this.act({type:'compare-calls',first:'responds',second:'continuous'},{quiet:true});if(r?.ask)await this.ui.ask(r.ask);else if(r)this.close();break;}
   case 'vote':this.vote();break;
   case 'submit-vote':if(await this.act({type:'vote',choice:b.dataset.choice}))this.close();break;
   case 'hints':this.hints();break;
   case 'hint':if(await this.act({type:'hint',level:Number(b.dataset.level)},{quiet:true}))this.hints();break;
   case 'reveal-confirm':this.paper('显示本章答案',`<p>这条提示包含答案，会单独记入结案记录。</p>${button('显示答案','hint','data-level="3"','primary')}`);break;
   case 'report':this.report(id);break;
   case 'submit-report':await this.act({type:'report',id,question:value('#s7-report-question')});break;
   case 'ending':this.ending();break;
   case 'submit-ending':{const values=id=>Object.fromEntries([...this.root.querySelectorAll('#'+id+' select')].map(e=>[e.dataset.answer,e.value])),final=b.dataset.final==='true';const r=await this.act(final?{type:'final',oldAnswers:values('s7-old-answers'),answers:values('s7-final-answers'),chains:values('s7-chain-answers'),choice:value('#s7-closure')}:{type:'provisional',answers:values('s7-old-answers'),status:value('#s7-theory-status'),text:value('#s7-theory-text')});if(r)final?this.ending():this.notebook();break;}
   case 'exit':this.close();await this.ui.exit();break;
  }
 }
}
