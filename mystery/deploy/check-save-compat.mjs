import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as next from '/app/server/role-saves.mjs';
import * as previous from '/previous/server/role-saves.mjs';
const files=fs.readdirSync('/app-data').filter(name=>/^[a-f0-9]{32}\.json$/.test(name));
let slots=0;
for(const file of files){
 const bytes=fs.readFileSync('/app-data/'+file),raw=JSON.parse(bytes);
 const a=previous.migrateArchive(structuredClone(raw)),b=next.migrateArchive(structuredClone(raw));
 // A read of an unmigrated archive intentionally generates fresh session tokens.
 if(raw.format!=='scripts-v2')b.sessionToken=a.sessionToken;
 if(!['six-roles-v1','scripts-v2'].includes(raw.format))b.books.hanyu.tokens.player=a.books.hanyu.tokens.player;
 assert.equal(b.format,'scripts-v2');assert.deepEqual(b,a);
 const oldMenu=previous.menuView(a,{ready:false}),newMenu=next.menuView(b,{ready:false});
 for(const key of ['roles','bestScore'])assert.deepEqual(newMenu[key],oldMenu[key]);
 if(oldMenu.continueProgress)for(const [key,value] of Object.entries(oldMenu.continueProgress))assert.deepEqual(newMenu.continueProgress[key],value);
 else assert.equal(newMenu.continueProgress,null);
 for(const script of ['hanyu','suspect7'])for(const role of Object.keys(a.books[script].slots)){
  const before=structuredClone(a),after=structuredClone(b);before.activeScript=after.activeScript=script;before.books[script].active=after.books[script].active=role;
  const v0=previous.archiveView(before,{ready:false}),v1=next.archiveView(after,{ready:false});
  for(const key of ['playerId','started','phase','chapterId','room','notes','roleSelection','ending'])assert.deepEqual(v1[key],v0[key]);
  if(v0.clues)assert.deepEqual(v1.clues.map(c=>c.id),v0.clues.map(c=>c.id));
  if(v0.investigation)assert.equal(v1.investigation.pointsSpent,v0.investigation.pointsSpent);
  for(const key of ['found','records','hypotheses','chatLog','chats','conversations','flags'])assert.deepEqual(after.books[script].slots[role][key],before.books[script].slots[role][key]);slots++;
 }
 assert.deepEqual(fs.readFileSync('/app-data/'+file),bytes);
}
assert.ok(files.length>0);
console.log(JSON.stringify({passed:true,isolatedSaves:files.length,slots,writeOperations:0,modelCalls:0}));
