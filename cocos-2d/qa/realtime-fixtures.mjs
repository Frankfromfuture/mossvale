import fs from 'node:fs';import path from 'node:path';import {randomBytes} from 'node:crypto';
process.env.MOSSVALE_SCENE='cafe-2d';process.env.MOSSVALE_LAYOUT=path.resolve('cocos-2d/assets/resources/town-layout.json');
const {seed,record}=await import('../../server/engine.mjs');const {initializeLife,initializeGridResidents,layout}=await import('../../server/life.mjs');const {initializeObjects}=await import('../../server/objects.mjs');const {initializeEconomy}=await import('../../server/economy.mjs');const {routineFor}=await import('../../server/personality.mjs');const {installReflections}=await import('../../server/reflection.mjs');
const dir=path.resolve('cocos-2d/qa/realtime-data');fs.mkdirSync(dir,{recursive:true});const tokens={};
for(const scenario of ['idle','encounter']){
 const w=seed();initializeLife(w,seed(),record);initializeObjects(w);initializeGridResidents(w,seed(),record);initializeEconomy(w);installReflections(w);
 Object.assign(w,{minute:1140,paused:true,lastReal:Date.now()});Object.assign(w.economy,{nextPulse:1140,playerOnlineUntil:3000,nextVisitor:3000,tasks:{},planner:{day:0,mode:'rules'}});
 const point=layout.places.find(p=>p.id==='cafe');
 for(const r of w.residents){
  Object.assign(r,{busy:false,hunger:20,energy:85,location:'cafe',action:'稍作休息',economicDay:{day:0,meal:true,care:true,workMinutes:1000,lastBreakWork:1000,habits:Object.fromEntries(routineFor(r).habits.map(h=>[h.id,'completed']))}});
  Object.assign(r.life,{phase:'doing',engagedUntil:['xu','tang'].includes(r.id)?0:3000,aiHoldUntil:0,x:point.x,z:point.z,route:[]});r.reflection.lastDay=0;
  if(!['xu','tang'].includes(r.id))w.economy.tasks[r.id]={kind:'habit',actor:r.id,phase:'doing',due:3000,started:1110,duration:1890,place:'cafe',point,label:'整理物品',activity:'rest',route:[]};
 }
 if(scenario==='encounter'){
  w.economy.nextPulse=1160;
  w.economy.tasks.xu={kind:'leisure',actor:'xu',phase:'doing',due:1141,started:1110,duration:30,place:'cafe',point,label:'坐下歇口气',activity:'tea',route:[]};
  w.economy.tasks.tang={kind:'habit',actor:'tang',phase:'doing',due:1200,started:1110,duration:90,place:'cafe',point,label:'整理花材',activity:'water',route:[]};
 }
 const token=randomBytes(24).toString('hex');tokens[scenario]=token;fs.writeFileSync(path.join(dir,token+'.json'),JSON.stringify(w),{mode:0o600});
}
fs.writeFileSync('cocos-2d/qa/realtime-fixtures.json',JSON.stringify(tokens),{mode:0o600});console.log('Prepared two isolated fixture saves in cocos-2d/qa/realtime-data');
