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
