import {RESIDENTS} from '../../src/data.js';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),file=path.join(root,'assets/resources/object-catalog.json');
const definitions={};
const def=(id,name,category,sprite,w,d,material,mass,blocking,movable,actions,state={},extra={})=>definitions[id]={id,name,category,sprite,size:{w,d},material,mass,maxHealth:category==='terrain'?200:100,blocking,movable,opaque:category==='structure',range:2,actions,defaultAction:actions[0]||'inspect',initial:{health:category==='terrain'?200:100,cleanliness:78,uses:0,...state},...extra};
for(const [id,name,sprite,mat] of [['grass','草地','grass','草皮'],['stone-floor','石板路','paving','石灰岩'],['wood-floor','木地板','planks','松木'],['soil','种植土','soil','土壤']])def(id,name,'terrain',sprite,2,2,mat,0,false,false,['clean'],{}, {layer:0});
def('table','木圆桌','furniture','table',2.5,2.5,'橡木',18,true,true,['clean','move','rotate'],{}, {surface:true});
def('chair','木椅','furniture','chair',1.1,1.1,'橡木',5,false,true,['sit','move','rotate','clean'],{occupiedBy:'',occupiedUntil:0});
def('shelf','书架','furniture','shelf',2.8,1.5,'松木',24,true,true,['browse','move','rotate','clean'],{lastRead:-60},{surface:true});
def('workbench','木工台','furniture','workbench',3.7,1.6,'橡木',35,true,true,['craft','move','rotate','repair'],{health:85},{surface:true});
def('counter','咖啡柜台','furniture','counter',3.1,1.15,'橡木',45,true,true,['clean','move','rotate'],{}, {surface:true});
def('machine','咖啡机','appliance','machine',.9,1.15,'金属',8,false,true,['brew','move','clean'],{stock:8,capacity:8});
def('cup','陶杯','item','cup',.6,.6,'陶瓷',.2,false,true,['drink','move','clean'],{volume:1,capacity:1,content:'桂花茶'});
def('book','旧书','item','book',.58,.73,'纸张',.4,false,true,['read','move'],{lastRead:-60});
def('pot','盆栽','plant','pot',1.1,1.1,'陶土',3,false,true,['water','move','rotate'],{moisture:45,growth:65});
def('tree','果树','plant','tree',3.2,3.2,'木材',160,true,false,['harvest','water'],{moisture:62,growth:100,stock:3,capacity:3,regrowAt:0});
def('shrub','灌木','plant','shrub',1.4,1.4,'枝叶',6,true,false,['prune','water'],{moisture:48,growth:80,lastPruned:-90});
def('flowers','雏菊','plant','flowers',1,1,'草本',.2,false,false,['water','pick'],{moisture:40,growth:85});
def('door','木门','structure','door-open',2.4,.5,'橡木',16,true,false,['toggle','repair'],{open:true},{closedSprite:'door-closed',openSprite:'door-open',render:{w:2.6,d:2.6}});
def('wall','木墙','structure','wall',1,.5,'松木',15,true,false,['repair','clean']);
def('bench','长椅','furniture','bench',3.5,1.3,'橡木',16,false,true,['sit','move','rotate','repair'],{occupiedBy:'',occupiedUntil:0});
def('fountain','小喷泉','appliance','fountain',4.1,4.1,'石灰岩',800,true,false,['water-fill','toggle','clean'],{running:true,water:100});
def('crate','木箱','container','crate',1.45,1.45,'松木',7,true,true,['take','store','move','rotate'],{stock:6,capacity:12,resource:'wood'});
def('rock','石块','resource','rock',.9,.8,'石灰岩',4,true,true,['collect','move']);
def('lamp','提灯','appliance','lamp',.65,.9,'黄铜',1,false,true,['toggle','move'],{lit:true});
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
function room(id,owner,x1,x2,z1,z2,doorX){
 let i=0;for(let x=x1+.5;x<x2;x++){add(`${id}-wall-${i++}`,'wall',x,z1,{group:id,owner});if(Math.abs(x-doorX)>1.35)add(`${id}-wall-${i++}`,'wall',x,z2,{group:id,owner});}
 for(let z=z1+.5;z<z2;z++){add(`${id}-wall-${i++}`,'wall',x1,z,{rotation:90,group:id,owner});add(`${id}-wall-${i++}`,'wall',x2,z,{rotation:90,group:id,owner});}
 add(`${id}-door`,'door',doorX,z2,{group:id,owner});
}
room('cafe','林夏',-12.8,-1.8,-17,-7,-7.3);room('library','许知远',2.8,12.8,-17,-7,7.3);room('studio','陈默',-12.8,-3.8,4,12,-8.3);
const cafe={owner:'林夏',group:'cafe'},library={owner:'许知远',group:'library'},studio={owner:'陈默',group:'studio'};
for(const [i,x] of [-9.8,-6.5,-3.2].entries()){
 const id=`cafe-table-${i+1}`;add(id,'table',x,-13.9,cafe);add(`cafe-chair-${i+1}`,'chair',x,-11.9,cafe);
 add(`cafe-cup-${i+1}`,'cup',x-.45,-14.05,{...cafe,parentId:id});add(`cafe-book-${i+1}`,'book',x+.42,-13.8,{...cafe,parentId:id,rotation:12});
}
add('cafe-counter','counter',-11.45,-10.0,{...cafe,rotation:90});add('cafe-machine','machine',-11.4,-10,{...cafe,parentId:'cafe-counter'});
add('cafe-pot','pot',-2.65,-8.3,cafe);add('cafe-lamp','lamp',-2.7,-16,cafe);
for(const [i,x] of [4.7,8,11.3].entries()){
 const id=`library-shelf-${i+1}`;add(id,'shelf',x,-15.7,library);
 for(let j=0;j<1;j++)add(`${id}-book-${j}`,'book',x-.7+j*.65,-15.45,{...library,parentId:id,rotation:0});
}
add('library-table','table',6.8,-12.1,library);add('library-book','book',6.6,-12.1,{...library,parentId:'library-table'});add('library-table-lamp','lamp',7.4,-12.25,{...library,parentId:'library-table'});add('library-chair','chair',6.8,-10.2,library);add('library-pot','pot',11.5,-8.5,library);
add('studio-workbench','workbench',-8.4,5.9,studio);add('studio-crate','crate',-11.1,9.5,studio);add('studio-chair','chair',-8.4,7.65,studio);add('studio-pot','pot',-5,5.5,studio);
for(const [i,p] of [[-9,-4.65],[-4.8,-2.5]].entries()){const [x,z]=p,id=`terrace-table-${i+1}`;add(id,'table',x,z,cafe);add(`terrace-chair-${i+1}`,'chair',x-1.9,z,{...cafe,rotation:90});add(`terrace-cup-${i+1}`,'cup',x-.35,z,{...cafe,parentId:id});add(`terrace-pot-${i+1}`,'pot',x+.48,z,{...cafe,parentId:id});}
add('garden-fountain','fountain',7.4,5.3);add('garden-bench','bench',7.5,11.1);add('garden-crate','crate',3.5,7.7);add('street-lamp','lamp',-1,-5.2);add('street-pot','pot',2,-4.3);add('street-bench','bench',9,-3.9);
for(let i=0;i<9;i++)add(`garden-flowers-${i}`,'flowers',-11.3+(i%5)*.95,.45+Math.floor(i/5)*1.2);
for(let i=0;i<8;i++){const side=i%2?-1:1,z=-18+Math.floor(i/2)*5;add(`border-tree-${i}`,'tree',side*14.45,z);}
for(let i=0;i<8;i++){const side=i%2?-1:1,z=-15+Math.floor(i/2)*6;add(`border-shrub-${i}`,'shrub',side*13.1,z);}

