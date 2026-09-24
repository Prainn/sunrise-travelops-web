"""Exercise local atomic publication failure without contacting a server."""
import importlib.util
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('release', Path(__file__).with_name('deploy.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class FrontendReleaseSafety(unittest.TestCase):
    def test_private_build_output_is_readable_by_nginx_after_publication(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            (base / 'releases').mkdir()
            source = base / 'dist'
            (source / 'js').mkdir(parents=True, mode=0o700)
            (source / 'index.html').write_text('<html>new</html>')
            (source / 'index.html').chmod(0o600)
            (source / 'js/app.js').write_text('app')
            (source / 'js/app.js').chmod(0o600)
            def verify(directory):
                for path in directory.rglob('*'):
                    self.assertTrue(path.stat().st_mode & 0o004, str(path))
                    if path.is_dir():
                        self.assertTrue(path.stat().st_mode & 0o001, str(path))
            with patch.object(release, 'BASE', base), patch.object(release, 'verify', side_effect=verify), \
                 patch.object(release, 'cleanup_after_success'):
                self.assertTrue(release.publish('a' * 40 + '-1-1', source)['verified'])

    def test_failed_verification_restores_current_and_keeps_old_assets(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            old = base / 'releases' / ('a' * 40 + '-1-1')
            old.mkdir(parents=True)
            (base / 'current').symlink_to(old.relative_to(base))
            source = base / 'dist'
            (source / 'js').mkdir(parents=True)
            (source / 'index.html').write_text('<html>new</html>')
            (source / 'js' / 'new.js').write_text('new')
            (base / 'shared/js').mkdir(parents=True)
            (base / 'shared/js/old.js').write_text('old')
            with patch.object(release, 'BASE', base), patch.object(release, 'verify', side_effect=[ValueError('bad asset'), None]):
                with self.assertRaisesRegex(ValueError, 'bad asset'):
                    release.publish('b' * 40 + '-2-1', source)
            self.assertEqual((base / 'current').resolve(), old.resolve())
            self.assertEqual((base / 'shared/js/old.js').read_text(), 'old')
            self.assertFalse((base / 'last-deployment.json').exists())

    def test_manual_rollback_updates_current_and_preserves_return_target(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            old_id, current_id = 'a' * 40 + '-1-1', 'b' * 40 + '-2-1'
            for release_id in (old_id, current_id):
                directory = base / 'releases' / release_id
                directory.mkdir(parents=True)
                (directory / '.verified.json').write_text(json.dumps({'release': release_id, 'verified': True}))
            (base / 'current').symlink_to('releases/' + current_id)
            (base / 'last-deployment.json').write_text(json.dumps({'release': current_id, 'previous': 'releases/' + old_id}))
            with patch.object(release, 'BASE', base), patch.object(release, 'verify'), \
                 patch.object(sys, 'argv', ['deploy.py', 'rollback', 'previous']), \
                 patch.dict(os.environ, {'SUNRISE_LOCK_HELD': '1'}), patch.object(release.signal, 'signal'):
                release.main()
            self.assertEqual((base / 'current').resolve().name, old_id)
            record = json.loads((base / 'last-deployment.json').read_text())
            self.assertEqual(record['release'], old_id)
            self.assertEqual(record['previous'], 'releases/' + current_id)


if __name__ == '__main__':
    unittest.main()
