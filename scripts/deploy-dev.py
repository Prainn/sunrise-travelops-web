#!/usr/bin/python3
"""SSH forced command, installed root-owned; executed as sunrise-deploy."""
from contextlib import contextmanager
import select
import signal
import fcntl
from datetime import datetime, timezone
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import sys
import tarfile
import tempfile
import time
import urllib.request

BASE = Path('/opt/sunrise-travelops-dev/frontend')
SITE = 'https://ops-dev.sunrisevacation.cn'
SHARED_DIRS = ('js', 'css', 'img', 'fonts', 'media', 'assets')
RELEASE_ID = re.compile(r'(?:[0-9a-f]{40}-[0-9]+-[0-9]+|bootstrap-[0-9]{14})')


# Uploads are cancellable and do not hold the activation lock. Once activation
# starts, finish the bounded operation (or its rollback) even if SSH disconnects.
def upload_signal(signum, _frame):
    raise RuntimeError('Upload cancelled by signal ' + str(signum))


def receive(stream, output, expected, limit, total_timeout=480, idle_timeout=30):
    if not 0 < expected <= limit:
        raise ValueError('Invalid upload size')
    started = last_data = last_report = time.monotonic()
    total = 0
    fd = stream.fileno()
    print(f'Upload: expected {expected} bytes; deadline {total_timeout}s, idle {idle_timeout}s',
          file=sys.stderr, flush=True)
    while True:
        now = time.monotonic()
        if now - started >= total_timeout or now - last_data >= idle_timeout:
            raise TimeoutError(f'Upload timed out: {total}/{expected} bytes; application unchanged')
        if now - last_report >= 10:
            rate = total / max(now - started, 0.001)
            print(f'Upload: {total}/{expected} bytes ({total * 100 / expected:.1f}%), '
                  f'average {rate / 1024:.1f} KiB/s', file=sys.stderr, flush=True)
            last_report = now
        if not select.select([fd], [], [], min(1, total_timeout - (now - started),
                                              idle_timeout - (now - last_data)))[0]:
            continue
        block = os.read(fd, 64 * 1024)
        if not block:
            if total != expected:
                raise ValueError(f'Incomplete upload: {total}/{expected} bytes; application unchanged')
            break
        total += len(block)
        if total > expected:
            raise ValueError('Upload exceeds declared size')
        output.write(block)
        last_data = time.monotonic()
    output.seek(0)
    print(f'Upload complete: {total} bytes in {time.monotonic() - started:.1f}s',
          file=sys.stderr, flush=True)


@contextmanager
def deployment_lock():
    with (BASE / '.deploy.lock').open('a') as lock:
        deadline = time.monotonic() + 60
        while True:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if time.monotonic() >= deadline:
                    raise TimeoutError('Another deployment holds the activation lock for over 60s')
                time.sleep(0.2)
        try:
            yield
        finally:
            fcntl.flock(lock, fcntl.LOCK_UN)


def finish_activation():
    for signum in (signal.SIGHUP, signal.SIGTERM, signal.SIGINT):
        signal.signal(signum, signal.SIG_IGN)
    try:
        print('Activation: lock acquired; completing deployment or rollback after disconnect',
              file=sys.stderr, flush=True)
    except OSError:
        pass


def cleanup_plan():
    current = (BASE / 'current').resolve(strict=True)
    record = json.loads((BASE / 'last-deployment.json').read_text())
    previous = (BASE / record['previous']).resolve(strict=True)
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


def unpack(stream, destination):
    total = 0
    with tarfile.open(fileobj=stream, mode='r|gz') as archive:
        for member in archive:
            name = PurePosixPath(member.name)
            if name.is_absolute() or '..' in name.parts or not (member.isdir() or member.isfile()):
                raise ValueError('Archive contains an unsafe path or file type')
            total += member.size
            if total > 200 * 1024 * 1024:
                raise ValueError('Unpacked frontend exceeds 200 MiB')
            target = destination.joinpath(*name.parts)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.extractfile(member) as source, target.open('xb') as output:
                    shutil.copyfileobj(source, output)


def fetch(path):
    request = urllib.request.Request(SITE + path, headers={'Cache-Control': 'no-cache'})
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


def publish(release_id, stream):
    if not RELEASE_ID.fullmatch(release_id):
        raise ValueError('Invalid release ID')
    destination = BASE / 'releases' / release_id
    if destination.exists():
        raise ValueError('Release already exists; use a new run attempt')
    previous = os.readlink(BASE / 'current')
    with tempfile.TemporaryDirectory(prefix='.upload-', dir=BASE) as temp:
        stage = Path(temp)
        unpack(stream, stage)
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
        switch(previous)
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
    if sys.argv[1:] in [['cleanup-plan'], ['cleanup']] and os.geteuid() == 0:
        with deployment_lock():
            finish_activation()
            verify((BASE / 'current').resolve(strict=True))
            print(json.dumps(cleanup_plan() if sys.argv[1] == 'cleanup-plan' else cleanup()))
        return
    command = os.environ.get('SSH_ORIGINAL_COMMAND', '')
    if command == 'status':
        print(json.dumps({'current': os.readlink(BASE / 'current')}))
        return
    match = re.fullmatch(r'deploy (\S+) ([0-9]{1,10})', command)
    if not match:
        raise ValueError('Only deploy <release-id> and status are permitted')
    if not RELEASE_ID.fullmatch(match[1]):
        raise ValueError('Invalid release ID')
    for signum in (signal.SIGHUP, signal.SIGTERM, signal.SIGINT):
        signal.signal(signum, upload_signal)
    previous_release = os.readlink(BASE / 'current')
    with tempfile.TemporaryFile(dir=BASE) as compressed:
        receive(sys.stdin.buffer, compressed, int(match[2]), 200 * 1024 * 1024)
        with deployment_lock():
            if os.readlink(BASE / 'current') != previous_release:
                raise ValueError('Current release changed during upload; retry')
            finish_activation()
            print(json.dumps(publish(match[1], compressed)))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Deployment failed: ' + str(error), file=sys.stderr)
        sys.exit(1)
