import { Node, Canvas, Camera, UITransform, Graphics, Color, Label, LabelOutline, Layers, EditBox, view, ResolutionPolicy, Vec3, sys, Sprite, SpriteFrame, resources } from 'cc';
import {PlaceSpot, TownLayout} from './Layout';
import { Resident, TownState } from './TownApi';
declare const wx:any;
const ink='#EEEEEE', paper='#050505', green='#AAAAAA', ochre='#FFFFFF';
const c=(s:string)=>new Color().fromHEX(s);
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export type HudActions={send:(kind:string,message?:string)=>void;close:()=>void;control:(action:string)=>void;navigate:(place:string)=>void};
export type ContextOption={label:string;icon:string;cost?:string;run:()=>void};
type Motion={node:Node;time:number;duration:number;from:number};

/** Native, world-attached game UI. Paper is a prop, never a generic panel. */
export class TownHud {
    canvas:Node;uiCamera:Camera;topInset=0;bottomInset=0;width=390;height=844;
    nameplates:Record<string,Node>={};landmarks:{node:Node,world:Vec3,id:string}[]=[];ambient:Record<string,{node:Node,label:Label}>={};destination:Node;
    private inspection:Node|null=null;private inspectionPage=0;private inspectionTitle='';private inspectionLines:string[]=[];private placement:Node|null=null;
    private bubble:Node|null=null;private tail:Graphics|null=null;private bubbleRect:number[]|null=null;
    private tailBase=NaN;private tailTip=NaN;private tailLength=NaN;
    private composer:Node|null=null;private input:EditBox|null=null;private draft='';private composing=false;private compositionEnded=0;private draftResident='';private submitted='';
    private journalResident='';private journal:Node|null=null;private journalPage=0;private menu:Node|null=null;private state:TownState|null=null;
    private selected:Resident|null=null;private speech:Label|null=null;private nextHint:Label|null=null;
    private pages:string[]=[];private speechPage=0;private waiting=false;
    private notice:Node;private noticeText:Label;private noticeTime=0;private retry=false;
    private clockLabel:Label;private weather:Node;private lastWeather='';private hold:Node;
    playerPosition=new Vec3();private map:Node|null=null;private mapButton:Node;private journalButton:Node;
    private hint:Node;private hintTime=7;private motions:Motion[]=[];
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
        view.setDesignResolutionSize(390,844,ResolutionPolicy.FIXED_WIDTH);this.height=view.getVisibleSize().height;
        if(sys.platform===sys.Platform.WECHAT_GAME){
            const info=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync(),scale=390/info.windowWidth;
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
        this.clockLabel=this.label(this.canvas,'09:00',-105,top-44,72,30,21,ink,true,true);
        this.mapButton=this.iconButton(this.canvas,'map',155,top-43,()=>this.toggleMap(this.playerPosition));
        this.journalButton=this.iconButton(this.canvas,'journal',106,top-43,()=>this.toggleJournal());
        this.notice=this.node('Little reminder',this.canvas,0,top-93,334,48);
        this.cloud(this.notice,334,48);this.noticeText=this.label(this.notice,'',0,0,304,42,14);
        this.bind(this.notice,()=>{if(this.retry)this.openComposer();});this.notice.active=false;
        this.hint=this.node('First steps',this.canvas,0,bottom+43,272,36);
        this.label(this.hint,'1格 = 1m · — 路面 · = 固定障碍',0,0,270,32,15,ink,false,true);
        if(sys.localStorage.getItem('mossvale2d-touch-learned'))this.hint.active=false;
        this.destination=this.node('Footfall',this.canvas,0,0,30,20);const dg=this.destination.addComponent(Graphics);
        dg.lineWidth=2.5;dg.strokeColor=c(paper);dg.ellipse(0,0,13,7);dg.stroke();dg.fillColor=c(green);dg.ellipse(-3,1,2.8,4);dg.ellipse(4,-1,2.8,4);dg.fill();this.destination.active=false;
        this.hold=this.node('Hold progress',this.canvas,0,0,50,50);this.hold.addComponent(Graphics);this.hold.active=false;
        for(const {id,name} of layout.actors){
            const p=this.node('Nearby '+id,this.canvas,0,0,78,30);this.label(p,name,0,0,78,30,15,ink,true,true);this.nameplates[id]=p;
            const n=this.node('Neighbour thought '+id,this.canvas,0,0,168,42);this.cloud(n,168,42,paper);const label=this.label(n,'',0,0,150,35,12);n.active=false;this.ambient[id]={node:n,label};
        }
        for(const spot of layout.places){const n=this.node('Sign '+spot.id,this.canvas,0,0,104,48);this.label(n,spot.short,0,8,104,23,16,ink,true,true);this.label(n,spot.cost?`${spot.label} · ${spot.cost} 币`:spot.label,0,-13,104,20,12,green,false,true);this.landmarks.push({node:n,world:new Vec3(spot.x+1.7,1.1,spot.z),id:spot.id});}
    }
    relayout(height:number){
        this.height=height;
        this.canvas.getComponent(UITransform)!.setContentSize(this.width,height);
        this.canvas.setPosition(this.width/2,height/2,0);
        this.uiCamera.node.setPosition(this.width/2,height/2,1000);this.uiCamera.orthoHeight=height/2;
        const top=height/2-this.topInset,bottom=-height/2+this.bottomInset;
        this.weather.setPosition(-158,top-43,0);this.clockLabel.node.setPosition(-105,top-44,0);
        this.mapButton.setPosition(155,top-43,0);this.journalButton.setPosition(106,top-43,0);
        this.notice.setPosition(0,top-93,0);this.hint.setPosition(0,bottom+43,0);
        this.composer?.setPosition(0,bottom+60,0);
        this.closeContext();if(this.journal)this.drawJournal();if(this.map)this.drawMap();if(this.inspection)this.drawInspection();this.placement?.setPosition(0,-this.height/2+this.bottomInset+54);
    }
    private node(name:string,parent:Node,x=0,y=0,w=1,h=1){const n=new Node(name);n.parent=parent;n.layer=Layers.Enum.UI_2D;n.setPosition(x,y,0);n.addComponent(UITransform).setContentSize(w,h);return n;}
    private label(parent:Node,text:string,x:number,y:number,w:number,h:number,size:number,tone=ink,bold=false,outline=false){
        const n=this.node(text.slice(0,18)||'Text',parent,x,y,w,h),l=n.addComponent(Label);
        l.string=text;l.fontSize=size;l.lineHeight=size*1.55;l.color=c(tone);l.isBold=bold;l.fontFamily='PingFang SC';
        l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;l.enableWrapText=true;
        if(outline){const o=n.addComponent(LabelOutline);o.color=c(paper);o.width=2;}return l;
    }
    private cloud(n:Node,w:number,h:number,_tone=paper){
        const g=n.getComponent(Graphics)||n.addComponent(Graphics);g.clear();g.fillColor=c(paper);g.strokeColor=c('#777777');g.lineWidth=1;g.rect(-w/2,-h/2,w,h);g.fill();g.stroke();return g;
    }
    private pop(n:Node,from=.86,duration=.18){if(this.reduceMotion)return;n.setScale(from,from,1);this.motions.push({node:n,time:0,duration,from});}
    private bind(n:Node,run:()=>void){
        let pressed=false;
        n.on(Node.EventType.TOUCH_START,e=>{e.propagationStopped=true;pressed=true;n.setScale(.94,.94,1);});
        n.on(Node.EventType.TOUCH_MOVE,e=>{const a=e.getStartLocation(),b=e.getLocation();if(Math.hypot(a.x-b.x,a.y-b.y)>12){pressed=false;n.setScale(1,1,1);}});
        n.on(Node.EventType.TOUCH_END,e=>{e.propagationStopped=true;const yes=pressed;pressed=false;n.setScale(1,1,1);if(yes)run();});
        n.on(Node.EventType.TOUCH_CANCEL,()=>{pressed=false;n.setScale(1,1,1);});
    }
    private icon(parent:Node,kind:string,x=0,y=0,scale=1){
        const labels:Record<string,string>={sun:'晴',rain:'雨',chat:'回复',tea:'茶',gift:'赠',help:'帮忙',memory:'记录',journal:'记录',walk:'走',map:'地图',rest:'休息',close:'×',next:'›',prev:'‹',send:'发送'};
        const n=this.node(kind,parent,x,y,44,44);n.setScale(scale,scale,1);this.label(n,labels[kind]||kind,0,0,44,40,['close','next','prev'].includes(kind)?28:14,ink);return n;
    }
    private iconButton(parent:Node,kind:string,x:number,y:number,run:()=>void){const n=this.node(kind,parent,x,y,46,46);this.icon(n,kind);this.bind(n,run);return n;}
    get menuOpen(){return !!this.menu;}
    get modalOpen(){return !!this.menu||!!this.journal||!!this.map||!!this.inspection;}
    nameAt(x:number,y:number){return Object.entries(this.nameplates).find(([,p])=>p.active&&Math.abs(x-p.position.x)<40&&Math.abs(y-p.position.y)<18)?.[0]||'';}
    conversationAt(x:number,y:number){if(!this.bubbleRect||!this.selected)return '';const [cx,cy,w,h]=this.bubbleRect;return Math.abs(x-cx)<w/2-18&&Math.abs(y-cy)<h/2-35?this.selected.id:'';}
    blocks(x:number,y:number){
        if(this.modalOpen||y>this.height/2-this.topInset-72||y<-this.height/2+this.bottomInset+8)return true;
        if(this.notice.active&&y>this.height/2-this.topInset-120)return true;
        if((this.composer||this.placement)&&y<-this.height/2+this.bottomInset+120)return true;
        if(this.bubbleRect){const [cx,cy,w,h]=this.bubbleRect;if(Math.abs(x-cx)<w/2+8&&y>cy-h/2-50&&y<cy+h/2+15)return true;}
        return false;
    }
    setState(w:TownState){
        this.state=w;this.clockLabel.string=`${String(Math.floor(w.minute%1440/60)).padStart(2,'0')}:${String(w.minute%60).padStart(2,'0')}`;
        if(this.lastWeather!==w.weather){this.lastWeather=w.weather;this.weather.children.slice().forEach(n=>n.destroy());this.icon(this.weather,w.weather==='rain'?'rain':'sun');}
        if(this.selected)this.selected=w.residents.find(r=>r.id===this.selected!.id)||this.selected;
        if(this.journal)this.drawJournal();
    }
    toast(text:string){this.notice.active=true;this.noticeText.string=text;this.noticeTime=5;this.retry=false;this.notice.setSiblingIndex(this.canvas.children.length-1);}
    tick(dt:number){
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
        this.bubble=this.node('Speech beside '+r.name,this.canvas,0,100,322,170);this.tail=this.bubble.addComponent(Graphics);
        this.label(this.bubble,`${this.code(r.id)} ${r.name}`,-90,61,110,30,19,ochre,true);
        this.iconButton(this.bubble,'close',136,62,()=>this.actions.close());
        this.speech=this.label(this.bubble,'',0,3,274,82,18);this.speech.horizontalAlign=Label.HorizontalAlign.LEFT;
        this.nextHint=this.label(this.bubble,'',-58,-58,180,24,12,green);
        const reply=this.iconButton(this.bubble,'chat',112,-112,()=>this.openComposer());this.label(reply,'聊两句',0,-27,64,20,12,ink,true,true);
        this.bubbleRect=[0,100,322,170];
        this.showReply(r.life?`${r.action}。${r.life.speech||r.thought}`:r.thought);this.pop(this.bubble);
    }
    anchorSpeech(x:number,y:number){
        if(!this.bubble||!this.tail)return;
        const bx=clamp(x,-this.width/2+173,this.width/2-173);
        const ceiling=this.height/2-this.topInset-160;
        const floor=-this.height/2+this.bottomInset+(this.composer?200:155);
        const by=clamp(y+120,Math.min(floor,ceiling),ceiling);
        if(Math.abs(this.bubble.position.x-bx)>.05||Math.abs(this.bubble.position.y-by)>.05)this.bubble.setPosition(bx,by,0);
        this.bubbleRect![0]=bx;this.bubbleRect![1]=by;
        const reply=this.bubble.getChildByName('chat');if(reply)reply.active=!this.composer;
        // Reuse the tessellated bubble until its outline actually changes.
        const base=Math.round(clamp(x-bx,-112,112)*2)/2,tip=Math.round(clamp(x-bx,base-16,base+16)*2)/2;
        const length=Math.round(clamp(by-85-y-8,16,34)*2)/2,g=this.tail;
        if(base===this.tailBase&&tip===this.tailTip&&length===this.tailLength)return;
        this.tailBase=base;this.tailTip=tip;this.tailLength=length;
        g.clear();g.fillColor=c(paper);g.strokeColor=c('#999999');g.lineWidth=1;
        g.moveTo(-161,-85);g.lineTo(-161,85);g.lineTo(161,85);g.lineTo(161,-85);g.lineTo(base+7,-85);g.lineTo(tip,-85-length);g.lineTo(base-7,-85);g.close();g.fill();g.stroke();
    }

