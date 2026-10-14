// Incremental synchronization of a pure TS game module after an asset-integration fix.
// Reuses the verified Cocos engine and imported assets; never runs an editor build.
import fs from 'node:fs';import {homedir} from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {transformSync} from 'esbuild';
const require=createRequire(import.meta.url),ts=require(path.join(homedir(),'Applications/CocosCreator-3.8.8/CocosCreator.app/Contents/Resources/app.asar.unpacked/node_modules/typescript'));
const root=path.resolve(import.meta.dirname,'..'),name=process.argv[2];if(!/^[A-Za-z0-9]+$/.test(name||''))throw Error('Pass a game module name');
const dir=path.join(root,'build/web-mobile/assets/main'),file=path.join(dir,fs.readdirSync(dir).find(n=>/^index.*\.js$/.test(n)));let bundle=fs.readFileSync(file,'utf8');
const module='chunks:///_virtual/'+name+'.ts';
const parsed=ts.createSourceFile(file,bundle,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS);
const statement=parsed.statements.find(s=>ts.isExpressionStatement(s)&&ts.isCallExpression(s.expression)&&s.expression.expression.getText(parsed)==='System.register'&&s.expression.arguments[0]?.text===module);
if(!statement)throw Error('Module not found');const start=statement.getStart(parsed),end=statement.getEnd();
let source=fs.readFileSync(path.join(root,'assets/scripts',name+'.ts'),'utf8').replace(/from '(\.\/[^']+)'/g,(_,s)=>`from '${s}.ts'`);
const original=bundle.slice(start,end),rf=original.match(/\._RF\.push\(\{\},"([^"]+)","([^"]+)"/);
if(rf){source="import {cclegacy as __cc} from 'cc';\n__cc._RF.push({},"+JSON.stringify(rf[1])+','+JSON.stringify(rf[2])+",undefined);\n"+source+'\n__cc._RF.pop();\n';}
const output=ts.transpileModule(source,{moduleName:module,compilerOptions:{target:ts.ScriptTarget.ES2018,module:ts.ModuleKind.System,experimentalDecorators:true,useDefineForClassFields:false}}).outputText;
bundle=bundle.slice(0,start)+transformSync(output,{minify:true}).code+'\n'+bundle.slice(end);fs.writeFileSync(file,bundle);console.log('Synchronized game module '+name+'; engine/assets unchanged.');
