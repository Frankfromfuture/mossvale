import {Node,UITransform,Label,Graphics,Color,Layers,Mask,ScrollView,Vec2} from 'cc';
import {GRID_UI,UI} from './VillageUi';

export type JournalRow={id:string;heading:string;status?:string;text:string;run?:()=>void};
export type JournalBookmark={id:string;inside:number;offset:number};
const color=(hex:string)=>new Color().fromHEX(hex);
const ink=GRID_UI?UI.ink:'#EEEEEE',muted=GRID_UI?UI.muted:'#AAAAAA',line=GRID_UI?UI.line:'#555555';

/** A clipped, native list. Polling keeps the same scroll view and visible record. */
export class JournalScroll {
    readonly node:Node;readonly content:Node;readonly scroll:ScrollView;
    private signature='';private rows:{id:string;top:number;height:number}[]=[];
    private pending:JournalRow[]|null=null;private track:Graphics;
    constructor(parent:Node,private width:number,private height:number,y:number,private bind:(n:Node,run:()=>void)=>void,private detailStyle=false){
        this.node=this.make('Life record viewport',parent,width,height);this.node.active=false;this.node.setPosition(0,y);this.node.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
        this.content=this.make('Life record content',this.node,width,height);this.content.getComponent(UITransform)!.setAnchorPoint(.5,1);this.content.setPosition(0,height/2);
        this.scroll=this.node.addComponent(ScrollView);this.scroll.horizontal=false;this.scroll.vertical=true;this.scroll.elastic=false;this.scroll.inertia=true;this.scroll.brake=.65;this.scroll.cancelInnerEvents=true;this.scroll.content=this.content;
        const track=this.make('Life record scrollbar',parent,3,height);track.setPosition(width/2+8,y);this.track=track.addComponent(Graphics);
        this.node.on(ScrollView.EventType.SCROLLING,this.paintTrack,this);
        this.node.on(ScrollView.EventType.SCROLL_ENDED,()=>{this.paintTrack();if(this.pending)Promise.resolve().then(()=>{if(this.node.isValid&&this.pending)this.setRows(this.pending);});});
        // Enable after assigning content so ScrollView observes later content-size changes.
        this.node.active=true;
    }
    private make(name:string,parent:Node,w:number,h:number){const n=new Node(name);n.parent=parent;n.layer=Layers.Enum.UI_2D;n.addComponent(UITransform).setContentSize(w,h);return n;}
    private text(parent:Node,name:string,text:string,top:number,size:number,tone:string,bold=false){
        const n=this.make(name,parent,this.width-12,1);n.getComponent(UITransform)!.setAnchorPoint(.5,1);n.setPosition(-3,-top);
        const l=n.addComponent(Label);l.fontFamily=UI.font;l.fontSize=size;l.lineHeight=size===15?22:size+7;l.color=color(tone);l.isBold=bold;l.horizontalAlign=Label.HorizontalAlign.LEFT;l.verticalAlign=Label.VerticalAlign.TOP;l.enableWrapText=true;l.overflow=Label.Overflow.RESIZE_HEIGHT;l.string=text;l.updateRenderData(true);
        return n.getComponent(UITransform)!.height;
    }
    bookmark():JournalBookmark{
        const offset=Math.max(0,this.scroll.getScrollOffset().y),row=this.rows.find(r=>r.top+r.height>offset);
        return {id:row?.id||'',inside:offset-(row?.top||0),offset};
    }
    setRows(rows:JournalRow[],restore?:JournalBookmark){
        const signature=JSON.stringify(rows.map(({id,heading,status,text})=>({id,heading,status,text})));
        if(signature===this.signature){this.pending=null;return;}
        if(!restore&&(this.scroll.isScrolling()||this.scroll.isAutoScrolling())){this.pending=rows;return;}
        const bookmark=restore||this.bookmark();this.pending=null;this.signature=signature;
        this.content.children.slice().forEach(n=>n.destroy());this.rows=[];let top=0;
        for(const entry of rows){
            const row=this.make('Life record '+entry.id,this.content,this.width,1);row.getComponent(UITransform)!.setAnchorPoint(.5,1);row.setPosition(0,-top);
            let height=this.text(row,'Record heading',entry.heading,0,this.detailStyle||entry.run?15:12,this.detailStyle||entry.run?ink:muted,this.detailStyle||!!entry.run)+4;
            if(entry.status)height+=this.text(row,'Decision timing',entry.status,height,13,ink,true)+5;
            height+=this.text(row,'Record body',entry.text,height,this.detailStyle||entry.run?13:15,this.detailStyle||entry.run?muted:ink)+18;
            row.getComponent(UITransform)!.setContentSize(this.width,height);if(entry.run)this.bind(row,entry.run);
            const g=row.addComponent(Graphics);g.strokeColor=color(line);g.lineWidth=1;g.moveTo(-this.width/2,-height+7);g.lineTo(this.width/2-6,-height+7);g.stroke();
            this.rows.push({id:entry.id,top,height});top+=height+10;
        }
        this.content.getComponent(UITransform)!.setContentSize(this.width,Math.max(this.height,top));
        const anchor=this.rows.find(r=>r.id===bookmark.id),offset=bookmark.offset<2?0:anchor?anchor.top+bookmark.inside:bookmark.offset;
        this.scroll.scrollToOffset(new Vec2(0,Math.max(0,Math.min(offset,this.scroll.getMaxScrollOffset().y))));this.paintTrack();
    }
    private paintTrack(){
        const g=this.track,max=this.scroll.getMaxScrollOffset().y;g.clear();if(max<=0)return;
        const height=Math.max(24,this.height*this.height/(this.height+max)),offset=Math.max(0,Math.min(1,this.scroll.getScrollOffset().y/max));
        g.fillColor=color(line);g.roundRect(-1.5,-this.height/2,3,this.height,1.5);g.fill();g.fillColor=color(muted);g.roundRect(-1.5,this.height/2-height-offset*(this.height-height),3,height,1.5);g.fill();
    }
}
