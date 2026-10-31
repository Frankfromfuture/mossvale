"""First independent mystery release. Run on the existing host with sudo -n.

Only the mystery route is added. Existing services and saves stay in place.
The archive contains built public assets, backend, shared data and this deploy folder.
"""
from pathlib import Path
import hashlib, json, os, subprocess, sys, tarfile, time
import urllib.request

BASE=Path('/srv/mossvale-mystery')
NAME='20261029-mystery-v1'
RELEASE=BASE/'releases'/NAME
LIVE=Path('/srv/brizo-sync/current/services/device-sync/deploy/nginx.conf')
CONTAINER='mossvale-mystery'

def run(*args):
    return subprocess.check_output(args,stderr=subprocess.STDOUT).decode().strip()

def report(name,value):
    (BASE/'backups'/(name+'.json')).write_text(json.dumps(value,indent=2))
    print(json.dumps(value))

def health():
    for attempt in range(40):
        try:
            with urllib.request.urlopen('http://127.0.0.1:8796/api/health',timeout=2) as response:
                result=json.load(response)
                if result.get('ok') and result.get('ai',{}).get('ready'): return result
        except Exception: pass
        time.sleep(.5)
    raise RuntimeError('Mystery service did not become ready')

phase=sys.argv[1]
if phase=='prepare':
    if BASE.exists(): raise SystemExit('Mystery directory already exists; inspect before retrying')
    archive=Path('/tmp/mystery-'+NAME+'.tgz')
    if hashlib.sha256(archive.read_bytes()).hexdigest()!=sys.argv[2]: raise RuntimeError('Archive checksum mismatch')
    RELEASE.mkdir(parents=True)
    (BASE/'backups').mkdir(mode=0o700)
    data=BASE/'data';data.mkdir(mode=0o700);os.chown(str(data),1000,1000)
    with tarfile.open(str(archive),'r:gz') as tar:
        for item in tar.getmembers():
            parts=Path(item.name).parts
            if not parts or parts[0] not in ['dist','server','shared','deploy'] or '..' in parts or item.issym() or item.islnk():
                raise RuntimeError('Unexpected archive path')
        tar.extractall(str(RELEASE))
    for item in [RELEASE]+list(RELEASE.rglob('*')): item.chmod(0o755 if item.is_dir() else 0o644)
    image=run('docker','inspect','mossvale-cloud','--format','{{.Config.Image}}')
    run('docker','run','-d','--name',CONTAINER,'--restart','unless-stopped','--init','--network','host',
        '--user','1000:1000','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',
        '--pids-limit','64','--cpus','1','--memory','384m','--memory-swap','384m','--ulimit','core=0',
        '--log-opt','max-size=2m','--log-opt','max-file=2',
        '--mount','type=bind,src='+str(RELEASE)+',dst=/app,readonly',
        '--mount','type=bind,src='+str(data)+',dst=/app-data',
        '--mount','type=bind,src=/srv/mossvale-cloud/secrets,dst=/run/secrets/mossvale,readonly',
        '--workdir','/app','-e','PORT=8796','-e','MYSTERY_DATA_DIR=/app-data',
        '-e','MYSTERY_COOKIE_PATH=/mystery/','-e','MYSTERY_SECURE_COOKIE=1','-e','TZ=Asia/Shanghai',
        image,'node','server/cloud-entry.mjs')
    health()
    for name in ['index.html','game.js','art/detective-icons-v1.png']:
        with urllib.request.urlopen('http://127.0.0.1:8796/'+name,timeout=10) as response:
            assert hashlib.sha256(response.read()).digest()==hashlib.sha256((RELEASE/'dist'/name).read_bytes()).digest()
    report('prepared-'+NAME,{'prepared':True,'release':str(RELEASE),'localSavesUploaded':False,'providerReady':True})
elif phase=='activate':
    health()
    old=LIVE.read_bytes()
    domain=old.index(b'server_name www.iambrizo.com iambrizo.com;')
    insertion=old.index(b'        location / {',domain)
    if b'/mystery' in old[domain:insertion]: raise SystemExit('Mystery route already exists; inspect before retrying')
    addition=(RELEASE/'deploy/nginx-location.conf').read_bytes()+b'\n'
    candidate=BASE/'nginx-candidate.conf';candidate.write_bytes(old[:insertion]+addition+old[insertion:]);candidate.chmod(0o644)
    backup=BASE/'backups'/('nginx-before-'+NAME+'.conf');backup.write_bytes(old);backup.chmod(0o600)
    image=run('docker','inspect','brizo-sync-tls','--format','{{.Config.Image}}')
    run('docker','run','--rm','--network','none','--read-only','--tmpfs','/tmp',
        '--mount','type=bind,src='+str(candidate)+',dst=/etc/nginx/nginx.conf,readonly',
        '--mount','type=bind,src=/srv/brizo-sync/letsencrypt,dst=/etc/letsencrypt,readonly',
        '--entrypoint','nginx',image,'-t')
    if LIVE.read_bytes()!=old: raise RuntimeError('Nginx changed during preparation')
    try:
        # Keep the inode mounted by the existing TLS container.
        LIVE.write_bytes(candidate.read_bytes())
        run('docker','exec','brizo-sync-tls','nginx','-t')
        run('docker','exec','brizo-sync-tls','nginx','-s','reload')
    except Exception:
        LIVE.write_bytes(old)
        run('docker','exec','brizo-sync-tls','nginx','-s','reload')
        raise
    (BASE/'current').symlink_to(RELEASE)
    report('activation-'+NAME,{'published':True,'url':'https://www.iambrizo.com/mystery/',
        'release':str(RELEASE),'nginxBackup':str(backup),'existingServicesRestarted':False,
        'localSavesUploaded':False,'independentDataDirectory':str(BASE/'data')})
elif phase=='rollback':
    addition=(RELEASE/'deploy/nginx-location.conf').read_bytes()+b'\n'
    old=LIVE.read_bytes()
    if old.count(addition)!=1: raise SystemExit('Route differs; inspect before rollback')
    try:
        LIVE.write_bytes(old.replace(addition,b'',1))
        run('docker','exec','brizo-sync-tls','nginx','-t')
        run('docker','exec','brizo-sync-tls','nginx','-s','reload')
    except Exception:
        LIVE.write_bytes(old);raise
    run('docker','stop',CONTAINER)
    report('rollback-'+NAME,{'rolledBack':True,'savesPreserved':True})
else: raise SystemExit('Unknown phase')
