import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,view,act} from '../server/suspect7/game.mjs';
import {routes,person} from '../shared/suspect7/cast.mjs';
import {newArchive,selectScript,menuView} from '../server/role-saves.mjs';
import {journey} from './suspect7-v1/journey.mjs';
import fs from 'node:fs';
import {comicRegions} from '../server/suspect7/comic-regions.mjs';
import {comicCropStyle} from '../src/storybook.mjs';

test('role selection names the initial character and withholds the later investigator',()=>{
 const archive=newArchive();selectScript(archive,'suspect7');
 for(const unlocked of [false,true]){
  archive.books.suspect7.unlocked=unlocked;
  const menu=menuView(archive,{});
  assert.deepEqual(menu.roles.map(r=>r.name),routes.map(r=>person(r.id).name));
  assert(menu.roles.every(r=>!('investigator' in r)&&!r.name.includes('→')));
 }
});

test('every illustrated panel excludes gutters and projects its measured source rectangle',()=>{
 for(const [file,regions] of Object.entries(comicRegions)){
  const png=fs.readFileSync(new URL('../public/art/'+file,import.meta.url));
  const w=png.readUInt32BE(16),h=png.readUInt32BE(20);
  assert.equal(regions.length,4);
  for(const [index,r] of regions.entries()){
   assert.equal(r.sourceWidth,w);assert.equal(r.sourceHeight,h);
   assert(r.x>0&&r.y>0&&r.x+r.width<w&&r.y+r.height<h);
   assert(index%2?r.x>w/2:r.x+r.width<w/2);
   assert(index>=2?r.y>h/2-25:r.y+r.height<h/2+25);
   const style=comicCropStyle(r),sizes=style.match(/background-size:([\d.]+)% ([\d.]+)%/),positions=style.match(/background-position:([\d.]+)% ([\d.]+)%/);
   const sourceLeft=Number(positions[1])/100*(w-w/(Number(sizes[1])/100));
   const sourceTop=Number(positions[2])/100*(h-h/(Number(sizes[2])/100));
   assert(Math.abs(sourceLeft-r.x)<.001);assert(Math.abs(sourceTop-r.y)<.001);
  }
 }
});

test('six recollections introduce their own background, then hand over without rewriting the earlier narrator',async()=>{
 for(const route of routes){
  const s=createGame(route.id),opening=view(s);
  assert.equal(opening.storyPages.length,8);
  assert(opening.storyPages[0].paragraphs.join('').includes('我是'+person(route.id).name));
  assert(opening.storyPages.every(p=>p.imageRegion&&!p.pictureUrl&&p.narrator===route.id));
  assert(opening.storyPages.flatMap(p=>p.paragraphs).join('').length>1000);
  assert.equal(opening.interludes.length,0);
  assert(!JSON.stringify(opening).includes('comic-chapter-5'));
  assert(!JSON.stringify(opening.storyPages).includes('洪羽瑞'));
  assert(!JSON.stringify(opening.storyPages).includes('修改手机时间'));
  const snapshots=[];
  await journey(input=>act(s,input),{checkpoint:chapter=>{
   const v=view(s),entry=v.interludes.find(p=>p.id==='chapter-'+chapter);
   if(entry){assert(entry.pages.every(p=>p.paragraphs.join('').length>50));snapshots.push(entry);}
   if(chapter===5){
    assert.equal(v.playerId,route.investigator);
    assert.equal(entry.pages[1].narrator,route.investigator);
    assert(entry.pages.slice(1,5).every(p=>p.image.includes('investigator-')&&p.imageRegion));
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
