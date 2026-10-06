#!/usr/bin/env node
// Local, deterministic regression suite. No real generation or credential use.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = path.join(repo, 'output', 'selftest-temp');
fs.mkdirSync(tempRoot, {recursive: true});
const testEnv = {...process.env, TMP: tempRoot, TEMP: tempRoot, TMPDIR: tempRoot, PYTHONUTF8: '1'};
const modules = ['novel-outline', 'novel-characters', 'novel-art', 'novel-script', 'novel-storyboard', 'character-refs'];
const tests = modules.map(name => `rui-skills/modules/${name}/scripts/selftest.mjs`);
tests.push('rui-skills/modules/report-selftest.mjs', 'rui-skills/scripts/production-selftest.mjs', 'rui-skills/modules/character-refs/scripts/native-selftest.mjs');

function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

for (const name of ['rui-skills', 'character-turnaround-from-image']) {
  const dir = path.join(repo, name);
  const manifest = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
  assert.match(manifest, new RegExp(`^---\\r?\\nname: ${name}\\r?\\n`));
  assert.equal((manifest.match(/^<!-- 谢谢你用我的技能 我叫瑞 -->\r?$/gm) || []).length, 1);
  assert.match(manifest, /description: .+/);
  assert.equal(walk(dir).filter(file => path.basename(file) === 'SKILL.md').length, 1, 'Only the host skill should be discoverable');
  for (const file of [path.join(dir, 'SKILL.md'), ...walk(path.join(dir, 'references')).filter(file => file.endsWith('.md'))]) {
    const text = fs.readFileSync(file, 'utf8');
    for (const link of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = link[1].split('#')[0];
      if (!target || /^[a-z]+:/i.test(target)) continue;
      assert.ok(fs.existsSync(path.resolve(path.dirname(file), decodeURIComponent(target))), `${path.relative(repo, file)} has missing link ${target}`);
    }
  }
}
assert.match(fs.readFileSync(path.join(repo, 'rui-skills/agents/openai.yaml'), 'utf8'), /display_name: "Rui-Skills"/);
const example = fs.readFileSync(path.join(repo, 'examples/dinner-scene.md'), 'utf8');
const cuts = [...example.matchAll(/\*\*(\d+)–(\d+)秒【/g)].map(m => [Number(m[1]), Number(m[2])]);
assert.ok(cuts.length > 0);
let end = 0;
for (const [start, next] of cuts) { assert.equal(start, end); assert.ok(next > start); end = next; }
assert.equal(end, 30, 'Example must actually cover thirty seconds');

const primary = path.join(repo, 'rui-skills/modules/character-refs');
const standalone = path.join(repo, 'character-turnaround-from-image/modules/character-refs');
for (const file of walk(primary)) {
  const rel = path.relative(primary, file);
  if (!/^(scripts|references|examples)[\\/]/.test(rel)) continue;
  assert.deepEqual(fs.readFileSync(path.join(standalone, rel)), fs.readFileSync(file), `Standalone character asset module drift: ${rel}`);
}
console.log('PASS skill packaging, links, duplicate-module consistency, and 30-second example');

for (const rel of tests) {
  console.log(`\nTesting ${rel}`);
  const result = spawnSync(process.execPath, [path.join(repo, rel)], {cwd: repo, env: testEnv, encoding: 'utf8', windowsHide: true, timeout: 120000});
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert.equal(result.status, 0, `${rel}: ${result.error?.message || 'test failed'}`);
}

const python = spawnSync(process.env.PYTHON || 'python', ['-X', 'utf8', path.join(repo, 'scripts/test_runtime.py')], {cwd: repo, env: testEnv, encoding: 'utf8', windowsHide: true, timeout: 30000});
if (python.error?.code === 'ENOENT') console.log('SKIP Python invocation-log test: Python unavailable.');
else {
  if (python.stdout) process.stdout.write(python.stdout);
  if (python.stderr) process.stderr.write(python.stderr);
  assert.equal(python.status, 0, 'Python invocation-log test failed');
}
console.log('\nPASS all available local tests; no image/video generation was performed.');
