// Only expose the speech field after its complete fact list. A provider that
// changes field order still completes normally, without a speculative preview.
export function partialReply(json){
 const match=/^\s*\{\s*"factIds"\s*:\s*(\[[^\]]*\])\s*,\s*"speech"\s*:\s*"/.exec(json);
 if(!match)return null;
 let factIds;try{factIds=JSON.parse(match[1]);}catch{return null;}
 let text='';
 for(let i=match[0].length;i<json.length;i++){
  const c=json[i];if(c==='"')break;
  if(c!=='\\'){text+=c;continue;}
  const next=json[++i];if(next===undefined)break;
  if(next==='u'){
   const hex=json.slice(i+1,i+5);if(!/^[a-f\d]{4}$/i.test(hex))break;
   text+=String.fromCharCode(parseInt(hex,16));i+=4;
  }else if('"\\/bfnrt'.includes(next))text+=JSON.parse('"\\'+next+'"');else return null;
 }
 // Never emit half of a Unicode surrogate pair.
 if(/[\uD800-\uDBFF]$/.test(text))text=text.slice(0,-1);
 return {speech:text,factIds};
}
