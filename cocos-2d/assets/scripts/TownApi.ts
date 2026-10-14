import { sys } from 'cc';
import {ObjectWorld} from './Layout';

export interface LifeDecision {choice:string;mode:'jev'|'rules';elapsedMs?:number;reason?:string;selection?:string;basis?:string;basisKind?:'input'|'rule';}
export interface LifeEntry {id:string;text:string;at:number;type:string;news?:{id:string;title:string;source:string;url:string;publishedAt:string};decision?:LifeDecision;}
export interface SpeechFrame {id:string;resident:string;text:string;status:'streaming'|'complete';}
export interface SpeechUpdate {sync:{epoch:string;sequence:number};speech:SpeechFrame[];}
export interface Resident {
    currentActivity?:{icon:string;label:string;phase:string;activityIcon?:string};visitor?:boolean;remaining?:number;code?:string;spent?:number;lifeLog?:LifeEntry[];
    id: string; name: string; role: string; tags: string[]; thought: string;busy?:boolean;engagedUntil?:number;
    location: string; target: string; action: string; trust: number; mood: number;
    life?: {pose?:{kind:string;object:string;until:number};x:number;z:number;route:{x:number;z:number}[];phase:string;activity:string;socialWith?:string;speech:string;speechAt?:number;speechUntil:number;engagedUntil?:number;aiHoldUntil?:number};
    persona?:{revision:number;summary:string;values:string[];growth:string};
    goal: string; memories: { text: string; kind: string; eventId: string }[];
}
export interface CashStats {income:number;expense:number;wages:number;ownerIncome:number;taxShare:number;transferIn:number;transferOut:number;}
export interface AccountReport {balance:number;today:CashStats;total:CashStats;recent:{id:string;at:number;amount:number;incoming:boolean;kind:string;description:string}[];}
export interface PersonReport extends AccountReport {home?:{id:string;name:string;address:string};id:string;code:string;name:string;age:number|null;personality:string;tags:string[];habits:{time:string;text:string;reason?:string;status?:string}[];workStyle?:string;likes?:string[];dislikes?:string[];values?:string[];goal?:string;schedule?:string;dayPlan?:{id:string;label:string;place:string;time:string;status:string}[];planChanges?:{at:number;reason:string}[];appointments?:{id:string;label:string;place:string;time:string;status:string;reason:string}[];impressions?:{key:string;name:string;summary:string;strength:number;evidence:string[];sources?:{eventId:string;text:string;at:number;kind:string}[];updatedAt:number;revision:number}[];reflectionHistory?:{at:number;before:string;after:string;subject:string;evidence:string[];mode:string}[];job:string;workplace:string;action:string;task:string;location:string;}
export interface TownTotals {externalIn:number;externalOut:number;tax:number;wages:number;hotelRevenue:number;hotelCosts:number;visitors:number;}
export interface EconomicReport {day:number;localCash:number;today:TownTotals;total:TownTotals;people:PersonReport[];businesses:(AccountReport&{id:string;name:string;workers:string[];status:string})[];publicAccount:AccountReport;}
export interface EconomyState {
 report?:EconomicReport;
 revision:number;wallet:number;treasury:number;hotelBalance:number;playerWorking:boolean;playerTask?:{label:string;due:number;phase:string};
 attractiveness:{score:number;parts:{name:string;value:number;max:number;reason:string}[]};
 businesses:{id:string;name:string;owner:string;place:string;balance:number;stock:Record<string,number>;concept:string;pendingConcept?:string;status:string;concepts:{id:string;name:string;description:string;cost:number}[]}[];
 furniture:{id:string;name:string;price:number;defId:string;business:string;stock:number;size:{w:number;d:number}}[];
 warehouse:{id:string;name:string;code:string;defId:string}[];
 hotel:{rooms:{id:string;name:string;ready:boolean;comfort:number;cleanliness:number;price:number;guest:string|null;reason:string;stays:number}[];reviews:{id:string;at:number;name:string;text:string;rating:number}[];invitations:{id:string;resident:string;status:string}[];snacks:number};
 chores:{id:string;object:string;label:string;pay:number;status:string;worker?:string;point:{x:number;z:number}}[];
 ledger:{id:string;at:number;amount:number;fromName:string;toName:string;kind:string;description:string}[];
 days:{day:number;externalIn:number;externalOut:number;hotelRevenue:number;hotelCosts:number;tax:number;finished:boolean}[];
 visitorHistory:{id:string;name:string;spent:number;rating:number;stayed:boolean;purchases:{name:string;amount:number}[]}[];
 milestones:{id:string;name:string;done:boolean}[];
 offlineSummary?:{from:number;to:number;labor:number;share:number;spending:number;hotelNet:number;visits:{name:string;text:string}[]};
}
export interface TownState {
    speech?:SpeechFrame[];
    sync?:{epoch:string;sequence:number};
    economy?:EconomyState;visitors?:Resident[];archivedResidents?:Resident[];playerLog?:LifeEntry[];
    objectWorld?:ObjectWorld;
    revision:number;speed:number;player?:{x:number;z:number;pose?:{kind:string;object:string;until:number};phase?:string;route?:{x:number;z:number}[];action?:string};inventory?:{peaches:number;snacks:number;shells?:number};
    events?:{id:string;text:string;type:string;player?:boolean;autonomous?:boolean}[];
    arrival?:{id:string;updated:number;awayMinutes:number;message:string;changes:{eventId:string;text:string}[]};
    minute: number; paused: boolean; coins: number; weather: string;
    residents: Resident[]; ai: { mode: string; label?: string };
    usage: { calls: number }; chats: Record<string, { role: string; content: string; mode?: string }[]>;
    party?: { status: string; accepted: string[]; playerAttending: boolean; at: number };
}

