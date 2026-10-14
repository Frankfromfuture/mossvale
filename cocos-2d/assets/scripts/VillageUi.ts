import {art,artIcon,artReady} from './UiArt';
import {Node,UITransform,Graphics,Color,Label,Layers} from 'cc';

// Keep this UI contract stable when changing the world art. Enabled only for the grid trial.
export const GRID_UI=typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('view')==='grid';
export const UI=Object.freeze({paper:'#F7F2E7',ink:'#5C5549',border:'#817462',muted:'#8C8273',badge:'#70634F',line:'#DFD6C7',font:'PingFang SC',radius:14,stroke:1.35,bodySize:15,lineHeight:22,ambientSize:13,ambientLineHeight:19,ambientWidth:220,dialogueWidth:230,speechPaddingX:16,speechPaddingY:16});
export const CONTEXT_RING=Object.freeze({radius:40,hitSize:44,iconSize:30,captionY:-70});
export const uiColor=(value:string)=>new Color().fromHEX(value);
export function panel(node:Node,width:number,height:number,kind='paper'){
 if(artReady()){
  art(node,kind,width,height,'UI background')!.setSiblingIndex(0);
  let ink=node.getChildByName('UI ink');if(!ink){ink=new Node('UI ink');ink.parent=node;ink.layer=Layers.Enum.UI_2D;ink.addComponent(UITransform);ink.addComponent(Graphics);}ink.setSiblingIndex(1);ink.getComponent(UITransform)!.setContentSize(width,height);const g=ink.getComponent(Graphics)!;g.clear();return g;
 }
 const g=node.getComponent(Graphics)||node.addComponent(Graphics);g.clear();const r=Math.min(UI.radius,height/2);
 g.fillColor=new Color(40,31,20,30);g.roundRect(-width/2,-height/2-2,width,height,r);g.fill();
 g.fillColor=uiColor(UI.paper);g.strokeColor=uiColor(UI.border);g.lineWidth=UI.stroke;g.roundRect(-width/2,-height/2,width,height,r);g.fill();g.stroke();return g;
}
export function panelInk(n:Node){return n.getChildByName('UI ink')?.getComponent(Graphics)||n.getComponent(Graphics)!;}

const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
let measureContext:CanvasRenderingContext2D|null=null;
export function textWidth(text:string,size:number){
 if(typeof document!=='undefined'){measureContext ||= document.createElement('canvas').getContext('2d');if(measureContext){measureContext.font=`${size}px "${UI.font}", sans-serif`;return measureContext.measureText(text).width;}}
 return Array.from(text).reduce((n,c)=>n+(/[\u0000-\u00ff]/.test(c)?size*.55:size),0);
}
function wrap(text:string,width:number,size:number){
 const lines:string[]=[];for(const part of text.split('\n')){let line='';for(const ch of part){if(line&&textWidth(line+ch,size)>width){lines.push(line);line=ch;}else line+=ch;}lines.push(line);}return lines;
}
export function speechLayout(text:string,size:number,lineHeight:number,maxWidth:number){
 const lines=wrap(text.trimEnd()||'……',Math.max(size,maxWidth-UI.speechPaddingX*2),size),width=Math.min(maxWidth,Math.ceil(Math.max(...lines.map(t=>textWidth(t,size)))+UI.speechPaddingX*2));
 return {lines,width,height:lines.length*lineHeight+UI.speechPaddingY*2};
}
/** One SVG-style closed path: the triangle replaces part of the lower edge. */
export function drawSpeechBubble(g:Graphics,width:number,height:number,tailX=0){
 const hw=width/2,hh=height/2,r=Math.min(10,hw-6,hh),base=clamp(tailX,-hw+r+5,hw-r-5);g.clear();g.fillColor=uiColor(UI.paper);g.strokeColor=uiColor(UI.border);g.lineWidth=UI.stroke;
 g.moveTo(-hw+r,-hh);g.lineTo(base-5,-hh);g.lineTo(base,-hh-8);g.lineTo(base+5,-hh);g.lineTo(hw-r,-hh);g.quadraticCurveTo(hw,-hh,hw,-hh+r);g.lineTo(hw,hh-r);g.quadraticCurveTo(hw,hh,hw-r,hh);g.lineTo(-hw+r,hh);g.quadraticCurveTo(-hw,hh,-hw,hh-r);g.lineTo(-hw,-hh+r);g.quadraticCurveTo(-hw,-hh,-hw+r,-hh);g.close();g.fill();g.stroke();
}
function node(name:string,parent:Node,width:number,height:number){const n=new Node(name);n.parent=parent;n.layer=Layers.Enum.UI_2D;n.addComponent(UITransform).setContentSize(width,height);return n;}
function label(parent:Node,name:string,size:number){const n=node(name,parent,1,1),l=n.addComponent(Label);l.fontFamily=UI.font;l.fontSize=size;l.lineHeight=size===UI.bodySize?UI.lineHeight:size+6;l.color=uiColor(UI.ink);l.horizontalAlign=Label.HorizontalAlign.LEFT;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.CLAMP;l.enableWrapText=false;return l;}
function bind(n:Node,run:()=>void){let pressed=false;n.on(Node.EventType.TOUCH_START,e=>{e.propagationStopped=true;pressed=true;});n.on(Node.EventType.TOUCH_MOVE,e=>{e.propagationStopped=true;const a=e.getStartLocation(),b=e.getLocation();if(Math.hypot(a.x-b.x,a.y-b.y)>12)pressed=false;});n.on(Node.EventType.TOUCH_CANCEL,()=>pressed=false);n.on(Node.EventType.TOUCH_END,e=>{e.propagationStopped=true;if(pressed)run();pressed=false;});}

