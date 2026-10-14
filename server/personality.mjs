import {readFileSync} from 'node:fs';
import {parse} from 'yaml';
import {RESIDENTS} from '../src/data.js';

const traitKeys=['extraversion','conscientiousness','openness','agreeableness','emotional_sensitivity'];
const souls=new Map();
for(const resident of RESIDENTS){
 const text=readFileSync(new URL(`../docs/residents/${resident.id}/soul.md`,import.meta.url),'utf8');
 const block=text.match(/```yaml\r?\n([\s\S]*?)```/);
 if(!block)throw new Error(`Missing soul data: ${resident.id}`);
 const soul=parse(block[1],{maxAliasCount:0});
 if(soul.schema_version!=='mossvale.soul.v1'||soul.resident_id!==resident.id||!soul.daily_life?.summary||!soul.daily_life?.preferred_places||!soul.daily_life?.replies?.length)throw new Error(`Invalid soul: ${resident.id}`);
 for(const fields of [soul.personality.big_five,soul.personality.facets,soul.personality.needs])for(const value of Object.values(fields))if(!Number.isFinite(value)||value<0||value>100)throw new Error(`Invalid personality scale: ${resident.id}`);
 if(!traitKeys.every(key=>Number.isFinite(soul.personality.big_five[key])))throw new Error(`Missing traits: ${resident.id}`);
 const routine=soul.daily_life.economy_routine;
 if(!routine||![routine.wake_minute,routine.sleep_minute,routine.meal_minute,routine.work_start,routine.work_end].every(n=>Number.isInteger(n)&&n>=0&&n<1440)||routine.work_start>=routine.work_end||!routine.habits?.length)throw new Error(`Invalid routine: ${resident.id}`);
 for(const h of routine.habits)if(!h.id||!h.label||!h.place||h.window?.length!==2||h.window[0]>=h.window[1]||h.duration<10||h.duration>60)throw new Error(`Invalid habit: ${resident.id}`);
 souls.set(resident.id,soul);
}
export const personalityVersion=Math.max(...[...souls.values()].map(s=>s.revision));
export const personalityFor=r=>souls.get(typeof r==='string'?r:r.id);
export const routineFor=r=>personalityFor(r)?.daily_life.economy_routine;
export function installPersonalities(w){
 if(!w.lifeVersion)return false;let changed=false;
 for(const r of w.residents){const p=personalityFor(r);if(!p||r.persona?.revision===p.revision)continue;
  Object.assign(r,{tags:[...p.identity.tags],traits:traitKeys.map(key=>p.personality.big_five[key]),background:p.canonical_background,goal:p.goals.long_term,voice:p.speech.style,
   persona:{revision:p.revision,summary:p.daily_life.summary,values:p.values.map(v=>v.name),growth:p.goals.personal_growth}});
  changed=true;
 }
 w.personalityVersion=personalityVersion;return changed;
}
export function soulContext(r){const p=personalityFor(r);if(!p)return null;
 return {revision:p.revision,...(r.reflection?{routine:routineFor(r)}:{}),daily_preferences:{places:Object.keys(p.daily_life.preferred_places),goal_places:p.daily_life.goal_places},personality:p.personality,values:p.values,boundaries:p.boundaries,goals:{long_term:p.goals.long_term,personal_growth:p.goals.personal_growth},inner_conflicts:p.inner_conflicts,emotional_triggers:p.emotional_triggers,relationship_style:p.relationship_style,decision_patterns:p.decision_patterns,speech:p.speech};
}
function hash(text){let h=2166136261;for(const ch of text)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;}
export function personalLine(r,activity,place){
 const p=personalityFor(r),d=p?.daily_life,lines=d?.lines[activity];
 if(lines?.length)return lines[(r.life?.cycle||0)%lines.length];
 return d.fallback_line;
}
export function personalReply(r){const lines=personalityFor(r).daily_life.replies;return lines[(r.life?.cycle||0)%lines.length];}
export function socialInterval(r){const p=personalityFor(r).personality;return Math.round(70-p.facets.social_energy*.48+p.needs.quiet*.25);}
export function activityDuration(r){return personalityFor(r).daily_life.activity_minutes;}
export function bondGain(r,activity){const p=personalityFor(r).personality;return Math.min(6,2+Math.floor(p.needs.connection/40)+(['craft','garden','shop'].includes(activity)&&p.needs.achievement>80?2:0));}
const quietPlaces=new Set(['library','river','lookout','home','campsite']);
const socialPlaces=new Set(['cafe','square','homes']);
const exploratoryPlaces=new Set(['beach','lookout','orchard','nursery','campsite']);
export function available(w,p){const hour=w.minute%1440/60;return !!p&&hour>=p.open&&hour<p.close&&(w.weather!=='rain'||p.indoor);}
export function chooseIntent(w,r,venues){
 const p=personalityFor(r),d=p.daily_life,traits=p.personality,l=r.life,hour=w.minute%1440/60;
 const intent=(place,reason,priority='preference',evidence=[])=>({place:place==='home'?(venues.find(v=>v.ownerId===r.id)?.id||place):place,reason,priority,evidence,at:w.minute,soulRevision:p.revision});
 if(w.party?.status==='planned'&&w.party.accepted.includes(r.id)&&w.minute>=w.party.at-90&&available(w,venues.find(v=>v.id==='cafe')))return intent('cafe','下午茶已经答应了，想留够走过去的时间。','commitment');
 if(hour>=21||hour<7)return intent('home',traits.needs.quiet>75?'想安静休息，明天再慢慢做事。':'该收收心休息了，明天再找邻居聊。','sleep');
 if(r.energy<25)return intent('home','现在有些累，想先歇一歇。','energy');
 if(r.hunger>65&&available(w,venues.find(v=>v.id==='cafe')))return intent('cafe','有点饿了，想先去咖啡馆坐坐。','hunger');
 const rhythm=d.rhythm[hour<12?'morning':hour<17?'afternoon':'evening']||[];
 const memories=[];
 // Only this resident's witnessed facts can influence a visit. No global knowledge lookup.
 const byId=new Map(w.events.map(e=>[e.id,e]));
 for(const m of r.memories){if(m.kind!=='fact'||!['shared_activity','encounter','help','party'].includes(byId.get(m.eventId)?.type))continue;
  const e=byId.get(m.eventId);if(!e.participants.includes(r.id))continue;const place=e.place||(e.type==='party'?'cafe':null);if(!place)continue;
  const negative=e.type==='party'&&e.text.includes('没有赴约');
  const weight=(negative?-14*(.5+traits.facets.rumination/100):e.player||e.type==='help'?4+(r.trust-30)*.16:4)*Math.exp(-Math.max(0,w.minute-e.at)/4320);
  memories.push({place,weight,id:e.id});
 }
 const choices=venues.filter(v=>(!v.ownerId||v.ownerId===r.id)&&available(w,v)).map(v=>{
  const recent=l.visits[v.id],gap=recent==null?240:Math.max(0,w.minute-recent),preferred=d.preferred_places[v.id]??4;
  const past=memories.filter(m=>m.place===v.id).slice(-3),memoryScore=Math.max(-18,Math.min(18,past.reduce((sum,m)=>sum+m.weight,0)));
  let score=preferred+(rhythm.includes(v.id)?16:0)+(d.goal_places.includes(v.id)?traits.needs.achievement*.12:0);
  score+=quietPlaces.has(v.id)?traits.needs.quiet*.17:0;
  score+=socialPlaces.has(v.id)?traits.facets.social_energy*.16:0;
  score+=exploratoryPlaces.has(v.id)?traits.needs.novelty*Math.min(1,gap/240)*.15:0;
  score+=Math.min(12,gap*.045)-Math.max(0,45-gap)*.6-(v.id===r.location?30:0);
  score+=memoryScore+(hash(`${r.id}:${Math.floor(w.minute/45)}:${l.cycle}:${v.id}`)%9)-4;
  if(r.mood<40&&quietPlaces.has(v.id))score+=traits.needs.quiet*.15;
  score-=Math.hypot(l.x-v.x,l.z-v.z)*.13;
  return {v,score,past,memoryScore};
 }).sort((a,b)=>b.score-a.score||a.v.id.localeCompare(b.v.id));
 const choice=choices[0];if(!choice)return intent('home','先回屋里歇歇，等方便时再出门。','shelter');
 let reason=d.reasons[choice.v.id]||(choice.v.id==='home'?'想先歇一会儿，之后再出门。':`想去${choice.v.short}换换心情。`);
 if(w.weather==='rain')reason='下雨了，'+reason;
 if(choice.memoryScore>=5)reason+='还记得之前在这里的相处，想再来看看。';
 return intent(choice.v.id,reason,'preference',choice.past.map(m=>m.id));
}
