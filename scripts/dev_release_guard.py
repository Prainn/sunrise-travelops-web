#!/usr/bin/env python3
"""Dev-only local release deadlines and an independent orphan-process watchdog."""
import fcntl
import json
import os
from pathlib import Path
import pwd
import re
import signal
import subprocess
import sys
import tempfile
import time

INSTALL = Path('/opt/sunrise-ci/frontend-dev-guard')
JOBS = INSTALL / 'jobs'
LOCK = Path('/opt/sunrise-ci/build.lock')
BASE = Path('/opt/sunrise-travelops-dev/frontend')
IDENTITY_KEYS = ('GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT',
                 'GITHUB_REPOSITORY', 'GITHUB_REF', 'DEPLOY_ENV')
RELEASE = re.compile(r'[0-9a-f]{40}-[0-9]+-[0-9]+')
GRACE = 30


def save(path, value):
    temporary = path.with_suffix('.next-' + str(os.getpid()))
    temporary.write_text(json.dumps(value) + '\n')
    temporary.chmod(0o600)
    if os.geteuid() == 0 and path.exists():
        os.chown(temporary, path.stat().st_uid, path.stat().st_gid)
    temporary.replace(path)


def boot_id():
    return Path('/proc/sys/kernel/random/boot_id').read_text().strip()


def process(pid):
    try:
        base = Path('/proc') / str(pid)
        fields = (base / 'stat').read_text().rsplit(')', 1)[1].split()
        env = dict(item.split('=', 1) for item in (base / 'environ').read_text().split('\0') if '=' in item)
        return {'pid': pid, 'state': fields[0], 'pgid': int(fields[2]),
                'start': int(fields[19]), 'uid': base.stat().st_uid, 'env': env}
    except (OSError, ValueError, IndexError):
        return None


def members(pgid):
    result = []
    if not pgid:
        return result
    for path in Path('/proc').iterdir():
        if path.name.isdigit():
            info = process(int(path.name))
            if info and info['pgid'] == pgid and info['state'] != 'Z':
                result.append(info)
    return result


def matches(info, state):
    return info['uid'] == state['uid'] and all(
        info['env'].get(key) == value for key, value in state['identity'].items())


def controller(state):
    info = process(state['pid'])
    return info if info and info['start'] == state['start'] and matches(info, state) else None


def signal_children(state, signum):
    group = members(state.get('pgid'))
    if any(not matches(info, state) for info in group):
        raise RuntimeError('Process group identity changed; refusing to signal it')
    for info in group:
        # Recheck start time before signalling to avoid killing a reused PID.
        current = process(info['pid'])
        if current and current['start'] == info['start'] and matches(current, state):
            try:
                os.kill(info['pid'], signum)
            except ProcessLookupError:
                pass


def memory_sample(pid):
    try:
        relative = (Path('/proc') / str(pid) / 'cgroup').read_text().split('0::', 1)[1].strip()
        group = Path('/sys/fs/cgroup') / relative.lstrip('/')
        current = int((group / 'memory.current').read_text())
        high_text = (group / 'memory.high').read_text().strip()
        high = int(high_text) if high_text != 'max' else 0
        def pressure(name):
            line = next(line for line in (group / name).read_text().splitlines() if line.startswith('full '))
            return float(dict(part.split('=') for part in line.split()[1:])['avg10'])
        return current, bool(high and current >= high * 0.95 and
                             pressure('memory.pressure') >= 5 and pressure('io.pressure') >= 50)
    except (OSError, ValueError, IndexError, StopIteration):
        return 0, False


def validate_environment():
    identity = {key: os.environ.get(key, '') for key in IDENTITY_KEYS}
    if (identity['DEPLOY_ENV'] != 'dev' or identity['GITHUB_REF'] != 'refs/heads/dev' or
            identity['GITHUB_REPOSITORY'] != 'Prainn/sunrise-travelops-web'):
        raise ValueError('This controller only accepts the frontend dev workflow')
    release = '-'.join(identity[key] for key in IDENTITY_KEYS[:3])
    if not RELEASE.fullmatch(release):
        raise ValueError('Invalid SHA/run/attempt identity')
    if os.environ.get('EXPECTED_SHA') not in (None, '', identity['GITHUB_SHA']):
        raise ValueError('Expected SHA does not match workflow SHA')
    return identity, release


