import {layout,walkable,routeBetween} from './life.mjs';
import {allObjects,resolveObject,patchObject,objectBounds,snapObject} from './objects.mjs';
import {repathEconomy} from './economy.mjs';
const inside=(p,r)=>Math.abs(p.x-r.x)<r.w/2&&Math.abs(p.z-r.z)<r.d/2;
const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2-.01&&Math.abs(a.z-b.z)<(a.d+b.d)/2-.01;
const geometry=['x','z','rotation','parentId'];
export function homeFor(id){return layout.places.find(p=>p.ownerId===id)||layout.places.find(p=>p.id==='home');}
function freePoint(w,p){
 if(walkable(p.x,p.z,w))return {x:p.x,z:p.z};
 for(let r=1;r<80;r++)for(let dx=-r;dx<=r;dx++)for(const dz of [-r,r]){const q={x:Math.floor(p.x)+.5+dx,z:Math.floor(p.z)+.5+dz};if(walkable(q.x,q.z,w))return q;}
 return {...layout.spawn};
}
function migrateGrowth(w,{publicOnly=false}={}){
 const from=layout.growthFrom;if(!from)return false;
 const oldObjects=new Map(from.objects.map(o=>[o.id,o])),oldPlaces=new Map(from.places.map(p=>[p.id,p]));
 const moves=new Map(layout.places.map(p=>{const old=oldPlaces.get(p.id);return [p.id,old&&(!publicOnly||!p.ownerId)?{x:p.x-old.x,z:p.z-old.z}: {x:0,z:0}];}));
 const oldBounds=group=>from.homes.find(h=>h.id===group)?.bounds||(()=>{const os=from.objects.filter(o=>o.group===group&&o.defId==='wall');return os.length?{x:(Math.min(...os.map(o=>o.x))+Math.max(...os.map(o=>o.x)))/2,z:(Math.min(...os.map(o=>o.z))+Math.max(...os.map(o=>o.z)))/2,w:Math.max(...os.map(o=>o.x))-Math.min(...os.map(o=>o.x))+1,d:Math.max(...os.map(o=>o.z))-Math.min(...os.map(o=>o.z))+1}:null;})();
 const stored=[...(w.neighborhoodMigration?.stored||[])];
 for(const [id,patch] of Object.entries(w.objectWorld.patches)){
  const old=oldObjects.get(id),now=resolveObject(w,id),move=moves.get(old?.group);if(!old||!now||!move||!move.x&&!move.z)continue;
  if(old.defId==='wall'||old.defId==='door'){for(const key of geometry)delete patch[key];continue;}
  if(!('x' in patch||'z' in patch))continue;
  const previous={x:patch.x??old.x,z:patch.z??old.z},bounds=oldBounds(old.group);
  if(bounds&&!inside(previous,bounds))continue; // Furniture deliberately moved elsewhere stays there.
  patch.x=previous.x+move.x;patch.z=previous.z+move.z;
  const home=layout.homes.find(h=>h.id===old.group),size=objectBounds({...now,...patch});
  if(home&&(Math.abs(patch.x-home.bounds.x)+size.w/2>home.bounds.w/2-1||Math.abs(patch.z-home.bounds.z)+size.d/2>home.bounds.d/2-1)){patch.state={...patch.state,stored:true};stored.push(id);}
 }
 for(const o of Object.values(w.objectWorld.instances||{})){const move=moves.get(o.group),bounds=oldBounds(o.group);if(move&&bounds&&inside(o,bounds)){o.x+=move.x;o.z+=move.z;}}
 w.objectWorld.navRevision++;w.objectWorld.revision++;
 const actors=[{id:'player',life:w.player},...w.residents,...(w.economy?.visitors||[])];
 for(const a of actors){
  const p=a.life,task=w.economy?.tasks[a.id],group=task?.phase==='doing'?task.place:a.id==='player'?from.homes.find(h=>inside(p,h.bounds))?.id:a.location;
  const move=moves.get(group),bounds=oldBounds(group);if(move&&bounds&&inside(p,bounds))Object.assign(p,freePoint(w,{x:p.x+move.x,z:p.z+move.z}));else if(!walkable(p.x,p.z,w))Object.assign(p,freePoint(w,p));
  const home=homeFor(a.id);if(home?.ownerId===a.id)(a.id==='player'?w.player:a).homeId=home.id;
  if(task){
   const venue=layout.places.find(v=>v.id===task.place),m=moves.get(task.place);
   if(venue&&m&&(m.x||m.z)){task.point=freePoint(w,{x:task.point.x+m.x,z:task.point.z+m.z});if(task.phase==='doing')Object.assign(p,task.point);}
   p.route=[];if(a.id!=='player')a.route=[];
  }
 }
 for(const j of w.economy?.chores||[]){const old=oldObjects.get(j.object),m=moves.get(old?.group);if(m&&(m.x||m.z))j.point=freePoint(w,{x:j.point.x+m.x,z:j.point.z+m.z});}
 w.neighborhoodVersion=layout.neighborhoodVersion;w.neighborhoodMigration={version:layout.neighborhoodVersion,at:w.minute,stored};w.revision++;repathEconomy(w);return true;
}
/** Runs once, after a byte-for-byte backup, before offline settlement. Never issues transactions. */
export function initializeNeighborhood(w){
 if(!layout.neighborhoodVersion||w.neighborhoodVersion===layout.neighborhoodVersion)return false;
 if(w.layoutVersion===layout.version){
  w.player.homeId=homeFor('player').id;for(const r of w.residents)r.homeId=homeFor(r.id)?.id;
  w.neighborhoodVersion=layout.neighborhoodVersion;w.neighborhoodMigration={version:layout.neighborhoodVersion,at:w.minute,stored:[]};return true;
 }
 if(layout.neighborhoodVersion>=2&&(w.neighborhoodVersion===1||w.layoutVersion>=6))return migrateGrowth(w);
 const from=layout.expansionFrom,oldById=new Map(from.objects.map(o=>[o.id,o])),oldRoom=p=>from.hotel.rooms.find(r=>inside(p,r));
 const oldPosition=o=>{const original=oldById.get(o.id)||w.objectWorld.instances?.[o.id]||o;return {...original,...w.objectWorld.patches[o.id]};};
 const remap=p=>{const room=oldRoom(p),to=room?layout.hotel.rooms.find(r=>r.id===room.id):layout.hotel.bounds,origin=room||from.hotel.bounds;return {x:p.x+to.x-origin.x,z:p.z+to.z-origin.z};};
 const sources=allObjects(w),byId=new Map(sources.map(o=>[o.id,o]));
 const hotelItem=o=>{const seen=new Set();while(o&&!seen.has(o.id)){if(o.group==='hotel')return true;seen.add(o.id);o=byId.get(o.parentId);}return false;};
 const positioned=sources.filter(o=>hotelItem(o)&&o.category!=='terrain'&&o.category!=='structure'&&!o.state.stored&&!o.state.removed&&(o.parentId||w.objectWorld.instances?.[o.id]||geometry.some(k=>k in (w.objectWorld.patches[o.id]||{}))));
 const previous=new Map(positioned.map(o=>[o.id,oldPosition(o)]));
 for(const o of positioned)patchObject(w,o,{state:{stored:true}});
 for(const o of allObjects(w).filter(o=>o.group==='hotel'&&o.category==='structure')){const patch=w.objectWorld.patches[o.id];if(patch)for(const k of geometry)delete patch[k];}
 const stored=[];
 // Essential room furniture is assigned first; crowded extras remain owned in the warehouse.
 positioned.sort((a,b)=>(a.parentId?10:a.defId==='bed'?0:a.defId==='lamp'?1:2)-(b.parentId?10:b.defId==='bed'?0:b.defId==='lamp'?1:2));
 for(const o of positioned){
  const old=previous.get(o.id),room=oldRoom(old),target=room?layout.hotel.rooms.find(r=>r.id===room.id):layout.hotel.bounds;
  const parent=o.parentId&&resolveObject(w,o.parentId),bounds=parent&&!parent.state.stored?objectBounds(parent):target;
  const desired=remap(old),size=objectBounds(o),points=[];
  if(parent?.state.stored){stored.push(o.id);continue;}
  const inset=parent||room?0:1;
  for(let x=bounds.x-bounds.w/2+inset+size.w/2;x<=bounds.x+bounds.w/2-inset-size.w/2;x++)for(let z=bounds.z-bounds.d/2+inset+size.d/2;z<=bounds.z+bounds.d/2-inset-size.d/2;z++)points.push(snapObject(o,x,z));
  points.sort((a,b)=>(a.x-desired.x)**2+(a.z-desired.z)**2-((b.x-desired.x)**2+(b.z-desired.z)**2));
  const others=allObjects(w).filter(x=>x.id!==o.id&&x.id!==o.parentId&&x.category!=='terrain'&&!x.state.stored&&!x.state.removed);
  let placed=false;
  for(const p of points){
   if(others.some(x=>overlap({...size,...p},objectBounds(x))))continue;
   // Keep the advertised room destination free, including for future furnishings.
   if(o.blocking&&layout.hotel.rooms.some(r=>overlap({...size,...p},{...r.spot,w:1,d:1})))continue;
   patchObject(w,o,{...p,state:{stored:false}});w.objectWorld.navRevision++;
   if(o.blocking&&!layout.hotel.rooms.every(r=>walkable(r.spot.x,r.spot.z,w)&&routeBetween(layout.hotel.lobby,r.spot,w))){patchObject(w,o,{state:{stored:true}});w.objectWorld.navRevision++;continue;}
   placed=true;break;
  }
  if(!placed)stored.push(o.id);
 }
 const actors=[{id:'player',life:w.player},...w.residents,...(w.economy?.visitors||[])];
 for(const a of actors){
  const p=a.life;if(!p)continue;
  const home=layout.homes.find(h=>h.ownerId===a.id);if(home){(a.id==='player'?w.player:a).homeId=home.id;}
  if(inside(p,from.hotel.bounds))Object.assign(p,freePoint(w,remap(p)));
  else if(!walkable(p.x,p.z,w))Object.assign(p,freePoint(w,p));
  p.route=[];if(a.id!=='player')a.route=[];
 }
 for(const t of Object.values(w.economy?.tasks||{})){
  const a=actors.find(a=>a.id===t.actor);if(!a)continue;
  if(t.place==='home'&&layout.homes.some(h=>h.ownerId===t.actor)){
   const home=homeFor(t.actor);t.point={x:home.x,z:home.z};t.place=home.id;
   // Continue unfinished sleep at the actual home after walking there.
   if(t.phase==='doing'){t.duration=Math.max(1,t.due-w.minute);t.phase='walking';a.life.phase='walking';}
  }else if(t.place==='hotel'||inside(t.point,from.hotel.bounds)){
   const object=t.object&&resolveObject(w,t.object);
   t.point=freePoint(w,t.kind==='checkin-wait'?layout.hotel.waiting:object&&!object.state.stored?object:remap(t.point));
   if(t.phase==='doing')Object.assign(a.life,t.point);
  }
  a.target=t.place;if(t.actor!=='player'&&t.phase==='doing')a.location=t.place;
 }
 for(const job of w.economy?.chores||[]){const o=resolveObject(w,job.object);if(o?.group==='hotel')job.point=freePoint(w,job.action==='reception'?layout.hotel.frontdesk:o);}
 w.objectWorld.revision++;w.objectWorld.navRevision++;w.neighborhoodVersion=layout.neighborhoodVersion;
 w.neighborhoodMigration={version:layout.neighborhoodVersion,at:w.minute,stored};w.revision++;
 if(layout.neighborhoodVersion>=2)migrateGrowth(w,{publicOnly:true});
 repathEconomy(w);return true;
}
