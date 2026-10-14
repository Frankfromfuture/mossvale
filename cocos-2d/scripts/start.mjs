import {spawn} from 'node:child_process';
import path from 'node:path';
const project=path.resolve(import.meta.dirname,'..');
const root=path.resolve(project,'..');
const child=spawn(process.execPath,[path.join(root,'server/launch.mjs')],{
 cwd:root,stdio:'inherit',env:{...process.env,PORT:process.env.PORT||'4321',MOSSVALE_SCENE:'cafe-2d',
 MOSSVALE_UNLIMITED_AI:process.env.MOSSVALE_UNLIMITED_AI||'1',
 MOSSVALE_TOWN_MIND:'1',
 MOSSVALE_LAYOUT:path.join(project,'assets/resources/town-layout.json'),
 MOSSVALE_DATA_DIR:process.env.MOSSVALE_DATA_DIR||path.join(root,'.data-cocos-2d'),
 MOSSVALE_STATIC_DIR:path.join(project,'build/web-mobile')}
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code||0));