    private chunks(text:string,limit=42){
        const parts:string[]=[];let rest=text.trim();
        while(rest.length>limit){let end=limit;const cut=rest.slice(0,limit).search(/[。！？；\n][^。！？；\n]*$/);if(cut>limit*.4)end=cut+1;parts.push(rest.slice(0,end));rest=rest.slice(end).trim();}if(rest)parts.push(rest);return parts.length?parts:['……'];
    }
    advanceSpeech(){if(this.waiting)return;if(this.speechPage<this.pages.length-1){this.speechPage++;this.paintSpeech();}else this.openComposer();}
    private paintSpeech(){if(this.speech)this.speech.string=this.pages[this.speechPage]||'……';if(this.nextHint)this.nextHint.string=this.waiting?'':this.speechPage<this.pages.length-1?'轻点，听下去  · · ·':'轻点聊两句';}
    showReply(text:string){this.pages=this.chunks(text);this.speechPage=0;this.paintSpeech();this.submitted='';}
    showMemory(){if(!this.selected)return;const items=this.selected.memories.filter(m=>m.kind==='fact'||m.kind==='impression').slice(-3);this.pages=items.length?items.flatMap(m=>this.chunks(m.text)):['还没有共同的回忆。先聊聊吧。'];this.speechPage=0;this.paintSpeech();}
    setWaiting(waiting:boolean){this.waiting=waiting;if(waiting){this.pages=['……'];this.speechPage=0;}this.paintSpeech();}
    messageFailed(){this.draft=this.submitted||this.draft;this.pages=['……'];this.speechPage=0;this.paintSpeech();this.toast('没发出去，点这里再试');this.retry=true;this.noticeTime=12;}
    private openComposer(){
        if(!this.selected||this.waiting||this.composer)return;
        const n=this.node('Your words',this.canvas,0,-this.height/2+this.bottomInset+60,340,82);this.composer=n;this.cloud(n,340,82);
        const entry=this.node('Reply input',n,-25,0,238,48);entry.active=false;this.input=entry.addComponent(EditBox);
        this.input.textLabel=this.label(entry,'',0,0,228,44,17);this.input.textLabel.horizontalAlign=Label.HorizontalAlign.LEFT;
        this.input.placeholderLabel=this.label(entry,'想说点什么？',0,0,228,44,16,'#888888');this.input.placeholderLabel.horizontalAlign=Label.HorizontalAlign.LEFT;
        this.input.textLabel.node.getComponent(UITransform)!.setAnchorPoint(0,1);this.input.placeholderLabel.node.getComponent(UITransform)!.setAnchorPoint(0,1);
        this.input.inputMode=EditBox.InputMode.SINGLE_LINE;this.input.maxLength=300;this.input.returnType=EditBox.KeyboardReturnType.SEND;this.input.string=this.draft;
        entry.on('editing-return',()=>this.sendText());
        entry.on('editing-did-ended',()=>{this.composing=false;if(this.input)this.draft=this.input.string;});
        entry.active=true;
        this.iconButton(n,'send',135,0,()=>this.sendText());this.input.focus();this.notice.active=false;
    }
    private sendText(){if(this.waiting||this.composing)return;const message=this.input?.string.trim();if(!message)return;this.submitted=message;this.draft='';this.composer?.destroy();this.composer=null;this.input=null;this.actions.send('chat',message);}
    closeCard(){
        this.composing=false;if(this.input)this.draft=this.input.string;this.composer?.destroy();this.composer=null;this.input=null;
        this.bubble?.destroy();this.bubble=null;this.tail=null;this.tailBase=this.tailTip=this.tailLength=NaN;this.bubbleRect=null;this.selected=null;this.speech=null;this.nextHint=null;
    }
    showContext(x:number,y:number,title:string,options:ContextOption[]){
        this.closeContext();this.learned();this.hold.active=false;
        this.menu=this.node('Petals around the touch',this.canvas,0,0,this.width,this.height);this.bind(this.menu,()=>this.closeContext());
        // The invisible catcher owns a new press; releasing the original hold cannot choose an action.
        const mx=clamp(x,-35,35),my=clamp(y,-this.height/2+this.bottomInset+185,this.height/2-this.topInset-222);
        const center=this.node('Flower centre',this.menu,mx,my,74,54);this.cloud(center,88,44);this.label(center,title,0,0,72,32,14,ink,true);this.bind(center,()=>this.closeContext());
        if(Math.hypot(mx-x,my-y)>30){const g=this.menu.addComponent(Graphics);g.strokeColor=c('#888888');g.lineWidth=2;g.moveTo(x,y);g.quadraticCurveTo(x,my,mx,my);g.stroke();g.circle(x,y,6);g.stroke();}
        options.slice(0,5).forEach((o,i)=>{
            const a=(90-i*360/options.length)*Math.PI/180,r=108,n=this.node(o.label,this.menu,mx+Math.cos(a)*r,my+Math.sin(a)*r,86,84);
            this.cloud(n,88,52);this.label(n,o.label,0,0,84,32,14,ink);
            if(o.cost)this.label(n,o.cost,0,-36,80,20,11,ink,false,true);
            this.bind(n,()=>{this.closeContext();o.run();});this.pop(n,.55,.18+i*.012);
        });
    }
    closeContext(){this.menu?.destroy();this.menu=null;}
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
        this.label(n,'轻点附近摆放 · 长按取消',-18,0,273,36,16,ink,true);this.iconButton(n,'close',143,0,()=>cancel?.());
    }
    toggleJournal(){this.closeInspection();this.closeMap();this.closeContext();if(this.journal){this.journal.destroy();this.journal=null;return;}this.actions.close();this.learned();this.journalPage=0;this.journalResident='';this.drawJournal();if(this.journal)this.pop(this.journal);}
    closeMap(){this.map?.destroy();this.map=null;}
    toggleMap(position:Vec3){
        this.closeInspection();
        if(this.map){this.closeMap();return;}this.playerPosition=position;this.closeContext();this.actions.close();
        this.journal?.destroy();this.journal=null;this.drawMap();if(this.map)this.pop(this.map,.94);
    }
    private drawMap(){
        this.closeMap();const h=Math.min(680,this.height-100),n=this.node('Grid map and legend',this.canvas,0,0,350,h);this.map=n;this.cloud(n,350,h);
        this.label(n,'网格地图',0,h/2-32,240,35,20);this.iconButton(n,'close',147,h/2-30,()=>this.closeMap());
        const b=this.layout.bounds,mx=(x:number)=>(x-b.minX)/(b.maxX-b.minX)*300-150,my=(z:number)=>h/2-88-(z-b.minZ)/(b.maxZ-b.minZ)*(h-290),g=n.getComponent(Graphics)!;
        g.lineWidth=1;g.strokeColor=c('#555555');for(const o of this.layout.obstacles){g.rect(mx(o.x-o.w/2),my(o.z+o.d/2),o.w/(b.maxX-b.minX)*300,o.d/(b.maxZ-b.minZ)*(h-290));}g.stroke();
        for(const p of this.layout.places){const pin=this.node('Map destination '+p.id,n,mx(p.x),my(p.z),84,44);this.cloud(pin,84,30);this.label(pin,p.short,0,0,82,27,12);this.bind(pin,()=>{this.closeMap();this.actions.navigate(p.id);});}
        this.label(n,'A1',mx(this.playerPosition.x),my(this.playerPosition.z),26,26,14,ink,true);
        this.label(n,'1格 = 1m × 1m   — 路面   = 固定障碍',0,-h/2+162,322,28,13);
        this.label(n,'A / B 人物   C 桌   D 椅   E 书架   F 长椅\nG 柜台   H 咖啡机   I 杯   J 书   K 盆栽\nL 树   M 灌木   N 花   O 门   P 工作台\nQ 喷泉   R 木箱   S 石块   T 灯',0,-h/2+90,326,114,13);
        this.label(n,'轻点互动 · 长按选动作 · 拖动走路',0,-h/2+22,320,25,12,green);
    }
    private code(id:string){return id==='player'?'A1':this.layout.actors.find(a=>a.id===id)?.code||id;}
    showLifeLog(id:string){this.closeInspection();this.closeMap();this.closeContext();this.actions.close();this.journalResident=id;this.journalPage=0;this.drawJournal();}
    private journalEntries(){
        const r=this.state?.residents.find(r=>r.id===this.journalResident);
        const events=this.journalResident==='player'?this.state?.playerLog:r?.lifeLog;
        return (events||[]).slice().reverse().flatMap(e=>this.chunks(e.text,112).map(text=>({text,heading:`第 ${Math.floor(e.at/1440)+1} 天  ${String(Math.floor(e.at%1440/60)).padStart(2,'0')}:${String(e.at%60).padStart(2,'0')}`,id:e.id})));
    }
    private drawJournal(){
        this.journal?.destroy();const h=Math.min(680,this.height-this.topInset-this.bottomInset-90),n=this.node('Life records',this.canvas,0,0,350,h);this.journal=n;this.cloud(n,350,h);
        this.label(n,'生活记录',0,h/2-32,220,35,20);this.iconButton(n,'close',147,h/2-30,()=>this.toggleJournal());
        if(!this.journalResident){
            const people=[{id:'player',name:'你',action:'走动、使用物件、与邻居交谈'},...(this.state?.residents||[])];
            const size=Math.max(3,Math.floor((h-185)/44)),count=Math.max(1,Math.ceil(people.length/size));this.journalPage=clamp(this.journalPage,0,count-1);
            this.label(n,`${people.length} 人 · 轻点编号查看经历`,0,h/2-67,310,25,13,green);
            people.slice(this.journalPage*size,(this.journalPage+1)*size).forEach((r,i)=>{const row=this.node('Record '+r.id,n,0,h/2-108-i*44,320,44);const label=this.label(row,`${this.code(r.id)}  ${r.name}   ${r.action}`,0,0,310,40,14);label.horizontalAlign=Label.HorizontalAlign.LEFT;this.bind(row,()=>{this.journalResident=r.id;this.journalPage=0;this.drawJournal();});});
            this.journalPaging(n,h,count,()=>{this.journalPage--;this.drawJournal();},()=>{this.journalPage++;this.drawJournal();});
        }else{
            const r=this.state?.residents.find(r=>r.id===this.journalResident),entries=this.journalEntries();this.journalPage=clamp(this.journalPage,0,Math.max(0,entries.length-1));
            this.label(n,`${this.code(this.journalResident)} ${r?.name||'你'}`,0,h/2-80,302,34,23);
            this.label(n,r?.action||'在小镇走走',0,h/2-118,302,40,14,green);
            this.label(n,'实际经历 · 最近100条 · 新的在前',0,-h/2+116,306,26,12,green);
            const entry=entries[this.journalPage];this.label(n,entry?.heading||'今天',0,h/2-175,300,26,13,green);
            const bodyHeight=Math.max(80,h-380),body=this.label(n,entry?.text||'还没有发生的事。去走走、用一件物品，或找邻居聊聊。',0,h/2-220-bodyHeight/2,294,bodyHeight,18);body.lineHeight=29;body.horizontalAlign=Label.HorizontalAlign.LEFT;body.verticalAlign=Label.VerticalAlign.TOP;
            const back=this.node('All people',n,-111,h/2-32,80,44);this.label(back,'‹ 全部',0,0,80,38,14);this.bind(back,()=>{this.journalResident='';this.journalPage=0;this.drawJournal();});
            this.journalPaging(n,h,Math.max(1,entries.length),()=>{this.journalPage--;this.drawJournal();},()=>{this.journalPage++;this.drawJournal();});
        }
        const pause=this.node('Pause life',n,-85,-h/2+26,108,42);this.label(pause,this.state?.paused?'继续生活':'暂停',0,0,106,36,13);this.bind(pause,()=>this.actions.control('pause'));
        const speed=this.node('Life speed',n,85,-h/2+26,108,42);this.label(speed,`时间 ×${this.state?.speed||1}`,0,0,106,36,13);this.bind(speed,()=>this.actions.control('speed'));
    }
    private journalPaging(n:Node,h:number,count:number,previous:()=>void,next:()=>void){
        this.iconButton(n,'prev',-110,-h/2+73,()=>{if(this.journalPage>0)previous();});this.iconButton(n,'next',110,-h/2+73,()=>{if(this.journalPage<count-1)next();});
        this.label(n,`${this.journalPage+1} / ${count}`,0,-h/2+73,90,30,13,green);
    }
    isEditing(){return this.input?.isFocused()||false;}
    destroy(){
        if(typeof document!=='undefined'){
            document.removeEventListener('compositionstart',this.imeStart,true);
            document.removeEventListener('compositionend',this.imeEnd,true);
            document.removeEventListener('keydown',this.imeKey,true);
        }
        this.canvas.destroy();this.uiCamera.node.destroy();
    }
}
