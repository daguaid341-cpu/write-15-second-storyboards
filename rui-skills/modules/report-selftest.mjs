#!/usr/bin/env node
// 自测：覆盖 report.mjs 里所有确定性逻辑。
// 不调用任何模型、不起浏览器、不跑各 skill 的 render——纯字符串进出。
// Rui-Skills local adaptation: node modules/report-selftest.mjs

import assert from 'node:assert/strict';
import {
  PANES,
  makePane,
  rebaseAssets,
  renderShell,
  scopeCss,
  scopeHtml,
  scopeJs,
  splitDoc,
} from './report.mjs';

let passed = 0;
function ok(cond, msg) { assert.ok(cond, msg); passed += 1; }
function eq(a, b, msg) { assert.strictEqual(a, b, `${msg} — 期望 ${b}，实际 ${a}`); passed += 1; }

/* ---------------- 面板定义 ---------------- */

eq(PANES.length, 5, '五段流水线各一个面板');
eq(PANES[0].id, 'outline', '大纲排第一——顺序照流程图');
eq(PANES.at(-1).id, 'storyboard', '分镜排最后');
ok(new Set(PANES.map((p) => p.id)).size === PANES.length, '面板 id 不重复');
ok(new Set(PANES.map((p) => p.flag)).size === PANES.length, '参数名不重复');
ok(PANES.find((p) => p.id === 'storyboard').needs.includes('--script'), '分镜声明了它对剧本的硬依赖');
ok(PANES.find((p) => p.id === 'outline').needs.length === 0, '大纲是起点，不吃上游');
for (const p of PANES) {
  ok(p.label && p.labelEn && p.hint && p.hintEn, `${p.id} 的中英文案齐全`);
  ok(p.needs.every((n) => PANES.some((x) => x.flag === n)), `${p.id} 依赖的都是已定义的参数`);
}

/* ---------------- splitDoc ---------------- */

const DOC = `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<title>渡口 · 角色设定集</title>
<style>:root{--a:1}.card{color:red}</style></head>
<body>
<header class="hd">标题</header>
<script type="application/json" id="cast-data">{"source":"渡口","n":1}<\/script>
<script>document.querySelector('.expo').addEventListener('click',()=>{});<\/script>
</body></html>`;

{
  const d = splitDoc(DOC);
  eq(d.title, '渡口 · 角色设定集', '取到标题');
  ok(d.style.includes('.card{color:red}'), '取到样式');
  eq(d.scripts.length, 1, '只取一段真正的 JavaScript');
  ok(d.scripts[0].includes('addEventListener'), '取到的是脚本正文');

  // 这一条是被真实 bug 逼出来的：各报告用 <script type="application/json"> 内嵌
  // 自己那份源 JSON 给导出按钮读。当成脚本抠出来执行，浏览器直接甩
  // `Unexpected token ':'`，而且五个面板一起废。
  ok(d.body.includes('id="cast-data"'), '数据块留在正文里，不当脚本处理');
  ok(!d.scripts.some((s) => s.includes('"source"')), '数据块没有被当成脚本抠走');
  ok(!d.body.includes('addEventListener'), '真正的脚本从正文里剥掉了');
}

{
  // 带 src 的外链脚本不收（这个仓库不产出，但别在这里静默吞掉）
  const d = splitDoc('<body><script src="x.js"><\/script><script>var a=1;<\/script></body>');
  eq(d.scripts.length, 1, '外链脚本不当成内联脚本');
  ok(d.body.includes('src="x.js"'), '外链脚本标签留在正文里');
}

/* ---------------- scopeCss ---------------- */

{
  const css = scopeCss('.card{color:red}.a,.b{margin:0}', '#p');
  ok(css.includes('#p .card{'), '普通类加前缀');
  ok(css.includes('#p .a,#p .b{'), '逗号分隔的每一支各自加前缀');
}

