import {randomUUID} from 'node:crypto';
import {createGame,view} from './game.mjs';
import {investigationView} from './investigation.mjs';
import {roleCatalog,validRole} from './roles.mjs';
export const unlockScores=Object.freeze({player:0,jiang:60,emi:70,miyazaki:80,kato:88,ishikawa:95});
export const newArchive=()=>({format:'six-roles-v1',active:null,slots:{},tokens:{},menuToken:randomUUID(),bestScore:0});
export function migrateArchive(raw){
 if(raw.format==='six-roles-v1')return raw;
 // Legacy progress is wrapped in memory; the first mutation backs up the source file.
 const book=newArchive();book.active='player';book.slots.player=raw;book.tokens.player=randomUUID();return book;
}
export const activeGame=book=>book.active?book.slots[book.active]:null;
export const activeToken=book=>book.active?book.tokens[book.active]:book.menuToken;
export function bestCompletedScore(book){
 const recorded=Number.isFinite(book.bestScore)?Math.max(0,Math.min(100,book.bestScore)):0;
 return Math.max(recorded,...Object.values(book.slots).filter(s=>s.ending).map(s=>investigationView(s).total));
}
export function rememberBestScore(book){book.bestScore=bestCompletedScore(book);}
export const roleUnlocked=(book,id)=>validRole(id)&&(id==='player'||bestCompletedScore(book)>=unlockScores[id]);
const roleChoices=book=>{const best=bestCompletedScore(book);return roleCatalog.map(({id,name,portrait})=>({id,name,portrait,unlockScore:unlockScores[id],locked:best<unlockScores[id],saved:!!book.slots[id],finished:!!book.slots[id]?.ending}));};
export function continuationRole(book){return roleUnlocked(book,book.active)&&activeGame(book)?book.active:roleCatalog.find(p=>book.slots[p.id]&&roleUnlocked(book,p.id))?.id||null;}
function menuFields(book,ai){
 const id=continuationRole(book),person=roleCatalog.find(p=>p.id===id),s=id?book.slots[id]:null;
 return {roles:roleChoices(book),bestScore:bestCompletedScore(book),scripts:[{id:'hanyu',name:'雾灯未眠',tagline:'昨夜，他们都藏起了一件事。',description:'最后一支蜡烛熄灭，山里的怪谈散了场。天亮后，六个人重新围坐，却谁也不敢先说自己看见了什么。你为一位故人而来，有人等着重逢，有人只盼昨夜从未发生。',cover:'art/menu/mist-lantern-v1.png'}],continueProgress:s?{role:id,name:person.name,finished:!!s.ending,started:!!s.started}:null,slotToken:activeToken(book),ai};
}
export function menuView(book,ai){return {startMenu:true,...menuFields(book,ai)};}
export function archiveView(book,ai){
 const s=activeGame(book);
 return {...(s&&roleUnlocked(book,book.active)?view(s,ai):{roleSelection:true}),...menuFields(book,ai)};
}
export function assertSlot(book,token){if(token!==activeToken(book)){const e=Error('当前主角已在其他页面切换，请刷新后继续。原进度已保留。');e.status=409;throw e;}}
export function assertPlayable(book,id=book.active){if(!roleUnlocked(book,id)){const e=Error(validRole(id)?`结案调查分数达到${unlockScores[id]}分后解锁。`:'先选一位主角，再开始调查。');e.status=403;throw e;}}
export function selectRole(book,id){if(!validRole(id))throw Error('没有这个人物。');assertPlayable(book,id);rememberBestScore(book);if(!book.slots[id]){book.slots[id]=createGame(id);book.tokens[id]=randomUUID();}book.active=id;}
export function continueRole(book){const id=continuationRole(book);if(!id){const e=Error('还没有可继续的进度，请先选择剧本。');e.status=409;throw e;}selectRole(book,id);}
export function resetRole(book){assertPlayable(book);rememberBestScore(book);const id=book.active;book.slots[id]=createGame(id);book.tokens[id]=randomUUID();}
