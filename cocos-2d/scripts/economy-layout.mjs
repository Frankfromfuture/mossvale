// Metre-aligned hotel and public workstations, shared by navigation and simulation.
export function addEconomyLayout({def,add,instances}) {
 def('bed','单人床','furniture','',2,1,'松木',22,false,true,['rest','move','rotate','clean','pack'],{occupiedBy:'',occupiedUntil:0});
 def('armchair','靠背椅','furniture','',1,1,'木与布',6,false,true,['sit','move','rotate','clean','pack'],{occupiedBy:'',occupiedUntil:0});
 def('sofa','双人沙发','furniture','',2,1,'木与布',18,false,true,['sit','move','rotate','clean','pack'],{occupiedBy:'',occupiedUntil:0});
 def('desk','小方桌','furniture','',1,1,'松木',8,true,true,['clean','move','rotate','pack'],{},{surface:true});
 def('basin','洗手台','appliance','',1,1,'陶瓷',20,true,false,['clean']);
 def('rug','地毯','furniture','',2,2,'棉麻',2,false,true,['clean','move','rotate','pack']);
 const owner='村长',group='hotel',opts={owner,group};
 for(let x=17;x<40;x+=2)for(let z=-19;z<20;z+=2)add(`east-ground-${x}-${z}`,x>=19&&x<=37&&z>=-17&&z<=5?'wood-floor':(z>=13&&z<=15||x>=27&&x<=29&&z>=7?'stone-floor':'grass'),x,z,{...opts,group:x<19||x>37||z>5?'outdoors':group});
 for(let x=1;x<17;x+=2)for(let z=13;z<=15;z+=2){const tile=instances.find(o=>o.x===x&&o.z===z&&o.id.startsWith('ground-'));if(tile)tile.defId='stone-floor';}
 let wi=0;const wall=(x,z)=>add(`hotel-wall-${wi++}`,'wall',x,z,opts);
 for(let x=18.5;x<38;x++){wall(x,-17.5);if(Math.abs(x-28.5)>=1.5)wall(x,5.5);}
 for(let z=-16.5;z<5;z++){wall(18.5,z);wall(37.5,z);}
 add('hotel-entry','door',28.5,5.5,opts);
 const rooms=[
  {id:'room-1',name:'101',x:23,z:-13.5,w:8,d:7,door:{x:27.5,z:-13.5},spot:{x:25.5,z:-12.5}},
  {id:'room-2',name:'102',x:33.5,z:-13.5,w:7,d:7,door:{x:29.5,z:-13.5},spot:{x:31.5,z:-12.5}},
  {id:'room-3',name:'103',x:23,z:-5.5,w:8,d:7,door:{x:27.5,z:-5.5},spot:{x:25.5,z:-4.5}},
  {id:'room-4',name:'104',x:33.5,z:-5.5,w:7,d:7,door:{x:29.5,z:-5.5},spot:{x:31.5,z:-4.5}}
 ];
 for(const x of [27.5,29.5])for(let z=-16.5;z<0;z++){if(Math.abs(z+13.5)>=1.5&&Math.abs(z+5.5)>=1.5)wall(x,z);}
 for(let x=19.5;x<37;x++){if(x<27||x>=30){wall(x,-9.5);wall(x,-1.5);}}
 for(const r of rooms)add(`${r.id}-door`,'door',r.door.x,r.door.z,{...opts,rotation:90});
 for(const [i,x] of [21,35].entries()){
  const r=rooms[i];add(`hotel-bed-${i+1}`,'bed',x,-15.5,{...opts,state:{cleanliness:90}});
  add(`hotel-lamp-${i+1}`,'lamp',x-.5,-14.5,opts);
  add(`hotel-desk-${i+1}`,'desk',x-.5,-11.5,opts);
  add(`hotel-chair-${i+1}`,'armchair',x+1.5,-11.5,opts);
 }
 add('hotel-frontdesk','counter',21.5,.5,opts);
 add('hotel-lobby-table','table',33,2,opts);
 add('hotel-lobby-chair-1','armchair',31.5,2.5,opts);
 add('hotel-lobby-chair-2','armchair',34.5,2.5,opts);
 add('hotel-lobby-lamp','lamp',35.5,.5,opts);
 add('hotel-lobby-pot','pot',36.5,4.5,opts);
 // Shared washroom has a doorway facing the lobby.
 for(let x=19.5;x<25;x++)if(Math.abs(x-21.5)>=1.5)wall(x,2.5);
 for(let z=3.5;z<5;z++)wall(24.5,z);
 add('hotel-washroom-door','door',21.5,2.5,opts);add('hotel-washbasin','basin',19.5,4.5,opts);
 add('shop-counter','counter',-4.5,2.5,{owner:'周叔',group:'shop'});
 add('clinic-counter','counter',13.5,10.5,{owner:'苏晴',group:'clinic'});
 return {bounds:{x:28,z:-6,w:20,d:24},frontdesk:{x:23.5,z:.5},lobby:{x:28.5,z:2.5},rooms,entry:{x:28.5,z:6.5},visitorEntry:{x:.5,z:16.5}};
}
