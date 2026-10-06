#!/usr/bin/env node
// Rui-Skills local adaptation: vendored modules live beside this assembler.
/**
 * report.mjs —— 把 novel 系列各 skill 的报告合成一张单页，左侧导航切换。
 *
 * 定位：**组装器，不是第六个 skill**。它不 import 任何 skill 的代码，而是调各自的
 * `render --html` 拿产物再拼装。三条好处：
 *
 *   1. 六个 skill 一行不改，各自仍然独立可跑、可以单独拷走
 *   2. 各 skill 的加载逻辑（图存在才挂、ctx 组装、语言优先级）只有一份，不在这里重写
 *   3. 某个 skill 改了渲染，这里自动跟上，不会漂
 *
 * 合并要解决三件事，都在这个文件里做，不侵入 skill：
 *
 *   - **样式串味**：五份报告共用 57 个类名，其中 13 个同名不同定义（`.copy` `.kpis`
 *     `.badge` `.chip` …）。做法是给每份样式的每条选择器加作用域前缀。
 *     已量过：五份报告的 CSS 里**没有任何 `#id` 选择器**，所以只处理类与元素选择器。
 *   - **脚本串味**：各报告的脚本都是 `document.querySelector('.expo')` 这种全局查询。
 *     合成一页后只会命中第一个——五个导出按钮会全废。做法是给每份脚本套一层
 *     作用域代理，把查询限制在自己的 pane 内。
 *   - **图片路径**：各报告的图相对自己那份 json 的目录（`images/…`、`E01-01/f1.png`）。
 *     合成后要按输出文件的位置重算。
 *
 * 用法见 USAGE。
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const skillsDir = here;

/* ------------------------------------------------------------------ */
/* 面板定义                                                            */
/* ------------------------------------------------------------------ */

/**
 * 顺序照流程图：大纲 → （角色 · 美术 · 剧本）→ 分镜。
 *
 * `needs` 是这份报告渲染时要一并喂进去的上游——合并器手上有全部路径，
 * 顺手传给各自的 render，用户不用自己拼一长串参数。分镜的 `--script`
 * 是硬前提（没有剧本它会直接报错），其余都是可选增强。
 *
 * `dir` 是端到端 demo 工作目录约定里对应的子目录名，`--from` 自动发现时用。
 */
export const PANES = [
  {
    id: 'outline',
    skill: 'novel-outline',
    flag: '--outline',
    dir: 'outline',
    label: '大纲',
    labelEn: 'Outline',
    hint: '改编结构与分集',
    hintEn: 'Adaptation & episodes',
    needs: [],
  },
  {
    id: 'characters',
    skill: 'novel-characters',
    flag: '--cast',
    dir: 'characters',
    label: '角色',
    labelEn: 'Characters',
    hint: '画像与设定图',
    hintEn: 'Profiles & sheets',
    needs: [],
  },
  {
    id: 'art',
    skill: 'novel-art',
    flag: '--art',
    dir: 'art',
    label: '美术',
    labelEn: 'Art',
    hint: '场景与道具',
    hintEn: 'Scenes & props',
    needs: ['--cast'],
  },
  {
    id: 'script',
    skill: 'novel-script',
    flag: '--script',
    dir: 'script',
    label: '剧本',
    labelEn: 'Screenplay',
    hint: '场次、节拍、台词',
    hintEn: 'Scenes, beats, lines',
    needs: ['--outline', '--art', '--cast'],
  },
  {
    id: 'storyboard',
    skill: 'novel-storyboard',
    flag: '--storyboard',
    dir: 'storyboard',
    label: '分镜',
    labelEn: 'Storyboard',
    hint: '段、分镜、首帧',
    hintEn: 'Segments, cuts, frames',
    needs: ['--script', '--outline', '--art', '--cast'],
  },
];

/* ------------------------------------------------------------------ */
/* 拆文档                                                              */
/* ------------------------------------------------------------------ */

/**
 * 把一份完整 HTML 文档拆成 { style, body, scripts, title }。
 *
 * 各报告都是 `<!doctype html><html><head><style>…</style></head><body>…</body></html>`
 * 这个固定形状，所以正则够用——不引入 DOM 解析器，这个仓库零依赖。
 */
