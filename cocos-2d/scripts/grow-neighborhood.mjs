// Versioned growth of the 2D town. Stable public/furniture IDs support save migration.
import fs from 'node:fs';
const dir=new URL('../assets/resources/',import.meta.url),read=n=>JSON.parse(fs.readFileSync(new URL(n,dir)));
const l=read('town-layout.json'),c=read('object-catalog.json'),defs=c.definitions;
if(l.neighborhoodVersion>=2){console.log('growth already applied');process.exit(0);}
l.growthFrom={version:l.version,homes:structuredClone(l.homes),places:structuredClone(l.places),objects:c.instances.filter(o=>defs[o.defId].category!=='terrain').map(o=>({...o}))};
const shifts={library:[4,30],studio:[-20,2],clinic:[22,1],picnic:[-14,12]};
for(const o of c.instances){const d=shifts[o.group];if(d){o.x+=d[0];o.z+=d[1];}}
for(const p of l.places){const d=shifts[p.id];if(d){p.x+=d[0];p.z+=d[1];}}
c.instances=c.instances.filter(o=>!o.id.startsWith('home-')&&defs[o.defId].category!=='terrain');
const add=(id,defId,x,z,opts={})=>{const o={id,defId,x,z,rotation:0,owner:'小镇共有',group:'outdoors',parentId:null,...opts};c.instances.push(o);return o;};
const owners=[{id:'player',name:'村长'},...l.actors],specs=[
 [-35,-36,10,8,'north','榆树里'],[-18,-29,7,7,'north','苔间巷'],[4,28,8,7,'south','书页路'],[-41,2,7,9,'north','西风巷'],
 [-15,9,9,7,'south','花圃里'],[7,-34,12,9,'north','榆树里'],[43,3,8,7,'south','溪东路'],[45,-35,7,9,'north','东篱里'],
 [-1,-26,6,7,'north','苔间巷'],[-29,26,9,8,'south','西风巷'],[23,-35,8,7,'north','榆树里'],[30,28,10,7,'south','溪东路']
];
l.homes=[];l.places=l.places.filter(p=>!p.ownerId);const addresses={};
for(const [i,o] of owners.entries()){
 const [x,z,w,d,side,district]=specs[i],id='home-'+o.id,doorX=x+Math.floor(w/2)+.5,doorZ=side==='north'?z+d-.5:z+.5;
 const entry={x:doorX,z:doorZ+(side==='north'?1:-1)},point={x:doorX,z:doorZ+(side==='north'?-2:2)};
 const name=o.id==='player'?'我的家':o.name+'的家',address=`${district} ${(addresses[district]=(addresses[district]||0)+1)} 号`,opts={owner:o.name,ownerId:o.id,group:id};
 l.homes.push({id,ownerId:o.id,name,address,district,bounds:{x:x+w/2,z:z+d/2,w,d},entry,point,bed:id+'-bed'});
 l.places.push({id,ownerId:o.id,name,short:name,address,district,...point,open:0,close:24,indoor:true,activity:'rest',label:'在家休息',icon:'rest',cost:0});
 let k=0;for(let xx=x+.5;xx<x+w;xx++)for(const zz of [z+.5,z+d-.5]){if(zz===doorZ&&Math.abs(xx-doorX)<1.5)continue;add(`${id}-wall-${k++}`,'wall',xx,zz,opts);}
 for(let zz=z+1.5;zz<z+d-1;zz++)for(const xx of [x+.5,x+w-.5])add(`${id}-wall-${k++}`,'wall',xx,zz,opts);
 add(id+'-door','door',doorX,doorZ,{...opts,name:name+'的门',actions:['repair'],defaultAction:'inspect'});
 add(id+'-bed','bed',x+2,z+2.5,{...opts,name:o.name+'的床',actions:['rest','clean'],defaultAction:'rest'});
 add(id+'-desk','desk',x+1.5,z+d-3.5,{...opts,actions:['clean'],defaultAction:'clean'});
 add(id+'-chair','chair',x+2.5,z+d-3.5,{...opts,actions:['sit','clean'],defaultAction:'sit'});
 add(id+'-lamp','lamp',x+w-1.5,z+d-1.5,{...opts,actions:['toggle'],defaultAction:'toggle'});
 const personal=['player','xu','shen','a'].includes(o.id)?'book':'pot';
 add(id+'-keepsake',personal,x+1.5,z+d-3.5,{...opts,parentId:id+'-desk',name:o.name+(personal==='book'?'的书':'的盆栽'),actions:[personal==='book'?'read':'water'],defaultAction:personal==='book'?'read':'water'});
 add(id+'-flowers','flowers',x+1.5,entry.z,{...opts,name:o.name+'门前的花'});
}
l.bounds={minX:-44,maxX:60,minZ:-44,maxZ:36};
const place=(id,name,x,z,activity,label,options,indoor=false)=>l.places.push({id,name,short:name,x,z,activity,label,activityOptions:options,icon:({sketch:'write',watch:'camera',exercise:'walk',play:'music'})[activity]||activity,indoor,open:6,close:22,cost:0,expanded:true});
place('riverbank','溪湾栈道',52.5,-21.5,'watch','看水与观鸟',['watch','sketch','walk']);
place('gazebo','溪东凉亭',46.5,24.5,'read','在凉亭歇脚',['read','tea','music'],true);
place('market','西街集市',-20.5,-22.5,'observe','逛逛集市',['observe','sketch','walk']);
place('playground','槐荫活动场',-4.5,22.5,'exercise','伸展与散步',['exercise','play','walk']);
place('allotment','邻里菜园',30.5,23.5,'garden','照料菜园',['garden','watch','sketch']);
for(const [id,options] of Object.entries({commons:['music','exercise','walk'],picnic:['tea','read','sketch'],orchard:['harvest','watch','walk'],nursery:['garden','sketch','watch'],park:['walk','sketch','watch'],square:['music','play','observe']}))l.places.find(p=>p.id===id).activityOptions=options;
add('growth-river-bench','bench',54,-23.5,{group:'riverbank',name:'溪湾长椅'});add('growth-river-rock','rock',57,-18,{group:'riverbank'});
add('growth-gazebo-table','table',48,25,{group:'gazebo'});add('growth-gazebo-chair','chair',49.5,25.5,{group:'gazebo'});add('growth-gazebo-book','book',47.5,24.5,{group:'gazebo',parentId:'growth-gazebo-table'});
add('growth-market-stall','counter',-23,-23.5,{group:'market',name:'集市展示台'});add('growth-market-crate','crate',-24.5,-21.5,{group:'market'});
add('growth-play-bench','bench',-5,25.5,{group:'playground'});add('growth-play-tree','tree',-10,26,{group:'playground'});
for(let i=0;i<6;i++)add('growth-allotment-plant-'+i,'flowers',28.5+i%3*2,20.5+Math.floor(i/3)*2,{group:'allotment',name:'菜园苗床'});
add('growth-allotment-basin','basin',34.5,21.5,{group:'allotment'});
// A small clinic away from the shops, with a clear southern doorway.
let k=0;for(let x=31.5;x<=39.5;x++)for(const z of [7.5,15.5])if(z!==7.5||Math.abs(x-35.5)>=1.5)add('growth-clinic-wall-'+k++,'wall',x,z,{group:'clinic'});
for(let z=8.5;z<15;z++)for(const x of [31.5,39.5])add('growth-clinic-wall-'+k++,'wall',x,z,{group:'clinic'});
add('growth-clinic-door','door',35.5,7.5,{group:'clinic'});
const roads=[[-39,-18,-19,-20],[-19,-20,1,-20],[1,-20,3,-5],[3,-5,23,5],[23,5,39,0],[39,0,53,-20],[-38,20,-20,18],[-20,18,-1,18],[-1,18,9,25],[9,25,46,25],[-20,-20,-20,18],[39,0,40,25]];
const distance=(x,z,a)=>{const [x1,z1,x2,z2]=a,dx=x2-x1,dz=z2-z1,t=Math.max(0,Math.min(1,((x-x1)*dx+(z-z1)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-x1-dx*t,z-z1-dz*t);};
for(const h of l.homes){const a=roads.slice().sort((a,b)=>distance(h.entry.x,h.entry.z,a)-distance(h.entry.x,h.entry.z,b))[0],dx=a[2]-a[0],dz=a[3]-a[1],t=Math.max(0,Math.min(1,((h.entry.x-a[0])*dx+(h.entry.z-a[1])*dz)/(dx*dx+dz*dz)));roads.push([h.entry.x,h.entry.z,a[0]+dx*t,a[1]+dz*t]);}
l.paths=roads;
const structures=c.instances.filter(o=>o.defId==='wall');
const buildingBounds=group=>{const os=structures.filter(o=>o.group===group);return os.length?{x:(Math.min(...os.map(o=>o.x))+Math.max(...os.map(o=>o.x)))/2,z:(Math.min(...os.map(o=>o.z))+Math.max(...os.map(o=>o.z)))/2,w:Math.max(...os.map(o=>o.x))-Math.min(...os.map(o=>o.x))+1,d:Math.max(...os.map(o=>o.z))-Math.min(...os.map(o=>o.z))+1}:null;};
const buildings=['cafe','library','studio','clinic','hotel'].map(group=>({group,bounds:buildingBounds(group)})).filter(b=>b.bounds);
for(let x=-43;x<60;x+=2)for(let z=-43;z<36;z+=2){const h=l.homes.find(h=>Math.abs(x-h.bounds.x)<h.bounds.w/2&&Math.abs(z-h.bounds.z)<h.bounds.d/2),b=buildings.find(b=>Math.abs(x-b.bounds.x)<b.bounds.w/2&&Math.abs(z-b.bounds.z)<b.bounds.d/2);add(`growth-ground-${x}-${z}`,h||b?'wood-floor':roads.some(a=>distance(x,z,a)<1.3)?'stone-floor':'grass',x,z,{group:h?.id||b?.group||'outdoors',...(h?{ownerId:h.ownerId}: {})});}
const counts={};for(const o of c.instances){const letter=c.letters[o.defId];if(letter)counts[o.defId]=Math.max(counts[o.defId]||0,Number(o.code?.slice(1))||0);}for(const o of c.instances){const letter=c.letters[o.defId];if(letter&&!o.code)o.code=letter+(counts[o.defId]=(counts[o.defId]||0)+1);}
l.version=7;l.neighborhoodVersion=2;c.version=5;c.neighborhoodVersion=2;
l.obstacles=c.instances.filter(o=>defs[o.defId].blocking&&!(o.defId==='door'&&(o.state?.open??defs[o.defId].initial.open))).map(o=>({x:o.x,z:o.z,w:defs[o.defId].size.w,d:defs[o.defId].size.d}));
for(const [n,v] of [['town-layout.json',l],['object-catalog.json',c]])fs.writeFileSync(new URL(n,dir),JSON.stringify(v,null,2));
console.log(JSON.stringify({bounds:l.bounds,homes:l.homes.length,places:l.places.length,objects:c.instances.length}));
