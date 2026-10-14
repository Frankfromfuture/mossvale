// Indexes are runtime-only. The save retains sources, never embeddings or a
// second copy of an event's text. Each index belongs to one resident in one town.
const worldIndexes=new WeakMap(),mindIndexes=new WeakMap();
export function memoryEvents(w){
 let c=worldIndexes.get(w);
 if(!c||c.array!==w.events||c.count>w.events.length){c={array:w.events,count:0,map:new Map()};worldIndexes.set(w,c);}
 for(;c.count<w.events.length;c.count++)c.map.set(w.events[c.count].id,w.events[c.count]);
 return c.map;
}
export function attachMemoryText(w,r,m){
 if(Object.hasOwn(m,'text'))return m;
 Object.defineProperty(m,'text',{configurable:true,enumerable:false,get(){const e=memoryEvents(w).get(m.eventId);return e?.participants?.includes(r.id)?e.text:'';}});
 return m;
}
export function installLongMemory(w){
 if(!w.economy)return false;
 const changed=w.longMemoryVersion!==1;w.longMemoryVersion=1;
 for(const r of [...w.residents,...(w.archivedResidents||[])])for(const m of r.memories||[])attachMemoryText(w,r,m);
 return changed;
}
const concepts=[['花','花束','花圃','花艺','种植'],['书','阅读','读书','书屋','图书'],['茶','喝茶','茶歇','咖啡','下午茶'],['约定','赴约','约会','邀请','见面','失约'],['修理','维修','木工','工坊'],['雨','下雨','雨天','避雨']];
function terms(text){
 const words=new Set();
 for(const part of String(text||'').toLowerCase().match(/[a-z0-9_-]+|[\u4e00-\u9fff]+/g)||[]){
  if(/^[a-z0-9_-]+$/.test(part)||part.length===1)words.add(part);
  else for(let i=0;i<part.length-1;i++)words.add(part.slice(i,i+2));
 }
 for(let i=0;i<concepts.length;i++)if(concepts[i].some(t=>String(text).includes(t)))words.add('@'+i);
 return words;
}
function indexed(w,r){
 const events=memoryEvents(w);let c=mindIndexes.get(r);
 if(!c||c.world!==w||c.array!==r.memories||c.count>r.memories.length){c={world:w,array:r.memories,count:0,rows:[],terms:new Map(),important:[]};mindIndexes.set(r,c);}
 for(;c.count<r.memories.length;c.count++){
  const m=attachMemoryText(w,r,r.memories[c.count]),e=events.get(m.eventId);
  if(!e?.participants?.includes(r.id))continue;
  const keys=terms(m.text),row={m,keys,index:c.rows.length};c.rows.push(row);
  for(const key of keys){if(!c.terms.has(key))c.terms.set(key,[]);c.terms.get(key).push(row);}
  c.important.push(row);c.important.sort((a,b)=>(b.m.importance||0)-(a.m.importance||0)||(b.m.at||0)-(a.m.at||0));if(c.important.length>64)c.important.length=64;
 }
 return c;
}
function permitted(w,r,m,publicOnly){
 const events=memoryEvents(w),seen=new Set();
 const visit=id=>{
  if(seen.has(id))return true;seen.add(id);const e=events.get(id);
  if(!e?.participants?.includes(r.id)||publicOnly&&(e.private||e.type==='secret'))return false;
  return (e.evidence||[]).every(visit);
 };
 return visit(m.eventId)&&(m.evidence||[]).every(visit);
}
export function retrieveLongMemory(w,r,query,{publicOnly=false,limit=7,maxChars=2200}={}){
 const c=indexed(w,r),keys=terms(query),candidates=new Map();
 const add=row=>candidates.set(row.m.eventId,row);
 for(const key of keys)for(const row of (c.terms.get(key)||[]).slice(-160))add(row);
 for(const row of c.important)add(row);
 for(const row of c.rows.slice(-32))add(row);
 const scored=[];
 for(const row of candidates.values()){
  const m=row.m;if(!permitted(w,r,m,publicOnly))continue;
  const overlap=[...keys].filter(t=>row.keys.has(t)).length;
  const relevance=overlap/Math.sqrt(Math.max(1,keys.size)*Math.max(1,row.keys.size));
  const score=relevance*12+(m.importance||0)/10+Math.exp(-Math.max(0,w.minute-m.at)/2880);
  scored.push({...m,text:m.text,score});
 }
 scored.sort((a,b)=>b.score-a.score||b.at-a.at||a.eventId.localeCompare(b.eventId));
 const result=[];let remaining=maxChars;
 for(const m of scored){if(result.length>=limit||remaining<80)break;const text=String(m.text||'').slice(0,Math.min(360,remaining));if(!text)continue;result.push({...m,text});remaining-=text.length;}
 return result;
}
