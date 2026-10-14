// Read-only observation: no HTTP calls, model requests, game controls or save writes.
import fs from 'node:fs';
import path from 'node:path';
const out=import.meta.dirname,root=path.resolve(out,'../../..');
const file=path.join(root,'.data-cocos-2d/987509faab16ac2568a61b45b1564c4bd33f4fecbb1c0621.json');
let baseline,end;
const rows=[],errors=[];
const snapshot=()=>{const w=JSON.parse(fs.readFileSync(file));return {at:Date.now(),iso:new Date().toISOString(),saveModifiedAt:fs.statSync(file).mtime.toISOString(),minute:w.minute,speed:w.speed,paused:w.paused,online:w.economy.playerOnlineUntil>w.minute,deepseek:{...w.usage},jev:{...w.jevUsage},jevCounts:w.jevLife?.counts};};
const write=(name,data)=>{const f=path.join(out,name);fs.writeFileSync(f+'.tmp',JSON.stringify(data,null,2));fs.renameSync(f+'.tmp',f);};
write('status.json',{status:'waiting-for-page',since:new Date().toISOString(),unlimitedDailyModelCalls:true});
while(!baseline){
 try{const row=snapshot();if(row.online&&Date.now()-Date.parse(row.saveModifiedAt)<5000)baseline=row;}catch{}
 if(!baseline)await new Promise(resolve=>setTimeout(resolve,2000));
}
end=baseline.at+600000;rows.push(baseline);write('baseline.json',baseline);write('status.json',{status:'running',startedAt:baseline.iso,endsAt:new Date(end).toISOString(),unlimitedDailyModelCalls:true});
while(Date.now()<end){
 await new Promise(resolve=>setTimeout(resolve,Math.max(1,Math.min(10000,end-Date.now()))));
 try{rows.push(snapshot());write('samples.json',rows);}catch(e){errors.push({at:Date.now(),error:e.code||e.name});}
}
const last=rows.at(-1),delta=(provider,fields)=>{
 const counts=Object.fromEntries(fields.map(k=>[k,0])),resets=[];
 for(let i=1;i<rows.length;i++){const a=rows[i-1][provider]||{},b=rows[i][provider]||{};for(const k of fields){const before=Number(a[k])||0,after=Number(b[k])||0;if(after>=before)counts[k]+=after-before;else{resets.push({at:rows[i].at,field:k,previous:before,current:after});if(a.day!==b.day)counts[k]+=after;}}}
 return {...counts,resets};
};
const deepseek=delta('deepseek',['calls','input','output','failures','autoCalls','reflectionCalls']);deepseek.total=deepseek.input+deepseek.output;
const jev=delta('jev',['calls','input','failures']);
write('result.json',{status:errors.length?'completed-with-read-errors':'completed',startedAt:baseline.iso,scheduledEndAt:new Date(end).toISOString(),observedEndAt:last.iso,durationSeconds:(last.at-baseline.at)/1000,saveSnapshotLagSeconds:(last.at-Date.parse(last.saveModifiedAt))/1000,sampleCount:rows.length,deepseek,jev,jevOutputTokens:'not recorded by current integration',conditions:rows.filter((r,i)=>!i||r.speed!==rows[i-1].speed||r.paused!==rows[i-1].paused||r.online!==rows[i-1].online).map(r=>({at:r.iso,speed:r.speed,paused:r.paused,online:r.online})),initialDeepseekAutoCalls:baseline.deepseek.autoCalls,unlimitedDailyModelCalls:true,gameMinutes:last.minute-baseline.minute,errors,scope:'Current local 2D saved session only; API-reported usage deltas from saved snapshots, not provider billing. Requests without returned usage are not measurable.'});

write('status.json',{status:'completed',completedAt:new Date().toISOString()});
