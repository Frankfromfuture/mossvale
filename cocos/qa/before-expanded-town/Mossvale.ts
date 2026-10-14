import { _decorator, Component, Material, Node, Camera, DirectionalLight, Color, Vec3, Vec4, Quat, input, Input, EventTouch, EventKeyboard, KeyCode, geometry, view, game, Game, Layers, screen, Size, resources, JsonAsset } from 'cc';
import { StreetWorld, Actor, TownLayout } from './StreetWorld';
import { TownApi, TownState } from './TownApi';
import { TownHud } from './TownHud';
const { ccclass, property } = _decorator;
type TouchIntent = {id:number;x:number;y:number;started:number;point:Vec3;resident:string;place:string;contextOnly:boolean;moved:boolean;held:boolean};

@ccclass('Mossvale')
export class Mossvale extends Component {
    @property(Material) villageMaterial:Material|null=null;
    private street!:StreetWorld;private player!:Actor;private camera!:Camera;private hud!:TownHud;
    private api=new TownApi();private state:TownState|null=null;private route:Vec3[]=[];
    private gesture:TouchIntent|null=null;private pendingAction='chat';private destination=new Vec3();private cameraTarget=new Vec3(0,0,1);
    private selected='';private approach='';private busy=false;private polling=false;private overview=false;
    private elapsed=0;private snapshotAt=0;private active=true;private positioned=false;private approachPlace='';private repathAt=0;
    private readonly npcPoint=new Vec3();private npcRoutes:Record<string,Vec3[]>={};private playerWork='';private playerWorkUntil=0;
    private neighbours:Actor[]=[];
    private readonly moveDelta=new Vec3();private readonly followPoint=new Vec3();
    private readonly projectedPoint=new Vec3();private readonly cameraPosition=new Vec3();
    private readonly overviewTarget=new Vec3(0,0,1);
    private viewportFrame=0;
    private resize=()=>{
        if(!this.hud)return;
        const height=view.getVisibleSize().height,previous=this.hud.height;
        if(Math.abs(height-previous)<.5)return;
        this.hud.relayout(height);
        this.camera.orthoHeight*=height/previous;
    };
    private syncViewport=()=>{
        if(this.viewportFrame||typeof window==='undefined')return;
        this.viewportFrame=requestAnimationFrame(()=>{
            this.viewportFrame=0;
            const frame=document.getElementById('GameDiv');if(!frame)return;
            const vv=window.visualViewport,height=Math.round(vv?.height||innerHeight);
            const available=Math.min(innerWidth,vv?.width||innerWidth);
            // A keyboard changes height, never the portrait game's width on a phone.
            const phone=matchMedia('(pointer: coarse)').matches||innerWidth<=600;
            const width=Math.round(phone?Math.min(available,500):Math.min(available,height*390/844));
            frame.style.left=`${Math.round((innerWidth-width)/2+(vv?.offsetLeft||0))}px`;
            frame.style.top=`${Math.round(vv?.offsetTop||0)}px`;
            screen.windowSize=new Size(width*screen.devicePixelRatio,height*screen.devicePixelRatio);
            this.resize();
        });
    };


