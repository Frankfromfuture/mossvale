const status=q=>q.status==='done'?'已收尾':q.status==='ready'?'可收尾':`${q.completed} / ${q.total} · 调查中`;

export function personQuest(q,esc){
 if(!q)return '';
 return `<section class="person-quest" aria-label="人物支线"><div class="person-section-title"><h3>${esc(q.title)}</h3><span>${status(q)}</span></div><p>${esc(q.description)}</p>
 ${q.result?`<p class="quest-resolution">${esc(q.result.summary)}</p><blockquote>${esc(q.result.speech)}</blockquote>`:`<ol class="quest-steps">${q.steps.map(step=>`<li class="${step.hidden?'unrevealed':step.done?'done':''}"><span aria-hidden="true">${step.done&&!step.hidden?'✓':'○'}</span>${esc(step.text)}</li>`).join('')}</ol>${q.status==='ready'?`<p class="quest-next">${esc(q.next)}</p>`:''}`}</section>`;
}

export function sideQuestOverview(state,esc,ending=false){
 const people=state.people.filter(p=>state.dossiers?.[p.id]?.sideQuest),done=people.filter(p=>state.dossiers[p.id].sideQuest.status==='done').length;
 return `<section class="sidequest-list${ending?' ending-quests':''}" aria-label="人物支线总览"><h3>人物支线 <small>${done} / ${people.length} 已收尾</small></h3><p class="quest-overview-note">${ending?'未收尾的支线仍可继续。点击人物，查看还缺哪一步。':'线索齐备后，找本人当面收尾。支线不影响主线结案。'}</p>${people.map(p=>{const q=state.dossiers[p.id].sideQuest;return `<article><button data-profile="${p.id}" class="quest-person"><span>${esc(p.name)} · ${esc(q.title)}</span><small>${status(q)}</small></button><p>${esc(q.result?.summary||q.next)}</p></article>`;}).join('')}</section>`;
}
