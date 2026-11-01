import * as hanyu from './game.mjs';
import * as suspect7 from './suspect7/game.mjs';
export const scriptCatalog=[
 {id:'hanyu',name:'雾灯未眠',tagline:'昨夜，他们都藏起了一件事。',description:'最后一支蜡烛熄灭，山里的怪谈散了场。天亮后，六个人重新围坐，却谁也不敢先说自己看见了什么。你为一位故人而来，有人等着重逢，有人只盼昨夜从未发生。',cover:'art/menu/mist-lantern-v1.png',coverAlt:'雾中的山间神社，一盏未熄的灯',genre:'山中怪谈 · 六个人的秘密'},
 {id:'suspect7',name:'第7号嫌疑人',tagline:'当你开始相信自己的供述，调查才刚刚开始。',description:'一场没有开席的午宴，一栋没有窗户的别墅。先走进嫌疑人的回忆，再换一个身份，检查那些被你相信过的话。六章调查，约2—3小时，随时接续。',cover:'art/suspect7/v2/cover.png',coverAlt:'山中现代别墅、缆车与一张被划改的供述',genre:'现代悬疑 · 六章双重视角'}
];
export const scriptDefinition=id=>id==='suspect7'?suspect7:id==='hanyu'?hanyu:null;
export const stateDefinition=s=>scriptDefinition(s.scriptId||'hanyu');
export const act=(s,input)=>stateDefinition(s).act(s,input);
export const converse=(s,input,generate,options)=>stateDefinition(s).converse(s,input,generate,options);
export const shareEvidence=(s,input,generate)=>s.scriptId==='suspect7'?suspect7.shareEvidence(s,input,generate):hanyu.shareEvidence(s,input,generate);
