// Run with the existing Electron service binary. Secret input is stdin only.
// This command writes ciphertext to the separate Mossvale service profile.
import {app,safeStorage} from 'electron';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync} from 'node:fs';
import {normalizeJevEndpoint} from './jev.mjs';
app.dock?.hide();
const profile=path.join(app.getPath('appData'),'Mossvale 2D Trial Service');
mkdirSync(profile,{recursive:true,mode:0o700});
app.setPath('userData',profile);app.setPath('sessionData',profile);
const endpointOnly=process.argv.includes('--endpoint-only');
const endpointArgument=process.argv.find(arg=>arg.startsWith('--endpoint='))?.slice('--endpoint='.length);
const input=endpointOnly?Promise.resolve(''):new Promise((resolve,reject)=>{
 let text='';process.stdin.setEncoding('utf8');
 process.stdin.on('data',chunk=>{text+=chunk;if(text.length>2048){text='';reject(Error('invalid-input'));process.stdin.destroy();}});
 process.stdin.on('end',()=>resolve(text.trim()));process.stdin.on('error',()=>reject(Error('input-failed')));
});
app.whenReady().then(async()=>{
 const brizo=process.env.BRIZO_ROOT||path.resolve(import.meta.dirname,'../../Brizo');
 const {createModelGuard}=await import(pathToFileURL(path.join(brizo,'electron/secret-store.mjs')));
 if(!safeStorage.isEncryptionAvailable())throw Error('encryption-unavailable');
 const previous=createModelGuard({storePath:()=>path.join(app.getPath('appData'),'Brizo','model-guard.json'),safeStorage});
 const own=createModelGuard({storePath:()=>path.join(profile,'model-guard.json'),safeStorage});
 const local=await own.readStore(),shared=await previous.readStore();
 let key=endpointOnly?await own.readServiceKey('jev'):await input;
 if(!key||/\s/.test(key)||endpointOnly&&!endpointArgument)throw Error('invalid-input');
 const endpoint=normalizeJevEndpoint(endpointArgument||local.services?.jev?.endpoint||shared.services?.jev?.endpoint||process.env.BRIZO_JEV_ENDPOINT);
 await own.saveServiceKey('jev',endpointOnly?'':key,{endpoint});
 if(await own.readServiceKey('jev')!==key)throw Error('verification-failed');
 key='';console.log(JSON.stringify({updated:true,encrypted:true,endpoint,scope:'Mossvale 2D service'}));app.exit(0);
}).catch(()=>{console.error('Jev 配置更新未完成；未输出密钥。');app.exit(1);});
