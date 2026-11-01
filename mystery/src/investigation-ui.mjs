export function actionPointsHud(v){
 if(!v)return '';
 if(v.progress)return `<div class="action-points status-metric" role="status" aria-label="第${v.progress.current}章，共${v.progress.total}章"><span>${v.progress.label}</span><strong>${v.progress.current}<small> / ${v.progress.total}</small></strong></div>`;
 const used=v.pointsSpent??v.minutes??0,remaining=Math.max(0,v.budget-used);
 const label=`剩余行动点 ${remaining} / ${v.budget}${used>v.budget?`（超额${used-v.budget}点）`:''}`;
 return `<div class="action-points status-metric ${remaining<=30?'late':''}" title="${label}" role="status" aria-label="${label}"><span>行动点数</span><strong>${remaining}<small> / ${v.budget}</small></strong></div>`;
}
export function goalsHud(state,esc,expanded=false){
 const goals=state.investigation?.goals||[],main=goals.find(g=>g.kind==='主线'),personal=goals.filter(g=>g.kind==='支线');
 const people=state.people.filter(p=>state.dossiers?.[p.id]?.sideQuest);
 if(!main)return '';
 const entries=[...personal.map(g=>({title:g.title,done:g.done,action:'data-self-goal',label:g.done?'已完成':'进行中'})),...people.map(p=>{const q=state.dossiers[p.id].sideQuest;return {title:`${p.name} · ${q.title}`,done:q.status==='done',action:`data-side-person="${p.id}"`,label:q.status==='done'?'已收尾':q.status==='ready'?'可收尾':`${q.completed}/${q.total}`};})];
 const done=entries.filter(g=>g.done).length;
 return `<section class="investigation-guidance" aria-label="调查目标"><div class="investigation-objectives">${main?`<button class="guidance-line main-objective" id="current-goal" title="${esc(main.text)}"><span>主线 · ${esc(main.title)}${main.done?' · 已完成':''}</span></button>`:''}${entries.length?`<button class="side-goals-toggle" id="toggle-side-goals" aria-expanded="${expanded}" aria-controls="hud-side-goals" title="展开或收起支线目标"><span>支线</span><span class="goal-chevron" aria-hidden="true">›</span></button>`:''}</div><div class="hud-side-goals" id="hud-side-goals" ${expanded?'':'hidden'}>${entries.map(g=>`<button class="guidance-line side-goal ${g.done?'done':''}" ${g.action}><span>${esc(g.title)}</span><small>${esc(g.label)}</small></button>`).join('')}</div></section>`;
}
export function leadHud(state,esc){
 return state.lead?`<button class="investigation-lead guidance-line" id="current-lead"><span>提示 · ${esc(state.lead.title)}</span><span class="goal-chevron" aria-hidden="true">›</span></button>`:'';
}
export function rulesContent(v,esc){
 return `<div class="score-rules-list">${v.scores.map(r=>`<p><strong>${r.name} ${r.value}/${r.max}</strong><span>${esc(r.rule)}</span></p>`).join('')}<p class="score-note">${esc(v.ruleNote||'同一秘密只扣一次；每项最低为零。扣分以实际说过的话和做过的事为依据。结案时主动交代经历不追加扣分。')}</p></div>`;
}
export function scoreHud(v,esc){
 if(!v)return '';
 return `<div class="score-anchor"><button id="score-button" class="status-metric" aria-label="调查分数 ${v.total}分，查看扣分规则" aria-haspopup="dialog" aria-describedby="score-hover"><span>调查分数</span><strong>${v.total}<small> / 100</small></strong></button><div class="score-hover" id="score-hover" role="tooltip"><strong>扣分与得分规则</strong>${rulesContent(v,esc)}</div></div>`;
}
export function selfContent(state,{esc,portrait}){
 const v=state.investigation,person=state.people.find(p=>p.id===state.playerId);
 return `<div class="self-scroll"><div class="self-identity">${portrait(person)}<div><h3>${esc(state.self.name)}</h3><p>${esc(state.self.role)} · 此次调查的记录人</p><strong>${v.total} / 100 <small>${state.ending?'结案评分':'调查中'}</small></strong></div></div>
 <section><h3>个人经历</h3>${state.self.history.map(t=>`<p>${esc(t)}</p>`).join('')}</section>
 <section><h3>为什么由我来问</h3><p>${esc(state.self.reason)}</p></section>
 <section><h3>我的目标</h3><div class="self-goals">${v.goals.map(g=>`<article><span>${g.kind} · ${g.done?'已完成':'进行中'}</span><strong>${esc(g.title)}</strong><p>${esc(g.text)}</p>${g.result?`<p class="personal-result">${esc(g.result)}</p>`:g.ready&&!g.near?`<button class="personal-choice" data-personal-visit="${g.target}">先到${esc(g.targetName)}身边</button>`:(g.choices||[]).map(c=>`<button class="personal-choice" data-personal-goal="${g.id}" data-choice="${c.id}">${esc(c.label)}</button>`).join('')}</article>`).join('')}</div></section>
 <section><h3>要隐瞒的事</h3>${v.secrets.map(s=>`<article class="self-secret" id="self-secret-${esc(s.id)}" tabindex="-1" aria-labelledby="self-secret-title-${esc(s.id)}"><strong id="self-secret-title-${esc(s.id)}">${esc(s.title)}</strong><p>${esc(s.text)}</p><small>${s.exposedTo.length?'已向 '+esc(s.exposedTo.join('、'))+' 透露':'暂未向他人透露'}</small></article>`).join('')}</section>
 <section><h3>分数与规则</h3>${v.legacy?'<p class="score-note">这份旧档从新版启用时开始记录行动点消耗和扣分，过去的行为不追扣。</p>':''}${rulesContent(v,esc)}</section>
 <section><h3>扣分记录</h3>${v.penalties.length?v.penalties.slice().reverse().map(p=>`<article class="score-entry"><strong>−${p.points} · ${esc(p.reason)}</strong>${p.evidence?`<p>依据：${esc(p.evidence)}</p>`:''}<small>已消耗 ${p.actionPointsSpent??p.minute} 行动点</small></article>`).join(''):'<p>目前没有扣分。</p>'}</section></div>`;
}
export function challengeBanner(q,esc){
 if(!q)return '';
 return `<span class="challenge-banner" role="status" title="${esc(q.focus||'回应对方的疑问')}">反问中</span><button type="button" id="dismiss-question" title="结束反问：可信度扣3分，消耗1行动点">结束反问</button><button type="button" id="concede-question" title="承认隐瞒：可信度扣3分，消耗1行动点">承认隐瞒</button>`;
}
