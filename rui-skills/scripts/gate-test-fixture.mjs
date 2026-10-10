// Isolated real loopback server for tests; never touches the owner's configuration.
import fs from 'node:fs';
import path from 'node:path';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setup, makeServer, skillRoot } from './local-gate.mjs';
const file = fileURLToPath(import.meta.url);
const testRoot = path.resolve(skillRoot, '../output/gate-tests');

export async function startFixture() {
  fs.mkdirSync(testRoot, {recursive: true});
  const directory = fs.mkdtempSync(path.join(testRoot, 'run-'));
  setup({directory});
  const child = fork(file, ['serve', directory], {stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true});
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { child.kill(); reject(new Error('Test gate startup timed out')); }, 5000);
      child.once('message', msg => { clearTimeout(timer); msg.ready ? resolve() : reject(new Error('Test gate failed')); });
      child.once('error', err => { clearTimeout(timer); reject(err); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('Test gate exited')); });
    });
  } catch (error) { child.kill(); throw error; }
  return {
    directory, configPath: path.join(directory, 'client.json'), policyPath: path.join(directory, 'server.json'),
    async stop() {
      await new Promise(resolve => { if (child.exitCode !== null) return resolve(); child.once('exit', resolve); child.kill(); });
      const target = path.resolve(directory);
      if (!target.startsWith(testRoot + path.sep)) throw new Error('Invalid test cleanup target');
      fs.rmSync(target, {recursive: true, force: true});
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === file && process.argv[2] === 'serve') {
  const directory = process.argv[3];
  const server = makeServer(path.join(directory, 'server.json'));
  server.listen(0, '127.0.0.1', () => {
    const clientPath = path.join(directory, 'client.json');
    const config = JSON.parse(fs.readFileSync(clientPath, 'utf8'));
    config.url = `http://127.0.0.1:${server.address().port}/v1/skills/authorize`;
    fs.writeFileSync(clientPath, JSON.stringify(config));
    process.send({ready: true});
  });
}