export function splitDoc(html) {
  const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);

  // **只抠真正的 JavaScript**。各报告都用 `<script type="application/json" id="…-data">`
  // 内嵌自己那份源 JSON 给导出按钮读——那是数据不是脚本，必须原样留在正文里。
  // 抠错了会被当成代码执行，浏览器直接甩 `Unexpected token ':'`。
  const isJs = (attrs) => {
    if (/\bsrc=/.test(attrs)) return false;
    const type = (attrs.match(/\btype="([^"]*)"/) ?? [])[1];
    return !type || /^(text\/javascript|module|application\/javascript)$/i.test(type);
  };
  const SCRIPT_RE = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  const scripts = [...html.matchAll(SCRIPT_RE)].filter((m) => isJs(m[1])).map((m) => m[2]);

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
  let body = bodyMatch ? bodyMatch[1] : html;
  // 正文里把 JS 剥掉（它们要单独套作用域），数据块留下
  body = body.replace(SCRIPT_RE, (whole, attrs) => (isJs(attrs) ? '' : whole));
  const title = (html.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1] ?? '';
  return { style: styles.join('\n'), body, scripts, title };
}

/* ------------------------------------------------------------------ */
/* 样式加作用域                                                        */
/* ------------------------------------------------------------------ */

/**
 * 给一份样式表的每条选择器加上作用域前缀。
 *
 * 四种要特殊对待的：
 *   - `:root` / `html` / `body` → 直接换成作用域本身（自定义属性挂在 pane 上，
 *     pane 内部照常继承）
 *   - `@keyframes` → **整块原样保留**，里面的 `0%` `from` `to` 不是选择器
 *   - `@media` / `@supports` → 递归处理内部，`@` 行本身不动
 *   - 逗号分隔的选择器组 → 每一支各自加前缀
 */
export function scopeCss(css, scope) {
  // 先剥注释。规则之间的注释会被当成下一条选择器的一部分，而注释里的逗号会把
  // 选择器切断——实测 `/* episode overview: first three cards, … */` 就是这么
  // 变成一条选择器的。剥掉是最省事的解，合并产物里也不需要这些注释。
  const css2 = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let i = 0;

  const readBlock = (from) => {
    // 从 `{` 开始配对到对应的 `}`，返回结束位置（指向 `}` 之后）
    let depth = 0;
    for (let k = from; k < css2.length; k += 1) {
      if (css2[k] === '{') depth += 1;
      else if (css2[k] === '}') {
        depth -= 1;
        if (depth === 0) return k + 1;
      }
    }
    return css2.length;
  };

  while (i < css2.length) {
    const brace = css2.indexOf('{', i);
    if (brace < 0) { out.push(css2.slice(i)); break; }
    const head = css2.slice(i, brace).trim();
    const end = readBlock(brace);
    const inner = css2.slice(brace + 1, end - 1);

    if (/^@(keyframes|font-face|counter-style|property)/i.test(head)) {
      // 动画关键帧与字体声明整块原样搬，内部不是选择器
      out.push(`${head}{${inner}}`);
    } else if (/^@(media|supports|layer|container)/i.test(head)) {
      out.push(`${head}{${scopeCss(inner, scope)}}`);
    } else if (head.startsWith('@')) {
      out.push(`${head}{${inner}}`);
    } else {
      const scoped = head
        .split(',')
        .map((sel) => {
          const s = sel.trim();
          if (!s) return '';
          // 页面级选择器换成作用域本身：自定义属性与基础排版落在 pane 上
          if (/^(:root|html|body)$/.test(s)) return scope;
          if (/^(:root|html|body)\b/.test(s)) return s.replace(/^(:root|html|body)\b/, scope);
          // `*` 单独一支时不加空格，避免选中 pane 自己以外的东西时语义漂移
          return `${scope} ${s}`;
        })
        .filter(Boolean)
        .join(',');
      out.push(`${scoped}{${inner}}`);
    }
    i = end;
  }
  return out.join('\n');
}

/* ------------------------------------------------------------------ */
/* 正文加作用域                                                        */
/* ------------------------------------------------------------------ */

/**
 * 给正文里的 id 加前缀，并同步改掉引用它的地方。
 *
 * 已量过：五份报告跨文档重复的 id 有 9 个（`#ep-1`…`#ep-6`、`#sec-gates`、
 * `#sec-scenes`、`#sec-rhythm`）。不改的话页内锚点会跳到别的面板去。
 *
 * 一并改的引用点：`href="#…"`、`data-pane="…"`（大纲的图表/表格切换靠它跟
 * `p.id` 比对）、`aria-controls`、`for`。**脚本里的 id 字符串不用改**——
 * 作用域代理会在 `getElementById` 里自动补前缀。
 */
