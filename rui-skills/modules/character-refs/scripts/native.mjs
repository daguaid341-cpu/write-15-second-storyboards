// Rui-Skills native-image bridge. No generator, network, shell or credentials.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { ANCHOR, allViews, anchorUsable, buildPrompt, current, lookHash, recordVersion, resolveLayers, resolveRefs, sha256, viewLayersHash } from './core.mjs';
import { isPng, pngInfo } from './png.mjs';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
function within(dir, file) {
  const target = resolve(dir, file);
  const rel = relative(dir, target);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || resolve(target) === resolve(dir)) throw new Error('资产文件路径越界');
  // An absolute path on another Windows drive does not begin with .. .
  if (resolve(dir, rel) !== target || /^[A-Za-z]:/.test(rel)) throw new Error('资产文件路径越界');
  return target;
}
function checkOutfit(asset, oid, view) {
  if (!/^[\w-]+$/.test(oid)) throw new Error('造型 id 只能包含字母、数字、下划线和连字符');
  const outfit = asset.outfits?.[oid];
  if (!outfit || !allViews(outfit)[view]) throw new Error(`没有造型或视图 ${oid}/${view}`);
  return outfit;
}
function verifyFile(path, hash) {
  const bytes = readFileSync(path);
  if (hash && sha256(bytes) !== hash) throw new Error(`参考文件已改变：${path}`);
  return bytes;
}

/** Capture the exact description/style/reference versions before a native tool call. */
export function prepareNativeJob(assetPath, view, { outfit: oid = 'default', sourceReferences = [] } = {}) {
  const dir = dirname(resolve(assetPath));
  const asset = read(assetPath);
  const outfit = checkOutfit(asset, oid, view);
  if (view !== ANCHOR) {
    const usable = anchorUsable(asset, oid);
    if (!usable.ok) throw new Error(usable.why);
  }
  const prompt = buildPrompt(asset, oid, view);
  const { refs, notes } = view === ANCHOR ? { refs: [], notes: [] } : resolveRefs(asset, oid, prompt);
  const sources = sourceReferences.length
    ? sourceReferences.map((file) => ({ path: resolve(file), sha256: sha256(readFileSync(resolve(file))) }))
    : (current(outfit, ANCHOR)?.provenance?.sourceReferences ?? []).map((s) => ({ ...s, path: within(dir, s.file) }));
  for (const s of sources) verifyFile(s.path, s.sha256);
  const refFiles = refs.map((r) => {
    const path = within(dir, r.file);
    verifyFile(path, r.sha256);
    return { ...r, path };
  });
  if (sources.length) {
    prompt.text += ' Preserve the identity, facial proportions, age appearance, hairstyle, visible clothing and natural skin texture of the original person reference. Do not beautify into a generic face or add age spots or wrinkles not supported by the reference. Unseen clothing and back details are conservative inferences.';
  }
  return {
    schema: 'rui-native-image-job/v1', assetName: asset.name, outfit: oid, view,
    prompt, refs: refFiles, sourceReferences: sources, notes,
    layersHash: viewLayersHash(resolveLayers(asset, oid), allViews(outfit)[view]), lookHash: lookHash(outfit.look),
    referenceFiles: [...new Set([...refFiles.map((r) => r.path), ...sources.map((r) => r.path)])],
    createdAt: new Date().toISOString(),
  };
}

/** Register an actual native-tool PNG; code gates are never a visual review. */
export function importNativeImage(assetPath, view, imagePath, {
  outfit: oid = 'default', model = 'native-tool', job = null, sourceReferences = [],
} = {}) {
  const dir = dirname(resolve(assetPath));
  const asset = read(assetPath);
  const outfit = checkOutfit(asset, oid, view);
  const input = readFileSync(resolve(imagePath));
  if (!isPng(input)) throw new Error('import-image 只接受实际 PNG 文件');
  pngInfo(input); // Validate the image header before writing anything.
  const prepared = job ?? prepareNativeJob(assetPath, view, { outfit: oid, sourceReferences });
  if (prepared.schema !== 'rui-native-image-job/v1' || prepared.assetName !== asset.name || prepared.outfit !== oid || prepared.view !== view) throw new Error('job 与当前角色/造型/视图不符');
  const spec = allViews(outfit)[view];
  if (prepared.layersHash !== viewLayersHash(resolveLayers(asset, oid), spec) || prepared.lookHash !== lookHash(outfit.look)) throw new Error('准备出图后描述或画风已改变；重新 prepare 和出图');
  if (view !== ANCHOR) {
    const usable = anchorUsable(asset, oid);
    if (!usable.ok) throw new Error(usable.why);
    if (!prepared.refs?.some((r) => r.view === ANCHOR)) throw new Error('派生图必须以正面全身为根');
  }
  for (const r of prepared.refs ?? []) {
    const active = current(outfit, r.view);
    if (!active || active.v !== r.v || active.sha256 !== r.sha256) throw new Error('准备出图后参考版本已改变；重新 prepare 和出图');
    verifyFile(within(dir, active.file), r.sha256);
  }
  const sourceCopies = (prepared.sourceReferences ?? []).map((s) => {
    const bytes = verifyFile(s.path, s.sha256);
    const ext = extname(s.path).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) throw new Error('原始参考图必须是 PNG/JPEG/WebP');
    return { bytes, file: `sources/${s.sha256}${ext}`, sha256: s.sha256, originalName: s.originalName ?? s.path.split(/[\\/]/).at(-1) };
  });
  const result = recordVersion(asset, oid, view, {
    buf: input, model, prompt: prepared.prompt, refs: prepared.refs, notes: prepared.notes,
    confirmMode: 'wait', visualReview: { status: 'pending' },
    provenance: {
      kind: 'imported-image', inputSha256: sha256(input),
      promptOrigin: job ? 'prepared-job' : 'suggested-at-import-not-verified',
      jobCreatedAt: prepared.createdAt,
      sourceReferences: sourceCopies.map(({ bytes, ...s }) => s),
    },
  });
  const output = within(dir, result.version.file);
  if (existsSync(output)) throw new Error(`版本文件已存在，未覆盖：${output}`);
  for (const s of sourceCopies) {
    const dest = within(dir, s.file);
    mkdirSync(dirname(dest), { recursive: true });
    if (existsSync(dest)) verifyFile(dest, s.sha256);
    else writeFileSync(dest, s.bytes, { flag: 'wx' });
  }
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, result.buf, { flag: 'wx' });
  save(assetPath, asset);
  return result.version;
}

/** Check stored bytes as well as JSON fingerprints. Does not modify asset state. */
export function fileProblems(asset, assetPath, oid) {
  const problems = [];
  const dir = dirname(resolve(assetPath));
  for (const view of Object.keys(asset.outfits[oid].views ?? {})) {
    const version = current(asset.outfits[oid], view);
    if (!version) continue;
    try { verifyFile(within(dir, version.file), version.sha256); } catch (e) { problems.push(`${view}: ${e.message}`); }
    for (const ref of version.provenance?.sourceReferences ?? []) {
      try { verifyFile(within(dir, ref.file), ref.sha256); } catch (e) { problems.push(`${view} 原始参考: ${e.message}`); }
    }
  }
  return problems;
}
