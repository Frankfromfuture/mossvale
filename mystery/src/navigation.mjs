// One world-space footprint for walls, furniture and actors. Rendering opacity
// never changes walkability. All coordinates are metres in the actual scene.
export const actorRadius=.49;
export class NavigationWorld {
 constructor(obstacles,{minX=-24,maxX=24,minZ=-20,maxZ=20}={},cell=.2){
  Object.assign(this,{obstacles,minX,maxX,minZ,maxZ,cell});
  this.cols=Math.round((maxX-minX)/cell)+1;this.rows=Math.round((maxZ-minZ)/cell)+1;
  this.blocked=new Uint8Array(this.cols*this.rows);
  for(let i=0;i<this.blocked.length;i++){const p=this.point(i);this.blocked[i]=!this.free(p);}
 }
 point(i){return {x:this.minX+(i%this.cols)*this.cell,z:this.minZ+Math.floor(i/this.cols)*this.cell};}
 index(p){const x=Math.round((p.x-this.minX)/this.cell),z=Math.round((p.z-this.minZ)/this.cell);return x<0||x>=this.cols||z<0||z>=this.rows?-1:z*this.cols+x;}
 free(p,others=[],ignoreId=null){
  const r=actorRadius;
  if(p.x<this.minX+r||p.x>this.maxX-r||p.z<this.minZ+r||p.z>this.maxZ-r)return false;
  if(this.obstacles.some(o=>o.id!==ignoreId&&p.x>o.minX-r&&p.x<o.maxX+r&&p.z>o.minZ-r&&p.z<o.maxZ+r))return false;
  return !others.some(o=>Math.hypot(p.x-o.x,p.z-o.z)<r+(o.radius??r)+.04);
 }
 clear(a,b,others=[],ignoreId=null){
  // Check actor circles continuously: point samples can miss a short tangent
  // intersection and repeatedly send a walker into the same blocked segment.
  const dx=b.x-a.x,dz=b.z-a.z,length2=dx*dx+dz*dz;
  for(const o of others){
   const t=length2?Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.z-a.z)*dz)/length2)):0;
   if(Math.hypot(a.x+t*dx-o.x,a.z+t*dz-o.z)<actorRadius+(o.radius??actorRadius)+.04)return false;
  }
  const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.06));
  for(let i=0;i<=n;i++)if(!this.free({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n},[],ignoreId))return false;
  return true;
 }
 nearest(p,others=[],area=null){
  const inside=q=>!area||(q.x>=area.minX&&q.x<=area.maxX&&q.z>=area.minZ&&q.z<=area.maxZ);
  if(inside(p)&&this.free(p,others))return {x:p.x,z:p.z};
  let best=null,distance=Infinity;
  for(let i=0;i<this.blocked.length;i++){
   if(this.blocked[i])continue;const q=this.point(i),d=(p.x-q.x)**2+(p.z-q.z)**2;
   if(d<distance&&inside(q)&&this.free(q,others)){best=q;distance=d;}
  }
  return best;
 }
 path(start,desired,others=[],area=null){
  if(!this.free(start))return [];
  const end=this.nearest(desired,others,area);if(!end)return [];
  if(this.clear(start,end,others))return [end];
  // Attach exact positions to a nearby grid cell without crossing a corner.
  const attach=p=>{
   const center=this.index(p),cx=center%this.cols,cz=Math.floor(center/this.cols);let best=-1,score=Infinity;
   for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
    const x=cx+dx,z=cz+dz;if(x<0||x>=this.cols||z<0||z>=this.rows)continue;
    const i=z*this.cols+x,q=this.point(i),d=Math.hypot(p.x-q.x,p.z-q.z);
    if(!this.blocked[i]&&d<score&&this.clear(p,q,others)){best=i;score=d;}
   }return best;
  };
  const from=attach(start),to=attach(end);if(from<0||to<0)return [];
  const costs=new Float64Array(this.blocked.length).fill(Infinity),previous=new Int32Array(this.blocked.length).fill(-1),closed=new Uint8Array(this.blocked.length),heap=[];
  const push=(i,f)=>{let n=heap.length;heap.push({i,f});while(n){const p=(n-1)>>1;if(heap[p].f<=f)break;[heap[n],heap[p]]=[heap[p],heap[n]];n=p;}};
  const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let n=0;while(true){let c=n*2+1;if(c>=heap.length)break;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[n].f<=heap[c].f)break;[heap[n],heap[c]]=[heap[c],heap[n]];n=c;}}return first.i;};
  const dynamic=new Map(),open=i=>{if(i<0||this.blocked[i])return false;if(!dynamic.has(i))dynamic.set(i,this.free(this.point(i),others));return dynamic.get(i);};
  costs[from]=0;push(from,0);
  while(heap.length){
   const i=pop();if(closed[i])continue;closed[i]=1;if(i===to)break;
   const x=i%this.cols,z=Math.floor(i/this.cols);
   for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dz)continue;const nx=x+dx,nz=z+dz;if(nx<0||nx>=this.cols||nz<0||nz>=this.rows)continue;
    const j=nz*this.cols+nx;if(closed[j]||!open(j))continue;
    if(dx&&dz&&(!open(z*this.cols+nx)||!open(nz*this.cols+x)))continue;
    const next=costs[i]+Math.hypot(dx,dz);if(next>=costs[j])continue;
    costs[j]=next;previous[j]=i;const q=this.point(j);push(j,next+Math.hypot(q.x-end.x,q.z-end.z)/this.cell);
   }
  }
  if(!closed[to])return [];
  const raw=[end];for(let i=to;i!==-1;i=previous[i])raw.unshift(this.point(i));
  const result=[];let current=start,index=0;
  while(index<raw.length){let far=index;while(far+1<raw.length&&this.clear(current,raw[far+1],others))far++;result.push(raw[far]);current=raw[far];index=far+1;}
  return result.filter((p,i)=>Math.hypot(p.x-(i?result[i-1]:start).x,p.z-(i?result[i-1]:start).z)>.015);
 }
}
