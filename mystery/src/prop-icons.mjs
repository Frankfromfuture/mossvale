import {icon} from './ui-icons.mjs';

// Stable atlas order; only the searchable exterior is illustrated, never hidden contents.
const sheets=[
 ['silk','pin','old-news','pendant','asano','crest','candle-player','body','key','garden-blood','flowers','footprints','roots','water','cloth','six-candles','clean-floor','chronicle','poison-book','doll-craft','long-hair','clay','vaseline','bones','jade-shrine'],
 ['family-dolls','knife','missing-robe','candle-miyazaki','scar-miyazaki','recipe','novel','ring','comb','medicine-bottle','cosmetics','warm-brazier','guide','candle-ishikawa','contracts','jade-kato','wood-token','cup','cold-brazier','book-emi','candle-kato','medicine','jiang-token','potted-flower','candle-jiang']
];
export const propIconRegions=Object.fromEntries(sheets.flatMap((ids,sheet)=>ids.map((id,cell)=>[id,{sheet:sheet?'b':'a',x:cell%5*250.8,y:Math.floor(cell/5)*250.8}])));

export function propIcon(id,fallback='search'){
 const region=Object.hasOwn(propIconRegions,id)&&propIconRegions[id];
 if(!region)return icon(fallback);
 return `<svg class="ui-icon prop-icon" data-prop-icon="${id}" viewBox="${region.x} ${region.y} 250.8 250.8" aria-hidden="true" focusable="false"><image href="art/search-props-v1-${region.sheet}.png" width="1254" height="1254"/></svg>`;
}
