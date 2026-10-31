import {playerId} from '../shared/player.mjs';
import {clueById} from './scenario.mjs';
import {sideQuestView} from './side-quests.mjs';

const biographies={
 player:'独自上山借宿的旅人白川澄。她很留意众人的行踪，说起自己的来意却很谨慎。',
 miyazaki:'灯守神社的宫司，待客周到，说话总留着分寸。神社的日常事务由他照应，森川介也受过他的照顾。',
 jiang:'在神社帮忙的典仕，负责打扫和做饭。他说话直爽，对从前的经历却常常记不清。',
 ishikawa:'以采风为由来访的作家，举止温和，昨晚提议大家讲百物语。问到私事时，他的回答格外谨慎。',
 kato:'与妻子一同来到神社的商人，衣着体面，谈吐自信。今早照常走进厅堂，似乎不明白旁人为何惊慌。',
 emi:'黑泽修的妻子，说话轻，却并不含糊。今早她脸色不好，时不时把衣襟拢紧。'
};
const links={
 player:['silk','pin','your-night','old-news','asano','crest','jade-map'],
 miyazaki:['family-dolls','knife','missing-robe','candle-miyazaki','scar-miyazaki','cloth','emi-memory','miyazaki-statement'],
 jiang:['medicine','jiang-token','potted-flower','candle-jiang','memory-token','memory-ring','memory-pool'],
 ishikawa:['recipe','novel','ring','comb','medicine-bottle','cosmetics','warm-brazier','guide','candle-ishikawa','revealed','ishikawa-statement'],
 kato:['asano','contracts','jade-kato','wood-token','cup','cold-brazier','candle-kato','revealed','kato-statement'],
 emi:['comb','book-emi','cold-brazier','cup','flowers','roots','emi-memory','emi-statement']
};
function nextQuestion(s,id){
 const has=key=>s.found.includes(key),talked=!!s.chats[id]?.length;
 if(s.ending)return '案件已经说清。还有放不下的事，可以再和对方谈谈。';
 if(id==='player')return has('body')?'把昨夜亲眼看见的事，和新找到的线索对照。':'昨夜花园里有火光，先去看看铜炉。';
 const questions={
  miyazaki:has('miyazaki-statement')?'他说刺伤后又焚烧了身体。血色异常意味着什么？':has('knife')?'短刃上的痕迹从哪里来？可以拿给宫司看。':has('family-dolls')?'五个人偶各是谁？听听宫司怎么说。':'昨夜百物语结束后，宫司去了哪里？',
  jiang:has('memory-pool')?'把他对易容的回忆，与眼前的人对照。':has('ring')?'森川介会不会认得那枚蛇形戒指？':has('wood-token')?'木牌上的图样，也许能让他想起什么。':'昨夜有没有看见人经过？哪些事他还记得？',
  ishikawa:has('ishikawa-statement')?'把他的自述与戒指、空药瓶的时间对照。':has('revealed')?'身份已经核实，再问昨夜各自的行踪。':has('comb')?'黑泽绫的木梳为什么在他的房里？':has('recipe')?'这份配方与他的写作有什么关系？':'为什么提议讲百物语？昨夜又去了哪里？',
  kato:has('kato-statement')?'他的供述涉及桐原旧案和真野之死，还有哪些事需要查证？':has('revealed')?'把合同、旧报与真野的名字一并拿给他，问清过去。':has('contracts')?'合同附着的事故剪报，需要他解释。':has('cup')?'杯里的土粒从哪里来？他昨夜喝过什么？':'他怎样度过昨夜？为什么对今早的惊慌毫不知情？',
  emi:has('emi-statement')?'把茶水、花根与她记得的经过对照。':has('emi-memory')?'她的家庭回忆与宫司的说法，哪里对不上？':has('comb')?'先问问木梳，她是否知道它放在哪里？':has('cup')?'她记得昨夜房里的茶水是谁准备的吗？':'她为什么一直觉得冷？昨夜房里发生过什么？'
 };
 return !talked?'还没单独问过。'+questions[id]:questions[id];
}
export function personDossier(s,person){
 const id=person.id,history=s.chats[id]||[];
 return {
  biography:id==='ishikawa'&&s.found.includes('revealed')?'他最初以作家雾岛律的身份来访。摘下面具后，他承认自己是黑泽修的孪生弟弟，曾与哥哥共用身份。':biographies[id],
  related:s.found.filter(key=>links[id]?.includes(key)).map(key=>{const c=clueById(key);return {id:key,title:c.title,kind:c.kind};}),
  conversations:history.filter(line=>line.who===id).length,
  lastWords:history.filter(line=>line.who===id).at(-1)?.text||null,
  shown:(s.presented[id]||[]).filter(key=>s.found.includes(key)).length,
  roomStatus:id===playerId(s)?'自己的客房':s.permissions.includes(person.room)?'已同意搜查客房':s.found.includes('body')?'可以当面商量搜查':'尚未商量搜查',
  sideQuest:sideQuestView(s,id),
  question:nextQuestion(s,id)
 };
}

