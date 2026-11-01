// Spatial adaptation. Kept on the server: undiscovered rooms and doors never
// enter a browser bundle or a pre-discovery projection. IDs retain v0.11 saves.
const room=(id,name,x,z,w,d,chapter,decor,extra={})=>({id,name,x,z,w,d,chapter,decor,...extra});
export const roomDefs=[
 room('dining','餐厅',0,8,14,12,1,'table'),
 room('lounge','客厅',0,-7,14,18,1,'sofa'),
 room('landing','前厅',0,15,14,2,1,'foyer'),
 room('landing2','西侧长廊',-10,-4,6,40,1,'corridor'),
 room('landing3','东侧长廊',10,-4,6,40,1,'corridor'),
 room('kitchen','厨房',-18,12,10,8,1,'kitchen'),
 room('rest','休息室',19,12,12,8,1,'sofa'),
 room('activity','活动室',-18,4,10,8,2,'toys'),
 room('bedroom-a','卧室 A',-18,-4,10,8,2,'bed'),
 room('bedroom-b','卧室 B',-18,-12,10,8,2,'bed'),
 room('storage','仓库',-18,-20,10,8,2,'shelves'),
 room('chapel','教堂',19,-11,12,10,2,'chapel'),
 room('study','书房',19,-2,12,8,4,'study'),
 room('washroom','洗手间',19,5,12,6,4,'washroom'),
 room('attic','后侧储藏室',19,-20,12,8,4,'attic'),
 room('garage','车库',0,-20,14,8,4,'garage'),
 room('pool','暖室与温泉',0,-28,14,8,4,'pool'),
 room('secret','柜后密室',19,-28,12,8,4,'control',{requires:'unlocked'}),
 room('passage-room','检修通道',10,-28,6,4,4,'passage',{requires:'passage-seen'}),
 // Police reuse the activity room, two days later; it is not a second building.
 room('meeting','临时案情室',-18,4,10,8,5,'meeting')
];
const door=(a,b,axis,x,z)=>({a,b,axis,x,z,width:2.4});
const doors=[
 door('landing','dining','x',0,14),door('dining','lounge','x',0,2),
 door('landing','landing2','z',-7,15),door('landing','landing3','z',7,15),
 door('dining','landing2','z',-7,8),door('lounge','landing2','z',-7,-7),
 ...[['kitchen',12],['activity',4],['bedroom-a',-4],['bedroom-b',-12],['storage',-20],['meeting',4]].map(([id,z])=>door(id,'landing2','z',-13,z)),
 ...[['rest',12],['washroom',5],['study',-2],['chapel',-11],['attic',-20]].map(([id,z])=>door(id,'landing3','z',13,z)),
 door('garage','landing2','z',-7,-20),door('garage','pool','x',0,-24),
 door('attic','secret','x',19,-24),door('secret','passage-room','z',13,-28),door('pool','passage-room','z',7,-28)
];
export const currentRoom=(s,id=s.room)=>s.chapterId>=5&&id==='activity'?'meeting':id;
export function visibleRooms(s){return roomDefs.filter(r=>r.chapter<=s.chapterId&&(r.id!=='activity'||s.chapterId<5)&&(!r.requires||(r.requires==='passage-seen'?s.found.includes('passage'):s.flags[r.requires]))).map(r=>({...r,walkable:r.id!=='passage-room'||s.chapterId>=5}));}
export function spatialView(s){
 const rooms=visibleRooms(s).map(({requires,chapter,...r})=>r),ids=new Set(rooms.map(r=>r.id));
 return {rooms,doors:doors.filter(d=>ids.has(d.a)&&ids.has(d.b)).map(d=>({...d,open:rooms.find(r=>r.id===d.a).walkable&&rooms.find(r=>r.id===d.b).walkable})),layoutVersion:2};
}
export const evidenceRoom=(s,e)=>currentRoom(s,e.room);
// Locations are world metres, chosen for the actual furniture and doorways.
const placements={
 exit:[0,15.9],phone:[1.1,8],kitchen:[-21,10.5],stairs:[4,15.9],
 toys:[-18,3],lighter:[-3,-6],carpet:[19,-12],injury:[21,-19],cane:[23,-1],
 body:[-3,-18],temperature:[5,-30.5],'pool-items':[-5,-29],outlet:[4,-26],
 'garage-gate':[5,-18],'spare-ball':[-20,-18],toolbox:[23,-22],key:[-4,-22],
 measure:[15,-4],photo:[19,-5],paternity:[22,-5],keypad:[21,-23],
 console:[16,-30],relay:[16,-26],camera:[19,-30],paint:[23,-30],pump:[23,-26],
 monitor:[22,-28],autodial:[16,-28],wine:[19,-26],passage:[14,-28]
};
export function propPosition(e,index=0){const p=placements[e.id];if(p)return {x:p[0],z:p[1],onTable:e.id==='phone'};
 return {x:-20.7+(index%4)*1.8,z:1.9+Math.floor(index/4)*.7,onTable:true};}