class Job:
    def __init__(self, identity, name, grace=GRACE):
        JOBS.mkdir(parents=True, exist_ok=True)
        self.path = JOBS / (name + '.json')
        if self.path.exists():
            raise ValueError('Run attempt already recorded; use a new attempt')
        me = process(os.getpid())
        self.state = {'pid': os.getpid(), 'start': me['start'], 'uid': os.getuid(),
                      'boot': boot_id(), 'identity': identity, 'phase': 'starting',
                      'deadline': time.monotonic() + 600, 'pgid': None, 'status': 'running',
                      'peak_bytes': 0, 'stages': [], 'activation_uncertain': False}
        self.cancelled = False
        self.fd = None
        self.child = None
        self.total_deadline = None
        self.grace = grace
        self.flush()

    def flush(self):
        save(self.path, self.state)

    def cancel(self, *_):
        self.cancelled = True

    def lock(self, seconds=600):
        self.fd = os.open(LOCK, os.O_RDWR | os.O_CREAT, 0o660)
        self.state.update(phase='wait-lock', deadline=time.monotonic() + seconds)
        self.flush()
        while True:
            if self.cancelled or time.monotonic() >= self.state['deadline']:
                raise TimeoutError('Cancelled or timed out waiting for the build lock; owner untouched')
            try:
                fcntl.flock(self.fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                time.sleep(0.2)
        self.total_deadline = time.monotonic() + 900
        # An interrupted activation requires explicit inspection, never an automatic retry.
        for path in JOBS.glob('*.json'):
            value = json.loads(path.read_text())
            if path != self.path and value.get('status') == 'cleanup-blocked':
                raise RuntimeError('Previous dev processes have not exited; refusing another release: ' + path.name)
            if path != self.path and value.get('activation_uncertain'):
                raise RuntimeError('A previous dev activation needs operator review: ' + path.name)

    def stop_children(self):
        signal_children(self.state, signal.SIGTERM)
        until = time.monotonic() + self.grace
        while members(self.state.get('pgid')) and time.monotonic() < until:
            if self.child:
                self.child.poll()
            time.sleep(0.1)
        signal_children(self.state, signal.SIGKILL)
        if self.child:
            try:
                self.child.wait(timeout=2)
            except subprocess.TimeoutExpired:
                pass
        if members(self.state.get('pgid')):
            raise RuntimeError('Processes remain in kernel wait; lock is retained by inherited FDs')

    def stage(self, name, command, seconds, cwd=None, env=None, critical=False, cleanup=False):
        started = time.monotonic()
        # Activation gets its own bounded window; never start a switch with only
        # a few seconds left in the build budget.
        deadline = started + seconds if (cleanup or critical) else min(started + seconds, self.total_deadline or started + seconds)
        self.state.update(phase=name, deadline=deadline, critical=critical, pgid=None)
        self.flush()
        print('Stage: ' + name, flush=True)
        if self.cancelled and not cleanup:
            raise RuntimeError('Release cancelled before ' + name)
        self.child = subprocess.Popen(command, cwd=cwd, env=env, start_new_session=True,
                                      pass_fds=(self.fd,) if self.fd is not None else ())
        self.state['pgid'] = self.child.pid
        self.flush()
        stage_peak = 0
        timed_out = False
        while self.child.poll() is None:
            current, _ = memory_sample(os.getpid())
            stage_peak = max(stage_peak, current)
            self.state['peak_bytes'] = max(self.state['peak_bytes'], current)
            self.flush()
            if time.monotonic() >= deadline or (self.cancelled and not critical and not cleanup):
                timed_out = True
                if critical and name == 'activate-and-verify':
                    self.state['activation_uncertain'] = True
                self.state['reason'] = 'Local deadline/cancellation: ' + name
                self.flush()
                self.stop_children()
                break
            time.sleep(0.5)
        # A successful shell is not enough: background descendants must also exit.
        if members(self.state.get('pgid')):
            self.stop_children()
            timed_out = True
        if critical and name == 'activate-and-verify' and self.child.returncode < 0:
            self.state['activation_uncertain'] = True
        self.state['pgid'] = None
        self.state['stages'].append({'phase': name, 'seconds': round(time.monotonic() - started, 2),
                                     'peak_bytes': stage_peak, 'exit': self.child.returncode})
        self.flush()
        print(f'Stage finished: {name}; elapsed={self.state["stages"][-1]["seconds"]}s; '
              f'runner memory sample peak={stage_peak // 1048576}MiB', flush=True)
        if timed_out or self.child.returncode:
            raise RuntimeError(self.state.get('reason', name + ' exited ' + str(self.child.returncode)))

    def finish(self, error=None):
        remaining = members(self.state.get('pgid'))
        self.state.update(status='cleanup-blocked' if remaining else ('failed' if error else 'success'),
                          reason=str(error) if error else '', finished_at=time.time())
        self.flush()
        if self.fd is not None:
            # Never unlink the shared lock. Descendants retain it if they cannot exit.
            os.close(self.fd)
            self.fd = None
            self.state['own_lock_fd_closed'] = True
            self.flush()
        if remaining:
            raise RuntimeError('Cleanup incomplete; no further dev release is permitted')


def curl(url, destination):
    return ['curl', '--fail', '--silent', '--show-error', '--location', '--retry', '2',
            '--connect-timeout', '10', '--max-time', '120',
            '-H', 'Authorization: Bearer ' + os.environ['GH_TOKEN'], url, '-o', str(destination)]


def pipeline(job, identity, release):
    job.lock()
    operation = os.environ.get('OPERATION', 'deploy')
    if operation not in ('deploy', 'rollback'):
        raise ValueError('Unsupported operation')
    work = Path(tempfile.mkdtemp(prefix='source-', dir=JOBS))
    try:
        api = 'https://api.github.com/repos/Prainn/sunrise-travelops-web/'
        remote_file = work / 'branch.json'
        job.stage('check-dev-head', curl(api + 'commits/dev', remote_file), 180)
        if json.loads(remote_file.read_text())['sha'] != identity['GITHUB_SHA']:
            raise ValueError('Branch advanced while queued; deploy the current commit')
        archive = work / 'source.tgz'
        job.stage('download-source', curl(api + 'tarball/' + identity['GITHUB_SHA'], archive), 180)
        job.stage('extract-source', ['tar', '-xzf', str(archive), '--strip-components=1', '-C', str(work)], 60)
        archive.unlink()
        env = dict(os.environ, SUNRISE_LOCK_HELD='1', DEPLOY_ENV='dev',
                   PATH='/opt/sunrise-ci/node/bin:' + os.environ.get('PATH', ''),
                   NODE_OPTIONS='--max-old-space-size=1400', PYTHONDONTWRITEBYTECODE='1')
        if operation == 'deploy':
            state_file = BASE / 'last-deployment.json'
            record = json.loads(state_file.read_text()) if state_file.exists() else {}
            if record.get('release', '').startswith(identity['GITHUB_SHA'] + '-'):
                print('This commit is already deployed', flush=True)
                return
            job.stage('release-safety-tests (fixture version IDs)', ['python3', 'scripts/test_deploy.py'], 60, work, env)
            job.stage('install', ['pnpm', 'install', '--frozen-lockfile', '--store-dir', '/opt/sunrise-ci/pnpm-store'], 300, work, env)
            job.stage('type-check', ['pnpm', 'exec', 'vue-tsc', '--noEmit'], 300, work, env)
            job.stage('vite-build', ['pnpm', 'exec', 'vite', 'build', '--mode', 'server-dev'], 300, work, env)
            args = ['deploy', release, 'dist']
        else:
            args = ['rollback', os.environ.get('ROLLBACK_RELEASE', 'previous')]
        job.stage('activate-and-verify', ['python3', 'scripts/deploy.py', *args], 180, work, env, critical=True)
    finally:
        # The watchdog also owns the deadline during filesystem cleanup.
        try:
            job.stage('remove-source', ['rm', '-rf', '--', str(work)], 30,
                      env=dict(os.environ), critical=True, cleanup=True)
        except Exception as error:
            print('Source cleanup failed: ' + str(error), file=sys.stderr)


def watchdog(uid):
    for path in JOBS.glob('*.json'):
        try:
            if path.is_symlink() or path.stat().st_uid != uid:
                raise ValueError('Job state owner is not the frontend runner')
            state = json.loads(path.read_text())
            if state.get('status') not in ('running', 'terminating', 'cleanup-blocked'):
                continue
            if state['boot'] != boot_id():
                state.update(status='failed', reason='Previous boot ended the job')
                save(path, state)
                continue
            identity = state['identity']
            if (state['uid'] != uid or identity.get('DEPLOY_ENV') != 'dev' or
                    identity.get('GITHUB_REF') != 'refs/heads/dev' or
                    identity.get('GITHUB_REPOSITORY') != 'Prainn/sunrise-travelops-web'):
                raise ValueError('Invalid dev job identity')
            parent = controller(state)
            children = members(state.get('pgid'))
            if not parent and not children:
                if state.get('phase') == 'activate-and-verify':
                    state['activation_uncertain'] = True
                state.update(status='failed', reason='Controller exited; process group empty')
                save(path, state)
                continue
            watch_path = path.with_suffix('.watch')
            watch = json.loads(watch_path.read_text()) if watch_path.exists() else {}
            _, pressured = memory_sample(state['pid']) if parent else (0, False)
            pressure_since = watch.get('pressure_since') if pressured else None
            if pressured and not pressure_since:
                watch['pressure_since'] = time.monotonic()
                save(watch_path, watch)
                pressure_since = watch['pressure_since']
            if not pressured and watch.pop('pressure_since', None):
                save(watch_path, watch)
            pressure_timeout = bool(pressure_since and time.monotonic() - pressure_since >= 120)
            if (parent and time.monotonic() < state['deadline'] and not pressure_timeout
                    and state['status'] == 'running' and not watch.get('term_at')):
                continue
            latest = json.loads(path.read_text())
            if any(latest.get(key) != state.get(key) for key in ('phase', 'deadline', 'pgid', 'status')):
                continue
            if state.get('phase') == 'activate-and-verify':
                state['activation_uncertain'] = True
            if not watch.get('term_at'):
                watch['term_at'] = time.monotonic()
                save(watch_path, watch)
                state.update(status='terminating',
                             reason='Watchdog: expired deadline, orphan controller, or sustained resource pressure')
                save(path, state)
                signal_children(state, signal.SIGTERM)
                if parent:
                    os.kill(parent['pid'], signal.SIGTERM)
                print('Stopping dev job: ' + path.stem, flush=True)
            elif time.monotonic() - watch['term_at'] >= GRACE and not watch.get('kill_at'):
                watch['kill_at'] = time.monotonic()
                save(watch_path, watch)
                signal_children(state, signal.SIGKILL)
                parent = controller(state)
                if parent:
                    os.kill(parent['pid'], signal.SIGKILL)
                state.update(status='cleanup-blocked' if members(state.get('pgid')) else 'failed')
                save(path, state)
                print('Dev job cleanup: ' + path.stem + ' ' + state['status'], flush=True)
            elif watch.get('kill_at') and not children and not parent:
                state.update(status='failed')
                save(path, state)
        except (OSError, ValueError, KeyError, RuntimeError) as error:
            print('Dev guard needs operator attention: ' + path.name + ': ' + str(error), file=sys.stderr)


def main():
    os.umask(0o077)
    if sys.argv[1:] == ['watchdog']:
        watchdog(pwd.getpwnam('sunrise-runner').pw_uid)
        return
    if sys.argv[1:] != ['run']:
        raise ValueError('Expected run or watchdog')
    identity, release = validate_environment()
    if os.getuid() != pwd.getpwnam('sunrise-runner').pw_uid:
        raise ValueError('Run as sunrise-runner')
    job = Job(identity, release)
    for sig in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
        signal.signal(sig, job.cancel)
    error = None
    try:
        pipeline(job, identity, release)
    except Exception as failure:
        error = failure
    finally:
        job.finish(error)
    if error:
        raise error


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Frontend dev release failed: ' + str(error), file=sys.stderr)
        sys.exit(1)
