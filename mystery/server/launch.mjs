import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';
const brizo=process.env.BRIZO_ROOT||path.resolve(import.meta.dirname,'../../../Brizo');
const electron=path.join(brizo,'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
const useElectron=process.platform==='darwin'&&existsSync(electron)&&!process.env.DEEPSEEK_API_KEY;
const env={...process.env,BRIZO_ROOT:brizo};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(useElectron?electron:process.execPath,[path.join(import.meta.dirname,useElectron?'brizo-entry.mjs':'main.mjs')],{env,stdio:'inherit',cwd:path.resolve(import.meta.dirname,'..')});
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>child.kill(sig));child.on('exit',code=>process.exit(code||0));
