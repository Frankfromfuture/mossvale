// Track accepted questions, separately for each addressee and evidence context.
// The existing review call supplies semantic matches; exact repeats also work
// when that optional model field is missing. Old conversations are not charged.
const normalize=text=>text.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{Z}\s]/gu,'');
const evidenceKey=s=>JSON.stringify([...new Set([...(s.found||[]),...(s.public||[])])].sort());
const actorEvidence=(s,actor)=>JSON.stringify([evidenceKey(s),[...(s.presented?.[actor]||[])].sort()]);
const looksLikeQuestion=text=>{
 const own=text.replace(/[“「『‘][^”」』’]*[”」』’]/g,'');
 return normalize(own).length>=4&&/(?:[?？]|[吗呢])\s*[。！!]?\s*$|^(?:请问|说说|告诉我)/.test(own);
};

export function inquiryContext(s,actor){
 const evidence=actorEvidence(s,actor);
 return (s.investigation?.inquiries||[]).filter(q=>q.actor===actor&&q.evidence===evidence).slice(-40).map(({id,quote,count})=>({id,quote,count}));
}

export function validateInquiry(s,ctx,raw){
 if(ctx.challenge||s.ending)return null;
 const candidates=inquiryContext(s,ctx.actor),items=s.investigation?.inquiries||[];
 const judged=raw.confidence>=.9&&raw.inquiry&&typeof raw.inquiry.quote==='string'&&raw.inquiry.quote.trim().length>=4&&ctx.message.includes(raw.inquiry.quote);
 if(!judged&&!(raw.inquiry===undefined&&looksLikeQuestion(ctx.message)))return null;
 const exact=candidates.find(q=>items.find(i=>i.id===q.id)?.variants.includes(normalize(ctx.message)));
 const prior=exact||(judged&&candidates.find(q=>q.id===raw.inquiry.previousId));
 return {previousId:prior?.id||null,quote:judged?raw.inquiry.quote.trim():ctx.message,count:(prior?.count||0)+1};
}

export function recordInquiry(s,actor,message,inquiry){
 if(!inquiry||s.ending)return null;
 const v=s.investigation;v.inquiries||=[];
 const evidence=actorEvidence(s,actor);
 let item=v.inquiries.find(q=>q.id===inquiry.previousId&&q.actor===actor&&q.evidence===evidence);
 if(!item){item={id:`inquiry-${++v.sequence}`,actor,evidence,quote:inquiry.quote,count:0,variants:[],challenged:false};v.inquiries.push(item);}
 item.count++;const variant=normalize(message);if(!item.variants.includes(variant))item.variants.push(variant);
 if(item.count<3)return null;
 const trigger=!item.challenged;item.challenged=true;
 return {id:item.id,count:item.count,trigger};
}
