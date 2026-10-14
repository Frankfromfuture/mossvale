import { sys } from 'cc';

export interface Resident {
    id: string; name: string; role: string; tags: string[]; thought: string;
    location: string; target: string; action: string; trust: number; mood: number;
    life?: {x:number;z:number;route:{x:number;z:number}[];phase:string;activity:string;socialWith?:string;speech:string;speechAt?:number;speechUntil:number};
    persona?:{revision:number;summary:string;values:string[];growth:string};
    goal: string; memories: { text: string; kind: string; eventId: string }[];
}
export interface TownState {
    revision:number;speed:number;player?:{x:number;z:number};inventory?:{peaches:number;snacks:number;shells?:number};
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
                    xhr.status === 200 ? resolve(result) : reject(new Error(result.error || '请求未完成'));
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
    world() { return this.request<TownState>('/api/world'); }
    interact(resident: string, kind: string, message = '') {
        return this.request<{ world: TownState; result: { speech: string; delta: number; mode: string; notice?: string } }>('/api/interact', { resident, kind, message });
    }
    presence(x:number,z:number,resident=''){return this.request<{ok:boolean}>('/api/presence',{x,z,resident});}
    activity(place:string,resident=''){return this.request<{world:TownState;result:{speech:string}}>('/api/activity',{place,resident});}
    control(action: string, minutes?: number) {
        return this.request<{ world: TownState }>('/api/control', { action, minutes });
    }
}
