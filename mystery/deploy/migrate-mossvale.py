"""Publish the mystery game at /mossvale/; preserve data and the previous release.

Run on the existing cloud host with sudo -n. Phases: prepare <sha256>, activate,
finish <test-session-file>, rollback. No local saves or secrets belong in the upload.
"""
from pathlib import Path
import hashlib, json, os, re, shutil, subprocess, sys, tarfile, tempfile, time
import urllib.request

BASE = Path('/srv/mossvale-mystery')
NAME = '20261031-mossvale-mystery-v11'
PREVIOUS = BASE / 'releases/20261031-mystery-intrigue-v10'
RELEASE = BASE / 'releases' / NAME
ARCHIVE = Path('/tmp/mystery-' + NAME + '.tgz')
CURRENT = BASE / 'current'
DATA = BASE / 'data'
MAIN = 'mossvale-mystery'
OLD = 'mossvale-mystery-before-mossvale-v11'
CHECK = 'mossvale-mystery-check-mossvale-v11'
LIVE = Path('/srv/brizo-sync/current/services/device-sync/deploy/nginx.conf')
ORIGINAL_NGINX = '74c007632dfba7882985916c6d72bc0bd0f524612a9b735eb8479433939c152d'
BACKUPS = BASE / 'backups'
NGINX_BACKUP = BACKUPS / ('nginx-before-' + NAME + '.conf')
CANDIDATE = BASE / ('nginx-' + NAME + '.conf')
DATA_BACKUP = BACKUPS / ('before-' + NAME + '.tgz')
OTHERS = ['mossvale-cloud', 'mossvale-preview', 'brizo-sync-tls', 'brizo-sync-relay', 'brizo-landing', 'brizo-newsletter']

def run(*args):
    return subprocess.check_output(args, stderr=subprocess.STDOUT).decode().strip()

def digest(data):
    return hashlib.sha256(data).hexdigest()

def record(phase, value):
    p = BACKUPS / (phase + '-' + NAME + '.json')
    p.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n'); p.chmod(0o600)
    print(json.dumps({'phase': phase, **value}, ensure_ascii=False), flush=True)

def read_record(phase):
    return json.loads((BACKUPS / (phase + '-' + NAME + '.json')).read_text())

def files_snapshot(folder):
    return {str(p.relative_to(folder)): {'sha256': digest(p.read_bytes()), 'mtimeNs': p.stat().st_mtime_ns}
            for p in folder.rglob('*') if p.is_file()}

def health(port):
    for _ in range(40):
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health', timeout=2) as response:
                result = json.load(response)
                if result.get('ok') and result.get('ai', {}).get('ready'): return result
        except Exception:
            pass
        time.sleep(.5)
    raise RuntimeError('Service did not become ready')

def manifest():
    result = json.loads((RELEASE / 'deploy/release-manifest-mossvale-v11.json').read_text())
    assert result['release'] == NAME and result['previousRelease'] == PREVIOUS.name
    for name, expected in result['files'].items():
        p = (RELEASE / name).resolve()
        assert str(p).startswith(str(RELEASE) + os.sep) and digest(p.read_bytes()) == expected, name
    return result

def check_static(port, listing):
    for name, expected in listing['files'].items():
        if name.startswith('dist/'):
            with urllib.request.urlopen(f'http://127.0.0.1:{port}/' + name[5:], timeout=10) as response:
                assert digest(response.read()) == expected, name

def docker_start(name, port, release, data, image, restart):
    return run('docker', 'run', '-d', '--name', name, '--restart', restart,
        '--init', '--network', 'host', '--user', '1000:1000', '--read-only',
        '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--pids-limit', '64',
        '--cpus', '1', '--memory', '384m', '--memory-swap', '384m', '--ulimit', 'core=0',
        '--log-opt', 'max-size=2m', '--log-opt', 'max-file=2',
        '--mount', f'type=bind,src={release},dst=/app,readonly',
        '--mount', f'type=bind,src={data},dst=/app-data',
        '--mount', 'type=bind,src=/srv/mossvale-cloud/secrets,dst=/run/secrets/mossvale,readonly',
        '--mount', f'type=bind,src={BASE}/secrets/qwen.json,dst=/run/secrets/mystery/qwen.json,readonly',
        '--workdir', '/app', '-e', f'PORT={port}', '-e', 'MYSTERY_DATA_DIR=/app-data',
        '-e', 'MYSTERY_QWEN_CONFIG=/run/secrets/mystery/qwen.json',
        '-e', 'MYSTERY_COOKIE_PATH=/mossvale/', '-e', 'MYSTERY_SECURE_COOKIE=1',
        '-e', 'TZ=Asia/Shanghai', image, 'node', 'server/cloud-entry.mjs')

