// Incremental, idempotent expansion of the existing metre-grid town.
// Run after compose-town when rebuilding the base map; keeps existing public-object ids.
import fs from 'node:fs';
const dir=new URL('../assets/resources/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,dir)));
const layout=read('town-layout.json'),catalog=read('object-catalog.json');
layout.expansionFrom ||= {hotel:structuredClone(layout.hotel),objects:catalog.instances.filter(o=>o.group==='hotel'&&catalog.definitions[o.defId].category!=='terrain').map(o=>({...o,size:catalog.definitions[o.defId].size}))};
catalog.instances=catalog.instances.filter(o=>!o.id.startsWith('expansion-')&&!o.id.startsWith('home-')&&!o.id.startsWith('hotel-wall-')&&!o.id.startsWith('compact-hotel-wall-'));
const instances=catalog.instances,defs=catalog.definitions;
const add=(id,defId,x,z,opts={})=>{let o=instances.find(v=>v.id===id);const fields={id,defId,x,z,rotation:0,owner:'小镇共有',group:'outdoors',parentId:null,...opts};if(o)Object.assign(o,fields);else instances.push(o=fields);return o;};
const hotel={owner:'村长',group:'hotel'};
let wi=0;const wall=(x,z)=>add(`compact-hotel-wall-${wi++}`,'wall',x,z,hotel);
for(let x=18.5;x<34;x++){wall(x,-16.5);if(Math.abs(x-25.5)>=1.5)wall(x,2.5);}
for(let z=-15.5;z<2;z++){wall(18.5,z);wall(33.5,z);}
for(const x of [24.5,26.5])for(let z=-15.5;z<-2;z++)if(Math.abs(z+13.5)>=1.5&&Math.abs(z+5.5)>=1.5)wall(x,z);
for(let x=19.5;x<33;x++)if(x<24||x>=27){wall(x,-9.5);wall(x,-2.5);}
const rooms=[
 {id:'room-1',name:'101',x:21.5,z:-13,w:5,d:6,door:{x:24.5,z:-13.5},spot:{x:22.5,z:-12.5}},
 {id:'room-2',name:'102',x:30,z:-13,w:6,d:6,door:{x:26.5,z:-13.5},spot:{x:28.5,z:-12.5}},
 {id:'room-3',name:'103',x:21.5,z:-6,w:5,d:6,door:{x:24.5,z:-5.5},spot:{x:22.5,z:-4.5}},
 {id:'room-4',name:'104',x:30,z:-6,w:6,d:6,door:{x:26.5,z:-5.5},spot:{x:28.5,z:-4.5}}
];
for(const r of rooms)add(r.id+'-door','door',r.door.x,r.door.z,{...hotel,rotation:90});
add('hotel-entry','door',25.5,2.5,hotel);
for(const [i,x] of [21,30].entries()){
 add(`hotel-bed-${i+1}`,'bed',x,-14.5,{...hotel,state:{cleanliness:90}});
 add(`hotel-lamp-${i+1}`,'lamp',x-.5,-13.5,hotel);
 add(`hotel-desk-${i+1}`,'desk',i?32.5:19.5,-11.5,hotel);
 add(`hotel-chair-${i+1}`,'armchair',i?29.5:22.5,-11.5,hotel);
}
add('hotel-frontdesk','counter',20.5,-1.5,hotel);
add('hotel-lobby-table','table',30,0,hotel);
add('hotel-lobby-chair-1','armchair',28.5,.5,hotel);
add('hotel-lobby-chair-2','armchair',31.5,.5,hotel);
add('hotel-lobby-lamp','lamp',32.5,-1.5,hotel);
add('hotel-lobby-pot','pot',32.5,1.5,hotel);
wall(19.5,.5);wall(23.5,.5);wall(23.5,1.5);
add('hotel-washroom-door','door',21.5,.5,hotel);
add('hotel-washbasin','basin',19.5,1.5,hotel);
layout.hotel={bounds:{x:26,z:-7,w:16,d:20},frontdesk:{x:22.5,z:-.5},waiting:{x:25.5,z:-.5},lobby:{x:25.5,z:1.5},rooms,entry:{x:25.5,z:3.5},visitorEntry:{x:.5,z:17.5}};
layout.bounds={minX:-32,maxX:48,minZ:-36,maxZ:28};layout.spawn={x:25.5,z:4.5};
const pHotel=layout.places.find(p=>p.id==='hotel');Object.assign(pHotel,{x:25.5,z:1.5});
layout.places=layout.places.filter(p=>!p.ownerId&&!['orchard','commons','nursery','picnic'].includes(p.id));
Object.assign(layout.places.find(p=>p.id==='home'),{indoor:false});
layout.homes=[];
const owners=[{id:'player',name:'村长',code:'A1'},...layout.actors];
for(const [i,owner] of owners.entries()){
 const x=-29+(i%6)*12,z=i<6?-34:19,id='home-'+owner.id,district=i<6?'榆树里':'南风巷',address=`${district} ${i%6+1} 号`,name=owner.id==='player'?'我的家':owner.name+'的家';
 const opts={owner:owner.name,ownerId:owner.id,group:id};
 const entry={x:x+4.5,z:i<6?z+8.5:z-.5},point={x:x+4.5,z:i<6?z+5.5:z+2.5};
 layout.homes.push({id,ownerId:owner.id,name,address,district,bounds:{x:x+4,z:z+4,w:8,d:8},entry,point,bed:id+'-bed'});
 layout.places.push({id,ownerId:owner.id,name,short:name,address,district,...point,open:0,close:24,indoor:true,activity:'rest',label:owner.id==='player'?'回家休息':'邻居的家',icon:'rest',cost:0});
 let k=0;for(let xx=x+.5;xx<x+8;xx++)for(const zz of [z+.5,z+7.5]){if(zz===(i<6?z+7.5:z+.5)&&Math.abs(xx-(x+4.5))<1.5)continue;add(`${id}-wall-${k++}`,'wall',xx,zz,opts);}
 for(let zz=z+1.5;zz<z+7;zz++)for(const xx of [x+.5,x+7.5])add(`${id}-wall-${k++}`,'wall',xx,zz,opts);
 add(id+'-door','door',x+4.5,i<6?z+7.5:z+.5,{...opts,name:name+'的门',actions:['repair'],defaultAction:'inspect'});
 const furniture={...opts,actions:['rest','clean'],defaultAction:'rest'};
 add(id+'-bed','bed',x+2,z+2.5,{...furniture,name:owner.name+'的床'});
 add(id+'-desk','desk',x+1.5,z+4.5,{...opts,actions:['clean'],defaultAction:'clean'});
 add(id+'-chair','chair',x+2.5,z+4.5,{...opts,actions:['sit','clean'],defaultAction:'sit'});
 add(id+'-lamp','lamp',x+6.5,z+6.5,{...opts,actions:['toggle'],defaultAction:'toggle'});
 const personal=['player','xu','shen','a'].includes(owner.id)?'book':'pot';
 add(id+'-keepsake',personal,x+1.5,z+4.5,{...opts,parentId:id+'-desk',name:personal==='book'?owner.name+'的书':owner.name+'的盆栽',actions:personal==='book'?['read']:['water'],defaultAction:personal==='book'?'read':'water'});
 add(id+'-flowers','flowers',x+1.5,i<6?z+8.5:z-.5,{...opts,name:owner.name+'门前的花'});
}
const place=(id,name,x,z,activity,label)=>layout.places.push({id,name,short:name,x,z,activity,label,icon:activity==='garden'?'garden':'rest',indoor:false,open:0,close:24,cost:0,expanded:true});
place('orchard','东篱果园',41.5,-12.5,'harvest','照看果树');
place('commons','西风草坪',-23.5,-12.5,'music','听风歇脚');
place('nursery','溪畔苗圃',41.5,9.5,'garden','照料花草');
place('picnic','林间茶歇',-23.5,9.5,'tea','坐坐聊聊');
for(const [i,[x,z]] of [[40,-16],[44,-16],[40,-9],[44,-9]].entries())add('expansion-orchard-tree-'+i,'tree',x,z,{group:'orchard'});
for(let i=0;i<8;i++)add('expansion-nursery-flower-'+i,'flowers',39.5+i%4*2,5.5+Math.floor(i/4)*2,{group:'nursery'});
add('expansion-nursery-basin','fountain',44,5,{group:'nursery',name:'苗圃水池'});
add('expansion-commons-bench','bench',-23,-14.5,{group:'commons'});
add('expansion-commons-tree','tree',-28,-17,{group:'commons'});
add('expansion-picnic-table','table',-25,7,{group:'picnic'});
add('expansion-picnic-chair','chair',-26.5,7.5,{group:'picnic'});
add('expansion-picnic-book','book',-25.5,6.5,{group:'picnic',parentId:'expansion-picnic-table'});
add('expansion-picnic-pot','pot',-24.5,7.5,{group:'picnic',parentId:'expansion-picnic-table'});
add('expansion-picnic-bench','bench',-23,12.5,{group:'picnic'});
// Fill the new perimeter, connect both residential streets and east/west gardens.
const terrain=instances.filter(o=>defs[o.defId].category==='terrain'),covered=new Set(terrain.map(o=>`${o.x},${o.z}`));
for(let x=-31;x<48;x+=2)for(let z=-35;z<28;z+=2){
 if(!covered.has(`${x},${z}`))terrain.push(add(`expansion-ground-${x}-${z}`,'grass',x,z));
}
for(const o of terrain){
 const h=layout.homes.find(h=>Math.abs(o.x-h.bounds.x)<4&&Math.abs(o.z-h.bounds.z)<4);
 const inOldHotel=o.id.startsWith('east-ground-')&&o.x>=19&&o.x<=37&&o.z>=-17&&o.z<=5;
 if(inOldHotel){o.defId=o.x>=19&&o.x<=33&&o.z>=-15&&o.z<=1?'wood-floor':'grass';o.group=o.defId==='wood-floor'?'hotel':'outdoors';}
 if(h){o.defId='wood-floor';o.group=h.id;o.owner=owners.find(p=>p.id===h.ownerId).name;}
 else if((o.z===-23||o.z===17)&&o.x>=-27&&o.x<=43||o.x===1&&(o.z<=-19||o.z>=15)||[ -19,37 ].includes(o.x)&&o.z>=-23&&o.z<=17){o.defId='stone-floor';o.group='outdoors';}
}
// Codes stay globally unique; allow two digits now that the town has more objects.
const counts={};for(const o of instances){const letter=catalog.letters[o.defId];if(letter)counts[o.defId]=Math.max(counts[o.defId]||0,Number(o.code?.slice(1))||0);}
for(const o of instances){const letter=catalog.letters[o.defId];if(letter&&!o.code)o.code=letter+(counts[o.defId]=(counts[o.defId]||0)+1);}
layout.version=6;layout.neighborhoodVersion=1;catalog.neighborhoodVersion=1;
layout.obstacles=instances.filter(o=>{const d=defs[o.defId];return d.blocking&&!(o.defId==='door'&&(o.state?.open??d.initial.open));}).map(o=>({x:o.x,z:o.z,w:o.rotation%180===90?defs[o.defId].size.d:defs[o.defId].size.w,d:o.rotation%180===90?defs[o.defId].size.w:defs[o.defId].size.d}));
fs.writeFileSync(new URL('town-layout.json',dir),JSON.stringify(layout,null,2));
fs.writeFileSync(new URL('object-catalog.json',dir),JSON.stringify(catalog,null,2));
console.log(JSON.stringify({bounds:layout.bounds,homes:layout.homes.length,places:layout.places.length,hotel:layout.hotel.bounds,objects:instances.length}));
