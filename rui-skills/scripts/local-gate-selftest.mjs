import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { authorize, fingerprint, skillRoot, setup } from './local-gate.mjs';
import { startFixture } from './gate-test-fixture.mjs';

const fixture = await startFixture();
const originalPolicy = JSON.parse(fs.readFileSync(fixture.policyPath, 'utf8'));
const originalClient = JSON.parse(fs.readFileSync(fixture.configPath, 'utf8'));
const writePolicy = policy => fs.writeFileSync(fixture.policyPath, JSON.stringify(policy));
const writeClient = config => fs.writeFileSync(fixture.configPath, JSON.stringify(config));
const verify = options => authorize({configPath: fixture.configPath, ...options});
let checks = 0;
async function rejects(fn) { await assert.rejects(fn); checks++; }
const cli = (...args) => spawnSync(process.execPath, [path.join(skillRoot, 'scripts/production.mjs'), ...args], {
  encoding: 'utf8', windowsHide: true, env: {...process.env, RUI_SKILL_GATE_CONFIG: fixture.configPath},
});
try {
  const receipt = await verify(); assert.equal(receipt.allowed, true); checks++;
  assert.equal(receipt.fingerprint, fingerprint()); checks++;
  assert.notEqual((await verify()).request_id, receipt.request_id); checks++;
  assert.throws(() => setup({directory: fixture.directory})); checks++;
  await rejects(() => authorize({configPath: path.join(fixture.directory, 'missing.json')}));
  writeClient({...originalClient, token: '0'.repeat(64)});
  await rejects(() => verify()); writeClient(originalClient);
  await rejects(() => verify({digest: '0'.repeat(64)}));
  writePolicy({...originalPolicy, enabled: false});
  await rejects(() => verify());
  const output = path.join(fixture.directory, 'must-not-exist.md');
  const denied = cli('export-text', fixture.directory, '--out', output);
  assert.notEqual(denied.status, 0); assert.match(denied.stderr, /授权未通过/);
  assert.equal(fs.existsSync(output), false); checks++;
  for (const args of [['check', fixture.directory], ['report', fixture.directory], ['run', 'novel-storyboard', '--help']]) {
    assert.match(cli(...args).stderr, /授权未通过/); checks++;
  }
  writePolicy(originalPolicy);
  assert.equal((await verify()).allowed, true); checks++;
  fs.writeFileSync(fixture.policyPath, '{'); await rejects(() => verify()); writePolicy(originalPolicy);
  writeClient({...originalClient, url: 'http://example.com/v1/skills/authorize'});
  await rejects(() => verify()); writeClient(originalClient);

  // Bad responses are rejected even when HTTP succeeds; no redirects or stale receipts.
  let mode = 'malformed';
  const fake = http.createServer((req, res) => {
    let body = ''; req.on('data', b => body += b);
    req.on('end', () => {
      if (mode === 'timeout') return;
      if (mode === 'redirect') { res.writeHead(302, {Location: originalClient.url}); res.end(); return; }
      if (mode === 'malformed') { res.end('{'); return; }
      const data = JSON.parse(body);
      const reply = {allowed: true, skill: data.skill, fingerprint: data.fingerprint,
        request_id: data.request_id, expires_at: Math.floor(Date.now() / 1000) + 30};
      if (mode === 'nonce') reply.request_id = '0'.repeat(32);
      if (mode === 'expired') reply.expires_at = 1;
      if (mode === 'string') reply.allowed = 'true';
      if (mode === 'digest') reply.fingerprint = '0'.repeat(64);
      if (mode === 'oversized') reply.extra = 'x'.repeat(5000);
      res.end(JSON.stringify(reply));
    });
  });
  await new Promise(resolve => fake.listen(0, '127.0.0.1', resolve));
  try {
    writeClient({...originalClient, url: `http://127.0.0.1:${fake.address().port}/v1/skills/authorize`});
    for (mode of ['malformed', 'redirect', 'nonce', 'expired', 'string', 'digest', 'oversized', 'timeout'])
      await rejects(() => verify({timeoutMs: 100}));
  } finally { fake.closeAllConnections(); await new Promise(resolve => fake.close(resolve)); }
  await rejects(() => verify()); // Closed port, following an earlier successful grant.
  assert.ok(!JSON.stringify(receipt).includes(originalPolicy.token)); checks++;
  console.log(`PASS ${checks} local authorization checks; denial never generates output`);
} finally { await fixture.stop(); }