export function scopeHtml(body, prefix) {
  return body
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${prefix}${id}"`)
    .replace(/\bhref="#([^"]+)"/g, (_, id) => `href="#${prefix}${id}"`)
    .replace(/\bdata-pane="([^"]+)"/g, (_, id) => `data-pane="${prefix}${id}"`)
    .replace(/\baria-controls="([^"]+)"/g, (_, id) => `aria-controls="${prefix}${id}"`)
    .replace(/\bfor="([^"]+)"/g, (_, id) => `for="${prefix}${id}"`);
}

/**
 * 把相对图片路径按输出文件的位置重算。
 *
 * 各报告的图相对各自 json 所在目录（角色是 `images/…`，分镜是 `E01-01/f1.png`）。
 * 合成一页之后，浏览器按合并文件的位置解析，不重算就全是断图。
 * `data:` 与绝对地址原样不动。
 */
export function rebaseAssets(text, fromDir, outDir) {
  const fix = (p) => {
    if (!p || /^(data:|https?:|file:|\/|#)/i.test(p)) return p;
    const rel = relative(outDir, resolve(fromDir, p)).split('\\').join('/');
    return rel || p;
  };
  return text
    .replace(/\b(src|data-img|data-src|poster)="([^"]*)"/g, (m, attr, val) => `${attr}="${fix(val)}"`)
    // 内联样式与样式表里的 `url(...)`。角色报告的缩略图就走这条
    // （`style="background-image:url('images/…')"`），只查属性会漏掉它，
    // 表现是缩略图 404 但大图正常——很不好排查，所以两条路都覆盖。
    .replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, val) => `url(${q}${fix(val)}${q})`);
}

/* ------------------------------------------------------------------ */
/* 脚本加作用域                                                        */
/* ------------------------------------------------------------------ */

/**
 * 给一份报告的脚本套上作用域。
 *
 * 各报告的脚本都写成 `document.querySelector('.expo')` 这种全局查询——合成一页
 * 之后只会命中第一个面板的那个，其余四个导出按钮直接失效。这里用一个 Proxy 把
 * `document` 换掉：查询类方法限制在自己的 pane 内，`getElementById` 顺手补上
 * id 前缀（所以脚本里的 id 字符串一个都不用改），其余属性与方法原样透传给真的
 * document（`createElement` 这些还要用）。
 *
 * 整段包在 IIFE 里，顺带隔离各报告的顶层 `const`——五份脚本里有重名的。
 */
export function scopeJs(js, paneId, prefix) {
  return `(function(){
var __root=window.document.getElementById(${JSON.stringify(paneId)});
if(!__root)return;
var __doc=window.document;
var document=new Proxy(__doc,{get:function(t,k){
  if(k==='querySelector')return function(s){return __root.querySelector(s);};
  if(k==='querySelectorAll')return function(s){return __root.querySelectorAll(s);};
  if(k==='getElementById')return function(id){
    return __root.querySelector('#'+(window.CSS&&CSS.escape?CSS.escape(${JSON.stringify(prefix)}+id):${JSON.stringify(prefix)}+id));
  };
  var v=t[k];
  return typeof v==='function'?v.bind(t):v;
}});
try{
${js}
}catch(e){console.error(${JSON.stringify(paneId)},e);}
})();`;
}

/* ------------------------------------------------------------------ */
/* 组装一个面板                                                        */
/* ------------------------------------------------------------------ */

/**
 * 把一份完整报告文档变成一个可以塞进外壳的面板。
 * 纯函数，不碰文件系统——自测直接喂 HTML 字符串就能验。
 */
export function makePane(html, { id, fromDir = '.', outDir = '.' } = {}) {
  const { style, body, scripts, title } = splitDoc(html);
  const paneId = `pane-${id}`;
  const prefix = `${id}--`;
  const scoped = rebaseAssets(scopeHtml(body, prefix), fromDir, outDir);
  return {
    id,
    paneId,
    title,
    css: rebaseAssets(scopeCss(style, `#${paneId}`), fromDir, outDir),
    html: scoped,
    js: scripts.filter((s) => s.trim()).map((s) => scopeJs(s, paneId, prefix)).join('\n'),
  };
}

