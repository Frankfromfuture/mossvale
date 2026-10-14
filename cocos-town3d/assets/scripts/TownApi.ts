import { sys } from 'cc';
import {ObjectWorld} from './Layout';

export interface LifeDecision {choice:string;mode:'jev'|'rules';elapsedMs?:number;reason?:string;selection?:string;basis?:string;basisKind?:'input'|'rule';}
export interface LifeEntry {id:string;text:string;at:number;type:string;decision?:LifeDecision;}
export interface Resident {
    currentActivity?:{icon:string;label:string;phase:string;activityIcon?:string};visitor?:boolean;remaining?:number;code?:string;spent?:number;lifeLog?:LifeEntry[];
    id: string; name: string; role: string; tags: string[]; thought: string;
    location: string; target: string; action: string; trust: number; mood: number;
    life?: {x:number;z:number;route:{x:number;z:number}[];phase:string;activity:string;socialWith?:string;speech:string;speechAt?:number;speechUntil:number};
    persona?:{revision:number;summary:string;values:string[];growth:string};
    goal: string; memories: { text: string; kind: string; eventId: string }[];
}
export interface CashStats {income:number;expense:number;wages:number;ownerIncome:number;taxShare:number;transferIn:number;transferOut:number;}
export interface AccountReport {balance:number;today:CashStats;total:CashStats;recent:{id:string;at:number;amount:number;incoming:boolean;kind:string;description:string}[];}
export interface PersonReport extends AccountReport {id:string;code:string;name:string;age:number|null;personality:string;tags:string[];habits:{time:string;text:string;reason?:string;status?:string}[];workStyle?:string;likes?:string[];dislikes?:string[];values?:string[];goal?:string;schedule?:string;impressions?:{key:string;name:string;summary:string;strength:number;evidence:string[];sources?:{eventId:string;text:string;at:number;kind:string}[];updatedAt:number;revision:number}[];reflectionHistory?:{at:number;before:string;after:string;subject:string;evidence:string[];mode:string}[];job:string;workplace:string;action:string;task:string;location:string;}
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
    private entryId='';private entryTask:Promise<TownState>|null=null;
    private token = sys.localStorage.getItem('mossvale-living3d-session') || '';
    private base = sys.platform === sys.Platform.WECHAT_GAME
        ? (sys.localStorage.getItem('mossvale-living3d-endpoint') || 'http://127.0.0.1:4322')
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
        this.token = s.token; sys.localStorage.setItem('mossvale-living3d-session', this.token);
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
    objectAction(object:string,action:string,revision:number,requestId:string,point?:{x:number;z:number}){
        return this.request<{world:TownState;result:{speech:string;objectId:string;playerMoved:boolean}}>('/api/object-action',{object,action,revision,requestId,...point});
    }
    interact(resident: string, kind: string, message = '') {
        return this.request<{ world: TownState; result: { speech: string; delta: number; mode: string; notice?: string } }>('/api/interact', { resident, kind, message });
    }
    presence(x:number,z:number,resident=''){return this.request<{ok:boolean}>('/api/presence',{x,z,resident});}
    activity(place:string,resident=''){return this.request<{world:TownState;result:{speech:string}}>('/api/activity',{place,resident});}
    control(action: string, minutes?: number) {
        return this.request<{ world: TownState }>('/api/control', { action, minutes });
    }
}