    async start(){
        game.frameRate=60;
        const layout=await new Promise<TownLayout>((resolve,reject)=>resources.load('town-layout',JsonAsset,(e,a)=>e?reject(e):resolve(a.json as TownLayout)));
        if(!this.node.isValid)return;
        this.street=new StreetWorld(this.node,this.villageMaterial!,layout).build();
        this.player=this.street.actor('player','player',-1,4.3);
        for(const a of layout.actors){const p=layout.places.find(p=>p.id===a.place)!;this.street.actor(a.id,a.type,p.x,p.z);}
        this.neighbours=this.street.actors.filter(a=>a.id!=='player');
        this.setupLighting();
        const cn=new Node('Town Camera');cn.parent=this.node;
        this.camera=cn.addComponent(Camera);this.camera.projection=Camera.ProjectionType.ORTHO;
        this.camera.orthoHeight=12.8;this.camera.near=.1;this.camera.far=120;
        this.camera.clearColor=new Color().fromHEX('#CCD7BC');this.camera.visibility=Layers.Enum.DEFAULT;
        cn.setPosition(17,25,30);cn.lookAt(this.cameraTarget);
        this.createHud();
        input.on(Input.EventType.KEY_DOWN,this.keyDown,this);
        input.on(Input.EventType.TOUCH_START,this.touchStart,this);
        input.on(Input.EventType.TOUCH_MOVE,this.touchMove,this);
        input.on(Input.EventType.TOUCH_END,this.touchEnd,this);
        input.on(Input.EventType.TOUCH_CANCEL,this.touchCancel,this);
        game.on(Game.EVENT_HIDE,this.hide,this);game.on(Game.EVENT_SHOW,this.show,this);
        view.on('canvas-resize',this.resize,this);
        if(typeof window!=='undefined'&&typeof document!=='undefined'){
            window.addEventListener('resize',this.syncViewport);
            window.visualViewport?.addEventListener('resize',this.syncViewport);
            window.visualViewport?.addEventListener('scroll',this.syncViewport);
            this.syncViewport();
        }
        this.api.connect().then(w=>this.setWorld(w)).catch(e=>this.hud.connectionError(e.message));
        this.schedule(this.refresh,2);
        console.info('[Mossvale 3D] Cocos street ready: original models, twelve residents, client contains no provider credentials.');
    }
    private createHud(){
        this.hud=new TownHud(this.node,{send:(kind,message)=>this.interact(kind,message),close:()=>this.close(),control:a=>this.control(a)},this.street.layout);
    }