/* ------------------------------------------------------------------ */
/* 外壳                                                                */
/* ------------------------------------------------------------------ */

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SHELL_I18N = {
  zh: {
    kicker: '短剧制作报告',
    nav: '流水线',
    expandAll: '平铺全部',
    expandHint: '平铺之后 Cmd+F 能搜到所有面板',
    collapse: '回到分栏',
    empty: '没有任何一段的产出——至少要给一份 json',
    htmlLang: 'zh',
  },
  en: {
    kicker: 'Short-drama production report',
    nav: 'Pipeline',
    expandAll: 'Show all',
    expandHint: 'Showing all panes makes Cmd+F reach every section',
    collapse: 'Back to panes',
    empty: 'No stage produced anything — pass at least one json',
    htmlLang: 'en',
  },
};

/**
 * 外壳布局：左侧固定导航 + 右侧内容区。
 *
 * 只有当前面板显示，所以 Cmd+F 默认只搜得到当前这一份——这跟各报告「全部平铺
 * 可 Cmd+F」的设计主张是冲突的。所以留了「平铺全部」开关：按下之后所有面板同时
 * 显示，搜索恢复全局。默认分栏，因为五份加起来将近六十万字符，一次全渲染很沉。
 */
export function renderShell(panes, { title = '', lang = 'zh', subtitle = '' } = {}) {
  const t = SHELL_I18N[lang] ?? SHELL_I18N.zh;
  const nav = panes
    .map(
      (p, i) => `<button class="rp-nv${i === 0 ? ' rp-on' : ''}" data-pane="${esc(p.paneId)}" type="button">
  <span class="rp-nv-i">${String(i + 1)}</span>
  <span class="rp-nv-t"><b>${esc(lang === 'en' ? p.meta.labelEn : p.meta.label)}</b><small>${esc(lang === 'en' ? p.meta.hintEn : p.meta.hint)}</small></span>
</button>`,
    )
    .join('\n');

  const body = panes
    .map((p, i) => `<section class="rp-pane${i === 0 ? ' rp-on' : ''}" id="${esc(p.paneId)}">${p.html}</section>`)
    .join('\n');

  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · ${esc(t.kicker)}</title>
<style>
/* ---- 外壳。视觉语言跟各报告同一套：冷灰印张 + 铁锈红印记 ---- */
:root{
  --paper:#f6f6f4; --panel:#fff; --ink:#1a1a18; --ink-2:#44443f; --ink-3:#77776f;
  --rule:#d2d5d0; --rule-2:#c2c6bf; --seal:#8a3324; --seal-soft:#8a332412;
  --rail:248px;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{
  background:var(--paper); color:var(--ink);
  font:14px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;
  -webkit-font-smoothing:antialiased;
}
.rp-app{display:flex;align-items:flex-start;min-height:100vh}

/* ---- 左侧导航 ---- */
.rp-rail{
  position:sticky;top:0;flex:0 0 var(--rail);width:var(--rail);height:100vh;
  background:var(--panel);border-right:1px solid var(--rule);
  display:flex;flex-direction:column;padding:22px 14px 16px;
}
.rp-brand{padding:0 8px 16px;border-bottom:1px solid var(--rule);margin-bottom:14px}
.rp-brand h1{margin:0;font-size:19px;font-weight:650;letter-spacing:.02em;line-height:1.3}
.rp-brand p{margin:5px 0 0;font-size:11.5px;color:var(--ink-3);letter-spacing:.06em}
.rp-brand .rp-sub{margin-top:8px;font-size:11.5px;color:var(--ink-2);line-height:1.5}
.rp-navlab{padding:0 8px 8px;font-size:10.5px;letter-spacing:.14em;color:var(--ink-3);text-transform:uppercase}
.rp-nv{
  display:flex;align-items:center;gap:10px;width:100%;padding:9px 8px;margin-bottom:2px;
  border:0;border-radius:7px;background:transparent;cursor:pointer;text-align:left;
  color:var(--ink-2);font:inherit;transition:background .12s,color .12s;
}
.rp-nv:hover{background:#0000000a}
.rp-nv .rp-nv-i{
  flex:0 0 22px;height:22px;border-radius:5px;border:1px solid var(--rule-2);
  display:grid;place-items:center;font-size:11px;color:var(--ink-3);background:var(--paper);
}
.rp-nv .rp-nv-t{display:flex;flex-direction:column;min-width:0}
.rp-nv .rp-nv-t b{font-weight:600;font-size:13.5px;color:var(--ink)}
.rp-nv .rp-nv-t small{font-size:11px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rp-nv.rp-on{background:var(--seal-soft)}
.rp-nv.rp-on .rp-nv-i{background:var(--seal);border-color:var(--seal);color:#fff}
.rp-nv.rp-on .rp-nv-t b{color:var(--seal)}
.rp-railfoot{margin-top:auto;padding:12px 8px 0;border-top:1px solid var(--rule)}
.rp-allbtn{
  width:100%;padding:7px 10px;border:1px solid var(--rule-2);border-radius:7px;
  background:var(--panel);color:var(--ink-2);font:inherit;font-size:12px;cursor:pointer;
}
.rp-allbtn:hover{border-color:var(--seal);color:var(--seal)}
.rp-allbtn:focus-visible{outline:2px solid var(--seal);outline-offset:2px}
.rp-railfoot p{margin:8px 2px 0;font-size:10.5px;color:var(--ink-3);line-height:1.5}

/* ---- 内容区 ---- */
.rp-main{flex:1 1 auto;min-width:0}
.rp-pane{display:none}
.rp-pane.rp-on{display:block}
.rp-app.rp-all .rp-pane{display:block;border-bottom:1px solid var(--rule)}
.rp-app.rp-all .rp-rail .rp-nv{opacity:.55}

/* 各报告原本自己撑满视口，塞进 pane 之后交给内容区控制宽度 */
.rp-pane{max-width:100%;overflow-x:auto}

@media (max-width:900px){
  .rp-app{display:block}
  .rp-rail{position:static;width:auto;height:auto;flex:none;border-right:0;border-bottom:1px solid var(--rule)}
  .rp-railfoot{margin-top:12px}
}
@media print{
  .rp-rail{display:none}
  .rp-pane{display:block!important;break-after:page}
}

/* ---- 各面板自己的样式，已加作用域前缀 ---- */
${panes.map((p) => `/* ===== ${p.id} ===== */\n${p.css}`).join('\n')}
</style>
</head>
<body>
<div class="rp-app" id="rp-app">
  <nav class="rp-rail">
    <div class="rp-brand">
      <h1>${esc(title)}</h1>
      <p>${esc(t.kicker)}</p>
      ${subtitle ? `<div class="rp-sub">${esc(subtitle)}</div>` : ''}
    </div>
    <div class="rp-navlab">${esc(t.nav)}</div>
    ${nav}
    <div class="rp-railfoot">
      <button class="rp-allbtn" id="rp-allbtn" type="button">${esc(t.expandAll)}</button>
      <p>${esc(t.expandHint)}</p>
    </div>
  </nav>
  <main class="rp-main">
${body}
  </main>
</div>
<script>
(function(){
  var app=document.getElementById('rp-app');
  var navs=[].slice.call(document.querySelectorAll('.rp-rail .rp-nv'));
  var panes=[].slice.call(document.querySelectorAll('.rp-main .rp-pane'));
  function show(id){
    navs.forEach(function(n){n.classList.toggle('rp-on',n.dataset.pane===id);});
    panes.forEach(function(p){p.classList.toggle('rp-on',p.id===id);});
    if(history.replaceState)history.replaceState(null,'','#'+id);
    window.scrollTo(0,0);
  }
  navs.forEach(function(n){n.addEventListener('click',function(){app.classList.remove('rp-all');show(n.dataset.pane);});});
  // 数字键 1–9 直接切面板
  document.addEventListener('keydown',function(e){
    if(e.metaKey||e.ctrlKey||e.altKey)return;
    var tag=(e.target&&e.target.tagName||'').toLowerCase();
    if(tag==='input'||tag==='textarea')return;
    var i=parseInt(e.key,10);
    if(i>=1&&i<=navs.length){app.classList.remove('rp-all');show(navs[i-1].dataset.pane);}
  });
  // 平铺：所有面板同时显示，Cmd+F 恢复全局
  var all=document.getElementById('rp-allbtn');
  var LBL={on:${JSON.stringify(t.collapse)},off:${JSON.stringify(t.expandAll)}};
  all.addEventListener('click',function(){
    var on=app.classList.toggle('rp-all');
    all.textContent=on?LBL.on:LBL.off;
  });
  // 深链：#pane-script 直接落到那一屏
  var h=(location.hash||'').replace(/^#/,'');
  if(h&&document.getElementById(h))show(h);
})();
</script>
${panes.map((p) => (p.js ? `<script>\n${p.js}\n</script>` : '')).filter(Boolean).join('\n')}
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */

const USAGE = `report.mjs —— 把 novel 系列各 skill 的报告合成一张单页

  node modules/report.mjs --from <项目目录> [--out report.html] [--lang zh|en]
  node modules/report.mjs --outline o.json --cast c.json … [--out report.html]

  --from <目录>      按端到端 demo 工作目录约定自动发现：
                     outline/ characters/ art/ script/ storyboard/ 各取一份 json
  --outline <f>      单独指定某一段的 json，可与 --from 混用（显式的优先）
  --cast <f>
  --art <f>
  --script <f>
  --storyboard <f>
  --out <f>          输出路径，默认 report.html
  --lang zh|en       外壳与各报告的界面语言，默认 zh
  --title <s>        左上角标题，默认取第一份 json 的 source

  **给了哪几段就出哪几个面板**——只有角色就只有一个面板，五段齐全就是五个。
  各 skill 的 render 一行不改，仍然可以单独出各自的报告。`;

function flag(argv, name, fallback = null) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
}

/** 在一个目录里找唯一一份看着像该段产出的 json（排掉报告与清单类文件）。 */
function findJson(dir, skill) {
  if (!existsSync(dir)) return null;
  const kind = skill.replace('novel-', '');
  const stem = kind === 'characters' ? 'cast' : kind;
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !/manifest|\.gates/i.test(f))
    .filter((f) => f.toLowerCase().includes(stem));
  return files.length ? join(dir, files[0]) : null;
}

function main(argv) {
  if (!argv.length || argv.includes('-h') || argv.includes('--help')) {
    console.log(USAGE);
    return;
  }
  const from = flag(argv, '--from');
  const outPath = resolve(flag(argv, '--out', 'report.html'));
  const outDir = dirname(outPath);
  const lang = flag(argv, '--lang', 'zh');

  // 路径来源：显式参数优先，其次从 --from 目录自动发现
  const paths = {};
  for (const p of PANES) {
    const explicit = flag(argv, p.flag);
    paths[p.flag] = explicit ? resolve(explicit) : from ? findJson(resolve(from, p.dir), p.skill) : null;
  }

  const chosen = PANES.filter((p) => paths[p.flag]);
  if (!chosen.length) throw new Error(`没有找到任何一段的产出。\n\n${USAGE}`);

  const panes = [];
  for (const p of chosen) {
    const jsonPath = paths[p.flag];
    const cli = join(skillsDir, p.skill, 'scripts', `${p.skill}.mjs`);
    const args = ['render', jsonPath, '--html', '--lang', lang];
    for (const need of p.needs) {
      // 上游有就带上；没有就不带，各 skill 自己会说明跳过了什么
      if (paths[need]) args.push(need, paths[need]);
    }
    let html;
    try {
      // cwd 定在 json 所在目录：各 skill 的图存在检查是相对那里做的
      html = execFileSync(process.execPath, [cli, ...args], {
        cwd: dirname(jsonPath),
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
        env: { ...process.env, NODE_OPTIONS: '' },
      });
    } catch (e) {
      const why = (e.stderr || e.message || '').trim().split('\n')[0];
      console.error(`⚠️ ${p.skill} 这一段没渲染出来，跳过：${why}`);
      continue;
    }
    const pane = makePane(html, { id: p.id, fromDir: dirname(jsonPath), outDir });
    pane.meta = p;
    panes.push(pane);
  }

  if (!panes.length) throw new Error('每一段都没渲染成功，没有可合成的内容');

  const titleFlag = flag(argv, '--title');
  let title = titleFlag;
  if (!title) {
    const first = paths[chosen[0].flag];
    try {
      title = JSON.parse(readFileSync(first, 'utf8')).source ?? '';
    } catch { /* 读不出来就退回文件名 */ }
    if (!title) title = basename(first).replace(/[-_](cast|outline|art|script|storyboard)\.json$/i, '').replace(/\.json$/i, '');
  }

  const sub = panes.map((p) => (lang === 'en' ? p.meta.labelEn : p.meta.label)).join(lang === 'en' ? ' · ' : ' · ');
  writeFileSync(outPath, renderShell(panes, { title, lang, subtitle: sub }));
  console.log(`✓ ${panes.length} 个面板 → ${relative(process.cwd(), outPath) || outPath}`);
  for (const p of panes) console.log(`    ${lang === 'en' ? p.meta.labelEn : p.meta.label}  ${p.title || ''}`);
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMainModule()) {
  process.stdout.on('error', (e) => {
    if (e.code === 'EPIPE') process.exit(0);
    throw e;
  });
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
