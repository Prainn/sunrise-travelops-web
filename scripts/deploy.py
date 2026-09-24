#!/usr/bin/python3
"""Local frontend release and rollback, under the host build lock."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import sys
import signal
import tempfile
import time
import urllib.request

ENVIRONMENT = os.environ.get('DEPLOY_ENV', 'dev')
if ENVIRONMENT not in ('dev', 'prod'):
    raise ValueError('Invalid environment')
BASE = Path('/opt/sunrise-travelops-' + ENVIRONMENT + '/frontend')
SITE = 'http://127.0.0.1:8089'
HOST = 'ops-dev.sunrisevacation.cn' if ENVIRONMENT == 'dev' else 'ops.sunrisevacation.cn'
SHARED_DIRS = ('js', 'css', 'img', 'fonts', 'media', 'assets')
RELEASE_ID = re.compile(r'(?:[0-9a-f]{40}-[0-9]+-[0-9]+|bootstrap-[0-9]{14})')


def cleanup_plan():
    current = (BASE / 'current').resolve(strict=True)
    record = json.loads((BASE / 'last-deployment.json').read_text())
    previous = (BASE / (record['previous'] or 'current')).resolve(strict=True)
    releases = (BASE / 'releases').resolve(strict=True)
    if current.parent != releases or previous.parent != releases or not record.get('verified'):
        raise ValueError('Cannot establish protected frontend releases')
    verified = []
    legacy = []
    for path in releases.iterdir():
        if path.is_symlink() or not path.is_dir():
            continue
        if not RELEASE_ID.fullmatch(path.name) and path.name != '20260909-dev':
            continue
        marker = path / '.verified.json'
        if marker.is_file():
            info = json.loads(marker.read_text())
            if info.get('release') == path.name and info.get('verified') is True:
                verified.append((info['verifiedAt'], path))
        elif path.name == '20260909-dev' or path.name.startswith('bootstrap-'):
            legacy.append(path)
    latest = [path for _, path in sorted(verified, reverse=True)[:3]]
    keep = {current, previous, *latest}
    return {'keep': sorted(path.name for path in keep),
            'remove': sorted(path.name for path in [*(path for _, path in verified), *legacy] if path not in keep)}


def cleanup():
    plan = cleanup_plan()
    for name in plan['remove']:
        path = BASE / 'releases' / name
        if path.is_symlink():
            raise ValueError('Release became a symlink')
        shutil.rmtree(path)
    retained = set()
    for name in plan['keep']:
        directory = BASE / 'releases' / name
        for asset_dir in SHARED_DIRS:
            retained.update(str(asset.relative_to(directory)) for asset in (directory / asset_dir).rglob('*') if asset.is_file())
    # Keep unreferenced chunks for seven days for already-open browser tabs.
    for asset in (BASE / 'shared').rglob('*'):
        if asset.is_file() and str(asset.relative_to(BASE / 'shared')) not in retained and asset.stat().st_mtime < time.time() - 7 * 86400:
            asset.unlink()
    return plan


def cleanup_after_success(deployment):
    try:
        (BASE / 'releases' / deployment['release'] / '.verified.json').write_text(json.dumps({
            'release': deployment['release'], 'verified': True, 'verifiedAt': deployment['deployedAt'],
        }) + '\n')
        print(json.dumps({'cleanup': cleanup()}), file=sys.stderr)
    except Exception as error:
        print('::warning::Frontend release cleanup failed: ' + str(error), file=sys.stderr)


def switch(target):
    pending = BASE / '.current-next'
    pending.unlink(missing_ok=True)
    pending.symlink_to(target)
    pending.replace(BASE / 'current')


def fetch(path):
    request = urllib.request.Request(SITE + path, headers={'Cache-Control': 'no-cache', 'Host': HOST})
    with urllib.request.urlopen(request, timeout=15) as response:
        return response.read()


def verify(release):
    expected = (release / 'index.html').read_bytes()
    for path in ['/', '/inquiries']:
        if fetch(path) != expected:
            raise ValueError('Published HTML does not match release: ' + path)
    if fetch('/__deploy.json') != (release / '__deploy.json').read_bytes():
        raise ValueError('Published release marker does not match')
    entry_assets = re.findall(r'(?:src|href)="(/(?:js|css)/[^"?#]+)', expected.decode())
    if not entry_assets:
        raise ValueError('No entry assets found')
    for path in set(entry_assets):
        if fetch(path) != (release / path.lstrip('/')).read_bytes():
            raise ValueError('Published asset does not match: ' + path)


def publish(release_id, source_directory):
    if not RELEASE_ID.fullmatch(release_id):
        raise ValueError('Invalid release ID')
    destination = BASE / 'releases' / release_id
    if destination.exists():
        raise ValueError('Release already exists; use a new run attempt')
    previous = os.readlink(BASE / 'current') if (BASE / 'current').is_symlink() else None
    with tempfile.TemporaryDirectory(prefix='.upload-', dir=BASE) as temp:
        stage = Path(temp)
        shutil.copytree(source_directory, stage, dirs_exist_ok=True)
        # Runner's private umask must not make public static files unreadable to Nginx.
        for path in stage.rglob('*'):
            path.chmod(0o755 if path.is_dir() else 0o644)
        if not (stage / 'index.html').is_file() or not (stage / 'js').is_dir():
            raise ValueError('Missing index.html or js')
        (stage / '__deploy.json').write_text(json.dumps({'release': release_id}) + '\n')
        # Hashed assets are shared so open browser tabs can load the older chunks.
        for directory in SHARED_DIRS:
            for source in (stage / directory).rglob('*'):
                if not source.is_file():
                    continue
                target = BASE / 'shared' / source.relative_to(stage)
                target.parent.mkdir(parents=True, exist_ok=True)
                if target.exists():
                    if source.read_bytes() != target.read_bytes():
                        raise ValueError('Asset filename collision: ' + target.name)
                else:
                    shutil.copyfile(source, target)
        # TemporaryDirectory defaults to 0700; Nginx must read this directory.
        stage.chmod(0o755)
        stage.rename(destination)
    switch('releases/' + release_id)
    try:
        verify(destination)
    except Exception:
        if previous:
            switch(previous)
            verify(BASE / previous)
        else:
            (BASE / 'current').unlink(missing_ok=True)
        raise
    deployment = {
        'release': release_id, 'previous': previous, 'verified': True,
        'deployedAt': datetime.now(timezone.utc).isoformat(),
    }
    pending = BASE / 'last-deployment.json.next'
    pending.write_text(json.dumps(deployment) + '\n')
    pending.replace(BASE / 'last-deployment.json')
    cleanup_after_success(deployment)
    return deployment


def main():
    os.umask(0o022)
    args = sys.argv[1:]
    if args == ['status']:
        print(json.dumps({'current': os.readlink(BASE / 'current')}))
        return
    # Finish the bounded activation or restoration even if Actions is cancelled.
    for signum in (signal.SIGHUP, signal.SIGTERM, signal.SIGINT):
        signal.signal(signum, signal.SIG_IGN)
    if os.environ.get('SUNRISE_LOCK_HELD') != '1':
        raise ValueError('Run through workflow holding /opt/sunrise-ci/build.lock')
    (BASE / 'releases').mkdir(parents=True, exist_ok=True)
    if len(args) == 3 and args[0] == 'deploy':
        result = publish(args[1], Path(args[2]).resolve(strict=True))
    elif len(args) == 2 and args[0] == 'rollback':
        record = json.loads((BASE / 'last-deployment.json').read_text())
        target = record.get('previous') if args[1] == 'previous' else 'releases/' + args[1]
        if not target or not RELEASE_ID.fullmatch(Path(target).name):
            raise ValueError('No valid rollback target')
        destination = (BASE / target).resolve(strict=True)
        if destination.parent != (BASE / 'releases').resolve() or not (destination / '.verified.json').is_file():
            raise ValueError('Rollback target is not a retained verified release')
        marker = json.loads((destination / '.verified.json').read_text())
        if marker.get('release') != destination.name or marker.get('verified') is not True:
            raise ValueError('Rollback verification record does not match target')
        previous = os.readlink(BASE / 'current')
        switch(target)
        try:
            verify(destination)
        except Exception:
            switch(previous)
            verify(BASE / previous)
            raise
        result = {'release': destination.name, 'previous': previous, 'verified': True,
                  'deployedAt': datetime.now(timezone.utc).isoformat()}
        pending = BASE / 'last-deployment.json.next'
        pending.write_text(json.dumps(result) + '\n')
        pending.replace(BASE / 'last-deployment.json')
    else:
        raise ValueError('Expected deploy <release> <directory>, rollback <release|previous>, or status')
    print(json.dumps(result))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Frontend deployment failed: ' + str(error), file=sys.stderr)
        sys.exit(1)
