import {spawn} from 'node:child_process';
import path from 'node:path';
const project=path.resolve(import.meta.dirname,'..'),root=path.resolve(project,'..');
const child=spawn(process.execPath,[path.join(root,'server/launch.mjs')],{cwd:root,stdio:'inherit',env:{...process.env,
 PORT:process.env.PORT||'4322',MOSSVALE_SCENE:'cafe-2d',MOSSVALE_COOKIE_NAME:'mossvale_living3d',
 MOSSVALE_LAYOUT:path.join(project,'assets/resources/town-layout.json'),MOSSVALE_OBJECT_CATALOG:path.join(project,'assets/resources/object-catalog.json'),
 MOSSVALE_DATA_DIR:process.env.MOSSVALE_DATA_DIR||path.join(root,'.data-cocos-town3d'),MOSSVALE_STATIC_DIR:path.join(project,'build/web-mobile')}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code||0));
