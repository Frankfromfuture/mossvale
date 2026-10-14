import { Node, UITransform, Layers, Color, Graphics, Label } from 'cc';
import {ObjectCatalog,ObjectEntity,ObjectWorld,TownLayout} from './Layout';
const SCALE=28;
export const actionLabels:Record<string,string>={inspect:'看看',clean:'擦干净',repair:'修一修',toggle:'开关',sit:'坐一会儿',read:'读几页',browse:'翻翻书',water:'浇水',pick:'摘花',harvest:'摘桃子',prune:'修剪',brew:'做咖啡',drink:'喝杯茶','water-fill':'装水',take:'取木料',store:'存木料',craft:'磨木板',collect:'拾起来',move:'搬动',rotate:'转个方向',pack:'收入仓库',rest:'休息'};
export const actionIcons:Record<string,string>={inspect:'memory',clean:'help',repair:'help',toggle:'sun',sit:'rest',read:'memory',browse:'memory',water:'help',pick:'gift',harvest:'gift',prune:'help',brew:'tea',drink:'tea','water-fill':'tea',take:'gift',store:'memory',craft:'help',collect:'gift',move:'walk',rotate:'next'};
export class ObjectScene {
    entities=new Map<string,ObjectEntity>();nodes=new Map<string,Node>();
    private terrain:Node;private props:Node;private halo:Node;private ghost:Node;private shown=-1;navRevision=-1;
    private wallCells=new Set<string>();
    private selected='';private selectedVersion=-1;
    constructor(private world:Node,private catalog:ObjectCatalog,layout:TownLayout){
        this.terrain=this.node('1m grid and road marks',world);this.props=this.node('Object codes',world);
        const g=this.terrain.addComponent(Graphics),b=layout.bounds;
        g.lineWidth=.65;g.strokeColor=new Color(29,29,29,255);
        for(let x=Math.floor(b.minX);x<=Math.ceil(b.maxX);x++){g.moveTo(x*SCALE,-b.minZ*SCALE);g.lineTo(x*SCALE,-b.maxZ*SCALE);}
        for(let z=Math.floor(b.minZ);z<=Math.ceil(b.maxZ);z++){g.moveTo(b.minX*SCALE,-z*SCALE);g.lineTo(b.maxX*SCALE,-z*SCALE);}g.stroke();
        // Outline the joined road surface. Shared tile edges stay invisible.
        g.strokeColor=new Color(112,112,112,255);g.lineWidth=1;
        const roads=catalog.instances.filter(o=>o.defId==='stone-floor'),cells=new Set<string>();
        for(let x=Math.floor(b.minX);x<b.maxX;x++)for(let z=Math.floor(b.minZ);z<b.maxZ;z++){
            if(roads.some(o=>Math.abs(x+.5-o.x)<1&&Math.abs(z+.5-o.z)<1))cells.add(`${x},${z}`);
        }
        const edge=(x:number,z:number,tx:number,tz:number)=>{g.moveTo(x*SCALE,-z*SCALE);g.lineTo(tx*SCALE,-tz*SCALE);};
        cells.forEach(key=>{const [x,z]=key.split(',').map(Number);
            if(!cells.has(`${x},${z-1}`))edge(x,z,x+1,z);
            if(!cells.has(`${x},${z+1}`))edge(x,z+1,x+1,z+1);
            if(!cells.has(`${x-1},${z}`))edge(x,z,x,z+1);
            if(!cells.has(`${x+1},${z}`))edge(x+1,z,x+1,z+1);
        });g.stroke();
        catalog.instances.filter(o=>o.defId==='wall').forEach(o=>this.wallCells.add(`${o.x},${o.z}`));
        this.halo=this.node('Selected outline',world);this.halo.addComponent(Graphics);this.halo.active=false;
        this.ghost=this.node('Placement outline',world);this.ghost.addComponent(Graphics);this.ghost.active=false;
        this.apply({version:catalog.version,revision:0,navRevision:0,patches:{}});
    }
    private node(name:string,parent:Node){const n=new Node(name);n.parent=parent;n.layer=Layers.Enum.UI_2D;n.addComponent(UITransform);return n;}
    bounds(o:ObjectEntity){const turned=o.rotation%180===90;return {x:o.x,z:o.z,w:turned?o.size.d:o.size.w,d:turned?o.size.w:o.size.d};}
    snap(id:string,x:number,z:number){const o=this.entities.get(id)!;const b=this.bounds(o);return {x:Math.round(x-b.w/2)+b.w/2,z:Math.round(z-b.d/2)+b.d/2};}
    blocking(o:ObjectEntity){return o.blocking&&!o.state.removed&&!o.state.stored&&!(o.defId==='door'&&o.state.open);}
    obstacles(){return Array.from(this.entities.values()).filter(o=>this.blocking(o)).map(o=>({...this.bounds(o),id:o.id}));}
    apply(state:ObjectWorld){
        if(state.revision===this.shown)return false;const navigation=state.navRevision!==this.navRevision;this.navRevision=state.navRevision;this.shown=state.revision;
        for(const source of [...this.catalog.instances,...Object.values(state.instances||{})]){const d=this.catalog.definitions[source.defId],p=state.patches[source.id]||{},o={...d,...source,...p,state:{...d.initial,...source.state,...p.state},revision:p.revision||0} as ObjectEntity;
            const previous=this.entities.get(o.id);this.entities.set(o.id,o);if(previous&&previous.revision===o.revision)continue;
            if(o.category==='terrain')continue;
            let n=this.nodes.get(o.id);if(!n){n=this.node(o.id,this.props);n.addComponent(Graphics);if(o.code){const text=this.node('Object code',n);text.getComponent(UITransform)!.setContentSize(34,20);const l=text.addComponent(Label);l.fontFamily='monospace';l.fontSize=13;l.lineHeight=16;l.color=Color.WHITE;l.overflow=Label.Overflow.NONE;l.enableWrapText=false;}this.nodes.set(o.id,n);}
            n.active=!o.state.removed&&!o.state.stored;n.setPosition(o.x*SCALE,-o.z*SCALE);
            const b=this.bounds(o),w=b.w*SCALE,h=b.d*SCALE,g=n.getComponent(Graphics)!;
            n.getComponent(UITransform)!.setContentSize(w,h);g.clear();g.lineWidth=1;g.strokeColor=new Color(140,140,140,255);g.fillColor=new Color(0,0,0,255);
            if(o.defId==='wall'){
                this.drawWall(g,b);
            }else{
                g.rect(-w/2,-h/2,w,h);g.fill();g.stroke();
                if(!o.movable&&this.blocking(o)){g.rect(-w/2+3,-h/2+3,w-6,h-6);g.stroke();}
                const text=n.getChildByName('Object code')!,label=text.getComponent(Label)!;label.string=o.code||'';text.setPosition(0,0);
                if(o.defId==='door'&&o.state.open){g.strokeColor=new Color(0,0,0,255);g.lineWidth=3;g.moveTo(-w/2+5,-h/2);g.lineTo(w/2-5,-h/2);g.stroke();}
            }
        }
        for(const o of Array.from(this.entities.values()).filter(o=>o.surface)){
            const b=this.bounds(o),children=this.children(o.id);let slot: {x:number;z:number}|null=null;
            for(let z=o.z-b.d/2+.5;z<o.z+b.d/2&&!slot;z++)for(let x=o.x-b.w/2+.5;x<o.x+b.w/2;x++){
                if(!children.some(c=>{const r=this.bounds(c);return Math.abs(x-c.x)<r.w/2&&Math.abs(z-c.z)<r.d/2;})){slot={x,z};break;}
            }
            this.nodes.get(o.id)?.getChildByName('Object code')?.setPosition(slot?(slot.x-o.x)*SCALE:0,slot?-(slot.z-o.z)*SCALE:0);
        }
        // Stable draw order. Small attached objects stay individually addressable above their support.
        Array.from(this.entities.values()).filter(o=>o.category!=='terrain').sort((a,b)=>(a.parentId?1:0)-(b.parentId?1:0)||a.z-b.z).forEach((o,i)=>this.nodes.get(o.id)!.setSiblingIndex(i));
        this.highlight(this.selected);return navigation;
    }
    private drawWall(g:Graphics,b:{x:number;z:number;w:number;d:number}){
        // Only exposed edges: the inner and outer room contours join at corners.
        const edge=(x:number,z:number,tx:number,tz:number)=>{g.moveTo(x*SCALE,-z*SCALE);g.lineTo(tx*SCALE,-tz*SCALE);};
        if(!this.wallCells.has(`${b.x},${b.z-1}`))edge(-.5,-.5,.5,-.5);
        if(!this.wallCells.has(`${b.x},${b.z+1}`))edge(-.5,.5,.5,.5);
        if(!this.wallCells.has(`${b.x-1},${b.z}`))edge(-.5,-.5,-.5,.5);
        if(!this.wallCells.has(`${b.x+1},${b.z}`))edge(.5,-.5,.5,.5);
        g.stroke();
    }
    at(x:number,z:number,terrain=false){
        const candidates=Array.from(this.entities.values()).filter(o=>!o.state.removed&&!o.state.stored&&((o.category==='terrain')===terrain)).filter(o=>{const b=this.bounds(o),padding=o.category==='structure'?.08:.25;return Math.abs(x-b.x)<=Math.max(b.w/2+padding,.62)&&Math.abs(z-b.z)<=Math.max(b.d/2+padding,.62);});
        candidates.sort((a,b)=>(b.parentId?1:0)-(a.parentId?1:0)||Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z));return candidates[0]||null;
    }
    distance(x:number,z:number,o:ObjectEntity){const b=this.bounds(o);return Math.hypot(Math.max(0,Math.abs(x-b.x)-b.w/2),Math.max(0,Math.abs(z-b.z)-b.d/2));}
    highlight(id:string){this.selected=id;const o=this.entities.get(id);this.halo.active=!!o&&!o.state.removed&&!o.state.stored;if(!o||this.selectedVersion===o.revision&&this.halo.name===id)return;this.selectedVersion=o.revision;this.halo.name=id;
        const b=this.bounds(o),g=this.halo.getComponent(Graphics)!;g.clear();g.strokeColor=new Color(255,255,255,255);g.lineWidth=2;g.rect(-b.w*SCALE/2,-b.d*SCALE/2,b.w*SCALE,b.d*SCALE);g.stroke();this.halo.setPosition(o.x*SCALE,-o.z*SCALE);
    }
    preview(id:string,x:number,z:number){const o=this.entities.get(id);this.ghost.active=!!o;if(!o)return;const b=this.bounds(o),g=this.ghost.getComponent(Graphics)!;g.clear();g.fillColor=new Color(255,255,255,20);g.strokeColor=new Color(255,255,255,255);g.lineWidth=2;g.rect(-b.w*SCALE/2,-b.d*SCALE/2,b.w*SCALE,b.d*SCALE);g.fill();g.stroke();const p=this.snap(id,x,z);this.ghost.setPosition(p.x*SCALE,-p.z*SCALE);}
    hidePreview(){this.ghost.active=false;}
    children(id:string){return Array.from(this.entities.values()).filter(o=>o.parentId===id&&!o.state.removed&&!o.state.stored);}
    details(o:ObjectEntity,inventory:Record<string,number>={}){
        const s=o.state,lines=[`编号：${o.code||'地形符号'}`, `${o.material} · ${o.mass} 千克`,`归属：${o.owner}`,`尺寸：${o.size.w}m × ${o.size.d}m`,`位置：${o.x.toFixed(1)}，${o.z.toFixed(1)}`,`朝向：${o.rotation}°`,`耐久：${s.health} / ${o.maxHealth}`,`整洁：${s.cleanliness}%`,this.blocking(o)?'通行：占用地面':'通行：可以经过',o.movable?'摆放：可以搬动、旋转':'摆放：固定在这里'];
        if(o.parentId)lines.push(`摆在：${this.entities.get(o.parentId)?.name||'物品上'}`);
        if(s.open!=null)lines.push(`门：${s.open?'开着':'关着'}`);if(s.lit!=null)lines.push(`灯光：${s.lit?'亮着':'熄灭'}`);if(s.running!=null)lines.push(`水流：${s.running?'流动':'已停'}`);
        if(s.moisture!=null)lines.push(`土壤湿度：${Math.round(s.moisture)}%`);if(s.growth!=null)lines.push(`生长：${Math.round(s.growth)}%`);
        if(s.stock!=null)lines.push(`存量：${s.stock} / ${s.capacity}`);if(s.volume!=null)lines.push(s.volume?`杯中：${s.content}`:'杯中：空了');
        if(s.occupiedBy!=null)lines.push(s.occupiedBy?'座位：有人坐着':'座位：空着');if(s.uses)lines.push(`使用过 ${s.uses} 次`);
        const contents=this.children(o.id);if(contents.length)lines.push('放着：'+contents.map(c=>c.name).join('、'));
        lines.push(`口袋：木料 ${inventory.wood||0} · 水 ${inventory.water||0}`);return lines;
    }
}
