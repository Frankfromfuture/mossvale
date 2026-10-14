"""Complete a cached LPC collection index with verified, resumable HTTP ranges.
Input is vendor/lpc/pending-downloads.json (URL, absolute destination, byte count).
Unfinished pieces stay on disk; completed originals are never overwritten.
"""
from pathlib import Path
import concurrent.futures,urllib.request,json,hashlib,time,re,os,threading
ROOT=Path(__file__).resolve().parents[2]/'vendor/lpc';JOBS=json.loads((ROOT/'pending-downloads.json').read_text());PARTS=ROOT/'download-parts';PARTS.mkdir(exist_ok=True)
STEP=512*1024;lock=threading.Lock();completed=0;failures=[];total=sum(j.get('bytes',0) for j in JOBS if not Path(j['dest']).exists())
plans=[];pieces=[]
for job in JOBS:
 dest=Path(job['dest'])
 if dest.exists():continue
 if 'bytes' not in job:raise RuntimeError('Missing size '+job['url'])
 d=PARTS/hashlib.sha256(job['url'].encode()).hexdigest()[:20];d.mkdir(exist_ok=True);parts=[]
 for start in range(0,job['bytes'],STEP):
  end=min(start+STEP,job['bytes'])-1;p=d/str(start);parts.append(p);pieces.append((job,start,end,p))
 plans.append((job,parts))
def download(task):
 global completed
 job,start,end,p=task;length=end-start+1
 if p.exists() and p.stat().st_size==length:
  with lock:completed+=length
  return
 for attempt in range(4):
  try:
   request=urllib.request.Request(job['url'],headers={'Range':f'bytes={start}-{end}','User-Agent':'Mossvale/1.0 (LPC asset archive)'})
   with urllib.request.urlopen(request,timeout=40) as r:
    expected=f'bytes {start}-{end}/{job["bytes"]}'
    if r.status!=206 or r.headers.get('Content-Range')!=expected:raise RuntimeError('Unexpected HTTP range '+str(r.headers.get('Content-Range')))
    count=0
    with p.with_suffix('.part').open('wb') as out:
     while True:
      data=r.read(65536)
      if not data:break
      out.write(data);count+=len(data)
    if count!=length:raise RuntimeError(f'Truncated range {count}/{length}')
    p.with_suffix('.part').replace(p)
   with lock:completed+=length
   return
  except Exception as e:
   if attempt==3:
    with lock:failures.append({'url':job['url'],'start':start,'error':str(e)})
    return
   time.sleep(attempt+1)
print('Range download:',len(plans),'files;',round(total/1e6),'MB;',len(pieces),'pieces',flush=True)
# Interleave large files to avoid holding up smaller packs in the queue.
pieces.sort(key=lambda p:p[1])
with concurrent.futures.ThreadPoolExecutor(max_workers=64) as pool:
 futures=[pool.submit(download,p) for p in pieces];last=time.monotonic();remaining=set(futures)
 while remaining:
  _,remaining=concurrent.futures.wait(remaining,timeout=10,return_when=concurrent.futures.FIRST_COMPLETED)
  if time.monotonic()-last>=20:
   print(round(completed/1e6),'/',round(total/1e6),'MB;',len(remaining),'pieces pending; errors',len(failures),flush=True);last=time.monotonic()
for job,parts in plans:
 if all(p.exists() and p.stat().st_size==min(STEP,job['bytes']-int(p.name)) for p in parts):
  dest=Path(job['dest']);tmp=dest.with_name(dest.name+'.assembling')
  with tmp.open('wb') as out:
   for p in parts:out.write(p.read_bytes())
  if tmp.stat().st_size!=job['bytes']:raise RuntimeError('Wrong final size')
  tmp.replace(dest)
  for p in parts:p.unlink()
  parts[0].parent.rmdir()
  print('Saved',dest.name,flush=True)
(ROOT/'range-failures.json').write_text(json.dumps(failures,indent=2));print('Finished; failures:',len(failures),flush=True)
