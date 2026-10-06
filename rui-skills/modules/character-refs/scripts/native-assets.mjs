#!/usr/bin/env node
// Rui-Skills addition: register real files from the host's image tool, never call a model here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { ANCHOR, allViews, anchorUsable, buildPrompt, current, recordVersion, resolveRefs, sha256, staleReasons } from './core.mjs';
import { isPng, decode } from './png.mjs';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
function atomic(file, data) {
  const temp = `${file}.${randomUUID()}.tmp`;
  try { fs.writeFileSync(temp, JSON.stringify(data, null, 2) + '\n', {encoding: 'utf8', flag: 'wx'}); fs.renameSync(temp, file); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
function inAsset(assetPath, rel) {
  const root = path.dirname(path.resolve(assetPath));
  const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep)) throw new Error('资产文件路径超出角色目录');
  return file;
}
function reference(file) {
  const absolute = path.resolve(file);
  return {file: absolute, sha256: sha256(fs.readFileSync(absolute))};
}
export function prepare(assetPath, view, {outfit = 'default', referenceFiles = []} = {}) {
  if (!/^[a-z0-9-]+$/.test(outfit)) throw new Error('造型 ID 仅允许小写字母、数字与连字符');
  const asset = read(assetPath), spec = asset.outfits?.[outfit];
  if (!spec || !allViews(spec)[view]) throw new Error('不存在该造型或视图');
  if (view !== ANCHOR) {
    const usable = anchorUsable(asset, outfit);
    if (!usable.ok) throw new Error(usable.why);
  }
  const prompt = buildPrompt(asset, outfit, view, spec.look);
  const {refs, notes} = view === ANCHOR ? {refs: [], notes: []} : resolveRefs(asset, outfit, prompt);
  const inputs = refs.map(ref => {
    const file = inAsset(assetPath, ref.file);
    const actual = reference(file);
    if (actual.sha256 !== ref.sha256) throw new Error(`参考图文件与记录不一致：${ref.view}，请登记新版本`);
    return actual;
  });
  const sources = referenceFiles.map(reference);
  if (sources.length) prompt.text = 'Preserve the identity and visible clothing in the supplied original reference. Do not invent invisible details as observed facts. ' + prompt.text;
  return {schema: 1, asset: path.resolve(assetPath), character: asset.name, outfit, view, prompt, refs, notes, inputs: [...inputs, ...sources], sources};
}
export function importImage(assetPath, view, imagePath, ticketPath, {model = 'native-tool'} = {}) {
  if (!ticketPath) throw new Error('必须使用生成前 prepare 保存的 --ticket，确保引用版本没有变化');
  const ticket = read(ticketPath);
  if (ticket.schema !== 1 || ticket.asset !== path.resolve(assetPath) || ticket.view !== view) throw new Error('准备记录与本次资产/视图不匹配');
  const latest = prepare(assetPath, view, {outfit: ticket.outfit, referenceFiles: ticket.sources.map(r => r.file)});
  if (JSON.stringify(latest) !== JSON.stringify(ticket)) throw new Error('生成后描述、画风或参考图已变化；重新 prepare 并生成，不将旧图登记为当前结果');
  const image = fs.readFileSync(imagePath);
  if (!isPng(image) || !decode(image)) throw new Error('需要可解码的8位PNG文件，不接受伪文件或不支持的编码');
  const asset = read(assetPath);
  const result = recordVersion(asset, ticket.outfit, view, {buf: image, model, prompt: ticket.prompt, refs: ticket.refs, notes: ticket.notes, confirmMode: 'wait',
    provenance: {method: 'native-import', sourceSha256: sha256(image), originalReferences: ticket.sources.map(r => ({name: path.basename(r.file), sha256: r.sha256}))},
    visualReview: {status: 'not_run'}});
  const file = inAsset(assetPath, result.version.file);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, result.buf, {flag: 'wx'});
  atomic(assetPath, asset);
  return result.version;
}
export function review(assetPath, view, {outfit = 'default', status, note} = {}) {
  if (!['passed', 'failed'].includes(status) || !note?.trim()) throw new Error('review 要求 --status passed|failed 与具体 --note；只在实际看图后使用');
  const asset = read(assetPath), record = current(asset.outfits?.[outfit] ?? {}, view);
  if (!record) throw new Error('没有当前图片');
  if (sha256(fs.readFileSync(inAsset(assetPath, record.file))) !== record.sha256) throw new Error('图片文件已被修改，请重新登记');
  if (status === 'passed' && (staleReasons(asset, outfit, view).length || record.gates.some(g => !g.ok))) throw new Error('过期或代码检查失败的图片不能标为通过');
  record.visualReview = {status, note, at: new Date().toISOString()};
  if (view === ANCHOR) { record.confirmed = status === 'passed'; if (record.confirmed) record.confirmedAt = record.visualReview.at; }
  atomic(assetPath, asset);
  return record.visualReview;
}
export function main(argv) {
  const [cmd, asset, view, ...rest] = argv;
  if (!cmd || ['-h', '--help'].includes(cmd)) { console.log('prepare <asset.json> <view> --out <ticket.json> [--reference <original.png>] [--outfit id]\nimport-image <asset.json> <view> <image.png> --ticket <ticket.json> [--model native-tool]\nreview <asset.json> <view> --status passed|failed --note <observed result> [--outfit id]'); return; }
  const opts = {referenceFiles: []}; let image;
  for (let i = 0; i < rest.length; i++) {
    if (cmd === 'import-image' && i === 0 && !rest[i].startsWith('--')) { image = rest[i]; continue; }
    const flag = rest[i], value = rest[++i];
    if (!value || value.startsWith('--')) throw new Error(`缺少参数值：${flag}`);
    if (flag === '--reference') opts.referenceFiles.push(value);
    else if (['--out', '--ticket', '--model', '--outfit', '--status', '--note'].includes(flag)) opts[flag.slice(2)] = value;
    else throw new Error(`未知参数：${flag}`);
  }
  if (!asset || !view) throw new Error('缺少 asset.json 或视图');
  if (cmd === 'prepare') {
    const ticket = prepare(asset, view, opts);
    if (!opts.out) throw new Error('prepare 必须指定 --out 保存生成前的引用快照');
    if (path.resolve(opts.out) === path.resolve(asset)) throw new Error('准备记录不能覆盖 asset.json');
    fs.writeFileSync(opts.out, JSON.stringify(ticket, null, 2) + '\n', {encoding: 'utf8', flag: 'wx'});
    console.log(JSON.stringify(ticket, null, 2));
  } else if (cmd === 'import-image') {
    if (!image) throw new Error('缺少已生成的PNG文件');
    console.log(JSON.stringify(importImage(asset, view, image, opts.ticket, opts), null, 2));
  } else if (cmd === 'review') console.log(JSON.stringify(review(asset, view, opts)));
  else throw new Error(`未知命令：${cmd}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
