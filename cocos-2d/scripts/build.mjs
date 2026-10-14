import {syncWebComponent} from './sync-web-component.mjs';
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,createWriteStream,readFileSync,readdirSync,copyFileSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const editor=process.env.COCOS_CREATOR||path.join(homedir(),'Applications/CocosCreator-3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator');
if(!existsSync(editor))throw new Error('找不到 Cocos Creator 3.8.8，请设置 COCOS_CREATOR 为编辑器可执行文件路径');
const target=process.argv[2]||'web';
if(!['web','wechat'].includes(target))throw new Error('构建目标只支持 web 或 wechat');
mkdirSync(path.join(root,'qa'),{recursive:true});
const log=createWriteStream(path.join(root,'qa',`build-${target}.log`));
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(editor,['--project',root,'--build',`configPath=${path.join(root,`build-${target}.json`)};`],{cwd:root,env,stdio:['ignore','pipe','pipe']});
child.stdout.pipe(log);child.stderr.pipe(log);
console.log(`Cocos Creator is building ${target}. Log: cocos-2d/qa/build-${target}.log`);
child.on('error',e=>{console.error(e.message);process.exitCode=1;});
child.on('close',code=>{
  log.end();console.log(`Cocos Creator exited with ${code}`);
  if(code!==36&&code!==0){process.exitCode=1;return;}
  try{
    const dir=path.join(root,'build',target==='web'?'web-mobile':'wechatgame','assets','main');
    const file=readdirSync(dir).find(n=>/^config(?:\.[a-z0-9]+)?\.json$/.test(n));
    const config=JSON.parse(readFileSync(path.join(dir,file),'utf8'));
    if(!Object.hasOwn(config.scenes||{},'db://assets/scenes/CafeStreet.scene'))throw new Error('构建没有包含 CafeStreet 场景');
    if(target==='web'){
      syncWebComponent(root);
      const output=path.join(root,'build/web-mobile'),assets=path.join(output,'lpc');mkdirSync(assets,{recursive:true});
      copyFileSync(path.join(root,'legal/lpc-credits.html'),path.join(output,'lpc-credits.html'));
      for(const name of ['lpc-world.png','lpc-people.png','lpc-art.json'])copyFileSync(path.join(root,'assets/resources',name),path.join(assets,name));
      copyFileSync(path.join(root,'legal/CHARACTERS-USED.csv'),path.join(assets,'CHARACTERS-USED.csv'));
    }
    console.log('Verified: CafeStreet scene and LPC attribution are included in the Cocos build.');
  }catch(error){console.error(error.message);process.exitCode=1;}
});
