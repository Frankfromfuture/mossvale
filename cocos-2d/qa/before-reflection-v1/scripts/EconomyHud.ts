import {Node,UITransform,Label,Graphics,Color,Layers} from 'cc';
import {TownState} from './TownApi';
type Row={title:string;detail?:string;run?:()=>void};
type Actions={command:(action:string,payload?:Record<string,unknown>)=>void;place:(id:string)=>void;navigate:(id:string)=>void;closeDialogue:()=>void};
const coin=(n:number)=>(n/100).toFixed(2).replace(/\.00$/,'');
/** One native, on-demand ledger; all transactions are submitted as server intents. */
export class EconomyHud {
 private panel:Node|null=null;private state:TownState|null=null;private mode='overview';private id='';private page=0;
 private width=390;private height=844;private held=false;private dirty=false;private title='';private period:'today'|'total'='today';private financeOrigin='people-finance';
 constructor(private parent:Node,private actions:Actions){}
 get isOpen(){return !!this.panel;}
 setState(state:TownState){this.state=state;if(this.panel)this.dirty=true;}
 resize(width:number,height:number){this.width=width;this.height=height;if(this.panel)this.dirty=true;}
 tick(){if(this.dirty&&!this.held&&this.panel){this.dirty=false;this.draw();}}
 close(){this.panel?.destroy();this.panel=null;this.held=false;this.dirty=false;}
 show(mode='overview',id=''){this.actions.closeDialogue();this.mode=mode;this.id=id;this.page=0;this.draw();}
 private node(name:string,parent:Node,x:number,y:number,w:number,h:number){const n=new Node(name);n.parent=parent;n.layer=Layers.Enum.UI_2D;n.addComponent(UITransform).setContentSize(w,h);n.setPosition(x,y);return n;}
 private label(parent:Node,text:string,x:number,y:number,w:number,h:number,size=15){const n=this.node(text.slice(0,24),parent,x,y,w,h),l=n.addComponent(Label);l.string=text;l.fontFamily='monospace';l.fontSize=size;l.lineHeight=size+6;l.color=new Color(230,232,226,255);l.horizontalAlign=Label.HorizontalAlign.LEFT;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;l.enableWrapText=true;return l;}
 private button(parent:Node,title:string,x:number,y:number,w:number,h:number,run:()=>void){
  const n=this.node(title,parent,x,y,w,h);this.label(n,title,0,0,w-10,h,15).horizontalAlign=Label.HorizontalAlign.CENTER;
  let pressed=false;n.on(Node.EventType.TOUCH_START,e=>{e.propagationStopped=true;pressed=true;this.held=true;});n.on(Node.EventType.TOUCH_MOVE,e=>{e.propagationStopped=true;});
  n.on(Node.EventType.TOUCH_CANCEL,()=>{pressed=false;this.held=false;});n.on(Node.EventType.TOUCH_END,e=>{e.propagationStopped=true;const ok=pressed;pressed=false;this.held=false;if(ok)run();});return n;
 }
 private rows():Row[]{
  const w=this.state,e=w?.economy;if(!w||!e){this.title='小镇';return [{title:'正在读取经营情况…'}];}
  const open=(mode:string,id='')=>()=>this.show(mode,id);
  const command=(action:string,payload:Record<string,unknown>)=>()=>this.actions.command(action,payload);
  const report=e.report,periodLabel=this.period==='today'?'今日':'累计';
  const period:Row={title:`统计范围：${periodLabel}`,detail:`第 ${report?.day||1} 天 · 轻点切换今日 / 累计`,run:()=>{this.period=this.period==='today'?'total':'today';this.page=0;this.draw();}};
  if(['economy-system','people-finance','person-finance','villagers','villager','town-businesses','business-finance','account-ledger'].includes(this.mode)&&!report){this.title='小镇系统';return [{title:'正在读取小镇数据…'}];}
  if(this.mode==='economy-system'){
   const d=report![this.period];this.title='经济系统';return [period,
    {title:`${periodLabel}对外净收入 ${coin(d.externalIn-d.externalOut)} 币`,detail:`游客收入 ${coin(d.externalIn)} · 镇外支出 ${coin(d.externalOut)}`},
    {title:'每个人的工作与收支',detail:`村长与 ${w.residents.length} 位村民 · 查看工资、消费和余额`,run:open('people-finance')},
    {title:'店铺与酒店账目',detail:'各经营主体的资金、收入和支出',run:open('town-businesses')},
    {title:`镇内资金 ${coin(report!.localCash)} 币`,detail:`含待发工资 · 公共资金 ${coin(e.treasury)} 币`},
    {title:`${periodLabel}税款 ${coin(d.tax)} 币`,detail:`实际已付工资 ${coin(d.wages)} · 镇内转账不计对外收入`},
    {title:`酒店净收支 ${coin(d.hotelRevenue-d.hotelCosts)} 币`,detail:`住宿收入 ${coin(d.hotelRevenue)} · 经营支出 ${coin(d.hotelCosts)}`},
    {title:`${periodLabel}到访 ${d.visitors} 人`,detail:`当前在镇 ${w.visitors?.length||0} 人 · 吸引力 ${e.attractiveness.score}`,run:open('visitors')},
    {title:'逐笔交易账本',detail:'查看最近发生的付款与收款',run:open('ledger')}
   ];
  }
  if(this.mode==='people-finance'){
   this.title='工作与收支';return [period,...report!.people.map(p=>{const f=p[this.period];return {title:`${p.code} ${p.name}`,detail:`${p.job}\n收入 ${coin(f.income)} · 支出 ${coin(f.expense)}`,run:()=>{this.financeOrigin='people-finance';this.show('person-finance',p.id);}};})];
  }
  if(this.mode==='person-finance'){
   const p=report!.people.find(p=>p.id===this.id);if(!p)return [];const f=p[this.period];this.title=`${p.name}的收支`;return [period,
    {title:p.job,detail:`${p.workplace} · 当前${p.action}`},
    {title:`个人余额 ${coin(p.balance)} 币`,detail:`${periodLabel}收入 ${coin(f.income)} · 支出 ${coin(f.expense)}`},
    {title:`劳动收入 ${coin(f.wages)} 币`,detail:`经营所得 ${coin(f.ownerIncome)} · 税收分成 ${coin(f.taxShare)}`},
    {title:`生活与购置支出 ${coin(f.expense)} 币`,detail:'按实际成交记账；期初资金不算收入'},
    {title:`转入 ${coin(f.transferIn)} · 转出 ${coin(f.transferOut)} 币`,detail:'酒店投入和提取单独列示，不重复算收入支出'},
    {title:'最近收支明细',detail:'查看本人的最近 12 笔资金变动',run:open('account-ledger','person:'+p.id)},
    {title:'查看人物档案',run:open('villager',p.id)}
   ];
  }
  if(this.mode==='villagers'){
   this.title='村民系统';return [{title:`常住 ${report!.people.length} 人`,detail:'点名字查看档案、日常习惯与当前工作'},...report!.people.map(p=>({title:`${p.code} ${p.name}${p.age==null?'':` · ${p.age} 岁`}`,detail:`${p.job}\n现在：${p.action}`,run:open('villager',p.id)}))];
  }
  if(this.mode==='villager'){
   const p=report!.people.find(p=>p.id===this.id);if(!p)return [];const f=p[this.period];this.title=`${p.code} ${p.name}`;return [
    {title:p.age==null?'村长 · 年龄未设定':`${p.age} 岁 · ${p.job}`,detail:`工作地点：${p.workplace}`},
    {title:'现在的动作',detail:`${p.action}${p.task&&p.task!==p.action?' · '+p.task:''}`},
    {title:`性格：${p.tags.join('、')}`,detail:p.personality},
    {title:`${periodLabel}收入 ${coin(f.income)} · 支出 ${coin(f.expense)}`,detail:`个人余额 ${coin(p.balance)} 币 · 轻点查看详细账目`,run:()=>{this.financeOrigin='villager';this.show('person-finance',p.id);}},
    ...p.habits.map(h=>({title:`日常习惯 · ${h.time}`,detail:h.text})),
    {title:'习惯来自人物设定',detail:'当前动作按实际生活更新，会随工作和需要变化。'}
   ];
  }
  if(this.mode==='town-businesses'){
   this.title='店铺与酒店账目';return [period,...report!.businesses.map(b=>({title:b.name,detail:`${periodLabel}收入 ${coin(b[this.period].income)} · 支出 ${coin(b[this.period].expense)} · 余 ${coin(b.balance)}`,run:open('business-finance',b.id)}))];
  }
  if(this.mode==='business-finance'){
   const b=report!.businesses.find(b=>b.id===this.id);if(!b)return [];const f=b[this.period];this.title=b.name;return [period,
    {title:b.status,detail:`工作人员：${b.workers.join('、')}`},
    {title:`经营资金 ${coin(b.balance)} 币`,detail:`${periodLabel}收入 ${coin(f.income)} · 支出 ${coin(f.expense)}`},
    {title:`净收支 ${coin(f.income-f.expense)} 币`,detail:'支出含预留劳动报酬；取消工作后退回'},
    {title:`资金转入 ${coin(f.transferIn)} · 转出 ${coin(f.transferOut)}`,detail:'期初资本与经营者转账另计'},
    {title:'最近收支明细',run:open('account-ledger','biz:'+b.id)}
   ];
  }
  if(this.mode==='account-ledger'){
   const personal=this.id.startsWith('person:'),id=this.id.split(':')[1],a=personal?report!.people.find(p=>p.id===id):report!.businesses.find(b=>b.id===id);this.title=`${a?.name||''} · 明细`;
   const rows=(a?.recent||[]).filter(t=>this.period==='total'||Math.floor(t.at/1440)+1===report!.day).slice().reverse().map(t=>({title:`${t.incoming?'＋':'−'}${coin(t.amount)} 币 · ${['deposit','withdraw'].includes(t.kind)?'转账':t.kind==='refund'?'退款':t.incoming?'收入':'支出'}`,detail:`第${Math.floor(t.at/1440)+1}天 ${String(Math.floor(t.at%1440/60)).padStart(2,'0')}:${String(t.at%60).padStart(2,'0')} · ${t.description}`}));
   return [period,...(rows.length?rows:[{title:'这段时间还没有资金变动',detail:'实际发生收入或支出后会记在这里。'}])];
  }
  if(this.mode==='overview'){
   this.title='村长手记';return [
    {title:`个人 ${coin(e.wallet)} 币 · 镇公共资金 ${coin(e.treasury)} 币`,detail:'个人钱包与公共资金分别记账'},
    {title:'我的小酒店',detail:`${e.hotel.rooms.filter(r=>r.ready).length}/4 间营业 · 经营资金 ${coin(e.hotelBalance)} 币`,run:open('hotel')},
    {title:`小镇吸引力 ${e.attractiveness.score}`,detail:`现在有 ${w.visitors?.length||0} 位游客`,run:open('attraction')},
    {title:'找些有报酬的杂活',detail:e.playerTask?.label||`${e.chores.filter(j=>j.status==='open').length} 件待办`,run:open('jobs')},
    {title:'游客近况',detail:'在镇游客与最近离镇的消费记录',run:open('visitors')},{title:'店铺与经营概念',run:open('shops')},{title:'成长目标',run:open('goals')},{title:'经济系统',run:open('economy-system')},{title:'村民系统',run:open('villagers')},{title:'收支账本',run:open('ledger')},{title:'离开期间',run:open('offline')}
   ];
  }
  if(this.mode==='hotel'){
   this.title='苔溪小酒店';return [
    {title:`经营资金 ${coin(e.hotelBalance)} 币`,detail:`茶点 ${e.hotel.snacks} 份 · 村民兼职自动接待与打扫`},
    {title:'买家具',detail:'从镇内店铺购入，先放进仓库',run:open('furniture')},
    {title:`酒店仓库 · ${e.warehouse.length} 件`,detail:'选择家具，再轻点室内落点',run:open('warehouse')},
    ...e.hotel.rooms.map(r=>({title:`${r.name}号房 · ${r.guest?'有住客':r.ready?'可以入住':'待布置'}`,detail:`${r.reason} · 舒适 ${r.comfort} · 房费 ${coin(r.price)} 币`})),
    {title:'邀请村民来做客',detail:'傍晚有空时来，茶点由酒店承担',run:open('invite')},
    {title:'客人的反馈',detail:e.hotel.reviews.at(-1)?.text||'等待第一位客人的体验',run:open('reviews')},
    {title:'投入 20 镇币',detail:'个人钱包 → 酒店经营资金',run:command('transfer',{direction:'deposit',amount:20})},
    {title:'提取 20 镇币',detail:'酒店经营资金 → 个人钱包',run:command('transfer',{direction:'withdraw',amount:20})}
   ];
  }
  if(this.mode==='furniture'){
   this.title='购置家具';return e.furniture.map(g=>({title:`${g.name} · ${coin(g.price)} 币`,detail:`${g.size.w}m × ${g.size.d}m · 库存 ${g.stock}`,run:open('buy',g.id)}));
  }
  if(this.mode==='buy'){
   const g=e.furniture.find(x=>x.id===this.id)!;this.title=g.name;return [{title:`价格 ${coin(g.price)} 镇币`,detail:`尺寸 ${g.size.w}m × ${g.size.d}m`},{title:`你的钱包 ${coin(e.wallet)} 镇币`},{title:g.stock?'买入酒店仓库':'请店主补货',detail:g.stock?'购买后可随时摆放':'补货不扣款，制作完成后再购买',run:command('buy',{product:g.id})}];
  }
  if(this.mode==='warehouse'){
   this.title='酒店仓库';return e.warehouse.length?e.warehouse.map(o=>({title:`${o.code} ${o.name}`,detail:'站在要布置的房间附近，再选择摆放',run:()=>{this.close();this.actions.place(o.id);}})):[{title:'仓库里暂时没有家具',detail:'可以购买，也可以长按酒店家具收入仓库。'}];
  }
  if(this.mode==='jobs'){
   this.title='有报酬的杂活';return [...(e.playerTask?[{title:`正在${e.playerTask.label}`,detail:'走到工作位置后才开始计时',run:e.playerWorking?command('cancel-job',{}):undefined}]:[]),...e.chores.map(j=>({title:`${j.label} · ${coin(j.pay)} 币`,detail:j.status==='open'?'轻点接下，村长自动走过去完成':'已经有人在做',run:j.status==='open'?command('job',{job:j.id}):undefined})),...(!e.chores.length?[{title:'暂时没有待办',detail:'清洁、维修和补货需要出现时会列在这里。'}]:[])];
  }
  if(this.mode==='invite'){
   this.title='邀请村民';return w.residents.map(r=>{const invitation=e.hotel.invitations.filter(i=>i.resident===r.id).at(-1);return {title:r.name,detail:invitation?({accepted:'答应忙完后来',arriving:'正在来酒店',visited:'已经来过',declined:'今天想休息'})[invitation.status]||r.action:r.action,run:command('invite',{resident:r.id})};});
  }
  if(this.mode==='reviews'){this.title='客人说过的话';return e.hotel.reviews.length?e.hotel.reviews.slice().reverse().map(r=>({title:`${r.name} · ${r.rating}/5`,detail:r.text})):[{title:'还没有评价',detail:'客人实际使用设施后会留下感受。'}];}
  if(this.mode==='shops'){
   this.title='小镇店铺';return e.businesses.map(b=>({title:`${b.name} · ${b.status}`,detail:`经营资金 ${coin(b.balance)} 币`,run:open('shop',b.id)}));
  }
  if(this.mode==='shop'){
   const b=e.businesses.find(b=>b.id===this.id);if(!b)return [];this.title=b.name;return [{title:`经营资金 ${coin(b.balance)} 镇币`,detail:`当前：${b.concepts.find(c=>c.id===b.concept)?.name||'职业服务'}${b.pendingConcept?' · 正在准备更换':''}`},...b.concepts.map(c=>({title:c.name+(c.id===b.concept?' · 当前':''),detail:`${c.description} 换装 ${coin(c.cost)} 币`,run:c.id!==b.concept?command('concept',{business:b.id,concept:c.id}):undefined})),{title:'去店里看看',run:()=>{this.close();this.actions.navigate(b.place);}}];
  }
  if(this.mode==='attraction'){
   this.title=`吸引力 ${e.attractiveness.score} / 100`;return [...e.attractiveness.parts.map(p=>({title:`${p.name} ${p.value} / ${p.max}`,detail:p.reason})),{title:`每日游客需求 ${2+Math.floor(e.attractiveness.score/10)} 人`,detail:'实际到访还受接待容量影响；吸引力也会提高游客预算。'}];
  }
  if(this.mode==='visitors'){this.title='游客近况';return [...(w.visitors||[]).map(v=>({title:`${v.code} ${v.name} · 在镇`,detail:`${v.action} · 已消费 ${coin(v.spent||0)} 币`})),...e.visitorHistory.slice().reverse().map(v=>({title:`${v.name} · 已离镇`,detail:`消费 ${coin(v.spent)} 币 · ${v.rating}/5${v.stayed?' · 住过酒店':''} · ${v.purchases.map(p=>p.name).join('、')}`}))];}
  if(this.mode==='goals'){this.title='小镇的成长';return e.milestones.map(m=>({title:`${m.done?'✓':'○'} ${m.name}`,detail:m.done?'已经做到':'随实际经营进展完成'}));}
  if(this.mode==='ledger'){
   this.title='小镇账本';return [...e.days.slice().reverse().map(d=>({title:`第 ${d.day+1} 天 · 对外净收入 ${coin(d.externalIn-d.externalOut)}`,detail:`游客消费 ${coin(d.externalIn)} · 镇外采购 ${coin(d.externalOut)} · 税 ${coin(d.tax)}`})),...e.ledger.slice().reverse().map(t=>({title:`${coin(t.amount)} 币 · ${t.fromName} → ${t.toName}`,detail:t.description}))];
  }
  if(this.mode==='offline'){
   const s=e.offlineSummary;this.title='离开期间';return !s||s.to<=s.from?[{title:'刚刚回到小镇',detail:'之后回来时，这里会记录实际发生的收支。'}]:[{title:`小镇走过 ${Math.floor((s.to-s.from)/60)} 个小时`},{title:`劳动所得 ${coin(s.labor)} 镇币`},{title:`税收分成 ${coin(s.share)} 镇币`},{title:`酒店净收支 ${coin(s.hotelNet)} 镇币`},{title:`个人支出 ${coin(s.spending)} 镇币`},...s.visits.map(v=>({title:v.name,detail:v.text}))];
  }
  return [];
 }
 private back(){
  if(this.mode==='account-ledger'){const [kind,id]=this.id.split(':');this.show(kind==='person'?'person-finance':'business-finance',id);return;}
  if(this.mode==='person-finance'){this.show(this.financeOrigin,this.financeOrigin==='villager'?this.id:'');return;}
  const parents:Record<string,string>={'economy-system':'overview','people-finance':'economy-system','town-businesses':'economy-system','business-finance':'town-businesses','villagers':'overview','villager':'villagers'};
  this.show(parents[this.mode]||(this.mode==='overview'?'hotel':this.mode==='buy'?'furniture':['warehouse','furniture','invite','reviews'].includes(this.mode)?'hotel':'overview'));
 }
 private draw(){
  this.panel?.destroy();const rows=this.rows(),narrow=this.width<560,h=Math.max(220,Math.min(670,this.height-(narrow?144:84))),w=Math.min(350,this.width-24),n=this.node('Town economy ledger',this.parent,0,narrow?-48:0,w,h);this.panel=n;
  const g=n.addComponent(Graphics);g.fillColor=new Color(4,4,4,255);g.strokeColor=new Color(145,145,145,255);g.lineWidth=1;g.rect(-w/2,-h/2,w,h);g.fill();g.stroke();
  this.label(n,this.title,-4,h/2-30,w-114,32,19).horizontalAlign=Label.HorizontalAlign.CENTER;
  this.button(n,'×',w/2-26,h/2-29,44,44,()=>this.close());
  this.button(n,'‹',-w/2+25,h/2-29,44,44,()=>this.back());
  const rowHeight=76,size=Math.max(2,Math.floor((h-112)/rowHeight)),count=Math.max(1,Math.ceil(rows.length/size));this.page=Math.min(this.page,count-1);
  rows.slice(this.page*size,(this.page+1)*size).forEach((row,i)=>{
   const y=h/2-87-i*rowHeight,button=this.button(n,'',0,y,w-26,70,()=>row.run?.());button.name=row.title;
   this.label(button,row.title+(row.run?'  ›':''),0,18,w-44,28,15);
   if(row.detail){const l=this.label(button,row.detail,0,-15,w-44,42,12);l.color=new Color(165,165,165,255);}
   g.strokeColor=new Color(50,50,50,255);g.moveTo(-w/2+17,y-37);g.lineTo(w/2-17,y-37);g.stroke();
  });
  this.button(n,'‹',-95,-h/2+28,70,44,()=>{if(this.page>0){this.page--;this.draw();}});
  this.label(n,`${this.page+1} / ${count}`,0,-h/2+28,70,30,13).horizontalAlign=Label.HorizontalAlign.CENTER;
  this.button(n,'›',95,-h/2+28,70,44,()=>{if(this.page<count-1){this.page++;this.draw();}});
  n.setSiblingIndex(this.parent.children.length-1);
 }
}
