import {personalityFor,routineFor} from './personality.mjs';
import {impressionWeight} from './reflection.mjs';
const time=w=>w.minute%1440;
export function isSleeping(w,r){const t=time(w),p=routineFor(r);return p.sleep_minute<p.wake_minute?t>=p.sleep_minute&&t<p.wake_minute:t>=p.sleep_minute||t<p.wake_minute;}
export function minutesUntilWake(w,r){return (routineFor(r).wake_minute-time(w)+1440)%1440||1440;}
export function personalActivity(w,r,places,{habit=false}={}){
 const p=personalityFor(r),routine=routineFor(r),t=time(w),state=r.economicDay;
 const due=routine.habits.filter(h=>t>=h.window[0]&&t<h.window[1]&&!state.habits?.[h.id]);
 if(habit){
  const h=due[0];if(!h)return null;
  const place=places.find(p=>p.id===(w.weather==='rain'?h.rain_place:h.place));if(!place)return null;
  return {kind:'habit',point:place,place:place.id,label:h.label,duration:h.duration,habit:h.id,activity:h.activity,reason:h.reason};
 }
 const allowed=places.filter(p=>p.id!=='home'&&(w.weather!=='rain'||p.indoor));
 const scored=allowed.map(place=>{
  const personal=routine.habits.find(h=>h.place===place.id),quiet=['library','park','garden'].includes(place.id),social=['square','cafe','hotel'].includes(place.id);
  const view=impressionWeight(w,r,'place',place.id);
  const company=w.residents.filter(o=>o.id!==r.id&&o.location===place.id).reduce((n,o)=>n+impressionWeight(w,r,'person',o.id),0);
  const old=state.visits?.[place.id],gap=old==null?240:Math.max(0,w.minute-old);
  const score=(personal?10:0)+(quiet?p.personality.needs.quiet/10:0)+(social?p.personality.facets.social_energy/10:0)+view*3+Math.max(-18,Math.min(18,company*2))+Math.min(12,gap/15)-(place.id===r.location?12:0);
  return {place,personal,score,view};
 }).sort((a,b)=>b.score-a.score||a.place.id.localeCompare(b.place.id));
 const selected=scored[0];if(!selected)return null;const {place,view}=selected;
 const activity=({library:'read',garden:'garden',park:'walk',square:'walk',cafe:'tea',studio:'craft',shop:'observe',hotel:'rest',clinic:'rest'})[place.id]||'rest';
 const label=({read:'安静阅读',garden:'看看植物',walk:'散步放松',tea:'坐下歇口气',craft:'练习手工',observe:'看看街坊的日常',rest:'稍作休息'})[activity];
 const entry=r.reflection?.entries.find(e=>e.key==='place:'+place.id);
 return {kind:'leisure',point:place,place:place.id,label,duration:Math.round(25+p.personality.needs.quiet/5),activity,reason:view>0&&entry?'想再来这里待一会儿。':routine.work_style,evidence:view>0&&entry?entry.evidence:[]};
}
export function activityStatus(w,r){
 const t=w.economy?.tasks[r.id];
 if(r.busy)return {icon:'chat',label:'交谈',phase:'doing'};
 if(!t)return {icon:r.life?.phase==='social'?'chat':'rest',label:r.life?.phase==='social'?'交谈':'稍作休息',phase:r.life?.phase||'doing'};
 let icon=t.activity||({produce:'craft',import:'shop',consume:t.product==='bread'?'meal':'care',staff:({cafe:'tea',library:'read',shop:'shop',garden:'garden',studio:'craft',clinic:'care',photo:'camera',music:'music'})[t.business]||'work',rest:t.label.includes('睡')?'sleep':'rest',invite:t.label.includes('书')?'read':'tea',chore:({water:'garden',clean:'clean',repair:'craft',reception:'key',delivery:'shop'})[w.economy.chores.find(j=>j.id===t.job)?.action]||'work'})[t.kind]||'rest';
 if(t.kind==='produce')icon=({bread:'meal',coffee:'tea',bouquet:'garden',pot:'garden',book:'write'})[t.product]||'craft';
 return {icon:t.phase==='walking'?'walk':icon,label:r.action,phase:t.phase,activityIcon:icon};
}
