#!/usr/bin/env node
// Rui-Skills host adapter. Upstream schemas stay intact; the host delivers 30-second groups.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { requireAuthorization } from './local-gate.mjs';
import { validateOutline } from '../modules/novel-outline/scripts/novel-outline.mjs';
import { validateCast } from '../modules/novel-characters/scripts/novel-characters.mjs';
import { validateArt, castNamesOf } from '../modules/novel-art/scripts/novel-art.mjs';
import { validateScript } from '../modules/novel-script/scripts/novel-script.mjs';
import { validateStoryboard, SHOT_SIZES, CAMERA_MOVES } from '../modules/novel-storyboard/scripts/novel-storyboard.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleDir = path.resolve(here, '../modules');
export const FILES = {outline: 'outline/outline.json', cast: 'characters/cast.json', art: 'art/art.json', script: 'script/script.json', storyboard: 'storyboard/storyboard.json'};
const MODULES = ['novel-outline', 'novel-characters', 'novel-art', 'novel-script', 'novel-storyboard'];
// Distilled lighting relationships; scene details and explicit unified prompts stay authoritative.
const LIVE_LIGHTING = '以本场已有光源决定受光面，明暗随距离、朝向和遮挡变化；按昼夜与天气保持曝光，保留阴影层次和关键表演可读性，不全局套青橙滤镜。';
const PROFILES = {
  'live-action': {label: '真人剧', prompt: `9:16，真人短剧，自然肤色，真实克制表演。${LIVE_LIGHTING}`, constraints: '保持身份、衣饰、人数、轴线、道具归属和本场光源方位；遮挡与曝光连续'},
  comic: {label: '漫剧', prompt: '9:16，2D动漫短剧，清晰线条与统一色板，角色造型和上色稳定，动画姿态与反应清楚。', constraints: '保持角色造型、头身比、线条、色板、衣饰、人数、轴线和道具归属'},
};
export function resolveProduction(project, {mode} = {}) {
  const settings = project.production === undefined ? {} : project.production;
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('production.json 必须是 JSON 对象');
  if (settings.mode !== undefined && !Object.hasOwn(PROFILES, settings.mode)) throw new Error('production.json mode 只能是 live-action 或 comic');
  const selected = mode ?? settings.mode ?? 'live-action';
  if (!Object.hasOwn(PROFILES, selected)) throw new Error('mode 只能是 live-action 或 comic');
  if (settings.style !== undefined && (typeof settings.style !== 'string' || !settings.style.trim())) throw new Error('production.json style 必须是非空字符串');
  // A command-line switch selects another mode without copying the saved mode's style.
  const style = settings.style && (!mode || !settings.mode || mode === settings.mode) ? settings.style.trim() : '';
  const profile = PROFILES[selected];
  const prompt = style ? `9:16，${profile.label}；画风/质感：${style}。${selected === 'comic' ? '角色造型、线条、色板和上色一致。' : '自然肤色，真实克制表演。按指定风格与本场已有光源组织受光面和阴影，保持跨镜光源方位与曝光连续。'}` : profile.prompt;
  return {mode: selected, ...profile, prompt, style};
}
export function loadProject(dir) {
  const root = path.resolve(dir);
  if (!fs.statSync(root).isDirectory()) throw new Error('项目路径必须是目录');
  const docs = {}, files = {};
  for (const [key, rel] of Object.entries(FILES)) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    const doc = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new Error(`${rel} 必须是 JSON 对象`);
    docs[key] = doc; files[key] = file;
  }
  if (!Object.keys(docs).length) throw new Error(`没有制作资料；请按约定创建 ${Object.values(FILES).join('、')}`);
  const settingsFile = path.join(root, 'production.json');
  const production = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8').replace(/^\uFEFF/, '')) : {};
  return {root, docs, files, production};
}