def restore():
    # v10 and v11 share the six-role archive format; always retain current saves.
    subprocess.run(['docker', 'rm', '-f', MAIN], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    run('docker', 'rename', OLD, MAIN); run('docker', 'start', MAIN); health(8796)
    LIVE.write_bytes(NGINX_BACKUP.read_bytes())
    run('docker', 'exec', 'brizo-sync-tls', 'nginx', '-t')
    run('docker', 'exec', 'brizo-sync-tls', 'nginx', '-s', 'reload')
    temporary = BASE / ('restore-' + NAME); temporary.symlink_to(PREVIOUS); os.replace(temporary, CURRENT)

phase = sys.argv[1]
if phase == 'prepare':
    assert CURRENT.resolve() == PREVIOUS and not RELEASE.exists()
    assert digest(LIVE.read_bytes()) == ORIGINAL_NGINX
    assert digest(ARCHIVE.read_bytes()) == sys.argv[2]
    RELEASE.mkdir()
    with tarfile.open(ARCHIVE, 'r:gz') as tar:
        for item in tar.getmembers():
            parts = Path(item.name).parts
            assert parts and parts[0] in ['dist', 'server', 'shared', 'node_modules', 'deploy', 'package.json', 'package-lock.json']
            assert '..' not in parts and not item.issym() and not item.islnk() and (item.isdir() or item.isfile())
        tar.extractall(RELEASE)
    for p in [RELEASE] + list(RELEASE.rglob('*')): p.chmod(0o755 if p.is_dir() else 0o644)
    listing = manifest()
    original = LIVE.read_text()
    domain = original.index('server_name www.iambrizo.com iambrizo.com;')
    start = original.index('        location = /mossvale ', domain)
    end = original.index('        location / {', start)
    replaced = original[start:end]
    assert replaced.count('location = /mossvale ') == 1 and '127.0.0.1:8792' in replaced
    assert replaced.count('location = /mystery ') == 1 and '127.0.0.1:8796' in replaced
    candidate = original[:start] + (RELEASE / 'deploy/nginx-location.conf').read_text() + '\n' + original[end:]
    CANDIDATE.write_text(candidate); CANDIDATE.chmod(0o644)
    NGINX_BACKUP.write_text(original); NGINX_BACKUP.chmod(0o600)
    image = run('docker', 'inspect', MAIN, '--format', '{{.Config.Image}}')
    nginx_image = run('docker', 'inspect', 'brizo-sync-tls', '--format', '{{.Config.Image}}')
    run('docker', 'run', '--rm', '--network', 'none', '--read-only', '--tmpfs', '/tmp',
        '--mount', f'type=bind,src={CANDIDATE},dst=/etc/nginx/nginx.conf,readonly',
        '--mount', 'type=bind,src=/srv/brizo-sync/letsencrypt,dst=/etc/letsencrypt,readonly',
        '--entrypoint', 'nginx', nginx_image, '-t')
    baseline = {'saves': files_snapshot(DATA), 'nginxHash': ORIGINAL_NGINX,
        'otherServices': {n: run('docker', 'inspect', n, '--format', '{{.State.StartedAt}}') for n in OTHERS}}
    baseline_file = BACKUPS / ('baseline-' + NAME + '.json')
    baseline_file.write_text(json.dumps(baseline)); baseline_file.chmod(0o600)
    folder = Path(tempfile.mkdtemp(prefix='preflight-mossvale-v11-', dir=BASE)); os.chown(folder, 1000, 1000)
    try:
        docker_start(CHECK, 8797, RELEASE, folder, image, 'no'); ready = health(8797)
        check_static(8797, listing)
        with urllib.request.urlopen('http://127.0.0.1:8797/api/voice/status', timeout=5) as response:
            assert json.load(response)['ready']
        assert not list(folder.iterdir())
        run('docker', 'rm', '-f', CHECK)
        for p in DATA.glob('*.json'):
            if re.fullmatch('[a-f0-9]{32}\\.json', p.name):
                shutil.copy2(p, folder / p.name); os.chown(folder / p.name, 1000, 1000)
        compat = json.loads(run('docker', 'run', '--rm', '--network', 'none', '--read-only', '--user', '1000:1000',
            '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
            '--mount', f'type=bind,src={RELEASE},dst=/app,readonly',
            '--mount', f'type=bind,src={PREVIOUS},dst=/previous,readonly',
            '--mount', f'type=bind,src={folder},dst=/app-data,readonly',
            image, 'node', '/app/deploy/check-save-compat.mjs'))
        assert compat['passed']
        assert digest(LIVE.read_bytes()) == ORIGINAL_NGINX
        record('preflight', {'passed': True, 'releaseFiles': len(listing['files']),
            'saveCompatibility': compat, 'nginxSyntax': True, 'candidateHash': digest(CANDIDATE.read_bytes()),
            'providerReady': ready['ai']['ready'], 'voiceReady': True, 'modelCalls': 0})
    finally:
        subprocess.run(['docker', 'rm', '-f', CHECK], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        shutil.rmtree(folder)
elif phase == 'activate':
    prepared = read_record('preflight'); assert prepared['passed']
    assert CURRENT.resolve() == PREVIOUS and not DATA_BACKUP.exists()
    assert digest(LIVE.read_bytes()) == ORIGINAL_NGINX
    assert digest(CANDIDATE.read_bytes()) == prepared['candidateHash']
    listing = manifest(); image = run('docker', 'inspect', MAIN, '--format', '{{.Config.Image}}')
    stopped = renamed = False
    try:
        run('docker', 'stop', '--time', '25', MAIN); stopped = True
        run('tar', '-czf', str(DATA_BACKUP), '-C', str(BASE), 'data'); DATA_BACKUP.chmod(0o600)
        run('docker', 'rename', MAIN, OLD); renamed = True
        docker_start(MAIN, 8796, RELEASE, DATA, image, 'unless-stopped'); health(8796); check_static(8796, listing)
        # Preserve the inode bind-mounted by the running TLS container.
        LIVE.write_bytes(CANDIDATE.read_bytes())
        run('docker', 'exec', 'brizo-sync-tls', 'nginx', '-t')
        run('docker', 'exec', 'brizo-sync-tls', 'nginx', '-s', 'reload')
        temporary = BASE / ('current-' + NAME); temporary.symlink_to(RELEASE); os.replace(temporary, CURRENT)
        record('activation', {'published': True, 'url': 'https://www.iambrizo.com/mossvale/',
            'release': str(RELEASE), 'saveBackup': str(DATA_BACKUP), 'nginxBackup': str(NGINX_BACKUP),
            'oldLinkRedirectsWithSession': True, 'oldApiPreserved': True, 'modelCalls': 0})
    except Exception:
        if renamed: restore()
        elif stopped: run('docker', 'start', MAIN)
        raise
elif phase == 'finish':
    baseline = read_record('baseline'); ids = json.loads(Path(sys.argv[2]).read_text())['sessions']
    assert len(ids) == 2 and len(set(ids)) == 2
    for sid in ids:
        assert re.fullmatch('[a-f0-9]{32}', sid) and sid + '.json' not in baseline['saves']
        p = DATA / (sid + '.json'); assert p.is_file(); p.unlink()
    assert CURRENT.resolve() == RELEASE and digest(LIVE.read_bytes()) == digest(CANDIDATE.read_bytes())
    for n, started in baseline['otherServices'].items():
        assert run('docker', 'inspect', n, '--format', '{{.State.StartedAt}}') == started
    current = files_snapshot(DATA); assert set(baseline['saves']) <= set(current)
    unchanged = sum(current[k] == v for k, v in baseline['saves'].items())
    assert DATA_BACKUP.exists() and NGINX_BACKUP.exists()
    assert run('docker', 'inspect', OLD, '--format', '{{.State.Running}}') == 'false'
    listing = manifest()
    record('verification', {'passed': True, 'originalFiles': len(baseline['saves']), 'unchangedOriginalFiles': unchanged,
        'testSavesRemoved': 2, 'releaseFiles': len(listing['files']), 'otherServicesNotRestarted': True,
        'nginxReloadOnly': True, 'backupsRetained': True, 'modelCalls': 0})
elif phase == 'rollback':
    assert CURRENT.resolve() == RELEASE
    assert digest(LIVE.read_bytes()) == digest(CANDIDATE.read_bytes())
    restore(); record('rollback', {'restored': True, 'previousRelease': PREVIOUS.name, 'savesPreserved': True})
else:
    raise SystemExit('Unknown phase')
