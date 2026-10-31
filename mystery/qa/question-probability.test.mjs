import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../server/game.mjs';
import {maybeChallenge} from '../server/investigation.mjs';

const review={disclosures:[],contradiction:null};
const seeded=draw=>{
 const s=createGame();s.started=true;
 const output=BigInt(Math.floor(draw*2**32));
 s.investigation.rng=Number(((output-1013904223n)*4276115653n)&0xffffffffn);
 return s;
};

test('ordinary questions use the 25 percent threshold',()=>{
 for(const [draw,expected] of [[.20,true],[.249999,true],[.250001,false]]){
  const s=seeded(draw);maybeChallenge(s,'jiang',['player','jiang'],review);
  assert.equal(!!s.investigation.challenge,expected,`draw ${draw}`);
 }
});

test('pressure remains at 45 percent and ordinary cooldown still blocks questions',()=>{
 for(const [draw,expected] of [[.40,true],[.449999,true],[.450001,false]]){
  const s=seeded(draw);s.investigation.violations.push({audience:['jiang']});
  maybeChallenge(s,'jiang',['player','jiang'],review);
  assert.equal(!!s.investigation.challenge,expected,`pressure draw ${draw}`);
 }
 const s=seeded(.20);s.investigation.cooldown=4;
 maybeChallenge(s,'jiang',['player','jiang'],review);
 assert.equal(s.investigation.challenge,null);
});
