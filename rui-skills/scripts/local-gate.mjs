#!/usr/bin/env node
// Owner-controlled loopback authorization. No model calls or external dependencies.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const script = fileURLToPath(import.meta.url);
export const skillRoot = path.resolve(path.dirname(script), '..');
export const stateRoot = path.join(skillRoot, '.local-verifier');
export const clientFile = path.join(stateRoot, 'client.json');
const endpoint = '/v1/skills/authorize';
const maxBytes = 4096;
const extensions = new Set(['.md', '.mjs', '.js', '.py', '.yaml', '.yml', '.json', '.svg']);

export function fingerprint(root = skillRoot) {
  const hash = createHash('sha256');
  const walk = dir => fs.readdirSync(dir, {withFileTypes: true})
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
    .forEach(entry => {
      if (entry.name.startsWith('.') || ['node_modules', '__pycache__', 'output'].includes(entry.name)) return;
      const file = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error('技能目录不支持符号链接');
      if (entry.isDirectory()) walk(file);
      else if (extensions.has(path.extname(file))) {
        hash.update(path.relative(root, file).split(path.sep).join('/') + '\0');
        hash.update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
        hash.update('\0');
      }
    });
  walk(root);
  return hash.digest('hex');
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
function saveJson(file, value) {
  const temporary = file + '.' + randomBytes(8).toString('hex') + '.tmp';
  try {
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', {mode: 0o600, flag: 'wx'});
    fs.renameSync(temporary, file);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function validToken(token) { return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token); }
function validDigest(value) { return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value); }
function validPort(port) { return Number.isInteger(port) && port >= 1 && port <= 65535; }

export function setup({directory = stateRoot, port = 8765} = {}) {
  if (!validPort(port)) throw new Error('端口必须为1–65535');
  fs.mkdirSync(directory, {recursive: true, mode: 0o700});
  const server = path.join(directory, 'server.json'), client = path.join(directory, 'client.json');
  if (fs.existsSync(server) || fs.existsSync(client)) throw new Error('配置已存在；不会重置密钥或自动批准版本');
  const token = randomBytes(32).toString('hex');
  saveJson(server, {enabled: true, token, port, allowed_fingerprint: fingerprint()});
  saveJson(client, {url: `http://127.0.0.1:${port}${endpoint}`, token});
  return {server, client};
}

export function makeServer(policyPath) {
  const server = http.createServer((req, res) => {
    const reply = (code, body) => {
      res.writeHead(code, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'POST' || req.url !== endpoint) return reply(404, {allowed: false});
    let policy;
    try {
      policy = readJson(policyPath);
      if (!validToken(policy.token) || !validDigest(policy.allowed_fingerprint)) throw new Error();
    } catch { return reply(503, {allowed: false, reason: 'policy_unavailable'}); }
    const auth = req.headers.authorization, expected = `Bearer ${policy.token}`;
    if (typeof auth !== 'string' || Buffer.byteLength(auth) !== Buffer.byteLength(expected) ||
        !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) return reply(401, {allowed: false});
    let body = '', count = 0;
    req.on('data', chunk => {
      count += chunk.length;
      if (count > maxBytes) { req.destroy(); return; }
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      let data;
      try { data = JSON.parse(body); } catch { return reply(400, {allowed: false}); }
      if (!data || data.skill !== 'rui-skills' || data.purpose !== 'storyboard' ||
          !validDigest(data.fingerprint) || typeof data.request_id !== 'string' ||
          !/^[a-f0-9]{32}$/.test(data.request_id)) return reply(400, {allowed: false});
      if (policy.enabled !== true || data.fingerprint !== policy.allowed_fingerprint)
        return reply(403, {allowed: false, reason: policy.enabled !== true ? 'disabled' : 'version_not_approved'});
      reply(200, {allowed: true, skill: data.skill, fingerprint: data.fingerprint,
        request_id: data.request_id, expires_at: Math.floor(Date.now() / 1000) + 30});
    });
    req.on('error', () => {});
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  server.maxHeadersCount = 20;
  return server;
}

export async function authorize({configPath = process.env.RUI_SKILL_GATE_CONFIG || clientFile,
  digest = fingerprint(), timeoutMs = 2000} = {}) {
  let config, url;
  try {
    config = readJson(configPath);
    url = new URL(config.url);
    if (!validToken(config.token) || url.protocol !== 'http:' || url.hostname !== '127.0.0.1' ||
        url.pathname !== endpoint || url.search || url.hash || url.username || url.password) throw new Error();
  } catch { throw new Error('本地验证未配置或配置无效，禁止使用 Rui-Skills'); }
  const requestId = randomBytes(16).toString('hex');
  const body = JSON.stringify({skill: 'rui-skills', purpose: 'storyboard', fingerprint: digest, request_id: requestId});
  const response = await new Promise((resolve, reject) => {
    const request = http.request(url, {method: 'POST', agent: false, headers: {
      Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    }}, res => {
      let text = '', size = 0;
      res.on('data', chunk => {
        size += chunk.length;
        if (size > maxBytes) request.destroy(new Error('invalid_response'));
        else text += chunk.toString('utf8');
      });
      res.on('error', reject);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error('denied'));
        try { resolve(JSON.parse(text)); } catch { reject(new Error('invalid_response')); }
      });
    });
    const timer = setTimeout(() => request.destroy(new Error('timeout')), timeoutMs);
    request.on('error', reject);
    request.on('close', () => clearTimeout(timer));
    request.end(body);
  }).catch(() => { throw new Error('本地服务器未批准本次使用（拒绝、连接失败或响应无效），禁止使用 Rui-Skills'); });
  const now = Math.floor(Date.now() / 1000);
  if (!response || response.allowed !== true || response.skill !== 'rui-skills' ||
      response.fingerprint !== digest || response.request_id !== requestId ||
      !Number.isInteger(response.expires_at) || response.expires_at <= now || response.expires_at > now + 35)
    throw new Error('本地服务器验证响应不匹配或已过期，禁止使用 Rui-Skills');
  return response;
}

export function requireAuthorization() {
  try {
    execFileSync(process.execPath, [script, 'verify'], {
      encoding: 'utf8', windowsHide: true, timeout: 5000, maxBuffer: 16384,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch { throw new Error('Rui-Skills 本次授权未通过，已停止执行。请检查本地服务、许可状态和批准版本。'); }
}

async function main(args) {
  const [command, ...rest] = args;
  const flags = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (!['--state-dir', '--port'].includes(rest[i]) || !rest[i + 1]) throw new Error('未知参数');
    flags[rest[i]] = rest[i + 1];
  }
  const directory = flags['--state-dir'] ? path.resolve(flags['--state-dir']) : stateRoot;
  const policyPath = path.join(directory, 'server.json');
  if (command === 'setup') {
    setup({directory, port: flags['--port'] ? Number(flags['--port']) : 8765});
    console.log('本机配置已创建，当前技能版本已批准。密钥仅写入私有配置，未显示。');
  } else if (command === 'serve') {
    const policy = readJson(policyPath);
    if (!validPort(policy.port) || !validToken(policy.token)) throw new Error('服务配置无效');
    const server = makeServer(policyPath);
    server.on('error', () => { console.error('本地服务启动失败，请检查端口是否占用。'); process.exitCode = 1; });
    server.listen(policy.port, '127.0.0.1', () => {
      console.log(`Rui-Skills 验证服务已启动：http://127.0.0.1:${policy.port}${endpoint}`);
      if (process.send) process.send({ready: true, port: policy.port});
    });
  } else if (command === 'verify') {
    const options = flags['--state-dir'] ? {configPath: path.join(directory, 'client.json')} : {};
    console.log(JSON.stringify(await authorize(options)));
  } else if (['allow', 'deny', 'approve-current'].includes(command)) {
    const policy = readJson(policyPath);
    if (command === 'approve-current') policy.allowed_fingerprint = fingerprint();
    else policy.enabled = command === 'allow';
    saveJson(policyPath, policy);
    console.log(command === 'approve-current' ? '当前技能版本已批准；许可开关保持原状态。' : command === 'allow' ? '已允许使用；版本仍须匹配。' : '已停用；后续验证将被拒绝。');
  } else {
    console.log('node scripts/local-gate.mjs setup|serve|verify|allow|deny|approve-current [--state-dir DIR] [--port PORT]');
    if (command && !['--help', '-h'].includes(command)) process.exitCode = 1;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === script) {
  main(process.argv.slice(2)).catch(() => {
    console.error('操作失败。检查私有配置、服务状态及批准版本；不会绕过验证或输出密钥。');
    process.exitCode = 1;
  });
}
