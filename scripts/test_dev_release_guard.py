"""Linux-only fault tests. Uses temporary state/locks, never a business release."""
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).with_name('dev_release_guard.py')
spec = importlib.util.spec_from_file_location('guard', SCRIPT)
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)
IDENTITY = {'GITHUB_SHA': 'a' * 40, 'GITHUB_RUN_ID': '123', 'GITHUB_RUN_ATTEMPT': '1',
            'GITHUB_REPOSITORY': 'Prainn/sunrise-travelops-web',
            'GITHUB_REF': 'refs/heads/dev', 'DEPLOY_ENV': 'dev'}
CHILD = """
import signal,subprocess,sys,time
signal.signal(signal.SIGTERM,signal.SIG_IGN)
subprocess.Popen([sys.executable,'-c','import signal,time; signal.signal(signal.SIGTERM,signal.SIG_IGN); time.sleep(120)'])
print('child-ready',flush=True)
time.sleep(120)
"""
CONTROLLER = """
import importlib.util,json,os,signal,sys,time
from pathlib import Path
spec=importlib.util.spec_from_file_location('guard',sys.argv[1]);g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
g.JOBS=Path(sys.argv[2]);g.LOCK=Path(os.environ.get('GUARD_TEST_LOCK',str(g.JOBS/'build.lock')))
identity={k:os.environ[k] for k in g.IDENTITY_KEYS}
j=g.Job(identity,os.environ.get('GUARD_TEST_JOB','probe'),grace=0.2)
for sig in [signal.SIGTERM,signal.SIGINT,signal.SIGHUP]: signal.signal(sig,j.cancel)
error=None
try:
 j.lock(seconds=float(sys.argv[4]))
 if sys.argv[3]=='owner':
  print('owner-ready',flush=True);time.sleep(120)
 elif sys.argv[3]=='orphan':
  j.stage('type-check',[sys.executable,'-c',sys.argv[5]],120)
 elif sys.argv[3]=='background':
  j.stage('type-check',[sys.executable,'-c','import subprocess,sys;subprocess.Popen([sys.executable,"-c","import time;time.sleep(120)"])'],10)
 else:
  j.stage('activate-and-verify' if sys.argv[3]=='critical' else 'type-check',[sys.executable,'-c',sys.argv[5]],float(sys.argv[4]),critical=sys.argv[3]=='critical')
except Exception as e: error=e
finally: j.finish(error)
sys.exit(1 if error else 0)
"""


