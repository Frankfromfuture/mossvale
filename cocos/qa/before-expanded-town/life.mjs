import {readFileSync} from 'node:fs';

export const layout=JSON.parse(readFileSync(new URL('../cocos/assets/resources/town-layout.json',import.meta.url),'utf8'));
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
const lines={
 tea:['茶还温着，坐一会儿吧。','先把手里的事放一放。'],read:['这一页挺有意思，你也看看？','小声说就好，我听得见。'],craft:['扶住这一边，就稳了。','先把毛边磨平。'],
 garden:['这边的土有点干了。','给新芽留点地方吧。'],rest:['难得有空，慢慢坐着也好。','今天想歇一会儿。'],music:['这段轻一点，邻居也能好好休息。','要不要跟着敲两下？'],
 shop:['这篮点心刚摆好。','慢慢挑，先看看就行。'],harvest:['这颗桃子熟得刚刚好。','留几颗，明天再来看看。'],watch:['水声听起来很舒服。','这边人少，坐一会儿吧。']
};
const verbs={tea:'喝茶',read:'读书',craft:'打磨木料',garden:'照料花圃',rest:'歇脚',music:'练习小曲',shop:'整理摊位',harvest:'照看果树',watch:'看水边的风景'};
const finished={tea:'喝完了一杯茶',read:'读了一会儿书',craft:'磨平了一块木料的毛边',garden:'给花圃浇了水',rest:'安静地歇了一会儿',music:'练完了一段轻声的小曲',shop:'把摊位上的物品整理整齐',harvest:'查看了桃子的成熟情况',watch:'在河边看了一会儿风景'};
const routines={lin:['cafe','shop','square','home'],xu:['library','river','cafe','home'],chen:['studio','park','shop','home'],tang:['park','orchard','cafe','square'],zhou:['shop','cafe','home'],su:['home','river','park','cafe'],lu:['river','orchard','square','cafe'],wen:['cafe','shop','home','park'],a:['square','cafe','river','home'],shen:['library','park','orchard','home'],ye:['shop','square','orchard','cafe'],gu:['park','home','library','cafe']};
function seat(r,p){const i=layout.actors.findIndex(a=>a.id===r.id),x=p.x+(i%2? .65:-.65),z=p.z+(i%3)*.38;return walkable(x,z)?{x,z}:{x:p.x,z:p.z};}
export function initializeLife(w,fresh,record){
 if(w.lifeVersion===1)return false;
 const ids=new Set(w.residents.map(r=>r.id));
 for(const original of fresh.residents){if(ids.has(original.id))continue;const r={...original,memories:[]};w.residents.push(r);record(w,'background',`${r.name}的既往经历：${r.background}`,[r.id],8,{initial:true});}
 w.lifeVersion=1;w.player={x:-1,z:4.3,updatedAt:Date.now()};w.sceneActions={};w.inventory={peaches:0,snacks:0};
 for(const [i,r] of w.residents.entries()){
  const home=layout.actors.find(a=>a.id===r.id)?.place||'square',p=venue(home),s=seat(r,p);
  r.location=home;r.target=home;r.route=[];r.life={...s,route:[],phase:'doing',activity:p.activity,until:w.minute+5+i%5*2,cycle:0,lastSocial:w.minute-30,nextSocial:w.minute+3+i%4,visits:{},speech:lines[p.activity][i%2],speechUntil:w.minute+10};r.action=`在${p.short}${verbs[p.activity]}`;
 }
 return true;
}
function startDoing(w,r){const p=venue(r.target);r.location=r.target;r.route=[];r.life.phase='doing';r.life.activity=p.activity;r.life.until=w.minute+10+(r.traits[1]>80?6:0);r.action=`在${p.short}${verbs[p.activity]}`;r.life.speech=lines[p.activity][r.life.cycle%2];r.life.speechUntil=w.minute+7;}
export function travel(w,r,id){
 let p=venue(id);if(!p)return false;const hour=w.minute%1440/60;if(hour<p.open||hour>=p.close)p=venue('home');
 if(r.life.phase==='walking'&&r.target===p.id)return true;
 const path=routeBetween(r.life,seat(r,p));if(!path)return false;
 r.target=p.id;r.life.route=path;r.route=path;r.life.phase='walking';r.life.socialWith=null;r.life.speechUntil=0;r.action=`前往${p.short}`;return true;
}
function nextPlace(w,r){
 const hour=w.minute%1440/60,l=r.life;
 if(hour>=21||hour<7)return 'home';
 if(w.party?.status==='planned'&&w.party.accepted.includes(r.id)&&w.minute>=w.party.at-90)return 'cafe';
 if(r.energy<25)return 'home';if(r.hunger>65)return 'cafe';
 const choices=routines[r.id]||['square','park','home'];
 const valid=choices.filter(id=>{const p=venue(id);return hour>=p.open&&hour<p.close&&(w.weather!=='rain'||p.indoor);});
 if(!valid.length)return 'home';
 // Fixed personality preferences + needs + time since last visit; no per-frame model call.
 return valid.map((id,i)=>({id,score:(l.visits[id]==null?90:Math.min(80,(w.minute-l.visits[id])*.4))+(id===r.work?12:0)+(r.traits[0]<45&&['library','river'].includes(id)?18:0)+(r.traits[0]>75&&['cafe','square'].includes(id)?14:0)-(id===r.location?45:0)-i*2})).sort((a,b)=>b.score-a.score)[0].id;
}
export function stepLife(w,record){
 for(const r of w.residents){
  const l=r.life;if(!l||r.busy||l.engagedUntil>w.minute)continue;
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
   const destination=nextPlace(w,r);if(destination===r.location)l.until=w.minute+24;else travel(w,r,destination);
  }
 }
 for(const r of w.residents){
  const l=r.life;if(l.phase!=='doing'||r.busy||l.engagedUntil>w.minute||w.minute<l.nextSocial)continue;
  const other=w.residents.find(o=>o.id!==r.id&&o.location===r.location&&o.life.phase==='doing'&&!o.busy&&!(o.life.engagedUntil>w.minute)&&w.minute>=o.life.nextSocial&&distance(l,o.life)<3.5);
  if(!other)continue;
  const familiar=r.relations[other.id]??30,collaborate=['craft','garden','shop'].includes(l.activity);
  const sentence=collaborate?`${r.name}和${other.name}在${venue(r.location).short}一起${verbs[l.activity]}。`:`${r.name}和${other.name}在${venue(r.location).short}停下来聊了几句。`;
  const event=record(w,'encounter',sentence,[r.id,other.id],6,{place:r.location,activity:collaborate?l.activity:'talk'});
  const opening=r.traits[0]<45?'这里挺安静的，一起待会儿吧。':lines[l.activity][l.cycle%2];
  const reply=other.traits[1]>85&&collaborate?'好，我来搭把手。':other.traits[0]<45?'嗯，我就在这里。':familiar>=45?'和你一起挺好的。':'好呀，一起吧。';
  record(w,'dialogue',`${r.name}说：“${opening}” ${other.name}回应：“${reply}”`,[r.id,other.id],4,{evidence:[event.id],autonomous:true});
  for(const [a,b,speech] of [[r,other,opening],[other,r,reply]]){a.relations[b.id]=cap((a.relations[b.id]??30)+(collaborate?3:2));Object.assign(a.life,{phase:'social',until:w.minute+5,socialWith:b.id,speech,speechUntil:w.minute+5,nextSocial:w.minute+(a.traits[0]<45?60:35)});a.action=collaborate?`和${b.name}一起${verbs[l.activity]}`:`和${b.name}聊聊天`;a.mood=cap(a.mood+2);}
 }
}
export function presence(w,b){
 const x=Number(b.x),z=Number(b.z);if(!walkable(x,z))throw new Error('先走到小路上吧');
 const elapsed=Math.min(30,Math.max(0,(Date.now()-(w.player.updatedAt||Date.now()))/1000));
 if(distance(w.player,{x,z})>3.5*elapsed+3)throw new Error('等走到那里再试吧');
 Object.assign(w.player,{x,z,updatedAt:Date.now()});
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
 if(!r&&p.activity==='shop'){w.inventory.snacks++;text='你在松果小集买了一份点心，放进了口袋。';}
 const witnesses=w.residents.filter(n=>n.location===p.id&&n.life.phase!=='walking'&&distance(n.life,w.player)<3.5).map(n=>n.id);
 const event=record(w,'shared_activity',text,witnesses,r?7:5,{place:p.id,activity:p.activity,player:true});
 w.sceneActions[key]=w.minute;if(!r)w.coins-=p.cost;
 if(r){r.trust=cap(r.trust+3);r.mood=cap(r.mood+3);r.life.engagedUntil=w.minute+4;r.belief='你愿意花时间和我一起做事，我记得。';}
 w.revision++;return {speech:r?lines[r.life.activity][r.life.cycle%2]:text,eventId:event.id};
}
