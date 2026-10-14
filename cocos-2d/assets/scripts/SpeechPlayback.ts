import {GRID_UI} from './VillageUi';
import type {SpeechFrame} from './TownApi';

type Line=SpeechFrame&{revealed:number;offset:number;readFor:number;boundaryText:string;boundaryOffset:number;boundaryEnd:number};
/** Local presentation only. Complete lines wait their turn; drafts can be withdrawn. */
export class SpeechPlayback {
    private lines:Line[]=[];
    private seen=new Set<string>();
    private spoken=new Map<string,string>();
    clear(){this.lines=[];this.seen.clear();this.spoken.clear();}
    receive(frames:SpeechFrame[]){
        const ids=new Set(frames.map(f=>f.id));
        this.lines=this.lines.filter(l=>l.status==='complete'||ids.has(l.id));
        for(const frame of frames){
            if(frame.status==='complete')this.spoken.set(frame.resident,frame.text);
            const existing=this.lines.find(l=>l.id===frame.id);
            if(existing){Object.assign(existing,frame);continue;}
            if(this.seen.has(frame.id))continue;
            this.seen.add(frame.id);
            this.lines.push({...frame,revealed:0,offset:0,readFor:0,boundaryText:'',boundaryOffset:-1,boundaryEnd:0});
        }
        if(this.lines.length>16)this.lines.splice(0,this.lines.length-16);
        while(this.seen.size>128)this.seen.delete(this.seen.values().next().value!);
    }
    owns(resident:string,text:string){return this.spoken.get(resident)===text||this.lines.some(l=>l.resident===resident);}
    tick(dt:number,visible:(id:string)=>boolean,reduceMotion=false):{resident:string;text:string}|null{
        while(this.lines.length&&!visible(this.lines[0].resident))this.lines.shift();
        const line=this.lines[0];if(!line)return null;
        const chars=Array.from(line.text);if(line.boundaryText!==line.text||line.boundaryOffset!==line.offset){line.boundaryText=line.text;line.boundaryOffset=line.offset;line.boundaryEnd=GRID_UI?chars.length:Math.min(chars.length,line.offset+28);}const pageEnd=line.boundaryEnd;
        line.revealed=reduceMotion?pageEnd:Math.min(pageEnd,Math.max(line.offset+1,line.revealed+dt*32));
        const text=chars.slice(line.offset,Math.floor(line.revealed)).join('').trimEnd();
        if(line.revealed>=pageEnd&&(line.status==='complete'||(GRID_UI?pageEnd<chars.length:pageEnd===line.offset+28))){
            line.readFor+=dt;
            if(line.readFor>=Math.max(2.5,(pageEnd-line.offset)*.09)){
                if(pageEnd<chars.length){line.offset=pageEnd;line.revealed=pageEnd;line.readFor=0;}
                else if(line.status==='complete')this.lines.shift();
            }
        }else line.readFor=0;
        return text?{resident:line.resident,text}:null;
    }
}