// These exchanges add everyday behavior, not evidence or private confessions.
const exchanges=[
 {id:'leaves',station:'plants',room:'hall',pair:['emi','jiang'],activity:'照看盆栽',lines:[['emi','这片新叶子还卷着。'],['jiang','轻些碰，过两天自己就舒展开了。']]},
 {id:'visitor-tea',station:'tea',room:'hall',pair:['player','emi'],activity:'茶台小歇',lines:[['player','站起来喝口茶吧。'],['emi','好，手里捧点暖的也舒服。']]},
 {id:'visitor-reading',station:'reading',room:'hall',pair:['player','ishikawa'],activity:'桌边翻书',lines:[['player','这本书摊在这里，倒适合随手翻翻。'],['ishikawa','我看看，别把页角折了。']]} ,
 {id:'tea',station:'tea',room:'hall',pair:['miyazaki','jiang'],place:'left',activity:'添茶',lines:[['miyazaki','森川介，茶还温着吗？'],['jiang','我去添一点。你也坐会儿吧。'],['miyazaki','嗯，别忙得忘了自己。']]},
 {id:'manuscript',station:'reading',room:'hall',pair:['ishikawa','kato'],place:'right',activity:'闲谈',lines:[['kato','雾岛先生，一早就捧着本子？'],['ishikawa','坐着也是坐着，随手记几笔。'],['kato','有空也该看看窗外。']]},
 {id:'warmth',scope:'private',zone:'left',room:'hall',pair:['miyazaki','emi'],place:'north',activity:'照应',lines:[['miyazaki','这边离炉子近一些。'],['emi','谢谢。我坐一会儿就好。'],['miyazaki','有需要就叫我。']]},
 {id:'cups',station:'tea',room:'hall',pair:['miyazaki','jiang'],place:'left',activity:'收拾茶具',lines:[['jiang','这些杯子，我先收起来？'],['miyazaki','留两只吧，也许还有人要用。'],['jiang','好，搁在你手边。']]},
 {id:'quiet',station:'plants',room:'hall',pair:['ishikawa','kato'],place:'right',activity:'闲谈',lines:[['kato','怎么都不说话了。'],['ishikawa','有时安静一点，也好。'],['kato','你们写东西的人，倒沉得住气。']]},
 {id:'reading',station:'reading',room:'hall',pair:['jiang','ishikawa'],place:'right',activity:'翻看手记',lines:[['jiang','这页字写得可真小。'],['ishikawa','只是随手记几句，我自己认得就好。']]},
 {id:'chairs',station:'fire',room:'hall',pair:['kato','miyazaki'],place:'left',activity:'炉边暖手',lines:[['kato','坐久了，还是起来暖暖手。'],['miyazaki','这边还有些余温。']]},
 {id:'shawl',scope:'private',zone:'right',room:'hall',pair:['kato','emi'],place:'north',activity:'低声交谈',lines:[['kato','这里避风，要不要换到这边？'],['emi','我坐一会儿，你先别忙。']]},
 {id:'window',scope:'private',zone:'right',room:'hall',pair:['miyazaki','emi'],place:'north',activity:'轻声交谈',lines:[['emi','宫司，窗边有点凉。'],['miyazaki','那就往里坐一点。'],['emi','好，我自己来。']]}
];
export function availableInteractions(s){
 if(!s.started||s.ending)return [];
 return exchanges.filter(e=>e.room===s.room&&e.pair.every(id=>id!==playerId(s)&&s.positions[id]===s.room)).map(e=>{
  if(s.public.includes('revealed')&&e.pair.includes('ishikawa')){const other=e.pair.find(id=>id!=='ishikawa');return {...e,activity:'停顿',lines:[[other,'先坐一会儿，把话想清楚。'],['ishikawa','嗯，我在听。']]};}
  return e;
 });
}
