const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const repository='https://github.com/Frankfromfuture/mossvale/blob/main/';
function linkTarget(value){
 if(/^(https?:\/\/|#)/.test(value))return value;
 if(/^[\w./-]+$/.test(value)&&!value.startsWith('/'))return repository+value;
 return '#';
}
function imageTarget(value){
 if(value==='mystery/docs/images/home.png')return 'art/about/home.png';
 if(value.startsWith('mystery/public/art/')&&/^[\w./-]+$/.test(value))return value.slice('mystery/public/'.length);
 return null;
}
function inline(text){
 const tokens=/!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*/g;
 let html='',offset=0;
 for(const m of text.matchAll(tokens)){
  html+=escape(text.slice(offset,m.index));
  if(m[1]!==undefined){const src=imageTarget(m[2]);html+=src?`<img src="${escape(src)}" alt="${escape(m[1])}" loading="lazy">`:escape(m[1]);}
  else if(m[3]!==undefined)html+=`<a href="${escape(linkTarget(m[4]))}" target="_blank" rel="noopener noreferrer">${escape(m[3])}</a>`;
  else if(m[5]!==undefined)html+=`<code>${escape(m[5])}</code>`;
  else html+=`<strong>${inline(m[6])}</strong>`;
  offset=m.index+m[0].length;
 }
 return html+escape(text.slice(offset));
}

// This renderer covers the repository README's headings, prose, lists, tables,
// images and code blocks. Raw HTML is displayed as text, never executed.
export function renderReadme(markdown,language){
 const match=markdown.match(/<!-- mossvale:zh -->([\s\S]*?)<!-- mossvale:en -->([\s\S]*)$/);
 if(!match||!['zh','en'].includes(language))throw Error('Missing bilingual README section');
 const lines=match[language==='zh'?1:2].trim().split('\n');
 if(/^## (中文|English)$/.test(lines[0]))lines.shift();
 const html=[];
 const cells=line=>line.trim().replace(/^\||\|$/g,'').split('|').map(s=>s.trim());
 const startsBlock=line=>/^#{1,6} |^- |^```|^\|/.test(line);
 for(let i=0;i<lines.length;){
  const line=lines[i];if(!line.trim()){i++;continue;}
  if(line.startsWith('```')){const code=[];i++;while(i<lines.length&&!lines[i].startsWith('```'))code.push(lines[i++]);if(i===lines.length)throw Error('Unclosed README code block');i++;html.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`);continue;}
  const heading=line.match(/^(#{1,6}) (.*)$/);
  if(heading){const level=Math.min(heading[1].length+1,6);html.push(`<h${level}>${inline(heading[2])}</h${level}>`);i++;continue;}
  if(line.startsWith('|')&&/^\|[\s:|\-]+\|$/.test(lines[i+1]||'')){
   const headers=cells(line);i+=2;const rows=[];while(i<lines.length&&lines[i].startsWith('|'))rows.push(cells(lines[i++]));
   html.push(`<div class="about-table"><table><thead><tr>${headers.map(c=>`<th scope="col">${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(c=>`<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);continue;
  }
  if(line.startsWith('- ')){const items=[];while(i<lines.length&&lines[i].startsWith('- '))items.push(`<li>${inline(lines[i++].slice(2))}</li>`);html.push(`<ul>${items.join('')}</ul>`);continue;}
  const paragraph=[line];i++;while(i<lines.length&&lines[i].trim()&&!startsBlock(lines[i]))paragraph.push(lines[i++]);
  html.push(`<p>${inline(paragraph.join(' '))}</p>`);
 }
 return html.join('\n');
}
