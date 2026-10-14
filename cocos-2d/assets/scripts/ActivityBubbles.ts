import {art,artIcon,artReady} from './UiArt';
import {GRID_UI,UI,uiColor} from './VillageUi';
import {Node,UITransform,Graphics,Color,Layers} from 'cc';
type Status={icon:string;label:string;phase:string;activityIcon?:string};
/** Small native pictograms, redrawn only when the actual server task changes. */
export class ActivityBubbles {
 private entries=new Map<string,{node:Node;g:Graphics;key:string}>();
 constructor(private parent:Node){}
 show(id:string,x:number,y:number,status:Status|undefined,visible:boolean){
  let e=this.entries.get(id);
  if(!e){if(!visible||!status)return;const node=new Node('Activity '+id);node.parent=this.parent;node.layer=Layers.Enum.UI_2D;node.addComponent(UITransform).setContentSize(48,36);e={node,g:node.addComponent(Graphics),key:''};this.entries.set(id,e);}
  e.node.active=visible&&!!status;if(!e.node.active)return;
  if(Math.abs(e.node.position.x-x)>.1||Math.abs(e.node.position.y-y)>.1)e.node.setPosition(x,y);
  const walking=status!.phase==='walking',icon=walking?status!.activityIcon||'walk':status!.icon,key=icon+':'+walking;
  if(key===e.key)return;e.key=key;const g=e.g;g.clear();
  if(GRID_UI&&artReady()){
   art(e.node,'tail',13,9,'Activity tail')!.setPosition(0,-20);art(e.node,'paper',48,38,'Activity paper');
   artIcon(e.node,icon,29)!.setPosition(walking?5:0,0);
   const arrow=artIcon(e.node,'next',12,'Walking arrow')!;arrow.active=walking;arrow.setPosition(-16,0);return;
  }
  g.lineWidth=1.3;g.fillColor=GRID_UI?uiColor(UI.paper):new Color(5,5,5,255);g.strokeColor=GRID_UI?uiColor(UI.border):new Color(216,220,212,255);
  // One continuous outline, including the short tail towards the resident.
  g.moveTo(-17,-17);g.lineTo(-4,-17);g.lineTo(0,-23);g.lineTo(4,-17);g.lineTo(17,-17);g.quadraticCurveTo(24,-17,24,-10);g.lineTo(24,10);g.quadraticCurveTo(24,17,17,17);g.lineTo(-17,17);g.quadraticCurveTo(-24,17,-24,10);g.lineTo(-24,-10);g.quadraticCurveTo(-24,-17,-17,-17);g.close();g.fill();g.stroke();
  g.lineWidth=1.6;g.fillColor=GRID_UI?uiColor(UI.ink):new Color(226,230,220,255);const offset=walking?5:0;
  const line=(points:number[][])=>{g.moveTo(points[0][0]+offset,points[0][1]);for(const p of points.slice(1))g.lineTo(p[0]+offset,p[1]);g.stroke();};
  const circle=(x:number,y:number,r:number,fill=false)=>{g.circle(x+offset,y,r);fill?g.fill():g.stroke();};
  const rect=(x:number,y:number,w:number,h:number)=>{g.rect(x+offset,y,w,h);g.stroke();};
  if(walking){g.moveTo(-18,-4);g.lineTo(-12,0);g.lineTo(-18,4);g.stroke();}
  if(['read','study'].includes(icon)){line([[-11,-7],[-11,9],[-2,7],[0,5],[2,7],[11,9],[11,-7],[2,-9],[0,-7],[-2,-9],[-11,-7]]);line([[0,5],[0,-7]]);}
  else if(icon==='write'){rect(-9,-10,15,20);line([[-5,4],[1,4]]);line([[-5,0],[-1,0]]);line([[0,-6],[3,-5],[12,7],[9,9],[0,-3],[0,-6]]);}
  else if(icon==='tea'){line([[-9,5],[-9,-5],[-6,-8],[5,-8],[8,-5],[8,5],[-9,5]]);line([[8,3],[12,3],[12,-3],[8,-3]]);line([[-12,-11],[10,-11]]);line([[-3,8],[-1,11]]);}
  else if(icon==='garden'){line([[0,-11],[0,8]]);line([[0,1],[-8,2],[-11,9],[-4,8],[0,1]]);line([[0,-4],[9,-1],[11,6],[4,4],[0,-4]]);}
  else if(icon==='music'){line([[-5,-6],[-5,9],[8,12],[8,-3]]);circle(-8,-7,3,true);circle(5,-4,3,true);}
  else if(icon==='craft'){line([[-8,-10],[2,5],[5,3],[-5,-12],[-8,-10]]);line([[-2,7],[1,11],[11,4],[8,0],[-2,7]]);}
  else if(icon==='shop'){rect(-10,-10,20,18);line([[-5,8],[-5,12],[5,12],[5,8]]);}
  else if(['observe','camera'].includes(icon)){rect(-12,-8,24,17);circle(0,0,6);line([[-7,9],[-5,12],[4,12],[6,9]]);}
  else if(icon==='care'){line([[-4,11],[4,11],[4,4],[11,4],[11,-4],[4,-4],[4,-11],[-4,-11],[-4,-4],[-11,-4],[-11,4],[-4,4],[-4,11]]);}
  else if(icon==='clean'){line([[1,-1],[8,12]]);line([[-2,1],[5,-3],[3,-12],[-12,-5],[-2,1]]);line([[-5,-2],[-8,-7]]);}
  else if(icon==='key'){circle(-6,5,5);line([[-2,1],[10,-11],[12,-9]]);line([[7,-8],[10,-5]]);}
  else if(icon==='meal'){circle(0,0,8);line([[-13,10],[-13,-11]]);line([[13,10],[13,-11]]);line([[-16,10],[-16,4],[-10,4],[-10,10]]);}
  else if(icon==='sleep'){line([[-11,2],[-11,-9],[11,-9],[11,1],[-11,1]]);line([[-11,-9],[-11,-12]]);line([[11,-9],[11,-12]]);line([[0,12],[7,12],[0,5],[7,5]]);}
  else if(icon==='walk'){circle(1,9,3);line([[0,5],[-3,-2],[3,-6],[5,-12]]);line([[-3,-2],[-9,-11]]);line([[-1,3],[7,-1]]);line([[-2,3],[-9,0]]);}
  else if(icon==='chat'){rect(-11,-6,22,15);circle(-5,2,1,true);circle(0,2,1,true);circle(5,2,1,true);line([[-5,-6],[-7,-11],[0,-6]]);}
  else {line([[-9,10],[-9,-5],[9,-5],[9,4]]);line([[-11,-5],[-11,-12]]);line([[9,-5],[9,-12]]);line([[-9,3],[5,3]]);}
 }
 at(x:number,y:number){for(const [id,e] of this.entries)if(e.node.active&&Math.abs(x-e.node.position.x)<25&&Math.abs(y-e.node.position.y)<19)return id;return '';}
 remove(id:string){this.entries.get(id)?.node.destroy();this.entries.delete(id);}
}
