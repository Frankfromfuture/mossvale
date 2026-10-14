// One isolated in-memory journey observation, including an existing saved task.
import fs from 'node:fs';
import {initializeEconomy,advanceEconomy,DEFAULTS} from '../../server/economy.mjs';
import {layout,routeBetween} from '../../server/life.mjs';
const dir='/tmp/mossvale-unified-speed-20261013',file=fs.readdirSync(dir).find(n=>n.endsWith('.json'));
const w=JSON.parse(fs.readFileSync(dir+'/'+file,'utf8')),r=w.residents.find(r=>r.id==='xu'),origin={...layout.spawn},point=layout.places.find(p=>p.id==='cafe');
const route=routeBetween(origin,point,w);if(!route?.length)throw Error('No approved observation path');
const dist=(p,q)=>Math.hypot(p.x-q.x,p.z-q.z),points=[origin,...route],length=route.reduce((sum,q,i)=>sum+dist(i?route[i-1]:origin,q),0);
const progress=p=>{let along=0,best=Infinity,value=0;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=dist(a,b);if(d<1e-8)continue;const t=Math.max(0,Math.min(1,((p.x-a.x)*(b.x-a.x)+(p.z-a.z)*(b.z-a.z))/(d*d))),off=dist(p,{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});if(off<best){best=off;value=along+t*d;}along+=d;}return value;};
w.economy.tasks={};w.economy.nextPulse=w.minute+100;w.economy.nextVisitor=w.minute+1000;
const visitor={id:'visitor:motion-probe',name:'验收游客',life:{...origin},purchases:[],spent:0,interest:'tea'};w.economy.visitors=[visitor];
const legacyEnd=w.minute+Math.ceil(length/.95);
for(const [id,p] of [[r.id,r.life],['player',w.player],[visitor.id,visitor.life]]){
 const path=route.map(q=>({...q}));Object.assign(p,{...origin,phase:'walking',route:path});
 w.economy.tasks[id]={actor:id,phase:'walking',route:path,point:{x:point.x,z:point.z},place:point.id,label:'行走验收',kind:'leisure',duration:10,travelEnd:legacyEnd,due:legacyEnd,lastMove:w.minute};
}
const actors={resident:r.life,player:w.player,visitor:visitor.life};
const before=Object.fromEntries(Object.entries(actors).map(([id,p])=>[id,{x:p.x,z:p.z,route:JSON.stringify(p.route)}]));
initializeEconomy(w);
const retimed=Object.values(w.economy.tasks).every(t=>t.travelEnd===w.minute+Math.ceil(length/layout.walkMetresPerMinute));
const positionPreserved=Object.entries(actors).every(([id,p])=>dist(before[id],p)===0),pathPreserved=Object.entries(actors).every(([id,p])=>JSON.stringify(p.route)===before[id].route);
advanceEconomy(w,1,{offline:true});
const result={environment:'Independent rules-only town clone; no user saves or model requests',metresPerSecond:Object.fromEntries(Object.entries(actors).map(([id,p])=>[id,progress(p)/(DEFAULTS.minuteMs/1000)])),existingTasksRetimed:retimed,existingPositionsPreserved:positionPreserved,existingPathsPreserved:pathPreserved};
fs.writeFileSync('cocos-2d/qa/unified-walk-server.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
if(!retimed||!positionPreserved||!pathPreserved||Object.values(result.metresPerSecond).some(speed=>Math.abs(speed-.57)>1e-6))throw Error('Server unified walking observation failed');
