import {readFile} from 'node:fs/promises';
import {createDecipheriv} from 'node:crypto';
import {configureProvider} from './ai.mjs';
import {configureJev,normalizeJevEndpoint} from './jev.mjs';
import {startCloudGateway} from '../deploy/cloud-gateway.mjs';

// Provider plaintext exists only in this process; neither environment nor logs contain it.
try{
 const folder=process.env.MOSSVALE_SECRET_DIR||'/run/secrets/mossvale';
 const key=await readFile(folder+'/providers.key');
 const sealed=JSON.parse(await readFile(folder+'/providers.enc','utf8'));
 if(key.length!==32||sealed.version!==1)throw Error('configuration');
 const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(sealed.iv,'base64'));
 decipher.setAAD(Buffer.from('mossvale-cloud-providers-v1'));
 decipher.setAuthTag(Buffer.from(sealed.tag,'base64'));
 const bytes=Buffer.concat([decipher.update(Buffer.from(sealed.data,'base64')),decipher.final()]);
 const providers=JSON.parse(bytes.toString('utf8'));bytes.fill(0);key.fill(0);
 if(!providers.deepseek?.apiKey||!providers.jev?.apiKey||!providers.deepseek.model||!/^https:\/\//.test(providers.deepseek.baseUrl))throw Error('configuration');
 const endpoint=normalizeJevEndpoint(providers.jev.endpoint);
 configureProvider(async()=>providers.deepseek,'DeepSeek · 云端');
 configureJev(async()=>({...providers.jev,endpoint}));
 await import('./main.mjs');
 startCloudGateway({townToken:providers.townToken});
}catch{
 console.error('Mossvale cloud configuration could not be loaded.');process.exit(1);
}
