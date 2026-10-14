import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {createHash,timingSafeEqual} from 'node:crypto';

const prefix='/mossvale/';
const origin=new URL(process.env.MOSSVALE_PUBLIC_ORIGIN||'https://47.116.35.204').origin;
if(!origin.startsWith('https://'))throw new Error('Preview requires HTTPS');
const access=process.env.MOSSVALE_PREVIEW_ACCESS||'';
if(access.length<32)throw new Error('Preview access token is missing');
const digest=s=>createHash('sha256').update(s).digest();
const expected=digest(access);
const allowed=s=>typeof s==='string'&&timingSafeEqual(digest(s),expected);
const cookieName='__Secure-mossvale-preview';
const root=path.resolve(process.env.MOSSVALE_STATIC_DIR||'/app/public');
const port=Number(process.env.PORT)||8791;
const upstreamPort=Number(process.env.MOSSVALE_UPSTREAM_PORT)||14319;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.json':'application/json','.wasm':'application/wasm','.bin':'application/octet-stream'};
const send=(res,status,text)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(text);};
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(x=>{const i=x.indexOf('=');return i<0?['','']:[x.slice(0,i).trim(),x.slice(i+1).trim()];}));
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('X-Frame-Options','DENY');
 try{
  if(req.headers.host!==new URL(origin).host)return send(res,403,'访问地址不匹配');
  const url=new URL(req.url,origin);
  if(!url.pathname.startsWith(prefix))return send(res,404,'未找到页面');
  if(req.method==='GET'&&allowed(url.searchParams.get('invite'))){
   res.writeHead(303,{Location:prefix,'Cache-Control':'no-store','Set-Cookie':`${cookieName}=${access}; Path=${prefix}; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`});res.end();return;
  }
  const jar=cookies(req);
  if(!allowed(jar[cookieName]))return send(res,401,'请使用本次测试邀请链接打开苔溪镇。');
  if(req.headers.origin&&req.headers.origin!==origin)return send(res,403,'来源未授权');
  const relative=url.pathname.slice(prefix.length);
  if(relative.startsWith('api/')){
   if(!['GET','POST'].includes(req.method))return send(res,405,'请求方式不支持');
   if(req.method==='POST'&&req.headers.origin!==origin)return send(res,403,'来源未授权');
   const headers={Host:'127.0.0.1:4319',Origin:'http://127.0.0.1:4319'};
   for(const key of ['content-type','content-length','x-mossvale','x-town-token'])if(req.headers[key])headers[key]=req.headers[key];
   if(jar.mossvale&&/^[a-f0-9]{48}$/.test(jar.mossvale))headers.Cookie=`mossvale=${jar.mossvale}`;
   const proxy=http.request({hostname:'127.0.0.1',port:upstreamPort,path:'/'+relative,method:req.method,headers,timeout:30000},answer=>{
    res.statusCode=answer.statusCode||502;
    res.setHeader('Cache-Control','no-store');
    for(const key of ['content-type','content-disposition'])if(answer.headers[key])res.setHeader(key,answer.headers[key]);
    if(answer.headers['set-cookie'])res.setHeader('Set-Cookie',answer.headers['set-cookie'].map(s=>s.replace('Path=/',`Path=${prefix}`)+'; Secure'));
    answer.pipe(res);
   });
   proxy.on('timeout',()=>proxy.destroy(new Error('timeout')));
   proxy.on('error',()=>{if(!res.headersSent){res.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:'小镇暂时休息了，稍后再来看看。'}));}else res.destroy();});
   req.on('aborted',()=>proxy.destroy());
   res.on('close',()=>{if(!res.writableFinished)proxy.destroy();});
   req.pipe(proxy);return;
  }
  if(!['GET','HEAD'].includes(req.method))return send(res,405,'请求方式不支持');
  const requested=decodeURIComponent(relative)||'index.html';
  if(requested.split('/').some(x=>x.startsWith('.')))return send(res,404,'未找到页面');
  const file=path.resolve(root,requested);
  if(!file.startsWith(root+path.sep))return send(res,404,'未找到页面');
  let body;try{body=await readFile(file);}catch{return send(res,404,'未找到页面');}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':body.length,'Cache-Control':'private, no-store'});
  res.end(req.method==='HEAD'?undefined:body);
 }catch{if(!res.headersSent)send(res,400,'请求未完成');else res.destroy();}
});
server.requestTimeout=35000;server.headersTimeout=10000;server.maxRequestsPerSocket=100;
server.listen(port,'127.0.0.1',()=>console.log(`Mossvale preview gateway listening on loopback:${port}`));
