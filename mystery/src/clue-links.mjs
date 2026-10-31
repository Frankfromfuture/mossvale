// Aliases identify objects, never reveal their contents. Only acquired cards
// supplied by the current session participate in matching.
const aliases={
 silk:['丝帛'],pin:['发簪','毒簪'],pendant:['挂坠'],crest:['菊纹内衬'],
 'old-news':['旧报纸'],body:['铜炉','遗骸'],key:['钥匙'],
 'garden-blood':['炉旁血迹'],flowers:['风信花','花根'],roots:['根茎'],
 footprints:['脚印'],water:['清水'],cloth:['抹布'],
 chronicle:['神社旧册'], 'poison-book':['花草游记'], 'long-hair':['长发'],
 'jade-shrine':['玉珏','白色玉珏'], 'jade-kato':['玉珏','白色玉珏'], 'jade-map':['玉珏'],
 'family-dolls':['小人偶'],knife:['短刃','短刀'], 'missing-robe':['祭服'],
 recipe:['配方'],novel:['手稿'],ring:['戒指'],comb:['木梳'],
 'medicine-bottle':['药瓶'],cosmetics:['化妆品'],guide:['神社攻略'],
 contracts:['收购合同'], 'wood-token':['木牌'],cup:['带土粒的杯子'],
 'book-emi':['床头的小说'],medicine:['药包'], 'potted-flower':['盆花'],mask:['面具'],
 'candle-player':['蜡烛'],'six-candles':['蜡烛'],'candle-miyazaki':['蜡烛'],
 'candle-ishikawa':['蜡烛'],'candle-kato':['蜡烛'],'candle-jiang':['蜡烛']
};
export const clueTerms=clue=>[clue.title,...(aliases[clue.id]||[])];
// Vocabulary only: the descriptions and hidden contents stay on the server.
export const objectTerms=[...new Set(Object.values(aliases).flat().concat([
 '行囊','烛台','丝帛','纸条','衣物内衬','菊纹','十六瓣六重菊纹','血迹','灰烬','花土','风信花根','花汁','白离花','风信花',
 '菜地','扫帚','旧册','夹页','供物','供台','供桌','人偶','木偶','长发人偶','华服人偶','骨片','遗骨','油泥','凡士林',
 '刀架','衣柜','书桌','秘册','首饰盒','蛇形戒指','床边小瓶','梳妆包','火盆','炭火','公文袋','合同','匣子','茶杯','杯子',
 '罗刹木牌','罗刹纹样','樱花图样','毒针','毒茶','茶水','人皮','烛火','石板','水钵','茶具','药草','毒物','蜡烛','小说','匕首'
]))];
