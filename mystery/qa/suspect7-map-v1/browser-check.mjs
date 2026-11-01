import {chromium} from '/Users/frankfan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import * as THREE from 'three';
import assert from 'node:assert/strict';
const qa=JSON.parse(await readFile('/tmp/mossvale-map-qa.json','utf8')),browser=await chromium.connect((await readFile('/tmp/mossvale-map-browser.txt','utf8')).trim()),dir='output/playwright/suspect7-map-v1';await mkdir(dir,{recursive:true});
const report={steps:[],errors:[],realModelCalls:0,realVoiceCalls:0,screenshots:[]};let page,context;
const stage=process.env.MAP_RESUME||'desktop';
if(stage!=='desktop'){const old=JSON.parse(await readFile('mystery/qa/suspect7-map-v1/browser-verification.json'));report.steps=old.steps;report.screenshots=old.screenshots;}
const b=name=>page.getByRole('button',{name,exact:true}),action=name=>page.locator('[data-s7="'+name+'"]');
async function shot(name){const path=dir+'/'+name+'.png';await page.screenshot({path});report.screenshots.push(path);}
async function open(id,viewport){context=await browser.newContext({viewport});await context.addCookies([{name:'mystery_sid',value:qa.ids[id],url:qa.url}]);await context.addInitScript(()=>localStorage.setItem('mystery-read','0'));page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>report.errors.push(e.message));await page.goto(qa.url);await page.locator('#continue-progress').click();if(id!=='legacy')await b('继续调查').click();}
const close=()=>page.locator('.s7-overlay [data-s7="close"]').click();
const state=async()=>(await context.request.get(qa.url+'/api/state')).json();
async function move(room){await b('地图').click();await page.locator('.s7-room-map [data-room="'+room+'"]').click();await page.waitForFunction(id=>document.querySelector('.s7-scene')?.dataset.room===id,room);}
async function inspect(id){await b('物件').click();await page.locator('[data-s7="inspect"][data-id="'+id+'"]').click();await action('compare').waitFor();await close();}
try{
 if(stage==='desktop'){
  await open('fresh',{width:1280,height:900});await page.locator('.s7-scene canvas').evaluate(el=>el.dataset.qaIdentity='same-canvas');
  const cam=new THREE.OrthographicCamera(-16,16,11.25,-11.25,.1,250);cam.position.set(22,32,47.5);cam.lookAt(0,0,11.5);cam.updateMatrixWorld();const pt=new THREE.Vector3(1.1,1,8).project(cam);
  await page.locator('.s7-scene canvas').click({position:{x:(pt.x+1)*640,y:(1-pt.y)*450}});await page.getByRole('heading',{name:'餐厅里的专用手机',exact:true}).waitFor();assert((await state()).evidence.some(e=>e.id==='phone'));await close();
  await move('kitchen');assert.equal(await page.locator('.s7-scene canvas').getAttribute('data-qa-identity'),'same-canvas');await inspect('kitchen');await move('landing');await inspect('exit');await inspect('stairs');await move('rest');await shot('01-desktop-room');
  await b('地图').click();assert.equal(await page.locator('[data-s7="floor"]').count(),0);assert.equal(await page.locator('.s7-plan [data-room="secret"]').count(),0);await shot('02-desktop-map');await close();await page.reload();await page.locator('#continue-progress').click();await b('继续调查').click();assert.equal((await state()).room,'rest');report.steps.push('Desktop: physical phone pick, kitchen → foyer → rest room walking, same canvas, closed secret projection, refreshed room retained');await context.close();
 }
 if(['desktop','mobile'].includes(stage)){
  await open('locked',{width:390,height:844});await inspect('keypad');await move('study');await inspect('photo');await inspect('measure');await b('物件').click();await b('核对内外尺寸').click();await page.getByRole('heading',{name:'核对内外尺寸',exact:true}).waitFor();await shot('03-mobile-measure');await close();await move('attic');await b('物件').click();await b('输入七位密码').click();await page.locator('#s7-password').fill('9426936');await b('开锁').click();await page.waitForFunction(()=>!document.querySelector('.s7-overlay .paper-modal'));await move('secret');await inspect('passage');
  const v=await state();assert(v.scene.rooms.some(r=>r.id==='passage-room'&&!r.walkable));assert(!v.places.some(r=>r.id==='passage-room'));await b('地图').click();await shot('04-mobile-map');assert.equal(await page.locator('.s7-plan [data-room="passage-room"]').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('.s7-paper-body').evaluate(e=>e.scrollTop=e.scrollHeight);const offsets=await page.evaluate(()=>{const a=document.querySelector('.s7-paper').getBoundingClientRect(),b=document.querySelector('.s7-overlay .paper-window-frame').getBoundingClientRect();return [b.left-a.left,b.top-a.top,a.right-b.right,a.bottom-b.bottom].map(Math.round);});assert.deepEqual(offsets,[10,10,10,10]);await b('俯看整栋建筑').click();await shot('05-mobile-overview');
  report.steps.push('390×844: linked room navigation, exterior/interior measurement, keypad unlock, secret-room visit, sealed passage display, map scrolling/frame, no horizontal overflow');await context.close();
 }
 if(['desktop','mobile','full'].includes(stage)){
  await open('full',{width:1280,height:900});await b('地图').click();await b('俯看整栋建筑').click();await shot('06-full-building');await move('passage-room');await move('pool');assert.equal((await state()).room,'pool');await shot('07-pool');report.steps.push('Investigation: activity room becomes meeting room, police-open passage connects secret room with pool, whole-building overview');await context.close();
 }
 await open('legacy',{width:1280,height:900});await page.locator('#hud').waitFor();assert.equal(await page.locator('#suspect7').count(),0);const original=await state();assert.equal(original.notes,'第一部旧档地图回归');await page.locator('[data-action="map"]').click();await shot('08-first-case-map');assert.equal((await state()).notes,original.notes);report.steps.push('First-case regression: original map opens, legacy notes retained; independent slot/token roundtrip also passed in targeted unit check');await context.close();
 assert.equal(report.errors.length,0);report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;if(page&&!page.isClosed())await shot('failure');process.exitCode=1;}
finally{await writeFile('mystery/qa/suspect7-map-v1/browser-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
