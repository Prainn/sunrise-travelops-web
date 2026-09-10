import importlib.util
import io
import json
from datetime import datetime
import os
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('deploy', Path(__file__).with_name('deploy-dev.py'))
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


def archive(files):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode='w:gz') as output:
        for name, content in files.items():
            item = tarfile.TarInfo(name)
            item.size = len(content)
            output.addfile(item, io.BytesIO(content))
    buffer.seek(0)
    return buffer


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        (self.base / 'releases' / 'old').mkdir(parents=True)
        (self.base / 'shared' / 'js').mkdir(parents=True)
        (self.base / 'shared' / 'js' / 'old.js').write_bytes(b'old chunk')
        (self.base / 'current').symlink_to('releases/old')
        self.patch = patch.object(deploy, 'BASE', self.base)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.files = {'index.html': b'<script src="/js/new.js"></script>',
                      'js/new.js': b'new chunk'}

    def fetch(self, path):
        if path.startswith('/js/'):
            return (self.base / 'shared' / path.lstrip('/')).read_bytes()
        path = 'index.html' if path in ['/', '/inquiries'] else path.lstrip('/')
        return (self.base / 'current' / path).read_bytes()

    def test_publish_verifies_site_and_keeps_old_assets(self):
        with patch.object(deploy, 'fetch', self.fetch):
            result = deploy.publish('bootstrap-20260909120000', archive(self.files))
        self.assertTrue(result['verified'])
        self.assertIsNotNone(datetime.fromisoformat(result['deployedAt']).tzinfo)
        self.assertEqual(json.loads((self.base / 'last-deployment.json').read_text()), result)
        self.assertEqual((self.base / 'shared' / 'js' / 'old.js').read_bytes(), b'old chunk')
        self.assertEqual(os.readlink(self.base / 'current'), 'releases/bootstrap-20260909120000')

    def test_failed_http_check_rolls_back(self):
        with patch.object(deploy, 'fetch', return_value=b'wrong website'):
            with self.assertRaisesRegex(ValueError, 'HTML does not match'):
                deploy.publish('bootstrap-20260909120001', archive(self.files))
        self.assertEqual(os.readlink(self.base / 'current'), 'releases/old')
        self.assertFalse((self.base / 'last-deployment.json').exists())

    def test_rejects_archive_path_traversal(self):
        with self.assertRaisesRegex(ValueError, 'unsafe path'):
            deploy.publish('bootstrap-20260909120002', archive({'../escape': b'bad'}))
        self.assertEqual(os.readlink(self.base / 'current'), 'releases/old')

    def test_rejects_shell_commands(self):
        with patch.dict(os.environ, {'SSH_ORIGINAL_COMMAND': 'id; cat /etc/shadow'}):
            with self.assertRaisesRegex(ValueError, 'Only deploy'):
                deploy.main()

    def test_asset_collision_keeps_current_version(self):
        (self.base / 'shared' / 'js' / 'new.js').write_bytes(b'different bytes')
        with self.assertRaisesRegex(ValueError, 'Asset filename collision'):
            deploy.publish('bootstrap-20260909120003', archive(self.files))
        self.assertEqual(os.readlink(self.base / 'current'), 'releases/old')

    def test_cleanup_protects_current_previous_recent_and_shared_assets(self):
        names = [f'bootstrap-2026090900000{i}' for i in range(6)]
        for i, name in enumerate(names):
            path = self.base / 'releases' / name
            path.mkdir()
            (path / '.verified.json').write_text(json.dumps({'release': name, 'verified': True, 'verifiedAt': str(i)}))
        deploy.switch('releases/' + names[0])  # Rollback target is not among newest three.
        (self.base / 'last-deployment.json').write_text(json.dumps({'previous': 'releases/' + names[1], 'verified': True}))
        (self.base / 'releases' / 'bootstrap-20260908000000').symlink_to(self.base / 'shared', target_is_directory=True)
        result = deploy.cleanup()
        self.assertEqual(result['remove'], [names[2]])
        self.assertEqual(len(result['keep']), 5)
        self.assertTrue((self.base / 'shared/js/old.js').exists())
        self.assertTrue((self.base / 'releases/old').exists())

    def test_cleanup_failure_does_not_turn_verified_deploy_into_failure(self):
        with patch.object(deploy, 'fetch', self.fetch), patch.object(deploy, 'cleanup', side_effect=OSError('denied')), patch('sys.stderr', new_callable=io.StringIO) as stderr:
            result = deploy.publish('bootstrap-20260909120004', archive(self.files))
        self.assertTrue(result['verified'])
        self.assertIn('::warning::', stderr.getvalue())

    def test_failed_publish_never_runs_cleanup(self):
        with patch.object(deploy, 'fetch', return_value=b'wrong'), patch.object(deploy, 'cleanup') as cleanup:
            with self.assertRaises(ValueError):
                deploy.publish('bootstrap-20260909120005', archive(self.files))
        cleanup.assert_not_called()


if __name__ == '__main__':
    unittest.main()
