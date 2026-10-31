import {personQuest} from './side-quest-ui.mjs';
export function personSheet(person,dossier,{esc,portrait,icon}){
 const d=dossier||{biography:person.role,related:[],conversations:0,shown:0,roomStatus:'',question:'先和对方聊一聊。'};
 return `<div class="person-sheet-content"><div class="person-intro">${portrait(person)}<div><p class="person-role">${esc(person.knownIdentity||person.role)}<span>${esc(person.locationLabel)}</span></p><p>${esc(d.biography)}</p></div></div>
 ${personQuest(d.sideQuest,esc)}
 <div class="person-investigation">
  <div class="person-section-title"><h3>调查到这里</h3><span>交谈 ${d.conversations} 次 · 出示 ${d.shown} 件</span></div>
  <p class="person-question">${esc(d.question)}</p>
  <p class="person-room-status">${icon('home')}${esc(d.roomStatus)}</p>
  <div class="person-section-title"><h3>记下的关联线索</h3><span>${d.related.length} 条</span></div>
  <div class="person-clues">${d.related.length?d.related.map(c=>`<button data-person-clue="${c.id}"><span>${esc(c.title)}</span><small>${esc(c.kind)}</small>${icon('arrow')}</button>`).join(''):'<p class="person-blank">这一页还空着，见到新线索再补上。</p>'}</div>
  ${d.lastWords?`<div class="person-last"><h3>最近的一段话</h3><blockquote>${esc(d.lastWords)}</blockquote><small>这是对方的说法，还需与证据对照。</small></div>`:''}
 </div></div>
 <footer class="person-sheet-foot"><span>${person.near?'就在你身边':esc(person.locationLabel)}</span>${d.sideQuest?.status==='ready'?`<button id="finish-sidequest" class="primary" ${person.near?'':'disabled'}>${person.near?'当面收尾':'到本人身边后收尾'}</button>`:''}</footer>`;
}
