import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,act,view} from '../server/game.mjs';

const ready=()=>{const s=createGame();s.started=true;s.found.push('body');return s;};
const conduct=s=>view(s).investigation.scores.find(r=>r.id==='conduct').value;

test('forced entry, room search and personal search apply the stronger penalties once',()=>{
 const entry=ready(),request={type:'travel',room:'ishikawa',force:true,requestId:'entry-cost-v2'};
 act(entry,request);assert.equal(entry.investigation.penalties[0].points,5);
 act(entry,request);assert.equal(entry.investigation.penalties.length,1);
 act(entry,{type:'inspect',id:'recipe',force:true,requestId:'search-cap-v2'});
 assert.equal(conduct(entry),0);assert.equal(entry.investigation.penalties[1].points,5);

 const search=ready();act(search,{type:'entry-permission',actor:'ishikawa'});act(search,{type:'travel',room:'ishikawa'});
 const forced={type:'inspect',id:'recipe',force:true,requestId:'search-cost-v2'};
 act(search,forced);assert.equal(search.investigation.penalties[0].points,8);
 const before=JSON.stringify(search.investigation);act(search,forced);assert.equal(JSON.stringify(search.investigation),before);

 const personal=ready();act(personal,{type:'force-personal',actor:'jiang'});
 assert.equal(personal.investigation.penalties[0].points,10);assert.equal(conduct(personal),0);
 assert.ok(!personal.found.includes('jiang-token'));

 const item=ready();act(item,{type:'entry-permission',actor:'jiang'});act(item,{type:'travel',room:'jiang'});item.positions.jiang='jiang';
 act(item,{type:'inspect',id:'jiang-token',force:true});assert.equal(item.investigation.penalties[0].points,10);
 assert.ok(!item.found.includes('jiang-token'));
});

test('consensual search remains penalty-free and historical deductions keep their values',()=>{
 const s=ready();act(s,{type:'search-permission',actor:'ishikawa'});act(s,{type:'travel',room:'ishikawa'});act(s,{type:'inspect',id:'recipe'});
 assert.equal(conduct(s),10);assert.equal(s.investigation.minutes,4);assert.ok(s.found.includes('recipe'));
 s.investigation.penalties.push({id:'old-entry',category:'conduct',points:2,reason:'旧版进入记录',key:'old-entry',minute:0});
 const restored=JSON.parse(JSON.stringify(s));assert.equal(conduct(restored),8);assert.equal(restored.investigation.penalties[0].points,2);
});
