import {clueTerms} from './clue-links.mjs';
const aliases={player:['白川','澄'],miyazaki:['神谷','宫司'],jiang:['典仕'],ishikawa:['雾岛'],kato:['黑泽'],emi:['桐原绫'],asano:[]};
const escapePattern=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

// Only link text nodes. Existing controls, editable text and SVG art keep their
// original behavior, and model-provided HTML remains plain text.
export function installPersonLinks(root,getPeople,openProfile,{getClues=()=>[],openClue}={}){
 let hoverTimer,candidate,lastOpened,scheduled=false;
 const pending=new Set();
 const blocked='button,a,input,textarea,select,option,script,style,svg,[contenteditable],.portrait,.modal-heading,.speaker-badge,.eyebrow';
 function linkText(container){
  if(!root.contains(container))return;
  const people=getPeople(),lookup=new Map();
  for(const person of people)for(const name of [person.name,...(aliases[person.id]||[])])lookup.set(name,{kind:'person',id:person.id,name:person.name});
  if(!lookup.size)return;
  const pattern=map=>new RegExp([...map.keys()].sort((a,b)=>b.length-a.length).map(escapePattern).join('|'),'g');
  const peopleMatcher=pattern(lookup),dialogueLookup=new Map(lookup);
  for(const clue of getClues())for(const term of clueTerms(clue)){
   const target=dialogueLookup.get(term);if(target?.kind==='person')continue;
   if(target){if(!target.ids.includes(clue.id))target.ids.push(clue.id);}
   else dialogueLookup.set(term,{kind:'clue',ids:[clue.id]});
  }
  const dialogueMatcher=pattern(dialogueLookup);
  const nodes=[],walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT,{acceptNode(node){
   return node.parentElement?.closest(blocked)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;
  }});
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
   const spoken=node.parentElement.closest('.speech,.chat-archive,.reaction-speech,.reaction-action,.ambient-bubble,.person-last');
   const matcher=spoken?dialogueMatcher:peopleMatcher,targets=spoken?dialogueLookup:lookup;
   const text=node.nodeValue,matches=[...text.matchAll(matcher)].filter(match=>!(['黑泽','白川'].includes(match[0])&&/^(夫妇|一家|家族)/.test(text.slice(match.index+match[0].length))));
   if(!matches.length)continue;
   const fragment=document.createDocumentFragment();let offset=0;
   for(const match of matches){
    fragment.append(document.createTextNode(text.slice(offset,match.index)));
    const target=targets.get(match[0]),link=document.createElement('button');link.type='button';link.textContent=match[0];
    if(target.kind==='person'){link.className='person-name-link';link.dataset.personName=target.id;link.setAttribute('aria-label','查看'+target.name+'的札记');}
    else{link.className='clue-name-link';link.dataset.clueNames=target.ids.join(',');link.setAttribute('aria-label','查看“'+match[0]+'”的线索卡');}
    fragment.append(link);offset=match.index+match[0].length;
   }
   fragment.append(document.createTextNode(text.slice(offset)));node.replaceWith(fragment);
  }
 }
 const observer=new MutationObserver(records=>{
  for(const record of records){
   if(record.type==='characterData')pending.add(record.target.parentElement);
   else for(const node of record.addedNodes)if(node.nodeType===Node.ELEMENT_NODE)pending.add(node);else if(node.nodeType===Node.TEXT_NODE)pending.add(node.parentElement);
  }
  if(scheduled)return;scheduled=true;
  queueMicrotask(()=>{scheduled=false;observer.disconnect();for(const node of pending)if(node)linkText(node);pending.clear();observe();});
 });
 const observe=()=>observer.observe(root,{childList:true,subtree:true,characterData:true});
 function cancelHover(){clearTimeout(hoverTimer);candidate=null;}
 root.addEventListener('pointermove',event=>{
  if(event.pointerType!=='mouse')return;
  const link=event.target.closest?.('[data-person-name]');
  if(link===lastOpened)return;
  if(!link){lastOpened=null;cancelHover();return;}
  if(link===candidate)return;cancelHover();candidate=link;
  hoverTimer=setTimeout(()=>{if(link.isConnected){lastOpened=link;openProfile(link.dataset.personName);}candidate=null;},400);
 });
 root.addEventListener('pointerout',event=>{if(candidate&&!candidate.contains(event.relatedTarget))cancelHover();});
 root.addEventListener('click',event=>{
  const link=event.target.closest?.('[data-person-name],[data-clue-names]');if(!link)return;
  event.preventDefault();event.stopPropagation();cancelHover();lastOpened=link;
  if(link.dataset.personName)openProfile(link.dataset.personName);else openClue?.(link.dataset.clueNames.split(','));
 });
 observe();linkText(root);
}
