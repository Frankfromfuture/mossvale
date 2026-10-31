// Illustrated props use the atlas; navigation marks are resolution-independent ink paths.
export const iconCells={story:0,book:1,map:2,gear:3,eye:4,home:5,help:6,search:7,mic:8,send:9,arrow:10,close:11,check:12,evidence:13,gather:14,moon:15};
// Viewports follow the generated silhouettes without changing or stretching the artwork.
export const iconRegions=[[47,65,292,262],[357,50,254,271],[640,69,281,251],[959,53,267,268],[34,372,297,246],[340,351,298,272],[656,336,241,296],[958,347,276,283],[85,639,188,275],[335,659,288,229],[654,687,278,199],[980,663,235,234],[41,950,283,245],[331,926,301,284],[641,942,297,254],[965,932,263,259]];
// Small asymmetric curves keep the strokes hand drawn. The return stroke echoes a huiwen corner.
const inkNavigation={
 back:`<path d="M5.2 16.1c6.7-.4 13.5.4 19.2-.1q3.3-.1 3.1-3.1l-.2-5.3q-.1-1.1-1.3-.9l-6.5.2.1 4.3 4-.1"/><path d="M12.7 9.4Q9.3 12.7 4.8 16.1q4 3 8 6.5"/>`,
 close:`<path d="M6 6L26 26M26 6L6 26"/>`
};
export function icon(name){
 if(Object.hasOwn(inkNavigation,name))return `<svg class="ui-icon ui-icon-${name} ui-icon-ink" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${inkNavigation[name]}</g></svg>`;
 const id=Object.hasOwn(iconCells,name)?name:'book',region=iconRegions[iconCells[id]];
 return `<svg class="ui-icon ui-icon-${id}" viewBox="${region.join(' ')}" aria-hidden="true" focusable="false"><image href="art/detective-icons-v1.png" width="1254" height="1254"/></svg>`;
}
