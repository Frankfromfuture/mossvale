import {app,safeStorage} from 'electron';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {readFile,readdir,stat} from 'node:fs/promises';
import {mkdirSync} from 'node:fs';
const root=path.resolve(import.meta.dirname,'..'),profile=path.join(app.getPath('appData'),'Mossvale Cloud Deploy');
app.dock?.hide();mkdirSync(profile,{recursive:true});app.setPath('userData',profile);app.setPath('sessionData',profile);
app.whenReady().then(async()=>{
 let stage='read-provider';
 try{
  const brizo=path.resolve(root,'../Brizo');
  const {createModelGuard,withKnownProviderDefaults}=await import(pathToFileURL(path.join(brizo,'electron/secret-store.mjs')));
  const guard=createModelGuard({storePath:()=>path.join(app.getPath('appData'),'Brizo','model-guard.json'),safeStorage});
  const stored=(await guard.readStore()).providers.find(p=>/deep\s*seek/i.test(p.name));if(!stored)throw Error('configuration');const p=withKnownProviderDefaults(stored),apiKey=guard.decryptKey(stored);if(!apiKey)throw Error('configuration');
  stage='read-jev';const local=createModelGuard({storePath:()=>path.join(app.getPath('appData'),'Mossvale 2D Trial Service','model-guard.json'),safeStorage}),store=await local.readStore(),useLocal=!!store.services?.jev?.encryptedKey,jevGuard=useLocal?local:guard,jevStore=useLocal?store:await guard.readStore();
  const jevKey=await jevGuard.readServiceKey('jev');if(!jevKey)throw Error('configuration');
  stage='read-save';const names=(await readdir(path.join(root,'.data-cocos-2d'))).filter(n=>/^[a-f0-9]{48}\.json$/.test(n)),ranked=await Promise.all(names.map(async name=>({name,mtime:(await stat(path.join(root,'.data-cocos-2d',name))).mtimeMs})));ranked.sort((a,b)=>b.mtime-a.mtime);if(!ranked.length)throw Error('save');
  const townToken=ranked[0].name.slice(0,-5);JSON.parse(await readFile(path.join(root,'.data-cocos-2d',ranked[0].name),'utf8'));
  const payload=JSON.stringify({deepseek:{apiKey,baseUrl:p.baseUrl,model:p.models.includes('deepseek-v4-flash')?'deepseek-v4-flash':p.selectedModel},jev:{apiKey:jevKey,endpoint:jevStore.services?.jev?.endpoint},townToken});
  const release=process.env.MOSSVALE_CLOUD_RELEASE;if(!/^[0-9]{8}-[a-z0-9-]+$/.test(release||''))throw Error('release');
  const remote=`sudo -n docker run --rm -i --network none --read-only --cap-drop ALL --security-opt no-new-privileges --user 1000:1000 --mount type=bind,src=/srv/mossvale-cloud/releases/${release},dst=/app,readonly --mount type=bind,src=/srv/mossvale-cloud/secrets,dst=/run/secrets/mossvale --workdir /app sha256:c10884952bb8c37122fcc3fe6f97af3ab0a80e5eb02ee5df707406b4e11a7e3e node deploy/seal-cloud-providers.mjs`;
  stage='transfer';const child=spawn('ssh',['-i',path.join(app.getPath('home'),'.ssh/codex_aliyun_debug_20260907'),'-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=12','admin@47.116.35.204',remote],{stdio:['pipe','pipe','pipe']});
  child.stdin.end(payload);let output='',diagnostic='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>diagnostic+=c);
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});if(code!==0){console.error(diagnostic.slice(0,800));throw Error('transfer');}console.log(output.trim());app.exit(0);
 }catch{console.error('Encrypted cloud configuration transfer failed at '+stage+'.');app.exit(1);}
});
