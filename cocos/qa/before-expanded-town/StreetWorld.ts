import { Node, Mesh, MeshRenderer, Material, Color, Vec3, primitives, utils } from 'cc';

export type Actor = { root: Node; body: Node; head: Node; legs: Node[]; arms: Node[]; target: Vec3; phase: number; id: string };
export type PlaceSpot = {id:string;name:string;short:string;x:number;z:number;open:number;close:number;indoor:boolean;activity:string;label:string;icon:string;cost:number};
export type TownLayout = {version:number;bounds:{minX:number;maxX:number;minZ:number;maxZ:number};places:PlaceSpot[];obstacles:Rect[];actors:{id:string;name:string;type:'fox'|'rabbit'|'bear';place:string}[]};
export type Rect = { x: number; z: number; w: number; d: number };
const color = (s: string) => new Color().fromHEX(s);

/** Original toy-like village, built from shared low-poly Cocos meshes. */
export class StreetWorld {
    readonly actors: Actor[] = [];
    readonly obstacles: Rect[] = [];
    readonly anchors: Record<string, Vec3> = {
        cafe: new Vec3(-5, 0, .1), library: new Vec3(4.7, 0, -1.4), studio: new Vec3(8.1, 0, 5.4),
        home: new Vec3(-8.5, 0, 5.5), park: new Vec3(7.6, 0, 8), square: new Vec3(0, 0, 3.3), shop: new Vec3(3.5, 0, 2)
    };
    private meshes: Record<string, Mesh> = {};
    private materials: Record<string, Material> = {};
    constructor(public root: Node, private baseMaterial: Material, public layout:TownLayout) {
        this.meshes.box = utils.createMesh(primitives.box({ width: 1, height: 1, length: 1 }));
        this.meshes.ball = utils.createMesh(primitives.sphere(.5, { segments: 12 }));
        this.meshes.cylinder = utils.createMesh(primitives.cylinder(.5, .5, 1, { radialSegments: 12 }));
        this.meshes.cone = utils.createMesh(primitives.cylinder(0, .5, 1, { radialSegments: 12 }));
    }
    mat(hex: string) {
        if (!this.materials[hex]) {
            const m = new Material();
            m.copy(this.baseMaterial);
            m.setProperty('mainColor', color(hex)); m.setProperty('roughness', .95); m.setProperty('metallic', 0);
            this.materials[hex] = m;
        }
        return this.materials[hex];
    }
    shape(name: string, kind: string, parent: Node, p: number[], s: number[], hex: string, rotation?: number[]) {
        const n = new Node(name); n.parent = parent; n.setPosition(p[0], p[1], p[2]); n.setScale(s[0], s[1], s[2]);
        if (rotation) n.setRotationFromEuler(rotation[0], rotation[1], rotation[2]);
        const r = n.addComponent(MeshRenderer); r.mesh = this.meshes[kind]; r.setMaterial(this.mat(hex), 0);
        return n;
    }
    box(name: string, p: number[], s: number[], hex: string, parent = this.root, rot?: number[]) {
        return this.shape(name, 'box', parent, p, s, hex, rot);
    }
    ball(name: string, p: number[], s: number[], hex: string, parent = this.root) {
        return this.shape(name, 'ball', parent, p, s, hex);
    }
    cylinder(name: string, p: number[], s: number[], hex: string, parent = this.root, rot?: number[]) {
        return this.shape(name, 'cylinder', parent, p, s, hex, rot);
    }
    build() {
        // Continuous landscape fills portrait edges, including the overview camera.
        this.box('continuous meadow', [0, -.07, 0], [160, .2, 160], '#A9BE81');
        for(let i=0;i<16;i++){
            const a=i*Math.PI*2/16,x=Math.cos(a)*42,z=Math.sin(a)*38;
            this.ball('distant grassy rise',[x,-.15,z],[12,2.4,10],i%2?'#A5BA7F':'#ADC387');
            this.tree(x,z,1.1+(i%3)*.2,i%3);
        }
        this.box('street', [-1, .04, 3.1], [26, .09, 3.1], '#DDCFAC');
        this.box('cafe approach', [-5, .05, -.5], [3.4, .1, 6], '#DDCFAC');
        this.box('bookshop approach', [4.7, .05, -1.4], [2.5, .1, 6], '#DDCFAC');
        this.box('garden path', [-1.1, .035, 8], [3.1, .1, 8], '#DDCFAC');
        for (let i = 0; i < 20; i++) {
            this.box('street cobble', [-12.3 + i * 1.25, .1, 1.51], [.86, .13, .22], i % 2 ? '#C4BC9F' : '#ECE1C2');
            this.box('street cobble', [-12.3 + i * 1.25, .1, 4.69], [.86, .13, .22], '#C4BC9F');
        }
        this.box('slow river', [14, -.015, 0], [3.2, .13, 23], '#7CAFB0');
        this.box('river depth', [14.5, .065, 0], [1.4, .01, 23], '#6B9DAB');
        for (let i = 0; i < 12; i++) {
            this.box('water glint', [13.3 + (i % 3) * .5, .078, -10 + i * 1.8], [.65, .012, .035], '#B5D5CC');
            this.ball('river stone', [12.3, .12, -9.4 + i * 1.65], [.65 + (i % 3) * .15, .48, .6], '#CAC7AC');
        }
        this.bridge(14, 3.1);
        this.building('Moss & Milk cafe', -5, -4.4, 6, 4.2, '#ECE0C0', '#B77954', '#746B49');
        this.building('Little bookshop', 4.6, -5.8, 4.8, 3.8, '#DFDABA', '#768977', '#718878');
        this.building('Carpenter cottage', 8.9, 1.0, 3.7, 3.2, '#D3C6A4', '#AC8962', '#7E7860');
        this.awning(-5, -1.97);
        this.cafeTable(-8.6, .35); this.cafeTable(-8.7, 3.35);
        this.sign(-2.25, .05, '#667B59');
        this.sign(2.3, -2.6, '#AA805D');
        this.planter(-8.18, -2.18); this.planter(-1.84, -2.18);
        this.planter(2.11, -3.6); this.planter(7.04, -3.6);
        this.bookcase(5.8, -3.55);
        this.bench(-5.0, 6.3); this.bench(4.0, 6.4);
        this.box('workbench', [7.9, .82, 3.05], [2.2, .2, .78], '#A88861');
        for (const x of [7.1, 8.7]) this.box('workbench leg', [x, .4, 3.05], [.14, .8, .58], '#776446');
        this.box('timber plank', [8, .98, 3.05], [1.8, .11, .32], '#D5B783', this.root, [0, 10, 0]);
        this.cylinder('log stack', [10.8, .3, 2.9], [.56, 1.5, .56], '#B09366', this.root, [90, 0, 0]);
        this.cylinder('log stack', [11.3, .3, 2.9], [.56, 1.5, .56], '#B09366', this.root, [90, 0, 0]);
        this.cylinder('log stack', [11.05, .75, 2.9], [.56, 1.5, .56], '#BAA177', this.root, [90, 0, 0]);
        const trees = [[-13,-8,1.1],[-10,-9,1.2],[-7,-10,1.1],[-3,-10,1.2],[0,-10,1.05],[4,-10,1.2],[8,-9.4,1],[10.9,-6.8,.95],[-13,-4,1.25],[-13,.1,1],[-12,7,1.15],[-8.8,9.5,1],[-5,10.9,.9],[4,10.5,1.2],[8.5,10.5,1.1],[10.9,7.7,.8]];
        trees.forEach((v,i)=>this.tree(v[0],v[1],v[2],i%3));
        for(let i=0;i<16;i++)this.bush(-12.3+i*1.48,-8.6,.7+(i%3)*.1);
        for(let i=0;i<24;i++){
            const x=-11+(i%8)*2.75,z=i<8?6.8:i<16?9.2:-8;
            if(Math.abs(x)<2&&z>5)continue;
            this.flower(x,z,i%3);this.flower(x+.28,z+.3,(i+1)%3);
        }
        this.fence(-10.8,6.7,5); this.fence(1.2,9,6);
        this.lamp(-10.2,1.9);this.lamp(.9,1.6);this.lamp(10.9,4.9);
        this.mailbox(-1.1,-1.9);
        this.cylinder('garden pond edge',[7.8,.06,7.9],[3.8,.18,2.5],'#C5C5A1');
        this.cylinder('garden pond',[7.8,.17,7.9],[3.4,.08,2.1],'#87B6B3');
        this.cylinder('lily pad',[8.2,.225,7.7],[.55,.02,.48],'#6F9969');
        this.ball('lily flower',[8.2,.29,7.7],[.18,.16,.18],'#F1C2B1');
        this.obstacles.push({x:14,z:-4,w:3.5,d:12.5},{x:14,z:9,w:3.5,d:7.8},{x:7.8,z:7.9,w:3.6,d:2.4});
        this.expandedVillage();
        this.obstacles.splice(0,this.obstacles.length,...this.layout.obstacles);
        for(const p of this.layout.places)this.anchors[p.id]=new Vec3(p.x,0,p.z);
        return this;
    }
    expandedVillage(){
        // Interactive sets share the existing meshes and materials for mobile instancing.
        this.box('island footpath',[19,.04,3.1],[8,.09,2.2],'#DDCFAC');
        this.box('orchard footpath',[19.6,.045,.4],[1.7,.08,6],'#DDCFAC');
        this.box('riverside path',[18,.045,5],[1.7,.08,4],'#DDCFAC');
        for(const [x,z,scale] of [[18,-2,1],[21.5,-2.2,1.1],[22,-5,.9],[16.8,-5.4,1]])this.tree(x,z,scale,2);
        this.fence(17.2,-4.2,9);this.fence(19.1,10.2,6);
        this.bench(18,7.3);this.sign(20.6,.8,'#667B59');
        this.box('river picnic rug',[18,.12,5.8],[2.7,.035,1.8],'#DFDABA');
        for(let i=0;i<7;i++)this.box('landing deck',[16.7+i*.38,.2,6.1],[.34,.16,2.2],'#B29A72');
        this.cylinder('fruit basket',[20.6,.28,1.3],[.7,.5,.7],'#A58B65');
        for(const dx of [-.15,.16])this.ball('picked peach',[20.6+dx,.57,1.3],[.3,.29,.29],'#DAA080');
        // A small market, two raised flower beds and a playable wooden instrument.
        this.box('market counter',[-10.8,.7,-2],[2.5,.2,1],'#A88861');
        for(const x of [-11.8,-9.8])this.box('market pole',[x,1.15,-2],[.11,2.3,.11],'#776446');
        this.box('striped market roof',[-10.8,2.3,-2],[2.8,.13,1.6],'#748D68',this.root,[8,0,0]);
        for(let i=0;i<3;i++){this.box('produce crate',[-11.5+i*.7,.93,-1.95],[.6,.3,.65],'#B3946A');this.ball('market produce',[-11.5+i*.7,1.18,-1.9],[.43,.28,.42],i%2?'#DABB79':'#DAA080');}
        for(const x of [-6.2,-2.6]){this.box('raised garden bed',[x,.22,8.6],[1.5,.4,2.1],'#B3946A');this.box('garden soil',[x,.43,8.6],[1.3,.06,1.9],'#847456');for(let j=0;j<4;j++)this.flower(x+(j%2)*.5-.25,8.1+Math.floor(j/2)*.75,j%3,.45);}
        this.cylinder('watering can',[-4.7,.25,9.6],[.42,.48,.4],'#8DA6A2');
        this.box('watering spout',[-4.37,.4,9.6],[.5,.1,.12],'#8DA6A2',this.root,[0,0,25]);
        this.box('xylophone stand',[0,.58,1.8],[1.8,.12,.7],'#A88861');
        for(let i=0;i<7;i++)this.box('wooden music key',[-.72+i*.24,.71,1.8],[.19,.1,.6-i*.035],i%2?'#DABB79':'#B77954');
        this.sign(.9,1.6,'#667B59');
    }
    building(name:string,x:number,z:number,w:number,d:number,wall:string,roof:string,trim:string){
        const h=3.0, n=new Node(name);n.parent=this.root;n.setPosition(x,0,z);
        this.box('stone foundation',[0,.14,0],[w+.22,.28,d+.24],'#CCC8AB',n);
        this.box('plaster walls',[0,h/2+.18,0],[w,h,d],wall,n);
        this.box('front timber beam',[0,2.8,d/2+.03],[w+.08,.2,.12],trim,n);
        for(const px of [-w/2+.14,w/2-.14])this.box('wood corner',[px,1.55,d/2+.045],[.2,2.9,.18],trim,n);
        const slope=34,slant=w*.61;
        this.box('left roof',[-w*.25,h+.82,0],[slant,.25,d+.85],roof,n,[0,0,slope]);
        this.box('right roof',[w*.25,h+.82,0],[slant,.25,d+.85],roof,n,[0,0,-slope]);
        this.cylinder('roof ridge',[0,h+1.66,0],[.25,d+.95,.25],trim,n,[90,0,0]);
        // Gable triangle; double sided original mesh, shared material.
        const geom={positions:[-w/2,3.15,d/2, w/2,3.15,d/2, 0,h+1.7,d/2, -w/2,3.15,-d/2, w/2,3.15,-d/2, 0,h+1.7,-d/2],normals:[0,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1],indices:[0,1,2,5,4,3]};
        const g=new Node('gable');g.parent=n;const mr=g.addComponent(MeshRenderer);mr.mesh=utils.createMesh(geom);mr.setMaterial(this.mat(wall),0);
        for(let j=0;j<6;j++){
            const pz=-d/2+j*d/5;
            this.box('roof seam',[-w*.25,h+.98,pz],[slant,.035,.035],trim,n,[0,0,slope]);
            this.box('roof seam',[w*.25,h+.98,pz],[slant,.035,.035],trim,n,[0,0,-slope]);
        }
        this.box('chimney',[w*.3,4.0,-d*.25],[.65,1.4,.7],'#C9BC9E',n);
        this.box('chimney rim',[w*.3,4.74,-d*.25],[.8,.14,.85],'#DFD6B9',n);
        this.box('door frame',[0,1.25,d/2+.06],[1.25,2.4,.14],trim,n);
        this.box('door',[0,1.19,d/2+.15],[1.02,2.14,.08],'#987D57',n);
        this.box('door glass',[0,1.64,d/2+.2],[.62,.68,.025],'#BDD6CE',n);
        this.ball('brass handle',[.35,1.01,d/2+.22],[.09,.09,.09],'#DABB79',n);
        this.box('doorstep',[0,.14,d/2+.45],[1.85,.26,.75],'#D6CEB1',n);
        for(const side of [-1,1]){
            const px=side*w*.31;
            this.box('window frame',[px,1.65,d/2+.05],[1.02,1.23,.17],trim,n);
            this.box('window',[px,1.67,d/2+.15],[.78,.98,.04],'#B5D2C5',n);
            this.box('window cross',[px,1.67,d/2+.19],[.06,1.02,.06],'#F0E3C2',n);
            this.box('window cross',[px,1.67,d/2+.19],[.85,.055,.06],'#F0E3C2',n);
            this.box('window sill',[px,1.03,d/2+.25],[1.19,.12,.38],trim,n);
        }
        this.obstacles.push({x,z,w:w+.25,d:d+.25});
    }
    awning(x:number,z:number){
        for(let i=0;i<10;i++){
            const tone=i%2?'#F5E5C3':'#748D68';
            this.box('canvas awning',[x-2.27+i*.5,2.57,z+.55],[.5,.12,1.45],tone,this.root,[9,0,0]);
            this.box('awning valance',[x-2.27+i*.5,2.39,z+1.23],[.5,.3,.09],tone);
        }
        for(const a of [-2.5,2.5])this.box('awning post',[x+a,1.16,z+1.13],[.08,2.4,.08],'#6E7357');
    }
    tree(x:number,z:number,s:number,variant:number){
        this.cylinder('tree shadow',[x,.04,z],[3*s,.025,2.5*s],'#8EA36F');
        this.cylinder('tree trunk',[x,1.05*s,z],[.37*s,2.1*s,.37*s],'#968463');
        const leaf=['#7E9A6A','#90AC78','#A7B986'][variant];
        this.ball('tree crown',[x,3.1*s,z],[3.1*s,3.35*s,2.85*s],leaf);
        this.ball('tree crown',[x-.65*s,2.65*s,z+.33*s],[2.2*s,2.5*s,2.1*s],leaf);
        if(variant===2)for(const dx of [-.62,.49])this.ball('peach',[x+dx*s,2.62*s,z+1.23*s],[.31,.33,.31],'#DAA080');
        this.obstacles.push({x,z,w:.9*s,d:.9*s});
    }
    bush(x:number,z:number,s:number){this.ball('hedge',[x,.45*s,z],[1.3*s,1.2*s,1.15*s],'#8DA374');}
    flower(x:number,z:number,v:number,base=0){
        this.cylinder('flower stalk',[x,base+.2,z],[.03,.35,.03],'#718663');
        this.ball('flower petals',[x,base+.4,z],[.18,.1,.18],['#EFE6BC','#D9A49B','#F7F1DD'][v]);
        this.ball('flower centre',[x,base+.45,z],[.06,.035,.06],'#D6AE60');
    }
    planter(x:number,z:number){
        this.cylinder('terracotta pot',[x,.3,z],[.56,.6,.56],'#BF936B');
        this.bush(x,z,.6);this.flower(x,z,1);
    }
    cafeTable(x:number,z:number){
        this.cylinder('table top',[x,.88,z],[1.3,.11,1.3],'#CEB184');
        this.cylinder('table base',[x,.43,z],[.17,.83,.17],'#847456');
        this.cylinder('coffee cup',[x+.13,1.015,z],[.14,.15,.14],'#F4EAD7');
        for(const dx of [-.95,.95]){
            this.cylinder('stool seat',[x+dx,.46,z],[.53,.12,.53],'#B3946A');
            this.cylinder('stool leg',[x+dx,.21,z],[.11,.42,.11],'#7D735C');
        }
        this.obstacles.push({x,z,w:2.65,d:1.3});
    }
    bench(x:number,z:number){
        this.box('bench seat',[x,.54,z],[2.0,.16,.68],'#AD956D');
        this.box('bench back',[x,.94,z-.28],[2,.54,.12],'#BEA780');
        for(const dx of [-.72,.72])this.box('bench legs',[x+dx,.3,z],[.12,.6,.6],'#777F61');
        this.obstacles.push({x,z,w:2.2,d:.9});
    }
    sign(x:number,z:number,tone:string){
        this.box('standing blackboard',[x,.77,z],[.75,1.2,.12],tone,this.root,[-8,0,0]);
        for(let i=0;i<3;i++)this.box('chalk line',[x,.95-i*.18,z+.16],[.45-i*.08,.026,.01],'#E8E5CE');
        for(const dx of [-.32,.32])this.box('sign leg',[x+dx,.3,z],[.07,.6,.12],'#A58B65');
    }
    bookcase(x:number,z:number){
        this.box('book display',[x,.71,z],[1.6,1.4,.38],'#A28662');
        for(let i=0;i<6;i++)this.box('books',[x-.62+i*.23,1,z+.25],[.16,.5-(i%2)*.08,.17],['#9AAB9A','#C49375','#DBBD81'][i%3]);
        for(let i=0;i<4;i++)this.box('books',[x-.48+i*.3,.48,z+.25],[.23,.38,.16],['#B78772','#BCC29B'][i%2]);
    }
    fence(x:number,z:number,count:number){
        for(let i=0;i<count;i++){
            this.box('picket',[x+i*.53,.43,z],[.17,.82,.14],'#E5D8B9');
            this.shape('picket cap','cone',this.root,[x+i*.53,.9,z],[.24,.22,.2],'#E5D8B9');
        }
        this.box('fence rail',[x+(count-1)*.265,.48,z],[count*.53,.12,.09],'#D9CDAF');
    }
    lamp(x:number,z:number){
        this.cylinder('lamp post',[x,1.2,z],[.1,2.4,.1],'#717960');
        this.box('lamp glass',[x,2.49,z],[.3,.48,.3],'#EFE1B8');
        this.shape('lamp roof','cone',this.root,[x,2.83,z],[.62,.25,.62],'#71816B');
    }
    mailbox(x:number,z:number){
        this.box('mailbox stand',[x,.6,z],[.11,1.1,.11],'#8A7B5B');
        this.box('mailbox',[x,1.2,z],[.62,.43,.56],'#91A6A0');
        this.box('mail slot',[x,1.24,z+.287],[.4,.05,.02],'#526A66');
    }
    bridge(x:number,z:number){
        for(let i=0;i<9;i++)this.box('bridge plank',[x-1.9+i*.47,.17,z],[.43,.18,3.0],'#B29A72');
        for(const side of [-1,1]){
            for(let i=0;i<3;i++)this.box('bridge post',[x-1.9+i*1.9,.6,z+side*1.5],[.13,1.12,.13],'#8B8265');
            this.box('bridge rail',[x,1.05,z+side*1.5],[4.05,.14,.13],'#A39270');
        }
    }
    actor(id:string,type:'fox'|'rabbit'|'bear'|'player',x:number,z:number):Actor{
        const n=new Node(id);n.parent=this.root;n.setPosition(x,0,z);
        this.cylinder('foot shadow',[0,.04,0],[1.03,.025,.72],'#7C9566',n);
        const body=new Node('animated body');body.parent=n;
        const fur=type==='fox'?'#C89864':type==='bear'?'#998367':type==='rabbit'?'#E6DFC4':'#E8DEC3';
        const coat: string=({tang:'#D9A49B',zhou:'#B3946A',su:'#DFDABA',lu:'#B77954',wen:'#E9DEC0',a:'#D6B56F',shen:'#748D68',ye:'#DAA080',gu:'#A58EAF'} as Record<string,string>)[id]||(type==='fox'?'#A1AD89':type==='bear'?'#84918A':type==='rabbit'?'#8DA6A2':'#D6B56F');
        this.ball('rounded coat',[0,.63,0],[.68,.78,.48],coat,body);
        this.box('apron',[0,.54,.255],[.4,.47,.035],type==='fox'?'#E9DEC0':coat,body);
        if(type==='player')this.box('satchel',[.28,.66,-.13],[.27,.38,.25],'#AA8665',body);
        const legs:Node[]=[],arms:Node[]=[];
        for(const s of [-1,1]){
            const leg=new Node('leg');leg.parent=body;leg.setPosition(s*.19,.3,0);legs.push(leg);
            this.ball('shoe',[0,-.14,.065],[.24,.27,.35],'#736B53',leg);
            const arm=new Node('arm');arm.parent=body;arm.setPosition(s*.37,.8,0);arms.push(arm);
            this.ball('sleeve',[s*.015,-.12,0],[.23,.4,.25],coat,arm);
            this.ball('hand',[s*.015,-.3,0],[.18,.18,.2],fur,arm);
        }
        const head=new Node('head');head.parent=body;head.setPosition(0,1.23,0);
        this.ball('round face',[0,.04,0],[.91,.83,.77],fur,head);
        if(type==='fox')for(const s of [-1,1]){
            this.shape('fox ear','cone',head,[s*.28,.52,-.06],[.37,.55,.28],fur,[0,0,-s*12]);
            this.shape('inner ear','cone',head,[s*.28,.5,.045],[.18,.3,.08],'#E4BAA1',[0,0,-s*12]);
        }
        else if(type==='rabbit')for(const s of [-1,1]){
            this.ball('rabbit ear',[s*.22,.64,-.02],[.22,.79,.24],fur,head);
            this.ball('inner ear',[s*.22,.65,.085],[.095,.5,.035],'#D9B8AC',head);
        }
        else if(type==='bear')for(const s of [-1,1])this.ball('bear ear',[s*.4,.34,-.04],[.32,.33,.25],fur,head);
        else {
            this.cylinder('straw hat brim',[0,.38,0],[1.2,.08,1.03],'#D1B475',head);
            this.cylinder('straw hat crown',[0,.52,-.03],[.76,.29,.68],'#DCC28A',head);
            this.cylinder('hat ribbon',[0,.42,-.03],[.79,.09,.71],'#9B9470',head);
        }
        this.ball('cream muzzle',[0,-.095,.342],[.49,.3,.2],'#F1E7CE',head);
        for(const s of [-1,1]){
            this.ball('eyes',[s*.19,.10,.354],[.085,.13,.07],'#484D3F',head);
            this.ball('eye glint',[s*.19-.012,.13,.39],[.022,.035,.015],'#FFF9E6',head);
            this.ball('blush',[s*.31,-.04,.326],[.13,.08,.035],'#D8AC94',head);
        }
        this.ball('nose',[0,-.025,.447],[.092,.062,.045],'#71614E',head);
        this.box('smile',[0,-.14,.443],[.11,.017,.012],'#A3866B',head);
        const a={root:n,body,head,legs,arms,target:new Vec3(x,0,z),phase:0,id};this.actors.push(a);return a;
    }
    valid(x:number,z:number){
        const b=this.layout.bounds;return x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ&&!this.obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.32&&Math.abs(z-o.z)<o.d/2+.32);
    }
    animate(a:Actor,dt:number,speed:number,activity=''){
        a.phase+=dt*(speed>.05?10:2.5);
        a.body.setPosition(0,speed>.05?Math.abs(Math.sin(a.phase))*.045:Math.sin(a.phase)*.014,0);
        a.legs.forEach((n,i)=>n.setRotationFromEuler(speed>.05?Math.sin(a.phase+i*Math.PI)*28:0,0,0));
        const working=speed<.05&&['craft','garden','music','shop','harvest'].includes(activity);
        a.arms.forEach((n,i)=>n.setRotationFromEuler(speed>.05?-Math.sin(a.phase+i*Math.PI)*22:working?-30+Math.sin(a.phase*2+i)*12:activity==='read'?-36:0,0,i?3:-3));
        a.head.setRotationFromEuler(speed>.05?0:activity==='read'?12:activity==='social'?Math.sin(a.phase)*4:0,0,0);
    }
}
