export const storySeenKey='mystery-story-v5-seen';
export function comicCropStyle(r){
 if(!r)return '';
 const x=r.sourceWidth===r.width?0:r.x/(r.sourceWidth-r.width)*100,y=r.sourceHeight===r.height?0:r.y/(r.sourceHeight-r.height)*100;
 return `background-size:${r.sourceWidth/r.width*100}% ${r.sourceHeight/r.height*100}%;background-position:${x}% ${y}%;aspect-ratio:${r.width}/${r.height};`;
}
export function storySpread(page,{esc}){
 const picture=page.pictureUrl?`<img class="story-character-image" src="${esc(page.pictureUrl)}" alt="${esc(page.caption)}"/>`:page.portrait!=null?`<div class="role-story-portrait"><span class="portrait" style="--col:${page.portrait%3};--row:${Math.floor(page.portrait/3)}" role="img" aria-label="${esc(page.caption)}"></span></div>`:`<div class="comic-panel" style="--comic-image:url('art/${page.image}');--comic-x:${page.panel%2};--comic-y:${Math.floor(page.panel/2)};${comicCropStyle(page.imageRegion)}" role="img" aria-label="${esc(page.caption)}"></div>`;
 return `<article class="story-spread"><div class="story-left">${picture}<p class="comic-caption">${esc(page.caption)}</p></div><div class="story-right"><span class="story-chapter">${esc(page.chapter)}</span><h3>${esc(page.title)}</h3>${page.paragraphs.map(t=>`<p>${esc(t)}</p>`).join('')}${page.quote?`<blockquote class="story-quote">${esc(page.quote)}</blockquote>`:''}${page.steps?`<ol class="story-steps">${page.steps.map(([name,t])=>`<li><strong>${esc(name)}</strong><span>${esc(t)}</span></li>`).join('')}</ol>`:''}${page.foot?`<p class="story-footnote">${esc(page.foot)}</p>`:''}</div></article>`;
}
