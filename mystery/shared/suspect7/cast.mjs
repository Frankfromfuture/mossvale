// Public presentation only. Private biographies belong to server/suspect7.
export const people=[
 {id:'andy',name:'安迪',role:'赴宴的青年收藏爱好者',coat:'#a68e70',hair:'#393c39',skin:'#dfbda1',height:1.02,look:'glasses',style:'从容，谈到收藏和机关时语速稍快；不故弄玄虚。'},
 {id:'franklin',name:'富兰克林',role:'来自美国的商人',coat:'#6d7770',hair:'#44403b',skin:'#cfa88c',height:1.08,look:'cane',style:'措辞讲究，习惯先解释消息来源，受质疑时变得简短。'},
 {id:'hongxue',name:'红雪',role:'轻雪拍卖行负责人',coat:'#535d61',hair:'#333c3c',skin:'#e6c4ad',height:1,look:'bob',style:'克制、清楚，谈到养父时停顿；不以冷漠掩盖所有情绪。'},
 {id:'vivian',name:'薇薇安',role:'与安迪同行的网络主播',coat:'#a08caa',hair:'#665045',skin:'#edc5ad',height:.98,look:'long',style:'善于照顾场面，反应快；说到朋友时会急于解释。'},
 {id:'chenxin',name:'陈信',role:'洪青的私人保镖',coat:'#666e64',hair:'#363a34',skin:'#cba788',height:1.13,look:'short',style:'短句，遵守表面的秩序，解释行踪时谨慎；不主动吐露秘密。'},
 {id:'licha',name:'李察',role:'刑侦队长',coat:'#857f71',hair:'#48443c',skin:'#d4b497',height:1.05,look:'stubble',style:'沉稳干脆，常问依据来自哪里；受到证据质疑时不摆架子。'},
 {id:'wuquan',name:'吴全',role:'追查哥哥之死的私家侦探',coat:'#8e8065',hair:'#474238',skin:'#d7b493',height:1.01,look:'stubble',style:'务实，追问一句话的来源，对哥哥的事有些急切。'},
 {id:'raven',name:'拉文',role:'调查走私案的国际刑警',coat:'#637c85',hair:'#79664f',skin:'#e0bd9e',height:1.09,look:'side',style:'条理清楚，分别说明亲见、转述和推测。'},
 {id:'cuiyuan',name:'崔媛',role:'红雪的律师',coat:'#b9aa89',hair:'#393b37',skin:'#e9c9b1',height:.96,look:'ponytail',style:'耐心，措辞准确，常先核对证人有没有亲眼见到。'},
 {id:'xiaoguo',name:'萧过',role:'洪青的姻亲、律师',coat:'#7b8c82',hair:'#494437',skin:'#dbb798',height:1.03,look:'glasses',style:'熟悉家事，起初维护亲人，面对反证愿意重新核查。'},
 {id:'aiyijun',name:'艾义军',role:'退休律师、劫案死者家属',coat:'#8a8b7c',hair:'#aaa69a',skin:'#d8b89b',height:.97,look:'bald',style:'年长而清醒，语速稍缓，谈到儿子仍坚持核对事实。'}
];

// Public art direction: age cues, clothing and resting features, never case secrets.
const appearances={
 andy:{coat:'#aa8759',hairStyle:'tousled',outfit:'knit',shirt:'#566047',glasses:'round',eye:[.128,.026,.028,.039,-.025],brow:[.133,.15,.015,.03]},
 franklin:{coat:'#777868',hairStyle:'curly',outfit:'suit',shirt:'#ebe2cc',tie:'#51493f',glasses:'sun',moustache:true,eye:[.13,.023,.029,.027,.03],brow:[.14,.135,.019,.08]},
 hongxue:{coat:'#586577',hairStyle:'bob',outfit:'blazer',shirt:'#eee3cc',earrings:'pearl',eye:[.132,.03,.028,.025,.09],brow:[.137,.15,.011,.05]},
 vivian:{coat:'#a493b0',hairStyle:'waves',outfit:'cardigan',shirt:'#eee2cc',earrings:'drop',eye:[.135,.026,.033,.038,-.06],brow:[.14,.155,.012,-.04]},
 chenxin:{coat:'#747866',hairStyle:'crew',outfit:'jacket',shirt:'#44483e',eye:[.126,.017,.03,.022,.08],brow:[.134,.135,.022,.11],shoulders:1.1},
 licha:{coat:'#998166',hairStyle:'swept',outfit:'jacket',shirt:'#ece1c9',greyTemples:true,stubble:true,eye:[.13,.015,.029,.022,.03],brow:[.14,.137,.019,.07]},
 wuquan:{coat:'#a38a60',hairStyle:'tousled',outfit:'jacket',shirt:'#67705c',stubble:true,book:true,eye:[.137,.012,.028,.03,-.1],brow:[.142,.135,.019,-.02]},
 raven:{coat:'#697e92',hairStyle:'side',outfit:'suit',shirt:'#e8e1ce',tie:'#555347',book:true,eye:[.124,.023,.031,.03,.05],brow:[.13,.145,.016,.04]},
 cuiyuan:{coat:'#b5a17b',hairStyle:'ponytail',outfit:'blazer',shirt:'#f0e6d1',book:true,eye:[.13,.029,.028,.033,-.04],brow:[.138,.152,.011,-.025]},
 xiaoguo:{coat:'#8b9a83',hairStyle:'side',outfit:'suit',shirt:'#eee4cf',tie:'#82705d',glasses:'square',eye:[.126,.026,.027,.027,.04],brow:[.134,.147,.014,.06]},
 aiyijun:{coat:'#8a907b',hairStyle:'receding',outfit:'cardigan',shirt:'#e8ddc6',ageLines:true,eye:[.137,.01,.028,.023,-.08],brow:[.144,.135,.017,-.07]}
};
for(const p of people){const a=appearances[p.id];Object.assign(p,a,{description:p.role+'；'+p.style,features:{eye:a.eye,brow:[...a.brow,[[-.06,-.004],[0,.012],[.063,-.003]]]}});delete p.eye;delete p.brow;}
export const person=id=>people.find(p=>p.id===id);
export const routes=[['andy','wuquan'],['franklin','raven'],['hongxue','cuiyuan'],['vivian','xiaoguo'],['chenxin','aiyijun'],['licha','licha']].map(([id,investigator])=>({id,investigator,name:person(id).name+' → '+person(investigator).name}));
