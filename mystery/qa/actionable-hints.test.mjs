import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,act,view} from '../server/game.mjs';
import {nextLead} from '../server/opening.mjs';

const roles=['player','miyazaki','jiang','ishikawa','kato','emi'];
const started=(role='player',found=[])=>{const s=createGame(role);s.started=true;s.found.push(...found.filter(id=>!s.found.includes(id)));return s;};

test('hints teach public reactions without exposing private cards or changing the game',()=>{
 for(const role of roles){
  const s=started(role,['body']),before=JSON.stringify(s),lead=nextLead(s);
  assert.equal(lead.clue,'body');
  assert.ok(view(s).clues.some(c=>c.id===lead.clue));
  assert.match(lead.steps.join(' '),/在厅堂公开.*众人的反应.*追问/);
  const result=act(s,{type:'hint'});
  assert.ok(result.message.includes(lead.steps[1]));
  assert.doesNotMatch(result.message,/蛇形戒指|空药瓶|孪生|亡魂|毒茶|根茎|抹布|雾岛的书桌/);
  assert.equal(JSON.stringify(s),before);
 }
});

test('only discovered progress unlocks crafting, verification and final guidance',()=>{
 const s=started('player',['body']);s.publicReactions={body:{reactions:[]}};
 assert.equal(nextLead(s).tab,'opening');
 assert.doesNotMatch(JSON.stringify(nextLead(s)),/配方|面具|森川介/);
 s.found.push('recipe');assert.equal(nextLead(s).clue,'recipe');
 assert.match(nextLead(s).text,/材料是否收齐/);
 s.found.push('water','vaseline','clay','pendant');
 assert.equal(view(s).flags.canCombineMask,true);
 assert.match(nextLead(s).steps.join(' '),/按配方制作/);
 s.found.push('mask');assert.equal(nextLead(s).clue,'mask');
 assert.doesNotMatch(JSON.stringify(nextLead(s)),/孪生|雾岛|请森川介当面核实/);
 s.found.push('memory-pool');
 assert.equal(view(s).flags.canReveal,true);
 assert.equal(nextLead(s).tab,'case');assert.equal(nextLead(s).requiresHall,true);
 s.found.push('revealed','memory-ring','poison-book','cloth','miyazaki-statement','ishikawa-statement','emi-statement','cold-brazier','chronicle');
 assert.equal(view(s).flags.canAccuse,true);
 assert.match(nextLead(s).steps.join(' '),/向大家说明推断/);
 assert.doesNotMatch(JSON.stringify(nextLead(s)),/亡魂|毒茶|毒针|死因/);
});

test('an active question keeps the player in the existing conversation',()=>{
 const s=started('player',['body','mask','memory-pool']);
 s.investigation.challenge={actor:'jiang',focus:'昨夜的行踪'};
 const lead=nextLead(s);assert.equal(lead.action,'conversation');assert.equal(lead.actor,'jiang');
 assert.match(lead.steps.join(' '),/出示/);assert.equal(lead.requiresHall,undefined);
});
