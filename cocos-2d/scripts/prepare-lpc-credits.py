"""Publish full upstream attribution next to the derived, downloadable LPC atlases."""
from pathlib import Path
import json,re,html,csv
ROOT=Path(__file__).resolve().parents[2];LIB=ROOT/'vendor/lpc';OGA=LIB/'opengameart';OUT=ROOT/'cocos-2d/legal';OUT.mkdir(exist_ok=True)
SLUGS=['liberated-pixel-cup-lpc-base-assets-sprites-map-tiles','lpc-wooden-furniture','lpc-floors','lpc-walls','lpc-windows-doors','lpc-upholstery','lpc-containers','lpc-flowers-plants-fungi-wood','lpc-plant-repack','lpc-city-inside','lpc-items-and-game-effects','lpc-water-fountain','lpc-revised-the-office']
parts=['''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>苔溪镇 · LPC 素材署名</title><style>body{font:16px/1.7 system-ui;max-width:880px;margin:40px auto;padding:0 22px;background:#f4f0df;color:#263d2c}a{color:#305e48}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.6 monospace}h2{margin-top:42px}details{border-bottom:1px solid #b9bfaa;padding:12px 0}</style><h1>苔溪镇 · LPC 素材与作者</h1>
<p>本机 2D 使用 Liberated Pixel Cup 社区素材。原作者、原作链接和原许可列于下方，各部分按各自许可提供。</p>
<p>苔溪镇做了裁切、拼接、图集打包，以及人物衣服、裤子与头发的配色调整。地图与家具的派生图集按 <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a> 提供；人物组合图采用 <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>，其原始图层为 CC BY-SA 3.0 或 CC0，完整的可选许可证见逐文件清单。保留原作者署名，未获得其背书。</p>
<p>下载：<a href="lpc/lpc-world.png">地图和物件图集</a> · <a href="lpc/lpc-people.png">人物图集</a> · <a href="lpc/lpc-art.json">原图路径、裁切与物件映射</a> · <a href="lpc/CHARACTERS-USED.csv">人物逐文件署名</a></p>''']
plain=[]
for slug in SLUGS:
 folder=OGA/slug;m=json.loads((folder/'manifest.json').read_text());s=(folder/'source.html').read_text();chunks=[]
 for a,b in [('field-name-author-submitter','field-name-post-date'),('field-name-body','field-name-field-art-files')]:
  start=s.find(a);end=s.find(b,start)
  if start>=0 and end>start:
   section=s[start:end];section=section[section.find('>')+1:];section=re.sub(r'<(?:/p|br\s*/?|/div)>','\n',section);section=html.unescape(re.sub('<[^>]+>','',section));section=re.sub(r'\n\s*\n+','\n\n',section).strip();chunks.append(section)
 for p in (folder/'extracted').rglob('*'):
  if p.is_file() and p.suffix.lower() in ['.txt','.md'] and any(k in p.name.lower() for k in ['credit','license','copying','readme']):chunks.append(str(p.relative_to(folder))+'\n'+p.read_text(errors='replace'))
 body='\n\n'.join(chunks);plain.append(m['title']+'\n'+m['url']+'\n'+body)
 parts.append('<h2>'+html.escape(m['title'].replace(' | OpenGameArt.org',''))+'</h2><p><a href="'+html.escape(m['url'])+'">原作与下载页面</a> · '+' · '.join('<a href="'+html.escape(u)+'">'+html.escape(u.split('/licenses/')[-1].rstrip('/'))+'</a>' for u in m['licenses'])+'</p><details><summary>完整作者、说明与原始署名文件</summary><pre>'+html.escape(body)+'</pre></details>')
(OUT/'CHARACTERS-USED.csv').write_bytes((LIB/'CHARACTERS-USED.csv').read_bytes())
rows=list(csv.DictReader((LIB/'CHARACTERS-USED.csv').open()))
assert all('CC-BY-SA 3.0' in r['licenses'] or 'CC0' in r['licenses'] for r in rows)
parts.append('<h2>Universal LPC 角色</h2><p><a href="https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator">完整角色库</a> · '+str(len(rows))+' 个原始图层文件，组合出 18 种外观和四方向行走、坐姿。</p>')
for r in rows:parts.append('<details><summary>'+html.escape(r['filename'])+'</summary><pre>'+html.escape('\n'.join(k+': '+v for k,v in r.items()))+'</pre></details>')
parts.append('</html>');(OUT/'lpc-credits.html').write_text('\n'.join(parts));(LIB/'USED-ART-CREDITS.txt').write_text('\n\n'.join(plain))
print('Published',len(SLUGS),'world sources and',len(rows),'character sources')
