import {readFileSync} from 'node:fs';
import {installPersonalities,chooseIntent,personalLine,personalReply,socialInterval,activityDuration,bondGain,available} from './personality.mjs';

export const layout=JSON.parse(readFileSync(process.env.MOSSVALE_LAYOUT||new URL('../cocos/assets/resources/town-layout.json',import.meta.url),'utf8'));
export const venues=layout.places;
const venue=id=>venues.find(p=>p.id===id);
const cap=v=>Math.max(0,Math.min(100,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function walkable(x,z){const b=layout.bounds;return Number.isFinite(x)&&Number.isFinite(z)&&x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ&&!layout.obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.32&&Math.abs(z-o.z)<o.d/2+.32);}
const cell=.55,cols=Math.floor((layout.bounds.maxX-layout.bounds.minX)/cell)+1,rows=Math.floor((layout.bounds.maxZ-layout.bounds.minZ)/cell)+1;
const point=i=>({x:layout.bounds.minX+i%cols*cell,z:layout.bounds.minZ+Math.floor(i/cols)*cell});
const grid=Array.from({length:cols*rows},(_,i)=>walkable(point(i).x,point(i).z));
function nearest(p){let best=-1,d=Infinity;for(let i=0;i<grid.length;i++){if(!grid[i])continue;const q=point(i),v=(p.x-q.x)**2+(p.z-q.z)**2;if(v<d){d=v;best=i;}}return best;}
export function routeBetween(from,to){
 const start=nearest(from),end=nearest(to),queue=[start],parents=new Map([[start,-1]]);
 for(let head=0;head<queue.length;head++){
  const current=queue[head];if(current===end)break;
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=current%cols+dx,z=Math.floor(current/cols)+dz,i=z*cols+x;if(x<0||x>=cols||z<0||z>=rows||!grid[i]||parents.has(i))continue;parents.set(i,current);queue.push(i);}
 }
 if(!parents.has(end))return null;
 const path=[];for(let i=end;i!==start;i=parents.get(i))path.unshift(point(i));
 // The final anchor is in the same clear grid cell; preserve distinct seats.
 if(walkable(to.x,to.z))path.push({x:to.x,z:to.z});return path;
}
const verbs={tea:'喝茶',read:'读书',craft:'打磨木料',garden:'照料花圃',rest:'歇脚',music:'练习小曲',shop:'整理摊位',harvest:'照看果树',watch:'看风景',shell:'寻找贝壳'};
const finished={tea:'喝完了一杯茶',read:'读了一会儿书',craft:'磨平了一块木料的毛边',garden:'给花圃浇了水',rest:'安静地歇了一会儿',music:'练完了一段轻声的小曲',shop:'把摊位上的物品整理整齐',harvest:'查看了桃子的成熟情况',watch:'看了一会儿远处的风景',shell:'拾起了一枚小贝壳'};

