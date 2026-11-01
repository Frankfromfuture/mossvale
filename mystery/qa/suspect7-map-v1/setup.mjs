import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {newArchive} from '../../server/role-saves.mjs';
import {createGame,act} from '../../server/suspect7/game.mjs';
import {createGame as firstGame} from '../../server/game.mjs';
import {journey} from '../suspect7-v1/journey.mjs';
const dir=await mkdtemp('/tmp/mossvale-map-qa-'),url='http://127.0.0.1:4437',ids={fresh:'a'.repeat(32),locked:'b'.repeat(32),full:'c'.repeat(32),legacy:'d'.repeat(32)},states={fresh:createGame()};states.fresh.started=true;
const s=createGame();await journey(i=>act(s,i),{checkpoint:async ch=>{if(ch===4)states.locked=structuredClone(s);if(ch===5)states.full=structuredClone(s);}});
for(const name of ['fresh','locked','full']){const archive=newArchive();archive.activeScript='suspect7';archive.books.suspect7.active='andy';archive.books.suspect7.slots.andy=states[name];await writeFile(dir+'/'+ids[name]+'.json',JSON.stringify(archive));}
const first=firstGame('player');first.started=true;first.notes='第一部旧档地图回归';await writeFile(dir+'/'+ids.legacy+'.json',JSON.stringify({format:'six-roles-v1',active:'player',slots:{player:first},tokens:{player:'legacy-token'},menuToken:'legacy-menu',bestScore:62}));
await writeFile(dir+'/voice-disabled.json','{}');
const child=spawn(process.execPath,['mystery/server/main.mjs'],{detached:true,env:{...process.env,PORT:'4437',MYSTERY_DATA_DIR:dir,DEEPSEEK_API_KEY:'',DASHSCOPE_API_KEY:'',MYSTERY_QWEN_CONFIG:dir+'/voice-disabled.json'},stdio:['ignore','pipe','pipe']});child.stderr.on('data',b=>process.stderr.write(b));await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);});
await writeFile('/tmp/mossvale-map-qa.json',JSON.stringify({dir,url,ids,pid:child.pid}));child.unref();child.stdout.destroy();child.stderr.destroy();console.log(JSON.stringify({url,pid:child.pid,dir}));
