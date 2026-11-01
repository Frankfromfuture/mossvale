import {playerId} from '../shared/player.mjs';
import {caseProgress} from './case-story.mjs';

// Keep unreached scenes on the server. A character's private memories do not
// unlock the public identity scene; only the completed reveal does.
export function interludesFor(s){
 const has=(...ids)=>ids.every(id=>s.found.includes(id)),role=playerId(s),scenes=[];
 const add=(id,title,panels,action)=>scenes.push({id,title,pages:panels.map(([caption,text],panel)=>({chapter:'幕间 · '+title,title:caption,image:`interlude-${id}-v1.png`,panel,caption,paragraphs:[text],foot:panel===3?'这一页留在「故事」里，随时可以回来翻看。':''})),action});
 if(has('body'))add('ashes','炉火留下的东西',[
  ['铜炉旁','你在铜炉旁停下来。昨夜留在这里的东西，已经记进手记。'],
  ['灰烬之间','遗骸就在眼前。它与昨夜的遭遇怎样相连，还要向在场的人核对。'],
  ['记下所见',role==='miyazaki'?'你知道自己往炉里放过什么。现在，众人需要听见你的交代，也需要能核对的物证。':'你把现场所见记下，留出几行，准备写下大家的回应。'],
  ['回到众人面前','厅堂就在院子的另一边。把这条发现拿出来，听听大家分别怎么说。']
 ],{type:'public',clue:'body',label:'打开遗骸的公开入口',text:'回厅堂后，在这条线索下点「在厅堂公开」；已有反应时点「查看公开反应」，再选人追问。'});
 if(has('mask'))add('mask','一张薄薄的样片',[
  ['照着配方','配方和材料摆在手边。这一次，你照着上面的办法做出了实物。'],
  ['一点点成形','材料混合，薄片慢慢成形。纸上的记载有了可以拿在手里比对的东西。'],
  ['看清边缘','你看清样片与皮肤衔接的方式。它只是一小片试作，还需要有人辨认这门手艺。'],
  ['拿实物去问',has('memory-pool')?'辨认的经过已经记下。下一步，可以请大家在厅堂一起核对。':'你把样片收好。找个人坐下来，把它拿出来问问，也许比只问配方更有用。']
 ],has('memory-pool')?{type:'case',label:'打开当面核实入口',text:'在「手记 → 推断」中查看已有依据；回到厅堂、召集众人后，再由你决定是否当面核实。'}:{type:'people',label:'找人辨认样片',text:'选一位人物交谈，再点对话下方「出示」，选择「做成的面具」。'});
 if(has('revealed'))add('unmask','面具落下以后',[
  ['接缝被指出',role==='jiang'?'你指出了那处不自然的接缝。厅堂里的人沿着你的手指看过去。':'接缝被当面指出。厅堂里的人把目光转向雾岛。'],
  ['摘下伪装',role==='ishikawa'?'你当着众人摘下面具，承认自己与黑泽的关系。藏在假名后面的生活，到这里已经被看见。':'雾岛摘下面具，承认自己是黑泽的孪生弟弟。你把这次当面的确认记了下来。'],
  ['相同的面孔','两张相同的脸摆在面前。最初口述里的“黑泽”，是否每一次都指着同一个人？'],
  ['重新问起昨夜','翻回大家最初的口述，挑一段还没问清的行踪，再拿已有的物证去问本人。']
 ],{type:'opening',label:'重看口述，选择追问的人',text:'先在「手记 → 口述」对照原话；点人物头像，再用对话下方的「出示」核对已有物证。'});
 if(has('miyazaki-statement','ishikawa-statement','emi-statement'))add('accounts','把这一夜拼起来',[
  ['三份交代','神谷朔、雾岛律与黑泽绫的经过，现在都已留在手记里。'],
  ['并排重读','把几段话并排重读。每个人说到的地点与物件，是否都已经亲眼核对？'],
  ['留下空白','有些人说的是自己做过的事，有些人说的是当时以为发生的事。顺序和依据，需要分开记清。'],
  ['轮到你整理',caseProgress(s).ready?'整理推断所需的记录已经齐了。你可以回厅堂，把自己的判断向大家说明。':'口述齐了，仍有现场细节需要核对。先翻回证词，看看其中哪些物件还没有查过。']
 ],caseProgress(s).ready?{type:'case',label:'打开推断页',text:'回厅堂召集大家，在「手记 → 推断」点「向大家说明推断」，填写你自己的判断。'}:{type:'accounts',label:'重读证词，核对现场',text:'这几份口述都在「手记 → 线索 → 证词」；记下提到的地点，再从「地图」前往查看。'});
 if(s.ending)add('epilogue','雾散之前',[
  ['这一案已记','你把这次推断的依据和众人的交代一同留下，合上手记。'],
  ['厅堂安静下来','桌边的话暂时说完了。还有哪些旧事没有问清，可以慢慢翻回记录。'],
  ['门外的路','神社门外的路仍在那里。接下来怎么走，每个人还有自己的决定。'],
  ['再翻开一页','打开「我」，看看还有哪些个人目标没有完成。需要与谁交谈、留下什么决定，都记在里面。']
 ],{type:'self',label:'查看我的个人目标',text:'案件结论保存在「手记 → 推断」；个人目标与支线可以接着完成。'});
 return scenes;
}
