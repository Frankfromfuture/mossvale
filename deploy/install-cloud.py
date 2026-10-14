"""Publish the independent grid town; keep existing ECS services and their routes."""
from pathlib import Path
import json, secrets, subprocess, sys, time, urllib.request, urllib.error

def run(*args):
    return subprocess.run(args, check=True, universal_newlines=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.strip()

phase, release_id = sys.argv[1:3]
if not release_id.startswith('20261014-') or '/' in release_id:
    raise SystemExit('Unexpected release id')
base = Path('/srv/mossvale-cloud')
release = base/'releases'/release_id
live = Path('/srv/brizo-sync/current/services/device-sync/deploy/nginx.conf')
node_image = 'sha256:c10884952bb8c37122fcc3fe6f97af3ab0a80e5eb02ee5df707406b4e11a7e3e'
nginx_image = 'sha256:1b595815db669d0c994a880f3d091111b803dec3eb4c7624f0dbe50cee60dd48'
if phase == 'prepare':
    if base.exists():
        raise SystemExit('Cloud directory already exists; inspect before changing it')
    release.mkdir(parents=True)
    run('tar','-xzf','/tmp/mossvale-cloud-release.tgz','-C',str(release))
    release.chmod(0o755)
    for f in release.rglob('*'):
        f.chmod(0o755 if f.is_dir() else 0o644)
    for name in ['data','secrets','backups']:
        directory = base/name
        directory.mkdir(mode=0o700)
        if name != 'backups':
            run('chown','1000:1000',str(directory))
    access = secrets.token_urlsafe(32)
    env = base/'cloud.env'
    env.write_text('MOSSVALE_PUBLIC_ORIGIN=https://www.iambrizo.com\nMOSSVALE_PREVIEW_ACCESS='+access+'\nMOSSVALE_SCENE=cafe-2d\nMOSSVALE_TOWN_MIND=1\nMOSSVALE_UNLIMITED_AI=1\nMOSSVALE_LAYOUT=/app/cocos-2d/assets/resources/town-layout.json\nMOSSVALE_STATIC_DIR=/app/public\nMOSSVALE_DATA_DIR=/app-data\nMOSSVALE_SECRET_DIR=/run/secrets/mossvale\nPORT=8793\nMOSSVALE_GATEWAY_PORT=8792\nTZ=Asia/Shanghai\n')
    env.chmod(0o600)
    print(json.dumps({'prepared':True,'release':str(release)}))
elif phase == 'activate':
    if not (base/'secrets/providers.enc').is_file() or not (base/'secrets/providers.key').is_file():
        raise SystemExit('Encrypted model configuration is missing')
    if list((base/'data').iterdir()):
        raise SystemExit('Cloud data is already populated; inspect before migration')
    run('tar','-xzf','/tmp/mossvale-cloud-saves.tgz','-C',str(base/'data'))
    run('chown','-R','1000:1000',str(base/'data'))
    for f in (base/'data').rglob('*'):
        f.chmod(0o700 if f.is_dir() else 0o600)
    old = live.read_bytes()
    domain = old.index(b'server_name www.iambrizo.com iambrizo.com;')
    insertion = old.index(b'        location / {',domain)
    if b'/mossvale' in old[domain:insertion]:
        raise SystemExit('Domain route already exists; inspect before changing it')
    addition = (release/'deploy/cloud-nginx-location.conf').read_bytes()
    candidate = base/'nginx-candidate.conf'
    candidate.write_bytes(old[:insertion]+addition+b'\n'+old[insertion:])
    candidate.chmod(0o644)
    (base/'backups/nginx-before-cloud.conf').write_bytes(old)
    run('docker','run','--rm','--network','none','--read-only','--tmpfs','/tmp',
        '--mount','type=bind,src='+str(candidate)+',dst=/etc/nginx/nginx.conf,readonly',
        '--mount','type=bind,src=/srv/brizo-sync/letsencrypt,dst=/etc/letsencrypt,readonly',
        '--entrypoint','nginx',nginx_image,'-t')
    container = run('docker','run','-d','--name','mossvale-cloud','--restart','unless-stopped','--init',
        '--network','host','--user','1000:1000','--read-only','--cap-drop','ALL',
        '--security-opt','no-new-privileges','--pids-limit','64','--cpus','1',
        '--memory','640m','--memory-swap','640m','--ulimit','core=0',
        '--log-opt','max-size=2m','--log-opt','max-file=2',
        '--mount','type=bind,src='+str(release)+',dst=/app,readonly',
        '--mount','type=bind,src='+str(base/'data')+',dst=/app-data',
        '--mount','type=bind,src='+str(base/'secrets')+',dst=/run/secrets/mossvale,readonly',
        '--workdir','/app','--env-file',str(base/'cloud.env'),node_image,'node','server/cloud-entry.mjs')
    ready = False
    for _ in range(20):
        try:
            req = urllib.request.Request('http://127.0.0.1:8792/mossvale/',headers={'Host':'www.iambrizo.com'})
            urllib.request.urlopen(req,timeout=2)
        except urllib.error.HTTPError as e:
            if e.code == 401:
                ready = True
                break
        except Exception:
            pass
        time.sleep(.5)
    if not ready:
        raise SystemExit('Cloud container did not become ready; website route was not changed')
    try:
        if live.read_bytes() != old:
            raise RuntimeError('Nginx changed during preparation')
        # Preserve inode: the running TLS container binds this exact file.
        live.write_bytes(candidate.read_bytes())
        run('docker','exec','brizo-sync-tls','nginx','-t')
        run('docker','exec','brizo-sync-tls','nginx','-s','reload')
    except Exception:
        live.write_bytes(old)
        run('docker','exec','brizo-sync-tls','nginx','-s','reload')
        raise
    (base/'current').symlink_to(release)
    print(json.dumps({'activated':True,'container':container[:12],'url':'https://www.iambrizo.com/mossvale/','saves':len(list((base/'data').glob('*.json')))}))
else:
    raise SystemExit('Unknown phase')
