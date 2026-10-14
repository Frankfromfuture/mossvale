import {routineFor} from './personality.mjs';
import {BUSINESS_DEFS} from './economy-data.mjs';
import {resolveObject,patchObject} from './objects.mjs';
const day=w=>Math.floor(w.minute/1440),activeStatuses=new Set(['accepted','arriving','meeting']);
const clock=n=>`${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(Math.floor(n)%60).padStart(2,'0')}`;
const name=(w,id)=>id==='player'?'村长':w.residents.find(r=>r.id===id)?.name||id;
export function installTownMind(w){
 if(!w.economy)return false;const changed=w.townMind?.version!==1;
 w.townMind||={version:1,randomRate:.2,rng:238719041,choices:0,randomChoices:0};
 w.commitments||={version:1,seq:0,active:[],closed:[]};
 return changed;
}
export function actionRandom(w){
 let n=w.townMind.rng>>>0;n^=n<<13;n^=n>>>17;n^=n<<5;w.townMind.rng=n>>>0;return (n>>>0)/4294967296;
}
export function randomIdleChoice(w,options){
 if(!w.townMind||options.length<2)return null;
 const best=options[0].preferenceScore??0;
 const alternatives=options.slice(1).filter(o=>(o.preferenceScore??best)>=best-18);
 if(!alternatives.length)return null;
 w.townMind.choices++;
 if(actionRandom(w)>=.2)return null;
 w.townMind.randomChoices++;
 return alternatives[Math.floor(actionRandom(w)*alternatives.length)];
}
export function ensureSchedule(w,r,places){
 if(!w.townMind)return null;
 if(r.calendar?.day===day(w)){for(const s of r.calendar.items)if(!s.fixed&&s.status==='pending'&&s.latest<w.minute)s.status='deferred';return r.calendar;}
 const p=routineFor(r),base=day(w)*1440,home=places.find(p=>p.ownerId===r.id)?.id||'home';
 const items=[];
 const add=(id,kind,label,place,start,end,latest=end,fixed=false)=>items.push({id,kind,label,place,start:base+start,end:base+end,latest:base+latest,fixed,status:'pending'});
 add('meal','consume','吃饭','cafe',p.meal_minute,p.meal_minute+15,p.meal_minute+90,true);
 add('work','work','完成今天的工作',BUSINESS_DEFS.find(b=>b.workers.includes(r.id))?.place||r.work,p.work_start,p.work_end,p.work_end,true);
 for(const h of p.habits){const target=(w.weather==='rain'?h.rain_place:h.place);add(h.id,'habit',h.label,target==='home'?home:target,h.window[0],h.window[0]+h.duration,h.window[1]);}
 add('sleep','sleep','回家休息',home,p.sleep_minute,1440,1440,true);
 r.calendar={version:1,day:day(w),revision:(r.calendar?.revision||0)+1,items,changes:[]};
 const t=w.economy.tasks[r.id];if(t)calendarTaskStarted(w,r,t,places);
 return r.calendar;
}
function taskSlot(t){return t.habit||(['produce','import','staff','chore'].includes(t.kind)?'work':t.kind==='consume'&&t.product==='bread'?'meal':t.kind==='rest'&&t.label.includes('睡')?'sleep':null);}
export function adjustSchedule(w,r,until,reason,{from=w.minute}={}){
 const c=r.calendar;if(!w.townMind||!c||c.day!==day(w))return;
 let cursor=Math.max(w.minute,until),changed=[];
 for(const s of c.items.slice().sort((a,b)=>a.start-b.start)){
  if(s.fixed||s.status!=='pending'||s.start>=cursor||s.end<=from)continue;
  const before=s.start,duration=s.end-s.start;
  s.start=cursor;s.end=cursor+duration;
  if(s.end>s.latest)s.status='deferred';else cursor=s.end;
  changed.push(s.id);if(s.start===before)changed.pop();
 }
 if(changed.length){c.revision++;c.changes.push({at:w.minute,reason,items:changed});if(c.changes.length>12)c.changes.shift();}
}
export function calendarTaskStarted(w,r,t,places){
 if(!w.townMind)return;
 const c=ensureSchedule(w,r,places),id=taskSlot(t),s=c.items.find(s=>s.id===id);
 if(s){s.status='doing';s.actualStart??=w.minute;}
 const appointment=t.kind==='appointment'?w.commitments.active.find(c=>c.id===t.commitment):null;
 c.current={kind:t.kind,label:t.label,place:t.place,start:t.started,end:appointment?appointment.until:t.phase==='walking'?t.travelEnd+t.duration:t.due};
 adjustSchedule(w,r,c.current.end,`正在${t.label}，调整后面的空闲安排`);
}
export function calendarTaskFinished(w,r,t){
 if(!w.townMind||r.calendar?.day!==day(w))return;
 const c=r.calendar,s=c.items.find(s=>s.id===taskSlot(t));
 if(s){const p=routineFor(r);s.status=s.id==='work'?(r.economicDay.workMinutes>=p.work_minutes?'completed':'pending'):s.id==='meal'&&!r.economicDay.meal?'pending':'completed';if(s.status==='completed')s.actualEnd=w.minute;}
 delete c.current;c.revision++;
}
export function calendarHeld(w,id,t,until){
 const r=w.residents.find(r=>r.id===id);if(!w.townMind||!r?.calendar)return;
 if(r.calendar.current)r.calendar.current.end=t.phase==='walking'?t.travelEnd+t.duration:t.due;
 adjustSchedule(w,r,Math.max(until,r.calendar.current?.end||until),'交谈占用了时间，调整后面的空闲安排');
}
export function scheduleHabit(w,r,habit){
 if(!w.townMind||!habit)return habit;
 const s=r.calendar?.items.find(s=>s.id===habit.habit);
 if(s&&s.status==='deferred')return null;
 return !s||s.start<=w.minute?habit:null;
}
export function ownCommitments(w,id,{publicOnly=false,includeClosed=false}={}){
 if(!w.townMind)return [];
 return [...(includeClosed?w.commitments.closed:[]),...w.commitments.active].filter(c=>c.participants.includes(id)&&(!publicOnly||!c.private));
}
export function calendarContext(w,r,{publicOnly=false}={}){
 if(!w.townMind)return {};
 return {schedule:r.calendar?{day:r.calendar.day+1,revision:r.calendar.revision,current:r.calendar.current,remaining:r.calendar.items.filter(s=>!['completed','deferred'].includes(s.status)&&s.end>=w.minute).map(({id,label,place,start,end,status})=>({id,label,place,start,end,status}))}:null,
  appointments:ownCommitments(w,r.id,{publicOnly}).map(({id,label,place,at,until,status,participants})=>({id,label,place,at,until,status,participants}))};
}
export function upcomingAppointment(w,r){return ownCommitments(w,r.id).filter(c=>c.kind==='meeting'&&c.until>=w.minute).sort((a,b)=>a.at-b.at)[0];}
export function idleDeadline(w,r){
 if(!w.townMind)return Infinity;
 const p=routineFor(r),base=day(w)*1440;
 const times=[base+p.sleep_minute,...(!r.economicDay.meal?[base+p.meal_minute]:[]),...(r.economicDay.workMinutes<p.work_minutes?[base+p.work_start]:[]),...ownCommitments(w,r.id).map(c=>c.at)];
 return Math.min(...times.filter(t=>t>w.minute));
}
export function validateAppointment(w,proposal,places){
 if(!w.townMind||!proposal||!Number.isSafeInteger(proposal.at)||proposal.at<w.minute+10||proposal.at>w.minute+2880)return false;
 const p=places.find(p=>p.id===proposal.place),duration=proposal.duration||20,minute=proposal.at%1440;
 if(!p||p.ownerId||duration<10||duration>60||minute<p.open*60||minute+duration+20>p.close*60||w.weather==='rain'&&!p.indoor)return false;
 for(const id of proposal.participants){
  if(id==='player')continue;const r=w.residents.find(r=>r.id===id);if(!r)return false;const routine=routineFor(r);
  const awake=routine.sleep_minute<routine.wake_minute?minute>=routine.wake_minute||minute+duration<=routine.sleep_minute:minute>=routine.wake_minute&&minute+duration<=routine.sleep_minute;
  if(!awake||minute<routine.work_end&&minute+duration>routine.work_start&&!(Math.floor(proposal.at/1440)===day(w)&&r.economicDay.workMinutes>=routine.work_minutes))return false;
  if(minute<routine.meal_minute+30&&minute+duration>routine.meal_minute)return false;
 }
 if(w.commitments.active.length>=32)return false;
 return !w.commitments.active.some(c=>c.participants.some(id=>proposal.participants.includes(id))&&proposal.at<c.until&&proposal.at+duration+20>c.at);
}
// Only explicit times and named places are executable. A vague suggestion stays dialogue.
export function parseAppointment(w,r,text,places,{partner='player',sourceAt=w.minute,private:secret=false}={}){
 if(!w.townMind||!/(一起|约|见面|见|碰面|等你|来找|喝茶|散步)/.test(text)||/(不要|别约|不想|取消|如果|假如)/.test(text))return null;
 const time=String(text).match(/(?:[今明后]天|第\s*(\d+)\s*天)[^。！？\n]{0,30}?(\d{1,2})\s*[:：]\s*(\d{2})/);
 if(!time||Number(time[2])>23||Number(time[3])>59)return null;
 const prefix=time[0],d=time[1]?Number(time[1])-1:Math.floor(sourceAt/1440)+(prefix.startsWith('明天')?1:prefix.startsWith('后天')?2:0);
 const aliases={park:'公园',library:'书屋',cafe:'咖啡馆',hotel:'酒店'};
 const p=places.filter(p=>!p.ownerId).find(p=>String(text).includes(p.name)||String(text).includes(p.short)||aliases[p.id]&&String(text).includes(aliases[p.id]));if(!p)return null;
 const proposal={kind:'meeting',label:'约好见面',place:p.id,at:d*1440+Number(time[2])*60+Number(time[3]),duration:20,participants:[partner,r.id],private:secret};
 return validateAppointment(w,proposal,places)?proposal:null;
}
export function acceptAppointment(w,proposal,source,record){
 const identical=w.commitments.active.find(c=>c.kind===proposal.kind&&c.place===proposal.place&&c.at===proposal.at&&c.participants.length===proposal.participants.length&&c.participants.every(id=>proposal.participants.includes(id)));
 if(identical)return identical;
 const c={...proposal,id:`appointment-${++w.commitments.seq}`,until:proposal.until||proposal.at+(proposal.duration||20)+20,status:'accepted',source,acceptedAt:w.minute,arrivals:{}};
 const e=record(w,'commitment',`${c.participants.map(id=>name(w,id)).join('与')}约好第${Math.floor(c.at/1440)+1}天${clock(c.at)}在${c.placeLabel||c.place}见面。`,c.participants.filter(id=>id!=='player'),7,{place:c.place,player:c.participants.includes('player'),private:!!c.private,evidence:source?[source]:[],commitmentId:c.id,appointment:{place:c.place,at:c.at,until:c.until,participants:c.participants}});
 c.source=e.id;w.commitments.active.push(c);w.revision++;
 for(const r of w.residents.filter(r=>c.participants.includes(r.id)))adjustSchedule(w,r,c.until,'已接受见面约定，留出赴约时间',{from:c.at-60});
 return c;
}
export function closeAppointment(w,c,status,reason,record){
 if(!activeStatuses.has(c.status))return false;
 c.status=status;c.finishedAt=w.minute;c.reason=reason;
 const text=({fulfilled:'已经赴约',missed:'这次未能完成见面',cancelled:'取消了这次约定'})[status];
 record(w,'commitment_result',`${c.participants.map(id=>name(w,id)).join('与')}${text}。${reason||''}`,c.participants.filter(id=>id!=='player'),status==='missed'?7:6,{place:c.place,player:c.participants.includes('player'),private:!!c.private,evidence:c.source?[c.source]:[],commitmentId:c.id,status});
 for(const id of c.participants){
  const t=w.economy.tasks[id];if(!t||(t.kind!=='appointment'||t.commitment!==c.id)&&(t.kind!=='invite'||!w.economy.hotel.invitations.some(i=>i.id===t.invitation&&i.commitmentId===c.id)))continue;
  const r=w.residents.find(r=>r.id===id);
  if(status==='fulfilled'){if(t.kind==='appointment'){t.due=Math.min(t.due,Math.max(w.minute+1,c.at+(c.duration||20)));if(r?.calendar.current)r.calendar.current.end=t.due;}continue;}
  if(t.object){const o=resolveObject(w,t.object);if(o?.state.occupiedBy===id){patchObject(w,o,{state:{occupiedBy:'',occupiedUntil:0}});w.objectWorld.revision++;}}
  delete w.economy.tasks[id];if(r){r.route=[];r.life.route=[];r.life.phase='doing';r.action='约定已结束，稍作休息';if(r.calendar)delete r.calendar.current;}
 }
 w.commitments.active=w.commitments.active.filter(x=>x!==c);w.commitments.closed.push(c);if(w.commitments.closed.length>40)w.commitments.closed.shift();
 const invitation=w.economy.hotel.invitations.find(i=>i.commitmentId===c.id);if(invitation)invitation.status=status==='fulfilled'?'visited':status;
 w.revision++;return true;
}
export function tickAppointments(w,places,record){
 if(!w.townMind)return;
 for(const c of [...w.commitments.active]){
  if(c.kind==='hotel'){
   const invitation=w.economy.hotel.invitations.find(i=>i.commitmentId===c.id);
   if(invitation?.status==='visited'){closeAppointment(w,c,'fulfilled','实际在酒店完成了做客活动。',record);continue;}
  }
  const p=places.find(p=>p.id===c.place);
  if(c.kind==='meeting'&&w.minute>=c.at&&w.minute<=c.until&&p){
   const positions=c.participants.map(id=>id==='player'?w.player:w.residents.find(r=>r.id===id)?.life);
   const present=c.participants.every((id,i)=>{const a=positions[i];return a&&!(a.route?.length)&&Math.hypot(a.x-p.x,a.z-p.z)<4&&(id!=='player'||w.minute<w.economy.playerOnlineUntil);})&&positions.every(a=>Math.hypot(a.x-positions[0].x,a.z-positions[0].z)<3.5);
   if(present){closeAppointment(w,c,'fulfilled','双方在约定时段实际到场。',record);continue;}
  }
  if(w.minute>c.until)closeAppointment(w,c,'missed','约定时段结束，未记录到完成见面。',record);
 }
}
export function adoptHotelInvitations(w,record,places){
 if(!w.townMind)return;
 for(const i of w.economy.hotel.invitations){
  if(i.commitmentId||!['accepted','arriving'].includes(i.status))continue;
  const at=Math.floor(Math.max(w.minute,i.at)/1440)*1440+1020+(w.minute%1440>=1260?1440:0);
  const source=w.events.find(e=>e.type==='hotel_invitation'&&e.at===i.at&&e.participants.includes(i.resident));
  const c={id:`appointment-${++w.commitments.seq}`,kind:'hotel',label:'来酒店做客',place:'hotel',participants:['player',i.resident],at,until:Math.floor(at/1440)*1440+1260,duration:25,status:i.status,source:source?.id,acceptedAt:i.at,arrivals:{},migrated:true};w.commitments.active.push(c);
  i.commitmentId=c.id;
 }
}
