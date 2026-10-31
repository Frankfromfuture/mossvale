import {storyPages as xiaocangPages} from './xiaocang-story.mjs';
import {cast} from '../shared/layout.mjs';
import {playerId,playerPerson} from '../shared/player.mjs';
const secret=(id,title,text,points,cards=[])=>({id,title,text,points,cards});
const goal=(id,title,text,needs,choices)=>({id,title,text,needs,choices});
const choose=(label,result)=>({label,result});
// Private biographies and objectives stay on the server. Only the chosen route is projected.
const roles={
 player:{tag:'追寻旧友与家人',difficulty:'入门',public:'独自上山的旅人。昨夜借宿神社，今晨发现众人的神色都不对。',main:'查清真野之死与昨夜的袭击',
 history:['你带着父亲留下的丝帛寻找两块玉珏，也在寻找失散的家人。挚友真野遇害后，你查到他生前曾接触黑泽，循线来到灯守神社。','昨夜，你从客房出来，看见花园火光。偏殿里，一个像黑泽的男人拦住你，你用淬毒发簪自卫，逃入大殿，却被人偶的长发缠住。醒来时，你已在客房。谁送你回来，你并不知道。','早餐时，黑泽安然走进厅堂。你想查清他与真野的死有何关系，也要认出昨夜的袭击者。对外，你仍是来借宿的旅人。'],
 reason:'你循着真野的线索来到这里，也亲历了昨夜的袭击。众人同意你执笔整理口述，分别核对证据。',initial:['silk','pin','your-night'],
 secrets:[secret('family','家族身份','父亲留下的丝帛、衣物内衬菊纹与家族旧身份。',5,['crest']),secret('jade','寻玉来意','你为寻找玉珏与失散家人而来。',2,['silk','jade-map']),secret('asano','与真野的关系','真野是挚友，你怀疑黑泽与他的死有关。',2,['asano']),secret('night','昨夜夜探','散场后你经过花园、偏殿和大殿。',5,['your-night']),secret('pin','毒簪自卫','你曾用淬毒发簪刺中袭击你的男人。',8,['pin','your-night'])],
 goals:[goal('asano','为真野留下证据','找到纸条、合同与黑泽的供述，再决定怎样保存旧友的线索。',['asano','contracts','kato-statement'],[choose('留下实名记录，继续追查','你把真野的名字和黑泽的供述一并留档，准备沿旧案继续查下去。'),choose('先收好材料，私下查证','你保留纸条与合同，暂不公开自己的关系；真野之死仍要继续查证。')]),goal('jade','玉珏与家人的线索','把两块玉珏和丝帛对照，决定下一程的方向。',['jade-map'],[choose('循着丝帛寻找家人','你把拼合的图样收入行囊，准备继续寻找失散的家人。'),choose('先把玉珏来历查清','你决定暂缓寻宝，先核对父亲留下的这条线索。')])]},
 miyazaki:{tag:'旧仇与身世',difficulty:'进阶',public:'照管灯守神社的年轻宫司。待客周到，今晨却迟迟无法平静。',main:'弄清昨夜的一刀究竟造成了什么',
 history:['你记得自己在桐原家长大，曾把黑泽绫叫作姐姐。家中遭难后，前任宫司收养你，你随他改姓神谷，接管了神社。森川介也是你收留的人。','你认出黑泽是旧日仇人，晚膳前把消息告诉了黑泽绫。百物语散场后，你替森川介检查烛火，在空屋看到黑泽坐着不动。你刺向他的胸口，却没先检查他是否还活着。','你擦洗地面，把身体和染血祭服拖到花园铜炉里焚烧。今晨，黑泽却出现在饭桌旁。你无法解释这一切，更不敢把自己认定的复仇当作已经查明的事实。'],
 reason:'这里由你照管，昨夜又有人在神社出事。你提出逐一核对口述；众人同意配合，也保留对你的询问。',initial:['miyazaki-statement'],
 secrets:[secret('revenge','复仇的来由','你认出黑泽与桐原家血案有关，曾私下告诉黑泽绫。',5,['miyazaki-statement']),secret('knife','动刀经过','你没确认生死，便刺向坐着不动的黑泽。',8,['miyazaki-statement']),secret('fire','清扫与焚烧','你擦洗空屋，把身体和祭服在铜炉中焚烧。',8,['miyazaki-statement']),secret('family','认亲往事','你相信自己是桐原家的儿子，把黑泽绫当作姐姐。',4,[])],
 goals:[goal('family','我记得的家','用人偶、黑泽绫的童年回忆和旧册核对身世。',['family-dolls','emi-memory','chronicle','doll-craft','bones'],[choose('接受身世存疑，继续查证','你不再坚持自己是桐原家的亲生儿子。关于人偶的解释已有依据，你愿意把记忆与证据分开。'),choose('暂不认定来历，保留所有记录','你承认家族记忆有矛盾，把人偶和旧册留下，等待更多证据。')]),goal('responsibility','留下这一刀的交代','核对遗骸、短刃和抹布，在结案后处理自己做过的事。',['body','knife','cloth','$ending'],[choose('留下署名交代','你写下刺伤、清扫与焚烧的经过。即使不是最初的死因，这些行为也由你承担。'),choose('先封存现场，等候后续询问','你保留现场和记录，答应继续说明经过。后续责任尚待处理。')])]},
 jiang:{tag:'找回断掉的记忆',difficulty:'入门',public:'负责神社杂务的典仕。记性时好时坏，对收留自己的宫司很感激。',main:'找回昨夜的记忆，辨明熟悉的机关',
 history:['你在神社打扫、做饭，靠药物缓解旧疾。过去的事常像断掉的线。宫司收留过你，你记得这份恩情。','昨夜你想去检查蜡烛，宫司让你休息，自己去了。后来你看见一个人从花园跑向客房，没能追上。你在膳所见到可怕的人影，随后失去意识。','醒来时你在自己房里，想不起怎样回来的。你不愿装作记得，也不想再让旁人替你解释全部过去。先把眼前认得的东西一件件核对。'],
 reason:'你熟悉神社的杂务与出入，又亲眼见过昨夜的异状。众人答应帮你核对记忆，你负责把确认过的线索串起来。',initial:[],
 secrets:[secret('gap','昏迷与记忆空白','你在膳所见到人影后昏迷，不知道怎样回房。',5,[])],
 goals:[goal('memory','断掉的旧事','查看木牌、戒指和面具样片，分清恢复的记忆与猜测。',['memory-token','memory-ring','memory-pool'],[choose('如实记下我做过的事','你把代号“池”和传递灭口线索的经历写下；没想起的部分留白，继续查证。'),choose('先向宫司说明，再留下记录','你决定先向收留自己的宫司说明旧事。恩情不替过去的行为作担保。')]),goal('gratitude','恩情之外','核对宫司昨夜的行为，再决定怎样面对这份恩情。',['miyazaki-statement','$ending'],[choose('陪他留下，接受追问','你愿意陪宫司处理神社的残局，也坚持保留他的完整供述。'),choose('自己去追查旧组织','你感谢宫司的收留，决定带着已经恢复的记忆，继续追查“隐”。')])]},
 ishikawa:{tag:'隐瞒与交代',difficulty:'挑战',public:'为写作而来的客人，提议了昨夜的百物语。今晨，他比谁都留意黑泽。',main:'查清已经死去的哥哥为何回来',
 history:['雾岛律是你使用的身份。你是黑泽的孪生弟弟，曾与哥哥共用身份：一个行动，另一个替他制造不在场的证据。你不甘一直替哥哥办事，也想占有黑泽绫的生活；她并不知道自己面对的是两个人。','昨夜，黑泽最后去空屋放蜡烛，你尾随，用蛇形戒指的毒针射中他的颈部。确认他不再呼吸后，你把身体扶坐，摘下面具，冒充哥哥回到厅堂，再陪黑泽绫回房。','等黑泽绫睡下，你出去准备移尸，却发现身体消失了。偏殿遇见白川，你怕暴露行踪便拦住她，被毒簪刺伤。你随后竟看见哥哥躺在黑泽绫身边，只得逃回自己的房间服药。你知道自己做过什么，却不知道哥哥怎样回来。'],
 reason:'你提出核对各人的行踪，想查清消失的身体和今晨的黑泽。众人愿意回答，也会反过来查证你的说法。',initial:['ishikawa-statement'],
 secrets:[secret('identity','假名与孪生身份','你是黑泽的孪生弟弟，以雾岛律的身份来访。',5,['revealed','ishikawa-statement']),secret('murder','毒针杀兄','你在空屋用蛇形戒指的毒针杀死哥哥。',10,['ishikawa-statement']),secret('substitute','冒名陪伴黑泽绫','你以哥哥的身份陪黑泽绫回房，她并不知道真相。',5,['ishikawa-statement']),secret('pin','拦截白川与服药','你拦住白川，被毒簪刺中后逃回房服药。',5,['ishikawa-statement'])],
 goals:[goal('truth','摘下面具以后','核对戒指、药瓶与哥哥重现的证据，决定怎样留下自己的经过。',['revealed','ring','medicine-bottle','$ending'],[choose('实名交代全部经过','你用自己的身份写下杀兄与冒名的经过，接受之后的追问与责任。'),choose('只确认已经核实的部分','你确认结案中的事实，暂未交代全部旧案；这份保留也记在手记里。')]),goal('emi','把选择还给黑泽绫','身份核实后，将木梳交还，并听她说清自己的去留。',['revealed','comb','emi-statement'],[choose('归还木梳，不再替她安排','你把私留下来的木梳还给黑泽绫，说明它并非她送给你的信物，也不再假扮哥哥。'),choose('留下道歉，请她自己决定','你把道歉和木梳交给黑泽绫。是否回应由她决定，曾经的照料不能抹去欺骗。')])]},
 kato:{tag:'追问众人的恐惧',difficulty:'进阶',public:'带妻子出游的商人。今早照常来到饭桌旁，却发现几个人都在躲他的目光。',main:'弄清昨夜的记忆为何接不上',
 history:['你与孪生弟弟曾共用一个身份，借此掩护行动。你按组织命令杀害过桐原家人，取走偶然发现的玉珏并放火。黑泽绫当时在外，后来被你带走，你一直隐瞒她家人的遭遇。','出发前，真野提到了神社的玉珏。为了独占线索，你杀了他。此行你带着黑泽绫，仍想找到另一块玉。','昨夜百物语轮到你最后讲。此后的记忆接不顺：你记得在花园遇见一个诡异的小女孩，逃回房喝茶、睡下。今早黑泽绫脸色很差，其他人看见你也惊慌。你觉得自己好好的，先弄清他们究竟看到了什么。'],
 reason:'众人的惊慌都指向你，偏偏你自己不明所以。你要求逐一听清昨夜的经过，大家同意对照证据，也要求你说明旧事。',initial:['kato-statement'],
 secrets:[secret('twins','共用身份','你与孪生弟弟共用身份，掩护过去的行动。',5,[]),secret('oldcase','桐原旧案','你杀害桐原家人，取玉并放火灭迹。',8,['kato-statement']),secret('asano','真野之死','你为独占玉珏线索杀害真野。',8,['kato-statement']),secret('emi','隐瞒与囚禁','你带走黑泽绫，隐瞒她家人的死因，曾限制她的自由。',4,['kato-statement'])],
 goals:[goal('debts','未清的旧账','对照合同、旧报与真野的纸条，决定怎样交代过去。',['contracts','old-news','asano'],[choose('留下旧案供述','你把桐原家的命案、纵火取玉与真野之死逐项记下，其他事故仍须逐案核实。'),choose('先列出需要查证的旧案','你留下事故和交易的名单，承认相关供述；未交代的部分仍要被追问。')]),goal('emi','她的去留','核实身份和茶里的根茎，在结案后面对黑泽绫的决定。',['revealed','emi-statement','$ending'],[choose('把选择还给黑泽绫','你不再以丈夫的身份安排黑泽绫的去处。她不欠你照料，更不欠你原谅。'),choose('留下道歉，不要求回应','你留下对旧案与隐瞒的道歉。黑泽绫是否接受，由她决定。')])]},
 emi:{tag:'家人的真相与自己的去路',difficulty:'进阶',public:'陪黑泽来到神社的妻子。昨夜冻得难受，今晨有太多事想问清。',main:'查清家人旧案与身边人的身份',
 history:['你小时候姓桐原，后来失去家人的消息，被黑泽带走。过去他有时伤害你、限制你，有时又照料你。你一直以为那是同一个人的变化。','宫司说自己是你失散的弟弟。昨日晚膳前，他告诉你，黑泽是当年杀害家人的凶手。百物语散场后，你随“丈夫”回房，睡醒时身边却没有人。','你挖来风信花根，把根汁挤进茶杯，残根丢在菜地。后来那张熟悉的脸回来，喝下茶却没有倒下，房里越来越冷。今早，你想查清他为何无事，也要弄明白宫司的话。以后去哪里，必须由你自己决定。'],
 reason:'家人的旧案与你昨夜的经历都出了疑点。你要求每个人说清自己知道的部分，众人同意由你逐项核对。',initial:['emi-statement'],
 secrets:[secret('revenge','得知家仇','宫司在晚膳前私下告诉你，黑泽杀害了你的家人。',5,[]),secret('tea','花根下毒','你挖风信花根，将根汁挤进黑泽的茶杯。',10,['emi-statement']),secret('absence','睡醒后的外出','你睡醒时丈夫不在，随后挖根并把残根丢到菜地。',5,['emi-statement'])],
 goals:[goal('family','把家人的事问清','查看小人偶，核对童年记忆与黑泽的供述。',['emi-memory','old-news','kato-statement'],[choose('留下家人的真实经历','你把家人的名字与能够核实的经过留下，不再只听别人替他们讲述。'),choose('保留记录，继续寻找旧证人','你接受已经证实的部分，带着旧报与供述继续寻找幸存者和旧证人。')]),goal('future','我的去路','身份和昨夜经过查清后，为自己作一个决定。',['revealed','$ending'],[choose('独自离开，另找住处','你决定独自离开黑泽与雾岛，去处和生活由你自己安排。'),choose('暂留神社，整理旧案','你决定暂时留在神社整理家人的线索。暂住由你选择，不代表接受任何人的安排。')])]}
};
export const roleCatalog=cast.map(p=>({id:p.id,name:p.name,portrait:p.portrait,role:p.role,tag:roles[p.id].tag,difficulty:roles[p.id].difficulty,description:roles[p.id].public}));
export const validRole=id=>Object.hasOwn(roles,id);
export const roleDefinition=s=>roles[playerId(s)];
export function roleSecrets(s){const list=[...roleDefinition(s).secrets];if(playerId(s)==='jiang'&&s.found.includes('memory-pool'))list.push(secret('pool','代号与旧任务','你记起自己代号“池”，曾传递桐原家的灭口线索。',10,['memory-pool']));return list;}
export const roleReason=s=>roleDefinition(s).reason+' 进房、翻找与检查本人仍各自征求同意；记录只是口述，不能替代物证。';
const ready=(s,g)=>g.needs.every(id=>id==='$ending'?!!s.ending:s.found.includes(id));
const goalTarget=(s,id)=>({ishikawa:{emi:'emi'},kato:{emi:'emi'},jiang:{gratitude:'miyazaki'}}[playerId(s)]?.[id]||null);
export function roleGoals(s){return [{title:roleDefinition(s).main,kind:'主线',done:!!s.ending,text:'用物证与各人的口述核对这一夜，说明行凶的对象与先后。'},...roleDefinition(s).goals.map(g=>({id:g.id,title:g.title,text:g.text,kind:'支线',ready:ready(s,g),target:goalTarget(s,g.id),targetName:cast.find(p=>p.id===goalTarget(s,g.id))?.name,near:!goalTarget(s,g.id)||s.positions[goalTarget(s,g.id)]===s.room,done:!!s.personalGoals?.[g.id],result:s.personalGoals?.[g.id]?.text||null,choices:ready(s,g)&&!s.personalGoals?.[g.id]?g.choices.map((c,i)=>({id:i,label:c.label})):[]}))];}
export function selfView(s){const r=roleDefinition(s),p=playerPerson(s);return {id:p.id,name:p.name,role:p.role,homeRoom:p.room,history:r.history,reason:roleReason(s),openingTitle:r.main,finalQuestion:'结案后，怎样留下自己的经历？',finalChoices:{keep:'先保留私人记录',reveal:'主动留下完整交代'}};}
export function completePersonalGoal(s,id,choice){const g=roleDefinition(s).goals.find(g=>g.id===id);if(!g||!Number.isInteger(choice)||!g.choices[choice])throw Error('请选择当前人物的支线决定。');if(s.personalGoals?.[id])return {cached:true,result:s.personalGoals[id]};if(!ready(s,g))throw Error('这条支线还缺调查依据。');const target=goalTarget(s,id);if(target&&s.positions[target]!==s.room)throw Error('先到'+cast.find(p=>p.id===target).name+'身边，再作这个决定。');const result={choice,title:g.title,text:g.choices[choice].result};s.personalGoals||={};s.personalGoals[id]=result;return {result,target};}
export function roleEpilogue(s,choice){const p=playerPerson(s);return `${p.name}把这一夜记在自己的手记里。${choice==='reveal'?'你决定主动留下自己的完整经历。':'你暂时保留私人经历，已核实的案件结论仍完整记录。'}${Object.values(s.personalGoals||{}).map(g=>g.text).join('')||'个人支线仍可继续调查，之后再作决定。'}`;}

export function roleStory(s){if(playerId(s)==='player')return xiaocangPages;const r=roleDefinition(s),p=playerPerson(s);return r.history.map((text,i)=>({chapter:['来路 · 个人经历','昨夜 · 亲历之事','今晨 · 开始调查'][i],title:i===2?r.main:p.name+'的手记',portrait:p.portrait,caption:p.name+' · '+p.role,paragraphs:[text,...(i===2?[roleReason(s)]:[])],foot:i===2?'在“我的简介”里查看目标和要隐瞒的事。':'这只是你自己记得的经过，其他人未必知道。'}));}
