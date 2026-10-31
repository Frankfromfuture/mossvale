import {objectTerms,clueTerms} from './clue-links.mjs';
import {placeName} from './location-map.mjs';

// These are neutral definitions, not the author's case solution. Case details
// below come exclusively from the current player's projected state.
const vocabulary=[
 ['百物语','事件',['百物语聚会','百物语游戏'],'轮流讲怪谈、熄灭蜡烛的聚会。'],
 ['青岚大火','事件',['青岚县大火','青岚火灾','桐原家大火'],''],
 ['真野之死','事件',['真野的死','真野遇害'],''],
 ['偏殿交手','事件',['偏殿里的交手','偏殿遇袭','昨夜的袭击'],''],
 ['人偶异象','事件',['人偶化人','木偶化人','人偶移位'],''],
 ['移尸','事件',['搬运尸体','搬动尸体'],'指将遗体从原处移往别处。'],
 ['焚烧','事件',['焚尸','放火灭迹'],''],
 ['下毒','事件',['投毒','花根下毒','毒簪自卫'],''],
 ['神隐','名词',[],'故事中对离奇失踪的称呼。'],
 ['灯守神社','地点',['神社'],'本次故事发生的神社。'],
 ['雾岭山','地点',[],'故事中的山名。'],
 ['雾镜湖','地点',[],'故事中的湖名。'],
 ['青岚县','地点',['青岚'],'故事中的地名。'],
 ['西客舍','地点',[],'神社西侧的客舍。'],
 ['东客舍','地点',[],'神社东侧的客舍。'],
 ['偏殿','地点',[],'神社主殿旁的殿堂。'],
 ['膳所','地点',[],'神社准备饭食、处理杂务的地方。'],
 ['宫司','名词',[],'主持神社事务的人。'],
 ['典仕','名词',[],'在神社协助处理日常事务的人。'],
 ['人形师','名词',[],'制作人偶的匠人。'],
 ['药神','名词',[],'故事中神社供奉的神明。'],
 ['罗刹','名词',[],'出现在故事中的名称，具体含义需结合当前记录。'],
 ['怨灵','名词',['恶灵'],'怪谈中对带有怨念的灵体的称呼。'],
 ['桐原家','名词',['桐原一家','桐原家人'],''],
 ['孪生兄弟','名词',['双胞胎','孪生弟弟'],'同一次妊娠出生的兄弟。'],
 ['古画展','事件',[],''],
 ['人口失踪','事件',['失踪案'],''],
 ['失忆','事件',['记忆恢复','恢复记忆'],''],
 ['旧案','事件',['青岚旧案','灭门案','家族旧祸'],''],
 ['收购案','事件',['收购事故','企业收购'],''],
 ['皇室','名词',['皇族'],''],
 ['代号“池”','名词',['代号「池」','代号池'],''],
 ['玉珏','物件',['白色玉珏'],'环形而有缺口的玉器。'],
 ['祭服','物件',[],'举行祭祀仪式时穿着的服装。'],
 ['面具','物件',[],'遮住面部或改变面部外观的物件。']
];
export function referenceEntries(state){
 const map=new Map(objectTerms.map(term=>[term,{id:term,title:term,kind:'物件',terms:[term],text:''}]));
 for(const [title,kind,aliases,text]of vocabulary)map.set(title,{id:title,title,kind,terms:[title,...aliases],text});
 for(const room of state?.rooms||[])if(!room.reserved){
  const title=placeName(room),terms=[title,room.name];
  if(room.id==='old')terms.push('空屋');
  map.set('room:'+room.id,{id:'room:'+room.id,title,kind:'地点',terms:[...new Set(terms)],text:room.description});
 }
 for(const spot of state?.spots||[])if(spot.name.length>1&&!['记忆'].includes(spot.name)&&!map.has(spot.name))map.set(spot.name,{id:spot.name,title:spot.name,kind:'物件',terms:[spot.name],text:''});
 return [...map.values()];
}
export function referenceEvidence(entry,state){
 const contains=text=>entry.terms.some(term=>String(text||'').includes(term));
 return {
  clues:(state?.clues||[]).filter(clue=>clueTerms(clue).some(contains)||contains(clue.text)),
  events:(state?.events||[]).filter(event=>contains(event.text)).slice(-8)
 };
}
