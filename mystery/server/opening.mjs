import {playerId} from '../shared/player.mjs';
import {roleReason} from './roles.mjs';
import {caseProgress} from './case-story.mjs';
import {cast} from '../shared/layout.mjs';
import {personas} from './scenario.mjs';

export const organizerRole='宫司请同样参加了百物语的你执笔，众人约定先各自说一段昨夜的经历，再由你分别询问、核对物证。你们各有疑点，暂不由谁替谁下结论。你把说法并排记下，物证由大家核对；进房和搜查仍须取得本人同意。';
const facts={miyazaki:['intro','night'],jiang:['intro','night','ghost'],ishikawa:['intro','game'],kato:['intro','night'],emi:['intro','morning']};
export const openingStatements=cast.filter(p=>p.id!=='player').map(p=>({actor:p.id,text:facts[p.id].map(id=>personas[p.id].facts.find(f=>f.id===id).text).join('')}));
openingStatements.push({actor:'player',text:'我叫白川澄，是来借宿的旅人，昨夜也参加了百物语。大家的说法我先记下来，有出入的再分别核对。'});

export function openingFor(s){return [...openingStatements.filter(l=>l.actor!==playerId(s)),...openingStatements.filter(l=>l.actor===playerId(s))].map(l=>l.actor==='player'&&playerId(s)!=='player'?{...l,text:'我叫白川澄，是来借宿的旅人，昨夜也参加了百物语。有出入的事，可以分别核对。'}:l);}
export function openingView(s){
 const b=s.briefing;
 return {role:roleReason(s),legacy:!b&&s.started,complete:b?.complete??s.started,next:b?.next??0,total:openingStatements.length,
  current:b&&!b.complete?openingFor(s)[b.next]:null,records:b?.records||[]};
}
export function nextLead(s){
 const has=(...ids)=>ids.every(id=>s.found.includes(id));
 const book=(title,text,steps,extra={})=>({title,text,steps,action:'book',tab:'clues',label:'打开线索页',...extra});
 if(s.briefing&&!s.briefing.complete)return {title:'先听每个人说一段',text:'点「记下，听下一位」听完这一轮；之后可在「手记 → 口述」重看。',action:'opening'};
 if(s.investigation?.challenge)return {title:'先接住眼前的追问',text:'回到当前对话，读完对方的问题，再在输入框中回应。',steps:['需要回想时，可以先翻「手记」或「我」。','想拿物证解释，点对话下方的「出示」，选已有线索，再说出你的回应。'],action:'conversation',actor:s.investigation.challenge.actor,label:'回到当前对话'};
 if(s.ending)return {title:'看看还没完成的个人目标',text:'打开「我」查看主线和支线；有了相应依据后，按目标中的人物入口继续交谈。',steps:['案件记录在「手记 → 推断」里，可以随时重读。','其他人的支线入口在「手记 → 支线」。'],action:'self',label:'查看我的目标'};
 if(!has('body'))return {title:'先到现场看一眼',text:'点下方「去花园」，到达后点铜炉旁的调查标记。发现的内容会收进手记。',steps:['场景里有描边的物件可以点开查看。','想换地点，打开「地图」，点地图上的地点名称。'],action:'garden',label:'去花园'};
 if(caseProgress(s).ready)return book('把线索整理成推断','现有记录已经可以用来整理这一夜的经过。先看看推断页，再决定怎样说明。',['请大家回到厅堂，打开「手记 → 推断」。','点「向大家说明推断」，在表单里填写你的判断；提交前仍可返回调查。'],{tab:'case',label:'打开推断页',requiresHall:true});
 if(has('mask','memory-pool')&&!has('revealed'))return book('当面核对已有的依据','实物和辨认记录都已收进手记，可以请大家一起核对。',['回厅堂，打开「手记 → 推断」。','找到新出现的「'+(playerId(s)==='ishikawa'?'当众摘下面具':playerId(s)==='jiang'?'当面指出伪装的接缝':'请森川介当面核实')+'」按钮，准备好后再点。'],{tab:'case',label:'打开核实入口',requiresHall:true});
 if(!Object.keys(s.publicReactions||{}).length)return book('把现场发现拿出来问问','可以先公开一条现场线索，看看大家分别怎么回应。',['回厅堂，打开「手记 → 线索」，选中这次的现场发现。','点线索正文下方的「在厅堂公开」，查看「众人的反应」。','对某个人的反应有疑问，就点他旁边的「追问」；问题会先填入输入框，想好后再说出。'],{clue:'body',label:'打开公开线索入口',requiresHall:true});
 if(!has('mask')&&has('recipe'))return has('water','vaseline','clay','pendant')?
  book('试着照手记里的配方制作','配方和材料已经齐了，制作入口在线索页正文下方。',['打开「手记 → 线索」，翻到已经找到的配方。','点「按配方制作」。做好的东西也会成为一条线索，可以拿给别人看。'],{clue:'recipe',label:'打开制作入口'}):
  book('先对照手里的配方','翻开已找到的配方，看看材料是否收齐，再去场景里找还能查看的物件。',['打开「手记 → 线索」，阅读配方里的材料说明。','到相应地点后，点有描边的物件；需要搜查客房时，先找房主点「搜查」申请许可。','材料齐了，线索页正文下方会出现「按配方制作」。'],{clue:'recipe',label:'翻开已有配方'});
 if(has('mask')&&!has('memory-pool'))return book('拿实物请人辨认','手里的成品也许能唤起某人的记忆。可以找熟悉这类东西的人聊聊。',['点顶部人物头像，进入对话。','点对话下方的「出示」，选择已做好的面具，再问对方是否见过类似的东西。','新的辨认记录会收进手记；再点「提示」看看接下来有哪些入口。'],{clue:'mask',label:'翻看做好的面具'});
 if(has('ring')&&!has('memory-ring'))return book('旧物也可以拿来问人','有些物件光看外观还不够，可以请熟悉旧事的人辨认。',['在「手记 → 线索」重看已找到的戒指。','点人物头像 → 对话下方「出示」→ 选择戒指，再问来历或用途。'],{clue:'ring',label:'翻看这件旧物'});
 if(has('miyazaki-statement','ishikawa-statement','emi-statement'))return book('回现场核对口述中的细节','几段新的交代已经记下了。留意其中提到的地点和物件，再去实地看看。',['在「手记 → 线索 → 证词」重读新的交代，找出还没亲眼核对的细节。','打开「地图」前往相关地点，查看仍有描边的物件。','也可以选一条已有线索，点「查看公开反应」重看众人的说法，再追问。'],{clue:'emi-statement',label:'重读已有证词'});
 return book('从一句有疑问的话继续查','先挑一段你想核对的口述，再拿已找到的物证去问说话的人。',['打开「手记 → 口述」，重看大家最初说了什么。','点人物头像 → 对话下方「出示」→ 选择与这段话有关的已有线索，再问具体经过。','需要找新物件，点对话下方「搜查」申请许可；进屋后点描边物件。'],{tab:'opening',label:'重看开场口述'});
}
