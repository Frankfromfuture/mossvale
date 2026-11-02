import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as next from '/app/server/role-saves.mjs';
import * as previous from '/previous/server/role-saves.mjs';
const files=fs.readdirSync('/app-data').filter(name=>/^[a-f0-9]{32}\.json$/.test(name));
let slots=0;
for(const file of files){
 const bytes=fs.readFileSync('/app-data/'+file),raw=JSON.parse(bytes);
 const a=previous.migrateArchive(structuredClone(raw)),b=next.migrateArchive(structuredClone(raw));
 assert.equal(b.format,'scripts-v2');assert.equal(b.activeScript,'hanyu');
 const first=b.books.hanyu;
 for(const key of ['active','bestScore','slots'])assert.deepEqual(first[key],a[key]);
 assert.equal(Object.keys(b.books.suspect7.slots).length,0);
 const oldMenu=previous.menuView(a,{ready:false}),newMenu=next.menuView(b,{ready:false});
 for(const key of ['roles','bestScore'])assert.deepEqual(newMenu[key],oldMenu[key]);
 if(oldMenu.continueProgress)for(const [key,value] of Object.entries(oldMenu.continueProgress))assert.deepEqual(newMenu.continueProgress[key],value);
 else assert.equal(newMenu.continueProgress,null);
 for(const role of Object.keys(a.slots)){
  const before=structuredClone(a),after=structuredClone(b);before.active=role;after.books.hanyu.active=role;
  const v0=previous.archiveView(before,{ready:false}),v1=next.archiveView(after,{ready:false});
  for(const key of ['playerId','started','phase','room','notes','roleSelection'])assert.deepEqual(v1[key],v0[key]);
  if(v0.clues)assert.deepEqual(v1.clues.map(c=>c.id),v0.clues.map(c=>c.id));
  if(v0.investigation)assert.equal(v1.investigation.pointsSpent,v0.investigation.pointsSpent);
  assert.deepEqual(after.books.hanyu.slots[role].conversations,before.slots[role].conversations);slots++;
 }
 assert.deepEqual(fs.readFileSync('/app-data/'+file),bytes);
}
assert.ok(files.length>0);
console.log(JSON.stringify({passed:true,isolatedSaves:files.length,slots,writeOperations:0,modelCalls:0}));
