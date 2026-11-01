// Spatial adaptation. Kept on the server: undiscovered rooms and doors never
// enter a browser bundle or a pre-discovery projection. IDs retain v0.11 saves.
const room=(id,name,x,z,w,d,chapter,decor,extra={})=>({id,name,x,z,w,d,chapter,decor,...extra});
export const roomDefs=[
 room('dining','餐厅',0,6,20,16,1,'table'),
 room('lounge','客厅',0,-9,20,14,1,'sofa'),
 room('landing','前厅',0,16,20,4,1,'foyer'),
 room('garden','内庭',0,25,28,14,1,'garden',{outdoor:true}),
 room('landing2','西侧庭廊',-13,-2,6,40,1,'corridor',{outdoor:true}),
 room('landing3','东侧长廊',13,-4,6,40,1,'corridor'),
 room('kitchen','厨房',-21,13,10,10,1,'kitchen'),
 room('rest','休息室',22,12,12,8,1,'sofa'),
 room('activity','活动室',-24,2,16,12,2,'toys'),
 room('bedroom-a','卧室 A',-20,-8,8,8,2,'bed'),
 room('bedroom-b','卧室 B',-22,-16,12,8,2,'bed'),
 room('storage','仓库',-23,-24,14,8,2,'shelves'),
 room('chapel','教堂',22,-11,12,10,2,'chapel'),
 room('study','书房',22,-2,12,8,4,'study'),
 room('washroom','洗手间',22,5,12,6,4,'washroom'),
 room('attic','后侧储藏室',22,-20,12,8,4,'attic'),
 room('garage','车库',0,-20,20,8,4,'garage'),
 room('pool','暖室与温泉',0,-28,20,8,4,'pool'),
 room('secret','柜后密室',22,-28,12,8,4,'control',{requires:'unlocked'}),
 room('passage-room','检修通道',13,-28,6,4,4,'passage',{requires:'passage-seen'}),
 room('meeting','临时案情室',-24,2,16,12,5,'meeting')
];
const door=(a,b,axis,x,z)=>({a,b,axis,x,z,width:2.8});
const doors=[
 door('landing','dining','x',0,14),door('dining','lounge','x',0,-2),door('landing','garden','x',0,18),
 door('landing','landing2','z',-10,16),door('landing','landing3','z',10,15),
 door('dining','landing2','z',-10,6),door('lounge','landing2','z',-10,-9),
 ...[['kitchen',13],['activity',2],['bedroom-a',-8],['bedroom-b',-16],['storage',-21],['meeting',2]].map(([id,z])=>door(id,'landing2','z',-16,z)),
 ...[['rest',12],['washroom',5],['study',-2],['chapel',-11],['attic',-20]].map(([id,z])=>door(id,'landing3','z',16,z)),
 door('garage','landing2','z',-10,-20),door('garage','pool','x',0,-24),
 door('attic','secret','x',22,-24),door('secret','passage-room','z',16,-28),door('pool','passage-room','z',10,-28)
];
export const currentRoom=(s,id=s.room)=>s.chapterId>=5&&id==='activity'?'meeting':id;
export function visibleRooms(s){return roomDefs.filter(r=>r.chapter<=s.chapterId&&(r.id!=='activity'||s.chapterId<5)&&(!r.requires||(r.requires==='passage-seen'?s.found.includes('passage'):s.flags[r.requires]))).map(r=>({...r,walkable:r.id!=='passage-room'||s.chapterId>=5}));}
export function spatialView(s){
 const rooms=visibleRooms(s).map(({requires,chapter,...r})=>r),ids=new Set(rooms.map(r=>r.id));
 return {rooms,doors:doors.filter(d=>ids.has(d.a)&&ids.has(d.b)).map(d=>({...d,open:rooms.find(r=>r.id===d.a).walkable&&rooms.find(r=>r.id===d.b).walkable})),layoutVersion:3,exteriors:exteriors(s,ids)};
}
function exteriors(s,known){
 // Ordinary unvisited wings have roofs. The back block is a single exterior
 // silhouette: no hidden door, room name or internal division is projected.
 const ordinary=roomDefs.filter(r=>!r.requires&&!['meeting','attic'].includes(r.id)&&r.chapter>s.chapterId).map(r=>({id:'roof-'+r.id,x:r.x,z:r.z,w:r.w,d:r.d}));
 if(!s.flags.unlocked)ordinary.push({id:'rear-roof',x:22,z:known.has('attic')?-28:-24,w:12,d:known.has('attic')?8:16});
 return ordinary;
}
export const evidenceRoom=(s,e)=>currentRoom(s,e.room);
// Locations are world metres, chosen for the actual furniture and doorways.
const placements={
 exit:[0,31.5],phone:[1.1,6],kitchen:[-24,10.5],stairs:[4,17.9],
 toys:[-24,1],lighter:[-3,-8],carpet:[22,-12],injury:[24,-19],cane:[26,-1],
 body:[-3,-18],temperature:[8,-30.5],'pool-items':[-7,-29],outlet:[7,-26],
 'garage-gate':[8,-18],'spare-ball':[-25,-22],toolbox:[26,-22],key:[-6,-22],
 measure:[18,-4],photo:[22,-5],paternity:[25,-5],keypad:[24,-23],
 console:[19,-30],relay:[19,-26],camera:[22,-30],paint:[26,-30],pump:[26,-26],
 monitor:[25,-28],autodial:[19,-28],wine:[22,-26],passage:[17,-28]
};
export function propPosition(e,index=0){const p=placements[e.id];if(p)return {x:p[0],z:p[1],onTable:e.id==='phone'};
 return {x:-25.2+(index%3)*1.2,z:-1.6+Math.floor(index/3)*1.4,onTable:true};}
