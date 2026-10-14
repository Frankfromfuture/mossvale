const unlimited=process.env.MOSSVALE_UNLIMITED_AI==='1';
// Provider material stays inside this server module. No request/response bodies are logged.
let getter=null,providerPromise=null,active=0,globalDay='',globalCalls=0;
export const jevConfigured=()=>!!getter;
export function configureJev(fn){getter=fn;providerPromise=null;}
export function normalizeJevEndpoint(value){
 const u=new URL(String(value||'')),paths={'api.typesafe.ai':'/v1/systemone','jevtypesafeai.com':'/api/v1/decide','jev-agent.com':'/api/v1/systemone'};
 if(u.protocol!=='https:'||paths[u.hostname]!==u.pathname||u.username||u.password||u.search||u.hash||u.port)throw Error('configuration');
 return u.href;
}
export function resolveJevChoice(body,criteria){
 const a=body?.answers?.decision,keys=Object.keys(criteria);
 if(!a||!Object.hasOwn(criteria,a.choice)||!Number.isFinite(a.confidence)||a.confidence<0||a.confidence>1)throw Error('invalid-choice');
 const p=a.probabilities;
 if(!p||Object.keys(p).length!==keys.length||keys.some(k=>!Number.isFinite(p[k])||p[k]<0||p[k]>1)||Math.abs(keys.reduce((n,k)=>n+p[k],0)-1)>.025)throw Error('invalid-choice');
 return {choice:a.confidence>=.55?a.choice:null,proposed:a.choice,confidence:a.confidence,probabilities:p,reason:a.confidence>=.55?null:'uncertain'};
}
export async function requestJev(state,criteria,usage,{instructions,fetchImpl=fetch,provider:givenProvider}={}){
 const start=performance.now(),today=new Date().toISOString().slice(0,10);
 if(usage.day!==today)Object.assign(usage,{day:today,calls:0,input:0,failures:0,consecutiveFailures:0,retryAfter:0});
 if(globalDay!==today){globalDay=today;globalCalls=0;}
 const fallback=reason=>({choice:null,reason,mode:'rules',elapsedMs:Math.round(performance.now()-start)});
 if(!getter&&!givenProvider)return fallback('configuration');
 if(!unlimited&&(usage.calls>=360||globalCalls>=1440))return fallback('budget');
 if(Date.now()<(usage.retryAfter||0))return fallback('backoff');
 if(active>=3)return fallback('busy');
 active++;usage.calls++;globalCalls++;
 try{
  const provider=givenProvider||await (providerPromise||=(Promise.resolve().then(getter).catch(e=>{providerPromise=null;throw e;})));
  const endpoint=normalizeJevEndpoint(provider.endpoint);if(!provider.apiKey)throw Error('configuration');
  const response=await fetchImpl(endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(3000),headers:{'Content-Type':'application/json',Authorization:`Bearer ${provider.apiKey}`},body:JSON.stringify({model:'jev-latest',state,questions:{decision:{type:'choice',instructions,criteria}}})});
  if(!response.ok){await response.body?.cancel();throw Error('http-'+response.status);}
  const body=await response.json();usage.input+=Math.max(0,Number(body.usage?.input_tokens)||0);
  const answer=resolveJevChoice(body,criteria);usage.consecutiveFailures=0;
  return {...answer,mode:answer.choice?'jev':'rules',model:String(body.model||'jev-latest').slice(0,80),elapsedMs:Math.round(performance.now()-start)};
 }catch(e){
  usage.failures++;usage.consecutiveFailures=(usage.consecutiveFailures||0)+1;
  if(usage.consecutiveFailures>=3||e.message==='http-429')usage.retryAfter=Date.now()+60000;
  return fallback(e.name==='TimeoutError'?'timeout':['invalid-choice','configuration'].includes(e.message)?e.message:/^http-\d+$/.test(e.message)?e.message:'unavailable');
 }finally{active--;}
}
