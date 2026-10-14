"""Download the complete contents of the named public LPC collections, resumably.
Original files and page-level attribution are retained outside the runtime build.
"""
import concurrent.futures,hashlib,html,json,re,time,urllib.request,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]/'vendor/lpc'; ROOT.mkdir(parents=True,exist_ok=True)
COLLECTIONS=['https://opengameart.org/content/lpc-collection','https://opengameart.org/content/lpc-tiles']
PRIORITY=['lpc-wooden-furniture','lpc-walls','lpc-floors','lpc-windows-doors','lpc-upholstery','lpc-containers','lpc-food','lpc-flowers-plants-fungi-wood','liberated-pixel-cup-lpc-base-assets-sprites-map-tiles','lpc-revised-workshop-tilesets']
def fetch(url):
 for attempt in range(3):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mossvale-LPC-asset-library/1.0'}),timeout=90) as r:return r.read()
  except Exception:
   if attempt==2:raise
   time.sleep(2+attempt*3)
def page(url):
 slug=url.rstrip('/').split('/')[-1];folder=ROOT/'opengameart'/slug;folder.mkdir(parents=True,exist_ok=True)
 cached=folder/'source.html'
 if not cached.exists():cached.write_bytes(fetch(url))
 s=cached.read_text(errors='replace');title=re.search(r'<title>(.*?)</title>',s,re.S)
 # Main submission attachments only: omit preview images and user comment attachments.
 main=s.split('id="comments"')[0].split('<section class="comments')[0]
 at=main.find('field-name-field-art-files');main=main[at:] if at>=0 else ''
 links=list(dict.fromkeys(html.unescape(x) for x in re.findall(r'href=[\"\x27]([^\"\x27]*sites/default/files/[^\"\x27]+)',main)))
 files=[]
 for link in links:
  if '/styles/' in link:continue
  link=urllib.parse.urljoin(url,link);name=urllib.parse.unquote(urllib.parse.urlsplit(link).path.split('/')[-1]);target=folder/name
  if not target.exists():
   data=fetch(link);tmp=target.with_name(target.name+'.part');tmp.write_bytes(data);tmp.replace(target)
  files.append({'name':name,'url':link,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
 licenses=list(dict.fromkeys(re.findall(r'https?://(?:creativecommons.org|www.gnu.org|static.opengameart.org)/[^\"\x27<> ]+',s)))
 data={'title':html.unescape(title.group(1)) if title else slug,'url':url,'licenses':licenses,'files':files}
 (folder/'manifest.json').write_text(json.dumps(data,indent=2,ensure_ascii=False));return data
urls=['https://opengameart.org/content/'+s for s in PRIORITY]
for url in COLLECTIONS:
 s=fetch(url).decode();(ROOT/(url.rsplit('/',1)[-1]+'.html')).write_text(s)
 urls.extend(urllib.parse.urljoin(url,html.unescape(x)) for x in re.findall(r'<span class="art-preview-title"><a href="([^"]+)"',s))
urls=list(dict.fromkeys(urls));(ROOT/'collections.json').write_text(json.dumps({'collections':COLLECTIONS,'pages':urls},indent=2))
print('LPC source pages:',len(urls),flush=True)
results=[];failures=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 futures={pool.submit(page,u):u for u in urls}
 for future in concurrent.futures.as_completed(futures):
  u=futures[future]
  try:
   r=future.result();results.append(r)
   if u.rsplit('/',1)[-1] in PRIORITY or len(results)%25==0:print('Downloaded',len(results),'/',len(urls),u.rsplit('/',1)[-1],len(r['files']),'files',flush=True)
  except Exception as e:failures.append({'url':u,'error':str(e)});print('Failed:',u,str(e)[:100],flush=True)
  (ROOT/'manifest.json').write_text(json.dumps({'collections':COLLECTIONS,'pages':results,'failures':failures},ensure_ascii=False,indent=2))
print(json.dumps({'pages':len(results),'files':sum(len(r['files']) for r in results),'bytes':sum(f['bytes'] for r in results for f in r['files']),'failures':failures}),flush=True)
