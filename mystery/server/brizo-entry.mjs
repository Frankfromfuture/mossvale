import {app,safeStorage} from 'electron';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {configure} from './provider.mjs';
app.dock?.hide();
const profile=path.join(app.getPath('appData'),'Mossvale Mystery Service');mkdirSync(profile,{recursive:true});app.setPath('userData',profile);app.setPath('sessionData',profile);
app.whenReady().then(async()=>{
 const brizo=process.env.BRIZO_ROOT||path.resolve(import.meta.dirname,'../../../Brizo');
 const {createModelGuard,withKnownProviderDefaults}=await import(pathToFileURL(path.join(brizo,'electron/secret-store.mjs')));
 configure(async()=>{const guard=createModelGuard({storePath:()=>path.join(app.getPath('appData'),'Brizo','model-guard.json'),safeStorage});const stored=(await guard.readStore()).providers.find(p=>/deep\s*seek/i.test(p.name));if(!stored)throw Error('本机还没有 DeepSeek 配置。');const p=withKnownProviderDefaults(stored),apiKey=guard.decryptKey(stored);if(!apiKey)throw Error('DeepSeek 密钥暂不可用。');return {apiKey,baseUrl:p.baseUrl,model:p.models.includes('deepseek-v4-flash')?'deepseek-v4-flash':p.selectedModel};});
 await import('./main.mjs');
}).catch(()=>{console.error('Mystery 服务启动失败。');app.exit(1);});
