// Only geometry already projected by the server is accepted here.
export const roomAt=(rooms,p)=>rooms.find(r=>p.x>r.x-r.w/2&&p.x<r.x+r.w/2&&p.z>r.z-r.d/2&&p.z<r.z+r.d/2);
export function wallSegments(rooms,doors){
 const segments=[],seen=new Set();
 for(const r of rooms){
  for(const [axis,fixed,start,end] of [['x',r.z-r.d/2,r.x-r.w/2,r.x+r.w/2],['x',r.z+r.d/2,r.x-r.w/2,r.x+r.w/2],['z',r.x-r.w/2,r.z-r.d/2,r.z+r.d/2],['z',r.x+r.w/2,r.z-r.d/2,r.z+r.d/2]]){
   const openings=doors.filter(d=>d.open&&d.axis===axis&&(d.a===r.id||d.b===r.id)&&Math.abs((axis==='x'?d.z:d.x)-fixed)<.01).map(d=>[Math.max(start,(axis==='x'?d.x:d.z)-d.width/2),Math.min(end,(axis==='x'?d.x:d.z)+d.width/2)]).sort((a,b)=>a[0]-b[0]);
   let cursor=start;const add=(a,b)=>{if(b-a<.01)return;const key=[axis,fixed,a,b].join(':');if(seen.has(key))return;seen.add(key);segments.push({axis,x:axis==='x'?(a+b)/2:fixed,z:axis==='x'?fixed:(a+b)/2,w:axis==='x'?b-a:.18,d:axis==='x'?.18:b-a});};
   for(const [a,b] of openings){add(cursor,a);cursor=Math.max(cursor,b);}add(cursor,end);
  }
 }
 return segments;
}
export function sceneBounds(rooms,pad=1){return {minX:Math.min(...rooms.map(r=>r.x-r.w/2))-pad,maxX:Math.max(...rooms.map(r=>r.x+r.w/2))+pad,minZ:Math.min(...rooms.map(r=>r.z-r.d/2))-pad,maxZ:Math.max(...rooms.map(r=>r.z+r.d/2))+pad};}