for(const [i,p] of [[-3,14],[4.6,14.5],[-11,15],[11.5,15.5]].entries())add(`garden-rock-${i}`,'rock',p[0],p[1]);
const letters={table:'C',chair:'D',shelf:'E',bench:'F',counter:'G',machine:'H',cup:'I',book:'J',pot:'K',tree:'L',shrub:'M',flowers:'N',door:'O',workbench:'P',fountain:'Q',crate:'R',rock:'S',lamp:'T'};
const counts={};for(const o of instances){if(!letters[o.defId])continue;const count=counts[o.defId]=(counts[o.defId]||0)+1;if(count>9)throw new Error('Grid code exhausted: '+o.defId);o.code=letters[o.defId]+count;}
const catalog={schema:'mossvale.objects.v1',version:2,unit:'metre',cellSize:1,letters,definitions,instances};fs.writeFileSync(file,JSON.stringify(catalog,null,2));
const layoutFile=path.join(root,'assets/resources/town-layout.json'),layout=JSON.parse(fs.readFileSync(layoutFile));layout.version=3;layout.objectCatalogVersion=2;layout.prototype='grid';layout.cellSize=1;
layout.actors=RESIDENTS.map((r,i)=>({id:r.id,name:r.name,code:(i+1<9?'A':'B')+((i+1)%9+1),type:'code',place:layout.places.some(p=>p.id===r.work)?r.work:'square',col:r.col,row:r.row}));
layout.obstacles=instances.filter(o=>{const d=definitions[o.defId];return d.blocking&&!(o.defId==='door'&&d.initial.open);}).map(o=>{const d=definitions[o.defId],turned=o.rotation%180===90;return {x:o.x,z:o.z,w:turned?d.size.d:d.size.w,d:turned?d.size.w:d.size.d};});
layout.places.find(p=>p.id==='cafe').x=-6;layout.places.find(p=>p.id==='cafe').z=-9.5;
layout.places.find(p=>p.id==='library').x=9.5;layout.places.find(p=>p.id==='library').z=-9.5;
layout.places.find(p=>p.id==='studio').x=-7;layout.places.find(p=>p.id==='studio').z=9.5;
fs.writeFileSync(layoutFile,JSON.stringify(layout,null,2));console.log(JSON.stringify({definitions:Object.keys(definitions).length,instances:instances.length,terrain:instances.filter(o=>definitions[o.defId].category==='terrain').length}));
