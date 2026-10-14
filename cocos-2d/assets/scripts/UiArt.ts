import {Node,UITransform,Sprite,SpriteFrame,Texture2D,JsonAsset,Rect,Size,Layers,resources} from 'cc';

type Region={texture:string;rect:number[];insets?:number[];scale?:number};
type Manifest={regions:Record<string,Region>;aliases:Record<string,string>};
let manifest:Manifest|null=null;
const textures=new Map<string,Texture2D>(),frames=new Map<string,SpriteFrame>();
let loading:Promise<void>|null=null;

/** World-independent UI asset pack. Other renderers can use this exact manifest. */
export function loadUiArt(){
 return loading ||= (async()=>{
  const load=<T>(name:string,type:any)=>new Promise<T>((resolve,reject)=>resources.load('ui-cozy/'+name,type,(error,asset)=>error?reject(error):resolve(asset as T)));
  manifest=(await load<JsonAsset>('manifest',JsonAsset)).json as Manifest;
  await Promise.all(Array.from(new Set(Object.values(manifest.regions).map(r=>r.texture))).map(async name=>{const texture=await load<Texture2D>(name+'/texture',Texture2D);texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);textures.set(name,texture);}));
 })();
}
export function artReady(){return !!manifest&&textures.size===6;}
export function artKey(key:string){return manifest?.aliases[key]||key;}
export function artFrame(key:string){
 key=artKey(key);if(frames.has(key))return frames.get(key)!;const region=manifest?.regions[key];if(!region)return null;
 const texture=textures.get(region.texture);if(!texture)return null;
 const [x,y,w,h]=region.rect,f=new SpriteFrame();f.texture=texture;f.rect=new Rect(x,y,w,h);f.originalSize=new Size(w,h);f.packable=false;
 if(region.insets){[f.insetLeft,f.insetRight,f.insetTop,f.insetBottom]=region.insets;}
 frames.set(key,f);return f;
}
/** Text, hit areas and game state stay outside the artwork node. */
export function art(parent:Node,key:string,width:number,height:number,name='UI art',fit=false){
 const frame=artFrame(key);if(!frame)return null;const region=manifest!.regions[artKey(key)];
 let n=parent.getChildByName(name);if(!n){n=new Node(name);n.parent=parent;n.layer=Layers.Enum.UI_2D;n.addComponent(UITransform);n.addComponent(Sprite);}
 const sprite=n.getComponent(Sprite)!;sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.spriteFrame=frame;sprite.type=region.insets?Sprite.Type.SLICED:Sprite.Type.SIMPLE;
 const scale=region.scale||1;
 if(fit){const ratio=Math.min(width/frame.rect.width,height/frame.rect.height);width=frame.rect.width*ratio;height=frame.rect.height*ratio;}
 n.getComponent(UITransform)!.setContentSize(width/scale,height/scale);n.setScale(scale,scale,1);return n;
}
export function artIcon(parent:Node,key:string,size=32,name='Action illustration'){
 return art(parent,artFrame(key)?key:'help',size,size,name,true);
}
