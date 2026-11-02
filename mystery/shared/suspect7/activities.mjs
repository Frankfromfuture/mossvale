// Offsets are relative to the visible room. Furniture and actors use the same anchors.
const station=(name,x,z,spots,gestures,actions)=>({name,at:{x,z},spots:spots.map(([x,z])=>({x,z})),gestures,actions});
export function villaStations(room){
 const local=room.id==='lounge'?{
  tea:station('茶水台',5.5,-5,[[4,-4.9],[5.8,-3.7]],['sip','adjust'],['端起杯子，吹了吹热水','把另一只杯子推到对方手边']),
  reading:station('书刊桌',-5,-5,[[-6.6,-4.6],[-4.8,-3.7]],['write','glance'],['翻开桌上的杂志','俯身看了看摊开的那一页']),
  chess:station('棋盘桌',-5.5,3.5,[[-7,3.5],[-4,3.5]],['adjust','glance'],['捏起一枚棋子，在指间转了转','低头看着棋盘，挪开手边的杯垫']),
  plants:station('窗边盆栽',6.5,3.8,[[5.2,3.8],[6.5,2.5]],['tend','glance'],['扶起垂下来的叶子','把接水的小碟摆正'])
 }:{
  reading:station('书写台',-5,-2,[[-6.3,-2],[-5,-.4]],['write','glance'],['在空白便签上试了试笔','把散开的空白纸叠在一起']),
  tea:station('饮水台',6.4,-3.6,[[4.8,-3.6],[5.3,-2.4]],['sip','adjust'],['拿起杯子喝了一口水','把杯子摆回托盘']),
  board:station('便笺板',-5.8,-4.9,[[-7.3,-4],[-4.8,-4]],['adjust','glance'],['把翘起来的空白便笺按平','扶了一下旁边的笔筒']),
  sorting:station('资料托盘',-5,-2,[[-6.3,-2],[-5,-.4]],['adjust','write'],['把空文件夹按大小叠好','在空白页上划了两道，试试笔尖'])
 };
 return Object.fromEntries(Object.entries(local).map(([id,s])=>[id,{...s,at:{x:room.x+s.at.x,z:room.z+s.at.z},spots:s.spots.map(p=>({x:room.x+p.x,z:room.z+p.z}))}]));
}
