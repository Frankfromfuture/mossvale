"""Stage and switch an existing mystery release with isolated checks and a private voice configuration.

Run on the cloud host with sudo -n. The upload is a release archive containing
dist, server, shared, deploy, the locked ws runtime, and package metadata.
"""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tarfile
import time
import urllib.request

BASE = Path('/srv/mossvale-mystery')
NAME = '20261102-mossvale-0.13.2-v16'
PREVIOUS = BASE/'releases'/'20261101-mossvale-0.10.1-v15'
RELEASE = BASE/'releases'/NAME
ARCHIVE = Path('/tmp/mystery-'+NAME+'.tgz')
CURRENT = BASE/'current'
DATA = BASE/'data'
PREFLIGHT_DATA = BASE/('preflight-data-'+NAME)
MAIN = 'mossvale-mystery'
CHECK = 'mossvale-mystery-check-v16'
OLD = 'mossvale-mystery-before-v16'
MANIFEST = 'deploy/release-manifest-v16.json'
BACKUP = BASE/'backups'/('before-'+NAME+'.tgz')
LIVE = Path('/srv/brizo-sync/current/services/device-sync/deploy/nginx.conf')
NGINX_PREVIOUS_HASH = '32143d62eab3f572a6183b915ba6fcb6350604db562badfd9933edd05eb96e9e'


def check_nginx():
    if digest(LIVE.read_bytes()) != NGINX_PREVIOUS_HASH:
        raise RuntimeError('Nginx changed since the release baseline')


def check_compatible_archives():
    for p in DATA.glob('*.json'):
        if json.loads(p.read_text()).get('format') not in (None, 'six-roles-v1'):
            raise RuntimeError('Unknown save format; preserve data before switching releases')


def run(*args):
    try:
        return subprocess.check_output(args, stderr=subprocess.STDOUT).decode().strip()
    except subprocess.CalledProcessError as error:
        print(error.output.decode(errors='replace')[-6000:], file=sys.stderr)
        raise


def digest(data):
    return hashlib.sha256(data).hexdigest()


def health(port):
    for _ in range(40):
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health', timeout=2) as response:
                result = json.load(response)
                if result.get('ok') and result.get('ai', {}).get('ready'):
                    return result
        except Exception:
            pass
        time.sleep(.5)
    raise RuntimeError(f'Mystery service on {port} did not become ready')


def manifest():
    result = json.loads((RELEASE/MANIFEST).read_text())
    if result.get('release') != NAME or result.get('previousRelease') != PREVIOUS.name:
        raise RuntimeError('Unexpected release manifest')
    for name, expected in result['files'].items():
        path = (RELEASE/name).resolve()
        if not str(path).startswith(str(RELEASE)+os.sep) or digest(path.read_bytes()) != expected:
            raise RuntimeError('Release file differs: '+name)
    return result


def check_static(port, listing):
    for name, expected in listing['files'].items():
        if not name.startswith('dist/'):
            continue
        with urllib.request.urlopen(f'http://127.0.0.1:{port}/'+name[5:], timeout=10) as response:
            if digest(response.read()) != expected:
                raise RuntimeError('Served asset differs: '+name)


def docker_start(name, port, release, data, image, restart):
    return run('docker', 'run', '-d', '--name', name, '--restart', restart,
               '--init', '--network', 'host', '--user', '1000:1000',
               '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
               '--pids-limit', '64', '--cpus', '1', '--memory', '384m', '--memory-swap', '384m',
               '--ulimit', 'core=0', '--log-opt', 'max-size=2m', '--log-opt', 'max-file=2',
               '--mount', f'type=bind,src={release},dst=/app,readonly',
               '--mount', f'type=bind,src={data},dst=/app-data',
               '--mount', 'type=bind,src=/srv/mossvale-cloud/secrets,dst=/run/secrets/mossvale,readonly',
               '--mount', f'type=bind,src={BASE}/secrets/qwen.json,dst=/run/secrets/mystery/qwen.json,readonly',
               '-e', 'MYSTERY_QWEN_CONFIG=/run/secrets/mystery/qwen.json',
               '--workdir', '/app', '-e', f'PORT={port}', '-e', 'MYSTERY_DATA_DIR=/app-data',
               '-e', 'MYSTERY_COOKIE_PATH=/mossvale/', '-e', 'MYSTERY_SECURE_COOKIE=1',
               '-e', 'TZ=Asia/Shanghai', image, 'node', 'server/cloud-entry.mjs')


def record(phase, result):
    (BASE/'backups'/(phase+'-'+NAME+'.json')).write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(json.dumps(result, ensure_ascii=False))


