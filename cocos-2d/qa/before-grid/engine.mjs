import {RESIDENTS, PLACES, timeLabel, dayLabel} from '../src/data.js';
import {venues,stepLife,travel} from './life.mjs';
import {soulContext} from './personality.mjs';
export const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
export const place=id=>PLACES.find(p=>p.id===id)||venues.find(p=>p.id===id)||PLACES[6];
export function record(w,type,text,participants=[],importance=4,extra={}){
 const e={id:`e${++w.seq}`,type,text,at:w.minute,day:dayLabel(w.minute),time:timeLabel(w.minute),participants:[...new Set(participants)],importance,...extra};
 w.events.push(e);
 for(const id of e.participants){const r=w.residents.find(r=>r.id===id);if(r)r.memories.push({eventId:e.id,kind:type==='reflection'?'impression':['chat','secret','dialogue','apologize'].includes(type)?'reported':'fact',text,at:w.minute,importance,evidence:extra.evidence||[]});}
 return e;
}
export function seed(){
 const w={version:1,revision:0,seq:0,minute:540,weather:'sun',speed:1,paused:false,party:null,coins:100,events:[],chats:{},lastReal:Date.now(),usage:{day:new Date().toISOString().slice(0,10),calls:0,input:0,output:0,failures:0},milestones:{help:false,invited:false,resolved:false},residents:RESIDENTS.map((p,i)=>{
 const loc=place(p.work);return {...p,x:loc.x+(i>6?3:-2),y:loc.y+3,location:p.work,target:p.work,action:['准备开店','整理书架','打磨木料','照料花圃','整理货架','在院子休息','寻找光线','烘焙面包','练习吉他','查阅植物图鉴','理货','晾晒种子'][i],mood:64+i%5*5,energy:85,hunger:20,trust:30,memories:[],belief:'还不太了解你，想慢慢认识。',relations:{},busy:false,nextSocial:570+i*13};})};
 record(w,'arrival','你搬进了榆树小院。苔溪镇迎来一位新邻居。',[],6);
 for(const r of w.residents)record(w,'background',`${r.name}的既往经历：${r.background}`,[r.id],8,{initial:true});
 record(w,'story','林夏在咖啡馆门口挂出了小黑板：想办一次下午茶，还缺一位帮手。',['lin','wen'],6);
 w.residents.find(r=>r.id==='lin').relations.wen=76;
 w.residents.find(r=>r.id==='wen').relations.lin=81;
 w.residents.find(r=>r.id==='xu').relations.shen=54;
 w.residents.find(r=>r.id==='a').relations.zhou=29;
 return w;
}
export function retrieve(w,r,query){
 const tokens=new Set(String(query).toLowerCase().match(/[\u4e00-\u9fff]|[a-z]+/g)||[]);
 return r.memories.map(m=>({...m,score:m.importance/10+Math.exp(-(w.minute-m.at)/2880)+[...tokens].filter(t=>m.text.includes(t)).length/Math.max(tokens.size,1)*2})).sort((a,b)=>b.score-a.score).slice(0,7);
}
export function context(w,r,query){return {resident:{name:r.name,traits:r.traits,tags:r.tags,background:r.background,goal:r.goal,voice:r.voice,...(w.lifeVersion?{soul:soulContext(r)}:{})},state:{time:timeLabel(w.minute),day:dayLabel(w.minute),weather:w.weather,location:r.route?.length?`正走向${place(r.target).name}`:place(r.location).name,mood:r.mood,energy:r.energy,hunger:r.hunger,action:r.action,trust:r.trust,...(w.lifeVersion?{intention:r.life?.nextPlan||r.life?.intent}: {})},memory:retrieve(w,r,query).map(({text,eventId,kind,evidence})=>({text,eventId,kind,evidence})),belief:r.belief,places:(w.lifeVersion?venues:PLACES).map(p=>({id:p.id,name:p.name,open:(w.minute%1440)/60>=p.open&&(w.minute%1440)/60<p.close})),knownResidents:w.residents.filter(x=>x.id!==r.id&&!r.route?.length&&!x.route?.length&&x.location===r.location).map(x=>({id:x.id,name:x.name,action:x.action})),commitments:w.party?.invited.includes(r.id)?w.party:null,conversation:(w.chats[r.id]||[]).slice(-6),request:query};}
const exits={cafe:[[22.7,40],[22.7,47]],library:[[50,36],[50,39],[43,43],[42,47]],shop:[[75.4,41],[75.4,47]],home:[[17,83],[14,88],[7,85],[7,47]],studio:[[48,91],[59,91],[60,61],[58,47]],park:[[76,71],[72,64],[72,47]],square:[[58,47]]};
export function destination(w,r,target){
 if(w.lifeVersion)return travel(w,r,target);
 const venue=place(target),hour=(w.minute%1440)/60;
 if(hour<venue.open||hour>=venue.close){target='home';}
 if(r.target===target&&r.location!==target)return;
 if(r.location===target&&r.target===target)return;
 const from=exits[r.location]||exits.square,to=exits[target]||exits.square;
 const start=from.at(-1),end=to.at(-1);let cross=[];
 if(Math.min(start[0],end[0])<43&&Math.max(start[0],end[0])>57){cross=[[42,47],[44,53],[50,56],[56,53],[58,47]];if(start[0]>end[0])cross.reverse();}
 r.target=target;r.route=[...from,...cross,end,...to.slice(0,-1).reverse()];r.action=`前往${place(target).short}`;
}
function routeStep(r,minutes){
 if(!r.route?.length)return;
 let remaining=minutes*.9;
 while(remaining>0&&r.route.length){const [x,y]=r.route[0],d=Math.hypot(x-r.x,y-r.y);
 if(d<=remaining){r.x=x;r.y=y;remaining-=d;r.route.shift();}else{r.x+=(x-r.x)/d*remaining;r.y+=(y-r.y)/d*remaining;remaining=0;}}
 if(!r.route.length){r.location=r.target;r.action=r.location==='home'?'在家休息':r.location==='cafe'?'在咖啡馆停留':r.location==='park'?'在湖边散步':'忙着自己的事';}
}
export function advance(w,minutes,{offline=false}={}){
 for(let step=0;step<minutes;step++){
  w.minute++;const t=w.minute%1440,h=Math.floor(t/60);
  if(w.lifeVersion)stepLife(w,record,{offline});
  for(const r of w.lifeVersion?[]:w.residents){
   if(r.busy)continue;
   if(!r.busy){r.hunger=clamp(r.hunger+.025);r.energy=clamp(r.energy+(h<7?.12:-.017));routeStep(r,1);}
   if(t===480)destination(w,r,r.work);
   if(t===750){destination(w,r,r.work==='cafe'?'cafe':'shop');r.hunger=12;}
   if(t===810)destination(w,r,r.work);
   if(t===1080)destination(w,r,w.weather==='rain'?'home':(r.traits[0]>65?'square':'park'));
   if(t===1260){destination(w,r,'home');r.action='准备休息';}
   if(t%90===0&&!r.route?.length&&r.location===r.target&&h>=8&&h<21){
    const other=w.residents.find(x=>x.id!==r.id&&!r.route?.length&&!x.route?.length&&x.location===r.location&&!x.route?.length&&x.target===x.location&&!x.busy);
    const recently=w.events.slice(-8).some(e=>e.type==='encounter'&&e.participants.includes(r.id)&&w.minute-e.at<60);
    if(other&&!recently){r.relations[other.id]=clamp((r.relations[other.id]||30)+2);other.relations[r.id]=clamp((other.relations[r.id]||30)+2);record(w,'encounter',`${r.name}和${other.name}在${place(r.location).short}碰面，聊了几句。`,[r.id,other.id],3);}
   }
  }
  if(w.party&&w.party.status==='planned'&&w.minute>=w.party.at-90&&!w.party.heading){w.party.heading=true;for(const id of w.party.accepted)destination(w,w.residents.find(r=>r.id===id),'cafe');}
  if(w.party&&w.party.status==='planned'&&w.minute>=w.party.at){
   w.party.status='finished';const arrived=w.party.accepted.filter(id=>w.residents.find(r=>r.id===id).location==='cafe'&&!w.residents.find(r=>r.id===id).route?.length);
   const present=w.party.playerAttending;
   record(w,'party',present?`你赴约参加了下午茶。${arrived.map(id=>w.residents.find(r=>r.id===id).name).join('、')||'暂时没有居民'}到场。`:`下午茶的时间到了，你没有赴约。${arrived.length}位居民等了一会儿。`,arrived,9);
   for(const id of arrived){const r=w.residents.find(r=>r.id===id);r.trust=clamp(r.trust+(present?10:-14));r.mood=clamp(r.mood+(present?9:-9));r.belief=present?'你说来就来了，我会记住这次相处。':'这次你没有赴约，下次答应之前我会再想想。';}
   w.milestones.resolved=true;
  }
  if(t===1320){for(const r of w.residents){const recent=r.memories.filter(m=>m.at>=w.minute-1440&&!m.kind.includes('impression')&&m.importance>=6&&!w.events.find(e=>e.id===m.eventId)?.initial);if(recent.length){record(w,'reflection',`${r.name}的日记：${r.belief}`,[r.id],7,{evidence:recent.slice(-3).map(m=>m.eventId)});}}}
 }
 w.revision++;w.lastReal=Date.now();
 if(offline)record(w,'offline',`你离开期间，小镇按日程走过了${minutes}分钟。`,[],2);
}
export function fallBack(r,kind){
 if(kind==='invite'){const accept=r.traits[0]>60||r.trust>=45;return {action:accept?'accept':'refuse',speech:accept?'好，我会来。记得把时间告诉我。':'这次我想留一点时间给自己。下次人少的时候，再叫我吧。',thought:accept?'想多认识一点镇上的人。':'还没做好参加聚会的准备。',mode:'rules'};}
 if(kind==='help')return {action:'talk',speech:r.traits[1]>85?'谢谢，搭把手正好。下次你有事也可以找我。':'来得正好，我一个人还真有点忙不过来。谢谢你。',thought:'有人愿意花时间帮忙，这件事我记下了。',mode:'rules'};
 if(kind==='apologize')return {action:'talk',speech:r.traits[1]>85?'原因我听到了。下次提前说一声，我会更放心。':'谢谢你愿意解释。那我们下次再约。',thought:'我愿意听解释，也想看看之后会怎样。',mode:'rules'};
 return {action:'talk',speech:`${r.thought} ${r.trust>45?'和你说这些，我觉得挺自在。':'我们可以慢慢聊。'}`,thought:r.thought,mode:'rules'};
}
export function applyInteraction(w,r,kind,message,result){
 const allowed=['talk','wait','accept','refuse','seek_shelter'];if(!allowed.includes(result.action))throw new Error('模型返回了无效行动');
 let description='',delta=0;
 if(kind==='help'){r.lastHelpAt=w.minute;delta=7;description=`你花时间帮${r.name}完成了手边的事。`;w.milestones.help=true;}
 else if(kind==='gift'){if(w.coins<10)throw new Error('镇币不足');w.coins-=10;delta=5;description=`你花10枚镇币送给${r.name}一份点心。`;}
 else if(kind==='invite'){
  if(w.party&&w.party.status==='planned'&&w.party.invited.includes(r.id))throw new Error('已经邀请过这位居民');
  if(!w.party||w.party.status!=='planned'){const at=(w.minute%1440<900?w.minute-(w.minute%1440):w.minute-(w.minute%1440)+1440)+960;w.party={at,status:'planned',invited:[],accepted:[],playerAttending:false,heading:false};}
  w.party.invited.push(r.id);const accepts=result.action==='accept';if(accepts)w.party.accepted.push(r.id);
  description=`你邀请${r.name}在第${dayLabel(w.party.at)}天16:00来咖啡馆。${accepts?'对方答应了':'对方婉拒了'}。`;delta=accepts?2:0;w.milestones.invited=true;
 }else if(kind==='apologize'){const missed=w.events.some(e=>e.type==='party'&&e.text.includes('没有赴约')&&e.participants.includes(r.id));delta=missed?4:0;description=`你向${r.name}解释：${message||'上次失约很抱歉，下次会提前告诉你。'}`;}
 else if(kind==='secret')description=`你私下告诉${r.name}：“${message}”`;
 else description=`你对${r.name}说：“${message}”`;
 const e=record(w,kind,description,[r.id],kind==='chat'?5:8,{private:kind==='secret',place:r.location});
 r.trust=clamp(r.trust+delta);r.mood=clamp(r.mood+Math.min(delta,5));r.thought=result.thought.slice(0,200);
 if(delta>0)r.belief=kind==='apologize'?'你愿意解释，我愿意再给一次机会。':r.trust>=45?'你做过的事让我觉得，可以多信任你一点。':'我们又熟悉了一点，我还记得你做过的事。';
 const reply=record(w,'dialogue',`${r.name}说：“${result.speech}”`,[r.id],5,{evidence:[e.id,...(result.evidence||[])],mode:result.mode,private:kind==='secret'});
 const chat=w.chats[r.id]||(w.chats[r.id]=[]);chat.push({role:'user',content:message||description,eventId:e.id},{role:'assistant',content:result.speech,eventId:reply.id,mode:result.mode});
 w.revision++;return {speech:result.speech,thought:r.thought,delta,mode:result.mode,evidence:result.evidence||[]};
}
export function publicWorld(w,status){return {...w,residents:w.residents.map(r=>({...r,busy:!!r.busy,memories:r.memories.slice(-80)})),events:w.events.filter(e=>!e.initial).slice(-150),ai:status,savedAt:new Date().toISOString()};}
