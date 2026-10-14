import {spawn} from 'node:child_process';
import path from 'node:path';
const project=path.resolve(import.meta.dirname,'..');
const root=path.resolve(project,'..');
const child=spawn(process.execPath,[path.join(root,'server/launch.mjs')],{
 cwd:root,stdio:'inherit',env:{...process.env,PORT:'4319',MOSSVALE_SCENE:'cafe-street',
 MOSSVALE_DATA_DIR:path.join(root,'.data-cocos'),MOSSVALE_STATIC_DIR:path.join(project,'build/web-mobile')}
});
for(const s of ['SIGINT','SIGTERM'])process.on(s,()=>child.kill(s));
child.on('exit',c=>process.exit(c||0));
