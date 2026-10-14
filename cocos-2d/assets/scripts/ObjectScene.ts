import {Node,UITransform,Layers,Color,Graphics,Sprite,SpriteFrame,Texture2D,Rect,Size} from 'cc';
import {ObjectCatalog,ObjectEntity,ObjectWorld,TownLayout} from './Layout';
const SCALE=32;
type Visual={frames:string[];width?:number;height?:number;small?:boolean;ground?:boolean;seat?:boolean;fitWidth?:boolean;surfaceLift?:number;surfaceDepth?:number;attachedScale?:number};
export type LpcArt={frames:Record<string,{rect:number[]}>;definitions:Record<string,Visual>;characters:Record<string,number[]>};
type Display={x:number;y:number;w:number;h:number;bottom:number;depth:number};
export const actionLabels:Record<string,string>={inspect:'看看',clean:'擦干净',repair:'修一修',toggle:'开关',sit:'坐一会儿',read:'读几页',browse:'翻翻书',water:'浇水',pick:'摘花',harvest:'摘桃子',prune:'修剪',brew:'做咖啡',drink:'喝杯茶','water-fill':'装水',take:'取木料',store:'存木料',craft:'磨木板',collect:'拾起来',move:'搬动',rotate:'转个方向',pack:'收入仓库',rest:'休息'};
export const actionIcons:Record<string,string>={inspect:'memory',clean:'help',repair:'help',toggle:'sun',sit:'rest',read:'memory',browse:'memory',water:'help',pick:'gift',harvest:'gift',prune:'help',brew:'tea',drink:'tea','water-fill':'tea',take:'gift',store:'memory',craft:'help',collect:'gift',move:'walk',rotate:'next'};
export class ObjectScene {
    entities=new Map<string,ObjectEntity>();nodes=new Map<string,Node>();frames=new Map<string,SpriteFrame>();
    actorLayer:Node;
    private terrain:Node;private halo:Node;private ghost:Node;private shown=-1;navRevision=-1;
    private wallCells=new Set<string>();private displays=new Map<string,Display>();private selected='';
    private chunks:{node:Node;x:number;z:number}[]=[];private viewKey='';private order='';
    constructor(private world:Node,private catalog:ObjectCatalog,layout:TownLayout,private art:LpcArt,texture:Texture2D){
        texture.setFilters(Texture2D.Filter.NEAREST,Texture2D.Filter.NEAREST);
        for(const [key,entry] of Object.entries(art.frames)){const r=entry.rect,sf=new SpriteFrame();sf.texture=texture;sf.rect=new Rect(r[0],r[1],r[2],r[3]);sf.originalSize=new Size(r[2],r[3]);this.frames.set(key,sf);}
        this.terrain=this.node('LPC ground',world);this.actorLayer=this.node('LPC objects and people',world);
        this.ground(layout);
        catalog.instances.filter(o=>o.defId==='wall').forEach(o=>this.wallCells.add(`${o.x},${o.z}`));
        this.halo=this.node('Selected object',world);this.halo.addComponent(Graphics);this.halo.active=false;
        this.ghost=this.node('Placement preview',world);this.ghost.addComponent(Graphics);this.ghost.active=false;
        this.apply({version:catalog.version,revision:0,navRevision:0,patches:{}});
    }
    private node(name:string,parent:Node){const n=new Node(name);n.parent=parent;n.layer=Layers.Enum.UI_2D;n.addComponent(UITransform);return n;}
    private sprite(parent:Node,key:string,x:number,y:number,w?:number,h?:number,anchorY=.5){
        const sf=this.frames.get(key);if(!sf)throw new Error('Missing LPC frame '+key);
        const n=this.node(key,parent),s=n.addComponent(Sprite);s.spriteFrame=sf;s.sizeMode=Sprite.SizeMode.CUSTOM;s.trim=false;
        const t=n.getComponent(UITransform)!;t.setAnchorPoint(.5,anchorY);t.setContentSize(w??sf.rect.width,h??sf.rect.height);n.setPosition(x,y);return n;
    }
    private ground(layout:TownLayout){
        const cells=new Map<string,string>(),b=layout.bounds;
        for(const o of this.catalog.instances){if(this.catalog.definitions[o.defId].category!=='terrain')continue;
            const size=this.catalog.definitions[o.defId].size;
            for(let x=Math.floor(o.x-size.w/2);x<o.x+size.w/2;x++)for(let z=Math.floor(o.z-size.d/2);z<o.z+size.d/2;z++)cells.set(`${x},${z}`,o.defId);
        }
        // A small textured surround prevents empty margins when the whole map fits on screen.
        for(let cx=b.minX-8;cx<b.maxX+8;cx+=8)for(let cz=b.minZ-8;cz<b.maxZ+8;cz+=8){
            const chunk=this.node(`Ground ${cx},${cz}`,this.terrain);chunk.setPosition(cx*SCALE,-cz*SCALE);this.chunks.push({node:chunk,x:cx+4,z:cz+4});
            for(let dx=0;dx<8;dx++)for(let dz=0;dz<8;dz++){
                const x=cx+dx,z=cz+dz,kind=cells.get(`${x},${z}`)||'grass',hash=Math.abs((x*374761393+z*668265263)^((x+z)*1274126177)),v=hash%4;
                let frame=kind==='stone-floor'?'paving'+v:kind==='wood-floor'?'planks'+v:kind==='soil'?'soil':'grass'+(hash%11===0?1+v%3:0);
                if(kind==='wood-floor'&&x>=19&&x<25&&z>=3&&z<5)frame='tile-bath';
                this.sprite(chunk,frame,(dx+.5)*SCALE,-(dz+.5)*SCALE,SCALE,SCALE);
            }
        }
    }
    bounds(o:ObjectEntity){const turned=o.rotation%180===90;return {x:o.x,z:o.z,w:turned?o.size.d:o.size.w,d:turned?o.size.w:o.size.d};}
    snap(id:string,x:number,z:number){const b=this.bounds(this.entities.get(id)!);return {x:Math.round(x-b.w/2)+b.w/2,z:Math.round(z-b.d/2)+b.d/2};}
    blocking(o:ObjectEntity){return o.blocking&&!o.state.removed&&!o.state.stored&&!(o.defId==='door'&&o.state.open);}
    obstacles(){return Array.from(this.entities.values()).filter(o=>this.blocking(o)).map(o=>({...this.bounds(o),id:o.id}));}
    private surface(o:ObjectEntity){const b=this.bounds(o),v=this.art.definitions[o.defId];return {x:o.x*SCALE,y:-o.z*SCALE+(v.surfaceLift??12),w:b.w*SCALE,d:b.d*SCALE,compression:v.surfaceDepth??.5};}
    placementPoint(id:string,x:number,z:number){
        const o=this.entities.get(id);if(!o)return {x,z};
        if(['item','plant','appliance'].includes(o.category)&&!o.blocking){
            const own=this.bounds(o),surfaces=Array.from(this.entities.values()).filter(s=>s.id!==id&&s.surface&&!s.state.removed&&!s.state.stored).reverse();
            for(const parent of surfaces){const p=this.surface(parent),b=this.bounds(parent),px=x*SCALE,py=-z*SCALE;
                if(own.w>b.w||own.d>b.d||Math.abs(px-p.x)>p.w/2||Math.abs(py-p.y)>p.d*p.compression/2+6)continue;
                const result=this.snap(id,x,parent.z+(p.y-py)/(SCALE*p.compression));
                result.x=Math.max(parent.x-b.w/2+own.w/2,Math.min(parent.x+b.w/2-own.w/2,result.x));
                result.z=Math.max(parent.z-b.d/2+own.d/2,Math.min(parent.z+b.d/2-own.d/2,result.z));return result;
            }
        }
        return this.snap(id,x,z);
    }
    private attachedPosition(o:ObjectEntity){
        const parent=o.parentId?this.entities.get(o.parentId):null;if(!parent)return {x:o.x*SCALE,y:-o.z*SCALE};
        const p=this.surface(parent);return {x:p.x+(o.x-parent.x)*SCALE,y:p.y-(o.z-parent.z)*SCALE*p.compression};
    }
    apply(state:ObjectWorld){
        if(state.revision===this.shown)return false;const navigation=state.navRevision!==this.navRevision;this.navRevision=state.navRevision;this.shown=state.revision;const dirty:ObjectEntity[]=[];
        for(const source of [...this.catalog.instances,...Object.values(state.instances||{})]){
            const d=this.catalog.definitions[source.defId],p=state.patches[source.id]||{},o={...d,...source,...p,state:{...d.initial,...source.state,...p.state},revision:p.revision||0} as ObjectEntity;
            const previous=this.entities.get(o.id);this.entities.set(o.id,o);if(o.category==='terrain')continue;
            if(!this.nodes.has(o.id)){const n=this.node(o.id,this.actorLayer);this.node('Artwork',n);this.nodes.set(o.id,n);}
            if(!previous||previous.revision!==o.revision)dirty.push(o);
        }
        for(const o of dirty)this.render(o);
        // Attachments remain separate nodes, drawn within their support's depth group.
        for(const o of Array.from(this.entities.values()))if(o.category!=='terrain'){
            const n=this.nodes.get(o.id)!,parent=o.parentId?this.nodes.get(o.parentId):null,pos=this.attachedPosition(o);
            n.parent=parent||this.actorLayer;
            if(parent){const p=this.entities.get(o.parentId!)!;n.setPosition(pos.x-p.x*SCALE,pos.y+p.z*SCALE);}
            else n.setPosition(pos.x,pos.y);
            const d=this.displays.get(o.id);if(d){d.x=pos.x;d.y=pos.y;d.depth=o.parentId?(this.displays.get(o.parentId)?.depth??o.z)+.001:o.defId==='rug'?-10000:o.z+this.bounds(o).d/2;}
        }
        this.viewKey='';this.order='';this.highlight(this.selected);return navigation;
    }
    private render(o:ObjectEntity){
        const n=this.nodes.get(o.id)!,art=n.getChildByName('Artwork')!;for(const c of art.children.slice()){c.removeFromParent();c.destroy();}
        n.active=!o.state.removed&&!o.state.stored;if(!n.active)return;
        const v=this.art.definitions[o.defId];if(!v)throw new Error('Unmapped LPC object '+o.defId);
        const b=this.bounds(o),turn=((o.rotation/90)%4+4)%4;let key=v.frames[turn%v.frames.length];
        let w=0,h=0,bottom=-b.d*SCALE/2;
        if(o.defId==='wall'){
            w=h=SCALE;this.sprite(art,'wall-fill',0,0,SCALE,SCALE);
            if(!this.wallCells.has(`${o.x},${o.z-1}`))this.sprite(art,'wall-n',0,12,32,8);
            if(!this.wallCells.has(`${o.x},${o.z+1}`))this.sprite(art,'wall-s',0,-12,32,8);
            if(!this.wallCells.has(`${o.x-1},${o.z}`))this.sprite(art,'wall-w',-12,0,8,32);
            if(!this.wallCells.has(`${o.x+1},${o.z}`))this.sprite(art,'wall-e',12,0,8,32);
        }else if(o.defId==='door'){
            // Door leaves stay upright. Side entrances use a cutaway along the partition.
            w=b.w*SCALE;h=turn%2?b.d*SCALE:56;bottom=turn%2?-h/2:-16;
            if(turn%2){
                this.sprite(art,'wall-n',0,h/2-5,32,10);this.sprite(art,'wall-s',0,-h/2+5,32,10);
                if(!o.state.open)this.sprite(art,'wall-w',0,0,14,h-12);
            }else{
                const leaf=o.state.open?'door-open':'door';
                this.sprite(art,leaf,-w/2+20,bottom,32,56,0);const right=this.sprite(art,leaf,w/2-20,bottom,32,56,0);right.setScale(-1,1,1);
            }
        }else{
            const f=this.frames.get(key)!,nativeW=f.rect.width,nativeH=f.rect.height;
            w=v.width?v.width*SCALE:nativeW;h=v.height?v.height*SCALE:nativeH*(w/nativeW);
            if(v.fitWidth){w=b.w*SCALE;h=nativeH;}
            if(o.parentId){const scale=v.attachedScale??1;w*=scale;h*=scale;bottom=0;}else if(v.small)bottom=0;
            if(o.defId==='rug'){w=b.w*SCALE;h=b.d*SCALE;bottom=-h/2;}
            const sprite=this.sprite(art,key,0,bottom,w,h,0).getComponent(Sprite)!;
            if(o.defId==='lamp'&&!o.state.lit)sprite.color=new Color(125,137,152);
            if(o.defId==='cup'&&!o.state.volume)sprite.color=new Color(176,177,169);
            if(o.defId==='fountain'&&!o.state.running)sprite.color=new Color(158,177,170);
            if(o.category==='plant'&&o.state.moisture<25)sprite.color=new Color(215,199,141);
        }
        const pos=this.attachedPosition(o);this.displays.set(o.id,{...pos,w,h,bottom,depth:o.z+b.d/2});
    }
    updateView(x:number,z:number,halfW:number,halfH:number,people:{id:string;node:Node;x:number;z:number}[]){
        const key=[x,z,halfW,halfH].map(n=>Math.round(n*2)).join(':');
        if(key!==this.viewKey){this.viewKey=key;
            for(const c of this.chunks)c.node.active=Math.abs(c.x-x)<halfW+5&&Math.abs(c.z-z)<halfH+5;
            for(const [id,n] of Array.from(this.nodes)){const o=this.entities.get(id)!;n.active=!o.state.removed&&!o.state.stored&&Math.abs(o.x-x)<halfW+6&&Math.abs(o.z-z)<halfH+7;}
        }
        const ordered:{node:Node;depth:number;id:string}[]=[];
        for(const [id,n] of Array.from(this.nodes))if(n.parent===this.actorLayer){ordered.push({node:n,depth:this.displays.get(id)?.depth??0,id});}
        for(const p of people)ordered.push({node:p.node,depth:p.z+.01,id:p.id});
        ordered.sort((a,b)=>a.depth-b.depth||a.id.localeCompare(b.id));const order=ordered.map(o=>o.id).join(',');
        if(order!==this.order){this.order=order;ordered.forEach((entry,i)=>entry.node.setSiblingIndex(i));}
    }
    at(x:number,z:number,terrain=false){
        if(terrain)return Array.from(this.entities.values()).find(o=>o.category==='terrain'&&Math.abs(x-o.x)<=o.size.w/2&&Math.abs(z-o.z)<=o.size.d/2)||null;
        const candidates=Array.from(this.entities.values()).filter(o=>o.category!=='terrain'&&!o.state.removed&&!o.state.stored).filter(o=>{
            const d=this.displays.get(o.id);if(!d)return false;return Math.abs(x*SCALE-d.x)<=Math.max(d.w/2,9)&&-z*SCALE>=d.y+d.bottom-3&&-z*SCALE<=d.y+d.bottom+d.h+3;
        });
        candidates.sort((a,b)=>{const ad=this.displays.get(a.id)!,bd=this.displays.get(b.id)!;return bd.depth-ad.depth||(b.parentId?1:0)-(a.parentId?1:0)||ad.w*ad.h-bd.w*bd.h;});return candidates[0]||null;
    }
    distance(x:number,z:number,o:ObjectEntity){const b=this.bounds(o);return Math.hypot(Math.max(0,Math.abs(x-b.x)-b.w/2),Math.max(0,Math.abs(z-b.z)-b.d/2));}
    highlight(id:string){this.selected=id;const o=this.entities.get(id),d=this.displays.get(id);this.halo.active=!!o&&!!d&&!o.state.removed&&!o.state.stored;if(!d)return;
        const g=this.halo.getComponent(Graphics)!;g.clear();g.strokeColor=new Color(255,242,179);g.lineWidth=1.5;g.roundRect(-d.w/2-2,d.bottom-2,d.w+4,d.h+4,3);g.stroke();this.halo.setPosition(d.x,d.y);
    }
    preview(id:string,x:number,z:number){const o=this.entities.get(id);this.ghost.active=!!o;if(!o)return;const b=this.bounds(o),g=this.ghost.getComponent(Graphics)!;g.clear();g.fillColor=new Color(244,225,151,40);g.strokeColor=new Color(255,239,171);g.lineWidth=2;g.rect(-b.w*SCALE/2,-b.d*SCALE/2,b.w*SCALE,b.d*SCALE);g.fill();g.stroke();const p=this.placementPoint(id,x,z);this.ghost.setPosition(p.x*SCALE,-p.z*SCALE);}
    hidePreview(){this.ghost.active=false;}
    children(id:string){return Array.from(this.entities.values()).filter(o=>o.parentId===id&&!o.state.removed&&!o.state.stored);}
    seat(id:string){const o=this.entities.get(id);if(!o||!this.art.definitions[o.defId]?.seat)return null;return {x:o.x,z:o.z,direction:[2,1,0,3][((o.rotation/90)%4+4)%4]};}
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
