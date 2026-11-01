// Only already-visible dialogue and stage directions drive expressions.
export function dialogueMood(text='',question=false){
 if(question)return 'stern';
 const actions=[...text.matchAll(/[（(]([^）)]+)[）)]/g)].map(m=>m[1]).join(' ');
 const classify=s=>{
  if(/惊讶|惊愕|吃惊|睁大|愣住|一怔|诧异|扬起眉/.test(s))return 'surprised';
  if(/皱眉|蹙眉|警惕|不悦|冷冷|瞪|咬牙|质问|怒|眉头.*紧/.test(s))return 'stern';
  if(/担心|害怕|紧张|苦笑|叹.*气|颤|垂下眼|难过|低落|不安|抿.*嘴/.test(s))return 'worried';
  if(/微笑|笑了|轻笑|笑意|松了口气|柔声|欣慰|含笑|莞尔/.test(s))return 'warm';
  if(/思索|沉思|想了想|迟疑|犹豫|沉吟|思考|托腮/.test(s))return 'thoughtful';
 };
 return classify(actions)||(/谢谢|多谢|放心吧/.test(text)?'warm':/记不清|不太确定|让我想想|让我想一想/.test(text)?'thoughtful':'neutral');
}
const poses={
 neutral:{brow:0,lift:0,eye:1,mouth:1,arm:-.2,spread:.07,elbow:-.18,lean:.015,tilt:0,beat:.13},
 warm:{brow:-.14,lift:.012,eye:.72,mouth:2.1,arm:-.32,spread:.2,elbow:-.27,lean:.04,tilt:-.035,beat:.2},
 worried:{brow:-.34,lift:.012,eye:.82,mouth:-1.4,arm:-.12,spread:-.035,elbow:-.5,lean:.055,tilt:.04,beat:.06},
 stern:{brow:.34,lift:-.022,eye:.66,mouth:-.65,arm:-.34,spread:.045,elbow:-.32,lean:-.025,tilt:0,beat:.16},
 surprised:{brow:.04,lift:.045,eye:1.35,mouth:.2,arm:-.52,spread:.25,elbow:-.43,lean:-.065,tilt:-.025,beat:.1},
 thoughtful:{brow:.16,lift:.006,eye:.78,mouth:.15,arm:-.4,spread:.025,elbow:-.65,lean:.035,tilt:.075,beat:.035}
};
const ease=(value,target,rate,dt)=>value+(target-value)*(1-Math.exp(-rate*dt));
export function animateFace(rig,dt,gesture){
 const f=rig.face;if(!f)return;const t=rig.time,mood=rig.thinking?'thoughtful':rig.mood||'neutral',pose=poses[mood]||poses.neutral,lerp=(x,y)=>ease(x,y,9,dt);
 const speaking=!rig.thinking&&!rig.performancePaused&&(rig.voiceSpeaking||rig.speakingUntil>t||gesture==='talk'&&!rig.inConversation);
 // Separate blink phases prevent a roomful of simultaneous blinks.
 const blinkTime=(t+f.offset)%4.7,blink=blinkTime<.16?Math.max(.05,Math.abs(blinkTime-.08)/.08):1;
 f.eyeLevel=lerp(f.eyeLevel??1,pose.eye);f.eyes.forEach(eye=>{eye.scale.y=eye.userData.restHeight*f.eyeLevel*blink;});
 f.brows.forEach((b,i)=>{const side=i?1:-1,rest=b.userData.rest;b.rotation.z=lerp(b.rotation.z,rest.angle+side*pose.brow);b.position.y=lerp(b.position.y,rest.y+pose.lift+(mood==='thoughtful'&&i===1?.016:0));b.position.z=f.depthAt(b.position.x,b.position.y)+.002;});
 f.mouth.scale.y=lerp(f.mouth.scale.y,pose.mouth);
 // Audio drives the mouth from the actual playback signal, including its pauses.
 // Silent text replies use varied syllable beats instead of a constant bob.
 const level=rig.voiceSpeaking?rig.voiceLevel?.():null,beat=t*19+f.offset+Math.sin(t*4.3)*.7;
 const syllable=Math.pow(Math.max(0,Math.sin(beat)),.65)*(.72+.23*Math.sin(t*6.7)**2);
 const open=speaking?(level!=null?Math.min(1,Math.sqrt(Math.max(0,level-.008))*2.7):syllable):0;
 f.open=ease(f.open,open,open>f.open?30:24,dt);
 f.openMouth.visible=f.open>.065;f.mouth.visible=f.open<.14;
 f.openMouth.scale.y=.075*Math.max(.025,f.open);f.openMouth.scale.x=.052+.018*(1-f.open)+(mood==='warm'?.008:0);
 rig.root.userData.expression={mood,speaking:!!speaking,open:f.open};
}

export function animateEmotion(rig,dt,gesture){
 const expression=rig.root.userData.expression,pose=poses[expression?.mood]||poses.neutral;
 const active=!rig.performancePaused&&(rig.thinking||expression?.speaking),weight=active?1:rig.inConversation&&!rig.performancePaused?.3:0;
 const a=rig.acting||={weight:0,speech:0,arm:0,spread:0,elbow:0,lean:0,tilt:0,beat:0};
 a.weight=ease(a.weight,weight,6,dt);a.speech=ease(a.speech,expression?.speaking?1:0,8,dt);
 for(const key of ['arm','spread','elbow','lean','tilt','beat'])a[key]=ease(a[key],pose[key],6,dt);
 const idle=1-rig.blend,amount=a.weight*idle,personality=({emi:.62,miyazaki:.78,ishikawa:.72,hongxue:.6,chenxin:.68,cuiyuan:.72,aiyijun:.68,vivian:1.1})[rig.id]||1;
 const beat=Math.sin(rig.time*3.3+rig.face.offset),emphasis=Math.max(0,beat)*a.beat*a.speech;
 rig.head.rotation.x+=(a.lean+beat*.045*a.speech)*amount;rig.head.rotation.z+=a.tilt*amount;
 rig.torso.rotation.x+=a.lean*.5*amount;rig.torso.rotation.z+=Math.sin(rig.time*1.8+rig.face.offset)*.018*a.speech*amount;
 if(gesture==='sip'||rig.task)return;
 for(let i=0;i<2;i++){
  if((rig.id==='ishikawa'||rig.look.book)&&i===0)continue; // Keep the notebook supported; the pen hand can gesture.
  const side=i?1:-1,strength=amount*personality*(i?1:.55);
  rig.arms[i].rotation.x+=(a.arm-emphasis)*strength;
  rig.arms[i].rotation.z+=side*a.spread*strength;
  rig.elbows[i].rotation.x+=(a.elbow-emphasis*.7)*strength;
 }
}
