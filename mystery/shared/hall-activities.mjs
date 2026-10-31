// World coordinates shared by furnishings, idle movement and ambient descriptions.
export const hallActivities={
 tea:{name:'厅堂茶台',at:{x:-5.4,z:-14},spots:[{x:-5.9,z:-12.9},{x:-4.3,z:-12.9}],gestures:['sip','adjust'],actions:['端起茶杯，轻轻吹了吹','把茶具归拢到托盘上']},
 reading:{name:'厅堂翻阅桌',at:{x:5.4,z:-14},spots:[{x:4.3,z:-12.9},{x:6,z:-12.9}],gestures:['write','glance'],actions:['俯身翻看摊开的书页','凑近看了看桌上的字']},
 plants:{name:'厅堂盆栽旁',at:{x:-5,z:-4.7},spots:[{x:-6.1,z:-5.8},{x:-4.1,z:-5.8}],gestures:['tend','glance'],actions:['轻轻拨开叶子，理了理垂下的枝条','停下脚步，看看新长出的叶子']},
 fire:{name:'厅堂炉边',at:{x:0,z:-15.6},spots:[{x:-2.2,z:-15.3},{x:2.2,z:-15.3}],gestures:['warm','warm'],actions:['伸手靠近炉火，暖了暖手','站在炉旁，慢慢舒展肩膀']}
};
const templateStations={tea:'tea',cups:'tea',manuscript:'reading',reading:'reading',quiet:'plants',chairs:'fire'};
export const hallActivity=event=>event?.scope==='private'?null:hallActivities[event?.station||templateStations[event?.template||event?.id]]||null;