// Web builds share their page's origin and directory, including hosted subpaths.
// WeChat builds read an explicit service
// address from local storage; no provider credentials ever enter the client.
export class TownApi {
    private interaction:AbortController|null=null;private pendingChat:{key:string;id:string}|null=null;
    private stream:AbortController|null=null;private streamAt=0;private streamReady=false;private retryStreamAt=0;
    private entryId='';private entryTask:Promise<TownState>|null=null;
    private token = sys.localStorage.getItem('mossvale2d-session') || '';
    private base = sys.platform === sys.Platform.WECHAT_GAME
        ? (sys.localStorage.getItem('mossvale2d-endpoint') || 'http://127.0.0.1:4321')
        : ((globalThis as any).location?.pathname.replace(/\/[^/]*$/, '') || '');

    private request<T>(path: string, body?: object): Promise<T> {
        const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Mossvale': '1' };
        if (this.token) headers['X-Town-Token'] = this.token;
        return new Promise((resolve, reject) => {
            const wx = (globalThis as any).wx;
            if (sys.platform === sys.Platform.WECHAT_GAME && wx?.request) {
                wx.request({ url: this.base + path, method: body ? 'POST' : 'GET',
                    header: headers, data: body, timeout: 27000,
                    success: (r: any) => r.statusCode === 200 ? resolve(r.data) : reject(new Error(r.data?.error || '服务暂时不可用')),
                    fail: () => reject(new Error('小镇服务未连接，请检查服务地址')) });
                return;
            }
            const xhr = new XMLHttpRequest();
            xhr.open(body ? 'POST' : 'GET', this.base + path, true);
            xhr.timeout = 27000;
            Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
            xhr.onload = () => {
                try {
                    const result = JSON.parse(xhr.responseText);
                    xhr.status === 200 ? resolve(result) : reject(Object.assign(new Error(result.error || '请求未完成'),{status:xhr.status}));
                } catch { reject(new Error('小镇服务返回了无效数据')); }
            };
            xhr.onerror = () => reject(new Error('小镇服务未连接，仍可以在街区散步'));
            xhr.ontimeout = () => reject(new Error('回应花的时间有些久，请再试一次'));
            xhr.send(body ? JSON.stringify(body) : null);
        });
    }
    async connect(): Promise<TownState> {
        const s = await this.request<{ token: string }>('/api/session');
        this.token = s.token; sys.localStorage.setItem('mossvale2d-session', this.token);
        return this.arrive();
    }
    arrive():Promise<TownState>{
        if(this.entryTask)return this.entryTask;
        // Retain the same visit id after a failed response, so retrying cannot refresh twice.
        this.entryId ||= Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,14);
        this.entryTask=this.request<{world:TownState}>('/api/arrive',{visitId:this.entryId})
            .then(result=>{this.entryId='';return result.world;}).finally(()=>{this.entryTask=null;});
        return this.entryTask;
    }
    economyAction(action:string,payload:Record<string,unknown>,revision:number,requestId:string){return this.request<{world:TownState;result:{speech:string;objectId?:string}}>('/api/economy-action',{action,...payload,revision,requestId});}
    visitorInteract(visitor:string,message:string,revision:number,requestId:string){return this.request<{world:TownState;result:{speech:string;remaining:number;notice?:string}}>('/api/visitor-interact',{visitor,message,revision,requestId});}
    world() { return this.request<TownState>('/api/world'); }
    get liveConnected(){return this.streamReady&&Date.now()-this.streamAt<10000;}
    stopLive(){const stream=this.stream;this.stream=null;this.streamReady=false;stream?.abort();}
    watch(onWorld:(world:TownState)=>void,onSpeech?:(update:SpeechUpdate)=>void){
        if(sys.platform===sys.Platform.WECHAT_GAME||typeof fetch==='undefined'||typeof ReadableStream==='undefined'||typeof AbortController==='undefined')return;
        if(this.stream){if(Date.now()-this.streamAt<10000)return;this.stopLive();}
        if(Date.now()<this.retryStreamAt)return;
        const controller=new AbortController();this.stream=controller;this.streamAt=Date.now();
        void(async()=>{
            try{
                const response=await fetch(this.base+'/api/world-stream',{headers:{'X-Town-Token':this.token,'X-Mossvale':'1'},credentials:'same-origin',cache:'no-store',signal:controller.signal});
                if(!response.ok||!response.body||!response.headers.get('Content-Type')?.includes('text/event-stream'))throw Error('stream-unavailable');
                const reader=response.body.getReader(),decoder=new TextDecoder();let pending='';
                while(this.stream===controller){
                    const {done,value}=await reader.read();if(done)break;if(this.stream!==controller)return;
                    this.streamAt=Date.now();pending+=decoder.decode(value,{stream:true});let end:number;
                    while((end=pending.indexOf('\n\n'))>=0){
                        const frame=pending.slice(0,end);pending=pending.slice(end+2);
                        const data=frame.split('\n').filter(line=>line.startsWith('data: ')).map(line=>line.slice(6)).join('\n');
                        if(!data)continue;
                        if(frame.split('\n').includes('event: speech')){const update=JSON.parse(data) as SpeechUpdate;if(!update.sync||!Array.isArray(update.speech))throw Error('invalid-speech');onSpeech?.(update);continue;}
                        const world=JSON.parse(data) as TownState;if(!world.sync||!Array.isArray(world.residents))throw Error('invalid-snapshot');
                        onWorld(world);this.streamReady=true;
                    }
                }
            }catch{/* The regular refresh loop remains available during reconnect. */}
            finally{controller.abort();if(this.stream===controller){this.stream=null;this.streamReady=false;this.retryStreamAt=Date.now()+3000;}}
        })();
    }
    objectAction(object:string,action:string,revision:number,requestId:string,point?:{x:number;z:number}){
        return this.request<{world:TownState;result:{speech:string;objectId:string;playerMoved:boolean}}>('/api/object-action',{object,action,revision,requestId,...point});
    }
    cancelInteraction(){this.interaction?.abort();}
    async interact(resident: string, kind: string, message = '',onSpeech?:(text:string)=>void) {
        type Reply={world:TownState;result:{speech:string;delta:number;mode:string;notice?:string}};
        if(!onSpeech||!['chat','secret'].includes(kind)||sys.platform===sys.Platform.WECHAT_GAME||typeof fetch==='undefined'||typeof ReadableStream==='undefined'||typeof AbortController==='undefined')return this.request<Reply>('/api/interact',{resident,kind,message});
        const key=JSON.stringify([resident,kind,message]);
        if(this.pendingChat?.key!==key)this.pendingChat={key,id:Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)};
        const controller=new AbortController();this.interaction=controller;
        const timer=setTimeout(()=>controller.abort(),27000);let reader:ReadableStreamDefaultReader<Uint8Array>|null=null;
        try{
            const response=await fetch(this.base+'/api/interact',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/x-ndjson','X-Mossvale':'1','X-Town-Token':this.token},credentials:'same-origin',signal:controller.signal,body:JSON.stringify({resident,kind,message,requestId:this.pendingChat.id})});
            if(!response.headers.get('Content-Type')?.includes('application/x-ndjson')){
                const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.error||'这次没说完，请再试一次。'),{status:response.status});this.pendingChat=null;return result as Reply;
            }
            if(!response.ok||!response.body)throw new Error('这次没说完，请再试一次。');
            reader=response.body.getReader();const decoder=new TextDecoder();let pending='';
            while(true){
                const {done,value}=await reader.read();if(done)throw new Error('回应中断了，可以重新发送。');
                pending+=decoder.decode(value,{stream:true});let end:number;
                while((end=pending.indexOf('\n'))>=0){
                    const line=pending.slice(0,end);pending=pending.slice(end+1);if(!line.trim())continue;
                    const frame=JSON.parse(line);
                    if(frame.type==='speech'&&typeof frame.text==='string')onSpeech(frame.text);
                    else if(frame.type==='error')throw new Error(frame.message||'这次没说完，请再试一次。');
                    else if(frame.type==='complete'){
                        if(!frame.world||typeof frame.result?.speech!=='string')throw new Error('这次没说完，请再试一次。');
                        this.pendingChat=null;return {world:frame.world,result:frame.result} as Reply;
                    }
                }
            }
        }catch(e){if(controller.signal.aborted)throw Object.assign(new Error('回应已停止，输入已保留。'),{name:'AbortError'});throw e;}
        finally{clearTimeout(timer);await reader?.cancel().catch(()=>{});reader?.releaseLock();if(this.interaction===controller)this.interaction=null;}
    }
    presence(x:number,z:number,resident=''){return this.request<{ok:boolean}>('/api/presence',{x,z,resident});}
    activity(place:string,resident=''){return this.request<{world:TownState;result:{speech:string}}>('/api/activity',{place,resident});}
    control(action: string, minutes?: number, speed?: number) {
        return this.request<{ world: TownState }>('/api/control', { action, minutes, speed });
    }
}
