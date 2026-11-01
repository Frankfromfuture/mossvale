import {selectRelevant} from '../npc-memory.mjs';
import {randomUUID} from 'node:crypto';
import {chapters,evidence,statements,calls,biographies,confrontations,questions,chainQuestions,people,routes,person} from './catalog.mjs';
const fingerprint=input=>JSON.stringify(Object.fromEntries(Object.entries(input).filter(([key])=>!['requestId','slotToken'].includes(key))));
const validRequest=id=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{7,79}$/.test(id)&&!['constructor','prototype','__proto__'].includes(id);
const byId=id=>evidence.find(e=>e.id===id)||statements.find(e=>e.id===id);
const own=(o,k)=>Object.hasOwn(o,k);
const need=(ok,message)=>{if(!ok){const e=Error(message);e.status=400;throw e;}};
const found=(s,id)=>s.found.includes(id);
const add=(s,id)=>{if(!found(s,id))s.found.push(id);};
const addRecord=(s,text,kind='observation',extra={})=>s.records.push({id:randomUUID(),chapter:s.chapterId,viewpoint:s.playerId,kind,text,...extra});
const roomDefs=[
 {id:'dining',name:'餐厅',floor:1,w:12,d:4,x:-2,z:2,chapter:1,decor:'table'},
 {id:'lounge',name:'客厅',floor:1,w:8,d:4,x:0,z:-2,chapter:1,decor:'sofa'},
 {id:'rest',name:'休息室',floor:1,w:4,d:3,x:6,z:-2.5,chapter:1,decor:'sofa'},
 {id:'kitchen',name:'厨房',floor:1,w:4,d:4,x:-6,z:-2,chapter:1,decor:'kitchen'},
 {id:'landing',name:'楼梯口',floor:1,w:4,d:4,x:6,z:2,chapter:1,decor:'stairs'},
 {id:'bedroom-a',name:'卧室 A',floor:2,w:4.5,d:5,x:.25,z:-2.5,chapter:2,decor:'bed'},
 {id:'bedroom-b',name:'卧室 B',floor:2,w:4.5,d:5,x:4.75,z:-2.5,chapter:2,decor:'bed'},
 {id:'activity',name:'活动室',floor:2,w:6,d:2.5,x:-4,z:3.75,chapter:2,decor:'toys'},
 {id:'storage',name:'仓库',floor:2,w:2,d:2.5,x:-6,z:1.25,chapter:2,decor:'shelves'},
 {id:'landing2',name:'二楼走廊',floor:2,w:8,d:5,x:3,z:2.5,chapter:2,decor:'stairs'},
 {id:'chapel',name:'教堂',floor:3,w:6,d:4,x:3,z:-2,chapter:2,decor:'chapel'},
 {id:'study',name:'书房',floor:3,w:2.5,d:2.5,x:-4.75,z:2.75,chapter:4,decor:'study'},
 {id:'washroom',name:'洗手间',floor:3,w:2.5,d:2.5,x:-2.25,z:2.75,chapter:4,decor:'washroom'},
 {id:'landing3',name:'三楼走廊',floor:3,w:7,d:4,x:2.5,z:2,chapter:4,decor:'stairs'},
 {id:'attic',name:'阁楼',floor:4,w:5,d:5,x:0,z:0,chapter:4,decor:'attic'},
 // The sealed room has a separate cutaway; it is absent from every pre-unlock projection.
 {id:'secret',name:'阁楼密室',floor:4,w:8,d:7,x:0,z:0,chapter:4,decor:'control',requires:'unlocked'},
 {id:'garage',name:'地下车库',floor:0,w:10,d:10,x:-3,z:0,chapter:4,decor:'garage'},
 {id:'pool',name:'暖室与温泉',floor:0,w:6,d:5,x:5,z:-2.5,chapter:4,decor:'pool'},
 {id:'meeting',name:'案情会议室',floor:5,w:10,d:10,x:0,z:0,chapter:5,decor:'meeting'}
];
const footprints={0:{w:16,d:10},1:{w:16,d:8},2:{w:14,d:10},3:{w:12,d:8}};
const roomAccess=(s,r)=>r.chapter<=s.chapterId&&(!r.requires||s.flags[r.requires]);
const accessible=s=>roomDefs.filter(r=>roomAccess(s,r));
export function createGame(routeId='andy'){
 need(routes.some(r=>r.id===routeId),'没有这条路线。');
 return {scriptId:'suspect7',version:1,routeId,playerId:routeId,chapterId:1,viewpointMode:'testimony',started:false,room:'dining',revision:0,found:[],flags:{},records:[],notes:'',chapters:[],chatLog:[],chats:{},positions:{},hypotheses:[],oldAnswers:{},hints:{},reveals:[],seen:{},ending:null};
}
function visibleActors(s){return (s.chapterId>=5?people:people.slice(0,6)).filter(p=>p.id!==s.playerId);}
function positions(s){const place=s.chapterId>=5?'meeting':['dining','lounge'].includes(s.room)?s.room:'dining';return Object.fromEntries(visibleActors(s).map(p=>[p.id,place]));}
function quoteVisible(s,q){return q.chapter<=s.chapterId&&found(s,q.id);}
function visibleEvidence(s){return s.found.map(byId).filter(Boolean).map(e=>({...e,text:e.id==='carpet'&&s.playerId==='andy'?e.perspectiveText:e.text,perspectiveText:undefined}));}
const privateIds=s=>s.chapterId<5?[s.routeId+'-private']:[];
const step=(label,done)=>({label,done:!!done});
export function requirements(s){
 const f=id=>found(s,id),b=k=>s.flags[k];
 if(s.chapterId===1)return [step('查看大门、手机、厨房和楼梯', ['exit','phone','kitchen','stairs'].every(f)),step('听完第一次来电',b('call1'))];
 if(s.chapterId===2)return [step('记录六人的旧案说法',people.slice(0,6).every(p=>f(p.id+'-old'))),step('到教堂阅读自己的供述',b('confession')),step('留下对两拨劫匪的判断',b('old-outline'))];
 if(s.chapterId===3)return [step('重看第二次来电并比较回应',b('calls-compared')),step('到教堂投票',b('voted'))];
 if(s.chapterId===4)return [step('检查伤口、手杖、温泉与书房', ['injury','cane','body','pool-items','outlet','measure','photo','paternity','keypad','spare-ball','toolbox'].every(f)),step('进入密室并检查设备', ['console','relay','camera','paint','pump','monitor','autodial','passage'].every(f)),step('在纸面复原运输顺序',b('reconstructed')),step('记下一份待核查的假说',b('villa-theory'))];
 if(s.chapterId===5)return [step('领取五位调查者的材料', ['wuquan','raven','cuiyuan','xiaoguo','aiyijun'].every(id=>f(id+'-file'))),step('核查白色调查资料', ['robbery-file','hong-record','cable','blood','phone-check','no-gas'].every(f)),step('提交阶段判断或注明证据不足',b('provisional'))];
 return [step('取得四项独立复核', ['dental','departure','clock-check','chen-link'].every(f)),step('完成陈信的双证据追问',b('chen-confession')),step('提交最终结案',s.ending)];
}
function progress(s){const req=requirements(s);return {checks:req,ready:req.every(r=>r.done),next:req.find(r=>!r.done)?.label|| (s.chapterId<6?'可以继续下一章':'调查已完成')};}
const projectionQuestions=xs=>xs.map(({answer,...q})=>q);
export function view(s,ai={}){
 const chapter=chapters[s.chapterId-1],room=roomDefs.find(r=>r.id===s.room),all=accessible(s),activePeople=visibleActors(s);
 const spots=evidence.filter(e=>e.chapter<=s.chapterId&&e.room===s.room&&!e.request).map(e=>({id:e.id,label:e.title,found:found(s,e.id),kind:propKind(e.id)}));
 const accounts=statements.filter(q=>q.chapter<=s.chapterId&&q.id!=='jade-confession').map(q=>({id:q.id,actor:q.actor,title:q.title,read:found(s,q.id)}));
 s.positions=positions(s);
 return {scriptId:'suspect7',routeId:s.routeId,playerId:s.playerId,perspectiveActorId:s.playerId,viewpointMode:s.viewpointMode,chapterId:s.chapterId,chapter,started:s.started,revision:s.revision,room:s.room,
  self:{...person(s.playerId),hook:s.chapterId<5?biographies[s.routeId].hook:'把眼前的供述与可引用的证据分别保存。',history:s.chapterId<5?biographies[s.routeId].past:[statements.find(q=>q.actor===s.playerId)?.text||'你仍以李察的身份参与调查，自己留下的报告也将接受核对。'],private:s.chapterId<5?biographies[s.routeId].private:null},
  people:activePeople.map(p=>({...p,near:s.positions[p.id]===s.room})),places:all.map(({requires,...r})=>({id:r.id,name:r.name,floor:r.floor})),
  scene:{...room,footprint:footprints[room.floor]||{w:room.w,d:room.d},rooms:all.filter(r=>r.floor===room.floor&&(r.id==='secret'?s.room==='secret':s.room!=='secret')).map(({requires,...r})=>r),spots},
  evidence:visibleEvidence(s),accounts,flags:{...s.flags},voteTally:s.voteTally||null,progress:progress(s),records:s.records,notes:s.notes,hypotheses:s.hypotheses,chapterHistory:s.chapters,
  testimonyBoundary:s.chapterId<5?'你正在进入'+person(s.routeId).name+'对那一天的供述。未交代的行动留白，人物说法仍待核实。':'前一角色的私人记忆留在玩家旁注；对质使用当前调查已经取得的材料。',
  conversations:s.chatLog.filter(l=>l.viewpoint===s.playerId&&l.chapter>= (s.chapterId>=5?5:1)),
  calls:Object.values(calls).filter(c=>c.chapter<=s.chapterId),
  confrontations:confrontations.filter(c=>c.chapter<=s.chapterId&&found(s,c.quote)).map(({result,requires,unlock,...c})=>({...c,done:!!s.flags[unlock],ready:[c.evidence,...requires].every(id=>found(s,id)),needed:[c.evidence,...requires].filter(id=>!found(s,id)).map(id=>byId(id)?.title||id)})),
  reports:s.chapterId>=6?[
   {id:'identity',title:'复核温泉遗体身份',basis:['body','dna'],done:found(s,'dental')},
   {id:'departure',title:'复核离站者身份',basis:['cable','driver'],done:found(s,'departure')},
   {id:'clock',title:'检查手机校时记录',basis:['console','autodial'],done:found(s,'clock-check')},
   {id:'chen',title:'核对事故、借款与色觉记录',basis:['wuquan-file','xiaoguo-file','aiyijun-file'],done:found(s,'chen-link')}
  ]:[],oldQuestions:s.chapterId>=5?projectionQuestions(questions.old):[],finalQuestions:s.chapterId>=6?projectionQuestions(questions.final):[],chainQuestions:s.chapterId>=6?chainQuestions.map(({answer,needs,...q})=>q):[],oldAnswers:s.oldAnswers,
  hint:s.lastHint||null,reveals:s.reveals,ending:s.ending,ai};
}
function propKind(id){return ({exit:'door',phone:'phone',kitchen:'pan',stairs:'door',toys:'ball','spare-ball':'ball','garage-gate':'door',toolbox:'box',lighter:'lighter',carpet:'rug',injury:'document',cane:'cane',body:'shroud',temperature:'dial','pool-items':'mask',outlet:'grate',key:'key',measure:'tape',photo:'photo',paternity:'document',keypad:'keypad',console:'console',relay:'document',camera:'camera',paint:'paint',pump:'pump',monitor:'screen',autodial:'phone',wine:'wine',passage:'door'})[id]||'document';}
const allow=(s,chapter)=>need(s.chapterId>=chapter,'这份材料尚未进入当前调查。');
const remember=(s,id)=>{const q=byId(id);add(s,id);if(!s.records.some(r=>r.evidence===id))addRecord(s,q.text,q.kind,{evidence:id,actor:q.actor,source:q.source,audience:q.actor?[s.playerId,q.actor]:[s.playerId]});};
export function act(s,input){
 need(input&&typeof input.type==='string','请选一项操作。');
 if(input.requestId){need(validRequest(input.requestId),'请求编号无效。');if(own(s.seen,input.requestId)){need(s.seen[input.requestId].fingerprint===fingerprint(input),'请求编号已用于另一项操作。');return {cached:true,...s.seen[input.requestId].result};}}
 let result={};
 switch(input.type){
  case 'begin':s.started=true;break;
  case 'move':{need(s.started,'先翻开当前供述。');const r=accessible(s).find(r=>r.id===input.room);need(r,'这个地点还没有开放。');s.room=r.id;break;}
  case 'inspect':{const e=evidence.find(e=>e.id===input.id);need(e&&e.chapter<=s.chapterId&&!e.request&&e.room===s.room,'先到相应地点检查这件物品。');remember(s,e.id);result={clue:e.id};break;}
  case 'account':{const q=statements.find(q=>q.id===input.id);need(q&&q.chapter<=s.chapterId&&q.id!=='jade-confession','这份供述还未取得。');need(s.chapterId>=5||['dining','lounge','chapel'].includes(s.room),'回到公共空间听取供述。');remember(s,q.id);result={clue:q.id};break;}
  case 'confession':allow(s,2);need(s.chapterId<5&&s.room==='chapel','先到教堂阅读自己的供述。');if(!s.flags.confession)addRecord(s,biographies[s.routeId].confession,'testimony',{actor:s.routeId,audience:[s.routeId],private:true});s.flags.confession=true;result={message:biographies[s.routeId].confession};break;
  case 'play-call':{const call=Object.values(calls).find(c=>c.id===input.id);need(call&&call.chapter<=s.chapterId,'这通来电尚未发生。');need(s.room==='dining'||s.flags[call.id],'先回餐厅接听来电。');if(!s.flags[call.id]){s.flags[call.id]=true;addRecord(s,call.frames.map(f=>f.speaker+'：'+f.text).join('\n'),'observation',{call:call.id,audience:people.slice(0,6).map(p=>p.id)});}break;}
  case 'compare-calls':allow(s,3);need(s.flags.call1&&s.flags.call2,'先听完两次来电。');need(input.first==='responds'&&input.second==='continuous','把每次来电如何回应插话分别记下，再比较。');s.flags['calls-compared']=true;addRecord(s,'第一次回应了现场插话，第二次连续宣读。实时声音与录音的区别值得继续核查。','hypothesis');break;
  case 'vote':allow(s,3);need(s.chapterId===3&&s.room==='chapel','在第三章的教堂投票。');need(s.flags['calls-compared'],'先比较两次来电。');need(['yes','no','abstain'].includes(input.choice),'请选一项投票意见。');if(!s.flags.voted){s.flags.voted=true;s.vote=input.choice;const ballots={andy:'no',franklin:'yes',hongxue:'no',vivian:'yes',chenxin:'no',licha:'no'};ballots[s.routeId]=input.choice;s.voteTally={yes:0,no:0,abstain:0};for(const choice of Object.values(ballots))s.voteTally[choice]++;addRecord(s,`匿名计票：该死${s.voteTally.yes}票，不该死${s.voteTally.no}票，弃权${s.voteTally.abstain}票。`,'observation',{audience:people.slice(0,6).map(p=>p.id)});addRecord(s,'你选择了'+({yes:'“该死”',no:'“不该死”',abstain:'弃权，拒绝用投票决定生死'}[input.choice])+'。其他纸条混在一起，只公布意见，不据此改动已发生的案件。','testimony',{actor:s.playerId,audience:[s.playerId]});}result={message:`匿名计票：该死${s.voteTally.yes}，不该死${s.voteTally.no}，弃权${s.voteTally.abstain}。`+(s.vote==='yes'?'纸条收进盒中。红雪没有抬头。':s.vote==='no'?'纸条收进盒中。李察说：“先把事实查清楚。”':'你把空白纸条折好，留下了自己的反对。')};break;
  case 'unlock':allow(s,4);need(s.room==='attic'&&found(s,'photo')&&found(s,'keypad'),'先检查阁楼输入器与书房照片。');need(String(input.code)==='9426936','键盘没有响应。七位数字与照片背面的名字有什么关系？');s.flags.unlocked=true;addRecord(s,'晓雯 → XIAOWEN → 九键9426936。柜后门锁打开。');result={message:'门锁轻响。阁楼密室已开放。'};break;
  case 'measure':allow(s,4);need(found(s,'measure'),'先在书房找到卷尺并记录尺寸。');s.flags.measured=true;addRecord(s,'你叠放了已测楼层的平面。面积和错位楼梯留下了空间疑问，尚不能由此直接画出暗道。','hypothesis');break;
  case 'reconstruct':allow(s,4);need(['spare-ball','pump','pool-items','passage'].every(id=>found(s,id)),'先查仓库的未拆封撞球、气泵、池中物和暗道。');need(JSON.stringify(input.order)===JSON.stringify(['load','seal','inflate','transport','release']),'这一顺序还无法解释装载、封口与运输。可查看分级提示，再调整纸面模型。');s.flags.reconstructed=true;addRecord(s,'纸面复原：装入撞球的中空位置、封口、充气、沿坡道运输、在池上方释放。它能解释暗道无血与池中塑料，仍需结合检验报告。','hypothesis');result={message:'复原成立。模型只检验过去可能发生的过程，现场没有被改动。'};break;
  case 'hypothesis':{need(typeof input.text==='string'&&input.text.trim().length>=2&&input.text.length<=2500,'写下至少两字的判断或疑问。');const entry={id:randomUUID(),chapter:s.chapterId,viewpoint:s.playerId,text:input.text.trim(),kind:'hypothesis',status:'待核实'};s.hypotheses.push(entry);if(s.chapterId===2)s.flags['old-outline']=true;if(s.chapterId===4)s.flags['villa-theory']=true;break;}
  case 'withdraw':{const h=s.hypotheses.find(h=>h.id===input.id);need(h,'没有这项假说。');h.status='已撤回';break;}
  case 'notes':need(typeof input.text==='string'&&input.text.length<=12000,'旁注最多12000字。');s.notes=input.text;break;
  case 'report':{allow(s,6);const report=view(s).reports.find(r=>r.id===input.id);need(report&&report.basis.every(id=>found(s,id)),'先取得申请所需的现场或供述依据。');need(typeof input.question==='string'&&input.question.trim().length>=2,'写下希望核查的问题。');const e=evidence.find(e=>e.request===report.id);remember(s,e.id);addRecord(s,'申请复核：'+input.question.trim().slice(0,500),'hypothesis',{request:report.id});result={clue:e.id};break;}
  case 'compare':{const q=byId(input.quote),e=byId(input.evidence);need(q&&e&&q.id!==e.id&&found(s,q.id)&&found(s,e.id),'选择两份已经取得的不同材料。');const c=confrontations.find(c=>c.quote===q.id&&c.evidence===e.id);if(c&&s.chapterId>=c.chapter){need(c.requires.every(id=>found(s,id)),'这次追问还需要：'+c.requires.filter(id=>!found(s,id)).map(id=>byId(id).title).join('、'));if(!s.flags[c.unlock]){s.flags[c.unlock]=true;addRecord(s,c.result,'verified',{actor:c.actor,evidencePair:[q.id,e.id],audience:[s.playerId,c.actor]});if(c.id==='jade')remember(s,'jade-confession');}result={message:c.result};}else{addRecord(s,'并排核对：'+q.title+' / '+e.title,'hypothesis',{evidencePair:[q.id,e.id]});result={message:'两份材料已并排留档。它们的联系仍由你判断。'};}break;}
  case 'provisional':{allow(s,5);need(s.chapterId===5,'阶段判断在第五章提交。');validateAnswers(questions.old,input.answers);s.oldAnswers={...input.answers};need(['insufficient','vivian-theory','other'].includes(input.status),'为阶段推论选择状态。');s.flags.provisional=true;s.provisional={status:input.status,text:String(input.text||'仍有身份或时间疑点').slice(0,2500)};addRecord(s,input.status==='vivian-theory'?'暂存推论：薇薇安可能是周婕，在14:30—15:20杀死被认作洪青的死者。两项身份与时间均待核实。':s.provisional.text,'hypothesis');break;}
  case 'advance':{need(s.chapterId<6,'已到终章。');need(progress(s).ready,'还需要：'+progress(s).next);s.chapters.push({chapter:s.chapterId,title:chapters[s.chapterId-1].title,judgment:s.hypotheses.filter(h=>h.chapter===s.chapterId).at(-1)?.text||s.provisional?.text||'已保存当章记录。',next:chapters[s.chapterId].next});s.chapterId++;s.room=s.chapterId===4?'attic':s.chapterId>=5?'meeting':'dining';if(s.chapterId===4){for(const id of ['franklin-shadow','hongxue-shadow','chenxin-time'])remember(s,id);addRecord(s,'阁楼传来惨叫与柜子倒地的闷响。发现陈信受伤后，众人转入现场检查。','observation');}if(s.chapterId===5){s.playerId=routes.find(r=>r.id===s.routeId).investigator;s.viewpointMode='investigation';s.chats={};s.positions=positions(s);addRecord(s,'警方破门。两天后，调查者开始核对六份供述。此前的私人独白留在玩家旁注，不自动成为调查者知道的事实。');}s.lastHint=null;break;}
  case 'hint':{const level=Math.max(1,Math.min(3,Number(input.level)||1));s.hints[s.chapterId]=Math.max(s.hints[s.chapterId]||0,level);s.lastHint=hint(s,level);if(level===3&&!s.reveals.includes(s.chapterId))s.reveals.push(s.chapterId);result={message:s.lastHint};break;}
  case 'final':{allow(s,6);need(!s.ending,'结案记录已保存。');need(['dental','departure','clock-check','chen-link'].every(id=>found(s,id))&&s.flags['chen-confession'],'先取得独立复核，完成陈信对质。');validateAnswers(questions.old,input.oldAnswers);validateAnswers(questions.final,input.answers);need(input.chains&&chainQuestions.every(q=>found(s,input.chains[q.id])),'为每项证据连接选一份已取得的材料。');const old=questions.old.map(q=>({title:q.title,chosen:input.oldAnswers[q.id],answer:q.answer,points:input.oldAnswers[q.id]===q.answer?10:0}));const main=questions.final.map(q=>({title:q.title,chosen:input.answers[q.id],answer:q.answer,points:input.answers[q.id]===q.answer?10:0}));const chains=chainQuestions.map(q=>({title:q.title,chosen:byId(input.chains[q.id]).title,answer:byId(q.answer).title,points:input.chains[q.id]===q.answer?5:0}));s.ending={score:[...old,...main,...chains].reduce((v,q)=>v+q.points,0),old,main,chains,reveals:[...s.reveals],closure:biographies[s.routeId].closure,epilogue:epilogue(s),choice:input.choice==='disclose'?'你留下了完整交代。':'你保留私人旁注，已核实的案件证据照常留档。'};s.oldAnswers={...input.oldAnswers};addRecord(s,'终章结案已保存。六条路线全部开放。','verified');break;}
  default:throw Error('没有这项调查操作。');
 }
 s.revision++;s.positions=positions(s);
 if(input.requestId){s.seen[input.requestId]={fingerprint:fingerprint(input),result};const keys=Object.keys(s.seen);for(const key of keys.slice(0,-120))delete s.seen[key];}return result;
}
function validateAnswers(defs,answers){need(answers&&defs.every(q=>q.options.includes(answers[q.id])),'请为每项判断选择答案；证据不够时可选“证据不足”。');}
function hint(s,level){
 const target=progress(s).next;
 if(level===1)return '下一项可操作的调查：'+target+'。地点、原话和已取得证据都保存在调查手记。';
 if(level===2)return ({1:'餐厅看大门和手机，厨房查出口，再去楼梯口。回到餐厅接来电。',2:'公共空间可逐份听取旧案原话。自己的供述要到教堂阅读；把对两拨劫匪的疑问写入假说。',3:'先接第二次来电。比较对方是否停下来回答插话，再到教堂投票。',4:'书房照片背面是“晓雯”。把拼音映射到九键字母；密室设备检查完，再把撞球运输步骤排好。',5:'会议室领取资料；调查者原话从“供述”领取。阶段判断可以填证据不足。',6:'会议室查看红色调查资料，再提出身份、离站、校时和陈信关联四项复核申请。双证据追问选择一份原话和一份反证。'})[s.chapterId];
 return ({1:'先查大门、专用手机、厨房和楼梯，再播放第一次来电。',2:'两拨劫匪由洪青分别安排；六份旧案原话、自身供述和一条假说齐备后推进。',3:'第一次会回应现场插话，第二次连续宣读；投票选择不会改变案件事实。',4:'密码9426936。运输顺序：装载→封口→充气→沿坡道运输→释放。找到密室全部设备后留下假说。',5:'孙强冒名富兰克林；安迪是鬼手；孙强袭击陈信；红雪把玉藏在周雪墓中。阶段推论仍有身份和时间疑点。',6:'陈信杀死洪羽瑞，洪青已离开。作案窗口为第一次去教堂12:45—13:15；动机与合作、卧底处境及经济压力有关。牙科、校时、张佳身份和暗道结构分别支持四项证据连接。'})[s.chapterId];
}
function epilogue(s){return [
 {title:'两拨人，一块玉',text:'洪青安排正面抢劫，又让红雪雇鬼手截玉。孙强杀死周雪、艾诚。红雪留下玉，将它埋进养父墓中；安迪仍在寻找。',evidence:['robbery-file','jade-confession'].filter(id=>found(s,id))},
 {title:'空白的半小时',text:'洪青已经离开。画面中出现过洪青，却没有证据证明画面里的人与池中遗体是同一个人。陈信第一次上楼，在12:45—13:15杀死洪羽瑞，借别墅设备与暗道完成后续计划。',evidence:['dental','departure','chenxin-time','relay'].filter(id=>found(s,id))},
 {title:'洪青的计划',text:'洪青暗中转移资产，想摆脱警方控制，也要报复萧家。原作终章说明亲子鉴定的A、B样本来自洪青与洪羽瑞：用身材相近的洪羽瑞代替自己死去，是他计划的一部分。原表没有标明样本姓名，不能提前把这个对应关系当成表上的明文。',evidence:['paternity','funds','hong-record'].filter(id=>found(s,id))},
 {title:'我们共同看的那只钟',text:'第二次来电按录制内容连续播放。投票后手机被调时，后续口述共用了错误的时间。具体定时拨号分钟未获直接证据，结论保留这个空缺。',evidence:['clock-check','autodial','monitor'].filter(id=>found(s,id))},
 {title:'另一宗袭击',text:'孙强认出阿豪，用手杖剑袭击陈信。他谎称见到黑影。伤口、原话冲突与暗道结构把这宗袭击同温泉命案区分开。',evidence:['cane','injury','hongxue-shadow'].filter(id=>found(s,id))},
 {title:'撤回的名字',text:'薇薇安是张佳。她确实编造过故事，却不是周婕。以错误身份建立的复仇推论被撤回。司机遇害的行为人、烧车遗体的身份等枝节仍待继续核查。',evidence:['vivian-record','driver','car-fire'].filter(id=>found(s,id))}
 ];}
