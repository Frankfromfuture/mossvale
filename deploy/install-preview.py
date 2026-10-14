"""Install this preview on the existing Brizo ECS without replacing its services."""
from pathlib import Path
import json, os, secrets, shutil, subprocess, time

def run(*args):
    return subprocess.run(args, check=True, universal_newlines=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.strip()

base = Path('/srv/mossvale-preview')
release = base/'releases/20261011-01'
live = Path('/srv/brizo-sync/current/services/device-sync/deploy/nginx.conf')
if base.exists():
    raise SystemExit('Preview already exists; inspect it before updating.')
images = dict(line.split('=',1) for line in Path('/srv/brizo-sync/images.env').read_text().splitlines() if '=' in line)
old = live.read_bytes()
if old.count(b'        location / { return 404; }') != 1:
    raise SystemExit('Existing proxy layout changed; no file was modified.')
(release/'public').mkdir(parents=True)
run('tar','-xzf','/tmp/mossvale-preview-20261011.tgz','-C',str(release/'public'))
shutil.move(release/'public/deploy',release/'deploy')
for f in release.rglob('*'):
    f.chmod(0o755 if f.is_dir() else 0o644)
access = secrets.token_urlsafe(32)
env = base/'preview.env'
env.write_text('MOSSVALE_PUBLIC_ORIGIN=https://47.116.35.204\nMOSSVALE_PREVIEW_ACCESS='+access+'\nMOSSVALE_STATIC_DIR=/app/public\nPORT=8791\nMOSSVALE_UPSTREAM_PORT=14319\n')
env.chmod(0o600)
backups = base/'backups'; backups.mkdir()
(backups/'nginx-before-preview.conf').write_bytes(old)
candidate = base/'nginx-with-preview.conf'
addition = (release/'deploy/nginx-location.conf').read_bytes()
candidate.write_bytes(old.replace(b'        location / { return 404; }', addition+b'\n        location / { return 404; }',1))
run('docker','run','--rm','--network','none','--read-only','--tmpfs','/tmp',
    '--mount',f'type=bind,src={candidate},dst=/etc/nginx/nginx.conf,readonly',
    '--mount','type=bind,src=/srv/brizo-sync/letsencrypt,dst=/etc/letsencrypt,readonly',
    '--entrypoint','nginx',images['NGINX_IMAGE'],'-t')
container = run('docker','run','-d','--name','mossvale-preview','--restart','unless-stopped','--init',
    '--network','host','--user','1000:1000','--read-only','--cap-drop','ALL',
    '--security-opt','no-new-privileges','--pids-limit','64','--cpus','0.5',
    '--memory','256m','--memory-swap','256m','--ulimit','core=0',
    '--log-opt','max-size=1m','--log-opt','max-file=2',
    '--mount',f'type=bind,src={release},dst=/app,readonly','--workdir','/app',
    '--env-file',str(env),images['NODE_IMAGE'],'node','deploy/preview-gateway.mjs')
try:
    # Preserve the inode: the running TLS container bind-mounts this exact file.
    live.write_bytes(candidate.read_bytes())
    run('docker','exec','brizo-sync-tls','nginx','-s','reload')
except Exception:
    live.write_bytes(old)
    run('docker','exec','brizo-sync-tls','nginx','-s','reload')
    raise
print(json.dumps({'url':'https://47.116.35.204/mossvale/?invite='+access,'container':container[:12],'release':str(release)}))
