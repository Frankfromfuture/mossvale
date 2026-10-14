// Personal interpretations stay separate from witnessed events, personality and promises.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const day=w=>Math.floor(w.minute/1440);
const ignored=new Set(['background','reflection','arrival','offline']);
export function installReflections(w){
 if(!w.economy)return false;let changed=false;
 for(const r of w.residents)if(!r.reflection){r.reflection={version:1,cursor:Math.max(0,r.memories.length-40),lastAt:-1440,lastDay:-1,retryAt:0,sequence:0,entries:[],history:[]};changed=true;}
 w.reflectionVersion=1;return changed;
}
const eventIndex=new WeakMap();
function events(w){let c=eventIndex.get(w);if(!c||c.count>w.events.length){c={count:0,map:new Map()};eventIndex.set(w,c);}for(;c.count<w.events.length;c.count++)c.map.set(w.events[c.count].id,w.events[c.count]);return c.map;}
export function reflectionContext(w,r,places){
 const s=r.reflection;if(!s)return null;const index=events(w),subjects=new Map();
 const observations=r.memories.slice(s.cursor).filter(m=>{
  const e=index.get(m.eventId);return e&&!ignored.has(e.type)&&e.participants.includes(r.id)&&['fact','reported'].includes(m.kind);
 }).slice(-40).map(m=>{
  const e=index.get(m.eventId),keys=[];
  const add=(kind,id,name)=>{const key=kind+':'+id;keys.push(key);if(!subjects.has(key))subjects.set(key,{key,kind,id,name});};
  if(e.place&&places.some(p=>p.id===e.place))add('place',e.place,places.find(p=>p.id===e.place).short);
  for(const id of e.participants)if(id!==r.id){const other=w.residents.find(o=>o.id===id);if(other)add('person',id,other.name);}
  if(e.player&&!e.visitor)add('person','player','村长');
  return {eventId:e.id,kind:m.kind,text:e.text,at:e.at,importance:e.importance,private:!!e.private||e.type==='secret',subjects:keys};
 });
 const facts=observations.filter(o=>o.kind==='fact');
 if(facts.length<3||facts.reduce((n,o)=>n+o.importance,0)<15)return null;
 const validSubjects=[...subjects.values()].filter(s=>observations.filter(o=>o.subjects.includes(s.key)&&o.kind==='fact').length>=2);
 if(!validSubjects.length)return null;
 return {resident:r.name,at:w.minute,day:day(w),cursor:r.memories.length,previousCursor:s.cursor,subjects:validSubjects,observations,impressions:s.entries.map(({key,summary,strength,evidence})=>({key,summary,strength,evidence}))};
}
export function reflectionFallback(ctx){
 const subject=ctx.subjects.slice().sort((a,b)=>ctx.observations.filter(o=>o.kind==='fact'&&o.subjects.includes(b.key)).length-ctx.observations.filter(o=>o.kind==='fact'&&o.subjects.includes(a.key)).length)[0];
 return {impressions:[{key:subject.key,direction:0,summary:subject.kind==='place'?`在${subject.name}已有几次亲身经历，先记下来，之后再观察。`:`和${subject.name}有过几次实际来往，先保留这些经历。`,evidence:ctx.observations.filter(o=>o.kind==='fact'&&o.subjects.includes(subject.key)).slice(-3).map(o=>o.eventId)}]};
}
export function applyReflection(w,r,ctx,result,{mode='deepseek',record}={}){
 const s=r.reflection;if(!s||s.cursor!==ctx.previousCursor||w.minute<ctx.at)return false;
 if(!Array.isArray(result?.impressions)||!result.impressions.length||result.impressions.length>3)throw Error('invalid-reflection');
 const seen=new Set(),index=events(w);
 const rows=result.impressions.map(row=>{
  const subject=ctx.subjects.find(v=>v.key===row.key);
  if(!subject||seen.has(row.key)||typeof row.summary!=='string'||!row.summary.trim()||row.summary.length>100||![-1,0,1].includes(row.direction)||!Array.isArray(row.evidence))throw Error('invalid-reflection');
  seen.add(row.key);const evidence=[...new Set(row.evidence)];
  if(evidence.length<2||evidence.length>6)throw Error('invalid-evidence');
  const source=evidence.map(id=>ctx.observations.find(o=>o.eventId===id));
  if(source.some(o=>!o||!o.subjects.includes(row.key)||!index.get(o.eventId)?.participants.includes(r.id))||source.filter(o=>o.kind==='fact').length<2)throw Error('invalid-evidence');
  const old=s.entries.find(e=>e.key===row.key);
  // Only new evidence can move a belief; summaries never count as fresh observations.
  const fresh=evidence.filter(id=>!old?.evidence.includes(id));
  const delta=fresh.length?row.direction*(mode==='deepseek'?3:1):0;
  return {...subject,summary:row.summary.trim(),strength:clamp((old?.strength||0)+delta,-18,18),evidence:[...new Set([...(old?.evidence||[]),...evidence])],sources:[...new Map([...(old?.sources||[]),...source].map(o=>[o.eventId,o])).values()],private:!!old?.private||source.some(o=>o.private),updatedAt:w.minute,revision:(old?.revision||0)+1,mode,sourceAt:ctx.at};
 });
 for(const entry of rows){
  const old=s.entries.find(e=>e.key===entry.key);s.history.push({id:++s.sequence,at:w.minute,before:old?structuredClone(old):null,after:structuredClone(entry)});
  s.entries=s.entries.filter(e=>e.key!==entry.key);s.entries.push(entry);
  record?.(w,'reflection',`${r.name}的看法：${entry.summary}`,[r.id],6,{evidence:entry.evidence,private:entry.private,subject:entry.key,mode,reflectionRevision:entry.revision});
 }
 s.cursor=ctx.cursor;s.lastAt=w.minute;s.lastDay=day(w);s.retryAt=0;w.revision++;return true;
}
export function personalImpressions(r,{publicOnly=false,withSources=false}={}){return (r.reflection?.entries||[]).filter(e=>!publicOnly||!e.private).map(({key,kind,id,name,summary,strength,evidence,updatedAt,revision,private:secret,sources})=>({key,kind,id,name,summary,strength,evidence,updatedAt,revision,private:secret,...(withSources?{sources}: {})}));}
export function impressionWeight(w,r,kind,id){const e=r.reflection?.entries.find(e=>e.kind===kind&&e.id===id);return e?e.strength*Math.exp(-Math.max(0,w.minute-e.updatedAt)/(1440*14)):0;}
export function createReflectionLoop({decide,save,isCurrent,record,places,soul}){
 let running=false;const dueCache=new WeakMap();
 return {tick(id,w){
  if(running||!w.economy||w.paused||!w.reflectionVersion)return;
  const candidate=w.residents.filter(r=>r.reflection&&r.reflection.lastDay!==day(w)&&w.minute-r.reflection.lastAt>=240&&r.reflection.retryAt<=Date.now()).sort((a,b)=>a.reflection.lastAt-b.reflection.lastAt);
  let r,ctx;
  for(const p of candidate){const prior=dueCache.get(p);if(prior===p.memories.length)continue;ctx=reflectionContext(w,p,places);dueCache.set(p,p.memories.length);if(ctx){r=p;break;}}
  if(!r||!ctx)return;running=true;
  // A failed process can retry later; no partially generated impression is persisted.
  r.reflection.retryAt=Date.now()+60000;
  decide({...ctx,soul:soul(r)},w.usage,'reflection').then(result=>{
   if(isCurrent(id,w)&&!w.paused)applyReflection(w,r,ctx,result,{record});
  }).catch(()=>{
   if(isCurrent(id,w)&&!w.paused)applyReflection(w,r,ctx,reflectionFallback(ctx),{mode:'rules',record});
  }).finally(async()=>{try{if(isCurrent(id,w))await save(id,w);}finally{running=false;}}).catch(()=>{});
 }};
}