function seat(r,p){const i=layout.actors.findIndex(a=>a.id===r.id),x=p.x+(i%2? .65:-.65),z=p.z+(i%3)*.38;return walkable(x,z)?{x,z}:{x:p.x,z:p.z};}
export function initializeLife(w,fresh,record){
 if(w.lifeVersion===1){const geometry=migrateLayout(w);return installPersonalities(w)||geometry;}
 const ids=new Set(w.residents.map(r=>r.id));
 for(const original of fresh.residents){if(ids.has(original.id))continue;const r={...original,memories:[]};w.residents.push(r);record(w,'background',`${r.name}的既往经历：${r.background}`,[r.id],8,{initial:true});}
 w.lifeVersion=1;installPersonalities(w);w.layoutVersion=layout.version;w.player={x:-1,z:4.3,updatedAt:Date.now()};w.sceneActions={};w.inventory={peaches:0,snacks:0,shells:0};
 for(const [i,r] of w.residents.entries()){
  const home=layout.actors.find(a=>a.id===r.id)?.place||'square',p=venue(home),s=seat(r,p);
  r.location=home;r.target=home;r.route=[];r.life={...s,route:[],phase:'doing',activity:p.activity,until:w.minute+5+i%5*2,cycle:0,lastSocial:w.minute-30,nextSocial:w.minute+3+i%4,visits:{},speech:personalLine(r,p.activity,p),speechUntil:w.minute+10};r.action=`在${p.short}${verbs[p.activity]}`;
 }
 return true;
}
export function migrateLayout(w){
 if(w.layoutVersion===layout.version)return false;
 for(const r of w.residents){const l=r.life;if(!l)continue;
  if(!walkable(l.x,l.z)){const q=point(nearest(l));l.x=q.x;l.z=q.z;}
  if(l.phase==='walking'){const p=venue(r.target)||venue('home');const path=routeBetween(l,seat(r,p));l.route=path||[];r.route=l.route;}
 }
 if(w.player&&!walkable(w.player.x,w.player.z))Object.assign(w.player,point(nearest(w.player)));
 (w.inventory||={peaches:0,snacks:0}).shells??=0;w.layoutVersion=layout.version;return true;
}
function startDoing(w,r){const p=venue(r.target);r.location=r.target;r.route=[];r.life.phase='doing';r.life.activity=p.activity;r.life.until=w.minute+activityDuration(r);r.action=`在${p.short}${verbs[p.activity]}`;r.life.speech=personalLine(r,p.activity,p);r.life.speechAt=w.minute;r.life.speechUntil=w.minute+7;}
export function travel(w,r,id){
 let p=venue(id);if(!p)return false;const hour=w.minute%1440/60;if(hour<p.open||hour>=p.close)p=venue('home');
 if(r.life.phase==='walking'&&r.target===p.id)return true;
 const path=routeBetween(r.life,seat(r,p));if(!path)return false;
 r.target=p.id;r.life.route=path;r.route=path;r.life.phase='walking';r.life.socialWith=null;r.life.speech=`先去${p.short}，路上慢慢走。`;r.life.speechAt=w.minute;r.life.speechUntil=w.minute+7;r.action=`前往${p.short}`;return true;
}
function nextPlace(w,r){
 const fresh=chooseIntent(w,r,venues),pending=r.life.nextPlan;delete r.life.nextPlan;
 const plan=fresh.priority==='preference'&&pending?.priority==='preference'&&w.minute-pending.at<120&&available(w,venue(pending.place))&&(!pending.weather||pending.weather===w.weather)?pending:fresh;
 r.life.intent=plan;r.thought=plan.reason;return plan.place;
}
export function refreshOnArrival(w,visitId,now=Date.now()){
 if(!/^[a-zA-Z0-9_-]{8,96}$/.test(visitId))throw new Error('这次进入没有完成，请重试');
 const history=w.arrivalHistory||=[];
 if(history.includes(visitId))return false;
 const since=w.lastPlayerSeenMinute??w.minute,awayMinutes=Math.max(0,w.minute-since);
 const changes=w.events.filter(e=>e.at>since&&['activity','encounter','shared_activity'].includes(e.type)).slice(-3).map(e=>({eventId:e.id,text:e.text}));
 let updated=0;
 if(!w.paused)for(const r of w.residents){
  const plan=chooseIntent(w,r,venues);r.life.nextPlan=plan;r.thought=plan.reason;updated++;
  // Finishing an activity, a conversation or a promised visit takes precedence over arrival.
  if(!r.busy&&!(r.life.engagedUntil>w.minute)&&r.life.phase==='doing'){
   r.life.speech=personalLine(r,r.life.activity,venue(r.location));r.life.speechAt=w.minute;r.life.speechUntil=w.minute+6;
  }
 }
 history.push(visitId);if(history.length>16)history.splice(0,history.length-16);
 w.arrival={id:visitId,at:now,minute:w.minute,awayMinutes,updated,changes,message:w.paused?'小镇还在休息，准备好再继续。':changes.length?'你回来啦，手记里有邻居的新近况。':'邻居们各有今天的打算，去聊聊吧。'};
 w.lastPlayerSeenMinute=w.minute;w.revision++;return true;
}
export function stepLife(w,record,{offline=false}={}){
 for(const r of w.residents){
  const l=r.life;if(!l||r.busy||l.engagedUntil>w.minute||(!offline&&l.aiHoldUntil>Date.now()))continue;
  r.hunger=cap(r.hunger+.12);r.energy=cap(r.energy-.035);
  const p=venue(r.target),hour=w.minute%1440/60;
  if((w.weather==='rain'&&!p.indoor)||hour<p.open||hour>=p.close){travel(w,r,r.traits[0]>65&&hour>=7&&hour<21?'cafe':'home');}
  if(l.phase==='walking'){
   let remaining=.95;
   while(l.route.length&&remaining>0){const q=l.route[0],d=distance(l,q);if(d<=remaining){l.x=q.x;l.z=q.z;remaining-=d;l.route.shift();}else{l.x+=(q.x-l.x)/d*remaining;l.z+=(q.z-l.z)/d*remaining;remaining=0;}}
   r.route=l.route;if(!l.route.length)startDoing(w,r);continue;
  }
  if(l.phase==='social'){
   if(w.minute<l.until)continue;l.phase='doing';l.socialWith=null;l.until=w.minute+6;r.action=`在${venue(r.location).short}${verbs[l.activity]}`;
  }
  if(w.minute>=l.until){
   const key=`${Math.floor(w.minute/1440)}:${r.location}`;
   if(l.recorded?.[r.location]!==key){record(w,'activity',`${r.name}在${venue(r.location).short}${finished[l.activity]}。`,[r.id],4,{place:r.location,activity:l.activity});(l.recorded||={})[r.location]=key;}
   l.visits[r.location]=w.minute;l.cycle++;
   if(l.activity==='tea')r.hunger=cap(r.hunger-30);if(l.activity==='rest')r.energy=cap(r.energy+25);r.mood=cap(r.mood+1);
   const destination=nextPlace(w,r);if(destination===r.location)l.until=w.minute+activityDuration(r);else travel(w,r,destination);
  }
 }
 if(w.autonomy?.enabled&&!offline)return;
 for(const r of w.residents){
  const l=r.life;if(l.phase!=='doing'||r.busy||l.engagedUntil>w.minute||w.minute<l.nextSocial)continue;
  const other=w.residents.find(o=>o.id!==r.id&&o.location===r.location&&o.life.phase==='doing'&&!o.busy&&!(o.life.engagedUntil>w.minute)&&w.minute>=o.life.nextSocial&&distance(l,o.life)<3.5);
  if(!other)continue;
  const collaborate=['craft','garden','shop'].includes(l.activity);
  const sentence=collaborate?`${r.name}和${other.name}在${venue(r.location).short}一起${verbs[l.activity]}。`:`${r.name}和${other.name}在${venue(r.location).short}停下来聊了几句。`;
  const event=record(w,'encounter',sentence,[r.id,other.id],6,{place:r.location,activity:collaborate?l.activity:'talk'});
  const opening=personalLine(r,l.activity,venue(r.location));
  const reply=personalReply(other);
  record(w,'dialogue',`${r.name}说：“${opening}” ${other.name}回应：“${reply}”`,[r.id,other.id],4,{evidence:[event.id],autonomous:true});
  for(const [a,b,speech] of [[r,other,opening],[other,r,reply]]){a.relations[b.id]=cap((a.relations[b.id]??30)+(collaborate?3:2));Object.assign(a.life,{phase:'social',until:w.minute+5,socialWith:b.id,speech,speechUntil:w.minute+5,nextSocial:w.minute+socialInterval(a)});a.action=collaborate?`和${b.name}一起${verbs[l.activity]}`:`和${b.name}聊聊天`;a.mood=cap(a.mood+2);}
 }
}
export function presence(w,b){
 const x=Number(b.x),z=Number(b.z);if(!walkable(x,z))throw new Error('先走到小路上吧');
 const elapsed=Math.min(30,Math.max(0,(Date.now()-(w.player.updatedAt||Date.now()))/1000));
 if(distance(w.player,{x,z})>3.5*elapsed+3)throw new Error('等走到那里再试吧');
 Object.assign(w.player,{x,z,updatedAt:Date.now()});w.lastPlayerSeenMinute=w.minute;
 const r=w.residents.find(r=>r.id===b.resident);if(r&&distance(r.life,w.player)<4)r.life.engagedUntil=w.minute+4;
}
export function playerActivity(w,b,record){
 if(w.paused)throw new Error('小镇暂停中');
 const r=b.resident?w.residents.find(r=>r.id===b.resident):null;
 const p=venue(r?.location||b.place);if(!p)throw new Error('找不到这个地方');
 const hour=w.minute%1440/60;if(hour<p.open||hour>=p.close)throw new Error('这里歇业了，明天再来吧');
 if(w.weather==='rain'&&!p.indoor)throw new Error('下雨了，先去屋檐下躲躲吧');
 if(distance(w.player,r?.life||p)>3.5)throw new Error('走近一点再试吧');
 if(r&&(r.busy||r.life.phase==='walking'||r.life.phase==='social'))throw new Error('等这位邻居忙完，再一起做吧');
 const key=r?`join:${r.id}`:`place:${p.id}`,last=w.sceneActions[key];
 if(last!=null&&w.minute-last<60)throw new Error('刚做过啦，先去别处逛逛吧');
 if(!r&&w.coins<p.cost)throw new Error('镇币不够了');
 let text=r?`你和${r.name}在${p.short}一起${verbs[r.life.activity]}。`:`你在${p.short}${finished[p.activity]}。`;
 if(!r&&p.activity==='harvest'){w.inventory.peaches++;text='你在桃子小岛摘下一颗成熟的桃子，放进了口袋。';}
 if(!r&&p.activity==='shell'){w.inventory.shells=(w.inventory.shells||0)+1;text='你在海滩捡到一枚小贝壳，放进了口袋。';}
 if(!r&&p.activity==='shop'){w.inventory.snacks++;text='你在松果小集买了一份点心，放进了口袋。';}
 const witnesses=w.residents.filter(n=>n.location===p.id&&n.life.phase!=='walking'&&distance(n.life,w.player)<3.5).map(n=>n.id);
 const event=record(w,'shared_activity',text,witnesses,r?7:5,{place:p.id,activity:p.activity,player:true});
 w.sceneActions[key]=w.minute;if(!r)w.coins-=p.cost;
 if(r){r.trust=cap(r.trust+bondGain(r,r.life.activity));r.mood=cap(r.mood+3);r.life.engagedUntil=w.minute+4;r.belief='你愿意花时间和我一起做事，我记得。';}
 w.revision++;return {speech:r?personalLine(r,r.life.activity,p):text,eventId:event.id};
}
