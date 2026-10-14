import {art,artIcon,artReady} from './UiArt';
import {GRID_UI,UI,panel,panelInk,CompactDialogue,CONTEXT_RING,speechLayout,drawSpeechBubble} from './VillageUi';
import {JournalScroll,JournalRow} from './JournalScroll';
import {ActivityBubbles} from './ActivityBubbles';
import {EconomyHud} from './EconomyHud';
import { Node, Canvas, Camera, UITransform, Graphics, Color, Label, LabelOutline, Layers, EditBox, view, ResolutionPolicy, Vec3, sys, Sprite, SpriteFrame, resources, UIOpacity } from 'cc';
import {PlaceSpot, TownLayout} from './Layout';
import { Resident, TownState } from './TownApi';
declare const wx:any;
const ink:string=GRID_UI?UI.ink:'#EEEEEE', paper:string=GRID_UI?UI.paper:'#050505', green:string=GRID_UI?UI.muted:'#AAAAAA', ochre:string=GRID_UI?UI.badge:'#FFFFFF';
const c=(s:string)=>new Color().fromHEX(s);
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export type HudActions={send:(kind:string,message?:string)=>void;close:()=>void;control:(action:string,speed?:number)=>void;navigate:(place:string)=>void;zoom:(direction:number)=>void;economy:(action:string,payload?:Record<string,unknown>)=>void;placeObject:(id:string)=>void};
export type ContextOption={label:string;icon:string;cost?:string;run:()=>void};
type Motion={node:Node;time:number;duration:number;from:number};