export function checkProject(project, {variableLength = false, mode} = {}) {
  const {docs: d} = project, errors = [], checked = [], skipped = [];
  try { resolveProduction(project, {mode}); } catch (e) { errors.push(`production: ${e.message}`); }
  const run = (key, fn) => {
    if (!d[key]) { skipped.push(`${key}：未提供`); return; }
    try { errors.push(...fn().map(message => `${key}: ${message}`)); checked.push(key); }
    catch (e) { errors.push(`${key}: 数据结构错误：${e.message}`); }
  };
  run('outline', () => validateOutline(d.outline));
  run('cast', () => validateCast(d.cast.characters, null, d.cast.lang ?? 'zh'));
  if (d.cast) skipped.push('角色逐字引文对账：没有提供原小说文本；可单独调用角色模块带原文验证');
  run('art', () => validateArt(d.art, d.cast ? castNamesOf(d.cast) : null));
  run('script', () => validateScript(d.script, d));
  run('storyboard', () => {
    if (!d.script) return ['必须提供 script/script.json，不能跳过节拍与台词对账'];
    const board = {...d.storyboard, params: {...d.storyboard.params, maxSegmentSeconds: 30}};
    const problems = validateStoryboard(board, d);
    for (const ep of board.episodes ?? []) for (const seg of ep.segments ?? []) {
      const total = (seg.cuts ?? []).reduce((sum, cut) => sum + cut.seconds, 0);
      if (!Number.isFinite(total) || total <= 0 || total > 30 + 1e-8 || (!variableLength && Math.abs(total - 30) > 1e-8)) {
        problems.push(`${seg.id}: 实际 ${total} 秒，默认要求精确30秒；重新编排或明确使用 --variable-length，不自动补时或删对白`);
      }
    }
    return problems;
  });
  if (d.script && !d.outline) skipped.push('剧本人物与大纲戏剧节点对账：未提供 outline');
  if (d.script && !d.art) skipped.push('剧本场景/光照/道具与美术对账：未提供 art');
  if (d.storyboard) skipped.push('可选镜头配方卡库：未提供');
  // Reject ambiguous IDs rather than silently selecting one record.
  for (const [label, items] of [['outline.characters', d.outline?.characters], ['outline.scenes', d.outline?.scenes], ['outline.props', d.outline?.props], ['art.scenes', d.art?.scenes], ['art.props', d.art?.props]]) {
    const seen = new Set();
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item?.id || seen.has(item.id)) errors.push(`${label}: 缺少或重复 ID ${item?.id}`);
      seen.add(item?.id);
    }
  }
  if (d.outline && d.art) {
    for (const key of ['scenes', 'props']) {
      const ids = new Set((d.outline[key] ?? []).map(x => x.id));
      for (const x of d.art[key] ?? []) if (!ids.has(x.id)) errors.push(`art.${key}: ${x.id} 不在大纲资产清单中`);
    }
  }
  return {errors, checked, skipped};
}

function requireValid(project, options) {
  const report = checkProject(project, options);
  if (report.errors.length) throw new Error(report.errors.join('\n'));
  return report;
}
const fmt = n => Number(n.toFixed(6)).toString();
export function exportText(project, options = {}) {
  requireAuthorization();
  const {docs: d} = project;
  if (!d.script || !d.storyboard) throw new Error('文本导出需要 script/script.json 和 storyboard/storyboard.json');
  requireValid(project, options);
  const production = resolveProduction(project, options);
  const names = Object.fromEntries((d.outline?.characters ?? []).map(c => [c.id, c.name]));
  const sceneNames = Object.fromEntries((d.art?.scenes ?? d.outline?.scenes ?? []).map(s => [s.id, s.name]));
  const out = [`# ${d.storyboard.source} · Rui-Skills ${production.label}分镜`, '', '时长为分镜交付组；实际视频服务生成上限须另行核对。', ''];
  for (const ep of d.storyboard.episodes) {
    const scriptEp = d.script.episodes.find(e => e.ep === ep.ep);
    for (const seg of ep.segments) {
      const scene = scriptEp.scenes[seg.sceneIndex - 1];
      const seconds = seg.cuts.reduce((n, cut) => n + cut.seconds, 0);
      if (seg.music?.trim() && !/^(无|无配乐|none|n\/a)$/i.test(seg.music.trim()) && !options.allowMusic) {
        throw new Error(`${seg.id} 包含配乐；默认无BGM，请明确 --allow-music 或在源资料中修改，不静默丢弃`);
      }
      out.push(`## ${seg.id} · ${fmt(seconds)}秒`, '', `**统一提示词：** ${d.storyboard.unifiedPrompt || production.prompt}场景：${sceneNames[scene.sceneId] || scene.sceneId}；光照：${scene.lighting || '沿用本场设定'}。站位：${seg.blocking}。${options.allowMusic && seg.music ? `配乐：${seg.music}。` : '无音乐、BGM。'}无字幕；${seg.soundscape || '保留原剧情的自然环境音与动作音'}。`, '');
      let start = 0;
      for (const cut of seg.cuts) {
        const end = start + cut.seconds;
        out.push(`**${fmt(start)}–${fmt(end)}秒【${SHOT_SIZES[cut.size].zh}｜${cut.cameraPosition}｜${cut.lens}｜${CAMERA_MOVES[cut.camera]}】** ${cut.shot}`);
        out.push(`构图：${cut.composition}；视线：${cut.eyeline}；焦点：${cut.focus}；稳定性：${cut.stability}。`);
        if (cut.lighting) out.push(`光照：${cut.lighting}`);
        if (cut.sfx) out.push(`音效：${cut.sfx}`);
        if (production.mode === 'comic' && cut.animation) out.push(`动画：${cut.animation}`);
        if (production.mode === 'comic' && cut.visualTreatment) out.push(`画面处理：${cut.visualTreatment}`);
        for (const beat of scene.flow.slice(cut.beats[0] - 1, cut.beats[1])) {
          if (typeof beat.line === 'string') out.push(`${names[beat.speaker] || beat.speaker}${beat.delivery ? `（${beat.delivery}）` : ''}：${beat.line}`);
        }
        if (cut.note) out.push(`说明：${cut.note}`);
        out.push(''); start = end;
      }
      out.push(`**约束条件：** ${production.constraints}；下一组从本组末帧的站位、手势与视线接续。`, '');
    }
  }
  return out.join('\n');
}

