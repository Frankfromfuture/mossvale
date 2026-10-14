from pathlib import Path
import json,re,html,urllib.parse,urllib.request,concurrent.futures
root=Path(__file__).resolve().parents[2]/'vendor/lpc';jobs=[]
for url in json.loads((root/'collections.json').read_text())['pages']:
 folder=root/'opengameart'/url.rsplit('/',1)[-1]
 if (folder/'manifest.json').exists():continue
 source=folder/'source.html'
 if not source.exists():continue
 s=source.read_text().split('id="comments"')[0].split('<section class="comments')[0];at=s.find('field-name-field-art-files');s=s[at:] if at>=0 else ''
 for link in dict.fromkeys(html.unescape(x) for x in re.findall(r'href=[\"\x27]([^\"\x27]*sites/default/files/[^\"\x27]+)',s)):
  if '/styles/' in link:continue
  link=urllib.parse.urljoin(url,link);name=urllib.parse.unquote(urllib.parse.urlsplit(link).path.split('/')[-1]);dest=folder/name
  if not dest.exists():jobs.append({'url':link,'dest':str(dest)})
def head(job):
 try:
  with urllib.request.urlopen(urllib.request.Request(job['url'],method='HEAD'),timeout=15) as r:job['bytes']=int(r.headers['Content-Length'])
 except Exception as e:job['error']=str(e)
 return job
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:jobs=list(pool.map(head,jobs))
(root/'pending-downloads.json').write_text(json.dumps(jobs,indent=2));print('Missing files',len(jobs),'total MB',round(sum(j.get('bytes',0) for j in jobs)/1e6),flush=True)
for j in sorted(jobs,key=lambda j:j.get('bytes',0),reverse=True)[:15]:print(Path(j['dest']).name,j.get('bytes',j.get('error')),flush=True)