/** Compact dialogue for the grid trial; independent of world rendering. */
export class CompactDialogue {
 readonly node:Node;readonly speech:Label;
 width=180;height=46;private hitWidth=180;private g:Graphics;private badge:Node;private nameLabel:Label;private closeButton:Node;private moreButton:Node;
 private text='';private viewport=390;private outline='';private lastX=0;private lastY=0;private personName:string;
 constructor(parent:Node,name:string,close:()=>void,more?:()=>void){
  this.personName=name;this.node=node('Compact dialogue · '+name,parent,180,46);this.g=this.node.addComponent(Graphics);
  this.speech=label(this.node,'Dialogue text',UI.bodySize);
  this.badge=node('Speaker name',this.node,60,28);this.badge.addComponent(Graphics);this.nameLabel=label(this.badge,'Resident name',UI.bodySize);this.nameLabel.string=name;this.nameLabel.color=uiColor(UI.paper);this.nameLabel.horizontalAlign=Label.HorizontalAlign.CENTER;this.nameLabel.isBold=true;
  this.closeButton=this.button('Close dialogue','×',close);this.moreButton=this.button('Conversation actions','···',()=>more?.());this.moreButton.active=!!more;
 }
 private button(name:string,text:string,run:()=>void){const n=node(name,this.node,44,44);
  if(artReady()){art(n,'round',24,24);artIcon(n,text==='×'?'close':'more',text==='×'?13:16);}
  else {const g=n.addComponent(Graphics);g.fillColor=uiColor(UI.paper);g.roundRect(-10,-9,20,18,8);g.fill();const l=label(n,name,16);l.string=text;l.horizontalAlign=Label.HorizontalAlign.CENTER;l.node.getComponent(UITransform)!.setContentSize(24,22);}
  bind(n,run);return n;
 }
 setText(text:string,viewport=390){
  if(text===this.text&&viewport===this.viewport)return;this.text=text;this.viewport=viewport;
  const fit=speechLayout(text,UI.bodySize,UI.lineHeight,Math.min(UI.dialogueWidth,viewport-32));this.width=fit.width;this.height=fit.height;
  const nameWidth=Math.ceil(textWidth(this.personName,UI.bodySize)+20);this.hitWidth=Math.max(this.width,nameWidth+(this.moreButton.active?100:56));this.node.getComponent(UITransform)!.setContentSize(this.hitWidth,this.height);
  this.speech.string=fit.lines.join('\n');this.speech.node.getComponent(UITransform)!.setContentSize(this.width-UI.speechPaddingX*2,fit.lines.length*UI.lineHeight);this.speech.node.setPosition(0,0);
  this.badge.setPosition(-this.hitWidth/2+nameWidth/2,this.height/2);this.badge.getComponent(UITransform)!.setContentSize(nameWidth,28);this.nameLabel.node.getComponent(UITransform)!.setContentSize(nameWidth-12,UI.lineHeight);
  const bg=this.badge.getComponent(Graphics)!;bg.clear();bg.fillColor=uiColor(UI.badge);bg.roundRect(-nameWidth/2,-14,nameWidth,28,8);bg.fill();
  this.closeButton.setPosition(this.hitWidth/2-13,this.height/2);this.moreButton.setPosition(this.hitWidth/2-57,this.height/2);this.outline='';
 }
 anchor(x:number,y:number,width:number,height:number,top:number,bottom:number,composer:boolean){
  this.setText(this.text,width);const hw=this.width/2,hh=this.height/2;
  const bx=clamp(x,-width/2+this.hitWidth/2+12,width/2-this.hitWidth/2-12),ceiling=height/2-top-(artReady()?158:123)-hh,floor=-height/2+bottom+(composer?92:24)+hh;
  const by=clamp(y+hh+22,Math.min(floor,ceiling),ceiling);if(Math.abs(bx-this.lastX)>.1||Math.abs(by-this.lastY)>.1){this.node.setPosition(bx,by);this.lastX=bx;this.lastY=by;}
  const base=Math.round(clamp(x-bx,-hw+Math.min(10,hw-6)+5,hw-Math.min(10,hw-6)-5)),key=`${this.width}:${this.height}:${base}`;
  if(key!==this.outline){this.outline=key;drawSpeechBubble(this.g,this.width,this.height,base);}
  return [bx,by,this.hitWidth,this.height];
 }
 destroy(){this.node.destroy();}
}
