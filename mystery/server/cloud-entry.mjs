import {readFile} from 'node:fs/promises';
import {createDecipheriv} from 'node:crypto';
import {configure} from './provider.mjs';

// Reuse the existing cloud provider vault; plaintext stays in process memory.
try{
 const folder=process.env.MYSTERY_SECRET_DIR||'/run/secrets/mossvale';
 const key=await readFile(folder+'/providers.key');
 const sealed=JSON.parse(await readFile(folder+'/providers.enc','utf8'));
 if(key.length!==32||sealed.version!==1)throw Error('configuration');
 const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(sealed.iv,'base64'));
 decipher.setAAD(Buffer.from('mossvale-cloud-providers-v1'));
 decipher.setAuthTag(Buffer.from(sealed.tag,'base64'));
 const bytes=Buffer.concat([decipher.update(Buffer.from(sealed.data,'base64')),decipher.final()]);
 const provider=JSON.parse(bytes.toString('utf8')).deepseek;
 bytes.fill(0);key.fill(0);
 if(!provider?.apiKey||!provider.model||!/^https:\/\//.test(provider.baseUrl))throw Error('configuration');
 configure(async()=>provider);
 await import('./main.mjs');
}catch{
 console.error('Mystery cloud configuration could not be loaded.');process.exit(1);
}
