// All monetary values are integer hundredths of a town coin.
export const BUSINESS_DEFS = [
 {id:'cafe',name:'苔间咖啡馆',place:'cafe',owner:'lin',workers:['lin','wen'],products:['bread','coffee'],station:'cafe-machine',activity:'tea'},
 {id:'library',name:'风页书屋',place:'library',owner:'xu',workers:['xu'],products:['book','reading'],station:'library-shelf-1',activity:'read'},
 {id:'shop',name:'松果杂货铺',place:'shop',owner:'zhou',workers:['zhou'],products:['provisions'],station:'shop-counter',activity:'shop'},
 {id:'studio',name:'拾光工坊',place:'studio',owner:'chen',workers:['chen'],products:['souvenir','bed','lamp','desk','armchair','sofa','shelf','rug'],station:'studio-workbench',activity:'craft'},
 {id:'garden',name:'花圃苗圃',place:'garden',owner:'tang',workers:['tang','gu','shen'],products:['bouquet','pot'],station:'garden-flowers-1',activity:'garden'},
 {id:'clinic',name:'社区诊所',place:'clinic',owner:'su',workers:['su'],products:['care'],station:'clinic-counter',activity:'rest'},
 {id:'photo',name:'陆野旅拍',place:'park',owner:'lu',workers:['lu'],products:['photo'],station:'garden-bench',activity:'watch'},
 {id:'music',name:'阿澈音乐',place:'square',owner:'a',workers:['a'],products:['music'],station:'street-bench',activity:'music'}
];
export const GOODS = {
 flour:{name:'面粉',import:60,wholesale:100},beans:{name:'咖啡豆',import:70,wholesale:110},wood:{name:'木料',import:100,wholesale:160},paper:{name:'书纸',import:100,wholesale:160},seed:{name:'种苗材料',import:30,wholesale:60},cloth:{name:'布料',import:80,wholesale:130},
 bread:{name:'面包',price:400,recipe:{flour:1},yield:2,minutes:35,tags:['food','breakfast']},
 coffee:{name:'咖啡',price:350,recipe:{beans:1},yield:2,minutes:25,tags:['food','reading']},
 book:{name:'小镇故事册',price:600,recipe:{paper:1},yield:1,minutes:40,tags:['books','story']},
 provisions:{name:'旅行点心',price:300,import:100,tags:['food','travel']},
 souvenir:{name:'木雕纪念品',price:700,recipe:{wood:1},yield:1,minutes:45,tags:['craft','travel']},
 bouquet:{name:'鲜花',price:450,recipe:{seed:1},yield:2,minutes:45,tags:['nature','flowers']},
 reading:{name:'书屋阅读',price:300,service:true,minutes:30,tags:['books','reading']},
 care:{name:'旅途照护',price:500,service:true,minutes:25,tags:['rest']},
 photo:{name:'小镇旅拍',price:800,service:true,minutes:35,tags:['photo','travel']},
 music:{name:'小型演奏',price:400,service:true,minutes:30,tags:['music','rest']},
 bed:{name:'单人床',price:6000,recipe:{wood:3,cloth:1},yield:1,minutes:90,defId:'bed',business:'studio'},
 lamp:{name:'提灯',price:2000,recipe:{wood:1},yield:1,minutes:40,defId:'lamp',business:'studio'},
 desk:{name:'小方桌',price:2500,recipe:{wood:2},yield:1,minutes:50,defId:'desk',business:'studio'},
 armchair:{name:'靠背椅',price:1800,recipe:{wood:1,cloth:1},yield:1,minutes:50,defId:'armchair',business:'studio'},
 sofa:{name:'双人沙发',price:8000,recipe:{wood:3,cloth:3},yield:1,minutes:100,defId:'sofa',business:'studio'},
 shelf:{name:'书架',price:7000,recipe:{wood:4},yield:1,minutes:100,defId:'shelf',business:'studio'},
 rug:{name:'地毯',price:3500,recipe:{cloth:2},yield:1,minutes:60,defId:'rug',business:'studio'},
 pot:{name:'盆栽',price:1800,recipe:{seed:2},yield:1,minutes:70,defId:'pot',business:'garden'}
};
export const CONCEPTS={
 cafe:[{id:'breakfast',name:'邻里早餐',tags:['food','breakfast'],products:['bread','coffee'],description:'多做面包，照顾居民早饭与早到的游客。'},{id:'reading',name:'阅读咖啡',tags:['books','reading'],products:['coffee','bread'],description:'咖啡优先，喜欢安静阅读的游客更愿意停留。',requires:'book'},{id:'travel',name:'游客茶歇',tags:['travel','food'],products:['coffee','bread'],description:'旅途中歇脚喝咖啡，面向观光客。'}],
 library:[{id:'reading',name:'旧书阅读',tags:['books','reading'],products:['reading','book'],description:'提供安静的阅读位置，兼售故事册。'},{id:'story',name:'本地故事',tags:['story','travel'],products:['book','reading'],description:'优先整理、销售小镇故事册。'}],
 shop:[{id:'daily',name:'日常补给',tags:['food'],products:['provisions'],description:'优先给居民和工坊补充日用原料。'},{id:'travel',name:'旅行杂货',tags:['travel','food'],products:['provisions'],description:'提高旅行点心备货，吸引观光客。'}],
 studio:[{id:'furniture',name:'实用家具',tags:['craft'],products:['bed','lamp','desk','armchair','sofa','shelf','rug','souvenir'],description:'家具订单优先，帮助酒店逐间开业。'},{id:'souvenir',name:'本地纪念品',tags:['travel','craft'],products:['souvenir','bed','lamp','desk','armchair','sofa','shelf','rug'],description:'优先制作小木雕，兼顾家具订单。'}],
 garden:[{id:'seedling',name:'种苗花店',tags:['nature'],products:['pot','bouquet'],description:'优先育苗与盆栽，帮助酒店布置绿植。'},{id:'flowers',name:'庭院花艺',tags:['flowers','nature'],products:['bouquet','pot'],description:'优先制作花束，吸引赏花的游客。'}]
};
export const MILESTONES=[['guest','接待第一位住客'],['review','收到第一条住客评价'],['invite','邀请村民来酒店'],['improve','改善基础客房'],['rooms','四间客房全部营业'],['profit','连续三天对外收支为正']];
export const FURNITURE=Object.entries(GOODS).filter(([,g])=>g.defId).map(([id,g])=>({id,...g}));
export const DEFAULTS={taxRate:.1,mayorShare:.2,minuteMs:2500,leaseMinutes:12,conceptCost:2000};
