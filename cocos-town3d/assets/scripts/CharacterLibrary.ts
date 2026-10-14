import {Node,Prefab,instantiate,resources,AnimationClip,SkeletalAnimation,SkinnedMeshRenderer,MeshRenderer,Material,Texture2D,Color,Quat,Vec3} from 'cc';
import {ObjectScene} from './ObjectScene';
export type Avatar={root:Node;body:Node;animation:SkeletalAnimation;state:string;accessory:Node|null;rest:Map<Node,Quat>;bones:Record<string,Node>;scale:number};
/** Kenney CC0 rig and clips, shared meshes and per-look materials. */
export class CharacterLibrary {
 private prefab!:Prefab;private clips:AnimationClip[]=[];private skins:Material[]=[];
 async load(){
  const load=<T>(path:string,type:any)=>new Promise<T>((resolve,reject)=>resources.load(path,type,(e:any,a:any)=>e?reject(e):resolve(a)));
  const [prefab,idle,run,sit,...textures]=await Promise.all([load<Prefab>('people/townsfolk/townsfolk',Prefab),...['idle','run','sit'].map(n=>load<AnimationClip>('people/townsfolk/'+n,AnimationClip)),...['skaterMaleA','skaterFemaleA','criminalMaleA'].map(n=>load<Texture2D>('people/'+n+'/texture',Texture2D))]);
  this.prefab=prefab as Prefab;this.clips=[idle,run,sit] as AnimationClip[];this.clips.forEach((c,i)=>c.name=['idle','run','sit'][i]);
  for(const texture of textures){const m=new Material();m.initialize({effectName:'builtin-standard',defines:{USE_ALBEDO_MAP:true}});m.setProperty('mainTexture',texture as Texture2D);m.setProperty('mainColor',new Color(255,255,255));m.setProperty('metallic',0);m.setProperty('roughness',.95);this.skins.push(m);}

 }
 create(id:string,look:number,world:ObjectScene):Avatar{
  const root=new Node(id);root.parent=world.actorLayer;
  world.shape(root,'cylinder',[0,.025,0],[.72,.014,.52],'#82966C','Soft foot shadow');
  if(id==='player'){world.shape(root,'cylinder',[0,.021,0],[.88,.016,.66],'#E5C779','Mayor marker');}
  const body=instantiate(this.prefab);body.name='Kenney resident';body.parent=root;body.setScale(.48,.48,.48);
  const renderers=body.getComponentsInChildren(SkinnedMeshRenderer);for(const r of renderers)r.setMaterial(this.skins[look%this.skins.length],0);
  const animation=body.getComponent(SkeletalAnimation)||body.getComponentInChildren(SkeletalAnimation)||body.addComponent(SkeletalAnimation);
  animation.clips=this.clips;animation.useBakedAnimation=true;
  const bones:Record<string,Node>={},rest=new Map<Node,Quat>();const scan=(n:Node)=>{bones[n.name]=n;rest.set(n,n.rotation.clone());for(const c of n.children)scan(c);};scan(body);
  // Small accessories keep neighbours recognisable at the fixed camera distance.
  const colors=['#5E806A','#B8805D','#9B8491','#A09C6D','#C6AC7D','#66858E'];
  const accessory=look%3===0?new Node('Cloth hat'):null;
  // Keep rigid accessories beside the baked skeleton; the animation owns its subtree.
  if(accessory){accessory.parent=root;accessory.setScale(.48,.48,.48);world.shape(accessory,'cylinder',[0,3.53,0],[1.35,.12,1.15],colors[look%6],'Cloth hat brim');world.shape(accessory,'cylinder',[0,3.69,0],[.94,.28,.87],colors[look%6],'Cloth hat crown');}
  const avatar={root,body,animation,state:'',accessory,rest,bones,scale:.48};this.animate(avatar,false,false,2);return avatar;
 }
 animate(a:Avatar,walking:boolean,seated:boolean,direction:number){
  const state=seated?'sit':walking?'run':'idle';
  if(state!==a.state){a.state=state;
   const clip=this.clips.find(c=>c.name.toLowerCase().includes(state));if(clip){const s=a.animation.getState(clip.name)||a.animation.createState(clip);s.wrapMode=AnimationClip.WrapMode.Loop;s.speed=walking?.65:1;a.animation.play(clip.name);}

  }
  a.accessory?.setPosition(0,seated?-.16:0,0);a.body.setPosition(0,seated?-.16:0,0);a.body.setRotationFromEuler(0,[180,270,0,90][direction],0);
 }
}
