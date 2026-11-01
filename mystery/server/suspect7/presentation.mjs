import {caseInteractions} from './social.mjs';
import {chapters,evidence as sourceEvidence,biographies} from './catalog.mjs';
// The case supplies content to the same client view used by Foglight.
// Private case records stay on the server; only the current projection enters it.
const kindNames={observation:'物证',testimony:'证词',hypothesis:'推断',verified:'核实'};
const art='suspect7/v2/';
const chapterCaptions=[
 ['缆车驶进山雾','车帘拉上以后','没有开席的午宴','门外没有回答'],
 ['手机里提起两年前','六个人，六种说法','教堂的门关上了','那块玉去了哪里'],
 ['等着下一次铃声','桌边的沉默','还没写下的意见','教堂门前'],
 ['陈信靠在柜边','先处理伤口','翻倒的柜子','重新检查这栋房子'],
 ['警察打开大门','两天后的案情室','重新读自己的供述','把疑问留下'],
 ['遗体是谁','谁离开了别墅','手机上的时间','请解释这两份材料']
];
function pages(v,index){
 const chapter=index+1,caption=chapterCaptions[index],entry=chapters[index];
 // Text and pictures for future chapters are never returned by this function's caller.
 const lines=chapter===1?[
  biographies[v.routeId].hook+' 缆车越过树林，山路渐渐隐入雾里。',
  '接你们的车拉上了帘子。再有意识时，身下已经是餐厅的椅子。',
  '桌上还没有上菜。薇薇安翻着手袋，李察走到门口又推了一次。',
  '陈信站起来：“先找洪先生。”你摸向口袋，自己的手机也不见了。'
 ]:({
  2:['来电已经结束。手机仍搁在桌上，刚才那个人提到了两年前。','有人迟迟不开口，有人开始解释自己从哪里听说过那桩劫案。你翻开空白的一页。','教堂的门合上后，外面的动静远了。轮到你留下自己的说法。','同一块玉，在不同人的话里走过了不同的路。你先把这些说法分开记下。'],
  3:['六个人回到桌旁。那部手机安静了一阵，谁也没有把它收走。','如果它再响起，你想听清对面是否真的在回答屋里的人。','纸和笔已经摆好。你将写下自己的意见，也会听见其他人的态度。','教堂门前，薇薇安停了一下。你还可以回看刚才留下的记录，再决定怎样回答。'],
  4:['柜子倒地的闷响过后，众人发现陈信受了伤。','先处理伤口。他遭到袭击，但这栋房子里还有许多地方没有查过。','翻倒的柜子和周围的物件仍留在原处。你准备把现场所见一件件记下。','走廊通向各个房间。接下来要核对的不只是某个人的话，还有这栋房子本身。'],
  5:['警方终于打开了大门。那天在别墅里留下的说法，随后都被整理成供述。','两天后，活动室改成临时案情室。你以'+v.self.name+'的身份坐到桌前，面前是六份记录。','调查者各自带来了材料。有些事是亲眼所见，有些只是听别人说过。','你翻开曾经相信的那份供述。这次，可以把它与其他记录并排放着读。'],
  6:['关于死者的名字，现有材料还留下了疑问。你把身份一项重新圈出。','别墅外也有记录。离开缆车站的那个人，究竟是谁？','大家记住了手机显示的时间。现在，需要检查这部手机本身。','把原话与另一份材料放在一起。你希望听到的，是当事人对那处冲突的解释。']
 })[chapter];
 return caption.map((title,panel)=>({image:art+'comic-chapter-'+chapter+'.png',panel,chapter:'第'+chapter+'章',title,caption:title,paragraphs:[lines[panel]],foot:chapter<5?'这是一份供述。人物的说法仍需核对。':'已知材料与当时判断分别留档。'}));
}
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
 const interludes=Array.from({length:Math.max(0,s.chapterId-1)},(_,i)=>({id:'chapter-'+(i+2),title:'第'+(i+2)+'章 · '+(chapters[i+1].title),pages:pages(v,i+1),action:{type:'case',label:'接着调查',text:i+2===s.chapterId?v.progress.next:'记录仍保存在手记里。'}}));
 if(s.ending)interludes.push({id:'case-closed',title:'案件之后',pages:[{title:'把记录放在一起',text:'原话、现场与独立核查已经归档。'+v.ending.epilogue[3].text},{title:'陈信的交代',text:v.ending.epilogue[1].text},{title:'红雪留下的位置',text:v.ending.epilogue[0].text},{title:'案件之后',text:s.ending.closure}].map((part,panel)=>({image:art+'comic-ending.png',panel,chapter:'终章复盘',title:part.title,caption:part.title,paragraphs:[part.text],foot:'以本次核实结果为准。'})),action:{type:'case',label:'查看结案记录',text:s.ending.closure}});
 return {...v,scene:{...v.scene,spots:v.scene.spots.map(p=>({...p,...illustration(s,p)}))},title:'第7号嫌疑人',publicRoom,publicRoomName:roomName(publicRoom),prologueTitle:'前情 · 伴山别墅',phase:0,people:all,
  rooms:v.scene.rooms.map(r=>({...r,accessible:r.walkable!==false,reserved:r.walkable===false,description:r.name})),
  spots:v.scene.spots.map(p=>({...p,name:p.label,...illustration(s,p)})),clues,chats:s.chats,shown:s.shown||{},chatSetting:s.chatSetting||null,
  events:v.records.filter(r=>!r.private).map(r=>({...r,kind:r.kind==='verified'?'public':r.kind})),publicReactions:s.publicReactions||{},interactions:caseInteractions(s),
  objective:v.chapter.question,lead:{title:v.progress.next,text:v.chapter.question,label:v.progress.ready&&s.chapterId<6?'进入下一章':'查看当前调查',steps:v.progress.checks.map(c=>(c.done?'✓ ':'○ ')+c.label),action:'case',tab:'case'},
  self:{...v.self,reason:v.self.hook},
  investigation:{budget:null,pointsSpent:0,progress:{label:'章节',current:s.chapterId,total:6},total:s.ending?.score||0,scores,ruleNote:'阅读、提问和修改猜测不扣分。直接揭示答案单独留档；首次结案后开放全部角色。',penalties:[],secrets:v.self.private?[{id:'own-account',title:'个人记录',text:v.self.private,exposedTo:[]}]:[],goals:[{id:'case',kind:'主线',title:v.chapter.title,text:v.chapter.question,done:!!s.ending}]},
  dossiers:Object.fromEntries(all.map(p=>[p.id,{biography:p.role,related:clues.filter(e=>e.actor===p.id).map(({id,title,kind})=>({id,title,kind})),conversations:(s.chats[p.id]||[]).filter(l=>l.who===p.id).length,shown:(s.shown?.[p.id]||[]).length,roomStatus:p.locationLabel,question:v.accounts.find(q=>q.actor===p.id&&!q.read)?.title||'可以出示已取得的线索，问清这句话的来源。',lastWords:(s.chats[p.id]||[]).filter(l=>l.who===p.id).at(-1)?.text}])),
  storyPages:pages(v,0),interludes
 };
}
