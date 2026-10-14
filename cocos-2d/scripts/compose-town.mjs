import {addEconomyLayout} from './economy-layout.mjs';
import {RESIDENTS} from '../../src/data.js';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),file=path.join(root,'assets/resources/object-catalog.json');
const definitions={};
const def=(id,name,category,sprite,w,d,material,mass,blocking,movable,actions,state={},extra={})=>definitions[id]={id,name,category,sprite,size:{w,d},material,mass,maxHealth:category==='terrain'?200:100,blocking,movable,opaque:category==='structure',range:2,actions,defaultAction:actions[0]||'inspect',initial:{health:category==='terrain'?200:100,cleanliness:78,uses:0,...state},...extra};
for(const [id,name,sprite,mat] of [['grass','草地','grass','草皮'],['stone-floor','石板路','paving','石灰岩'],['wood-floor','木地板','planks','松木'],['soil','种植土','soil','土壤']])def(id,name,'terrain',sprite,2,2,mat,0,false,false,['clean'],{}, {layer:0});
def('table','木圆桌','furniture','table',2,2,'橡木',18,true,true,['clean','move','rotate'],{}, {surface:true});
def('chair','木椅','furniture','chair',1,1,'橡木',5,false,true,['sit','move','rotate','clean'],{occupiedBy:'',occupiedUntil:0});
def('shelf','书架','furniture','shelf',3,2,'松木',24,true,true,['browse','move','rotate','clean'],{lastRead:-60},{surface:true});
def('workbench','木工台','furniture','workbench',4,2,'橡木',35,true,true,['craft','move','rotate','repair'],{health:85},{surface:true});
def('counter','咖啡柜台','furniture','counter',3,1,'橡木',45,true,true,['clean','move','rotate'],{}, {surface:true});
def('machine','咖啡机','appliance','machine',1,1,'金属',8,false,true,['brew','move','clean'],{stock:8,capacity:8});
def('cup','陶杯','item','cup',1,1,'陶瓷',.2,false,true,['drink','move','clean'],{volume:1,capacity:1,content:'桂花茶'});
def('book','旧书','item','book',1,1,'纸张',.4,false,true,['read','move'],{lastRead:-60});
def('pot','盆栽','plant','pot',1,1,'陶土',3,false,true,['water','move','rotate'],{moisture:45,growth:65});
def('tree','果树','plant','tree',2,2,'木材',160,true,false,['harvest','water'],{moisture:62,growth:100,stock:3,capacity:3,regrowAt:0});
def('shrub','灌木','plant','shrub',1,1,'枝叶',6,true,false,['prune','water'],{moisture:48,growth:80,lastPruned:-90});
def('flowers','雏菊','plant','flowers',1,1,'草本',.2,false,false,['water','pick'],{moisture:40,growth:85});
def('door','木门','structure','door-open',3,1,'橡木',16,true,false,['toggle','repair'],{open:true},{closedSprite:'door-closed',openSprite:'door-open'});
def('wall','木墙','structure','wall',1,1,'松木',15,true,false,['repair','clean']);
def('bench','长椅','furniture','bench',4,1,'橡木',16,false,true,['sit','move','rotate','repair'],{occupiedBy:'',occupiedUntil:0});
def('fountain','小喷泉','appliance','fountain',4,4,'石灰岩',800,true,false,['water-fill','toggle','clean'],{running:true,water:100});
def('crate','木箱','container','crate',1,1,'松木',7,true,true,['take','store','move','rotate'],{stock:6,capacity:12,resource:'wood'});
def('rock','石块','resource','rock',1,1,'石灰岩',4,true,true,['collect','move']);
def('lamp','提灯','appliance','lamp',1,1,'黄铜',1,false,true,['toggle','move'],{lit:true});
const instances=[];const add=(id,defId,x,z,options={})=>{const o={id,defId,x,z,rotation:0,owner:'小镇共有',group:'outdoors',parentId:null,...options};instances.push(o);return o;};
const inside=(x,z,a,b,c,d)=>x>=a&&x<=b&&z>=c&&z<=d;
for(let row=0;row<24;row++)for(let col=0;col<16;col++){
 const x=-15+col*2,z=-23+row*2;let kind='grass',group='outdoors',owner='小镇共有';
 if(Math.abs(x)<=1||inside(x,z,-13,13,-7,-1))kind='stone-floor';
 if(inside(x,z,-12,-2,-16,-8)){kind='wood-floor';group='cafe';owner='林夏';}
 if(inside(x,z,3,12,-16,-8)){kind='wood-floor';group='library';owner='许知远';}
 if(inside(x,z,-12,-3,5,11)){kind='wood-floor';group='studio';owner='陈默';}
 if(inside(x,z,-12,-7,0,2))kind='soil';
 add(`ground-${row}-${col}`,kind,x,z,{group,owner,state:{cleanliness:75+(col+row)%20}});
}
// Outer room edges and doorway edges fall on metre boundaries.
function room(id,owner,x1,x2,z1,z2,doorX){
 let i=0;for(let x=x1+.5;x<x2;x++){
  add(`${id}-wall-${i++}`,'wall',x,z1+.5,{group:id,owner});
  if(Math.abs(x-doorX)>=1.5)add(`${id}-wall-${i++}`,'wall',x,z2-.5,{group:id,owner});
 }
 for(let z=z1+1.5;z<z2-1;z++){add(`${id}-wall-${i++}`,'wall',x1+.5,z,{rotation:90,group:id,owner});add(`${id}-wall-${i++}`,'wall',x2-.5,z,{rotation:90,group:id,owner});}
 add(`${id}-door`,'door',doorX,z2-.5,{group:id,owner});
}
room('cafe','林夏',-13,-2,-18,-7,-7.5);room('library','许知远',3,14,-18,-7,7.5);room('studio','陈默',-13,-3,4,13,-8.5);
const cafe={owner:'林夏',group:'cafe'},library={owner:'许知远',group:'library'},studio={owner:'陈默',group:'studio'};
for(const [i,x] of [-10,-7,-4].entries()){
 const id=`cafe-table-${i+1}`;add(id,'table',x,-13.9,cafe);add(`cafe-chair-${i+1}`,'chair',x,-11.9,cafe);
 add(`cafe-cup-${i+1}`,'cup',x-.45,-14.05,{...cafe,parentId:id});add(`cafe-book-${i+1}`,'book',x+.42,-13.8,{...cafe,parentId:id,rotation:0});
}
add('cafe-counter','counter',-11.45,-10.0,{...cafe,rotation:90});add('cafe-machine','machine',-11.4,-10,{...cafe,parentId:'cafe-counter'});
add('cafe-pot','pot',-3.5,-8.5,cafe);add('cafe-lamp','lamp',-3.5,-16.5,cafe);
for(const [i,x] of [5.5,8.5,11.5].entries()){
 const id=`library-shelf-${i+1}`;add(id,'shelf',x,-15.7,library);
 for(let j=0;j<1;j++)add(`${id}-book-${j}`,'book',x-.7+j*.65,-15.45,{...library,parentId:id,rotation:0});
}
add('library-table','table',6.8,-12.1,library);add('library-book','book',6.6,-12.1,{...library,parentId:'library-table'});add('library-table-lamp','lamp',7.4,-12.25,{...library,parentId:'library-table'});add('library-chair','chair',6.8,-10.2,library);add('library-pot','pot',11.5,-8.5,library);
add('studio-workbench','workbench',-8.4,5.9,studio);add('studio-crate','crate',-11.1,9.5,studio);add('studio-chair','chair',-8.4,7.65,studio);add('studio-pot','pot',-5,5.5,studio);
for(const [i,p] of [[-9,-4.65],[-4.8,-2.5]].entries()){const [x,z]=p,id=`terrace-table-${i+1}`;add(id,'table',x,z,cafe);add(`terrace-chair-${i+1}`,'chair',x-1.9,z,{...cafe,rotation:90});add(`terrace-cup-${i+1}`,'cup',x-.35,z,{...cafe,parentId:id});add(`terrace-pot-${i+1}`,'pot',x+.48,z,{...cafe,parentId:id});}
add('garden-fountain','fountain',7.4,5.3);add('garden-bench','bench',7.5,11.1);add('garden-crate','crate',3.5,7.7);add('street-lamp','lamp',-1,-5.2);add('street-pot','pot',2,-4.3);add('street-bench','bench',9,-3.9);
for(let i=0;i<9;i++)add(`garden-flowers-${i}`,'flowers',-11.3+(i%5)*.95,.45+Math.floor(i/5)*1.2);
for(let i=0;i<8;i++){const side=i%2?-1:1,z=-19+Math.floor(i/2)*6;add(`border-tree-${i}`,'tree',side*15,z);}
for(let i=0;i<8;i++){const side=i%2?-1:1,z=-16+Math.floor(i/2)*6;add(`border-shrub-${i}`,'shrub',side*14.5,z);}

