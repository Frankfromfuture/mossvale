import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,createWriteStream,readFileSync,readdirSync,copyFileSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const editor=process.env.COCOS_CREATOR||path.join(homedir(),'Applications/CocosCreator-3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator');
if(!existsSync(editor))throw new Error('找不到 Cocos Creator 3.8.8');
// Geometry contracts stay byte-identical to the 2D rules source; no save is copied.
for(const name of ['town-layout.json','object-catalog.json'])copyFileSync(path.join(root,'../cocos-2d/assets/resources',name),path.join(root,'assets/resources',name));
mkdirSync(path.join(root,'qa'),{recursive:true});
const log=createWriteStream(path.join(root,'qa/build-web.log'));const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(editor,['--project',root,'--build',`configPath=${path.join(root,'build-web.json')};`],{cwd:root,env,stdio:['ignore','pipe','pipe']});child.stdout.pipe(log);child.stderr.pipe(log);
console.log('Building the independent living 3D Web client; log: cocos-town3d/qa/build-web.log');
child.on('error',e=>{console.error(e.message);process.exitCode=1;});
child.on('close',code=>{log.end();if(code!==36&&code!==0){console.error(`Build failed (${code})`);process.exitCode=1;return;}
 try{const output=path.join(root,'build/web-mobile'),dir=path.join(output,'assets/main'),file=readdirSync(dir).find(n=>/^config(?:\.[a-z0-9]+)?\.json$/.test(n)),config=JSON.parse(readFileSync(path.join(dir,file),'utf8'));if(!Object.hasOwn(config.scenes||{},'db://assets/scenes/CafeStreet.scene'))throw new Error('Missing scene');
 for(const name of ['credits.html','modes.html','Kenney-CC0.txt'])copyFileSync(path.join(root,'legal',name),path.join(output,name));
 console.log('Built living 3D, verified scene and copied model attribution/mode links.');}catch(e){console.error(e.message);process.exitCode=1;}});
