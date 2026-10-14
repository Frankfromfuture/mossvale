import { _decorator, Component, Node, UITransform, Sprite, SpriteFrame, Texture2D, Rect, Size, Graphics, Color, Vec3, input, Input, EventTouch, EventKeyboard, KeyCode, view, game, Game, Layers, screen, resources, JsonAsset, Camera } from 'cc';
import { TownApi, TownState } from './TownApi';
import { TownHud } from './TownHud';
import { TownLayout } from './Layout';
const { ccclass } = _decorator;
type Point={x:number;z:number};
type Pawn={id:string;node:Node;body:Node;x:number;z:number;phase:number;route:Point[];target:Point};
type Gesture={id:number;x:number;y:number;dx:number;dy:number;at:number;moved:boolean;held:boolean;resident:string;place:string;conversation:boolean};
const SCALE=20;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

/** Independent, orthographic 2D experiment. No 3D scenes, models, lights or perspective. */
@ccclass('Mossvale')
export class Mossvale2D extends Component {
    private hud!:TownHud;private layout!:TownLayout;private world!:Node;private player!:Pawn;
    private actors:Pawn[]=[];private api=new TownApi();private state:TownState|null=null;
    private selected='';private approach='';private place='';private action='chat';
    private gesture:Gesture|null=null;private route:Point[]=[];private cameraX=0;private cameraZ=0;
    private polling=false;private busy=false;private active=true;private entered=false;private positioned=false;
    private elapsed=0;private snapshotAt=0;private repathAt=0;private resized=0;
    private cols=0;private rows=0;private grid=new Uint8Array(0);private parents=new Int32Array(0);private queue=new Int32Array(0);
    private destination:Point|null=null;private reduceMotion=!!(globalThis as any).matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    async start(){
        game.frameRate=60;
        const load=<T>(name:string,type:any)=>new Promise<T>((resolve,reject)=>resources.load(name,type,(e:any,a:any)=>e?reject(e):resolve(a)));
        try{
            const [json,map,texture]=await Promise.all([load<JsonAsset>('town-layout',JsonAsset),load<SpriteFrame>('cafe-map/spriteFrame',SpriteFrame),load<Texture2D>('residents/texture',Texture2D)]);
            if(!this.node.isValid)return;
            this.layout=json.json as TownLayout;this.prepareGrid();
            this.hud=new TownHud(this.node,{send:(kind,message)=>this.interact(kind,message),close:()=>this.close(),control:a=>this.control(a),navigate:id=>this.visit(id)},this.layout);
            this.hud.uiCamera.clearFlags=Camera.ClearFlag.SOLID_COLOR;this.hud.uiCamera.clearColor=new Color(116,146,73,255);
            this.world=this.ui('Top-down neighbourhood',this.hud.canvas);this.world.setSiblingIndex(0);
            const ground=this.ui('Original painted street',this.world,640,960);const sprite=ground.addComponent(Sprite);sprite.spriteFrame=map;sprite.sizeMode=Sprite.SizeMode.CUSTOM;ground.getComponent(UITransform)!.setContentSize(640,960);
            texture.setFilters(Texture2D.Filter.NEAREST,Texture2D.Filter.NEAREST);
            this.player=this.pawn('player',1,10,this.layout.spawn,texture);
            for(const a of this.layout.actors){const p=this.layout.places.find(p=>p.id===a.place)!;this.actors.push(this.pawn(a.id,a.col,a.row,p,texture));}
            this.cameraX=this.player.x;this.cameraZ=this.player.z;
            input.on(Input.EventType.TOUCH_START,this.touchStart,this);input.on(Input.EventType.TOUCH_MOVE,this.touchMove,this);input.on(Input.EventType.TOUCH_END,this.touchEnd,this);input.on(Input.EventType.TOUCH_CANCEL,this.touchCancel,this);
            input.on(Input.EventType.KEY_DOWN,this.keyDown,this);game.on(Game.EVENT_HIDE,this.hide,this);game.on(Game.EVENT_SHOW,this.show,this);
            view.on('canvas-resize',this.relayout,this);
            if(typeof window!=='undefined'){window.addEventListener('resize',this.syncViewport);window.visualViewport?.addEventListener('resize',this.syncViewport);window.visualViewport?.addEventListener('scroll',this.syncViewport);this.syncViewport();}
            void this.refresh();this.schedule(this.refresh,2);
        }catch(e){console.error('2D street could not load',e);}
    }
    private ui(name:string,parent:Node,w=1,h=1){const n=new Node(name);n.parent=parent;n.layer=Layers.Enum.UI_2D;n.addComponent(UITransform).setContentSize(w,h);return n;}
    private pawn(id:string,col:number,row:number,p:Point,texture:Texture2D):Pawn{
        const node=this.ui(id,this.world,36,40),shadow=this.ui('Foot shadow',node);const g=shadow.addComponent(Graphics);g.fillColor=new Color(45,56,37,70);g.ellipse(0,-5,11,5);g.fill();
        if(id==='player'){const ring=g;ring.strokeColor=new Color(255,245,204,255);ring.lineWidth=2;ring.ellipse(0,-5,15,7);ring.stroke();}
        const body=this.ui('Kenney CC0 resident',node,32,32),s=body.addComponent(Sprite),frame=new SpriteFrame();frame.texture=texture;frame.rect=new Rect(col*17,row*17,16,16);frame.originalSize=new Size(16,16);s.spriteFrame=frame;s.sizeMode=Sprite.SizeMode.CUSTOM;body.getComponent(UITransform)!.setContentSize(32,32);body.setPosition(0,10);
        node.setPosition(p.x*SCALE,-p.z*SCALE);return {id,node,body,x:p.x,z:p.z,phase:0,route:[],target:{x:p.x,z:p.z}};
    }
    private valid(x:number,z:number){const b=this.layout.bounds;return Number.isFinite(x)&&Number.isFinite(z)&&x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ&&!this.layout.obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.32&&Math.abs(z-o.z)<o.d/2+.32);}
    private prepareGrid(){const b=this.layout.bounds;this.cols=Math.floor((b.maxX-b.minX)/.55)+1;this.rows=Math.floor((b.maxZ-b.minZ)/.55)+1;const count=this.cols*this.rows;this.grid=new Uint8Array(count);this.parents=new Int32Array(count);this.queue=new Int32Array(count);for(let i=0;i<count;i++)this.grid[i]=this.valid(b.minX+i%this.cols*.55,b.minZ+Math.floor(i/this.cols)*.55)?1:0;}
    private path(from:Point,to:Point):Point[]{
        const b=this.layout.bounds,cols=this.cols,rows=this.rows;const point=(i:number)=>({x:b.minX+i%cols*.55,z:b.minZ+Math.floor(i/cols)*.55});
        const nearest=(p:Point)=>{let id=-1,d=Infinity;for(let i=0;i<this.grid.length;i++){if(!this.grid[i])continue;const q=point(i),v=(p.x-q.x)**2+(p.z-q.z)**2;if(v<d){id=i;d=v;}}return {id,d};};
        const start=nearest(from).id,end=nearest(to);if(start<0||end.id<0||end.d>2.3**2)return [];
        this.parents.fill(-2);this.parents[start]=-1;this.queue[0]=start;let tail=1;
        for(let head=0;head<tail;head++){const curr=this.queue[head];if(curr===end.id)break;const x=curr%cols,z=Math.floor(curr/cols);for(let d=0;d<4;d++){const nx=x+(d===0?1:d===1?-1:0),nz=z+(d===2?1:d===3?-1:0),next=nz*cols+nx;if(nx<0||nx>=cols||nz<0||nz>=rows||!this.grid[next]||this.parents[next]!==-2)continue;this.parents[next]=curr;this.queue[tail++]=next;}}
        if(this.parents[end.id]===-2)return [];const result:Point[]=[];for(let k=end.id;k!==start;k=this.parents[k])result.push(point(k));result.reverse();if(this.valid(to.x,to.z))result.push({x:to.x,z:to.z});return result;
    }
    private walk(p:Point){this.close();this.route=this.path(this.player,p);this.destination=this.route.at(-1)||null;if(!this.route.length)this.hud.toast('换一个落脚的地方吧。');}
    private select(id:string,action='chat'){if(this.busy)return;this.close();this.action=action;this.approach=id;const a=this.actors.find(a=>a.id===id);if(a)this.route=this.path(this.player,a);}
    private open(id:string){const r=this.state?.residents.find(r=>r.id===id);if(!r){this.hud.toast('邻居还没到，稍等一会儿。');return;}this.selected=id;this.approach='';this.route=[];this.destination=null;this.hud.showResident(r);const a=this.action;this.action='chat';if(a==='memory')this.hud.showMemory();else if(a==='join')void this.perform(r.location,id);else if(a!=='chat')void this.interact(a);}
    private close(){if(!this.hud)return;this.selected='';this.approach='';this.place='';this.action='chat';this.hud.closeCard();}
    private visit(id:string){if(this.busy)return;const p=this.layout.places.find(p=>p.id===id);if(!p)return;this.walk(p);this.place=id;}
    private async perform(place:string,resident=''){if(this.busy)return;this.busy=true;try{await this.api.presence(this.player.x,this.player.z,resident);const r=await this.api.activity(place,resident);this.setWorld(r.world);if(resident&&this.selected===resident)this.hud.showReply(r.result.speech);else this.hud.toast(r.result.speech);}catch(e){this.hud.toast((e as Error).message);}finally{this.busy=false;}}
    private async interact(kind:string,message=''){
        if(!this.selected||this.busy)return;const id=this.selected;this.busy=true;this.hud.setWaiting(true);
        try{await this.api.presence(this.player.x,this.player.z,id);const r=await this.api.interact(id,kind,message);this.setWorld(r.world);if(id===this.selected)this.hud.showReply(r.result.speech);if(r.result.notice)this.hud.toast('暂时只能简单回应，稍后再聊。');}
        catch(e){if(id===this.selected)this.hud.messageFailed();}finally{this.busy=false;this.hud.setWaiting(false);}
    }
    private async control(action:string){if(this.busy)return;this.busy=true;try{const r=await this.api.control(action,60);this.setWorld(r.world);this.hud.toast(action==='attend'?'说好了，下午茶见。':'已经记下了。');}catch(e){this.hud.toast((e as Error).message);}finally{this.busy=false;}}
    private setWorld(w:TownState){
        if(this.state&&w.revision<this.state.revision)return;this.state=w;this.snapshotAt=this.elapsed;this.hud.setState(w);
        for(const a of this.actors){const l=w.residents.find(r=>r.id===a.id)?.life;if(!l)continue;
            if(!this.positioned){a.x=l.x;a.z=l.z;}
            else if(Math.hypot(a.x-l.x,a.z-l.z)>.5)a.route=this.path(a,l);
        }
        if(!this.positioned){if(w.player&&this.valid(w.player.x,w.player.z)){this.player.x=w.player.x;this.player.z=w.player.z;}this.cameraX=this.player.x;this.cameraZ=this.player.z;this.positioned=true;}
    }
    private refresh=async()=>{
        if(this.polling||this.busy||!this.active)return;this.polling=true;
        try{if(!this.entered){this.setWorld(await(this.state?this.api.arrive():this.api.connect()));this.entered=true;}
            else{await this.api.presence(this.player.x,this.player.z,this.selected||this.approach);this.setWorld(await this.api.world());}}
        catch(e){this.hud.connectionError((e as Error).message);}finally{this.polling=false;}
    };
    private screenPoint(p:Point){return {x:(p.x-this.cameraX)*SCALE,y:-(p.z-this.cameraZ)*SCALE};}
    private toWorld(x:number,y:number):Point{return {x:x/SCALE+this.cameraX,z:-y/SCALE+this.cameraZ};}
    private touchStart(e:EventTouch){
        if(!this.hud||this.hud.modalOpen||e.getAllTouches().length>1)return;
        const p=e.getUILocation(),x=p.x-195,y=p.y-this.hud.height/2,conversation=this.hud.conversationAt(x,y);
        if(!conversation&&this.hud.blocks(x,y))return;
        let resident=conversation||this.hud.nameAt(x,y),place='';
        if(!resident){let best=32;for(const a of this.actors){const q=this.screenPoint(a),d=Math.hypot(q.x-x,q.y+10-y);if(d<best){resident=a.id;best=d;}}}
        if(!resident)place=this.hud.landmarks.find(l=>l.node.active&&Math.abs(x-l.node.position.x)<46&&Math.abs(y-l.node.position.y)<22)?.id||'';
        this.gesture={id:e.getID(),x,y,dx:0,dy:0,at:Date.now(),moved:false,held:false,resident,place,conversation:!!conversation};
    }
    private touchMove(e:EventTouch){const g=this.gesture;if(!g||g.id!==e.getID()||g.held||g.conversation)return;const p=e.getUILocation();g.dx=p.x-195-g.x;g.dy=p.y-this.hud.height/2-g.y;if(Math.hypot(g.dx,g.dy)>12&&!g.moved){g.moved=true;this.route=[];this.destination=null;this.close();}}
    private touchEnd(e:EventTouch){const g=this.gesture;if(!g||g.id!==e.getID())return;this.gesture=null;if(g.held||g.moved)return;if(Date.now()-g.at>=550){this.context(g);return;}if(g.conversation)this.hud.advanceSpeech();else if(g.resident)this.select(g.resident);else if(g.place)this.visit(g.place);else this.walk(this.toWorld(g.x,g.y));}
    private touchCancel(){this.gesture=null;}
    private context(g:Gesture){g.held=true;this.route=[];this.destination=null;if(g.resident){const id=g.resident;this.hud.showContext(g.x,g.y,this.state?.residents.find(r=>r.id===id)?.name||'邻居',[
        {label:'聊聊',icon:'chat',run:()=>this.select(id)},{label:'一起做',icon:'help',run:()=>this.select(id,'join')},{label:'送点心',icon:'gift',cost:'10 币',run:()=>this.select(id,'gift')},{label:'回忆',icon:'memory',run:()=>this.select(id,'memory')}
    ]);}else{const p=this.toWorld(g.x,g.y);this.hud.showContext(g.x,g.y,'慢慢逛',[
        {label:'走这里',icon:'walk',run:()=>this.walk(p)},{label:'手记',icon:'journal',run:()=>this.hud.toggleJournal()},{label:'散步图',icon:'map',run:()=>this.hud.toggleMap(new Vec3(this.player.x,0,this.player.z))}
    ]);}}
    private keyDown(e:EventKeyboard){if(e.keyCode===KeyCode.ESCAPE){this.hud.closeContext();this.hud.closeMap();this.close();}}
    private hide(){this.active=false;this.gesture=null;this.route=[];this.destination=null;}
    private show(){this.active=true;this.entered=false;void this.refresh();}
    private relayout=()=>{if(this.hud)this.hud.relayout(view.getVisibleSize().height);};
    private syncViewport=()=>{
        if(this.resized)return;this.resized=requestAnimationFrame(()=>{this.resized=0;const frame=document.getElementById('GameDiv');if(!frame)return;const vv=window.visualViewport,height=Math.round(vv?.height||innerHeight),available=Math.min(innerWidth,vv?.width||innerWidth),phone=matchMedia('(pointer: coarse)').matches||innerWidth<=600,width=Math.round(phone?Math.min(available,500):Math.min(available,height*390/844));frame.style.left=`${Math.round((innerWidth-width)/2+(vv?.offsetLeft||0))}px`;frame.style.top=`${Math.round(vv?.offsetTop||0)}px`;screen.windowSize=new Size(width*screen.devicePixelRatio,height*screen.devicePixelRatio);this.relayout();});
    };
    private step(p:Pawn,target:Point,distance:number){const dx=target.x-p.x,dz=target.z-p.z,len=Math.hypot(dx,dz);if(len<.005)return false;const amount=Math.min(distance,len),x=p.x+dx/len*amount,z=p.z+dz/len*amount;let moved=false;
        if(this.valid(x,p.z)){moved||=Math.abs(x-p.x)>.0001;p.x=x;}if(this.valid(p.x,z)){moved||=Math.abs(z-p.z)>.0001;p.z=z;}if(moved&&Math.abs(dx)>.01)p.body.setScale(dx<0?-1:1,1,1);return moved;
    }
    private animate(p:Pawn,walking:boolean,dt:number){if(walking)p.phase+=dt*11;const y=walking&&!this.reduceMotion?10+Math.abs(Math.sin(p.phase))*2:10;p.body.setPosition(0,y);p.node.setPosition(p.x*SCALE,-p.z*SCALE);}
    update(dt:number){
        if(!this.world||!this.active)return;dt=Math.min(dt,.06);this.elapsed+=dt;this.hud.tick(dt);const g=this.gesture;
        this.hud.holdAt(g?.x||0,g?.y||0,g&&!g.moved&&!g.held?(Date.now()-g.at)/550:0);if(g&&!g.moved&&!g.held&&Date.now()-g.at>=550)this.context(g);
        let moving=false;
        if(!this.hud.modalOpen&&!this.hud.isEditing()&&!this.busy){
            if(g?.moved&&!g.held){const d=Math.hypot(g.dx,g.dy);moving=this.step(this.player,{x:this.player.x+g.dx/d,z:this.player.z-g.dy/d},3.3*dt*Math.min(1,d/65));}
            else if(!g&&!this.selected){if(this.route.length){moving=this.step(this.player,this.route[0],dt*3.3);if(Math.hypot(this.player.x-this.route[0].x,this.player.z-this.route[0].z)<.04)this.route.shift();}
                if(this.approach){const a=this.actors.find(a=>a.id===this.approach)!;if(Math.hypot(a.x-this.player.x,a.z-this.player.z)<2.5)this.open(a.id);else if(this.elapsed-this.repathAt>2){this.repathAt=this.elapsed;this.route=this.path(this.player,a);}}
                if(this.place&&!this.route.length){const id=this.place;this.place='';void this.perform(id);}
            }
        }
        this.animate(this.player,moving,dt);
        for(const a of this.actors){const l=this.state?.residents.find(r=>r.id===a.id)?.life;let walking=false;if(l){
            let tx=l.x,tz=l.z,remaining=this.state!.paused||a.id===this.selected?0:Math.min(2,Math.max(0,this.elapsed-this.snapshotAt))*.475*(this.state!.speed||1);
            if(l.phase==='walking')for(const q of l.route){const d=Math.hypot(q.x-tx,q.z-tz);if(d<=remaining){tx=q.x;tz=q.z;remaining-=d;}else{if(d>.001){tx+=(q.x-tx)/d*remaining;tz+=(q.z-tz)/d*remaining;}break;}}
            a.target.x=tx;a.target.z=tz;
            if(a.route.length){walking=this.step(a,a.route[0],dt*2);if(Math.hypot(a.x-a.route[0].x,a.z-a.route[0].z)<.04)a.route.shift();}
            else walking=this.step(a,a.target,dt*1.1);
        }this.animate(a,walking,dt);}
        // A generous dead zone keeps the camera still while the player explores nearby.
        let cx=this.cameraX,cz=this.cameraZ;const dx=this.player.x-cx,dz=this.player.z-cz;if(Math.abs(dx)>3.1)cx=this.player.x-Math.sign(dx)*3.1;if(Math.abs(dz)>4.5)cz=this.player.z-Math.sign(dz)*4.5;
        const halfX=Math.max(0,16-195/SCALE),halfZ=Math.max(0,24-this.hud.height/2/SCALE);cx=clamp(cx,-halfX,halfX);cz=clamp(cz,-halfZ,halfZ);
        const follow=this.reduceMotion?1:1-Math.exp(-dt*8);this.cameraX+=Math.abs(cx-this.cameraX)<.002?cx-this.cameraX:(cx-this.cameraX)*follow;this.cameraZ+=Math.abs(cz-this.cameraZ)<.002?cz-this.cameraZ:(cz-this.cameraZ)*follow;
        this.world.setPosition(-this.cameraX*SCALE,this.cameraZ*SCALE);
        for(const a of this.actors){const p=this.screenPoint(a),r=this.state?.residents.find(r=>r.id===a.id),name=this.hud.nameplates[a.id],near=Math.hypot(a.x-this.player.x,a.z-this.player.z)<9;
            name.active=near&&Math.abs(p.x)<180&&Math.abs(p.y)<this.hud.height/2-90;name.setPosition(p.x,p.y+38);
            const ambient=this.hud.ambient[a.id];ambient.node.active=false;
            if(!this.selected&&!this.hud.modalOpen&&r?.life?.speech&&near&&a.id===this.actors[Math.floor(this.elapsed/9)%this.actors.length].id&&Math.abs(p.x)<105&&p.y<this.hud.height/2-130){ambient.node.active=true;ambient.node.setPosition(p.x,p.y+80);ambient.label.string=r.life.speech.slice(0,23);}
            if(a.id===this.selected)this.hud.anchorSpeech(p.x,p.y+30);
        }
        for(const l of this.hud.landmarks){const p=this.layout.places.find(p=>p.id===l.id)!,q=this.screenPoint(p);l.node.active=!this.selected&&Math.hypot(p.x-this.player.x,p.z-this.player.z)<9&&Math.abs(q.x)<155&&Math.abs(q.y)<this.hud.height/2-110;l.node.setPosition(q.x,q.y-42);}
        this.hud.playerPosition.set(this.player.x,0,this.player.z);this.hud.destination.active=!!this.destination&&this.route.length>0;if(this.hud.destination.active){const p=this.screenPoint(this.destination!);this.hud.destination.setPosition(p.x,p.y);}
    }
    onDestroy(){this.unschedule(this.refresh);input.off(Input.EventType.TOUCH_START,this.touchStart,this);input.off(Input.EventType.TOUCH_MOVE,this.touchMove,this);input.off(Input.EventType.TOUCH_END,this.touchEnd,this);input.off(Input.EventType.TOUCH_CANCEL,this.touchCancel,this);input.off(Input.EventType.KEY_DOWN,this.keyDown,this);game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);view.off('canvas-resize',this.relayout,this);if(typeof window!=='undefined'){window.removeEventListener('resize',this.syncViewport);window.visualViewport?.removeEventListener('resize',this.syncViewport);window.visualViewport?.removeEventListener('scroll',this.syncViewport);if(this.resized)cancelAnimationFrame(this.resized);}this.hud?.destroy();}
}
