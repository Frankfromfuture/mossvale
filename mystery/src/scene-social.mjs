import {dialogueMood} from './character-expression.mjs';
import {playerId} from '../shared/player.mjs';
import * as THREE from 'three';
import {homeSeat,cornerSeats} from '../shared/hall-seating.mjs';
import {hallActivity} from '../shared/hall-activities.mjs';
const idleActions={player:'合上手记，抬眼看向对方',miyazaki:'拢好袖口，向对方轻轻颔首',jiang:'搓了搓手，抬头看向对方',ishikawa:'停下笔，目光从纸页上移开',kato:'整理了一下袖口，侧过脸',emi:'把披肩拢紧，安静地望向对方'};
export class SceneSocial{
 constructor(scene){
  this.scene=scene;this.options=[];this.current=null;this.paused=false;this.wait=3+Math.random()*3;this.queue=[];this.nextModelAt=Date.now()+12000;this.lookWait=4;this.participation=new Map();this.round=0;
  this.bubble=scene.label('',new THREE.Vector3(),'ambient-bubble natural-text',null);this.bubble.el.hidden=true;
  this.bubble.el.setAttribute('role','status');this.bubble.el.setAttribute('aria-live','polite');
 }
 setState(state){
  const signature=[state.slotToken,state.playerId,state.room,state.phase,!!state.ending,JSON.stringify(state.chatSetting),...state.people.map(p=>p.id+':'+p.location)].join('|');
  if(signature!==this.signature){this.cancel();this.queue=[];this.signature=signature;this.wait=3+Math.random()*3;this.participation.clear();this.round=0;}
  this.options=state.interactions||[];
 }
 setPaused(value){this.paused=value;if(value)this.bubble.el.hidden=true;}
 enqueue(event){if(event&&this.scene.current?.room==='hall'&&event.pair.every(id=>this.scene.actors.get(id)?.g.visible)&&!event.pair.includes(this.scene.current.chatSetting?.actor)){this.queue=[event];}}
 cancel(){
  if(this.current)for(const id of this.current.pair){const a=this.scene.actors.get(id);a.gesture='idle';a.rig.task=null;a.rig.gazeYaw=0;a.label.el.textContent=a.name;delete a.label.el.dataset.activity;if(a.pathKind==='social'){a.path=[];if(a.g.visible&&this.scene.current?.room==='hall')this.scene.sitActor(id,homeSeat(id).id,false,'social');}}
  this.current=null;this.bubble.el.hidden=true;this.scene.host.dataset.social='idle';
 }
 localEvent(){
  const preferPrivate=Math.random()<.18,preferred=this.options.filter(e=>(e.scope==='private')===preferPrivate&&e.id!==this.lastTemplate),choices=preferred.length?preferred:this.options;
  const score=e=>Math.max(...e.pair.map(id=>this.participation.get(id)||0)),oldest=Math.min(...choices.map(score)),rested=choices.filter(e=>score(e)===oldest);
  const option=rested[Math.floor(Math.random()*rested.length)];if(!option)return null;
  const scope=option.scope||'public',silent=scope==='public'&&Math.random()<.25;
  const station=hallActivity(option);
  return {id:'local-'+Date.now(),template:option.id,station:option.station,pair:option.pair,scope,zone:scope==='private'?(this.scene.current.chatSetting?.zone==='left'?'right':option.zone||'left'):'table',activity:option.activity,source:'local',lines:option.pair.map((id,i)=>({actor:id,action:station?.actions[i]||idleActions[id],speech:scope==='private'||silent?'':option.lines.find(l=>l[0]===id)?.[1]||'',gesture:station?.gestures[i]||(silent?'glance':i?'nod':'talk')}))};
 }
 start(){
  const event=this.queue.shift()||this.localEvent();if(!event)return;this.current=event;this.lastTemplate=event.template;this.stage='approach';this.elapsed=0;this.line=-1;this.station=hallActivity(event);this.round++;
  for(const [i,id]of event.pair.entries()){
   const a=this.scene.actors.get(id);this.participation.set(id,this.round);
   if(this.station)this.scene.setActorPath(id,this.station.spots[i],'hall','social');
   else{const seat=event.scope==='private'?cornerSeats(event.zone)[i]:homeSeat(id);this.scene.sitActor(id,seat.id,false,'social');}
   a.label.el.dataset.activity=event.scope==='private'?'低声交谈':event.activity;
   a.label.el.textContent=a.name+' · '+(event.scope==='private'?'低声交谈':event.activity);
  }
  this.scene.host.dataset.social=event.template;this.scene.host.dataset.socialScope=event.scope;
 }
 returnHome(){
  this.bubble.el.hidden=true;this.stage='return';this.elapsed=0;
  for(const id of this.current.pair){const actor=this.scene.actors.get(id);actor.gesture='idle';actor.rig.gazeYaw=0;this.scene.sitActor(id,homeSeat(id).id,false,'social');}
 }
 glance(dt){
  this.lookWait-=dt;if(this.lookWait>0)return;this.lookWait=5+Math.random()*6;
  const seated=[...this.scene.actors.values()].filter(a=>a.g.visible&&a.seat&&a.rig.id!==playerId(this.scene.current));
  if(seated.length<2)return;const a=seated[Math.floor(Math.random()*seated.length)],others=seated.filter(b=>b!==a),b=others[Math.floor(Math.random()*others.length)];
  this.scene.faceActor(a,b.g.position,.4);a.gesture='glance';if(Math.random()<.45)this.scene.faceActor(b,a.g.position,.4);
 }
 tick(dt){
  if(this.paused||!this.options.length){this.bubble.el.hidden=true;return;}
  if(!this.current){
   this.glance(dt);
   if([...this.scene.actors.values()].some(a=>a.g.visible&&this.scene.moving(a)))return;
   this.wait-=dt;
   if(this.wait<8&&!this.queue.length&&Date.now()>=this.nextModelAt&&this.onNeedEvent){this.nextModelAt=Date.now()+100000;this.onNeedEvent();}
   if(this.wait<=0)this.start();return;
  }
  this.elapsed+=dt;
  if(this.stage==='approach'||this.stage==='return'){
   if(this.current.pair.some(id=>this.scene.moving(this.scene.actors.get(id)))){if(this.stage==='approach'&&this.elapsed>45)this.returnHome();return;}
   if(this.stage==='return'){this.cancel();this.wait=5+Math.random()*6;return;}
   if(this.station&&this.current.pair.some((id,i)=>{const p=this.scene.actors.get(id).g.position,q=this.station.spots[i];return Math.hypot(p.x-q.x,p.z-q.z)>.35;})){this.returnHome();return;}
   this.stage='talk';this.elapsed=0;
  }
  if(this.stage==='use'){
   for(const [i,id]of this.current.pair.entries()){const actor=this.scene.actors.get(id);this.scene.faceActor(actor,this.station.at,dt);actor.gesture=this.station.gestures[i];if(id==='jiang'&&this.current.station==='tea')actor.rig.task='tea';}
   if(this.elapsed>=7)this.returnHome();return;
  }
  const [a,b]=this.current.pair.map(id=>this.scene.actors.get(id));this.scene.faceActor(a,b.g.position,dt);this.scene.faceActor(b,a.g.position,dt);
  const index=Math.floor(this.elapsed/6.5);
  if(index>=this.current.lines.length){this.bubble.el.hidden=true;if(this.station){this.stage='use';this.elapsed=0;}else this.returnHome();return;}
  const line=this.current.lines[index],actor=this.scene.actors.get(line.actor);
  if(index!==this.line){actor.rig.mood=dialogueMood('（'+line.action+'）'+(this.current.scope==='private'?'':line.speech));this.bubble.el.textContent=actor.name+'（'+line.action+'）'+(this.current.scope==='private'?'':line.speech);this.line=index;for(const id of this.current.pair)this.scene.actors.get(id).gesture=id===line.actor?line.gesture:'listen';}
  this.bubble.el.hidden=false;this.bubble.actor=line.actor;
 }
}
