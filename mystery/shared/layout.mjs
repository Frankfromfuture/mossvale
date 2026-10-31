export const bounds={minX:-24,maxX:24,minZ:-20,maxZ:20};
export const buildings=[
 {id:'hall',name:'厅堂',x:0,z:-8,w:16,d:18,color:'#e9dbb8'},
 {id:'west',name:'西客舍',x:-16,z:-4,w:12,d:12,color:'#e3e5e4'},
 {id:'east',name:'东客舍',x:16,z:-4,w:12,d:12,color:'#e3e5e4'},
 {id:'service',name:'膳所',x:-16,z:-15,w:8,d:6,color:'#d9c8ab'},
 {id:'shrine',name:'大殿',x:16,z:-15,w:8,d:6,color:'#c4d3d3'},
 {id:'old',name:'旧屋',x:16,z:13,w:8,d:6,color:'#d0c9b7'}
];
export const rooms=[
 {id:'hall',name:'厅堂',building:'hall',x:0,z:-8,w:16,d:18,door:[0,1],description:'炉火还温着。有人去添茶，有人在桌边翻书，窗旁的绿叶轻轻垂下来。'},
 {id:'courtyard',name:'内院',x:0,z:4,w:16,d:6,door:[0,4],description:'宽阔的石板院子连着厅堂和花园，两侧短廊通向客舍。'},
 {id:'garden',name:'花园',x:0,z:11,w:20,d:10,door:[0,6],description:'花叶带着露水，石径绕过水钵，伸向更远的花丛。铜炉里已经没有火光。'},
 {id:'kitchen',name:'厨房',building:'service',x:-17.5,z:-15,w:5,d:6,door:[-16,-12],description:'灶边放着清水，窗外是一小片菜地。'},
 {id:'storage',name:'杂务间',building:'service',x:-13.5,z:-15,w:3,d:6,door:[-16,-12],description:'扫帚靠着墙，角落里有团卷起的布。'},
 {id:'shrine',name:'大殿',building:'shrine',x:16,z:-15,w:8,d:6,door:[16,-12],description:'人偶挤在供台上。最里面的两尊，与旁边的略有不同。'},
 {id:'old',name:'百物语之间',building:'old',x:14,z:13,w:4,d:6,door:[16,10],description:'六支蜡烛熄灭在桌上，地面干净得有些突兀。'},
 {id:'archive',name:'空房',building:'old',x:18,z:13,w:4,d:6,door:[16,10],description:'几本旧册子摞在窗边，纸页已经发脆。'},
 ...['miyazaki','jiang','player','spare1','ishikawa','kato','spare2','spare3'].map((id,i)=>({id,name:['宫司客房','森川介客房','我的客房','西侧空客房','雾岛客房','黑泽夫妇客房','东侧空客房','东侧空客房'][i],building:i<4?'west':'east',x:(i<4?-16:16)+((i%2)?3:-3),z:i%4<2?-7.5:-.5,w:6,d:5,door:[i<4?-10:10,-4],reserved:id.startsWith('spare'),owner:id,description:id==='player'?'行李仍在床边。昨夜的事，你记得比任何人都清楚。':'床铺、书桌与衣柜。窗边留着一把空椅子。'})),
 {id:'reserve',name:'林间空地',x:-16,z:13,w:8,d:6,door:[-12,13],reserved:true,description:'本次调查不使用这片空地。'},
 {id:'gate',name:'山门',x:0,z:17.5,w:4,d:2,door:[0,17.5],description:'下山的路隐入雾中。眼前的事情还没弄清。'}
];
export const getRoom=id=>rooms.find(r=>r.id===id);
export const cast=[
 {id:'player',name:'白川澄',role:'旅人 · 你',portrait:0,color:'#bd9b60',room:'player',seat:[-2.8,-9]},
 {id:'miyazaki',name:'神谷朔',role:'神社宫司',portrait:1,color:'#90a68a',room:'miyazaki',seat:[-4.5,-13]},
 {id:'jiang',name:'森川介',role:'神社典仕',portrait:2,color:'#819cae',room:'jiang',seat:[-4,-8]},
 {id:'ishikawa',name:'雾岛律',role:'作家',portrait:3,color:'#b28e9c',room:'ishikawa',seat:[4.2,-13]},
 {id:'kato',name:'黑泽修',role:'商人',portrait:4,color:'#bfa572',room:'kato',seat:[3.8,-8]},
 {id:'emi',name:'黑泽绫',role:'黑泽的妻子',portrait:5,color:'#cc9c87',room:'kato',seat:[1.2,-14]}
];
export function routeTo(from,to){
 const a=getRoom(from),b=getRoom(to);if(!a||!b)return [];
 if(from===to)return [[b.x,b.z]];
 // The four outer junctions connect all buildings without crossing their walls.
 const nodes={c:[0,-4],w:[-9,-4],e:[9,-4],nw:[-9,-11],ne:[9,-11],sw:[-9,8],se:[9,8],s:[0,8],g:[0,18],ow:[-11,8],oe:[11,8]};
 const links=[['c','w'],['c','e'],['w','nw'],['e','ne'],['w','sw'],['e','se'],['sw','s'],['s','se'],['s','g'],['sw','ow'],['se','oe']];
 const anchor=r=>['west'].includes(r.building)?'w':r.building==='east'?'e':r.building==='service'?'nw':r.building==='shrine'?'ne':r.building==='old'?'oe':r.id==='reserve'?'ow':['garden','gate'].includes(r.id)?'s':r.id==='courtyard'?'s':'c';
 const start=anchor(a),end=anchor(b),queue=[[start]],seen=new Set([start]);let path=[];
 while(queue.length){const p=queue.shift(),last=p.at(-1);if(last===end){path=p;break;}for(const edge of links){const next=edge[0]===last?edge[1]:edge[1]===last?edge[0]:null;if(next&&!seen.has(next)){seen.add(next);queue.push([...p,next]);}}}
 const approach=r=>r.building==='west'||r.building==='east'?[[r.x,-4],r.door]:[r.door];
 const leave=a.id==='hall'?[[-2.8,-9],[-3.4,-9],[-3.4,-5.4],[0,-4.5]]:[[a.x,a.z],...approach(a)];
 const enter=b.id==='hall'?[[0,-4.5],[-3.4,-5.4],[-3.4,-9],[-2.8,-9]]:[...approach(b).reverse(),[b.x,b.z]];
 return [...leave,...path.map(k=>nodes[k]),...enter];
}
