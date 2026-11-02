import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame as newGame,act,view,shareEvidence,actorContext} from '../../server/suspect7/game.mjs';
import {generateAmbient,commitAmbient} from '../../server/ambient.mjs';
import {createInterludeQueue} from '../../src/interludes.mjs';
import {journey} from '../suspect7-v1/journey.mjs';

test('shared interludes keep read history across the investigator token rotation',()=>{
 const values=new Map(),q=createInterludeQueue({getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)});q.update('suspect',[]);q.update('suspect',[{id:'chapter-2'}]);assert.equal(q.next().id,'chapter-2');q.finish('chapter-2');q.update('investigator',[{id:'chapter-2'},{id:'chapter-5'}],{inherit:true});assert.equal(q.next().id,'chapter-5');q.finish('chapter-5');assert(!q.next());q.update('legacy',[{id:'old-unseen'}]);assert(!q.next());
});
test('illustrations and chapters follow current knowledge, including color testimony',async()=>{
 const s=createGame();act(s,{type:'begin'});act(s,{type:'move',room:'dining'});act(s,{type:'inspect',id:'phone'});let v=view(s);assert(v.clues.every(e=>e.imageRegion||e.imageUrl));assert.equal(v.storyPages.length,8);assert.equal(v.interludes.length,0);assert(!JSON.stringify(v).includes('comic-chapter-6'));await journey(input=>act(s,input),{stopAt:5});v=view(s);assert(v.clues.every(e=>e.imageRegion||e.imageUrl));assert.equal(v.people.length,11);assert(v.people.every(p=>p.portraitUrl));assert.equal(v.scene.spots.length,7);assert(v.scene.spots.every(p=>p.imageRegion));assert.equal(v.investigation.budget,null);assert.match(v.records.find(r=>r.evidence==='carpet').text,/灰色/);assert(!v.records.find(r=>r.evidence==='carpet').text.includes('红色'));s.chapterId=2;s.playerId='andy';s.room='chapel';v=view(s);assert(!v.clues.find(e=>e.id==='carpet').text.includes('红色'));assert.equal(v.clues.find(e=>e.id==='carpet').imageRegion.x,250.8);
});
test('shared public reactions and ambient memory use actual listeners and retry only failures',async()=>{
 const s=createGame();act(s,{type:'begin'});act(s,{type:'inspect',id:'phone'});let calls=0;await shareEvidence(s,{id:'phone'},async c=>{calls++;assert.equal(c.kind,'public-reaction');return {action:'看了一眼手机',speech:'先把这件事记下来。',factIds:[]}});assert.equal(calls,5);assert(s.publicReactions.phone.reactions.every(r=>r.status==='done'));await shareEvidence(s,{id:'phone'},()=>{throw Error('duplicate')});assert(actorContext(s,'hongxue','刚才大家说了什么').conversation.some(l=>l.text.includes('记下来')));act(s,{type:'private-corner',actor:'hongxue'});const event=await generateAmbient(s,null);assert(!event.pair.includes('hongxue'));assert(commitAmbient(s,event));const last=s.chatLog.at(-1);assert(!last.audience.includes('hongxue'));assert(!last.audience.includes('andy'));
});

// These pre-dialogue fixtures retain the original action-based investigation.
function createGame(...args){const s=newGame(...args);s.dialogue.legacyThrough=6;return s;}