@unittest.skipUnless(Path('/proc/self/stat').exists(), 'Requires Linux /proc')
class DevReleaseGuardTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.processes = []
        self.patch = patch.object(guard, 'JOBS', self.root)
        self.patch.start()

    def launch(self, scenario, seconds=0.8):
        log = (self.root / (scenario + '.log')).open('w')
        self.addCleanup(log.close)
        child = subprocess.Popen([sys.executable, '-u', '-c', CONTROLLER, str(SCRIPT),
                                  str(self.root), scenario, str(seconds), CHILD],
                                 env=dict(os.environ, **IDENTITY), stdout=log, stderr=subprocess.STDOUT)
        self.processes.append(child)
        return child

    def state(self):
        return json.loads((self.root / 'probe.json').read_text())

    def wait_group(self):
        until = time.monotonic() + 5
        while time.monotonic() < until:
            try:
                state = self.state()
                if state.get('pgid') and len(guard.members(state['pgid'])) >= 2:
                    return state
            except (OSError, ValueError):
                pass
            time.sleep(0.05)
        self.fail('No child process group created')

    def assert_unlocked(self):
        with (self.root / 'build.lock').open('a') as file:
            fcntl.flock(file, fcntl.LOCK_EX | fcntl.LOCK_NB)

    def tearDown(self):
        try:
            state = self.state()
            state['identity'] = IDENTITY
            guard.signal_children(state, signal.SIGKILL)
        except (OSError, ValueError):
            pass
        for child in self.processes:
            if child.poll() is None:
                child.kill()
            child.wait(timeout=3)
        self.patch.stop()
        self.directory.cleanup()

    def test_deadline_kills_term_ignoring_descendants_and_releases_lock(self):
        child = self.launch('timeout')
        state = self.wait_group()
        self.assertEqual(child.wait(timeout=6), 1)
        self.assertFalse(guard.members(state['pgid']))
        self.assertTrue(self.state()['own_lock_fd_closed'])
        self.assert_unlocked()

    def test_cancel_cleans_entire_group(self):
        child = self.launch('cancel', 30)
        state = self.wait_group()
        child.send_signal(signal.SIGTERM)
        self.assertEqual(child.wait(timeout=6), 1)
        self.assertFalse(guard.members(state['pgid']))
        self.assert_unlocked()

    def test_independent_watchdog_recovers_killed_controller(self):
        child = self.launch('orphan', 30)
        state = self.wait_group()
        child.kill()
        child.wait(timeout=3)
        with (self.root / 'build.lock').open('a') as file:
            with self.assertRaises(BlockingIOError):
                fcntl.flock(file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        guard.watchdog(os.getuid())
        time.sleep(0.25)
        with patch.object(guard, 'GRACE', 0.1):
            guard.watchdog(os.getuid())
        until = time.monotonic() + 3
        while guard.members(state['pgid']) and time.monotonic() < until:
            time.sleep(0.05)
        self.assertFalse(guard.members(state['pgid']))
        self.assert_unlocked()

    def test_successful_parent_cannot_leave_background_child(self):
        child = self.launch('background')
        self.assertEqual(child.wait(timeout=6), 1)
        self.assert_unlocked()

    def test_lock_wait_timeout_leaves_existing_owner_untouched(self):
        with (self.root / 'build.lock').open('a') as owner:
            fcntl.flock(owner, fcntl.LOCK_EX)
            child = self.launch('timeout', 0.3)
            self.assertEqual(child.wait(timeout=4), 1)
            self.assertIn('waiting for the build lock', self.state()['reason'])
            with (self.root / 'build.lock').open('a') as another:
                with self.assertRaises(BlockingIOError):
                    fcntl.flock(another, fcntl.LOCK_EX | fcntl.LOCK_NB)

    def test_activation_deadline_requires_operator_review(self):
        child = self.launch('critical')
        self.wait_group()
        self.assertEqual(child.wait(timeout=6), 1)
        self.assertTrue(self.state()['activation_uncertain'])
        self.assert_unlocked()
        with patch.object(guard, 'LOCK', self.root / 'build.lock'):
            job = guard.Job(IDENTITY, 'next-attempt', grace=0.2)
            try:
                with self.assertRaisesRegex(RuntimeError, 'needs operator review'):
                    job.lock(1)
            finally:
                job.finish('probe finished')

    def test_production_and_wrong_repository_rejected_before_run(self):
        for change in [{'DEPLOY_ENV': 'prod'}, {'GITHUB_REF': 'refs/heads/main'},
                       {'GITHUB_REPOSITORY': 'Prainn/sunrise-travelops-backend'}]:
            with patch.dict(os.environ, {**IDENTITY, **change}, clear=True):
                with self.assertRaises(ValueError):
                    guard.validate_environment()

    def test_cleanup_blocked_prevents_next_release_even_if_lock_is_free(self):
        guard.save(self.root / 'previous.json', {'status': 'cleanup-blocked'})
        with patch.object(guard, 'LOCK', self.root / 'build.lock'):
            job = guard.Job(IDENTITY, 'next-attempt', grace=0.2)
            try:
                with self.assertRaisesRegex(RuntimeError, 'have not exited'):
                    job.lock(1)
            finally:
                job.finish('probe finished')
        self.assert_unlocked()

    def test_watchdog_never_signals_a_mismatched_process(self):
        child = self.launch('orphan', 30)
        state = self.wait_group()
        state['identity']['DEPLOY_ENV'] = 'prod'
        guard.save(self.root / 'probe.json', state)
        with patch.object(os, 'kill') as kill:
            guard.watchdog(os.getuid())
            kill.assert_not_called()

    def test_process_group_with_different_environment_is_not_killed(self):
        state = {'uid': os.getuid(), 'identity': IDENTITY, 'pgid': 123}
        foreign = {'uid': os.getuid(), 'env': {**IDENTITY, 'DEPLOY_ENV': 'prod'}}
        with patch.object(guard, 'members', return_value=[foreign]), patch.object(os, 'kill') as kill:
            with self.assertRaisesRegex(RuntimeError, 'identity changed'):
                guard.signal_children(state, signal.SIGKILL)
            kill.assert_not_called()

    def test_sustained_pressure_triggers_watchdog_before_deadline(self):
        self.launch('orphan', 30)
        self.wait_group()
        guard.save(self.root / 'probe.watch', {'pressure_since': time.monotonic() - 121})
        with patch.object(guard, 'memory_sample', return_value=(1700 * 1048576, True)), patch.object(os, 'kill') as kill:
            guard.watchdog(os.getuid())
            self.assertTrue(kill.called)
        self.assertEqual(self.state()['status'], 'terminating')


def installed_watchdog_probe():
    """Harmless orphan process; the real installed timer must reclaim it."""
    installed = Path('/opt/sunrise-ci/frontend-dev-guard/dev_release_guard.py')
    jobs = installed.parent / 'jobs'
    name = 'probe-' + str(os.getpid())
    state_file = jobs / (name + '.json')
    pgid = None
    with tempfile.TemporaryDirectory(prefix='dev-guard-probe-') as temporary:
        log = Path(temporary) / 'probe.log'
        with log.open('w') as output:
            child = subprocess.Popen([sys.executable, '-u', '-c', CONTROLLER, str(installed),
                                      str(jobs), 'orphan', '120', CHILD],
                                     env=dict(os.environ, **IDENTITY, GUARD_TEST_JOB=name,
                                              GUARD_TEST_LOCK=str(Path(temporary) / 'probe.lock')),
                                     stdout=output, stderr=subprocess.STDOUT)
            try:
                until = time.monotonic() + 5
                while time.monotonic() < until:
                    if state_file.exists():
                        state = json.loads(state_file.read_text())
                        if state.get('pgid') and len(guard.members(state['pgid'])) >= 2:
                            pgid = state['pgid']
                            break
                    time.sleep(0.05)
                assert pgid, log.read_text()
                child.kill()
                child.wait(timeout=3)
                print('Orphan probe created; waiting for the installed systemd watchdog', flush=True)
                until = time.monotonic() + 60
                while guard.members(pgid) and time.monotonic() < until:
                    time.sleep(1)
                assert not guard.members(pgid), 'Installed watchdog did not reap orphan group'
                with (Path(temporary) / 'probe.lock').open('a') as lock:
                    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                print('Installed watchdog reclaimed all descendants and released the probe lock', flush=True)
            finally:
                if pgid:
                    for member in guard.members(pgid):
                        os.kill(member['pid'], signal.SIGKILL)
                if child.poll() is None:
                    child.kill()
                child.wait(timeout=3)
                state_file.unlink(missing_ok=True)
                state_file.with_suffix('.watch').unlink(missing_ok=True)


if __name__ == '__main__':
    if sys.argv[1:] == ['--installed-watchdog-probe']:
        installed_watchdog_probe()
    else:
        unittest.main()