{
  // :root / html / body 换成作用域本身：自定义属性挂到面板上，面板内部照常继承
  const css = scopeCss(':root{--seal:#8a3324}body{font:14px sans-serif}html{margin:0}', '#p');
  ok(css.includes('#p{--seal:#8a3324}'), ':root 换成作用域');
  ok(css.includes('#p{font:14px sans-serif}'), 'body 换成作用域');
  ok(!/(^|[^-\w])(:root|html|body)\s*\{/.test(css), '没有页面级选择器漏出去');
}

{
  // @media 递归进去，@ 行本身不动
  const css = scopeCss('@media (max-width:900px){.card{display:none}}', '#p');
  ok(css.includes('@media (max-width:900px){'), '@media 条件原样保留');
  ok(css.includes('#p .card{display:none}'), '@media 内部的选择器也加前缀');
}

{
  // @keyframes 整块原样：里面的 0% / from / to 不是选择器，加前缀会直接废掉动画
  const css = scopeCss('@keyframes fade{from{opacity:0}to{opacity:1}}', '#p');
  ok(css.includes('@keyframes fade{'), '@keyframes 保留');
  ok(!css.includes('#p from'), 'from 没有被当成选择器');
  ok(!css.includes('#p to'), 'to 没有被当成选择器');
}

{
  // 注释：规则之间的注释会被当成下一条选择器的一部分，而注释里的逗号会把选择器
  // 切断。实测就是这么让 18 条规则漏掉作用域的，所以专门钉一条。
  const css = scopeCss('/* episode overview: first three cards, then clip */\n.eps{gap:8px}', '#p');
  ok(css.includes('#p .eps{'), '注释后面的规则照常加前缀');
  ok(!css.includes('episode overview'), '注释被剥掉');
  ok(!css.includes('#p /*'), '注释没有粘进选择器');
}

{
  // 声明块里的注释不影响解析
  const css = scopeCss('.a{color:red/* 说明 */}', '#p');
  ok(css.includes('#p .a{'), '声明块里的注释不影响');
}

/* ---------------- scopeHtml ---------------- */

{
  const h = scopeHtml('<section id="sec-gates"><a href="#sec-gates">去</a><b data-pane="tp-1"></b></section>', 'outline--');
  ok(h.includes('id="outline--sec-gates"'), 'id 加前缀');
  ok(h.includes('href="#outline--sec-gates"'), '页内锚点跟着改');
  ok(h.includes('data-pane="outline--tp-1"'), 'data-pane 跟着改——大纲的图表切换靠它跟 id 比对');
  // 跨报告重复的 id 实测有 9 个（#ep-1…#ep-6、#sec-gates、#sec-scenes、#sec-rhythm），
  // 不加前缀页内锚点会跳到别的面板去
  eq(scopeHtml('<i id="ep-1"></i>', 'script--'), '<i id="script--ep-1"></i>', '不同面板的同名 id 分得开');
}

{
  const h = scopeHtml('<a href="https://x.com/#frag">外链</a>', 'p--');
  ok(h.includes('href="https://x.com/#frag"'), '外链不动');
}

/* ---------------- rebaseAssets ---------------- */

{
  const b = rebaseAssets('<img src="images/a.png">', '/demo/characters', '/demo');
  ok(b.includes('src="characters/images/a.png"'), '相对图片按输出位置重算');
}
{
  const b = rebaseAssets('<b style="background-image:url(\'images/a.png\')"></b>', '/demo/characters', '/demo');
  // 这条也是实测踩出来的：角色报告的缩略图走内联 background-image，
  // 只查 src 属性会漏掉，表现是大图正常缩略图 404，很难排查
  ok(b.includes("url('characters/images/a.png')"), 'CSS 的 url() 也重算');
}
{
  const b = rebaseAssets('<img src="data:image/png;base64,AA"><img src="https://x/a.png"><img src="/abs.png">', '/demo/x', '/demo');
  ok(b.includes('src="data:image/png;base64,AA"'), 'data: 不动');
  ok(b.includes('src="https://x/a.png"'), '绝对地址不动');
  ok(b.includes('src="/abs.png"'), '根路径不动');
}
{
  const b = rebaseAssets('<img data-src="E01-01/f1.png" data-img="E01-01/f1.png">', '/demo/storyboard', '/demo');
  eq((b.match(/storyboard\/E01-01\/f1\.png/g) ?? []).length, 2, 'data-src 与 data-img 都重算');
}

/* ---------------- scopeJs ---------------- */

{
  const js = scopeJs("document.querySelector('.expo').click();", 'pane-outline', 'outline--');
  ok(js.startsWith('(function(){'), '包在 IIFE 里——五份脚本有重名的顶层 const');
  ok(js.includes('__root'), '拿到自己的面板根');
  ok(js.includes('new Proxy'), '用代理接管 document');
  ok(js.includes("document.querySelector('.expo')"), '原脚本正文原样保留，不做字符串改写');
  // 语法必须成立，否则整段脚本在浏览器里直接报错
  assert.doesNotThrow(() => new Function(js), '包装之后仍是合法 JavaScript');
  passed += 1;
}

{
  // 面板不存在时安静退出，不是抛异常——某一段没渲染出来时其余面板要照常工作
  const js = scopeJs('boom();', 'pane-x', 'x--');
  ok(js.includes('if(!__root)return;'), '面板不在就直接返回');
  ok(js.includes('catch'), '脚本自己炸掉不连累别的面板');
}

/* ---------------- makePane ---------------- */

{
  const pane = makePane(DOC, { id: 'characters', fromDir: '/demo/characters', outDir: '/demo' });
  eq(pane.id, 'characters', '面板 id');
  eq(pane.paneId, 'pane-characters', '面板容器 id');
  eq(pane.title, '渡口 · 角色设定集', '带上原报告的标题');
  ok(pane.css.includes('#pane-characters .card{'), '样式已加作用域');
  ok(pane.css.includes('#pane-characters{--a:1}'), ':root 落到面板上');
  ok(pane.html.includes('id="characters--cast-data"'), '正文 id 已加前缀');
  ok(pane.js.includes('__root'), '脚本已加作用域');
  ok(!pane.html.includes('<script>'), '正文里没有留下裸脚本');
}

/* ---------------- renderShell ---------------- */

{
  const mk = (id) => {
    const p = makePane(DOC.replace('渡口 · 角色设定集', `渡口 · ${id}`), { id });
    p.meta = PANES.find((x) => x.id === id);
    return p;
  };
  const html = renderShell([mk('outline'), mk('characters')], { title: '渡口', lang: 'zh' });

  ok(html.startsWith('<!doctype html>'), '产出是一份完整文档');
  eq((html.match(/<section class="rp-pane/g) ?? []).length, 2, '给了几段就出几个面板');
  ok(html.includes('id="pane-outline"') && html.includes('id="pane-characters"'), '两个面板都在');
  ok(html.includes('class="rp-pane rp-on" id="pane-outline"'), '第一个面板默认显示');

  // 外壳自己的类名全部带 rp- 前缀。报告正文里出现同名类（.pane .on .main 这些
  // 都很常见）会让外壳的显示/隐藏错乱——实测就撞过一次。
  for (const c of ['app', 'rail', 'nv', 'main', 'pane', 'allbtn']) {
    ok(html.includes(`.rp-${c}`) || html.includes(`class="rp-${c}`), `外壳的 .${c} 带了 rp- 前缀`);
  }
  const shellJs = html.slice(html.lastIndexOf('<main'), html.indexOf('__root'));
  ok(!/querySelectorAll\('\.(pane|nv|rail|main)[ '"]/.test(shellJs), '外壳脚本查的也是带前缀的类名');

  // 每个面板的脚本各成一块，互不干扰
  eq((html.match(/__root=window\.document\.getElementById/g) ?? []).length, 2, '每个面板一段作用域脚本');
  ok(html.includes('rp-allbtn'), '有平铺开关——分栏之后 Cmd+F 只搜得到当前面板，得留一条退路');

  // 深链
  ok(html.includes("location.hash"), '支持 #pane-xxx 深链');
  // 数字键
  ok(html.includes('keydown'), '支持数字键切面板');
}

{
  const p = makePane(DOC, { id: 'script' });
  p.meta = PANES.find((x) => x.id === 'script');
  const en = renderShell([p], { title: 'Ferry', lang: 'en' });
  ok(en.includes('<html lang="en">'), '英文界面的 html lang');
  ok(en.includes('Screenplay'), '导航用英文标签');
  ok(en.includes('Show all'), '平铺按钮也是英文');
  ok(!en.includes('平铺全部'), '英文界面不残留中文外壳文案');
}

{
  // 单面板也要成立：只跑了角色那一段的人照样能出这一页
  const p = makePane(DOC, { id: 'characters' });
  p.meta = PANES.find((x) => x.id === 'characters');
  const one = renderShell([p], { title: '渡口' });
  eq((one.match(/<section class="rp-pane/g) ?? []).length, 1, '一个面板也能出页');
  ok(one.includes('rp-on'), '唯一的面板默认就是显示的');
}

{
  // XSS：标题是用户给的，必须转义
  const p = makePane(DOC, { id: 'art' });
  p.meta = PANES.find((x) => x.id === 'art');
  const html = renderShell([p], { title: '<img src=x onerror=alert(1)>' });
  ok(!html.includes('<img src=x onerror'), '标题里的标签被转义');
  ok(html.includes('&lt;img'), '转义成实体');
}

{
  // 零外部依赖：不许有任何外链资源
  const p = makePane(DOC, { id: 'outline' });
  p.meta = PANES.find((x) => x.id === 'outline');
  const html = renderShell([p], { title: '渡口' });
  ok(!/<link\b/i.test(html), '没有外链样式表');
  ok(!/<script[^>]+\bsrc=/i.test(html), '没有外链脚本');
  ok(!/https?:\/\/(?!x\.com)/.test(html.replace(/https:\/\/json-schema\.org[^"']*/g, '')), '没有外部请求');
}

console.log(`✓ ${passed} 项自测全部通过`);
