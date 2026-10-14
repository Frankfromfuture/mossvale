import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {homedir} from 'node:os';

// Cocos CLI can reuse the journal's ES2018 engine while emitting an ES5
// Component subclass. A native class must be extended with native `super`.
// Keep the component source, scene registration and final Web bundle in sync.
export function syncWebComponent(root){
 const require=createRequire(import.meta.url),editor=process.env.COCOS_CREATOR||path.join(homedir(),'Applications/CocosCreator-3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator');
 const ts=require(path.resolve(editor,'../../Resources/app.asar.unpacked/node_modules/typescript'));
 const dir=path.join(root,'build/web-mobile/assets/main'),file=path.join(dir,readdirSync(dir).find(n=>/^index.*\.js$/.test(n)));
 let bundle=readFileSync(file,'utf8');const marker='System.register("chunks:///_virtual/Mossvale2D.ts",',start=bundle.indexOf(marker),end=bundle.indexOf('\nSystem.register(',start+1);
 if(start<0)throw Error('Missing Mossvale component in Web bundle');
 const original=bundle.slice(start,end<0?bundle.length:end),uuid=original.match(/\._RF\.push\(\{\},"([^"]+)","Mossvale2D"/)?.[1];
 if(!uuid)throw Error('Missing Cocos scene class registration');
 let code=ts.transpileModule(readFileSync(path.join(root,'assets/scripts/Mossvale2D.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2018,module:ts.ModuleKind.System,experimentalDecorators:true}}).outputText;
 code=code.replace('System.register([',marker+' [').replace(/"\.\/([^".]+)"/g,'"./$1.ts"');
 code=code.replace('execute: function () {',`execute: function () {\n cc_1.cclegacy._RF.push({},${JSON.stringify(uuid)},"Mossvale2D",undefined);`);
 code=code.replace(/\n        }\n    };\n}\);\s*$/, '\n cc_1.cclegacy._RF.pop();\n        }\n    };\n});\n');
 if(!code.includes('_RF.pop()'))throw Error('Unexpected component output shape');
 bundle=bundle.slice(0,start)+code+bundle.slice(end<0?bundle.length:end);writeFileSync(file,bundle);
}
