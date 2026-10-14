import {createHash} from 'node:crypto';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {personalityFor} from './personality.mjs';
import {layout} from './life.mjs';
import {allObjects} from './objects.mjs';
// Publisher RSS titles only. Fetching stories never gives the publisher control of the game.
export const NEWS_FEEDS=[
 {url:'https://www.chinanews.com.cn/rss/life.xml',source:'中国新闻网',tags:['life','travel','food']},
 {url:'https://www.chinanews.com.cn/rss/culture.xml',source:'中国新闻网',tags:['culture','arts','books','music']},
 {url:'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',source:'BBC',tags:['science','nature']},
 {url:'https://science.nasa.gov/feed/',source:'NASA',tags:['science','space']}
];
const hosts=new Set(['www.chinanews.com.cn','chinanews.com.cn','www.bbc.com','www.bbc.co.uk','bbc.com','bbc.co.uk','science.nasa.gov','www.nasa.gov']);
const age=7*86400000;
const decode=s=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,' ').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):'';}).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[n]).replace(/[\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim();
const safeUrl=s=>{try{const u=new URL(s);return u.protocol==='https:'&&hosts.has(u.hostname)&&!u.username&&!u.password?u.href:null;}catch{return null;}};
const fresh=(a,now)=>a&&typeof a.id==='string'&&typeof a.source==='string'&&Array.isArray(a.tags)&&a.tags.every(t=>typeof t==='string')&&typeof a.title==='string'&&a.title.length<=160&&safeUrl(a.url)&&Number.isFinite(Date.parse(a.publishedAt))&&now-Date.parse(a.publishedAt)<=age&&Date.parse(a.publishedAt)<=now+21600000;
export function parseNews(xml,feed,now=Date.now()){
 if(typeof xml!=='string'||xml.length>2000000)return [];
 const tag=(s,name)=>decode(s.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'))?.[1]||'');
 const rows=[];for(const item of xml.matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi)){
  const s=item[1],title=tag(s,'title').slice(0,160),url=safeUrl(tag(s,'link')||s.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1]),date=tag(s,'pubDate')||tag(s,'published')||tag(s,'updated');
  if(!title||!url||!date||/战争|袭击|杀|死亡|遇难|恐怖|性侵|暴力|眼伤|癌症|war\b|killed|death|attack|murder|cancer/i.test(title))continue;
  const parsed=Date.parse(date);if(!Number.isFinite(parsed))continue;
  const a={id:createHash('sha256').update(url).digest('hex').slice(0,20),title,url,source:feed.source,publishedAt:new Date(parsed).toISOString(),tags:[...feed.tags]};
  if(fresh(a,now))rows.push(a);if(rows.length>=24)break;
 }return rows;
}
export function createNewsHub({cachePath,fetcher=fetch,now=Date.now}={}){
 let pool=[],pending=null,lastTry=0;
 async function refresh(){
  if(pending)return pending;lastTry=now();
  pending=(async()=>{
   const results=await Promise.allSettled(NEWS_FEEDS.map(async f=>{const r=await fetcher(f.url,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{Accept:'application/rss+xml,application/xml,text/xml'}});if(!r.ok)throw Error('feed');if(Number(r.headers.get('content-length'))>2000000)throw Error('size');let size=0,xml='';const decoder=new TextDecoder();for await(const chunk of r.body){size+=chunk.length;if(size>2000000)throw Error('size');xml+=decoder.decode(chunk,{stream:true});}xml+=decoder.decode();return parseNews(xml,f,now());}));
   pool=[...new Map([...results.flatMap(r=>r.status==='fulfilled'?r.value:[]),...pool].filter(a=>fresh(a,now())).map(a=>[a.id,a])).values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,80);
   if(cachePath){try{await writeFile(cachePath+'.tmp',JSON.stringify({version:1,articles:pool}),{mode:0o600});await rename(cachePath+'.tmp',cachePath);}catch{}}
   return pool;
  })().finally(()=>{pending=null;});return pending;
 }
 async function start(){if(cachePath)try{const data=JSON.parse(await readFile(cachePath,'utf8'));pool=(data.articles||[]).filter(a=>fresh(a,now())).slice(0,80);}catch{}return refresh();}
 return {start,refresh,articles:()=>pool.filter(a=>fresh(a,now())),tick(){if(now()-lastTry>=1800000)void refresh();}};
}
const interests={lin:['food','life'],xu:['books','culture','science'],chen:['arts','culture'],tang:['nature','science'],zhou:['life','travel'],su:['science','life'],lu:['arts','travel','space'],wen:['food','books','culture'],a:['music','arts'],shen:['books','culture','science'],gu:['nature','life']};
function random(w){const c=w.chatter||={version:1,rng:((w.economy?.rng||71237)^0x4ab3981)>>>0,seen:{}};c.rng=(Math.imul(c.rng,1664525)+1013904223)>>>0;return c.rng/4294967296;}
export function chatterCue(w,r,articles=[]){
 const p=layout.places.find(p=>p.id===r.location),hour=Math.floor(w.minute%1440/60),near=allObjects(w).filter(o=>!o.ownerId&&o.category!=='terrain'&&o.category!=='structure'&&!o.state.stored&&!o.state.removed&&Math.hypot(o.x-r.life.x,o.z-r.life.z)<5).slice(0,4);
 const scene={place:p?.short||'小镇',time:hour<11?'上午':hour<17?'下午':'晚上',weather:w.weather==='rain'?'下雨':'晴天',activity:r.action,visible:near.map(o=>({name:o.name,condition:o.state.cleanliness<60?'需要打扫':'可用'})),newPlaces:layout.places.filter(p=>p.expanded).map(p=>p.short)};
 if(!w.townMind)return {kind:'scene',scene};
 const roll=random(w),seen=w.chatter.seen[r.id]||[],tags=interests[r.id]||['life'];
 const choices=articles.filter(a=>fresh(a,Date.now())&&a.tags.some(t=>tags.includes(t))&&!seen.includes(a.id));
 const last=w.chatter.lastNews?.[r.id]??-1440;
 if(roll<.25&&choices.length&&w.minute-last>=240){const a=choices[Math.floor(random(w)*choices.length)];return {kind:'news',scene,news:{id:a.id,title:a.title,source:a.source,url:a.url,publishedAt:a.publishedAt},interest:tags};}
 return {kind:roll<.5?'life':'scene',scene,interest:tags,style:personalityFor(r).daily_life.summary};
}
export function discussedNews(w,r,cue,result){
 if(cue?.kind!=='news'||result.newsId!==cue.news?.id)return null;
 const c=w.chatter,seen=c.seen[r.id]||=[];seen.push(cue.news.id);if(seen.length>24)seen.splice(0,seen.length-24);(c.lastNews||={})[r.id]=w.minute;
 return {...cue.news};
}