for(const [i,p] of [[-3,14],[4.6,14.5],[-11,15],[11.5,15.5]].entries())add(`garden-rock-${i}`,'rock',p[0],p[1]);
const hotel=addEconomyLayout({def,add,instances});
for(const d of Object.values(definitions))if(d.movable&&!d.actions.includes('pack'))d.actions.push('pack');
// Every footprint is a whole number of cells. Attached items occupy separate
// cells on their support, leaving free cells for the support's own code.
const bounds=o=>{const d=definitions[o.defId],turned=o.rotation%180===90;return {w:turned?d.size.d:d.size.w,d:turned?d.size.w:d.size.d};};
const overlap=(a,b)=>{const x=bounds(a),y=bounds(b);return Math.abs(a.x-b.x)<(x.w+y.w)/2-.01&&Math.abs(a.z-b.z)<(x.d+y.d)/2-.01;};
for(const o of instances){o.rotation=((Math.round(o.rotation/90)*90)%360+360)%360;const b=bounds(o);o.x=Math.round(o.x-b.w/2)+b.w/2;o.z=Math.round(o.z-b.d/2)+b.d/2;}
for(const parent of instances.filter(o=>definitions[o.defId].surface)){
 const p=bounds(parent),placed=[];
 for(const item of instances.filter(o=>o.parentId===parent.id)){
  const b=bounds(item),slots=[];
  for(let x=parent.x-p.w/2+b.w/2;x<=parent.x+p.w/2-b.w/2;x++)for(let z=parent.z-p.d/2+b.d/2;z<=parent.z+p.d/2-b.d/2;z++)slots.push({x,z});
  slots.sort((a,b)=>(a.x-item.x)**2+(a.z-item.z)**2-((b.x-item.x)**2+(b.z-item.z)**2));
  const slot=slots.find(q=>!placed.some(other=>overlap({...item,...q},other)));if(!slot)throw new Error('No grid slot: '+item.id);
  Object.assign(item,slot);placed.push(item);
 }
}
const letters={table:'C',chair:'D',shelf:'E',bench:'F',counter:'G',machine:'H',cup:'I',book:'J',pot:'K',tree:'L',shrub:'M',flowers:'N',door:'O',workbench:'P',fountain:'Q',crate:'R',rock:'S',lamp:'T',bed:'U',armchair:'V',sofa:'W',desk:'X',basin:'Y',rug:'Z'};
const counts={};for(const o of instances){if(!letters[o.defId])continue;const count=counts[o.defId]=(counts[o.defId]||0)+1;if(count>9)throw new Error('Grid code exhausted: '+o.defId);o.code=letters[o.defId]+count;}
const catalog={schema:'mossvale.objects.v1',version:4,unit:'metre',cellSize:1,letters,definitions,instances};fs.writeFileSync(file,JSON.stringify(catalog,null,2));
const layoutFile=path.join(root,'assets/resources/town-layout.json'),layout=JSON.parse(fs.readFileSync(layoutFile));layout.version=5;layout.objectCatalogVersion=4;layout.prototype='grid';layout.cellSize=1;
layout.places=layout.places.filter(p=>!['hotel','shop','clinic','garden'].includes(p.id));
for(const [id,name,x,z,activity] of [['hotel','苔溪小酒店',28.5,3.5,'rest'],['shop','松果杂货铺',-4.5,.5,'shop'],['clinic','社区诊所',13.5,8.5,'rest'],['garden','花圃苗圃',-9.5,3.5,'garden']])layout.places.push({id,name,short:name,x,z,open:0,close:24,indoor:id!=='garden',activity,label:id==='hotel'?'酒店经营':'看看经营',icon:'memory',cost:0});
layout.hotel=hotel;
layout.actors=RESIDENTS.filter(r=>r.id!=='ye').map((r,i)=>({id:r.id,name:r.name,code:(i+1<9?'A':'B')+((i+1)%9+1),type:'code',place:layout.places.some(p=>p.id===r.work)?r.work:'square',col:r.col,row:r.row}));
layout.obstacles=instances.filter(o=>{const d=definitions[o.defId];return d.blocking&&!(o.defId==='door'&&d.initial.open);}).map(o=>{const d=definitions[o.defId],turned=o.rotation%180===90;return {x:o.x,z:o.z,w:turned?d.size.d:d.size.w,d:turned?d.size.w:d.size.d};});
layout.places.find(p=>p.id==='cafe').x=-6.5;layout.places.find(p=>p.id==='cafe').z=-9.5;
layout.places.find(p=>p.id==='library').x=9.5;layout.places.find(p=>p.id==='library').z=-9.5;
layout.places.find(p=>p.id==='studio').x=-7.5;layout.places.find(p=>p.id==='studio').z=9.5;
layout.bounds={minX:-16,maxX:40,minZ:-20,maxZ:20};layout.spawn={x:28.5,z:3.5};
for(const p of layout.places){p.x=Math.floor(p.x)+.5;p.z=Math.floor(p.z)+.5;}
fs.writeFileSync(layoutFile,JSON.stringify(layout,null,2));console.log(JSON.stringify({definitions:Object.keys(definitions).length,instances:instances.length,terrain:instances.filter(o=>definitions[o.defId].category==='terrain').length}));
