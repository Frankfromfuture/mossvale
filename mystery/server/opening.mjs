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
 if(s.briefing&&!s.briefing.complete)return {title:'先听每个人说一段',text:'轮流听取公开口述，再作自我介绍。记录会留在手记中，之后用证据核对。',action:'opening'};
 if(!s.found.includes('body'))return {title:'先看花园的铜炉',text:'众人昨夜的经历有出入。先去花园查看，再带着现场所见回来询问。',action:'garden'};
 if(!s.found.includes('mask'))return {title:'核对口述与现场',text:'回厅堂分别问清行踪；先申请搜查许可，再检查各人的客房。留意与身份不符的物件。',action:'gather'};
 if(!s.found.includes('revealed'))return {title:'当面核实身份',text:'辨认面具与易容手法；森川介可自己回想，其他人可向他求证，再召集大家核实。',action:'gather'};
 if(!s.ending&&!caseProgress(s).ready)return {title:'补齐关键证据',text:caseProgress(s).missing[0],action:'book'};
 return {title:s.ending?'调查已记入手记':'整理最后的推断',text:s.ending?'可以回看口述、线索与自己的调查记录。':'对照各次行凶的对象与先后，再回厅堂说明判断。',action:'book'};
}
