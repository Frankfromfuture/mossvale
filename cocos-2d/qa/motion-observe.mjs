// Bounded browser observation: shared task movement and manual player controls.
import {chromium} from '/Users/frankfan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4324/?view=grid');
 await page.waitForFunction(()=>!!globalThis.System?.import);
 await page.evaluate(async()=>{window.__cc=await System.import('cc');});
 await page.waitForFunction(()=>!!window.__cc.director.getScene()?.getComponentsInChildren('Mossvale')[0]?.state);
 const result=await page.evaluate(()=>{
  const cc=window.__cc,g=cc.director.getScene().getComponentsInChildren('Mossvale')[0];
  cc.game.pause();g.unschedule(g.refresh);g.api.stopLive();g.close();
  const initial=structuredClone(g.state),origin={x:g.player.x,z:g.player.z},speed=(g.layout.walkMetresPerMinute||.95)/2.5,id='xu',visitorId='visitor:motion-probe';
  const distance=(p,q)=>Math.hypot(p.x-q.x,p.z-q.z);let route=[];
  for(let i=0;i<g.grid.length;i++)if(g.grid[i]){
   const p={x:g.layout.bounds.minX+.5+i%g.cols,z:g.layout.bounds.minZ+.5+Math.floor(i/g.cols)};
   if(distance(p,origin)<6||distance(p,origin)>10)continue;
   const candidate=g.path(origin,p),length=candidate.reduce((sum,q,index)=>sum+distance(q,index?candidate[index-1]:origin),0);
   if(length>=speed*16+1&&candidate.length<=16){route=candidate;break;}
  }
  if(!route.length)throw Error('No bounded approved walking route');
  const points=[origin,...route];
  const sample=s=>{let p={...origin},remaining=s*speed,index=0;for(;index<route.length;index++){const q=route[index],d=distance(p,q);if(d>remaining){p={x:p.x+(q.x-p.x)/d*remaining,z:p.z+(q.z-p.z)/d*remaining};break;}remaining-=d;p={...q};}return{...p,route:route.slice(index).map(p=>({...p})),phase:index<route.length?'walking':'doing',engagedUntil:0,aiHoldUntil:0};};
  const progress=p=>{let along=0,best=Infinity,value=0;for(let i=1;i<points.length;i++){const u=points[i-1],v=points[i],d=distance(u,v);if(d<1e-8)continue;const t=Math.max(0,Math.min(1,((p.x-u.x)*(v.x-u.x)+(p.z-u.z)*(v.z-u.z))/(d*d))),off=distance(p,{x:u.x+(v.x-u.x)*t,z:u.z+(v.z-u.z)*t});if(off<best){best=off;value=along+d*t;}along+=d;}return value;};
  let sequence=initial.sync.sequence+1;
  const snapshot=t=>{const w=structuredClone(initial),pose=sample(t);w.sync={epoch:initial.sync.epoch,sequence:sequence++};w.paused=false;w.speed=1;w.economy.playerWorking=true;w.economy.playerTask={label:'行走验收',due:w.minute+100,phase:'walking'};Object.assign(w.player,structuredClone(pose));w.residents=w.residents.filter(r=>r.id===id);Object.assign(w.residents[0].life,structuredClone(pose));w.residents[0].busy=false;w.visitors=[{id:visitorId,name:'验收游客',code:'B4',visitor:true,role:'游客',tags:[],memories:[],thought:'',action:'前往散步',trust:0,mood:70,life:structuredClone(pose)}];return w;};
  g.positioned=false;g.setWorld(snapshot(0));
  const pawns={resident:g.actors.find(a=>a.id===id),visitor:g.actors.find(a=>a.id===visitorId),playerTask:g.player},rates={resident:[],visitor:[],playerTask:[]},last={resident:0,visitor:0,playerTask:0};
  for(let frame=1;frame<=960;frame++){if(frame%120===0||frame%120===42)g.setWorld(snapshot(Math.floor(frame/60/2.5)*2.5));g.update(1/60);for(const [kind,p] of Object.entries(pawns)){const next=progress(p);rates[kind].push((next-last[kind])*60);last[kind]=next;}}
  const stats=values=>({frames:values.length,min:Math.min(...values),max:Math.max(...values),stoppedFrames:values.filter(v=>Math.abs(v)<.00001).length,backwardFrames:values.filter(v=>v<-.00001).length});
  const tasks=Object.fromEntries(Object.entries(rates).map(([kind,values])=>[kind,stats(values)]));
  const before=g.state;g.setWorld(initial);const staleRejected=g.state===before;
  g.setWorld(snapshot(15.1));g.update(1/60);for(const [kind,p] of Object.entries(pawns))tasks[kind].lateSnapshotSpeed=(progress(p)-last[kind])*60;
  const manual=snapshot(0);manual.economy.playerWorking=false;manual.economy.playerTask=undefined;g.setWorld(manual);g.player.x=origin.x;g.player.z=origin.z;g.selected='';g.route=route.map(p=>({...p}));g.destination=route.at(-1);let pLast=0,manualRates=[];
  for(let frame=0;frame<960;frame++){g.update(1/60);const next=progress(g.player);manualRates.push((next-pLast)*60);pLast=next;}
  const manualTap=stats(manualRates);g.route=[];g.destination=null;g.player.x=origin.x;g.player.z=origin.z;let dragLast=0,dragRates=[];
  const first=route[0],d=distance(first,origin);
  for(const magnitude of [30,130]){g.gesture={x:0,y:0,dx:(first.x-origin.x)/d*magnitude,dy:-(first.z-origin.z)/d*magnitude,moved:true,held:false,at:Date.now()};for(let frame=0;frame<30;frame++){g.update(1/60);const next=progress(g.player);dragRates.push((next-dragLast)*60);dragLast=next;}}
  g.gesture=null;
  return{expectedMetresPerSecond:speed,seconds:16,tasks,manualTap,manualDrag:stats(dragRates),staleRejected,route,environment:'Headless Chrome 390x844; actual Cocos component with fixed 60 Hz updates; isolated rules-only town and client-only snapshots'};
 });
 result.errors=errors;fs.writeFileSync(process.argv[2]||'cocos-2d/qa/unified-walk-client.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 const stats=[...Object.values(result.tasks),result.manualTap,result.manualDrag];
 if(errors.length||!result.staleRejected||stats.some(s=>s.stoppedFrames||s.backwardFrames||Math.abs(s.min-result.expectedMetresPerSecond)>1e-6||Math.abs(s.max-result.expectedMetresPerSecond)>1e-6)||Object.values(result.tasks).some(s=>Math.abs(s.lateSnapshotSpeed-result.expectedMetresPerSecond)>1e-6))throw Error('Unified walking observation failed');
}finally{await browser.close();}
