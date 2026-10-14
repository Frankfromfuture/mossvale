import { Node, UITransform, Layers, Sprite, SpriteFrame, Texture2D, Rect, Size, Color, Graphics, UIOpacity } from 'cc';
import {ObjectCatalog,ObjectEntity,ObjectWorld} from './Layout';
const SCALE=20;
export const actionLabels:Record<string,string>={inspect:'看看',clean:'擦干净',repair:'修一修',toggle:'开关',sit:'坐一会儿',read:'读几页',browse:'翻翻书',water:'浇水',pick:'摘花',harvest:'摘桃子',prune:'修剪',brew:'做咖啡',drink:'喝杯茶','water-fill':'装水',take:'取木料',store:'存木料',craft:'磨木板',collect:'拾起来',move:'搬动',rotate:'转个方向'};
export const actionIcons:Record<string,string>={inspect:'memory',clean:'help',repair:'help',toggle:'sun',sit:'rest',read:'memory',browse:'memory',water:'help',pick:'gift',harvest:'gift',prune:'help',brew:'tea',drink:'tea','water-fill':'tea',take:'gift',store:'memory',craft:'help',collect:'gift',move:'walk',rotate:'next'};
export class ObjectScene {
    entities=new Map<string,ObjectEntity>();nodes=new Map<string,Node>();frames=new Map<string,SpriteFrame>();
    private terrain:Node;private props:Node;private halo:Node;private ghost:Node;private shown=-1;navRevision=-1;
    private selected='';private selectedVersion=-1;
    constructor(private world:Node,private catalog:ObjectCatalog,atlas:Record<string,{atlas:string;rect:number[]}>,textures:Record<string,Texture2D>){
        for(const [id,f] of Object.entries(atlas)){const sf=new SpriteFrame();sf.texture=textures[f.atlas];sf.rect=new Rect(...f.rect as [number,number,number,number]);sf.originalSize=new Size(f.rect[2],f.rect[3]);this.frames.set(id,sf);}
        this.terrain=this.node('Independent ground tiles',world);this.props=this.node('Independent objects',world);
        this.halo=this.node('Selected object outline',world);this.halo.addComponent(Graphics);this.halo.active=false;
        this.ghost=this.node('Furniture placement preview',world);this.ghost.addComponent(Graphics);this.ghost.active=false;
        this.apply({version:catalog.version,revision:0,navRevision:0,patches:{}});
    }
    private node(name:string,parent:Node){const n=new Node(name);n.parent=parent;n.layer=Layers.Enum.UI_2D;n.addComponent(UITransform);return n;}
    bounds(o:ObjectEntity){const angle=o.rotation*Math.PI/180,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));return {x:o.x,z:o.z,w:c*o.size.w+s*o.size.d,d:s*o.size.w+c*o.size.d};}
    blocking(o:ObjectEntity){return o.blocking&&!o.state.removed&&!(o.defId==='door'&&o.state.open);}
    obstacles(){return Array.from(this.entities.values()).filter(o=>this.blocking(o)).map(o=>({...this.bounds(o),id:o.id}));}
    apply(state:ObjectWorld){
        if(state.revision===this.shown)return false;const navigation=state.navRevision!==this.navRevision;this.navRevision=state.navRevision;this.shown=state.revision;
        for(const source of this.catalog.instances){const d=this.catalog.definitions[source.defId],p=state.patches[source.id]||{},o={...d,...source,...p,state:{...d.initial,...source.state,...p.state},revision:p.revision||0} as ObjectEntity;
            const previous=this.entities.get(o.id);this.entities.set(o.id,o);if(previous&&previous.revision===o.revision)continue;
            let n=this.nodes.get(o.id);if(!n){n=this.node(o.id,o.category==='terrain'?this.terrain:this.props);n.addComponent(Sprite);this.nodes.set(o.id,n);}
            n.active=!o.state.removed;n.setPosition(o.x*SCALE,-o.z*SCALE);n.setRotationFromEuler(0,0,-o.rotation);
            if(o.defId==='door'&&o.state.open)n.setPosition(o.x*SCALE,-o.z*SCALE+18);
            const s=n.getComponent(Sprite)!,sprite=o.defId==='door'?(o.state.open?o.openSprite:o.closedSprite):o.sprite;
            s.spriteFrame=this.frames.get(sprite!)!;s.sizeMode=Sprite.SizeMode.CUSTOM;s.trim=false;
            n.getComponent(UITransform)!.setContentSize((o.render?.w||o.size.w)*SCALE,(o.defId==='door'?(o.state.open?2.6:.75):(o.render?.d||o.size.d))*SCALE);
            s.color=o.defId==='lamp'&&!o.state.lit?new Color(125,139,139):o.defId==='cup'&&!o.state.volume?new Color(215,201,168):o.category==='plant'&&o.state.moisture<25?new Color(201,184,136):o.defId==='fountain'&&!o.state.running?new Color(175,191,174):Color.WHITE;
        }
        // Stable draw order. Small attached objects stay individually addressable above their support.
        Array.from(this.entities.values()).filter(o=>o.category!=='terrain').sort((a,b)=>(a.parentId?1:0)-(b.parentId?1:0)||a.z-b.z).forEach((o,i)=>this.nodes.get(o.id)!.setSiblingIndex(i));
        this.highlight(this.selected);return navigation;
    }
    at(x:number,z:number,terrain=false){
        const candidates=Array.from(this.entities.values()).filter(o=>!o.state.removed&&((o.category==='terrain')===terrain)).filter(o=>{const b=this.bounds(o),padding=o.category==='structure'?.08:.25;return Math.abs(x-b.x)<=Math.max(b.w/2+padding,.62)&&Math.abs(z-b.z)<=Math.max(b.d/2+padding,.62);});
        candidates.sort((a,b)=>(b.parentId?1:0)-(a.parentId?1:0)||Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z));return candidates[0]||null;
    }
    distance(x:number,z:number,o:ObjectEntity){const b=this.bounds(o);return Math.hypot(Math.max(0,Math.abs(x-b.x)-b.w/2),Math.max(0,Math.abs(z-b.z)-b.d/2));}
    highlight(id:string){this.selected=id;const o=this.entities.get(id);this.halo.active=!!o&&!o.state.removed;if(!o||this.selectedVersion===o.revision&&this.halo.name===id)return;this.selectedVersion=o.revision;this.halo.name=id;
        const b=this.bounds(o),g=this.halo.getComponent(Graphics)!;g.clear();g.strokeColor=new Color(255,248,197,255);g.lineWidth=2;g.roundRect(-b.w*SCALE/2-3,-b.d*SCALE/2-3,b.w*SCALE+6,b.d*SCALE+6,5);g.stroke();this.halo.setPosition(o.x*SCALE,-o.z*SCALE);
    }
    preview(id:string,x:number,z:number){const o=this.entities.get(id);this.ghost.active=!!o;if(!o)return;const b=this.bounds(o),g=this.ghost.getComponent(Graphics)!;g.clear();g.fillColor=new Color(225,239,168,65);g.strokeColor=new Color(255,246,205,255);g.lineWidth=2;g.roundRect(-b.w*SCALE/2,-b.d*SCALE/2,b.w*SCALE,b.d*SCALE,4);g.fill();g.stroke();this.ghost.setPosition(x*SCALE,-z*SCALE);}
    hidePreview(){this.ghost.active=false;}
    children(id:string){return Array.from(this.entities.values()).filter(o=>o.parentId===id&&!o.state.removed);}
    details(o:ObjectEntity,inventory:Record<string,number>={}){
        const s=o.state,lines=[`${o.material} · ${o.mass} 千克`,`归属：${o.owner}`,`尺寸：${o.size.w} × ${o.size.d}`,`位置：${o.x.toFixed(1)}，${o.z.toFixed(1)}`,`朝向：${o.rotation}°`,`耐久：${s.health} / ${o.maxHealth}`,`整洁：${s.cleanliness}%`,this.blocking(o)?'通行：占用地面':'通行：可以经过',o.movable?'摆放：可以搬动、旋转':'摆放：固定在这里'];
        if(o.parentId)lines.push(`摆在：${this.entities.get(o.parentId)?.name||'物品上'}`);
        if(s.open!=null)lines.push(`门：${s.open?'开着':'关着'}`);if(s.lit!=null)lines.push(`灯光：${s.lit?'亮着':'熄灭'}`);if(s.running!=null)lines.push(`水流：${s.running?'流动':'已停'}`);
        if(s.moisture!=null)lines.push(`土壤湿度：${Math.round(s.moisture)}%`);if(s.growth!=null)lines.push(`生长：${Math.round(s.growth)}%`);
        if(s.stock!=null)lines.push(`存量：${s.stock} / ${s.capacity}`);if(s.volume!=null)lines.push(s.volume?`杯中：${s.content}`:'杯中：空了');
        if(s.occupiedBy!=null)lines.push(s.occupiedBy?'座位：有人坐着':'座位：空着');if(s.uses)lines.push(`使用过 ${s.uses} 次`);
        const contents=this.children(o.id);if(contents.length)lines.push('放着：'+contents.map(c=>c.name).join('、'));
        lines.push(`口袋：木料 ${inventory.wood||0} · 水 ${inventory.water||0}`);return lines;
    }
}
