import {caseInteractions} from './social.mjs';
import {chapters,evidence as sourceEvidence} from './catalog.mjs';
import {chapterPages,endingPages} from './narrative.mjs';
// The case supplies content to the same client view used by Foglight.
// Private case records stay on the server; only the current projection enters it.
const kindNames={observation:'物证',testimony:'证词',hypothesis:'推断',verified:'核实'};
const art='suspect7/v2/';
function illustration(s,e){
 let index=sourceEvidence.findIndex(c=>c.id===e.id),sheet='a';
 if(index<0)return {imageUrl:'art/'+art+'portrait-'+e.actor+'.png'};
 if(index>=25){index-=25;sheet='b';}
 if(s.playerId==='andy'&&['lighter','carpet'].includes(e.id)){sheet='b';index=e.id==='lighter'?20:21;}
 return {imageRegion:{url:'art/'+art+'objects-'+sheet+'.png',x:index%5*250.8,y:Math.floor(index/5)*250.8,size:250.8,atlasSize:1254}};
}
export function sharedPresentation(v,s){
 const publicRoom=s.chapterId>=5?'meeting':'dining';
 const roomName=id=>v.scene.rooms.find(r=>r.id===id)?.name||id;
 const all=[v.self,...v.people].map((p,i)=>({...p,portrait:i,portraitUrl:'art/'+art+'portrait-'+p.id+'.png',location:p.id===s.playerId?v.room:p.location,locationLabel:p.id===s.playerId?roomName(v.room):roomName(p.location),near:p.id===s.playerId||p.near,knownIdentity:p.role,greeting:'你想先核对哪一件事？'}));
 const clues=v.evidence.map(e=>({...e,recordKind:e.kind,kind:kindNames[e.kind]||'文书',...illustration(s,e)}));
 const scores=[['旧案判断',40,'孙强、鬼手、袭击者和玉的去向，每项10分。','old'],['主案还原',40,'死者、凶手、动机和作案窗口，每项10分。','main'],['证据连接',20,'身份、校时、反证与运输路线，每项5分。','chains']].map(([name,max,rule,key])=>({name,max,rule,value:s.ending?.[key]?.reduce((sum,q)=>sum+q.points,0)||0}));
 const interludes=Array.from({length:Math.max(0,s.chapterId-1)},(_,i)=>({id:'chapter-'+(i+2),title:'第'+(i+2)+'章 · '+(chapters[i+1].title),pages:chapterPages(v,i+1),action:{type:'case',label:'接着调查',text:i+2===s.chapterId?v.progress.next:'记录仍保存在手记里。'}}));
 if(s.ending)interludes.push({id:'case-closed',title:'案件之后',pages:endingPages(v,s),action:{type:'case',label:'查看结案记录',text:s.ending.closure}});
 return {...v,scene:{...v.scene,spots:v.scene.spots.map(p=>({...p,...illustration(s,p)}))},title:'第7号嫌疑人',publicRoom,publicRoomName:roomName(publicRoom),prologueTitle:'前情 · 伴山别墅',phase:0,people:all,
  rooms:v.scene.rooms.map(r=>({...r,accessible:r.walkable!==false,reserved:r.walkable===false,description:r.name})),
  spots:v.scene.spots.map(p=>({...p,name:p.label,...illustration(s,p)})),clues,chats:s.chats,shown:s.shown||{},chatSetting:s.chatSetting||null,
  events:v.records.filter(r=>!r.private).map(r=>({...r,kind:r.kind==='verified'?'public':r.kind})),publicReactions:s.publicReactions||{},interactions:caseInteractions(s),
  objective:v.chapter.question,lead:{title:v.progress.next,text:v.chapter.question,label:v.progress.ready&&s.chapterId<6?'进入下一章':'查看当前调查',steps:v.progress.checks.map(c=>(c.done?'✓ ':'○ ')+c.label),action:'case',tab:'case'},
  self:{...v.self,reason:v.self.hook},
  investigation:{budget:null,pointsSpent:0,progress:{label:'章节',current:s.chapterId,total:6},total:s.ending?.score||0,scores,ruleNote:'阅读、提问和修改猜测不扣分。直接揭示答案单独留档；首次结案后开放全部角色。',penalties:[],secrets:v.self.private?[{id:'own-account',title:'个人记录',text:v.self.private,exposedTo:[]}]:[],goals:[{id:'case',kind:'主线',title:v.chapter.title,text:v.chapter.question,done:!!s.ending}]},
  dossiers:Object.fromEntries(all.map(p=>[p.id,{biography:p.role,related:clues.filter(e=>e.actor===p.id).map(({id,title,kind})=>({id,title,kind})),conversations:(s.chats[p.id]||[]).filter(l=>l.who===p.id).length,shown:(s.shown?.[p.id]||[]).length,roomStatus:p.locationLabel,question:v.accounts.find(q=>q.actor===p.id&&!q.read)?.title||'可以出示已取得的线索，问清这句话的来源。',lastWords:(s.chats[p.id]||[]).filter(l=>l.who===p.id).at(-1)?.text}])),
  storyPages:chapterPages(v,0),interludes
 };
}
