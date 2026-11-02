import {randomUUID} from 'node:crypto';
import {investigationView} from './investigation.mjs';
import {roleCatalog,validRole} from './roles.mjs';
import {scriptCatalog,scriptDefinition} from './scripts.mjs';
import {routes,person} from '../shared/suspect7/cast.mjs';
export const archiveFormat='scripts-v2';
export const unlockScores=Object.freeze({player:0,jiang:60,emi:70,miyazaki:80,kato:88,ishikawa:95});
const emptyBook=()=>({active:null,slots:{},tokens:{},bestScore:0,unlocked:false});
export const newArchive=()=>({format:archiveFormat,activeScript:'hanyu',books:{hanyu:emptyBook(),suspect7:emptyBook()},sessionToken:randomUUID()});
export function migrateArchive(raw){
 if(raw.format===archiveFormat)return raw;
 const book=newArchive();
 if(raw.format==='six-roles-v1')book.books.hanyu=structuredClone(raw);
 else {book.books.hanyu.active='player';book.books.hanyu.slots.player=structuredClone(raw);book.books.hanyu.tokens.player=randomUUID();}
 // No source file is written during reads. main.mjs backs it up before the first mutation.
 return book;
}
const current=book=>book.books[book.activeScript];
export const activeRole=book=>current(book).active;
export const activeGame=book=>{const b=current(book);return b.active?b.slots[b.active]:null;};
export const activeToken=book=>book.sessionToken;
export const rotateToken=book=>{book.sessionToken=randomUUID();};
export function bestCompletedScore(book){
 const b=book.books.hanyu,recorded=Number.isFinite(b.bestScore)?Math.max(0,Math.min(100,b.bestScore)):0;
 return Math.max(recorded,...Object.values(b.slots).filter(s=>s.ending).map(s=>investigationView(s).total));
}
export function rememberBestScore(book){book.books.hanyu.bestScore=bestCompletedScore(book);const b=book.books.suspect7;if(Object.values(b.slots).some(s=>s.ending))b.unlocked=true;}
const valid=(book,id)=>book.activeScript==='suspect7'?routes.some(r=>r.id===id):validRole(id);
export const roleUnlocked=(book,id)=>valid(book,id)&&(book.activeScript==='suspect7'?(id==='andy'||book.books.suspect7.unlocked||Object.values(book.books.suspect7.slots).some(s=>s.ending)):(id==='player'||bestCompletedScore(book)>=unlockScores[id]));
const roleChoices=book=>{const b=current(book);return book.activeScript==='suspect7'?routes.map(r=>({id:r.id,name:person(r.id).name,portraitUrl:`art/suspect7/v2/portrait-${r.id}.png`,locked:!roleUnlocked(book,r.id),saved:!!b.slots[r.id],finished:!!b.slots[r.id]?.ending})):roleCatalog.map(({id,name,portrait})=>({id,name,portrait,unlockScore:unlockScores[id],locked:!roleUnlocked(book,id),saved:!!b.slots[id],finished:!!b.slots[id]?.ending}));};
export function continuationRole(book){const b=current(book);return roleUnlocked(book,b.active)&&activeGame(book)?b.active:roleChoices(book).find(p=>p.saved&&!p.locked)?.id||null;}
function menuFields(book,ai){
 const id=continuationRole(book),b=current(book),s=id?b.slots[id]:null,p=book.activeScript==='suspect7'?person(s?.playerId||id):roleCatalog.find(p=>p.id===id);
 return {activeScript:book.activeScript,roles:roleChoices(book),bestScore:bestCompletedScore(book),scripts:scriptCatalog.map(script=>({...script,saved:Object.keys(book.books[script.id].slots).length>0})),continueProgress:s?{scriptId:book.activeScript,role:id,name:p?.name,chapterId:s.chapterId,finished:!!s.ending,started:!!s.started}:null,slotToken:activeToken(book),ai};
}
export const menuView=(book,ai)=>({startMenu:true,...menuFields(book,ai)});
export function archiveView(book,ai){const s=activeGame(book);return {...(s&&roleUnlocked(book,activeRole(book))?{...scriptDefinition(book.activeScript).view(s,ai),scriptId:book.activeScript}:{roleSelection:true}),...menuFields(book,ai)};}
export function assertSlot(book,token){if(token!==activeToken(book)){const e=Error('剧本或视角已切换，请刷新后继续。原进度已保留。');e.status=409;throw e;}}
export function assertPlayable(book,id=activeRole(book)){if(!roleUnlocked(book,id)){const e=Error(book.activeScript==='suspect7'?'先完成安迪的故事，其他路线随即开放。':validRole(id)?`结案调查分数达到${unlockScores[id]}分后解锁。`:'先选一位主角。');e.status=403;throw e;}}
export function selectScript(book,id){if(!scriptDefinition(id))throw Error('没有这个剧本。');rememberBestScore(book);book.activeScript=id;rotateToken(book);}
export function selectRole(book,id){if(!valid(book,id))throw Error('没有这个人物。');assertPlayable(book,id);rememberBestScore(book);const b=current(book);if(!b.slots[id]){b.slots[id]=scriptDefinition(book.activeScript).createGame(id);b.tokens[id]=randomUUID();}b.active=id;rotateToken(book);}
export function continueRole(book){const id=continuationRole(book);if(!id){const e=Error('还没有可继续的进度，请先选择剧本。');e.status=409;throw e;}selectRole(book,id);}
export function resetRole(book){assertPlayable(book);rememberBestScore(book);const b=current(book),id=b.active;b.slots[id]=scriptDefinition(book.activeScript).createGame(id);b.tokens[id]=randomUUID();rotateToken(book);}
