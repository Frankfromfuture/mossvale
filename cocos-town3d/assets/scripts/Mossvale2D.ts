import { _decorator, Component, Node, UITransform, Sprite, SpriteFrame, Texture2D, Rect, Size, Graphics, Color, Vec3, input, Input, EventTouch, EventKeyboard, KeyCode, view, game, Game, Layers, screen, resources, JsonAsset, Camera, Label, DirectionalLight, Vec4, geometry } from 'cc';
import { TownApi, TownState } from './TownApi';
import { TownHud } from './TownHud';
import { TownLayout, ObjectCatalog, ObjectEntity } from './Layout';
import { ObjectScene, actionLabels, actionIcons } from './ObjectScene';
import {CharacterLibrary,Avatar} from './CharacterLibrary';
const { ccclass } = _decorator;
type Point={x:number;z:number};
type Pawn={id:string;node:Node;body:Node;avatar:Avatar;appearance:number;direction:number;frame:string;x:number;z:number;phase:number;route:Point[];target:Point};
type Gesture={id:number;x:number;y:number;dx:number;dy:number;at:number;moved:boolean;held:boolean;resident:string;place:string;object:string;conversation:boolean};
type ViewGesture={ids:number[];x:number;y:number;distance:number};
const SCALE=32;
const ZOOM_LEVELS=[.5,.75,1,1.25,1.5,1.75,2];
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

