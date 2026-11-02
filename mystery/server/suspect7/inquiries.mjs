import {statements,evidence,confrontations,people,person} from './catalog.mjs';

const knows=(s,id)=>s.found.includes(id);
const material=id=>statements.find(q=>q.id===id)||evidence.find(e=>e.id===id);
export const newDialogue=(legacyThrough=0)=>({version:1,legacyThrough,steps:{},transcripts:{},leads:[]});
export const dialogueOf=s=>s.dialogue||newDialogue(s.started?s.chapterId:0);
export const strictChapter=s=>s.chapterId>dialogueOf(s).legacyThrough;
const key=(s,id)=>s.playerId+':'+id+(id==='case-theory'?':'+s.chapterId:'');
const custom=[
 {id:'arrival-chen',actor:'chenxin',chapter:1,title:'为什么被带到这里',prompt:'陈信，这里是什么地方？谁安排我们过来的？',follow:'既然你熟悉这里，厨房、院门还有没有别的出口？',guard:'这里是洪先生的伴山别墅。我负责接待客人，原定宴会临时改在这里。',text:'商务车接来的是今天的客人。别墅的门由设备控制，洪先生没有来迎客，司机也不在这里。可以沿厨房、前厅和院门检查出路。',flag:'arrival-chen',lead:{room:'kitchen',spot:'kitchen',title:'去厨房看看有没有后门'}},
 {id:'arrival-licha',actor:'licha',chapter:1,title:'怎样联系外面',prompt:'李队长，大家的手机都没了，现在怎么联系外面？',follow:'你最后清醒时在哪里？我们是不是都在那辆车上失去意识了？',guard:'先确认每个人的手机和最后记得的事情，别各自猜。',text:'大家最后都在商务车里，拉上车帘后睡着，后来在餐厅醒来，私人手机都失踪了。眼下需要检查餐厅里的专用手机和紧闭的出口。',flag:'arrival-licha',lead:{room:'dining',spot:'phone',title:'查看餐厅的专用手机'}},
 {id:'call-difference',actors:['licha','hongxue'],chapter:3,title:'电话另一头有没有在听',prompt:'第二次电话里有人插话，它为什么还一直往下说？你觉得和第一次有什么不同？',follow:'第一次能接住屋里的插话，第二次却没回应。第二段声音会不会事先录好了？',guard:'先把两次电话怎样接话分开想，别只看电视里的人。',text:'第一次的声音停顿并回应了屋内的插话，第二次却连续宣读，没有回应。第二次可能是录制的声音；画面和声音是否实时，还要分别核查。',flag:'calls-compared',needsFlags:['call1','call2'],lead:{room:'chapel',spot:'carpet',title:'到教堂留下自己的投票意见'}}
];
const questions={
 'andy-old':['你知道当年停车场截玉的事吗？','那个女人怎样雇鬼手？交接后又发生了什么？','有个女人找鬼手截过玉，后来女人和玉都不见了。'],
 'franklin-old':['你和孙强是什么关系？','是谁介绍孙强给你？拍卖行里的细节又是谁告诉你的？','孙强在美国替我做过事，拍卖行的事是他告诉我的。'],
 'hongxue-old':['洪青那块玉后来去了哪里？','你凭什么说是鬼手拿走的？当时你向洪青怎样交代？','洪先生还在找那块玉，鬼手经手过。'],
 'vivian-old':['你听见孙强的名字，为什么那么在意？','你和孙强究竟是什么关系？他对你做过什么？','那个名字让我想起不愿提的事。'],
 'chenxin-old':['两年前拍卖行的案子，你知道多少？','你和旧案有什么关系？别只说现在的保镖工作。','我现在替洪先生做事。旧案的事，我知道一些。'],
 'licha-old':['李队长，当年拍卖行劫案是怎么回事？','孙强后来怎么逃走的？你在警方报告里怎么写？','那是警方办过的案子，孙强一直在逃。'],
 'franklin-shadow':['陈信惨叫时，你在哪里？','你看见的黑影走哪条路？有没有经过休息室门口？','我在书房听见惨叫，开门后看见了动静。'],
 'hongxue-shadow':['惨叫时你在什么地方？有没有出去？','你当时具体站在哪里？有人沿东廊经过你面前吗？','我在休息室，听到声音就开门查看。'],
 'chenxin-time':['第一次离开餐厅，你去了哪里？','你几点去、几点回来？这个时间是看哪只钟记的？','我第一次离开餐厅，是去教堂。'],
 'wuquan-file':['你为什么来调查这件事？','你哥哥与富兰克林有来往吗？安迪后来还找过玉吗？','我为哥哥的死而来，也认识这起案子里的几个人。'],
 'raven-file':['你以前怎么接触富兰克林的？','鬼手那封残信具体留下了什么线索？','我调查过富兰克林的走私活动，用过法律顾问的身份。'],
 'cuiyuan-file':['红雪委托你做什么？','她准备交代什么？你在韩国认识的张佳又是谁？','红雪找我谈过自首，有些事准备交代。'],
 'xiaoguo-file':['洪家有哪些事情和案子有关？','安迪小时候的经历、陈信借钱的事，你各自知道什么？','我熟悉洪家的往事，陈信也找我借过钱。'],
 'aiyijun-file':['警方在会前向你说明了哪些情况？','陈信和阿豪是什么关系？他为什么一直留在洪青身边？','陈信的情况，局长向我说过一些。'],
 'chen-after-noon':['获救后，你向警方补充了哪些经过？','你说中午以后还见过洪青，遇袭前又在哪里？','我向警方说过中午以后与遇袭前的经过。']
};
const leads={
 'franklin-old':{actor:'licha',prompt:'孙强在旧案里到底做过什么？',title:'向李察核对孙强的旧案'},
 'hongxue-old':{actor:'franklin',prompt:'你听说定远玉最后被谁拿走了吗？',title:'找富兰克林问玉的下落'},
 'vivian-old':{actor:'licha',prompt:'孙强当年的身份和经历，你能确认哪些？',title:'找李察核对孙强的情况'},
 'licha-old':{room:'activity',spot:'toys',title:'看看活动室里有什么'},
 'franklin-shadow':{room:'study',spot:'cane',title:'去书房检查那根手杖'},
 'hongxue-shadow':{room:'rest',title:'沿休息室门口核对视线'},
 'chenxin-time':{actor:'licha',prompt:'这部手机显示的时间，有没有跟外面核对过？',title:'向李察问清时间从哪里来'},
 'raven-file':{actor:'andy',prompt:'鬼手的残信提到东北生活，这与你有什么关系？',title:'带着残信找安迪核对'},
 'cuiyuan-file':{actor:'hongxue',prompt:'崔媛说你准备自首，你愿意交代玉的去向吗？',title:'回头问红雪准备交代什么'},
 'xiaoguo-file':{actor:'chenxin',prompt:'你为什么找萧过借钱？母亲出了什么事？',title:'向陈信问清借款缘由'}
};
const confessions={
 identity:'我就是孙强，富兰克林是我冒用的身份。吴斌没有把我介绍给富兰克林做事；那些拍卖行的细节，是我亲历的。',
 ghost:'鬼手就是我。我接过停车场截玉的活，交接之后失去意识。醒来时，那个女人和玉都不见了，我一直在找下落。',
 assault:'是我用手杖里的剑刺了陈信。沿东廊逃走的黑影是我编的，这与温泉里的人是两件事。',
 jade:'玉是我留下的，埋在养父周雪的墓里。鬼手没有拿着它，是我把责任推给了他。我愿意留下完整交代。',
 vivian:'我是张佳，不是周婕。和孙强谈恋爱的故事是我编的；我以为绑匪可能是朋友，想替她引开注意，可我并没有确认那个人是谁。',
 chen:'我与洪青合作，在第一次去教堂的12:45—13:15之间杀死了洪羽瑞，随后清理、转运，修改手机时间并删除记录。我急于结束卧底工作，也需要解决母亲住院带来的经济压力。'
};
const defenses={
 identity:'我刚才说消息是孙强告诉我的，也说过是吴斌介绍。你拿来的记录与这个说法不合，我听明白了，但还没把自己的来历交代全。',
 ghost:'那封信的生活背景确实与你知道的我有相近之处。我还在找玉，这一点没有变。',
 assault:'我先前说过看见黑影跑过东廊。红雪却一直在门口，没有看见；这处冲突我还没有解释。',
 jade:'我以前把失玉的责任推给鬼手，可吴全的记录表明，他后来还在找玉。这与我的说法对不上。',
 vivian:'我说过孙强是男朋友。你拿来的资料又把张佳和周婕分开了，那段故事的确还有我没有讲清的地方。',
 chen:'手机时间靠不住，死者身份又经过了复核。你指出的那次离席，与我后来向警方说的经过对不上，我知道你在问哪一段。'
};
const reportDefs=[
 {id:'identity',actors:['aiyijun','raven'],title:'核实温泉死者',prompt:'能否申请独立核查温泉遗体的身份？现有DNA检验还不够。',basis:['body','dna'],result:'dental'},
 {id:'departure',actors:['raven','licha'],title:'核实离站的人',prompt:'请协助复核缆车站离站者的身份，别只凭衣帽猜。',basis:['cable','driver'],result:'departure'},
 {id:'clock',actors:['raven','cuiyuan'],title:'检查手机改时',prompt:'请申请技术检查，这部手机有没有被人工改过时间？',basis:['console','autodial'],result:'clock-check'},
 {id:'chen',actors:['xiaoguo','aiyijun'],title:'把事故和借款对上',prompt:'请核对陈信母亲的事故、借款和色觉资料，是否对应同一个人？',basis:['wuquan-file','xiaoguo-file','aiyijun-file'],result:'chen-link'}
];
export function topics(s,actor){
 const list=custom.filter(t=>(t.actor===actor||t.actors?.includes(actor))&&t.chapter<=s.chapterId).map(t=>({...t,kind:'lead'}));
 for(const q of statements.filter(q=>q.actor===actor&&q.chapter<=s.chapterId&&q.id!=='jade-confession')){
  const [prompt,follow,guard]=questions[q.id]||['关于“'+q.title.split('：').at(-1)+'”，你亲自知道什么？','这件事你怎么知道的？请把亲见与听来的部分说清。',q.text.split('。')[0]+'。'];
  list.push({id:'account:'+q.id,kind:'account',actor,chapter:q.chapter,title:q.title,prompt,follow,guard,text:q.text,record:q.id,lead:leads[q.id]});
 }
 for(const c of confrontations.filter(c=>c.actor===actor&&c.chapter<=s.chapterId&&knows(s,c.quote))){
  list.push({id:'confront:'+c.id,kind:'confront',actor,chapter:c.chapter,title:c.title,prompt:'关于“'+material(c.quote).title+'”，这两份材料的冲突你怎么解释？',follow:'你刚才没有解释这处矛盾，请把隐去的那段经过说清楚。',guard:defenses[c.id],text:confessions[c.id],confrontation:c});
 }
 if(s.chapterId===6)for(const r of reportDefs.filter(r=>r.actors.includes(actor)))list.push({...r,id:'report:'+r.id,kind:'report',chapter:6,guard:'需要把现有材料交给独立核查。你希望具体确认哪一项？',follow:r.prompt,text:material(r.result).text});
 if([2,4,5].includes(s.chapterId))list.push({id:'case-theory',kind:'theory',actor,chapter:s.chapterId,title:'说出目前的判断',prompt:s.chapterId===2?'我认为正门劫匪与停车场的人是两拨。你怎么看？':s.chapterId===4?'我怀疑密室和运输设备能解释现场，但身份还需要核实。':'温泉死者身份和手机时间仍有疑问，我认为现在证据不足。',guard:'把这份判断先记下来，仍然需要证据核查。'});
 return list;
}
export function stepOf(s,t){
 if(t.record&&knows(s,t.record)||t.flag&&s.flags[t.flag]||t.confrontation&&s.flags[t.confrontation.unlock]||t.result&&knows(s,t.result))return 2;
 return dialogueOf(s).steps[key(s,t.id)]?.step||0;
}
const ready=(s,t,shown)=>t.needsFlags?.some(f=>!s.flags[f])?false:t.kind==='confront'?[t.confrontation.quote,t.confrontation.evidence,...t.confrontation.requires].every(id=>knows(s,id))&&[t.confrontation.quote,t.confrontation.evidence].every(id=>shown.includes(id)):t.kind==='report'?t.basis.every(id=>knows(s,id)):true;
export function inquiryView(s){
 const entries=(s.chapterId>=5?people:people.slice(0,6)).filter(p=>p.id!==s.playerId).flatMap(p=>topics(s,p.id).filter(t=>stepOf(s,t)<2&&t.kind!=='theory').map(t=>({id:t.id,actor:p.id,title:t.title,prompt:stepOf(s,t)?t.follow:t.prompt,stage:stepOf(s,t),chapter:t.chapter})));
 const byActor=Object.fromEntries(people.map(p=>[p.id,entries.filter(t=>t.actor===p.id).sort((a,b)=>b.chapter-a.chapter||b.stage-a.stage).slice(0,3)]));
 const lead=entries.filter(t=>t.chapter===s.chapterId).find(t=>t.stage===1)||entries.find(t=>t.chapter===s.chapterId)||null;
 return {byActor,lead,leads:dialogueOf(s).leads.filter(l=>l.viewpoint===s.playerId).map(l=>({...l}))};
}
export function reviewContext(s,input,shown){
 const eligible=topics(s,input.actor).filter(t=>stepOf(s,t)<2);
 return {kind:'case-inquiry',message:input.message,actor:input.actor,playerName:person(s.playerId).name,name:person(input.actor).name,
  recent:s.chatLog.filter(l=>l.actor===input.actor&&l.viewpoint===s.playerId&&l.audience.includes(s.playerId)).slice(-3).map(l=>l.text),
  shown:shown.map(id=>({id,title:material(id)?.title,text:dialogueOf(s).transcripts[id]?.text||material(id)?.text})),
  candidates:eligible.map(t=>({id:t.id,subject:t.title,intent:t.kind==='theory'?'玩家提出案情判断或说明证据不足':t.kind==='report'?'请求独立调查或技术核查':t.kind==='confront'?'指出两份材料冲突、追问本人隐瞒':t.prompt,follow:t.follow,alreadyAsked:stepOf(s,t)>0,prepared:ready(s,t,shown)}))};
}
export function planInquiry(s,input,shown,review){
 if(!review||typeof review.confidence!=='number'||!Number.isFinite(review.confidence)||review.confidence<.8||review.confidence>1||typeof review.quote!=='string'||!review.quote.trim()||!input.message.includes(review.quote))return null;
 const t=topics(s,input.actor).find(t=>t.id===review.topicId);if(!t||stepOf(s,t)>=2||!['ask','detail','press','request','theory'].includes(review.intent))return null;
 const prior=stepOf(s,t),prepared=ready(s,t,shown);
 if(t.kind==='theory'){
  if(review.intent!=='theory'||review.quote.trim().length<6)return null;
  return {topic:t,step:2,factId:'turn:case-theory',text:t.guard,theory:review.quote};
 }
 let next=prior?2:1;
 if(t.kind==='account'&&['detail','press'].includes(review.intent))next=2;
 if(t.kind==='report'&&review.intent==='request'&&prepared)next=2;
 if(!prepared)next=1;
 if(t.kind==='confront'&&!prepared)return {topic:t,step:0,factId:'turn:'+t.id,text:'仍维护原供述，只说明眼前两份材料尚有哪些环节不能互相印证。不要透露隐瞒的真相。',missing:true};
 return {topic:t,step:next,factId:next===2&&t.record?t.record:'turn:'+t.id+':'+next,text:next===2?t.text:t.guard};
}
export function comparisonQuestion(s,a,b,actor){
 const q=material(a),e=material(b),p=person(actor);
 return {actor:p.id,shown:[a,b],message:'关于“'+q.title+'”和“'+e.title+'”，你能解释它们为什么对不上吗？'};
}
export function accountQuestion(s,id){
 const q=material(id),t=topics(s,q.actor).find(t=>t.record===id);return {actor:q.actor,message:stepOf(s,t)?t.follow:t.prompt,inquiry:t.id};
}
export function materialText(s,id){return dialogueOf(s).transcripts[id]?.text||material(id)?.text;}
export function eligibleFactIds(s,actor){return statements.filter(q=>q.actor===actor&&knows(s,q.id)).map(q=>q.id);}
export function commitInquiry(s,plan,{speech,actor,audience,turnId,question,remember,record}){
 if(!plan)return [];
 s.dialogue||=newDialogue(s.started?s.chapterId:0);
 const t=plan.topic,changes=[];
 if(plan.step)s.dialogue.steps[key(s,t.id)]={step:plan.step,actor,chapter:s.chapterId,turnId};
 if(plan.step===2){
  if(t.record){remember(t.record);s.dialogue.transcripts[t.record]={text:speech,actor:material(t.record).actor,audience:[...audience],turnId,viewpoint:s.playerId};const entry=s.records.find(r=>r.evidence===t.record);if(entry)Object.assign(entry,{text:speech,actor,audience:[...audience],turnId});changes.push({id:t.record,title:material(t.record).title});}
  if(t.flag){s.flags[t.flag]=true;record(speech,'testimony',{actor,audience,turnId});changes.push({title:t.title});}
  if(t.confrontation){const c=t.confrontation;s.flags[c.unlock]=true;record(speech,'verified',{actor:c.actor,audience,turnId,evidencePair:[c.quote,c.evidence]});if(c.id==='jade')remember('jade-confession');changes.push({title:c.title+' · 已交代'});}
  if(t.kind==='report'){remember(t.result);changes.push({id:t.result,title:material(t.result).title});}
  if(t.kind==='theory'){const text=plan.theory;s.hypotheses.push({id:turnId,chapter:s.chapterId,viewpoint:s.playerId,text,kind:'hypothesis',status:'待核实'});if(s.chapterId===2)s.flags['old-outline']=true;if(s.chapterId===4)s.flags['villa-theory']=true;if(s.chapterId===5){s.flags.provisional=true;s.provisional={status:'insufficient',text};}changes.push({title:'已记下你的判断'});}
  if(t.lead){const lead={...t.lead,from:actor,viewpoint:s.playerId,chapter:s.chapterId,question,speech};if(!s.dialogue.leads.some(l=>l.title===lead.title&&l.viewpoint===s.playerId))s.dialogue.leads.push(lead);}
 }
 return changes;
}
