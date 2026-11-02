import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,view,act} from '../server/suspect7/game.mjs';
import {routes,person} from '../shared/suspect7/cast.mjs';
import {newArchive,selectScript,menuView} from '../server/role-saves.mjs';
import {journey} from './suspect7-v1/journey.mjs';

test('role selection names the initial character and withholds the later investigator',()=>{
 const archive=newArchive();selectScript(archive,'suspect7');
 for(const unlocked of [false,true]){
  archive.books.suspect7.unlocked=unlocked;
  const menu=menuView(archive,{});
  assert.deepEqual(menu.roles.map(r=>r.name),routes.map(r=>person(r.id).name));
  assert(menu.roles.every(r=>!('investigator' in r)&&!r.name.includes('→')));
 }
});

test('six recollections introduce their own background, then hand over without rewriting the earlier narrator',async()=>{
 for(const route of routes){
  const s=createGame(route.id),opening=view(s);
  assert.equal(opening.storyPages.length,8);
  assert(opening.storyPages[0].paragraphs.join('').includes(person(route.id).name));
  assert(opening.storyPages.flatMap(p=>p.paragraphs).join('').length>1000);
  assert.equal(opening.interludes.length,0);
  assert(!JSON.stringify(opening).includes('comic-chapter-5'));
  assert(!JSON.stringify(opening.storyPages).includes('洪羽瑞'));
  assert(!JSON.stringify(opening.storyPages).includes('修改手机时间'));
  const snapshots=[];
  await journey(input=>act(s,input),{checkpoint:chapter=>{
   const v=view(s),entry=v.interludes.find(p=>p.id==='chapter-'+chapter);
   if(entry){assert(entry.pages.every(p=>p.paragraphs.length>=2));snapshots.push(entry);}
   if(chapter===5){
    assert.equal(v.playerId,route.investigator);
    assert.deepEqual(v.storyPages,opening.storyPages);
    assert.match(entry.pages[1].paragraphs.join(''),new RegExp(person(route.investigator).name));
    assert.equal(v.interludes.find(p=>p.id==='chapter-2').pages[2].foot,person(route.id).name+'的回忆');
    assert(!v.interludes.some(p=>p.id==='chapter-6'));
   }
  }});
  assert.equal(snapshots.length,5);
  const closed=view(s).interludes.at(-1);
  assert.equal(closed.id,'case-closed');
  assert(closed.pages.every(p=>p.paragraphs.length>=2));
  assert(closed.pages[0].paragraphs.join('').includes('洪羽瑞'));
 }
});