    private setupLighting(){
        const n=new Node('Afternoon sunlight');n.parent=this.node;n.setRotationFromEuler(-48,-32,0);
        const light=n.addComponent(DirectionalLight);light.color=new Color(255,241,215);light.illuminance=48000;
        const ambient=this.node.scene.globals.ambient;
        ambient.skyColor=new Vec4(.67,.76,.61,1);ambient.skyIllum=26000;ambient.groundAlbedo=new Vec4(.52,.57,.4,1);
    }
    private keyDown(e:EventKeyboard){if(e.keyCode===KeyCode.ESCAPE){this.hud.closeContext();this.close();}}
    private hide(){this.active=false;this.gesture=null;}
    private show(){this.active=true;this.refresh();}
    private residentAt(x:number,y:number){
        const named=this.hud.nameAt(x,y);if(named)return named;
        let best='',distance=Infinity;
        for(const a of this.neighbours){
            const p=a.root.position.clone();p.y+=1;
            this.camera.convertToUINode(p,this.hud.canvas,p);
            const d=Math.hypot(x-p.x,(y-p.y)*.7);
            if(Math.abs(x-p.x)<25&&Math.abs(y-p.y)<42&&d<distance){best=a.id;distance=d;}
        }
        return best;
    }
    private placeAt(x:number,y:number){
        return this.hud.landmarks.find(l=>l.node.active&&Math.abs(x-l.node.position.x)<48&&Math.abs(y-l.node.position.y)<25)?.id||'';
    }
    private touchStart(e:EventTouch){
        if(this.gesture){this.gesture.moved=true;return;}
        if(e.getAllTouches().length>1||this.hud.modalOpen)return;
        const ui=e.getUILocation(),x=ui.x-this.hud.width/2,y=ui.y-this.hud.height/2;
        const conversation=this.hud.conversationAt(x,y);
        if(!conversation&&this.hud.blocks(x,y))return;
        const touch=e.getLocation(),ray=this.camera.screenPointToRay(touch.x,touch.y);
        if(Math.abs(ray.d.y)<.001)return;
        const t=-ray.o.y/ray.d.y,point=new Vec3(ray.o.x+ray.d.x*t,0,ray.o.z+ray.d.z*t);
        this.gesture={id:e.getID(),x,y,started:Date.now(),point,resident:conversation||this.residentAt(x,y),place:this.placeAt(x,y),contextOnly:!!conversation,moved:false,held:false};
    }
    private touchMove(e:EventTouch){
        const g=this.gesture;if(!g||g.id!==e.getID())return;
        const p=e.getUILocation();if(Math.hypot(p.x-this.hud.width/2-g.x,p.y-this.hud.height/2-g.y)>12)g.moved=true;
    }
    private touchCancel(){this.gesture=null;}
    private touchEnd(e:EventTouch){
        const g=this.gesture;if(!g||g.id!==e.getID())return;this.gesture=null;
        if(g.moved||g.held)return;
        if(Date.now()-g.started>=550){this.context(g);return;}
        if(g.contextOnly){this.hud.advanceSpeech();return;}
        if(g.resident)this.select(g.resident);else if(g.place)this.visit(g.place);else this.walkTo(g.point);
    }
    private context(g:TouchIntent){
        g.held=true;this.route=[];this.approach='';this.pendingAction='chat';
        this.hud.destination.active=false;
        if(g.resident){
            const id=g.resident,name=this.state?.residents.find(r=>r.id===id)?.name||'邻居';
            this.hud.showContext(g.x,g.y,name,[
                {label:'聊聊',icon:'chat',run:()=>this.select(id)},
                {label:'一起做',icon:'help',run:()=>this.select(id,'join')},
                {label:'一起喝茶',icon:'tea',run:()=>this.select(id,'invite')},
                {label:'送点心',icon:'gift',cost:'10 币',run:()=>this.select(id,'gift')},
                {label:'回忆',icon:'memory',run:()=>this.select(id,'memory')}
            ]);
        }else if(g.place){const p=this.street.layout.places.find(p=>p.id===g.place)!;this.hud.showContext(g.x,g.y,p.short,[
            {label:p.label,icon:p.icon,cost:p.cost?`${p.cost} 币`:undefined,run:()=>this.visit(p.id)},
            {label:'走过去',icon:'walk',run:()=>this.walkTo(new Vec3(p.x,0,p.z))},
            {label:'手记',icon:'journal',run:()=>this.hud.toggleJournal()}
        ]);
        }else this.hud.showContext(g.x,g.y,'在这里',[
            {label:'走这里',icon:'walk',run:()=>this.walkTo(g.point)},
            {label:'手记',icon:'journal',run:()=>this.hud.toggleJournal()},
            {label:this.overview?'回到身边':'看看全镇',icon:'map',run:()=>{this.overview=!this.overview;}},
            {label:'歇一小时',icon:'rest',run:()=>this.control('advance')},
            {label:this.state?.weather==='rain'?'等雨停':'来场雨',icon:'rain',run:()=>this.control('weather')}
        ]);
    }
    private walkTo(point:Vec3){
        this.close();this.approachPlace='';this.playerWork='';this.overview=false;this.route=this.path(this.player.root.position,point);
        if(this.route.length)this.destination.set(this.route[this.route.length-1]);
        else if(Vec3.distance(this.player.root.position,point)>1)this.hud.toast('这里过不去，试试旁边的小路。');
    }
    private visit(id:string){
        if(this.busy)return;const p=this.street.layout.places.find(p=>p.id===id);if(!p)return;
        this.walkTo(new Vec3(p.x,0,p.z));this.approachPlace=id;
    }
    private async perform(place:string,resident=''){
        if(this.busy||!this.state)return;this.busy=true;
        try{const p=this.player.root.position;await this.api.presence(p.x,p.z,resident);const result=await this.api.activity(place,resident);this.setWorld(result.world);if(resident)this.hud.showReply(result.result.speech);else this.hud.toast(result.result.speech);this.playerWork=this.street.layout.places.find(p=>p.id===place)?.activity||'';this.playerWorkUntil=this.elapsed+4;}
        catch(e){this.hud.toast((e as Error).message);}finally{this.busy=false;}
    }
    private select(id:string,action='chat'){
        if(this.busy){this.hud.toast('等这位邻居说完，再去找其他人吧。');return;}
        const npc=this.street.actors.find(a=>a.id===id);
        if(!npc)return;
        if(!this.state){this.hud.toast('暂时联系不上邻居，可以先四处走走。');this.refresh();return;}
        this.close();this.overview=false;this.pendingAction=action;
        if(Vec3.distance(npc.root.position,this.player.root.position)>2.7){
            const dest=npc.root.position.clone();dest.z+=1.6;
            this.route=this.path(this.player.root.position,dest);this.approach=id;
            if(this.route.length)this.destination.set(this.route[this.route.length-1]);
        }else this.open(id);
    }
    private open(id:string){
        const r=this.state?.residents.find(r=>r.id===id);if(!r)return;
        const action=this.pendingAction;this.pendingAction='chat';
        this.selected=id;this.route=[];this.approach='';this.hud.showResident(r);
        const a=this.street.actors.find(a=>a.id===id)!;this.face(a,this.player.root.position);this.face(this.player,a.root.position);
        if(action==='memory')this.hud.showMemory();else if(action==='join')void this.perform(r.location,id);else if(action!=='chat')void this.interact(action);
    }
    private close(){this.selected='';this.approach='';this.approachPlace='';this.pendingAction='chat';this.hud.closeCard();}
    private setWorld(w:TownState){
        if(this.state&&w.revision<this.state.revision)return;this.state=w;this.snapshotAt=this.elapsed;this.hud.setState(w);
        if(!this.positioned){for(const a of this.neighbours){const r=w.residents.find(r=>r.id===a.id);if(r?.life)a.root.setPosition(r.life.x,0,r.life.z);}if(w.player&&this.street.valid(w.player.x,w.player.z))this.player.root.setPosition(w.player.x,0,w.player.z);this.positioned=true;}
        for(const a of this.neighbours){const l=w.residents.find(r=>r.id===a.id)?.life;if(l&&Math.hypot(a.root.position.x-l.x,a.root.position.z-l.z)>2.5)this.npcRoutes[a.id]=this.path(a.root.position,new Vec3(l.x,0,l.z));}
    }
    private refresh=async()=>{
        if(this.polling||this.busy||!this.active)return;this.polling=true;
        try{if(this.state){const p=this.player.root.position;await this.api.presence(p.x,p.z,this.selected||this.approach).catch(()=>{});}this.setWorld(await this.api.world());}catch(e){this.hud.connectionError((e as Error).message);}finally{this.polling=false;}
    };
    private async interact(kind:string,message=''){
        if(!this.selected||this.busy)return;
        const id=this.selected;this.busy=true;this.hud.setWaiting(true);
        try{
            const result=await this.api.interact(id,kind,message);this.setWorld(result.world);
            if(this.selected===id)this.hud.showReply(result.result.speech);
            if(result.result.notice)this.hud.toast('暂时只能简单回应，稍后再聊。');
            
        }catch(e){if(this.selected===id)this.hud.messageFailed();}
        finally{this.busy=false;this.hud.setWaiting(false);}
    }
    private async control(action:string){
        if(this.busy)return;this.busy=true;
        try{const r=await this.api.control(action,60);this.setWorld(r.world);this.hud.toast(action==='advance'?'一小时过去了。':action==='attend'?'说好了，下午茶见。':'已经记下了。');}
        catch(e){this.hud.toast('这次没能完成，稍后再试。');}finally{this.busy=false;}
    }
    /** Small A* grid checks the same collision map used by manual movement. */
    private path(from:Vec3,to:Vec3){
        const cell=.55,{minX,minZ,maxX,maxZ}=this.street.layout.bounds,cols=Math.floor((maxX-minX)/cell)+1,rows=Math.floor((maxZ-minZ)/cell)+1;
        const point=(i:number)=>new Vec3(minX+(i%cols)*cell,0,minZ+Math.floor(i/cols)*cell);
        const index=(p:Vec3)=>Math.max(0,Math.min(rows-1,Math.round((p.z-minZ)/cell)))*cols+Math.max(0,Math.min(cols-1,Math.round((p.x-minX)/cell)));
        const start=index(from);let end=index(to);
        if(!this.street.valid(point(end).x,point(end).z)){
            let best=Infinity;
            for(let i=0;i<rows*cols;i++){const p=point(i),d=Vec3.distance(p,to);if(d<best&&this.street.valid(p.x,p.z)){end=i;best=d;}}
            if(best>2.3)return [];
        }
        const open=[start],closed=new Set<number>(),cost=new Map([[start,0]]),parents=new Map<number,number>();
        const heuristic=(a:number)=>Math.abs(a%cols-end%cols)+Math.abs(Math.floor(a/cols)-Math.floor(end/cols));
        let found=false;
        while(open.length&&closed.size<rows*cols){
            open.sort((a,b)=>(cost.get(a)!+heuristic(a))-(cost.get(b)!+heuristic(b)));
            const current=open.shift()!;if(current===end){found=true;break;}closed.add(current);
            for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){
                const cx=current%cols+dx,cz=Math.floor(current/cols)+dz;
                if(cx<0||cx>=cols||cz<0||cz>=rows)continue;
                const next=cz*cols+cx,p=point(next);if(closed.has(next)||!this.street.valid(p.x,p.z))continue;
                const g=cost.get(current)!+1;if(g>=(cost.get(next)??Infinity))continue;
                cost.set(next,g);parents.set(next,current);if(!open.includes(next))open.push(next);
            }
        }
        if(!found)return [];
        const result:Vec3[]=[];let k=end;
        while(k!==start){result.unshift(point(k));const p=parents.get(k);if(p===undefined)return [];k=p;}
        return result;
    }
    private face(a:Actor,target:Vec3){const dx=target.x-a.root.position.x,dz=target.z-a.root.position.z;if(dx*dx+dz*dz>.001)a.root.setRotationFromEuler(0,Math.atan2(dx,dz)*180/Math.PI,0);}
    private move(a:Actor,dir:Vec3,dt:number,speed:number){
        if(dir.lengthSqr()<.001)return 0;dir.normalize();const p=a.root.position;
        let x=p.x+dir.x*dt*speed,z=p.z+dir.z*dt*speed;
        if(!this.street.valid(x,p.z))x=p.x;if(!this.street.valid(x,z))z=p.z;
        const d=Math.hypot(x-p.x,z-p.z);if(d>.001){a.root.setRotationFromEuler(0,Math.atan2(x-p.x,z-p.z)*180/Math.PI,0);a.root.setPosition(x,0,z);}return d/dt;
    }
    update(dt:number){
        if(!this.street||!this.hud)return;dt=Math.min(dt,.06);this.elapsed+=dt;this.hud.tick(dt);
        const gesture=this.gesture;
        this.hud.holdAt(gesture?.x||0,gesture?.y||0,gesture&&!gesture.moved&&!gesture.held?(Date.now()-gesture.started)/550:0);
        if(gesture&&!gesture.moved&&!gesture.held&&Date.now()-gesture.started>=550)this.context(gesture);
        const blocked=!!this.gesture||this.hud.modalOpen;
        let speed=0;
        if(!this.selected&&!blocked){
            if(this.route.length){
                const target=this.route[0],delta=Vec3.subtract(this.moveDelta,target,this.player.root.position);
                if(delta.length()<.13)this.route.shift();else speed=this.move(this.player,delta,dt,3.3);
            }
            if(this.approach){const a=this.street.actors.find(a=>a.id===this.approach)!;
                if(Vec3.distance(a.root.position,this.player.root.position)<2.7)this.open(this.approach);
                else if(!this.route.length||this.elapsed-this.repathAt>2){this.repathAt=this.elapsed;this.route=this.path(this.player.root.position,a.root.position);}}
            if(this.approachPlace&&!this.route.length){const id=this.approachPlace;this.approachPlace='';void this.perform(id);}
        }
        this.street.animate(this.player,dt,speed,this.elapsed<this.playerWorkUntil?this.playerWork:'');
        for(const a of this.neighbours){
            const r=this.state?.residents.find(r=>r.id===a.id),l=r?.life;let v=0;
            if(l){
                // Predict only the already approved path between snapshots, never invent a destination.
                const target=this.npcPoint.set(l.x,0,l.z);let remaining=this.state!.paused?0:Math.min(2.2,Math.max(0,this.elapsed-this.snapshotAt))*.475*(this.state!.speed||1);
                if(l.phase==='walking')for(const q of l.route){const d=Math.hypot(q.x-target.x,q.z-target.z);if(d<=remaining){target.set(q.x,0,q.z);remaining-=d;}else{if(d>.001){target.x+=(q.x-target.x)/d*remaining;target.z+=(q.z-target.z)/d*remaining;}break;}}
                const catchup=this.npcRoutes[a.id];if(catchup?.length){target.set(catchup[0]);if(Vec3.distance(a.root.position,target)<.12)catchup.shift();}
                const delta=Vec3.subtract(this.moveDelta,target,a.root.position),distance=delta.length();
                if(distance>.03)v=this.move(a,delta,dt,Math.min(4,distance/dt));
                if(l.phase==='social'&&l.socialWith){const other=this.neighbours.find(n=>n.id===l.socialWith);if(other)this.face(a,other.root.position);}
                if(a.id===this.selected)this.face(a,this.player.root.position);
            }
            this.street.animate(a,dt,v,l?.phase==='social'?'social':l?.activity);
        }
        const follow=this.followPoint.set(this.player.root.position);
        if(this.selected){const speaker=this.street.actors.find(a=>a.id===this.selected)!;Vec3.lerp(follow,follow,speaker.root.position,.45);follow.y+=Math.max(0,(760-this.hud.height)*.0125);}else follow.z+=1.1;
        const target=this.overview?this.overviewTarget:follow;
        if(Vec3.squaredDistance(this.cameraTarget,target)>1e-8){
            Vec3.lerp(this.cameraTarget,this.cameraTarget,target,1-Math.exp(-dt*2));
            const off=this.cameraPosition.set(this.cameraTarget.x+17,this.cameraTarget.y+25,this.cameraTarget.z+30);
            this.camera.node.setPosition(off);this.camera.node.lookAt(this.cameraTarget);
        }
        const desired=(this.overview?14:this.selected?4.2:4.9)/(this.hud.width/this.hud.height);
        if(Math.abs(desired-this.camera.orthoHeight)>.0001)this.camera.orthoHeight+=(desired-this.camera.orthoHeight)*(1-Math.exp(-dt*3));
        this.hud.destination.active=this.route.length>0&&!this.selected&&!blocked;
        if(this.hud.destination.active){const p=this.projectedPoint.set(this.destination);p.y=.2;this.camera.convertToUINode(p,this.hud.canvas,p);this.hud.destination.setPosition(p.x,p.y,0);}
        let ambientShown=false;
        for(const a of this.neighbours){
            const n=this.hud.nameplates[a.id],p=this.projectedPoint.set(a.root.position);p.y+=a.id==='xu'?2.45:2.18;
            this.camera.convertToUINode(p,this.hud.canvas,p);if(Math.abs(n.position.x-p.x)>.05||Math.abs(n.position.y-p.y)>.05)n.setPosition(p.x,p.y,0);n.active=a.id!==this.selected&&!this.overview&&Vec3.distance(a.root.position,this.player.root.position)<4.8&&Math.abs(p.x)<this.hud.width/2-43&&p.y<this.hud.height/2-this.hud.topInset-78&&p.y>-this.hud.height/2+this.hud.bottomInset+26;
            const r=this.state?.residents.find(r=>r.id===a.id),ambient=this.hud.ambient[a.id];
            ambient.node.active=!ambientShown&&!!r?.life&&r.life.speechUntil>this.state!.minute&&n.active&&!this.selected&&!this.hud.modalOpen;
            if(ambient.node.active){ambientShown=true;const text=r!.life!.speech;if(ambient.label.string!==text)ambient.label.string=text;ambient.node.setPosition(Math.max(-105,Math.min(105,p.x)),p.y+40,0);}
            if(a.id===this.selected)this.hud.anchorSpeech(p.x,p.y);
        }
        for(const l of this.hud.landmarks){const p=this.projectedPoint;this.camera.convertToUINode(l.world,this.hud.canvas,p);l.node.setPosition(p.x,p.y,0);l.node.active=!this.selected&&!this.hud.modalOpen&&(this.overview||Vec3.distance(l.world,this.player.root.position)<7)&&Math.abs(p.x)<this.hud.width/2-62&&p.y<this.hud.height/2-this.hud.topInset-106&&p.y>-this.hud.height/2+this.hud.bottomInset+26;}
    }
    onDestroy(){
        input.off(Input.EventType.KEY_DOWN,this.keyDown,this);
        input.off(Input.EventType.TOUCH_START,this.touchStart,this);input.off(Input.EventType.TOUCH_MOVE,this.touchMove,this);
        input.off(Input.EventType.TOUCH_END,this.touchEnd,this);input.off(Input.EventType.TOUCH_CANCEL,this.touchCancel,this);game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);
        view.off('canvas-resize',this.resize,this);
        if(typeof window!=='undefined'){
            window.removeEventListener('resize',this.syncViewport);
            window.visualViewport?.removeEventListener('resize',this.syncViewport);
            window.visualViewport?.removeEventListener('scroll',this.syncViewport);
            if(this.viewportFrame)cancelAnimationFrame(this.viewportFrame);
        }
        this.hud?.destroy();
    }
}
