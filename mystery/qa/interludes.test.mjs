import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,view} from '../server/game.mjs';
import {interludesFor} from '../server/interludes.mjs';
import {createInterludeQueue} from '../src/interludes.mjs';

const add=(s,...ids)=>{s.found=[...new Set([...s.found,...ids])];};
const accounts=['miyazaki-statement','ishikawa-statement','emi-statement'];
test('six viewpoints unlock only completed milestones; private knowledge is not a public reveal',()=>{
 for(const role of ['player','miyazaki','jiang','ishikawa','kato','emi']){
  const s=createGame(role);s.started=true;
  assert.deepEqual(view(s).interludes,[]);
  add(s,'body');assert.deepEqual(interludesFor(s).map(x=>x.id),['ashes']);
  const publicBody=JSON.stringify(interludesFor(s));assert.doesNotMatch(publicBody,/孪生|亡魂|毒针/);
  add(s,'mask');let entries=interludesFor(s);assert.equal(entries.at(-1).action.type,'people');
  assert.doesNotMatch(JSON.stringify(entries),/孪生|面具落下|亡魂/);
  add(s,'memory-pool');assert.equal(interludesFor(s).at(-1).action.type,'case');
  assert.ok(!interludesFor(s).some(x=>x.id==='unmask'));
  add(s,'revealed');assert.equal(interludesFor(s).at(-1).id,'unmask');
  add(s,...accounts);assert.equal(interludesFor(s).at(-1).action.type,'accounts');
  add(s,'memory-ring','poison-book','cloth','cold-brazier','chronicle');
  assert.equal(interludesFor(s).at(-1).action.type,'case');
  s.ending={title:'已结案'};assert.deepEqual(interludesFor(s).map(x=>x.id),['ashes','mask','unmask','accounts','epilogue']);
  for(const e of interludesFor(s)){assert.equal(e.pages.length,4);assert.ok(e.pages.every((p,i)=>p.panel===i));}
 }
});
test('reading does not change evidence, scores, actions or endings',()=>{
 const s=createGame();add(s,'body','mask',...accounts);const before=structuredClone(s);
 interludesFor(s);assert.deepEqual(s,before);
});
test('skip/completion persists, pending scenes survive reload, legacy and role slots remain independent',()=>{
 const items=new Map(),storage={getItem:k=>items.get(k)??null,setItem:(k,v)=>items.set(k,v)};
 let q=createInterludeQueue(storage);q.update('fresh',[]);q.update('fresh',[{id:'ashes'}]);assert.equal(q.next().id,'ashes');
 q=createInterludeQueue(storage);q.update('fresh',[{id:'ashes'}]);assert.equal(q.next().id,'ashes');
 q.finish('ashes');assert.equal(q.next(),undefined);q.update('fresh',[{id:'ashes'},{id:'mask'}]);assert.equal(q.next().id,'mask');
 q.update('legacy',[{id:'ashes'},{id:'mask'}]);assert.equal(q.next(),undefined);
 q.update('other',[]);q.update('other',[{id:'ashes'}]);assert.equal(q.next().id,'ashes');
 q.update('fresh',[{id:'ashes'},{id:'mask'}]);assert.equal(q.next().id,'mask');
});
