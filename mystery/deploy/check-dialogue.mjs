// Bounded real-model acceptance in the isolated preflight container only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {newArchive,selectScript,selectRole,activeGame,activeToken} from '../server/role-saves.mjs';
import {newDialogue} from '../server/suspect7/inquiries.mjs';
assert.equal(process.env.PORT,'8797');assert.equal(process.env.MYSTERY_DATA_DIR,'/app-data');
const report={passed:false,modelCalls:0,turns:[]},files=[];
const seed=async init=>{const id=randomBytes(16).toString('hex'),b=newArchive();selectScript(b,'suspect7');selectRole(b,'andy');const s=activeGame(b);s.started=true;init?.(s);const file='/app-data/'+id+'.json';files.push(file);await fs.writeFile(file,JSON.stringify(b),{mode:0o600});return {id,token:activeToken(b)};};
const ask=async(session,actor,message,shown)=>{
 const start=performance.now(),r=await fetch('http://127.0.0.1:8797/api/chat',{method:'POST',headers:{cookie:'mystery_sid='+session.id,'content-type':'application/json'},body:JSON.stringify({slotToken:session.token,actor,message,shown,requestId:randomUUID()})}),b=await r.json();
 if(!r.ok)throw Error(b.error);report.modelCalls+=2;const stored=JSON.parse(await fs.readFile('/app-data/'+session.id+'.json','utf8'));report.turns.push({actor,message,speech:b.speech,discoveries:b.discoveries,review:activeGame(stored).dialogue.lastReview,elapsedMs:Math.round(performance.now()-start)});return b;
};
try{
 const first=await seed();let r=await ask(first,'chenxin','这到底是谁的房子？我们为什么会被车送到这儿？');assert(!r.state.flags['arrival-chen']);
 r=await ask(first,'chenxin','那厨房后面呢？你熟悉这里，总该知道还有没有路能出去吧？');assert(r.state.flags['arrival-chen']);
 const confrontation=await seed(s=>{s.chapterId=5;s.playerId='wuquan';s.viewpointMode='investigation';s.room='meeting';s.found=['franklin-old','wuquan-file','aiyijun-file','raven-file'];s.dialogue=newDialogue();});
 const shown=['franklin-old','wuquan-file'];r=await ask(confrontation,'franklin','你说吴斌介绍孙强给你工作，可他的弟弟说吴斌根本不认识富兰克林。两份说法对不上，你怎么解释？',shown);assert(!r.state.flags['sun-confirmed']);
 r=await ask(confrontation,'franklin','你刚才还是没有解释介绍人的矛盾。既然没有这层来往，那些亲历的细节从哪儿来？你究竟是谁？',shown);assert(r.state.flags['sun-confirmed']);assert(r.speech.includes('孙强'));
 const technical=await seed(s=>{s.chapterId=6;s.playerId='wuquan';s.viewpointMode='investigation';s.room='meeting';s.found=['body','dna'];s.dialogue=newDialogue();});
 r=await ask(technical,'raven','遗体身上的东西不能当作身份结论。请申请独立核查温泉死者，牙科或者其他独立记录能核对吗？');assert(r.state.evidence.some(e=>e.id==='dental'));
 const negative=await seed();r=await ask(negative,'chenxin','陈信，先坐一会儿吧，我想喘口气。');assert(!r.state.flags['arrival-chen']);assert(!r.discoveries.length);
 report.passed=true;
}catch(e){report.error=e.message;}
finally{for(const file of files)await fs.unlink(file).catch(()=>{});}
console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
