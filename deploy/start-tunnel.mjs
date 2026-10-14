import {spawn,spawnSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

// Keeps the test API on this Mac; SSH carries it without copying model keys.
const socket=path.join(os.tmpdir(),'mossvale-preview-ssh.sock');
const host='admin@47.116.35.204';
const key=path.join(os.homedir(),'.ssh/codex_aliyun_debug_20260907');
if(spawnSync('ssh',['-S',socket,'-O','check',host],{stdio:'ignore'}).status===0){
 console.log('Mossvale preview tunnel is already running.');process.exit(0);
}
let stopped=false,child,timer;
function connect(){
 child=spawn('ssh',['-N','-T','-M','-S',socket,'-i',key,
  '-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=12',
  '-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=20','-o','ServerAliveCountMax=3',
  '-R','127.0.0.1:14319:127.0.0.1:4319',host],{stdio:['ignore','ignore','inherit']});
 child.once('error',e=>console.error('Tunnel launch failed:',e.code));
 child.once('close',()=>{if(!stopped)timer=setTimeout(connect,10000);});
}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopped=true;clearTimeout(timer);child?.kill('SIGTERM');});
connect();
