// Refresh release URLs after script-only synchronization, without rebuilding Cocos.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../build/web-mobile');
const hash=s=>createHash('md5').update(s).digest('hex').slice(0,5);
const find=(dir,prefix,extension)=>path.join(dir,fs.readdirSync(dir).find(n=>n.startsWith(prefix+'.')&&n.endsWith('.'+extension)));
function writeHashed(file,content){const parts=path.basename(file).split('.');parts[parts.length-2]=hash(content);const next=path.join(path.dirname(file),parts.join('.'));fs.writeFileSync(next,content);if(next!==file)fs.unlinkSync(file);return path.basename(next);}
const main=path.join(root,'assets/main'),script=find(main,'index','js'),config=find(main,'config','json');
const version=hash(fs.readFileSync(script,'utf8')+fs.readFileSync(config,'utf8'));
for(const [file,name] of [[script,'index'],[config,'config']]){const next=path.join(main,`${name}.${version}.${name==='index'?'js':'json'}`);if(file!==next)fs.renameSync(file,next);}
const settings=find(path.join(root,'src'),'settings','json'),data=JSON.parse(fs.readFileSync(settings,'utf8'));data.assets.bundleVers.main=version;
const settingsName=writeHashed(settings,JSON.stringify(data));
const app=find(root,'application','js'),appName=writeHashed(app,fs.readFileSync(app,'utf8').replace(/src\/settings\.[a-f0-9]+\.json/g,'src/'+settingsName));
const index=find(root,'index','js'),indexName=writeHashed(index,fs.readFileSync(index,'utf8').replace(/application\.[a-f0-9]+\.js/g,appName));
const html=path.join(root,'index.html');fs.writeFileSync(html,fs.readFileSync(html,'utf8').replace(/index\.[a-f0-9]+\.js/g,indexName));
console.log(`Updated living 3D release URLs (${version}); engine and imported assets reused.`);
