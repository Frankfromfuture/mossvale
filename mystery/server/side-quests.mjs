import {playerId} from '../shared/player.mjs';
import {clueById} from './scenario.mjs';

// Author-only task conditions and conclusions. Project only the current lead.
const has=(s,...ids)=>ids.every(id=>s.found.includes(id));
const shown=(s,actor,...ids)=>ids.every(id=>(s.presented[actor]||[]).includes(id)||(s.investigation?.statements||[]).some(line=>line.kind==='evidence'&&line.audience.includes(actor)&&line.text.startsWith(`出示「${clueById(id).title}」：`)));
const quests={
 player:{title:'旅人带来的旧事',description:'听清白川的遭遇，留下真野与玉珏的线索。',steps:[['查看真野的纸条，并请黑泽说明旧案。',s=>has(s,'asano','kato-statement')],['向白川出示发簪或烛台，核对偏殿经过。',s=>has(s,'player-statement')],['找到两块玉珏，与丝帛拼合。',s=>has(s,'jade-map')]],summary:'白川确认了偏殿中的袭击，并收好真野的供述和玉珏线索，准备继续寻找家人。',speech:'偏殿里我用簪子自卫，后来在大殿失去了意识。真野的事我要继续查，这两块玉也总算有了线索。'},
 miyazaki:{title:'记忆中的一家人',description:'核对宫司记得的家事，查清神社旧闻中的疑点。',steps:[
  ['看看宫司保存的家人物件。',s=>has(s,'family-dolls')],
  ['请黑泽绫回忆童年，再对照神社旧册、夹页与人偶中的骨片。',s=>has(s,'emi-memory','chronicle','doll-craft','bones')],
  ['向宫司出示「黑泽绫：一家四口」和「人形师的旧闻」。',s=>shown(s,'miyazaki','emi-memory','doll-craft')]
 ],summary:'人偶、旧册与黑泽绫的回忆终于对上。宫司承认“桐原家的亲生儿子”这段记忆经不起核对。旧册、骨片与制偶记载指向另一种身世，他愿意继续查清。他仍想照应黑泽绫，但不再替她决定去留。',speech:'我一直记得自己是家里的儿子，可这些东西对不上。我会把旧册留下，查清自己到底从哪里来。黑泽绫往后怎么走，该由她自己决定。'},
 jiang:{title:'找回缺失的过去',description:'帮森川介辨认熟悉的物件，把能确认的记忆留下。',steps:[
  ['找到与森川介有关的旧物，拿给他辨认。',s=>has(s,'memory-token')],
  ['请森川介辨认蛇形戒指。',s=>has(s,'memory-ring')],
  ['按配方做出面具，请他辨认这门手艺。',s=>has(s,'memory-pool')]
 ],summary:'木牌、戒指与面具接起了森川介的几段记忆。他确认了代号“池”和自己与“隐”的联系，同意把记得的经过留下；他也承认曾传递针对桐原家的灭口线索，愿意留下供述；记忆中的空白，仍需逐一查证。',speech:'木牌、戒指，还有这张面具，我都认出来了。我以前叫“池”。我传过针对桐原家的灭口线索，这件事我得交代。剩下的我慢慢想，想不起的地方先留着空。'},
 ishikawa:{title:'未说完的那一夜',description:'核对雾岛的身份与行踪，让他的说法经得起物证对照。',steps:[
  ['核实雾岛的身份。',s=>has(s,'revealed')],
  ['向雾岛出示戒指和空药瓶，听他说明昨夜的经过。',s=>has(s,'ishikawa-statement')],
  ['补齐案件证据，回厅堂完成最终推断。',s=>!!s.ending]
 ],summary:'雾岛不再用作家的身份避开追问。他对毒针、伪装和服药经过作出的交代，与物证一起留在手记中。说出经过并不替他免去责任，旧案仍需继续追查。',speech:'戒指是我用的，面具也是我戴的。你把这些记下吧。我不能再借另一个名字，把那一夜推给别人。'},
 kato:{title:'未清的旧账',description:'核对黑泽的收购往来，把事故和旧案中的疑点逐一记下。',steps:[
  ['查看黑泽保存的合同与事故剪报。',s=>has(s,'contracts')],
  ['对照真野的线索、青岚大火的旧报纸与已经核实的身份。',s=>has(s,'asano','old-news','revealed')],
  ['向黑泽出示合同、旧报与真野的线索，追问他的旧案供述。',s=>has(s,'kato-statement')&&shown(s,'kato','contracts','old-news','asano')]
 ],summary:'黑泽承认桐原家的命案、纵火与取玉，也交代了杀害真野的经过。他曾带走黑泽绫，并长期隐瞒她家人的遭遇；供述已记录下来。合同中的其他事故仍需逐案查证。',speech:'桐原家的事是我做的，真野也是我杀的。我拿走玉，又一直瞒着黑泽绫。供述你记下吧，合同里其他的事也可以接着问。'},
 emi:{title:'由她决定的去路',description:'听清黑泽绫对家人和昨夜的记忆，让她在知道真相后决定去留。',steps:[
  ['把宫司保存的小人偶拿给黑泽绫，听她回忆家人。',s=>has(s,'emi-memory')],
  ['核实两人的身份，再用茶杯和根茎核对黑泽绫的经历。',s=>has(s,'revealed','emi-statement')],
  ['完成最终推断，向她说清昨夜发生的事。',s=>!!s.ending]
 ],summary:'黑泽绫听完了家事与昨夜案件的解释，决定离开黑泽，也不接受弟弟替她安排去处。她会继续追问家人的遭遇，今后的生活由她自己安排。',speech:'我会自己离开，两个人我都不跟。家人的事，我还要继续问清楚。以后去哪里、和谁一起生活，我想自己做决定。'}
};
const definition=actor=>Object.hasOwn(quests,actor)?quests[actor]:null;
const fail=message=>{const error=new Error(message);error.status=409;throw error;};

export function sideQuestView(s,actor){
 const quest=definition(actor);if(!quest||actor===playerId(s))return null;
 const result=s.sideQuests?.completed?.[actor]||null,done=quest.steps.map(([,check])=>check(s));
 const ready=done.every(Boolean),first=done.findIndex(v=>!v),status=result?'done':ready?'ready':'investigating';
 return {actor,title:quest.title,description:quest.description,status,completed:done.filter(Boolean).length,total:done.length,
  steps:quest.steps.map(([text],i)=>({text:ready||i<=first?text:'继续调查后解锁',done:done[i],hidden:!ready&&i>first})),
  next:result?'这条支线已经记入手记。':ready?'线索已齐，可以找本人把这条支线说清楚。':quest.steps[first][0],
  result:result?{summary:result.summary,speech:result.speech}:null};
}

export function finishSideQuest(s,actor){
 const quest=definition(actor);if(!quest)fail('没有这条人物支线。');
 const existing=s.sideQuests?.completed?.[actor];if(existing)return {result:existing,cached:true};
 if(!s.started)fail('先开始调查，再整理人物支线。');
 if(s.positions[actor]!==s.room)fail('先到对方身边，再把这条支线说清楚。');
 if(!quest.steps.every(([,check])=>check(s)))fail('这条支线还缺依据，先按札记中的提示继续调查。');
 const result={title:quest.title,summary:quest.summary,speech:quest.speech,step:s.step};
 s.sideQuests||={version:1,completed:{}};s.sideQuests.completed[actor]=result;
 return {result,cached:false};
}