/** Independent 3D presentation of the complete server-validated living town. */
@ccclass('Mossvale')
export class MossvaleLiving3D extends Component {
    private hud!:TownHud;private layout!:TownLayout;private world!:Node;private player!:Pawn;
    private objects!:ObjectScene;private obstacles:{id?:string;x:number;z:number;w:number;d:number}[]=[];
    private pendingObject:{id:string;action:string}|null=null;private placementId='';
    private economicRequest:{key:string;id:string;revision:number}|null=null;
    private objectRequest:{key:string;id:string;revision:number}|null=null;
    private characters=new CharacterLibrary();private camera!:Camera;private projected=new Vec3();private lastCamera='';
    private actors:Pawn[]=[];private api=new TownApi();private state:TownState|null=null;
    private residentCache:TownState['residents']=[];private selected='';private approach='';private place='';private action='chat';
    private gesture:Gesture|null=null;private route:Point[]=[];private cameraX=0;private cameraZ=0;
    private zoom=.8;private manualView=false;private multiTouch=false;private viewGesture:ViewGesture|null=null;
    private gestureCanvas:HTMLElement|null=null;private safariGesture:{x:number;y:number;scale:number}|null=null;
    private polling=false;private busy=false;private active=true;private entered=false;private positioned=false;
    private elapsed=0;private snapshotAt=0;private repathAt=0;private resized=0;
    private cols=0;private rows=0;private grid=new Uint8Array(0);private parents=new Int32Array(0);private queue=new Int32Array(0);
    private destination:Point|null=null;private reduceMotion=!!(globalThis as any).matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    async start(){
        game.frameRate=60;
        const load=<T>(name:string,type:any)=>new Promise<T>((resolve,reject)=>resources.load(name,type,(e:any,a:any)=>e?reject(e):resolve(a)));
        try{
            const [json,catalog]=await Promise.all([load<JsonAsset>('town-layout',JsonAsset),load<JsonAsset>('object-catalog',JsonAsset),this.characters.load()]);
            if(!this.node.isValid)return;
            this.layout=json.json as TownLayout;
            this.hud=new TownHud(this.node,{send:(kind,message)=>this.interact(kind,message),close:()=>this.close(),control:a=>this.control(a),navigate:id=>this.visit(id),zoom:direction=>this.changeZoom(direction),economy:(action,payload)=>void this.economyCommand(action,payload),placeObject:id=>this.beginPlacement(id)},this.layout);
            this.world=new Node('Living village');this.world.parent=this.node;
            this.objects=new ObjectScene(this.world,catalog.json as ObjectCatalog,this.layout);this.obstacles=this.objects.obstacles();this.layout.obstacles=this.obstacles;this.prepareGrid();
            const lightNode=new Node('Warm afternoon');lightNode.parent=this.node;lightNode.setRotationFromEuler(-52,-34,0);const light=lightNode.addComponent(DirectionalLight);light.color=new Color(255,239,212);light.illuminance=37000;
            const ambient=this.node.scene.globals.ambient;ambient.skyColor=new Vec4(.75,.82,.72,1);ambient.skyIllum=22000;ambient.groundAlbedo=new Vec4(.52,.58,.43,1);
            const cameraNode=new Node('Oblique town camera');cameraNode.parent=this.node;this.camera=cameraNode.addComponent(Camera);this.camera.projection=Camera.ProjectionType.PERSPECTIVE;this.camera.fov=46;this.camera.near=.2;this.camera.far=160;this.camera.visibility=Layers.Enum.DEFAULT;this.camera.clearColor=new Color().fromHEX('#D9E5D0');
            this.player=this.pawn('player','A1',this.layout.spawn);
            for(const a of this.layout.actors){const p=this.layout.places.find(p=>p.id===a.place)!;this.actors.push(this.pawn(a.id,a.code||a.id,p));}
            this.cameraX=this.player.x;this.cameraZ=this.player.z;this.syncCamera();
            input.on(Input.EventType.TOUCH_START,this.touchStart,this);input.on(Input.EventType.TOUCH_MOVE,this.touchMove,this);input.on(Input.EventType.TOUCH_END,this.touchEnd,this);input.on(Input.EventType.TOUCH_CANCEL,this.touchCancel,this);
            input.on(Input.EventType.KEY_DOWN,this.keyDown,this);game.on(Game.EVENT_HIDE,this.hide,this);game.on(Game.EVENT_SHOW,this.show,this);
            this.installViewGestures();
            view.on('canvas-resize',this.relayout,this);
            if(typeof window!=='undefined'){window.addEventListener('resize',this.syncViewport);window.visualViewport?.addEventListener('resize',this.syncViewport);window.visualViewport?.addEventListener('scroll',this.syncViewport);this.syncViewport();}
            void this.refresh();this.schedule(this.refresh,2);
        }catch(e){console.error('3D town could not load',e);if(this.hud)this.hud.toast('小镇素材加载失败，请刷新重试。');}
    }
    private ui(name:string,parent:Node,w=1,h=1){const n=new Node(name);n.parent=parent;n.layer=Layers.Enum.UI_2D;n.addComponent(UITransform).setContentSize(w,h);return n;}
    private pawn(id:string,code:string,p:Point):Pawn{
        const appearance=code[0]==='A'?Math.max(0,Number(code.slice(1))-1):code[0]==='B'?8+Number(code.slice(1)):17;
        const avatar=this.characters.create(id,appearance,this.objects),node=avatar.root;node.setPosition(p.x,0,p.z);
        return {id,node,body:avatar.body,avatar,appearance,direction:2,frame:'',x:p.x,z:p.z,phase:0,route:[],target:{x:p.x,z:p.z}};
    }
    private valid(x:number,z:number){const b=this.layout.bounds;return Number.isFinite(x)&&Number.isFinite(z)&&x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ&&!this.obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.49&&Math.abs(z-o.z)<o.d/2+.49);}
    private prepareGrid(){const b=this.layout.bounds;this.cols=b.maxX-b.minX;this.rows=b.maxZ-b.minZ;const count=this.cols*this.rows;this.grid=new Uint8Array(count);this.parents=new Int32Array(count);this.queue=new Int32Array(count);for(let i=0;i<count;i++)this.grid[i]=this.valid(b.minX+.5+i%this.cols,b.minZ+.5+Math.floor(i/this.cols))?1:0;}
    private path(from:Point,to:Point):Point[]{
        const b=this.layout.bounds,cols=this.cols,rows=this.rows;const point=(i:number)=>({x:b.minX+.5+i%cols,z:b.minZ+.5+Math.floor(i/cols)});
        const nearest=(p:Point)=>{let id=-1,d=Infinity;for(let i=0;i<this.grid.length;i++){if(!this.grid[i])continue;const q=point(i),v=(p.x-q.x)**2+(p.z-q.z)**2;if(v<d){id=i;d=v;}}return {id,d};};
        const start=nearest(from).id,end=nearest(to);if(start<0||end.id<0||end.d>2.3**2)return [];
        this.parents.fill(-2);this.parents[start]=-1;this.queue[0]=start;let tail=1;
        for(let head=0;head<tail;head++){const curr=this.queue[head];if(curr===end.id)break;const x=curr%cols,z=Math.floor(curr/cols);for(let d=0;d<4;d++){const nx=x+(d===0?1:d===1?-1:0),nz=z+(d===2?1:d===3?-1:0),next=nz*cols+nx;if(nx<0||nx>=cols||nz<0||nz>=rows||!this.grid[next]||this.parents[next]!==-2)continue;this.parents[next]=curr;this.queue[tail++]=next;}}
        if(this.parents[end.id]===-2)return [];const result:Point[]=[];for(let k=end.id;k!==start;k=this.parents[k])result.push(point(k));result.reverse();if(this.valid(to.x,to.z))result.push({x:to.x,z:to.z});return result;
    }
    private walk(p:Point){this.manualView=false;this.close();p={x:Math.floor(p.x)+.5,z:Math.floor(p.z)+.5};this.route=this.path(this.player,p);this.destination=this.route.at(-1)||null;if(!this.route.length)this.hud.toast('换一个落脚的地方吧。');}
    private select(id:string,action='chat'){if(this.busy)return;this.manualView=false;this.close();this.action=action;this.approach=id;const a=this.actors.find(a=>a.id===id);if(a)this.route=this.path(this.player,a);}
    private open(id:string){const r=this.people().find(r=>r.id===id);if(!r){this.hud.toast('邻居还没到，稍等一会儿。');return;}this.selected=id;this.approach='';this.route=[];this.destination=null;this.hud.showResident(r);const a=this.action;this.action='chat';if(a==='memory')this.hud.showMemory();else if(a==='join')void this.perform(r.location,id);else if(a!=='chat')void this.interact(a);}
    private close(){if(!this.hud)return;this.pendingObject=null;this.cancelPlacement();this.objects?.highlight('');this.selected='';this.approach='';this.place='';this.action='chat';this.hud.closeCard();}
    private visit(id:string){if(this.busy)return;const p=this.layout.places.find(p=>p.id===id);if(!p)return;this.walk(p);this.place=id;}
    private async perform(place:string,resident=''){if(this.busy)return;if(place==='hotel'&&this.state?.economy){this.hud.economy.show('hotel');return;}this.busy=true;try{await this.api.presence(this.player.x,this.player.z,resident);const r=await this.api.activity(place,resident);this.setWorld(r.world);if(resident&&this.selected===resident)this.hud.showReply(r.result.speech);else this.hud.toast(r.result.speech);}catch(e){this.hud.toast((e as Error).message);}finally{this.busy=false;}}
    private async interact(kind:string,message=''){
        if(!this.selected||this.busy)return;const id=this.selected;this.busy=true;this.hud.setWaiting(true);
        try{await this.api.presence(this.player.x,this.player.z,id);const person=this.people().find(r=>r.id===id);let r;
            if(person?.visitor){const requestId=this.commandRequest('visitor:'+id+':'+message);try{r=await this.api.visitorInteract(id,message,this.economicRequest!.revision,requestId);}catch(e){if((e as Error).message!=='经营情况刚有变化，请再试一次')throw e;this.setWorld(await this.api.world());this.economicRequest!.revision=this.state!.economy!.revision;r=await this.api.visitorInteract(id,message,this.economicRequest!.revision,requestId);}}
            else r=await this.api.interact(id,kind,message);this.economicRequest=null;this.setWorld(r.world);if(id===this.selected)this.hud.showReply(r.result.speech);if(r.result.notice)this.hud.toast('暂时只能简单回应，稍后再聊。');}
        catch(e){if((e as any).status===400)this.economicRequest=null;if(id===this.selected)this.hud.messageFailed();this.hud.toast((e as Error).message);}finally{this.busy=false;this.hud.setWaiting(false);}
    }
    private reachable(o:ObjectEntity,p:Point){
        if(this.objects.distance(p.x,p.z,o)>o.range)return false;const skipped=new Set([o.id]);let parent=o.parentId;while(parent&&!skipped.has(parent)){skipped.add(parent);parent=this.objects.entities.get(parent)?.parentId||null;}
        const distance=Math.hypot(o.x-p.x,o.z-p.z),steps=Math.max(1,Math.ceil(distance/.2));
        for(let i=1;i<steps;i++){const x=p.x+(o.x-p.x)*i/steps,z=p.z+(o.z-p.z)*i/steps;if(this.obstacles.some(r=>!skipped.has(r.id!)&&Math.abs(x-r.x)<r.w/2+.03&&Math.abs(z-r.z)<r.d/2+.03))return false;}return true;
    }
    private people(){return this.residentCache;}
    private commandRequest(key:string){if(this.economicRequest?.key!==key)this.economicRequest={key,id:Date.now().toString(36)+'_'+Math.random().toString(36).slice(2),revision:this.state!.economy!.revision};return this.economicRequest.id;}
    private async economyCommand(action:string,payload:Record<string,unknown>={}){
        if(this.busy||!this.state?.economy)return;this.busy=true;const key=action+JSON.stringify(payload),requestId=this.commandRequest(key);
        try{let result;try{result=await this.api.economyAction(action,payload,this.economicRequest!.revision,requestId);}catch(e){if((e as Error).message!=='经营情况刚有变化，请再试一次')throw e;this.setWorld(await this.api.world());this.economicRequest!.revision=this.state!.economy!.revision;result=await this.api.economyAction(action,payload,this.economicRequest!.revision,requestId);}this.economicRequest=null;this.setWorld(result.world);this.hud.toast(result.result.speech);if(action==='job'){this.hud.economy.close();this.route=[];this.destination=null;}if(action==='buy'&&result.result.objectId)this.hud.economy.show('warehouse');}
        catch(e){if((e as any).status===400)this.economicRequest=null;this.hud.toast((e as Error).message);try{this.setWorld(await this.api.world());}catch{}}finally{this.busy=false;}
    }
    private objectMenu(o:ObjectEntity,x:number,y:number){
        this.close();this.objects.highlight(o.id);
        this.hud.showContext(x,y,`${o.code||'='} ${o.name}`,[{label:'看看',icon:'memory',run:()=>this.hud.showObjectDetails(`${o.code||'='} ${o.name}`,this.objects.details(this.objects.entities.get(o.id)!,this.state?.inventory as any))},...(o.owner==='村长'?['move','rotate','pack','clean'].filter(a=>o.actions.includes(a)):o.actions.slice(0,4)).map(action=>({label:action==='toggle'&&o.defId==='door'?(o.state.open?'关门':'开门'):actionLabels[action]||action,icon:actionIcons[action]||'help',run:()=>this.chooseObject(o.id,action)}))]);
    }
    private chooseObject(id:string,action:string){
        if(this.busy)return;this.manualView=false;if(id==='hotel-frontdesk'&&this.state?.economy&&action==='clean'){this.hud.economy.show('hotel');return;}this.close();this.route=[];this.destination=null;this.objects.highlight(id);this.pendingObject={id,action};this.planObjectApproach();
    }
    private planObjectApproach(){
        const pending=this.pendingObject;if(!pending)return;const o=this.objects.entities.get(pending.id);if(!o||o.state.removed){this.pendingObject=null;return;}
        if(this.reachable(o,this.player)){this.route=[];return;}
        const b=this.layout.bounds,candidates:Point[]=[];
        for(let i=0;i<this.grid.length;i++){if(!this.grid[i])continue;const p={x:b.minX+.5+i%this.cols,z:b.minZ+.5+Math.floor(i/this.cols)};if(this.reachable(o,p))candidates.push(p);}
        candidates.sort((a,b)=>Math.hypot(a.x-this.player.x,a.z-this.player.z)-Math.hypot(b.x-this.player.x,b.z-this.player.z));
        for(const p of candidates){const route=this.path(this.player,p);if(route.length){this.route=route;this.destination=p;return;}}
        this.pendingObject=null;this.route=[];this.hud.toast('通路被挡住了，先看看门和家具吧。');
    }
    private beginPlacement(id:string){this.close();this.placementId=id;this.route=[];this.destination=null;const o=this.objects.entities.get(id)!;this.objects.preview(id,o.x,o.z);this.hud.setPlacement(true,()=>this.cancelPlacement());}
    private cancelPlacement(){this.placementId='';this.objects?.hidePreview();this.hud?.setPlacement(false);}
    private async commitObject(id:string,action:string,point?:Point){
        if(this.busy)return;const o=this.objects.entities.get(id);if(!o)return;this.busy=true;
        if(point&&action==='move')point=this.objects.placementPoint(id,point.x,point.z);
        const key=`${id}:${action}:${point?.x??''}:${point?.z??''}`;
        if(this.objectRequest?.key!==key)this.objectRequest={key,id:Date.now().toString(36)+'_'+Math.random().toString(36).slice(2),revision:o.revision};
        try{await this.api.presence(this.player.x,this.player.z);const result=await this.api.objectAction(id,action,this.objectRequest.revision,this.objectRequest.id,point);
            if(result.result.playerMoved&&result.world.player){this.player.x=result.world.player.x;this.player.z=result.world.player.z;}
            this.setWorld(result.world);this.objectRequest=null;this.cancelPlacement();this.hud.toast(result.result.speech);
        }catch(e){if((e as any).status===400)this.objectRequest=null;this.hud.toast((e as Error).message);try{this.setWorld(await this.api.world());}catch{}}
        finally{this.busy=false;}
    }
    private async control(action:string){if(this.busy)return;this.busy=true;try{const r=await this.api.control(action,60);this.setWorld(r.world);this.hud.toast(action==='speed'?`时间速度 ×${r.world.speed}`:action==='pause'?(r.world.paused?'小镇已暂停':'小镇继续生活'):'已经记下了。');}catch(e){this.hud.toast((e as Error).message);}finally{this.busy=false;}}
    private setWorld(w:TownState){
        if(this.state&&w.revision<this.state.revision)return;const hadState=!!this.state;const working=this.state?.economy?.playerWorking;const previousReview=this.state?.economy?.hotel.reviews.at(-1)?.id;this.state=w;this.residentCache=[...w.residents,...(w.visitors||[])];this.snapshotAt=this.elapsed;this.hud.setState(w);
        if(w.objectWorld&&this.objects.apply(w.objectWorld)){this.obstacles=this.objects.obstacles();this.layout.obstacles=this.obstacles;this.prepareGrid();if(this.pendingObject)this.planObjectApproach();else if(this.destination)this.route=this.path(this.player,this.destination);}
        const people=this.people(),ids=new Set(people.map(r=>r.id));
        this.actors=this.actors.filter(a=>{if(ids.has(a.id))return true;a.node.destroy();this.hud.removePerson(a.id);if(this.selected===a.id)this.close();return false;});
        for(const r of people)if(!this.actors.some(a=>a.id===r.id)&&r.life){this.actors.push(this.pawn(r.id,r.code||r.id,r.life));this.hud.addPerson(r.id,r.name);}
        if(working||w.economy?.playerWorking){if(w.player&&(!working||!w.economy?.playerWorking||Math.hypot(this.player.x-w.player.x,this.player.z-w.player.z)>3)){this.player.x=w.player.x;this.player.z=w.player.z;}this.route=[];this.destination=null;}
        const review=w.economy?.hotel.reviews.at(-1);if(hadState&&review&&review.id!==previousReview)this.hud.toast(`${review.name}：${review.text}`);
        for(const a of this.actors){const l=people.find(r=>r.id===a.id)?.life;if(!l)continue;
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
    private changeZoom(direction:number){
        const next=direction>0?ZOOM_LEVELS.find(z=>z>this.zoom+.001):ZOOM_LEVELS.slice().reverse().find(z=>z<this.zoom-.001);
        if(next!=null)this.transformView(0,0,0,0,next/this.zoom);
    }
    private limitCamera(){const b=this.layout.bounds;this.cameraX=clamp(this.cameraX,b.minX,b.maxX);this.cameraZ=clamp(this.cameraZ,b.minZ,b.maxZ);}
    private syncCamera(){
        if(!this.camera)return;const key=[this.cameraX.toFixed(4),this.cameraZ.toFixed(4),this.zoom,this.hud.width,this.hud.height].join(':');if(key===this.lastCamera)return;this.lastCamera=key;
        // Fixed 35-degree inclination; distance changes zoom without rotating the town.
        const distance=17/this.zoom;this.camera.node.setPosition(this.cameraX,distance*.574,this.cameraZ+distance*.819);
        this.projected.set(this.cameraX,.3,this.cameraZ);this.camera.node.lookAt(this.projected);
        this.camera.fov=2*Math.atan(Math.tan(46*Math.PI/360)*(this.hud.height/844))*180/Math.PI;this.camera.camera.update(true);
    }
    private transformView(fromX:number,fromY:number,toX:number,toY:number,factor=1){
        const anchor=this.toWorld(fromX,fromY);this.zoom=clamp(this.zoom*factor,.5,2);this.syncCamera();const next=this.toWorld(toX,toY);
        this.cameraX+=anchor.x-next.x;this.cameraZ+=anchor.z-next.z;this.limitCamera();this.syncCamera();this.hud.setZoomLimits(this.zoom>.5001,this.zoom<1.9999);
    }
    private canMoveView(){return !!this.hud&&this.active&&!this.hud.modalOpen&&!this.hud.isEditing()&&!this.selected&&!this.placementId;}
    private browserPoint(e:{clientX?:number;clientY?:number}){
        const rect=this.gestureCanvas!.getBoundingClientRect();return {x:((e.clientX??rect.left+rect.width/2)-rect.left)/rect.width*this.hud.width-this.hud.width/2,y:this.hud.height/2-((e.clientY??rect.top+rect.height/2)-rect.top)/rect.height*this.hud.height};
    }
    private wheel=(e:WheelEvent)=>{
        if(!this.hud)return;e.preventDefault();if(!this.canMoveView()||this.multiTouch||this.safariGesture)return;
        const p=this.browserPoint(e);if(this.hud.blocks(p.x,p.y))return;
        const rect=this.gestureCanvas!.getBoundingClientRect(),unit=e.deltaMode===1?16:e.deltaMode===2?rect.height:1;
        this.gesture=null;this.manualView=true;
        if(e.ctrlKey||e.metaKey)this.transformView(p.x,p.y,p.x,p.y,Math.exp(clamp(-e.deltaY*unit*.008,-1,1)));
        else this.transformView(p.x,p.y,p.x-e.deltaX*unit*this.hud.width/rect.width,p.y+e.deltaY*unit*this.hud.height/rect.height);
    };
    private safariStart=(e:Event)=>{e.preventDefault();this.safariGesture=null;if(!this.canMoveView()||this.multiTouch)return;const p=this.browserPoint(e as Event&{clientX:number;clientY:number});if(this.hud.blocks(p.x,p.y))return;this.gesture=null;this.safariGesture={...p,scale:1};};
    private safariChange=(e:Event)=>{e.preventDefault();const g=this.safariGesture,scale=(e as Event&{scale:number}).scale;if(!g||this.multiTouch||!this.canMoveView()||!Number.isFinite(scale)||scale<=0)return;this.manualView=true;this.transformView(g.x,g.y,g.x,g.y,scale/g.scale);g.scale=scale;};
    private safariEnd=(e:Event)=>{e.preventDefault();this.safariGesture=null;};
    private installViewGestures(){
        if(typeof document==='undefined')return;this.gestureCanvas=document.getElementById('GameCanvas');const canvas=this.gestureCanvas;if(!canvas)return;
        canvas.addEventListener('wheel',this.wheel,{passive:false});canvas.addEventListener('gesturestart',this.safariStart,{passive:false});canvas.addEventListener('gesturechange',this.safariChange,{passive:false});canvas.addEventListener('gestureend',this.safariEnd,{passive:false});
    }
    private touchView(e:EventTouch):ViewGesture|null{
        const touches=e.getAllTouches().slice().sort((a,b)=>a.getID()-b.getID());if(touches.length<2)return null;
        const a=touches[0].getUILocation(),b=touches[1].getUILocation();return {ids:touches.slice(0,2).map(t=>t.getID()),x:(a.x+b.x)/2-this.hud.width/2,y:(a.y+b.y)/2-this.hud.height/2,distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};
    }
    private screenPoint(p:Point,height=0){this.projected.set(p.x,height,p.z);this.camera.convertToUINode(this.projected,this.hud.canvas,this.projected);return {x:this.projected.x,y:this.projected.y};}
    private rayAt(x:number,y:number){const size=view.getVisibleSizeInPixel();return this.camera.screenPointToRay((x/this.hud.width+.5)*size.width,(y/this.hud.height+.5)*size.height);}
    private toWorld(x:number,y:number):Point{const ray=this.rayAt(x,y),t=-ray.o.y/ray.d.y;return {x:ray.o.x+ray.d.x*t,z:ray.o.z+ray.d.z*t};}
    private toPlacement(x:number,y:number):Point{return this.objects.placementRay(this.placementId,this.rayAt(x,y),this.toWorld(x,y));}
    private touchStart(e:EventTouch){
        if(!this.hud)return;
        if(e.getAllTouches().length>1){
            this.gesture=null;this.multiTouch=true;this.safariGesture=null;
            if(!this.viewGesture&&this.canMoveView()&&e.getAllTouches().every(t=>{const p=t.getUILocation();return !this.hud.blocks(p.x-this.hud.width/2,p.y-this.hud.height/2);}))this.viewGesture=this.touchView(e);
            return;
        }
        if(this.multiTouch||this.hud.modalOpen)return;
        const p=e.getUILocation(),x=p.x-this.hud.width/2,y=p.y-this.hud.height/2;
        if(this.selected&&!this.hud.dialogueAt(x,y))this.close();
        const conversation=this.hud.conversationAt(x,y);
        if(!conversation&&this.hud.blocks(x,y))return;
        let resident=conversation||this.hud.nameAt(x,y),place='';
        if(!resident){let best=Math.max(22,14*this.zoom+8);for(const a of this.actors){if(!this.objects.visibleAt(a.x,a.z))continue;const q=this.screenPoint(a,.9),d=Math.hypot(q.x-x,q.y-y);if(d<best){resident=a.id;best=d;}}}
        if(!resident)place=this.hud.landmarks.find(l=>l.node.active&&Math.abs(x-l.node.position.x)<46&&Math.abs(y-l.node.position.y)<22)?.id||'';
        const point=this.toWorld(x,y),object=this.objects.pick(this.rayAt(x,y))?.id||'';
        this.gesture={id:e.getID(),x,y,dx:0,dy:0,at:Date.now(),moved:false,held:false,resident,place,object,conversation:!!conversation};
    }
    private touchMove(e:EventTouch){
        if(this.multiTouch){const previous=this.viewGesture,next=this.touchView(e);if(!this.canMoveView()){this.viewGesture=null;return;}if(previous&&next){if(previous.ids.every((id,i)=>id===next.ids[i])){this.manualView=true;this.transformView(previous.x,previous.y,next.x,next.y,next.distance/previous.distance);}this.viewGesture=next;}return;}
        const g=this.gesture;if(!g||g.id!==e.getID()||g.held||g.conversation)return;const p=e.getUILocation();g.dx=p.x-this.hud.width/2-g.x;g.dy=p.y-this.hud.height/2-g.y;if(this.placementId){const point=this.toPlacement(g.x+g.dx,g.y+g.dy);this.objects.preview(this.placementId,point.x,point.z);if(Math.hypot(g.dx,g.dy)>12)g.moved=true;return;}if(Math.hypot(g.dx,g.dy)>12&&!g.moved){g.moved=true;this.manualView=false;this.route=[];this.destination=null;this.close();}}
    private touchEnd(e:EventTouch){if(this.multiTouch){this.gesture=null;this.viewGesture=this.viewGesture?this.touchView(e):null;if(!e.getAllTouches().length)this.multiTouch=false;return;}const g=this.gesture;if(!g||g.id!==e.getID())return;this.gesture=null;if(this.placementId){if(!g.held){const p=e.getUILocation();void this.commitObject(this.placementId,'move',this.toPlacement(p.x-this.hud.width/2,p.y-this.hud.height/2));}return;}if(g.held||g.moved)return;if(Date.now()-g.at>=550){this.context(g);return;}if(g.conversation)this.hud.advanceSpeech();else if(g.resident)this.select(g.resident);else if(g.object){const o=this.objects.entities.get(g.object)!;this.chooseObject(o.id,o.defaultAction);}else if(g.place)this.visit(g.place);else this.walk(this.toWorld(g.x,g.y));}
    private touchCancel(e:EventTouch){this.gesture=null;this.viewGesture=null;this.multiTouch=e.getAllTouches().length>0;}
    private context(g:Gesture){g.held=true;this.route=[];this.destination=null;if(this.placementId){this.cancelPlacement();return;}const p=this.toWorld(g.x,g.y);const object=this.objects.entities.get(g.object)||this.objects.at(p.x,p.z,true);if(!g.resident&&object){this.objectMenu(object,g.x,g.y);return;}if(g.resident&&this.people().find(r=>r.id===g.resident)?.visitor){this.select(g.resident);return;}if(g.resident){const id=g.resident;this.hud.showContext(g.x,g.y,this.state?.residents.find(r=>r.id===id)?.name||'邻居',[
        {label:'聊聊',icon:'chat',run:()=>this.select(id)},{label:'邀来酒店',icon:'help',run:()=>void this.economyCommand('invite',{resident:id})},{label:'送面包',icon:'gift',cost:'4 币',run:()=>this.select(id,'gift')},{label:'生活记录',icon:'memory',run:()=>this.hud.showLifeLog(id)}
    ]);}else{const p=this.toWorld(g.x,g.y);this.hud.showContext(g.x,g.y,'慢慢逛',[
        {label:'走这里',icon:'walk',run:()=>this.walk(p)},{label:'手记',icon:'journal',run:()=>this.hud.toggleJournal()},{label:'散步图',icon:'map',run:()=>this.hud.toggleMap(new Vec3(this.player.x,0,this.player.z))}
    ]);}}
    private keyDown(e:EventKeyboard){if(e.keyCode===KeyCode.ESCAPE){this.hud.economy.close();this.hud.closeContext();this.hud.closeMap();this.hud.closeInspection();this.close();}}
    private hide(){this.active=false;this.gesture=null;this.viewGesture=null;this.multiTouch=false;this.safariGesture=null;this.route=[];this.destination=null;}
    private show(){this.active=true;this.entered=false;this.positioned=false;void this.refresh();}
    private relayout=()=>{if(this.hud){const size=view.getVisibleSize();if(size.width!==this.hud.width||size.height!==this.hud.height){this.gesture=null;this.viewGesture=null;this.safariGesture=null;}this.hud.relayout(size.width,size.height);}};
    private syncViewport=()=>{
        if(this.resized)return;this.resized=requestAnimationFrame(()=>{this.resized=0;const frame=document.getElementById('GameDiv');if(!frame)return;const vv=window.visualViewport,height=Math.round(vv?.height||innerHeight),available=Math.min(innerWidth,vv?.width||innerWidth),phone=matchMedia('(pointer: coarse)').matches||innerWidth<=600,width=Math.round(phone?Math.min(available,500):Math.min(available,height*390/844));frame.style.left=`${Math.round((innerWidth-width)/2+(vv?.offsetLeft||0))}px`;frame.style.width=`${width}px`;frame.style.height=`${height}px`;frame.style.top=`${Math.round(vv?.offsetTop||0)}px`;screen.windowSize=new Size(width*screen.devicePixelRatio,height*screen.devicePixelRatio);this.hud.fitViewport(width,height);this.relayout();});
    };
    private step(p:Pawn,target:Point,distance:number){const dx=target.x-p.x,dz=target.z-p.z,len=Math.hypot(dx,dz);if(len<.005)return false;const amount=Math.min(distance,len),x=p.x+dx/len*amount,z=p.z+dz/len*amount;let moved=false;
        p.direction=Math.abs(dx)>Math.abs(dz)?(dx>0?3:1):(dz>0?2:0);
        if(this.valid(x,p.z)){moved||=Math.abs(x-p.x)>.0001;p.x=x;}if(this.valid(p.x,z)){moved||=Math.abs(z-p.z)>.0001;p.z=z;}return moved;
    }
    private animate(p:Pawn,walking:boolean,dt:number){
        p.node.setPosition(p.x,0,p.z);
        const pose=p.id==='player'?this.state?.player?.pose:null,seat=pose?.kind==='sit'&&pose.until>(this.state?.minute||0)?this.objects.seat(pose.object):null;
        const seated=!!seat&&!walking&&Math.hypot(p.x-seat.x,p.z-seat.z)<.8;if(seated)p.direction=seat!.direction;
        const near=Math.hypot(p.x-this.cameraX,p.z-this.cameraZ)<32/this.zoom;p.node.active=near;if(near)this.characters.animate(p.avatar,walking,seated,p.direction);
    }
    update(dt:number){
        if(!this.world||!this.player||!this.objects||!this.active)return;dt=Math.min(dt,.06);this.elapsed+=dt;this.hud.tick(dt);const g=this.gesture;
        this.hud.holdAt(g?.x||0,g?.y||0,g&&!g.moved&&!g.held?(Date.now()-g.at)/550:0);if(g&&!g.moved&&!g.held&&Date.now()-g.at>=550)this.context(g);
        let moving=false;
        if(!this.state?.economy?.playerWorking&&!this.hud.modalOpen&&!this.hud.isEditing()&&!this.busy&&!this.placementId){
            if(g?.moved&&!g.held){const d=Math.hypot(g.dx,g.dy);moving=this.step(this.player,{x:this.player.x+g.dx/d,z:this.player.z-g.dy/d/0.574},3.3*dt*Math.min(1,d/65));}
            else if(!g&&!this.selected){if(this.route.length){moving=this.step(this.player,this.route[0],dt*3.3);if(Math.hypot(this.player.x-this.route[0].x,this.player.z-this.route[0].z)<.04)this.route.shift();}
                if(this.approach){const a=this.actors.find(a=>a.id===this.approach);if(!a){this.approach='';return;}if(Math.hypot(a.x-this.player.x,a.z-this.player.z)<2.5)this.open(a.id);else if(this.elapsed-this.repathAt>2){this.repathAt=this.elapsed;this.route=this.path(this.player,a);}}
                if(this.place&&!this.route.length){const id=this.place;this.place='';void this.perform(id);}
            }
        }
        if(this.pendingObject&&!this.route.length&&!this.busy&&!this.hud.modalOpen&&!this.gesture){const pending=this.pendingObject,o=this.objects.entities.get(pending.id);if(o&&this.reachable(o,this.player)){this.pendingObject=null;if(pending.action==='move')this.beginPlacement(o.id);else void this.commitObject(o.id,pending.action);}else if(this.elapsed-this.repathAt>2){this.repathAt=this.elapsed;this.planObjectApproach();}}
        if(this.state?.economy?.playerWorking&&this.state.player){const l=this.state.player;let tx=l.x,tz=l.z,remaining=this.state.paused?0:Math.min(2,Math.max(0,this.elapsed-this.snapshotAt))*.38*this.state.speed;if(l.phase==='walking')for(const q of l.route||[]){const d=Math.hypot(q.x-tx,q.z-tz);if(d<=remaining){tx=q.x;tz=q.z;remaining-=d;}else{if(d>.001){tx+=(q.x-tx)/d*remaining;tz+=(q.z-tz)/d*remaining;}break;}}moving=this.step(this.player,{x:tx,z:tz},dt*1.2);}
        this.animate(this.player,moving,dt);
        for(const a of this.actors){const l=this.people().find(r=>r.id===a.id)?.life;let walking=false;if(l){
            let tx=l.x,tz=l.z,remaining=this.state!.paused||a.id===this.selected?0:Math.min(2,Math.max(0,this.elapsed-this.snapshotAt))*.38*(this.state!.speed||1);
            if(l.phase==='walking')for(const q of l.route){const d=Math.hypot(q.x-tx,q.z-tz);if(d<=remaining){tx=q.x;tz=q.z;remaining-=d;}else{if(d>.001){tx+=(q.x-tx)/d*remaining;tz+=(q.z-tz)/d*remaining;}break;}}
            a.target.x=tx;a.target.z=tz;
            if(a.route.length){walking=this.step(a,a.route[0],dt*2);if(Math.hypot(a.x-a.route[0].x,a.z-a.route[0].z)<.04)a.route.shift();}
            else walking=this.step(a,a.target,dt*1.1);
        }this.animate(a,walking,dt);}
        // Use a screen-space dead zone: perspective makes a metre-based zone unsafe near the lower edge.
        let cx=this.cameraX,cz=this.cameraZ;if(!this.manualView){const p=this.screenPoint(this.player),sx=clamp(p.x,-this.hud.width*.2,this.hud.width*.2),sy=clamp(p.y,-this.hud.height*.14,this.hud.height*.14);if(sx!==p.x||sy!==p.y){const edge=this.toWorld(sx,sy);cx+=this.player.x-edge.x;cz+=this.player.z-edge.z;}}
        const follow=this.reduceMotion?1:1-Math.exp(-dt*8);this.cameraX+=Math.abs(cx-this.cameraX)<.002?cx-this.cameraX:(cx-this.cameraX)*follow;this.cameraZ+=Math.abs(cz-this.cameraZ)<.002?cz-this.cameraZ:(cz-this.cameraZ)*follow;
        this.limitCamera();
        this.syncCamera();this.objects.updateRoofs(this.player,this.camera.node.position);
        this.objects.updateView(this.cameraX,this.cameraZ,22/this.zoom,30/this.zoom,[this.player,...this.actors]);
        for(const a of this.actors){const p=this.screenPoint(a,1.9),r=this.people().find(r=>r.id===a.id),name=this.hud.nameplates[a.id],near=Math.hypot(a.x-this.player.x,a.z-this.player.z)<9&&this.objects.visibleAt(a.x,a.z);
            name.active=a.id===this.selected&&near&&Math.abs(p.x)<this.hud.width/2-40&&Math.abs(p.y)<this.hud.height/2-90;name.setPosition(p.x,p.y+12);
            const ambient=this.hud.ambient[a.id];ambient.node.active=false;
            if(!this.selected&&!this.hud.modalOpen&&r?.life?.speech&&r.life.speechUntil>this.state!.minute&&near&&a.id===this.actors.filter(a=>{const l=this.people().find(r=>r.id===a.id)?.life;return l&&l.speechUntil>this.state!.minute&&Math.hypot(a.x-this.player.x,a.z-this.player.z)<9;})[0]?.id&&Math.abs(p.x)<this.hud.width/2-112&&p.y<this.hud.height/2-130){ambient.node.active=true;ambient.node.setPosition(p.x,p.y+48);ambient.label.string=r.life.speech.slice(0,44);}
            this.hud.activities.show(a.id,p.x,p.y+31,r?.currentActivity,near&&!!r&&!r.visitor&&a.id!==this.selected&&!this.hud.modalOpen&&!ambient.node.active&&Math.abs(p.x)<this.hud.width/2-30&&p.y<this.hud.height/2-145&&p.y>-this.hud.height/2+50);
            if(a.id===this.selected)this.hud.anchorSpeech(p.x,p.y+16);
        }
        for(const l of this.hud.landmarks){const p=this.layout.places.find(p=>p.id===l.id)!,q=this.screenPoint(p);l.node.active=!this.selected&&Math.hypot(p.x-this.player.x,p.z-this.player.z)<9&&Math.abs(q.x)<this.hud.width/2-52&&Math.abs(q.y)<this.hud.height/2-110;l.node.setPosition(q.x,q.y-42);}
        this.hud.playerPosition.set(this.player.x,0,this.player.z);this.hud.destination.active=!!this.destination&&this.route.length>0;if(this.hud.destination.active){const p=this.screenPoint(this.destination!);this.hud.destination.setPosition(p.x,p.y);}
    }
    onDestroy(){this.gestureCanvas?.removeEventListener('wheel',this.wheel);this.gestureCanvas?.removeEventListener('gesturestart',this.safariStart);this.gestureCanvas?.removeEventListener('gesturechange',this.safariChange);this.gestureCanvas?.removeEventListener('gestureend',this.safariEnd);this.unschedule(this.refresh);input.off(Input.EventType.TOUCH_START,this.touchStart,this);input.off(Input.EventType.TOUCH_MOVE,this.touchMove,this);input.off(Input.EventType.TOUCH_END,this.touchEnd,this);input.off(Input.EventType.TOUCH_CANCEL,this.touchCancel,this);input.off(Input.EventType.KEY_DOWN,this.keyDown,this);game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);view.off('canvas-resize',this.relayout,this);if(typeof window!=='undefined'){window.removeEventListener('resize',this.syncViewport);window.visualViewport?.removeEventListener('resize',this.syncViewport);window.visualViewport?.removeEventListener('scroll',this.syncViewport);if(this.resized)cancelAnimationFrame(this.resized);}this.hud?.destroy();}
}