/** Native, world-attached game UI. Paper is a prop, never a generic panel. */
export class TownHud {
    activities:ActivityBubbles;economy:EconomyHud;canvas:Node;uiCamera:Camera;topInset=0;bottomInset=0;leftInset=0;rightInset=0;width=390;height=844;
    private viewportWidth=0;private viewportHeight=0;
    nameplates:Record<string,Node>={};landmarks:{node:Node,world:Vec3,id:string}[]=[];ambient:Record<string,{node:Node,label:Label;width?:number;height?:number}>={};destination:Node;
    private inspection:Node|null=null;private inspectionPage=0;private inspectionTitle='';private inspectionLines:string[]=[];private placement:Node|null=null;
    private dialogue:CompactDialogue|null=null;private bubble:Node|null=null;private tail:Graphics|null=null;private bubbleRect:number[]|null=null;
    private tailBase=NaN;private tailTip=NaN;private tailLength=NaN;
    private composer:Node|null=null;private input:EditBox|null=null;private draft='';private composing=false;private compositionEnded=0;private draftResident='';private submitted='';
    private journalResident='';private journal:Node|null=null;private journalList:JournalScroll|null=null;private journalKey='';private journalOwner='';private journalAction:Label|null=null;private journalPause:Label|null=null;private journalSpeed:Label|null=null;private menu:Node|null=null;private state:TownState|null=null;
    private selected:Resident|null=null;private speech:Label|null=null;private nextHint:Label|null=null;
    private pages:string[]=[];private speechPage=0;private waiting=false;
    private streamingReply=false;private previousReply:{pages:string[];page:number}|null=null;
    private notice:Node;private noticeText:Label;private noticeTime=0;private retry=false;
    private clockPaper:Node|null=null;private clockLabel:Label;private weather:Node;private lastWeather='';private hold:Node;
    playerPosition=new Vec3();private map:Node|null=null;private mapHomes=false;private mapPage=0;private mapButton:Node;private journalButton:Node;private economyButton:Node;private villagersButton:Node;
    private hint:Node;private hintTime=7;private motions:Motion[]=[];private hoverLabel:Label|null=null;
    private speedControls:Node|null=null;private speedButtons:{node:Node;label:Label;value:number}[]=[];private shownSpeed=0;
    private zoomControls:Node;private zoomIn:Label;private zoomOut:Label;private canZoomIn=true;private canZoomOut=true;
    private pageFold:{node:Node;time:number;height:number}|null=null;
    private reduceMotion=!!(globalThis as any).matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    private imeStart=(e:Event)=>{if(this.isReplyInput(e.target))this.composing=true;};
    private imeEnd=(e:Event)=>{if(this.isReplyInput(e.target)){this.composing=false;this.compositionEnded=performance.now();}};
    private imeKey=(e:KeyboardEvent)=>{
        if(this.isReplyInput(e.target)&&(e.key==='Enter'||e.keyCode===13)&&
            (this.composing||e.isComposing||e.keyCode===229||performance.now()-this.compositionEnded<80)){
            // Let the IME accept its candidate; keep Cocos from sending or blurring it.
            e.stopImmediatePropagation();
        }
    };
    private isReplyInput(target:EventTarget|null){return !!this.input&&target instanceof HTMLInputElement&&!!target.closest('#GameDiv');}
    constructor(root:Node,private actions:HudActions,private layout:TownLayout){
        if(typeof document!=='undefined'){
            document.addEventListener('compositionstart',this.imeStart,true);
            document.addEventListener('compositionend',this.imeEnd,true);
            document.addEventListener('keydown',this.imeKey,true);
        }
        this.fitViewport(typeof window!=='undefined'?window.innerWidth:390,typeof window!=='undefined'?window.innerHeight:844);const visible=view.getVisibleSize();this.width=visible.width;this.height=visible.height;
        if(sys.platform===sys.Platform.WECHAT_GAME){
            const info=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync(),scale=this.width/info.windowWidth;
            const menu=wx.getMenuButtonBoundingClientRect?.();
            this.topInset=Math.max(0,(menu?.bottom||info.safeArea?.top||24)*scale-14);
            this.bottomInset=Math.max(0,(info.windowHeight-(info.safeArea?.bottom||info.windowHeight))*scale-12);
        }
        this.canvas=this.node('Village overlays',root,0,0,this.width,this.height);this.canvas.setPosition(this.width/2,this.height/2);
        const cc=this.canvas.addComponent(Canvas);cc.alignCanvasWithScreen=false;
        const cn=new Node('UI Camera');cn.parent=root;cn.setPosition(this.width/2,this.height/2,1000);
        this.uiCamera=cn.addComponent(Camera);this.uiCamera.projection=Camera.ProjectionType.ORTHO;
        this.uiCamera.orthoHeight=this.height/2;this.uiCamera.near=1;this.uiCamera.far=2000;
        this.uiCamera.clearFlags=Camera.ClearFlag.DEPTH_ONLY;this.uiCamera.priority=10;this.uiCamera.visibility=Layers.Enum.UI_2D;cc.cameraComponent=this.uiCamera;
        const top=this.height/2-this.topInset,bottom=-this.height/2+this.bottomInset;
        this.weather=this.node('Weather',this.canvas,-158,top-43,34,34);this.icon(this.weather,'sun');
        this.clockLabel=this.label(this.canvas,'09:00',-105,top-44,72,30,21,ink,true,!GRID_UI);
        if(GRID_UI){this.clockPaper=this.node('Balance paper',this.canvas);this.clockPaper.setSiblingIndex(this.clockLabel.node.getSiblingIndex());}
        this.mapButton=this.iconButton(this.canvas,'map',155,top-43,()=>this.toggleMap(this.playerPosition));
        this.journalButton=this.iconButton(this.canvas,'journal',106,top-43,()=>this.toggleJournal());
        this.notice=this.node('Little reminder',this.canvas,0,top-93,334,48);
        this.cloud(this.notice,334,48);this.noticeText=this.label(this.notice,'',0,0,304,42,14);
        this.bind(this.notice,()=>{if(this.retry)this.openComposer();});this.notice.active=false;
        this.hint=this.node('First steps',this.canvas,0,bottom+143,272,36);
        if(GRID_UI)panel(this.hint,272,36);
        this.label(this.hint,'点前台经营酒店 · 点人物交谈',0,0,270,32,15,ink,false,true);
        if(sys.localStorage.getItem('mossvale2d-touch-learned'))this.hint.active=false;
        if(GRID_UI){this.hoverLabel=this.label(this.canvas,'',0,bottom+24,this.width-36,22,12,UI.paper,false,false);this.hoverLabel.node.name='Pointer description';this.hoverLabel.lineHeight=18;this.hoverLabel.enableWrapText=false;this.hoverLabel.node.active=false;}
        this.destination=this.node('Footfall',this.canvas,0,0,30,20);const dg=this.destination.addComponent(Graphics);
        dg.lineWidth=2.5;dg.strokeColor=c(paper);dg.ellipse(0,0,13,7);dg.stroke();dg.fillColor=c(green);dg.ellipse(-3,1,2.8,4);dg.ellipse(4,-1,2.8,4);dg.fill();if(GRID_UI&&artReady()){dg.clear();artIcon(this.destination,'walk',24);}this.destination.active=false;
        this.hold=this.node('Hold progress',this.canvas,0,0,50,50);this.hold.addComponent(Graphics);this.hold.active=false;
        for(const {id,name} of layout.actors){
            const p=this.node('Nearby '+id,this.canvas,0,0,78,30);this.label(p,name,0,0,78,30,15,ink,true,true);this.nameplates[id]=p;
            this.createAmbient(id);
        }
        for(const spot of layout.places){const n=this.node('Sign '+spot.id,this.canvas,0,0,104,48);this.label(n,spot.short,0,8,104,23,16,ink,true,true);this.label(n,spot.cost?`${spot.label} · ${spot.cost} 币`:spot.label,0,-13,104,20,12,green,false,true);this.landmarks.push({node:n,world:new Vec3(spot.x+1.7,1.1,spot.z),id:spot.id});}
        this.zoomControls=this.node('Map zoom',this.canvas,159,bottom+68,44,94);
        const plus=this.node('Zoom in',this.zoomControls,0,25,44,44),minus=this.node('Zoom out',this.zoomControls,0,-25,44,44);
        this.cloud(plus,44,44);this.cloud(minus,44,44);
        this.zoomIn=this.label(plus,'+',0,0,44,44,28);this.zoomOut=this.label(minus,'−',0,0,44,44,28);
        if(GRID_UI&&artReady()){this.zoomIn.node.active=false;this.zoomOut.node.active=false;artIcon(plus,'plus',21);artIcon(minus,'minus',21);}
        this.bind(plus,()=>{if(this.canZoomIn)this.actions.zoom(1);});this.bind(minus,()=>{if(this.canZoomOut)this.actions.zoom(-1);});
        this.activities=new ActivityBubbles(this.canvas);
        this.economy=new EconomyHud(this.canvas,{command:(action,payload)=>this.actions.economy(action,payload),place:id=>this.actions.placeObject(id),navigate:id=>this.actions.navigate(id),closeDialogue:()=>{this.closeContext();this.closeInspection();this.closeMap();this.journal?.destroy();this.journal=null;this.actions.close();}});
        this.bind(this.clockLabel.node,()=>this.economy.show());
        this.economyButton=this.iconButton(this.canvas,'经济',0,0,()=>this.economy.show('economy-system'));
        this.economyButton.name='Economy system';
        this.villagersButton=this.iconButton(this.canvas,'村民',0,0,()=>this.economy.show('villagers'));
        this.villagersButton.name='Villager system';
        if(GRID_UI){
            this.speedControls=this.node('Time speed controls',this.canvas,0,0,204,44);
            this.label(this.speedControls,'时间',-82,0,36,30,12,UI.paper);
            for(const value of [1,2,3]){
                const n=this.node('Time speed '+value,this.speedControls,-40+(value-1)*52,0,44,44);
                const label=this.label(n,`${value}×`,0,0,42,32,16,ink,true);
                this.speedButtons.push({node:n,label,value});
                this.bind(n,()=>{if(this.state?.speed!==value)this.actions.control('speed',value);});
            }
            this.updateSpeed(1);
        }
        this.relayout(this.width,this.height);
    }
    fitViewport(cssWidth:number,cssHeight:number){
        if(cssWidth===this.viewportWidth&&cssHeight===this.viewportHeight)return;this.viewportWidth=cssWidth;this.viewportHeight=cssHeight;
        const wide=cssWidth>600,scale=Math.min(cssWidth/390,cssHeight/600);
        // Narrow screens retain their text size when the keyboard reduces height.
        // Wide screens use the actual aspect ratio, so both axes scale uniformly.
        view.setDesignResolutionSize(wide?cssWidth/scale:390,wide?cssHeight/scale:844,wide?ResolutionPolicy.EXACT_FIT:ResolutionPolicy.FIXED_WIDTH);
    }
    relayout(width:number,height:number){
        this.width=width;this.height=height;
        if(typeof document!=='undefined'){
            const style=getComputedStyle(document.documentElement),scale=width/(window.visualViewport?.width||innerWidth),safe=(edge:string)=>(parseFloat(style.getPropertyValue('--safe-'+edge))||0)*scale;
            this.topInset=safe('top');this.bottomInset=safe('bottom');this.leftInset=safe('left');this.rightInset=safe('right');
        }
        this.canvas.getComponent(UITransform)!.setContentSize(this.width,height);
        this.canvas.setPosition(this.width/2,height/2,0);
        this.uiCamera.node.setPosition(this.width/2,height/2,1000);this.uiCamera.orthoHeight=height/2;
        const top=height/2-this.topInset,bottom=-height/2+this.bottomInset;
        const left=-width/2+this.leftInset,right=width/2-this.rightInset;
        const narrow=right-left<560,clockWidth=Math.min(220,right-left-136);
        this.weather.setPosition(left+37,top-43,0);this.clockLabel.node.setPosition(left+8+clockWidth/2,top-44,0);this.clockLabel.node.getComponent(UITransform)!.setContentSize(clockWidth,36);this.clockLabel.fontSize=13;if(this.clockPaper){this.clockPaper.setPosition(this.clockLabel.node.position);this.clockPaper.getComponent(UITransform)!.setContentSize(clockWidth,32);panel(this.clockPaper,clockWidth,32);}this.economy?.resize(width,height);
        this.economyButton.setPosition(right-(narrow?89:187),top-43,0);this.villagersButton.setPosition(right-(narrow?40:138),top-43,0);
        this.mapButton.setPosition(right-40,top-(narrow?(GRID_UI?104:87):43),0);this.journalButton.setPosition(right-89,top-(narrow?(GRID_UI?104:87):43),0);
        this.speedControls?.setPosition(left+106,top-104,0);
        this.notice.setPosition(0,top-(GRID_UI?162:narrow?141:93),0);this.hint.setPosition(0,bottom+143,0);this.zoomControls.setPosition(right-36,bottom+68,0);
        this.composer?.setPosition(0,bottom+(GRID_UI?42:60),0);
        if(this.hoverLabel){this.hoverLabel.node.setPosition(0,bottom+24);this.hoverLabel.node.getComponent(UITransform)!.setContentSize(width-36,22);}
        this.closeContext();if(this.journal)this.drawJournal();if(this.map)this.drawMap();if(this.inspection)this.drawInspection();this.placement?.setPosition(0,-this.height/2+this.bottomInset+54);
    }
    private node(name:string,parent:Node,x=0,y=0,w=1,h=1){const n=new Node(name);n.parent=parent;n.layer=Layers.Enum.UI_2D;n.setPosition(x,y,0);n.addComponent(UITransform).setContentSize(w,h);return n;}
    private label(parent:Node,text:string,x:number,y:number,w:number,h:number,size:number,tone=ink,bold=false,outline=false){
        const n=this.node(text.slice(0,18)||'Text',parent,x,y,w,h),l=n.addComponent(Label);
        l.string=text;l.fontSize=size;l.lineHeight=size*1.55;l.color=c(tone);l.isBold=bold;l.fontFamily='PingFang SC';
        l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;l.enableWrapText=true;
        if(outline&&!(GRID_UI&&parent===this.hint)){const o=n.addComponent(LabelOutline);o.color=c(paper);o.width=2;}return l;
    }
    private cloud(n:Node,w:number,h:number,_tone=paper){
        if(GRID_UI)return panel(n,w,h,n.name==='Life records'?'journal-frame':n.name==='Town map and legend'?'map-frame':n.name==='Object field notes'?'residents-frame':'paper');
        const g=n.getComponent(Graphics)||n.addComponent(Graphics);g.clear();g.fillColor=c(paper);g.strokeColor=c('#777777');g.lineWidth=1;g.rect(-w/2,-h/2,w,h);g.fill();g.stroke();return g;
    }
    private pop(n:Node,from=.86,duration=.18){if(this.reduceMotion)return;n.setScale(from,from,1);this.motions.push({node:n,time:0,duration,from});}
    private bind(n:Node,run:()=>void,scaleOnPress=true){
        let pressed=false;
        n.on(Node.EventType.TOUCH_START,e=>{e.propagationStopped=true;pressed=true;if(scaleOnPress)n.setScale(.94,.94,1);});
        n.on(Node.EventType.TOUCH_MOVE,e=>{const a=e.getStartLocation(),b=e.getLocation();if(Math.hypot(a.x-b.x,a.y-b.y)>12){pressed=false;n.setScale(1,1,1);}});
        n.on(Node.EventType.TOUCH_END,e=>{e.propagationStopped=true;const yes=pressed;pressed=false;n.setScale(1,1,1);if(yes)run();});
        n.on(Node.EventType.TOUCH_CANCEL,()=>{pressed=false;n.setScale(1,1,1);});
    }
    private icon(parent:Node,kind:string,x=0,y=0,scale=1){
        if(GRID_UI&&artReady()){const n=this.node(kind,parent,x,y,44,44);n.setScale(scale,scale,1);artIcon(n,kind,30);return n;}
        const labels:Record<string,string>={sun:'晴',rain:'雨',chat:'交谈',tea:'茶',gift:'赠',help:'帮忙',memory:'记录',journal:'记录',walk:'走',map:'地图',rest:'休息',close:'×',next:'›',prev:'‹',send:'发送'};
        const n=this.node(kind,parent,x,y,44,44);n.setScale(scale,scale,1);this.label(n,labels[kind]||kind,0,0,44,40,['close','next','prev'].includes(kind)?28:14,ink,false,!GRID_UI);return n;
    }
    private iconButton(parent:Node,kind:string,x:number,y:number,run:()=>void){
        const n=this.node(kind,parent,x,y,46,46);
        if(GRID_UI&&artReady()){
            const nav=['map','journal','经济','村民'].includes(kind);art(n,nav?'action':'round',nav?46:34,nav?56:34);
            artIcon(n,kind,nav?30:kind==='send'?24:17)!.setPosition(0,nav?9:0);
            if(nav)this.label(n,({map:'地图',journal:'记录'} as Record<string,string>)[kind]||kind,0,-18,43,19,11,ink,true);
        }else{if(GRID_UI)panel(n,44,34);this.icon(n,kind);}
        this.bind(n,run);return n;
    }
    get menuOpen(){return !!this.menu;}
    get modalOpen(){return this.economy?.isOpen||!!this.menu||!!this.journal||!!this.map||!!this.inspection;}
    setZoomLimits(out:boolean,inside:boolean){this.canZoomOut=out;this.canZoomIn=inside;this.zoomOut.color=c(out?ink:'#555555');this.zoomIn.color=c(inside?ink:'#555555');if(GRID_UI){for(const [name,enabled] of [['Zoom in',inside],['Zoom out',out]] as [string,boolean][]){const n=this.zoomControls.getChildByName(name)!;(n.getComponent(UIOpacity)||n.addComponent(UIOpacity)).opacity=enabled?255:100;}}}
    showHover(text:string){if(!this.hoverLabel)return;if(this.hoverLabel.string!==text)this.hoverLabel.string=text;this.hoverLabel.node.active=!!text;}
    hoverControlAt(x:number,y:number){
        const entries:[Node,string][]=[[this.mapButton,'小镇地图'],[this.journalButton,'生活记录'],[this.economyButton,'经济账本'],[this.villagersButton,'村民资料'],[this.zoomControls.getChildByName('Zoom in')!,'放大地图'],[this.zoomControls.getChildByName('Zoom out')!,'缩小地图'],...this.speedButtons.map(b=>[b.node,`${b.value} 倍时间`] as [Node,string])];
        for(const [n,text] of entries){if(!n.activeInHierarchy)continue;let cx=0,cy=0;for(let p:Node|null=n;p&&p!==this.canvas;p=p.parent){cx+=p.position.x;cy+=p.position.y;}const t=n.getComponent(UITransform)!;if(Math.abs(x-cx)<=t.width/2&&Math.abs(y-cy)<=t.height/2)return text;}return '';
    }
    nameAt(x:number,y:number){return this.activities.at(x,y)||Object.entries(this.nameplates).find(([,p])=>p.active&&Math.abs(x-p.position.x)<40&&Math.abs(y-p.position.y)<18)?.[0]||'';}
    conversationAt(x:number,y:number){if(!this.bubbleRect||!this.selected)return '';const [cx,cy,w,h]=this.bubbleRect;return Math.abs(x-cx)<w/2-18&&Math.abs(y-cy)<h/2-(GRID_UI?4:35)?this.selected.id:'';}
    dialogueAt(x:number,y:number){
        if(this.bubbleRect){const [cx,cy,w,h]=this.bubbleRect;if(Math.abs(x-cx)<=w/2+(GRID_UI?9:0)&&y>=cy-h/2&&y<=cy+h/2+(GRID_UI?25:0))return true;}
        return !!this.composer&&Math.abs(x-this.composer.position.x)<=(GRID_UI?160:170)&&Math.abs(y-this.composer.position.y)<=(GRID_UI?26:41);
    }
    private updateSpeed(speed:number){
        if(speed===this.shownSpeed)return;this.shownSpeed=speed;
        for(const button of this.speedButtons){const active=button.value===speed;panel(button.node,44,34,active?'badge':'action');button.label.color=c(active?UI.paper:UI.ink);}
    }
    blocks(x:number,y:number){
        if(this.speedControls?.active&&Math.abs(x-this.speedControls.position.x)<=102&&Math.abs(y-this.speedControls.position.y)<=22)return true;
        if(this.zoomControls.active&&Math.abs(x-this.zoomControls.position.x)<=22&&Math.abs(y-this.zoomControls.position.y)<=47)return true;
        if(this.modalOpen||y>this.height/2-this.topInset-72||y<-this.height/2+this.bottomInset+8)return true;
        if(this.notice.active&&y>this.height/2-this.topInset-120)return true;
        if(this.placement&&y<-this.height/2+this.bottomInset+120)return true;
        if(this.composer&&y<-this.height/2+this.bottomInset+(GRID_UI?82:120))return true;
        if(this.bubbleRect){const [cx,cy,w,h]=this.bubbleRect;if(Math.abs(x-cx)<w/2+8&&y>cy-h/2-50&&y<cy+h/2+(GRID_UI?25:15))return true;}
        return false;
    }
    setState(w:TownState){
        this.state=w;this.updateSpeed(w.speed);this.clockLabel.string=w.economy?`${w.coins.toFixed(1)}币 · 吸引${w.economy.attractiveness.score} · 客${w.visitors?.length||0}`:`${String(Math.floor(w.minute%1440/60)).padStart(2,'0')}:${String(w.minute%60).padStart(2,'0')}`;this.economy.setState(w);
        if(this.lastWeather!==w.weather){this.lastWeather=w.weather;this.weather.children.slice().forEach(n=>n.destroy());this.icon(this.weather,w.weather==='rain'?'rain':'sun');}
        this.weather.active=!w.economy;
        if(this.selected)this.selected=[...w.residents,...(w.visitors||[])].find(r=>r.id===this.selected!.id)||this.selected;
        if(this.journal)this.drawJournal();
    }
    toast(text:string){this.notice.active=true;this.noticeText.string=text;this.noticeTime=5;this.retry=false;this.notice.setSiblingIndex(this.canvas.children.length-1);}
    tick(dt:number){
        this.economy.tick();if(this.notice.active)this.notice.setSiblingIndex(this.canvas.children.length-1);
        if(this.speedControls)this.speedControls.active=!this.modalOpen&&!this.composer;
        this.zoomControls.active=!this.modalOpen&&!this.composer&&!this.placement;
        if(this.noticeTime>0&&(this.noticeTime-=dt)<=0)this.notice.active=false;
        if(this.hintTime>0&&(this.hintTime-=dt)<=0)this.hint.active=false;
        if(this.pageFold){
            const f=this.pageFold;f.time+=dt;
            if(!f.node.isValid||f.time>=.2){if(f.node.isValid)f.node.destroy();this.pageFold=null;}
            else{const size=Math.sin(f.time/.2*Math.PI)*88,g=f.node.getComponent(Graphics)!;g.clear();g.fillColor=c('#888888');g.strokeColor=c('#888888');g.lineWidth=1;g.moveTo(f.height*.292,-f.height*.375);g.lineTo(f.height*.292-size,-f.height*.375);g.quadraticCurveTo(f.height*.292-size*.28,-f.height*.375+size*.26,f.height*.292,-f.height*.375+size);g.close();g.fill();g.stroke();}
        }
        if(this.motions.length)this.motions=this.motions.filter(m=>{if(!m.node.isValid)return false;m.time+=dt;const t=Math.min(1,m.time/m.duration),s=m.from+(1-m.from)*(1-Math.pow(1-t,3));m.node.setScale(s,s,1);return t<1;});
    }
    holdAt(x:number,y:number,progress:number){
        this.hold.active=progress>0&&progress<1;if(!this.hold.active)return;this.hold.setPosition(x,y,0);
        const g=this.hold.getComponent(Graphics)!;g.clear();g.lineWidth=3;g.strokeColor=c('#888888');g.circle(0,0,23);g.stroke();
        g.strokeColor=c(paper);g.arc(0,0,23,Math.PI/2,Math.PI/2-progress*Math.PI*2,true);g.stroke();
    }
    private learned(){this.hint.active=false;sys.localStorage.setItem('mossvale2d-touch-learned','1');}
    connectionError(_message:string){this.toast('邻居暂时没回应，先四处走走吧。');}
    showResident(r:Resident){
        this.closeCard();if(this.draftResident!==r.id){this.draft='';this.submitted='';}this.draftResident=r.id;this.selected=r;this.learned();
        if(GRID_UI){
            const more=!r.visitor&&this.state?.economy?()=>{
                const options:ContextOption[]=[{label:'邀来酒店',icon:'tea',run:()=>this.actions.economy('invite',{resident:r.id})}];
                const shop=this.state?.economy?.businesses.find(b=>b.owner===r.id);if(shop?.concepts.length)options.push({label:'店铺',icon:'shop',run:()=>this.economy.show('shop',shop.id)});
                this.showContext(this.bubble?.position.x||0,this.bubble?.position.y||0,r.name,options);
            }:undefined;
            this.dialogue=new CompactDialogue(this.canvas,r.name,()=>this.actions.close(),more);this.bubble=this.dialogue.node;this.speech=this.dialogue.speech;this.nextHint=null;
            this.bind(this.bubble,()=>{});this.showReply(r.life?`${r.action}。${r.life.speech||r.thought}`:r.thought);
            if(!r.visitor||r.remaining)this.openComposer();return;
        }
        this.bubble=this.node('Speech beside '+r.name,this.canvas,0,100,322,170);this.tail=this.bubble.addComponent(Graphics);
        this.label(this.bubble,`${this.code(r.id)} ${r.name}`,-90,61,110,30,19,ochre,true);
        this.iconButton(this.bubble,'close',136,62,()=>this.actions.close());
        this.speech=this.label(this.bubble,'',0,3,274,82,18);this.speech.horizontalAlign=Label.HorizontalAlign.LEFT;
        this.nextHint=this.label(this.bubble,'',-58,-58,180,24,12,green);
        this.bubbleRect=[0,100,322,170];
        this.showReply(r.life?`${r.action}。${r.life.speech||r.thought}`:r.thought);this.pop(this.bubble);if(!r.visitor||r.remaining)this.openComposer();
        if(!r.visitor&&this.state?.economy){
            this.nextHint.node.setPosition(-116,-58);this.nextHint.node.getComponent(UITransform)!.setContentSize(54,24);
            const invite=this.node('Invite to hotel',this.bubble,68,-58,100,30);this.label(invite,'邀来酒店',0,0,96,28,12);this.bind(invite,()=>this.actions.economy('invite',{resident:r.id}));
            const shop=this.state.economy.businesses.find(b=>b.owner===r.id);if(shop?.concepts.length){const n=this.node('Shop concept',this.bubble,-27,-58,72,30);this.label(n,'店铺',0,0,70,28,12);this.bind(n,()=>this.economy.show('shop',shop.id));}
        }
    }
    anchorSpeech(x:number,y:number){
        if(this.dialogue){const name=this.selected&&this.nameplates[this.selected.id];if(name)name.active=false;this.bubbleRect=this.dialogue.anchor(x,y,this.width,this.height,this.topInset,this.bottomInset,!!this.composer);return;}
        if(!this.bubble||!this.tail)return;
        const bx=clamp(x,-this.width/2+173,this.width/2-173);
        const ceiling=this.height/2-this.topInset-160;
        const floor=-this.height/2+this.bottomInset+(this.composer?200:155);
        const by=clamp(y+120,Math.min(floor,ceiling),ceiling);
        if(Math.abs(this.bubble.position.x-bx)>.05||Math.abs(this.bubble.position.y-by)>.05)this.bubble.setPosition(bx,by,0);
        this.bubbleRect![0]=bx;this.bubbleRect![1]=by;
        // Reuse the tessellated bubble until its outline actually changes.
        const base=Math.round(clamp(x-bx,-112,112)*2)/2,tip=Math.round(clamp(x-bx,base-16,base+16)*2)/2;
        const length=Math.round(clamp(by-85-y-8,16,34)*2)/2,g=this.tail;
        if(base===this.tailBase&&tip===this.tailTip&&length===this.tailLength)return;
        this.tailBase=base;this.tailTip=tip;this.tailLength=length;
        g.clear();g.fillColor=c(paper);g.strokeColor=c('#999999');g.lineWidth=1;
        g.moveTo(-161,-85);g.lineTo(-161,85);g.lineTo(161,85);g.lineTo(161,-85);g.lineTo(base+7,-85);g.lineTo(tip,-85-length);g.lineTo(base-7,-85);g.close();g.fill();g.stroke();
    }