phase = sys.argv[1]
if phase == 'prepare':
    if (CURRENT.resolve() != PREVIOUS or PREFLIGHT_DATA.exists()
            or (RELEASE.exists() and (BASE/'backups'/('preflight-'+NAME+'.json')).exists())):
        raise SystemExit('Unexpected current or existing release; inspect before retrying')
    if digest(ARCHIVE.read_bytes()) != sys.argv[2]:
        raise RuntimeError('Archive checksum mismatch')
    RELEASE.mkdir(exist_ok=True)
    with tarfile.open(ARCHIVE, 'r:gz') as tar:
        members = tar.getmembers()
        for item in members:
            parts = Path(item.name).parts
            if (not parts or parts[0] not in ('dist', 'server', 'shared', 'deploy', 'node_modules', 'package.json', 'package-lock.json')
                    or '..' in parts or item.issym() or item.islnk()
                    or not (item.isdir() or item.isfile())):
                raise RuntimeError('Unexpected archive path')
        tar.extractall(RELEASE)
    for item in [RELEASE] + list(RELEASE.rglob('*')):
        item.chmod(0o755 if item.is_dir() else 0o644)
    listing = manifest()
    PREFLIGHT_DATA.mkdir(mode=0o700)
    os.chown(PREFLIGHT_DATA, 1000, 1000)
    image = run('docker', 'inspect', MAIN, '--format', '{{.Config.Image}}')
    passed = False
    try:
        docker_start(CHECK, 8797, RELEASE, PREFLIGHT_DATA, image, 'no')
        ready = health(8797)
        with urllib.request.urlopen('http://127.0.0.1:8797/api/voice/status', timeout=5) as response:
            if not json.load(response).get('ready'):
                raise RuntimeError('Qwen voice configuration is unavailable')
        check_static(8797, listing)
        check_nginx()
        if any(PREFLIGHT_DATA.iterdir()):
            raise RuntimeError('Preflight unexpectedly wrote a save')
        smoke = None
        if '--deepseek-smoke' in sys.argv:
            smoke = json.loads(run('docker', 'exec', CHECK, 'node', '/app/deploy/check-deepseek.mjs'))
            if not smoke.get('passed') or any(PREFLIGHT_DATA.iterdir()):
                raise RuntimeError('DeepSeek smoke check failed or left a test save')
        run('docker', 'rm', '-f', CHECK)
        for p in DATA.glob('*.json'):
            if len(p.stem) == 32 and all(c in '0123456789abcdef' for c in p.stem):
                shutil.copy2(p, PREFLIGHT_DATA/p.name)
                os.chown(PREFLIGHT_DATA/p.name, 1000, 1000)
        compat = json.loads(run('docker', 'run', '--rm', '--network', 'none', '--read-only', '--user', '1000:1000',
            '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
            '--mount', f'type=bind,src={RELEASE},dst=/app,readonly',
            '--mount', f'type=bind,src={PREVIOUS},dst=/previous,readonly',
            '--mount', f'type=bind,src={PREFLIGHT_DATA},dst=/app-data,readonly',
            image, 'node', '/app/deploy/check-save-compat.mjs'))
        if not compat.get('passed'):
            raise RuntimeError('Save compatibility check failed')
        passed = True
        record('preflight', {'passed': True, 'release': str(RELEASE),
                             'assetHashesMatch': True, 'providerReady': ready['ai']['ready'],
                             'saveCompatibility': compat, 'deepseekSmoke': smoke, 'modelCalls': smoke['modelCalls'] if smoke else 0})
    finally:
        subprocess.run(['docker', 'rm', '-f', CHECK], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if PREFLIGHT_DATA.exists():
            shutil.rmtree(PREFLIGHT_DATA)
        if not passed:
            print('Preflight failed; production container and saves are unchanged.', file=sys.stderr)
elif phase == 'activate':
    preflight = json.loads((BASE/'backups'/('preflight-'+NAME+'.json')).read_text())
    if not preflight.get('passed') or CURRENT.resolve() != PREVIOUS or not RELEASE.is_dir() or BACKUP.exists():
        raise SystemExit('Release state changed; inspect before activation')
    listing = manifest()
    check_nginx()
    check_compatible_archives()
    image = run('docker', 'inspect', MAIN, '--format', '{{.Config.Image}}')
    stopped = renamed = False
    try:
        run('docker', 'stop', '--time', '25', MAIN)
        stopped = True
        run('tar', '-czf', str(BACKUP), '-C', str(BASE), 'data')
        BACKUP.chmod(0o600)
        run('docker', 'rename', MAIN, OLD)
        renamed = True
        docker_start(MAIN, 8796, RELEASE, DATA, image, 'unless-stopped')
        ready = health(8796)
        check_static(8796, listing)
        check_nginx()
        temporary = BASE/('current-'+NAME)
        temporary.symlink_to(RELEASE)
        os.replace(temporary, CURRENT)
        record('activation', {'published': True, 'url': 'https://www.iambrizo.com/mossvale/',
                              'release': str(RELEASE), 'previousRelease': str(PREVIOUS),
                              'saveBackup': str(BACKUP), 'providerReady': ready['ai']['ready'],
                              'assetHashesMatch': True, 'nginxChanged': False,
                              'otherServicesRestarted': False})
    except Exception:
        if renamed:
            check_compatible_archives()
            subprocess.run(['docker', 'rm', '-f', MAIN], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            run('docker', 'rename', OLD, MAIN)
            run('docker', 'start', MAIN)
            if CURRENT.resolve() == RELEASE:
                temporary = BASE/('current-restore-'+PREVIOUS.name)
                temporary.symlink_to(PREVIOUS)
                os.replace(temporary, CURRENT)
        elif stopped:
            run('docker', 'start', MAIN)
        raise
elif phase == 'rollback':
    if CURRENT.resolve() != RELEASE:
        raise SystemExit('This release is not current')
    check_nginx()
    check_compatible_archives()
    run('docker', 'stop', '--time', '25', MAIN)
    run('docker', 'rename', MAIN, 'mossvale-mystery-after-v16')
    run('docker', 'rename', OLD, MAIN)
    run('docker', 'start', MAIN)
    health(8796)
    temporary = BASE/('current-'+PREVIOUS.name)
    temporary.symlink_to(PREVIOUS)
    os.replace(temporary, CURRENT)
    record('rollback', {'rolledBack': True, 'savesPreserved': True, 'release': str(PREVIOUS)})
else:
    raise SystemExit('Unknown phase')
