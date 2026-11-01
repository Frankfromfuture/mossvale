// Presentation history belongs to this browser and role slot, not case saves.
export function createInterludeQueue(storage){
 let key=null,seen=new Set(),available=[];
 const persist=()=>{try{storage.setItem(key,JSON.stringify([...seen]));}catch{}};
 return {
  update(slot,scenes=[]){
   const nextKey='mystery-interludes-v1:'+slot;
   if(key!==nextKey){
    key=nextKey;let saved;try{saved=JSON.parse(storage.getItem(key));}catch{}
    // Existing progress remains available to replay without a backlog of popups.
    seen=new Set(Array.isArray(saved)?saved.filter(id=>typeof id==='string'):scenes.map(s=>s.id));persist();
   }
   available=scenes;
  },
  next(){return available.find(s=>!seen.has(s.id));},
  finish(id){seen.add(id);persist();}
 };
}
