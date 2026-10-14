// Cocos 3.8.8 can start its asset worker before importer packages are registered.
// Reload that worker only when the project's own typed assets were misclassified.
exports.load = async function () {
  for(let n=0;n<100;n++) {
    if(await Editor.Message.request('asset-db','query-ready')) break;
    await new Promise(r=>setTimeout(r,100));
  }
  const url='db://assets/scenes/CafeStreet.scene';
  let info=await Editor.Message.request('asset-db','query-asset-info',url);
  if(info?.importer==='scene') return;
  console.log('[Mossvale] Repairing Cocos CLI importer initialization');
  await Editor.Message.request('asset-db','refresh');
  for(let n=0;n<100;n++) {
    if(await Editor.Message.request('asset-db','query-ready')) break;
    await new Promise(r=>setTimeout(r,100));
  }
  await Editor.Message.request('asset-db','reimport-asset','db://internal');
  await Editor.Message.request('asset-db','reimport-asset','db://assets');
  info=await Editor.Message.request('asset-db','query-asset-info',url);
  if(info?.importer!=='scene') throw new Error('Cocos has not imported CafeStreet as a scene');
  console.log('[Mossvale] CafeStreet scene importer is ready');
};
exports.unload = function() {};
