import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGame,act,view} from '../server/suspect7/game.mjs';
import {VillaScene} from '../src/suspect7-scene.mjs';
import {roomAt} from '../shared/suspect7/spatial.mjs';
import {journey} from './suspect7-v1/journey.mjs';
function plan(s){const scene=Object.create(VillaScene.prototype);Object.assign(scene,{world:new THREE.Group(),cast:new Map(),mat:()=>new THREE.MeshBasicMaterial(),state:view(s),host:{dataset:{},dispatchEvent(){}}});scene.buildPlan(scene.state);scene.player={g:{position:scene.spawn(scene.state.scene)}};const occupied=[{x:scene.player.g.position.x,z:scene.player.g.position.z}];for(const person of scene.state.people){const room=scene.state.scene.rooms.find(r=>r.id===person.location),position=scene.spawn(room,occupied);scene.cast.set(person.id,{g:{position}});occupied.push({x:position.x,z:position.z});}return scene;}
const snapshots={};before(async()=>{const s=createGame();await journey(i=>act(s,i),{checkpoint:async ch=>{snapshots[ch]=structuredClone(s);}});});test('six chapters, all six viewpoints, preserved IDs and sealed spatial projection',async()=>{
 for(const route of ['andy','franklin','hongxue','vivian','chenxin','licha']){
  const s=createGame(route);await journey(input=>act(s,input),{checkpoint:async ch=>{if(route==='andy')snapshots[ch]=structuredClone(s);}});assert.equal(s.ending.score,100);
 }
 const initial=view(createGame());assert(!JSON.stringify(initial.scene).match(/secret|passage-room|"floor"/));
 const locked=snapshots[4],before=JSON.stringify(locked),v=view(locked);assert(!v.scene.rooms.some(r=>r.id==='secret'));assert(!v.scene.mapSpots.some(p=>p.room==='secret'));assert.throws(()=>act(locked,{type:'move',room:'secret'}));assert.equal(JSON.stringify(locked),before);
 const revealed=structuredClone(snapshots[5]);revealed.chapterId=4;revealed.room='secret';assert(view(revealed).scene.rooms.some(r=>r.id==='passage-room'&&!r.walkable));assert.throws(()=>act(revealed,{type:'move',room:'passage-room'}));
 act(snapshots[5],{type:'move',room:'passage-room'});assert.equal(snapshots[5].room,'passage-room');
 const legacy=structuredClone(snapshots[5]);legacy.version=1;legacy.room='activity';assert.equal(view(legacy).room,'meeting');assert.equal(legacy.room,'activity');assert.equal(view(legacy).notes,legacy.notes);
});
test('continuous doors and collision paths reach every room and every physical evidence object',async()=>{
 for(const ch of (process.env.MAP_CHECK_CHAPTERS||"1,2,4,5,6").split(",").map(Number)){
  let s=ch===1?createGame():snapshots[ch];assert(s,'checkpoint');
  if(ch===4){s=structuredClone(s);s.flags.unlocked=true;s.found.push('passage');s.room='attic';}
  const scene=plan(s),v=scene.state,start=scene.player.g.position;
  for(const r of v.scene.rooms.filter(r=>r.walkable)){
   const target=scene.spawn(r),path=scene.navigation.path(start,target);assert(path.length,`${ch}: path to ${r.id}`);
   let previous=start;for(const p of path){assert(scene.navigation.clear(previous,p),`${ch}: clear ${r.id}`);previous=p;}
  }
  for(const p of v.scene.mapSpots){assert(scene.approach(new THREE.Vector3(p.x,0,p.z),p.room,()=>{}),`${ch}: approach ${p.id}`);const last=scene.path.at(-1);assert.equal(roomAt(v.scene.rooms,last)?.id,p.room,`${ch}: evidence room ${p.id}`);}
  // East wing has one public exit, past the rest-room door. No dining/lounge shortcut.
  const east=v.scene.doors.filter(d=>(d.a==='landing3'||d.b==='landing3')&&['dining','lounge'].includes(d.a==='landing3'?d.b:d.a));assert.equal(east.length,0);
  scene.world.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 }
});
