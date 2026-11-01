import {randomUUID} from 'node:crypto';
// Public actions only. This journey is also used to prepare isolated visual checkpoints.
export async function journey(send,{stopAt=7,checkpoint=async()=>{}}={}){
 const a=async(type,rest={})=>send({type,...rest,requestId:randomUUID()}),move=room=>a('move',{room}),inspect=async(room,ids)=>{await move(room);for(const id of ids)await a('inspect',{id});};
 await a('begin');await a('hypothesis',{text:'我提前怀疑陈信，但现在还没有足够的证据。'});await a('notes',{text:'玩家旁注：先核实身份，再核实时间。'});
 await inspect('dining',['phone']);await inspect('kitchen',['kitchen']);await inspect('landing',['exit','stairs']);await move('dining');await a('play-call',{id:'call1'});await a('advance');await checkpoint(2);if(stopAt===2)return;
 for(const id of ['andy','franklin','hongxue','vivian','chenxin','licha'])await a('account',{id:id+'-old'});
 await inspect('lounge',['lighter']);await inspect('activity',['toys']);await inspect('chapel',['carpet']);await a('confession');await a('hypothesis',{text:'正门劫匪与地下停车场接应者是两拨人。'});await a('advance');await checkpoint(3);if(stopAt===3)return;
 await a('play-call',{id:'call2'});await a('compare-calls',{first:'responds',second:'continuous'});await move('chapel');await a('vote',{choice:'abstain'});await a('advance');await checkpoint(4);if(stopAt===4)return;
 await inspect('attic',['injury','keypad','toolbox']);await inspect('study',['cane','measure','photo','paternity']);await a('measure');await inspect('garage',['body','key','garage-gate']);await inspect('pool',['temperature','pool-items','outlet']);await inspect('storage',['spare-ball']);await move('attic');await a('unlock',{code:'9426936'});
 await inspect('secret',['console','relay','camera','paint','pump','monitor','autodial','wine','passage']);await a('reconstruct',{order:['load','seal','inflate','transport','release']});await a('hypothesis',{text:'物品和身体必须分别确认，密室里的设备可能改变了表面的经过。'});await a('advance');await checkpoint(5);if(stopAt===5)return;
 await a('account',{id:'chen-after-noon'});
 for(const id of ['wuquan','raven','cuiyuan','xiaoguo','aiyijun'])await a('account',{id:id+'-file'});
 await inspect('meeting',['robbery-file','hong-record','cable','blood','phone-check','no-gas']);
 for(const [quote,evidence] of [['franklin-old','wuquan-file'],['andy-old','raven-file'],['franklin-shadow','hongxue-shadow'],['hongxue-old','wuquan-file']])await a('compare',{quote,evidence});
 await a('provisional',{answers:{sun:'证据不足',ghost:'证据不足',assault:'证据不足',jade:'证据不足'},status:'insufficient',text:'我怀疑陈信，但死者身份和共用手机时间仍待检查。'});await a('advance');await checkpoint(6);if(stopAt===6)return;
 await inspect('meeting',['vivian-record','funds','car-fire','driver','dna']);
 for(const id of ['identity','departure','clock','chen'])await a('report',{id,question:'请用独立材料核查这项疑问，保留无法恢复的部分。'});
 await a('compare',{quote:'vivian-old',evidence:'vivian-record'});await a('compare',{quote:'chenxin-time',evidence:'clock-check'});
 await a('final',{oldAnswers:{sun:'孙强',ghost:'安迪',assault:'孙强',jade:'红雪藏在周雪墓中'},answers:{victim:'洪羽瑞',killer:'陈信',motive:'与洪青合作，摆脱卧底处境并解决经济压力',window:'第一次去教堂：12:45—13:15'},chains:{'body-chain':'dental','clock-chain':'clock-check','vivian-chain':'vivian-record','escape-chain':'passage'},choice:'disclose'});await checkpoint(7);
}
