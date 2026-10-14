import {randomBytes,createCipheriv} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
try{
 const chunks=[];let size=0;for await(const chunk of process.stdin){size+=chunk.length;if(size>65536)throw Error('configuration');chunks.push(chunk);}
 const payload=Buffer.concat(chunks),value=JSON.parse(payload.toString('utf8'));
 if(!value.deepseek?.apiKey||!value.jev?.apiKey||!/^[a-f0-9]{48}$/.test(value.townToken||''))throw Error('configuration');
 const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from('mossvale-cloud-providers-v1'));
 const data=Buffer.concat([cipher.update(payload),cipher.final()]);payload.fill(0);chunks.forEach(c=>c.fill(0));
 const folder=process.env.MOSSVALE_SECRET_DIR||'/run/secrets/mossvale';
 await writeFile(folder+'/providers.key',key,{mode:0o600,flag:'wx'});key.fill(0);
 await writeFile(folder+'/providers.enc',JSON.stringify({version:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')}),{mode:0o600,flag:'wx'});
 console.log('Encrypted DeepSeek and Jev configuration installed.');
}catch{console.error('Cloud provider installation failed.');process.exitCode=1;}
