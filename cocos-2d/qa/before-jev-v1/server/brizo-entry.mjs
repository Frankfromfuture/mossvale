import {app,safeStorage} from 'electron';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {configureProvider} from './ai.mjs';
app.dock?.hide();
const ownProfile=path.join(app.getPath('appData'),process.env.MOSSVALE_SCENE==='cafe-2d'?'Mossvale 2D Trial Service':process.env.MOSSVALE_SCENE==='cafe-street'?'Mossvale 3D Service':'Mossvale Service');
// No top-level await on app.whenReady: Electron waits for ESM evaluation.
import {mkdirSync} from 'node:fs';
mkdirSync(ownProfile,{recursive:true});
app.setPath('userData',ownProfile);app.setPath('sessionData',ownProfile);
app.whenReady().then(async()=>{
// Only this headless main process can decrypt the user-authorized Brizo provider.
// No BrowserWindow, renderer IPC, profile migration, or credential writes.
const brizo=process.env.BRIZO_ROOT||path.resolve(import.meta.dirname,'../../Brizo');
const {createModelGuard,withKnownProviderDefaults}=await import(pathToFileURL(path.join(brizo,'electron/secret-store.mjs')));
configureProvider(async()=>{
 const guard=createModelGuard({storePath:()=>path.join(app.getPath('appData'),'Brizo','model-guard.json'),safeStorage});
 const stored=(await guard.readStore()).providers.find(p=>/deep\s*seek/i.test(p.name));
 if(!stored)throw new Error('configuration');
 const p=withKnownProviderDefaults(stored);
 const apiKey=guard.decryptKey(stored);if(!apiKey)throw new Error('configuration');
 return {apiKey,baseUrl:p.baseUrl,model:p.models.includes('deepseek-v4-flash')?'deepseek-v4-flash':p.selectedModel};
});
await import('./main.mjs');

}).catch(()=>{console.error('Mossvale 服务启动失败');app.exit(1);});