export function actorContext(s,actor,message,shown=[]){
 need(visibleActors(s).some(p=>p.id===actor),'这个人物尚未出现在当前调查。');
 need(positions(s)[actor]===s.room,s.chapterId>=5?'到案情会议室与对方交谈。':'回到餐厅或客厅公开交谈。');
 need(typeof message==='string'&&message.trim()&&message.length<=1500,'请写下不超过1500字的问题。');
 need(Array.isArray(shown)&&shown.length<=2&&shown.every(id=>found(s,id)),'只可出示当前已经取得的材料。');
 const p=person(actor),facts=statements.filter(q=>q.actor===actor&&q.chapter<=s.chapterId&&(q.id!=='jade-confession'||s.flags['jade-confirmed'])).map(q=>({id:q.id,text:q.text}));
 facts.push({id:'public-role',text:p.role});
 for(const c of confrontations.filter(c=>c.actor===actor&&s.flags[c.unlock])){const previous=facts.find(f=>f.id===c.quote);if(previous)previous.text='这段旧供述已被撤回或纠正：'+previous.text+'。当前回答以核实记录为准。';facts.push({id:'confession-'+c.id,text:c.result});}
 const available=s.chatLog.filter(l=>l.audience.includes(actor)&&l.audience.includes(s.playerId)&&l.viewpoint===s.playerId&&(s.chapterId<5||l.chapter>=5));
 const memories=available.slice(-18),old=selectRelevant(available.slice(0,-18),message,{limit:6,budget:4000,text:l=>l.text}).map(l=>({speaker:person(l.actor)?.name||l.actor,quote:l.text,kind:l.kind,commitment:/我会|答应|说好|我愿意/.test(l.text)}));
 return {name:p.name,actor,style:p.style,aim:'回答当前问题，维护尚未撤回的供述；已被证据推翻的部分如实改口。',playerId:s.playerId,playerName:person(s.playerId).name,playerRole:s.chapterId<5?'共同被困者，在供述片段内核对经过。':'调查者，根据已经取得的材料核对供述。',facts,shown:shown.map(id=>{const e=byId(id);return {id,title:e.title,text:e.text,kind:e.kind};}),heard:[],conversation:memories.map(l=>({who:l.actor,text:l.text})),recollections:old,casualQuestion:false,message};
}
export async function converse(s,input,generate,options={}){
 if(input.requestId){need(validRequest(input.requestId),'请求编号无效。');if(own(s.seen,input.requestId)){need(s.seen[input.requestId].fingerprint===fingerprint(input),'请求编号已用于另一项操作。');return {cached:true,...s.seen[input.requestId].result};}}
 const context=actorContext(s,input.actor,input.message,input.shown||[]);
 const reply=await generate(context);need(typeof reply.speech==='string'&&reply.speech.trim()&&reply.speech.length<=900,'这次回复不完整，请重试。');
 need(Array.isArray(reply.factIds)&&reply.factIds.every(id=>context.facts.some(f=>f.id===id)),'回复引用了当前人物尚未掌握的事实，请重试。');
 const forbidden=[[/系统提示|作为(?:一个)?AI|语言模型|输出JSON/i,true],[/洪羽瑞.{0,12}(死者|尸体)|(?:死者|尸体).{0,12}洪羽瑞/,!found(s,'dental')],[/我.{0,5}(杀死|杀害|杀了).{0,8}洪羽瑞|我.{0,6}(改了|调了|修改).{0,6}(手机|时间)/,input.actor==='chenxin'&&!s.flags['chen-confession']],[/我(?:就是|是)孙强/,input.actor==='franklin'&&!s.flags['sun-confirmed']],[/玉.{0,8}(埋|藏).{0,8}(墓|坟)/,input.actor==='hongxue'&&!s.flags['jade-confirmed']]];
 need(!forbidden.some(([rx,blocked])=>blocked&&rx.test(reply.speech)),'这句话超出了当前可核实的材料，请重试。');
 const audience=s.chapterId<5?people.slice(0,6).map(p=>p.id):[s.playerId,input.actor];
 const line=(actor,text)=>({id:randomUUID(),actor,text,chapter:s.chapterId,viewpoint:s.playerId,audience:[...audience],kind:'testimony'});
 const asked=line(s.playerId,input.message),answered={...line(input.actor,reply.speech),factIds:reply.factIds};s.chatLog.push(asked,answered);s.chats[input.actor]||=[];s.chats[input.actor].push({who:s.playerId,text:input.message},{who:input.actor,text:reply.speech});s.revision++;
 const result={speech:reply.speech,actor:input.actor};if(input.requestId){s.seen[input.requestId]={fingerprint:fingerprint(input),result};}options.onSpeech?.(reply.speech);return result;
}
