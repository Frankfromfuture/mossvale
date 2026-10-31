import {playerId} from '../shared/player.mjs';
import {roleEpilogue} from './roles.mjs';
import {clueById,endingText} from './scenario.mjs';

const requirements=[
 ['body','查看铜炉中的遗骸。'],['revealed','用面具样片和森川介的回忆，当面核实雾岛的身份。'],
 ['memory-ring','把蛇形戒指给森川介辨认。'],['poison-book','查阅旧书库中关于毒物的记载。'],
 ['cloth','找到清扫现场留下的抹布。'],['miyazaki-statement','向宫司出示遗骸、短刃、抹布和失踪祭服的线索，核对空屋经过。'],
 ['ishikawa-statement','核实身份后，向雾岛出示戒指和空药瓶，问清替身与夜间行踪。'],
 ['emi-statement','向黑泽绫出示茶杯和丢弃的根茎，问清下茶与回房的先后。'],
 ['cold-brazier','查看黑泽房里的火盆，核对黑泽绫所说的寒冷。'],['chronicle','对照前任宫司记录的神社异象。']
];
export function caseProgress(s){const missing=requirements.filter(([id])=>!s.found.includes(id));return {ready:!missing.length,missing:missing.map(([,text])=>text)};}
export function witnessedEvidence(s,actor){
 const seen=new Set(s.presented[actor]||[]);
 for(const entry of s.investigation?.statements||[])if(entry.kind==='evidence'&&entry.audience.includes(actor)){
  const match=s.found.find(id=>entry.text.startsWith(`出示「${clueById(id).title}」：`));if(match)seen.add(match);
 }
 // These two discoveries are announced to the whole group by the game itself.
 for(const id of ['body','revealed'])if(s.public.includes(id))seen.add(id);
 return seen;
}
export function caseEnding(s,choice){
 const has=(...ids)=>ids.every(id=>s.found.includes(id));
 const parts=[endingText,
 '雾岛说自己曾确认哥哥已经没有呼吸；宫司承认没有检查生死便动了刀。戒指机关、清扫痕迹和两人的交代，构成这次判断的依据，血色本身不能单独证明中毒。',
 '黑泽的遗体已经焚毁，今晨众人却仍能与他交谈。结合前任宫司记录的异象、黑泽绫房中的寒冷，以及毒茶没有奏效的经过，你们将眼前的黑泽解释为尚未意识到自己死亡的亡魂。这个解释适用于此夜的怪谈，不能代替其他案件的证据。',
 playerId(s)==='player'&&choice==='reveal'?'你也说出偏殿的遭遇：雾岛拦住你时，你用毒簪刺中了他。他承认服过解毒药；你的这一刺并不是铜炉遗骸的死因。':'雾岛另行交代，移尸未果后又受了伤，回自己客房服过药。空药瓶解释了他为何活着，也把这次受伤与哥哥在空屋中的死亡分开。'];
 if(has('family-dolls','emi-memory','chronicle','doll-craft','bones'))parts.push('黑泽绫记得家里只有两个女儿，人偶中的混杂遗骨与旧册、制偶记载相互印证：宫司很可能就是桐原家造出、误以为自己是家中儿子的人偶。这是几条线索共同指向的身世解释，不是仅凭家族图样作出的认亲。');
 if(has('memory-pool'))parts.push('森川介记起自己曾以“池”为代号替“隐”办事。他的旧任务与桐原家有关，记忆仍有断处；记起过去，也意味着要继续说明自己做过什么。');
 if(has('kato-statement'))parts.push('黑泽已经承认桐原旧案与真野之死中的行为。你把供述与合同、旧报一同留下，后续仍要追查组织和其他涉案者。');
 else parts.push('真野之死与桐原旧案还有待追问。今夜案件的结论，不能自动替那两桩旧事结案。');
 parts.push('白川与森川介都曾昏迷，又在客房醒来。谁送他们回房，现有证词没有回答；这处空白留在手记里。');
 const jade=has('jade-map')?'两块玉珏已与丝帛核对相合，秘宝的位置和后续归属仍待追查。':has('jade-shrine','jade-kato')?'两块玉珏已经找到，还要与丝帛仔细核对。':'玉珏尚未找齐，寻玉与寻亲仍要继续。';
 const emi=s.sideQuests?.completed?.emi?'黑泽绫已经决定独自离开，接下来由她安排自己的生活。':'黑泽绫已经知道两兄弟的身份。她最后怎样选择，留待你与她当面说清。';
 return {title:'雾散之前',text:parts.join('\n'),choice,epilogue:roleEpilogue(s,choice)+jade+(playerId(s)==='emi'?'':emi),adaptation:'单人版依据已取得的物证和证词收束；尚未确认的旧案与昏迷经过保留待查。'};
}
