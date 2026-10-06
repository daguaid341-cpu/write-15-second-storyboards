"""Exercise persisted invocation lifecycle with the renamed skill, without live services."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[1]


class RuntimeTests(unittest.TestCase):
    def test_invocation_lifecycle(self):
        temp_root = REPO / 'output' / 'runtime-tests'
        temp_root.mkdir(parents=True, exist_ok=True)
        for skill in ('rui-skills', 'character-turnaround-from-image'):
            with self.subTest(skill=skill), tempfile.TemporaryDirectory(prefix='rui runtime ', dir=temp_root) as temp:
                script = REPO / skill / 'scripts/record_invocation.py'

                def call(*args):
                    return subprocess.run([sys.executable, '-X', 'utf8', str(script), *args], capture_output=True, text=True, encoding='utf-8')

                result = call('start', '--skill', skill, '--task', 'fixture', '--rules-version', 'test', '--output-dir', temp)
                self.assertEqual(result.returncode, 0, result.stderr)
                record = Path(json.loads(result.stdout)['path'])
                initial = json.loads(record.read_text(encoding='utf-8'))
                self.assertEqual(initial['skill'], skill)
                self.assertTrue(initial['recorded_at'].endswith('+08:00'))
                self.assertEqual(initial['validation']['visual'], 'not_run')
                result = call('event', '--record', str(record), '--stage', 'text_check', '--summary', 'fixture checked')
                self.assertEqual(result.returncode, 0, result.stderr)
                result = call('finish', '--record', str(record), '--status', 'completed', '--summary', 'fixture finished')
                self.assertEqual(result.returncode, 0, result.stderr)
                final = record.read_bytes()
                data = json.loads(final)
                self.assertEqual(data['status'], 'completed')
                self.assertEqual([event['stage'] for event in data['events']], ['start', 'text_check', 'finish'])
                result = call('event', '--record', str(record), '--stage', 'late', '--summary', 'cannot reopen')
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(record.read_bytes(), final)


if __name__ == '__main__':
    unittest.main()
