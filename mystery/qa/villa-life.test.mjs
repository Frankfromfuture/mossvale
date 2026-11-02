import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SceneSocial} from '../src/scene-social.mjs';
import {TownScene} from '../src/scene.mjs';
import {villaContent} from '../src/suspect7-content.mjs';
import {createGame,act,view,converse,actorContext} from '../server/suspect7/game.mjs';
import {caseInteractions,generateCaseAmbient,commitCaseAmbient} from '../server/suspect7/social.mjs';
import {villaStations} from '../shared/suspect7/activities.mjs';

function plan(s){
 const v=view(s),definition=villaContent(v),scene=Object.create(TownScene.prototype),element=()=>({dataset:{},append(){},setAttribute(){}});
 Object.assign(scene,{definition,current:v,layoutRooms:definition.rooms,layoutCast:definition.cast,actors:new Map(),layoutBounds:definition.bounds,seats:definition.seats,scene:new THREE.Group(),mat:()=>new THREE.MeshBasicMaterial(),host:{dataset:{}},captureObstacles:true,obstacleMeshes:[],wallObstacles:[],interiors:new Map(),shells:new Map(),placeLabels:new Map(),props:new Map(),clickable:[],labels:element(),label:()=>({el:element()})});
 definition.architecture(scene);scene.captureObstacles=false;const previous=globalThis.document;globalThis.document={createElement:element};try{definition.evidence(scene);}finally{globalThis.document=previous;}scene.buildNavigation();return scene;
}
test('lounge visitors and four activities stay local; private replies and stale events keep their audience',async()=>{
 const s=createGame();act(s,{type:'begin'});act(s,{type:'move',room:'lounge'});
 let v=view(s);assert.equal(v.people.filter(p=>p.near).length,4);assert.equal(v.publicRoom,'dining');assert.equal(villaContent(v).publicRoom,'lounge');
 assert.equal(new Set(v.interactions.map(e=>e.station)).size,4);assert(v.interactions.every(e=>e.pair.every(id=>id!==s.playerId&&v.people.find(p=>p.id===id).near)));
 const event=await generateCaseAmbient(s,null,()=>0);assert(commitCaseAmbient(s,event));assert.equal(event.usage.calls,0);
 const visitor=v.people.find(p=>p.near&&p.id!==s.playerId).id,witness=v.people.find(p=>p.near&&p.id!==s.playerId&&p.id!==visitor).id,absent=v.people.find(p=>!p.near).id;
 await converse(s,{actor:visitor,message:'先坐一会儿吧。'},async()=>({speech:'好，我在这里歇一会儿。',factIds:[]}));
 act(s,{type:'gather'});v=view(s);assert(v.people.every(p=>p.near));assert(!commitCaseAmbient(s,event));for(const id of [absent,witness])assert(!actorContext(s,id,'刚才聊了什么').conversation.some(l=>l.text==='好，我在这里歇一会儿。'));
 s.chapterId=5;s.playerId='wuquan';s.room='meeting';v=view(s);assert.equal(v.people.length,11);assert.equal(new Set(caseInteractions(s).map(e=>e.station)).size,4);assert(!caseInteractions(s).some(e=>e.pair.includes('wuquan')));
});
test('daily objects leave real doors, evidence, seats and both activity spots reachable',()=>{
 const errors=[];
 for(const room of ['lounge','meeting','dining']){
  if(process.env.LIFE_ROOM&&room!==process.env.LIFE_ROOM)continue;const s=createGame();s.started=true;s.room=room;if(room==='meeting'){s.chapterId=5;s.playerId='wuquan';}
  const scene=plan(s),r=scene.getRoom(room),area=scene.roomArea(room),start=scene.navigation.nearest({x:r.x,z:r.z},[],area);
  const inspect=(p,label,ignore)=>{if(!scene.navigation.free(p,[],ignore))errors.push(label+' occupied');else if(!scene.navigation.path(start,p).length)errors.push(label+' unreachable');};
  for(const [id,station]of Object.entries(villaStations(r)))if(caseInteractions(s).some(e=>e.station===id))for(const [i,p]of station.spots.entries())inspect(p,room+' '+id+' '+i);
  for(const seat of scene.seats)inspect(seat.approach,room+' '+seat.id,seat.id);
  for(const door of scene.definition.doors.filter(d=>d.a===room||d.b===room))inspect(door,room+' doorway');
  const lighter=scene.props.get('lighter');if(lighter){const p=scene.navigation.nearest(lighter.g.position,[],scene.roomArea('lounge'));if(!scene.navigation.path(start,p).length)errors.push(room+' lighter unreachable '+JSON.stringify({start,p}));}
  if(room!=='dining'){
   scene.buildPeople();for(const [id,a]of scene.actors){a.g.visible=scene.current.people.find(p=>p.id===id)?.near;if(a.g.visible)scene.sitActor(id,scene.homeSeat(id).id,true);}
   scene.social=new SceneSocial(scene);scene.social.options=scene.current.interactions;scene.social.nextModelAt=Infinity;
   for(const station of new Set(scene.current.interactions.map(e=>e.station))){
    if(process.env.LIFE_STATION&&station!==process.env.LIFE_STATION)continue;const e=scene.current.interactions.find(e=>e.station===station),activity=scene.definition.activity(e);
    scene.social.queue=[{...e,template:e.id,lines:e.pair.map((id,i)=>({actor:id,action:activity.actions[i],speech:e.lines[i][1],gesture:activity.gestures[i]}))}];scene.social.start();
    let used=false,frames=0;while(scene.social.current&&frames++<1600){scene.social.tick(.1);if(scene.social.stage==='use')used=true;for(const [id,a]of scene.actors)if(a.g.visible)scene.moveActor(id,a,.1);}
    if(!used||scene.social.current)errors.push(room+' '+station+' cycle '+JSON.stringify({used,stage:scene.social.stage,actors:e.pair.map(id=>{const a=scene.actors.get(id);return {id,x:a.g.position.x,z:a.g.position.z,seat:a.seat?.id,moving:scene.moving(a)};})}));
   }
  }
  scene.scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 }
 assert.deepEqual(errors,[]);
});