function invoke(file, args, cwd) {
  const result = spawnSync(process.execPath, [file, ...args], {cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `子命令退出 ${result.status}`);
  return result.stdout;
}
export function main(argv) {
  const [command, target, ...args] = argv;
  if (!command || ['--help', '-h'].includes(command)) { console.log('Rui-Skills: run <module> <args...> | check <project> [--mode live-action|comic] [--variable-length] | report <project> [--mode live-action|comic] [--out <dir>] [--variable-length] | export-text <project> [--mode live-action|comic] [--out <file>] [--variable-length] [--allow-music]'); return; }
  if (command === 'run') {
    requireAuthorization();
    if (!MODULES.includes(target)) throw new Error(`模块只能是 ${MODULES.join(', ')}`);
    process.stdout.write(invoke(path.join(moduleDir, target, 'scripts', `${target}.mjs`), args, process.cwd())); return;
  }
  if (!['check', 'report', 'export-text'].includes(command) || !target) throw new Error('未知命令或缺少项目目录；使用 --help');
  const options = {variableLength: false, allowMusic: false}; let output;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--variable-length') options.variableLength = true;
    else if (args[i] === '--allow-music') options.allowMusic = true;
    else if (args[i] === '--mode' && args[i + 1] && !args[i + 1].startsWith('--')) options.mode = args[++i];
    else if (args[i] === '--out' && args[i + 1] && !args[i + 1].startsWith('--')) output = path.resolve(args[++i]);
    else throw new Error(`未知参数或缺少值：${args[i]}`);
  }
  requireAuthorization();
  const project = loadProject(target);
  if (command === 'export-text') {
    const text = exportText(project, options);
    if (output) { fs.mkdirSync(path.dirname(output), {recursive: true}); fs.writeFileSync(output, text, 'utf8'); console.log(output); }
    else process.stdout.write(text);
    return;
  }
  const report = requireValid(project, options);
  const production = resolveProduction(project, options);
  console.log(`制作模式：${production.label}（${production.mode}）\n已检查：${report.checked.join('、')}\n未检查：${report.skipped.join('；') || '无'}\n视觉检查：未执行`);
  if (command === 'report') {
    const outDir = output || path.join(project.root, 'reports');
    fs.mkdirSync(outDir, {recursive: true});
    const file = path.join(outDir, 'production-report.html');
    const files = {...project.files};
    let temporaryBoard;
    try {
      if (files.storyboard) {
        // Keep relative image paths anchored beside the original board; never overwrite it.
        temporaryBoard = path.join(path.dirname(files.storyboard), `.rui-report-${randomUUID()}.json`);
        const board = {...project.docs.storyboard, params: {...project.docs.storyboard.params, maxSegmentSeconds: 30}};
        fs.writeFileSync(temporaryBoard, JSON.stringify(board), {encoding: 'utf8', flag: 'wx'});
        files.storyboard = temporaryBoard;
      }
      const flags = Object.entries(files).flatMap(([key, value]) => [`--${key}`, value]);
      process.stdout.write(invoke(path.join(moduleDir, 'report.mjs'), [...flags, '--out', file], project.root));
      const esc = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const notice = `<aside data-production-mode="${production.mode}" style="padding:12px 20px;background:#14202e;color:#fff;font-family:system-ui">Rui-Skills · ${production.label}${production.style ? ` · ${esc(production.style)}` : ''} · 默认30秒分镜组；结构检查不代表视觉验收</aside>`;
      const html = fs.readFileSync(file, 'utf8').replace(/<body[^>]*>/, match => match + notice);
      fs.writeFileSync(file, html, 'utf8');
    } finally {
      if (temporaryBoard && fs.existsSync(temporaryBoard)) fs.unlinkSync(temporaryBoard);
    }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