    private chunks(text:string,limit=42){
        if(GRID_UI)return [text.trim()||'……'];
        const parts:string[]=[];let rest=text.trim();
        while(rest.length>limit){let end=limit;const cut=rest.slice(0,limit).search(/[。！？；\n][^。！？；\n]*$/);if(cut>limit*.4)end=cut+1;parts.push(rest.slice(0,end));rest=rest.slice(end).trim();}if(rest)parts.push(rest);return parts.length?parts:['……'];
    }
    advanceSpeech(){if(GRID_UI||this.waiting&&!this.streamingReply)return;if(this.speechPage<this.pages.length-1){this.speechPage++;this.paintSpeech();}}
    private paintSpeech(){if(this.dialogue){this.dialogue.setText(this.pages.join('\n\n')||'……',this.width);return;}const hint=this.waiting&&!this.streamingReply?'':this.pages.length>1?`${this.speechPage+1} / ${this.pages.length}  ›`:'';if(this.speech)this.speech.string=this.pages[this.speechPage]||'……';if(this.nextHint)this.nextHint.string=hint;}
    showStreamingReply(text:string){if(!this.waiting||!this.selected)return;this.streamingReply=true;this.pages=this.chunks(text);this.speechPage=Math.min(this.speechPage,this.pages.length-1);this.paintSpeech();}
    showReply(text:string){this.pages=this.chunks(text);this.speechPage=this.streamingReply?Math.min(this.speechPage,this.pages.length-1):0;this.streamingReply=false;this.previousReply=null;this.paintSpeech();this.submitted='';if(this.selected?.visitor&&this.selected.remaining===0){this.composer?.destroy();this.composer=null;this.input=null;}}
    showMemory(){if(!this.selected)return;const items=this.selected.memories.filter(m=>m.kind==='fact'||m.kind==='impression').slice(-3);this.pages=items.length?items.flatMap(m=>this.chunks(m.text)):['还没有共同的回忆。先聊聊吧。'];this.speechPage=0;this.paintSpeech();}
    setWaiting(waiting:boolean){if(waiting&&!this.waiting){this.previousReply={pages:[...this.pages],page:this.speechPage};this.streamingReply=false;this.pages=['……'];this.speechPage=0;}this.waiting=waiting;this.paintSpeech();}
    messageFailed(){this.draft=this.submitted||this.draft;this.pages=this.previousReply?.pages||['……'];this.speechPage=this.previousReply?.page||0;this.previousReply=null;this.streamingReply=false;this.paintSpeech();if(this.input&&!this.input.string)this.input.string=this.draft;this.toast('回应未完成，可以重新发送。');this.retry=false;this.noticeTime=12;}
    private openComposer(){
        if(!this.selected||this.waiting||this.composer)return;
        const w=GRID_UI?320:340,h=GRID_UI?52:82,n=this.node('Your words',this.canvas,0,-this.height/2+this.bottomInset+(GRID_UI?42:60),w,h);this.composer=n;this.cloud(n,w,h);
        const entry=this.node('Conversation input',n,-25,0,GRID_UI?228:238,GRID_UI?44:48);entry.active=false;this.input=entry.addComponent(EditBox);
        this.input.textLabel=this.label(entry,'',0,0,GRID_UI?218:228,44,GRID_UI?15:17);this.input.textLabel.horizontalAlign=Label.HorizontalAlign.LEFT;
        this.input.placeholderLabel=this.label(entry,'想说点什么？',0,0,GRID_UI?218:228,44,GRID_UI?14:16,GRID_UI?UI.muted:'#888888');this.input.placeholderLabel.horizontalAlign=Label.HorizontalAlign.LEFT;
        this.input.textLabel.node.getComponent(UITransform)!.setAnchorPoint(0,1);this.input.placeholderLabel.node.getComponent(UITransform)!.setAnchorPoint(0,1);
        this.input.inputMode=EditBox.InputMode.SINGLE_LINE;this.input.maxLength=300;this.input.returnType=EditBox.KeyboardReturnType.SEND;this.input.string=this.draft;
        entry.on('editing-return',()=>this.sendText());
        entry.on('editing-did-ended',()=>{this.composing=false;if(this.input)this.draft=this.input.string;});
        entry.active=true;
        this.iconButton(n,'send',GRID_UI?126:135,0,()=>this.sendText());this.notice.active=false;
    }
    private sendText(){if(this.waiting||this.composing)return;const message=this.input?.string.trim();if(!message)return;this.submitted=message;this.draft='';this.input!.string='';this.actions.send('chat',message);}
    closeCard(){
        this.composing=false;if(this.input)this.draft=this.input.string||(this.waiting?this.submitted:'');this.previousReply=null;this.streamingReply=false;this.composer?.destroy();this.composer=null;this.input=null;
        this.bubble?.destroy();this.bubble=null;this.dialogue=null;this.tail=null;this.tailBase=this.tailTip=this.tailLength=NaN;this.bubbleRect=null;this.selected=null;this.speech=null;this.nextHint=null;
    }
    showContext(x:number,y:number,title:string,options:ContextOption[]){
        this.closeContext();this.learned();this.hold.active=false;
        if(GRID_UI){this.showContextRing(x,y,title,options);return;}
        this.menu=this.node('Petals around the touch',this.canvas,0,0,this.width,this.height);this.bind(this.menu,()=>this.closeContext());if(GRID_UI){if(this.bubble)this.bubble.active=false;if(this.composer)this.composer.active=false;}
        // The invisible catcher owns a new press; releasing the original hold cannot choose an action.
        const mx=clamp(x,-this.width/2+160+this.leftInset,this.width/2-160-this.rightInset),my=clamp(y,-this.height/2+this.bottomInset+185,this.height/2-this.topInset-222);
        const center=this.node('Flower centre',this.menu,mx,my,74,54);this.cloud(center,88,44);this.label(center,title,0,0,72,32,14,ink,true);this.bind(center,()=>this.closeContext());
        if(Math.hypot(mx-x,my-y)>30){const g=this.menu.addComponent(Graphics);g.strokeColor=c('#888888');g.lineWidth=2;g.moveTo(x,y);g.quadraticCurveTo(x,my,mx,my);g.stroke();g.circle(x,y,6);g.stroke();}
        options.slice(0,5).forEach((o,i)=>{
            const a=(90-i*360/options.length)*Math.PI/180,r=108,n=this.node(o.label,this.menu,mx+Math.cos(a)*r,my+Math.sin(a)*r,86,84);
            if(GRID_UI&&artReady()){panel(n,88,76,'action');artIcon(n,o.icon,31)!.setPosition(0,15);this.label(n,o.label,0,-20,80,25,13,ink);}else{this.cloud(n,88,52);this.label(n,o.label,0,0,84,32,14,ink);}
            if(o.cost)this.label(n,o.cost,0,GRID_UI?-49:-36,80,20,11,ink,false,true);
            this.bind(n,()=>{this.closeContext();o.run();});this.pop(n,.55,.18+i*.012);
        });
    }
    private showContextRing(x:number,y:number,title:string,options:ContextOption[]){
        const choices=options.slice(0,5),r=CONTEXT_RING;
        const menu=this.menu=this.node('Interaction ring catcher',this.canvas,0,0,this.width,this.height);this.bind(menu,()=>this.closeContext());
        if(this.bubble)this.bubble.active=false;if(this.composer)this.composer.active=false;
        const margin=r.radius+r.hitSize/2+4;
        const mx=clamp(x,-this.width/2+this.leftInset+margin,this.width/2-this.rightInset-margin);
        const my=clamp(y,-this.height/2+this.bottomInset+84,this.height/2-this.topInset-margin);
        const ring=this.node('Compact interaction ring',menu,mx,my,margin*2,margin*2);
        // Keep the target visible through the centre; it also dismisses the ring.
        const centre=this.node('Ring centre',ring,0,0,24,24);this.bind(centre,()=>this.closeContext());
        const caption=this.node('Ring action caption',ring,0,r.captionY,160,24);
        caption.setPosition(clamp(mx,-this.width/2+this.leftInset+80,this.width/2-this.rightInset-80)-mx,r.captionY);
        const text=this.label(caption,'',0,0,146,22,12,UI.paper,true,true);caption.active=false;
        const targets:{node:Node;option:ContextOption}[]=[];
        choices.forEach((o,i)=>{
            const a=(90-i*360/choices.length)*Math.PI/180,n=this.node(o.label,ring,Math.cos(a)*r.radius,Math.sin(a)*r.radius,r.hitSize,r.hitSize);
            if(artReady())artIcon(n,o.icon,r.iconSize);else this.icon(n,o.icon,0,0,.7);
            targets.push({node:n,option:o});let choice=o;
            const describe=(option:ContextOption)=>{text.string=option.label+(option.cost?' · '+option.cost:'');caption.active=true;};
            this.bind(n,()=>{this.closeContext();choice.run();},false);
            n.on(Node.EventType.MOUSE_ENTER,()=>describe(o));n.on(Node.EventType.MOUSE_LEAVE,()=>caption.active=false);
            n.on(Node.EventType.TOUCH_START,e=>{
                // Invisible hit squares may overlap; choose the nearest icon, regardless of draw order.
                const p=e.getUILocation(),local=ring.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x,p.y,0));
                choice=targets.reduce((best,t)=>Math.hypot(t.node.position.x-local.x,t.node.position.y-local.y)<Math.hypot(best.node.position.x-local.x,best.node.position.y-local.y)?t:best).option;describe(choice);
            });
            n.on(Node.EventType.TOUCH_CANCEL,()=>caption.active=false);
        });
        this.pop(ring,.86,.16);
    }
    closeContext(){this.menu?.destroy();this.menu=null;if(GRID_UI){if(this.bubble)this.bubble.active=true;if(this.composer)this.composer.active=true;}}
    closeInspection(){this.inspection?.destroy();this.inspection=null;}
    showObjectDetails(title:string,lines:string[]){this.closeContext();this.closeCard();this.closeMap();this.inspectionTitle=title;this.inspectionLines=lines;this.inspectionPage=0;this.drawInspection();}
    private drawInspection(){
        this.closeInspection();const h=Math.min(460,this.height-80),w=334,n=this.node('Object field notes',this.canvas,0,0,w,h);this.inspection=n;
        this.cloud(n,w,h);
        this.label(n,this.inspectionTitle,0,h/2-49,248,38,24,ink,true);this.iconButton(n,'close',139,h/2-48,()=>this.closeInspection());
        const pageSize=h<350?5:9,count=Math.max(1,Math.ceil(this.inspectionLines.length/pageSize));this.inspectionPage=clamp(this.inspectionPage,0,count-1);
        const lines=this.inspectionLines.slice(this.inspectionPage*pageSize,(this.inspectionPage+1)*pageSize);
        const body=this.label(n,lines.join('\n'),4,-4,285,h-165,17);body.lineHeight=29;body.horizontalAlign=Label.HorizontalAlign.LEFT;body.verticalAlign=Label.VerticalAlign.TOP;
        this.iconButton(n,'prev',-107,-h/2+37,()=>{this.inspectionPage=Math.max(0,this.inspectionPage-1);this.drawInspection();});
        this.iconButton(n,'next',107,-h/2+37,()=>{this.inspectionPage=Math.min(count-1,this.inspectionPage+1);this.drawInspection();});
        this.label(n,`${this.inspectionPage+1} / ${count}`,0,-h/2+37,90,30,14,green);
    }
    setPlacement(active:boolean,cancel?:()=>void){
        this.placement?.destroy();this.placement=null;if(!active)return;
        const n=this.node('Moving an object',this.canvas,0,-this.height/2+this.bottomInset+54,334,60);this.placement=n;this.cloud(n,334,60,'#888888');
        this.label(n,'轻点空地或桌面摆放 · 长按取消',-18,0,273,36,16,ink,true);this.iconButton(n,'close',143,0,()=>cancel?.());
    }
    toggleJournal(){this.economy.close();this.closeInspection();this.closeMap();this.closeContext();if(this.journal){this.journal.destroy();this.journal=null;return;}this.actions.close();this.learned();this.journalResident='';this.drawJournal();if(this.journal)this.pop(this.journal);}
    closeMap(){this.map?.destroy();this.map=null;}
    toggleMap(position:Vec3){
        this.economy.close();this.closeInspection();
        if(this.map){this.closeMap();return;}this.playerPosition=position;this.closeContext();this.actions.close();
        this.journal?.destroy();this.journal=null;this.drawMap();if(this.map)this.pop(this.map,.94);
    }
    private drawMap(){
        if(GRID_UI&&this.layout.homes?.length){this.drawNeighborhoodMap();return;}
        this.closeMap();const h=Math.min(680,this.height-100),n=this.node('Town map and legend',this.canvas,0,0,350,h);this.map=n;this.cloud(n,350,h);
        this.label(n,'小镇地图',0,h/2-(GRID_UI?52:32),240,35,20);this.iconButton(n,'close',147,h/2-(GRID_UI?51:30),()=>this.closeMap());
        const b=this.layout.bounds,mx=(x:number)=>(x-b.minX)/(b.maxX-b.minX)*300-150,my=(z:number)=>h/2-(GRID_UI?112:88)-(z-b.minZ)/(b.maxZ-b.minZ)*(h-(GRID_UI?350:290)),g=panelInk(n);
        g.lineWidth=1;g.strokeColor=c('#555555');for(const o of this.layout.obstacles){g.rect(mx(o.x-o.w/2),my(o.z+o.d/2),o.w/(b.maxX-b.minX)*300,o.d/(b.maxZ-b.minZ)*(h-(GRID_UI?350:290)));}g.stroke();
        const placed:{x:number;y:number}[]=[];
        for(const p of this.layout.places){
            const ax=mx(p.x),ay=my(p.z);let x=ax,y=ay;
            if(GRID_UI){for(const [dx,dy] of [[0,0],[0,30],[0,-30],[-78,0],[78,0],[0,60],[0,-60],[-78,30],[78,-30]]){const cx=clamp(ax+dx,-113,113),cy=clamp(ay+dy,-h/2+240,h/2-120);if(placed.every(q=>Math.abs(q.x-cx)>78||Math.abs(q.y-cy)>29)){x=cx;y=cy;break;}}placed.push({x,y});if(Math.hypot(x-ax,y-ay)>10){g.moveTo(ax,ay);g.lineTo(x,y);g.stroke();}}
            const pin=this.node('Map destination '+p.id,n,x,y,GRID_UI?76:84,44);this.cloud(pin,GRID_UI?76:84,GRID_UI?27:30);this.label(pin,p.short,0,0,GRID_UI?70:82,27,GRID_UI?11:12);this.bind(pin,()=>{this.closeMap();this.actions.navigate(p.id);});
        }
        g.fillColor=c(ink);g.circle(mx(this.playerPosition.x),my(this.playerPosition.z),4);g.fill();
        this.label(n,'每格 1m × 1m · 家具可搬动、转向',0,-h/2+(GRID_UI?200:162),322,28,13);
        this.label(n,'轻点人物交谈，轻点物品使用。\n长按查看属性、搬动或转向。\n杯子、书和盆栽可放在桌面上，\n搬动桌子时，上面的东西一起移动。',0,-h/2+(GRID_UI?132:97),326,96,13);
        const credits=this.node('LPC credits',n,-66,-h/2+(GRID_UI?67:38),180,28);this.label(credits,'LPC 素材与作者署名',0,0,180,26,12,green);this.bind(credits,()=>{if(typeof window!=='undefined')window.open('./lpc-credits.html','_blank','noopener');});
        if(typeof window!=='undefined'){const grid=new URLSearchParams(window.location.search).get('view')==='grid',toggle=this.node('2D presentation',n,100,-h/2+(GRID_UI?67:38),118,28);this.label(toggle,grid?'切换像素版':'切换网格代码',0,0,116,26,12,green);this.bind(toggle,()=>{const url=new URL(window.location.href);url.searchParams.set('view',grid?'pixel':'grid');window.location.assign(url.href);});}
        this.label(n,'拖动走路 · 双指平移、缩放视野',0,-h/2+(GRID_UI?40:13),320,22,12,green);
    }
    private drawNeighborhoodMap(){
        this.closeMap();const h=Math.min(680,this.height-100),width=Math.min(350,this.width-24),n=this.node('Town map and legend',this.canvas,0,0,width,h);this.map=n;this.cloud(n,width,h);
        this.label(n,'小镇地图',0,h/2-52,240,35,20);this.iconButton(n,'close',width/2-30,h/2-51,()=>this.closeMap());
        for(const [i,name] of ['公共去处','各家住址'].entries()){
            const tab=this.node('Map tab '+i,n,(i-.5)*132,h/2-96,124,40);if(this.mapHomes===(i===1))this.cloud(tab,124,32);
            this.label(tab,name,0,0,120,30,14,ink,this.mapHomes===(i===1));this.bind(tab,()=>{this.mapHomes=i===1;this.mapPage=0;this.drawMap();});
        }
        const b=this.layout.bounds,mapH=h<500?84:150,mapTop=h/2-129,mapW=width-80;
        const mx=(x:number)=>(x-b.minX)/(b.maxX-b.minX)*mapW-mapW/2,my=(z:number)=>mapTop-(z-b.minZ)/(b.maxZ-b.minZ)*mapH,g=panelInk(n);
        g.strokeColor=c(UI.muted);g.lineWidth=.6;for(const o of this.layout.obstacles){g.rect(mx(o.x-o.w/2),my(o.z+o.d/2),o.w/(b.maxX-b.minX)*mapW,o.d/(b.maxZ-b.minZ)*mapH);}g.stroke();
        const places=this.layout.places.filter(p=>this.mapHomes?!!p.ownerId:!p.ownerId),listTop=mapTop-mapH-24,rows=Math.max(2,Math.min(6,Math.floor((listTop+h/2-70)/43))),pages=Math.ceil(places.length/rows);
        this.mapPage=clamp(this.mapPage,0,pages-1);
        places.slice(this.mapPage*rows,(this.mapPage+1)*rows).forEach((p,i)=>{
            const index=this.mapPage*rows+i+1,x=mx(p.x),y=my(p.z);g.fillColor=c(UI.badge);g.circle(x,y,8);g.fill();this.label(n,String(index),x,y,18,18,10,UI.paper,true);
            const row=this.node('Map destination '+p.id,n,0,listTop-i*43,width-66,42);
            this.label(row,`${index}. ${p.short}`,p.ownerId?-61:0,7,p.ownerId?145:width-70,23,14,ink,true);
            this.label(row,p.address||p.label,p.ownerId?75:0,p.ownerId?6:-12,p.ownerId?120:width-70,22,11,green);
            this.bind(row,()=>{this.closeMap();this.actions.navigate(p.id);});
        });
        g.fillColor=c('#A06C43');g.circle(mx(this.playerPosition.x),my(this.playerPosition.z),4);g.fill();
        this.iconButton(n,'prev',-109,-h/2+52,()=>{this.mapPage=(this.mapPage+pages-1)%pages;this.drawMap();});
        this.iconButton(n,'next',109,-h/2+52,()=>{this.mapPage=(this.mapPage+1)%pages;this.drawMap();});
        this.label(n,`${this.mapPage+1} / ${pages}`,0,-h/2+52,70,28,13,green);
        this.label(n,'点名字前往 · 棕点是你 · 每格 1m',0,-h/2+27,width-50,20,11,green);
    }
    private code(id:string){return id==='player'?'A1':id==='ye'?'旧邻居':this.state?.visitors?.find(v=>v.id===id)?.code||this.layout.actors.find(a=>a.id===id)?.code||id;}
    private createAmbient(id:string,visitor=false){
        const w=GRID_UI?30:visitor?208:182,h=GRID_UI?31:visitor?66:44,n=this.node((visitor?'Visitor thought ':'Neighbour thought ')+id,this.canvas,0,0,w,h);if(GRID_UI)n.addComponent(Graphics);else this.cloud(n,w,h);const l=this.label(n,'',0,0,GRID_UI?10:w-20,GRID_UI?19:h-14,GRID_UI?UI.ambientSize:visitor?13:11);if(GRID_UI){l.lineHeight=UI.ambientLineHeight;l.overflow=Label.Overflow.CLAMP;l.enableWrapText=false;}else if(!visitor){l.lineHeight=15;l.overflow=Label.Overflow.CLAMP;}n.active=false;this.ambient[id]={node:n,label:l};
    }
    addPerson(id:string,name:string){if(this.nameplates[id])return;const p=this.node('Nearby '+id,this.canvas,0,0,78,30);this.label(p,name,0,0,78,30,15,ink,true,true);p.active=false;this.nameplates[id]=p;this.createAmbient(id,true);}
    showAmbient(id:string,text:string,x:number,y:number){
        const e=this.ambient[id];if(!e)return;
        if(GRID_UI){const fit=speechLayout(text,UI.ambientSize,UI.ambientLineHeight,Math.min(UI.ambientWidth,this.width-32));if(e.width!==fit.width||e.height!==fit.height){e.width=fit.width;e.height=fit.height;e.node.getComponent(UITransform)!.setContentSize(fit.width,fit.height);drawSpeechBubble(e.node.getComponent(Graphics)!,fit.width,fit.height);e.label.node.getComponent(UITransform)!.setContentSize(fit.width-UI.speechPaddingX*2,fit.lines.length*UI.ambientLineHeight);}const shown=fit.lines.join('\n');if(e.label.string!==shown)e.label.string=shown;e.node.active=true;if(e.node.getSiblingIndex()<this.canvas.children.length-1)e.node.setSiblingIndex(this.canvas.children.length-1);e.node.setPosition(clamp(x,-this.width/2+fit.width/2+8,this.width/2-fit.width/2-8),clamp(y+fit.height/2-22,-this.height/2+fit.height/2+40,this.height/2-this.topInset-fit.height/2-145));return;}
        const pixels=Array.from(text).reduce((n,c)=>n+(/[\u3000-\uffff]/.test(c)?11:6),0),w=Math.max(74,Math.min(182,Math.ceil((pixels+20)/12)*12)),h=Math.min(44,Math.max(29,Math.ceil(pixels/(w-20))*15+14));
        if(e.width!==w||e.height!==h){e.width=w;e.height=h;e.node.getComponent(UITransform)!.setContentSize(w,h);this.cloud(e.node,w,h);e.label.node.getComponent(UITransform)!.setContentSize(w-20,h-14);if(GRID_UI&&artReady())art(e.node,'tail',10,7,'Neighbour tail')!.setPosition(0,-h/2-3);}
        if(e.label.string!==text)e.label.string=text;e.node.active=true;if(e.node.getSiblingIndex()<this.canvas.children.length-1)e.node.setSiblingIndex(this.canvas.children.length-1);e.node.setPosition(clamp(x,-this.width/2+w/2+8,this.width/2-w/2-8),clamp(y+h/2-22,-this.height/2+h/2+40,this.height/2-this.topInset-h/2-145));
    }
    removePerson(id:string){this.activities.remove(id);this.nameplates[id]?.destroy();this.ambient[id]?.node.destroy();delete this.nameplates[id];delete this.ambient[id];}
    showLifeLog(id:string){this.economy.close();this.closeInspection();this.closeMap();this.closeContext();this.actions.close();this.journalResident=id;this.drawJournal();}
    private journalEntries():JournalRow[]{
        const r=[...(this.state?.residents||[]),...(this.state?.archivedResidents||[])].find(r=>r.id===this.journalResident);
        const events=this.journalResident==='player'?this.state?.playerLog:r?.lifeLog;
        const reasons:Record<string,string>={timeout:'Jev 超时',uncertain:'Jev 把握不足',configuration:'Jev 尚未配置',budget:'已达调用额度',backoff:'接口暂缓重试',busy:'并发已满',changed:'状态变化后重新按规则选择','invalid-choice':'Jev 返回了无效选项',unavailable:'Jev 接口未完成'};
        return (events||[]).slice().reverse().map(e=>{
            const d=e.decision,ms=d?.elapsedMs,time=typeof ms==='number'&&Number.isFinite(ms)&&ms>=0?`${Math.round(ms)} ms`:'未记录耗时';
            const status=d?`${d.mode==='jev'?'Jev':'规则接管'} · ${time}`:['activity','encounter'].includes(e.type)?'此条未保存判断信息':'';
            const reason=d?.reason?(reasons[d.reason]||(/^http-\d+$/.test(d.reason)?`接口返回 ${d.reason.slice(5)}`:'接口未完成')):'';
            const text=[e.text,e.news?`新闻来源：${e.news.source} · ${e.news.publishedAt.slice(0,10)}\n${e.news.title}\n${e.news.url}`:'',d?.selection?`选择：${d.selection}`:'',reason?`接管原因：${reason}`:'',d?`${d.basisKind==='input'?'判断依据（输入摘要，非模型解释）':'选择依据'}：\n${d.basis||'这条旧记录未保存选择依据。'}`:''].filter(Boolean).join('\n');
            return {text,heading:`第 ${Math.floor(e.at/1440)+1} 天  ${String(Math.floor(e.at%1440/60)).padStart(2,'0')}:${String(Math.floor(e.at%60)).padStart(2,'0')}`,status,id:e.id,...(e.news?{run:()=>sys.openURL(e.news!.url)}:{})};
        });
    }
    private drawJournal(){
        const h=Math.min(680,this.height-this.topInset-this.bottomInset-90),width=Math.min(350,this.width-24),key=`${this.journalResident}:${width}:${h}`;
        const r=[...(this.state?.residents||[]),...(this.state?.archivedResidents||[])].find(r=>r.id===this.journalResident);
        if(!this.journal||key!==this.journalKey){
            const bookmark=this.journal&&this.journalOwner===this.journalResident?this.journalList?.bookmark():undefined;
            this.journal?.destroy();const n=this.node('Life records',this.canvas,0,0,width,h);this.journal=n;this.journalKey=key;this.journalOwner=this.journalResident;this.cloud(n,width,h);
            this.label(n,'生活记录',0,h/2-(GRID_UI?45:32),width-130,35,20);this.iconButton(n,'close',width/2-28,h/2-(GRID_UI?43:30),()=>this.toggleJournal());
            this.journalAction=this.label(n,this.journalResident?`${this.code(this.journalResident)} ${r?.name||'村长'}`:'选择一位居民',0,h/2-76,width-40,30,this.journalResident?20:14);
            if(this.journalResident){
                this.journalAction=this.label(n,'',0,h/2-111,width-40,28,13,green);
                const back=this.node('All people',n,-width/2+50,h/2-32,80,44);if(GRID_UI&&artReady()){artIcon(back,'prev',12)!.setPosition(-22,0);this.label(back,'全部',8,0,56,38,13);}else this.label(back,'‹ 全部',0,0,80,38,14);this.bind(back,()=>{this.journalResident='';this.drawJournal();});
            }
            const top=h/2-(this.journalResident?140:100),bottom=-h/2+92;
            this.journalList=new JournalScroll(n,width-(GRID_UI?72:44),Math.max(70,top-bottom),(top+bottom)/2,(node,run)=>this.bind(node,run));
            if(GRID_UI)this.journalList.node.setPosition(8,(top+bottom)/2);this.journalList.setRows(this.journalRows(),bookmark);
            const hint=this.label(n,this.journalResident?'最近100条，新的在上\n耗时含接口往返，不含台词生成':'上下滚动查看全部居民',0,-h/2+71,width-36,36,12,green);hint.lineHeight=16;
            const pause=this.node('Pause life',n,-75,-h/2+30,108,42);if(GRID_UI)panel(pause,96,30,'action');this.journalPause=this.label(pause,'',0,0,106,36,13);this.bind(pause,()=>this.actions.control('pause'));
            const speed=this.node('Life speed',n,75,-h/2+30,108,42);if(GRID_UI)panel(speed,96,30,'action');this.journalSpeed=this.label(speed,'',0,0,106,36,13);this.bind(speed,()=>this.actions.control('speed'));
        }
        this.journalAction!.string=this.journalResident?r?.action||this.state?.player?.action||'在小镇走走':`常住 ${(this.state?.residents.length||0)+1} 人 · 上下滚动选择`;
        this.journalPause!.string=this.state?.paused?'继续生活':'暂停';this.journalSpeed!.string=`时间 ×${this.state?.speed||1}`;
        this.journalList!.setRows(this.journalRows());
    }
    private journalRows():JournalRow[]{
        if(this.journalResident){const entries=this.journalEntries();return entries.length?entries:[{id:'empty',heading:'今天',text:'还没有生活记录。去走走，或找邻居聊聊。'}];}
        return [{id:'player',name:'村长',action:this.state?.player?.action||'照看酒店和小镇'},...(this.state?.residents||[]),...(this.state?.archivedResidents||[]).map(r=>({...r,name:r.name+'（已离镇）',action:'查看历史记录'}))].map(r=>({id:r.id,heading:`${this.code(r.id)} ${r.name}`,text:r.action,run:()=>this.showLifeLog(r.id)}));
    }
    isEditing(){return this.input?.isFocused()||false;}
    destroy(){
        if(typeof document!=='undefined'){
            document.removeEventListener('compositionstart',this.imeStart,true);
            document.removeEventListener('compositionend',this.imeEnd,true);
            document.removeEventListener('keydown',this.imeKey,true);
        }
        this.economy.close();this.canvas.destroy();this.uiCamera.node.destroy();
    }
}
