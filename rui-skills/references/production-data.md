# 结构化制作资料与命令

轻量口头剧情不必建立本目录。完整制作项目把 JSON 放在用户项目目录：`outline/outline.json`、`characters/cast.json`、`art/art.json`、`script/script.json`、`storyboard/storyboard.json`。每份 JSON 的字段契约见对应 `modules/novel-*/references/schema.md`；剧本 `flow` 的每拍是 `action` 或 `speaker` + `line` 二选一。分镜按集、段、镜头记录，`beats: [起,止]` 指向本场节拍（1起）。

项目根目录 `production.json` 保存模式：真人剧 `{"mode":"live-action"}`，漫剧 `{"mode":"comic","style":"2D国风，清晰线条、统一色板"}`。`style`可选且为非空字符串；`mode`仅支持这两个标识。无配置的旧项目按真人剧执行。两种版本分别建目录，各自放全套JSON、参考图和输出，保留原版。

从本技能目录执行，路径有空格使用引号：

```powershell
node scripts/production.mjs run novel-outline checkup "C:/Projects/My Drama/outline/outline.json"
node scripts/production.mjs run novel-characters seed "C:/Projects/My Drama/outline/outline.json"
node scripts/production.mjs check "C:/Projects/My Drama"
node scripts/production.mjs report "C:/Projects/My Drama" --out "C:/Projects/My Drama/reports"
node scripts/production.mjs export-text "C:/Projects/My Drama" --out "C:/Projects/My Drama/storyboard/分镜.md"
node scripts/production.mjs export-text "C:/Projects/My Drama" --mode comic --out "C:/Projects/My Drama/storyboard/漫剧分镜.md"
```

`run`原样调用所选模块，模块的`--help`解释具体参数；不会启动模型或自动生成正文。`check`验证已存在的阶段，报告缺失阶段和无法检查的跨阶段关系；角色逐字引文需要另向角色模块提供原小说。`report`先检查，再合成实际阶段的 HTML。没有图片时报告保留未生成状态。

`check`、`report`、`export-text`支持`--mode live-action|comic`，明确参数优先于项目配置；不写回配置。临时切换模式不会沿用另一模式保存的`style`，也不会转换已有资产、镜头内容或`storyboard.unifiedPrompt`。正式转换时先按目标流程完成新的模式资料。报告显示已选模式；文本导出按模式给出默认统一提示词和约束。

主适配层将段上限按30秒验证，默认还要求每段镜头时间之和精确为30秒。新建分镜应明确写 `params.maxSegmentSeconds: 30`；不要把上游15秒例子只改标题后交付。`--variable-length`用于用户明确允许的可变时长，仍拒绝大于30秒。`minCutSeconds`、`maxCutSeconds`可按实际长镜头需要设置；不要仅为了过门修改节奏。若视频服务的单次上限较短，投产前另分批并保留整组时间映射。

`export-text`需要剧本和分镜，先验证再输出中文「统一提示词、逐镜时间、动作、机位、构图、视线和逐字台词」。不会写回或自动填补源JSON。剧本人物没有名字映射时保留真实ID，不编造人名。可选顶层 `storyboard.unifiedPrompt`保存用户指定的全局画幅、摄影与风格；没有自定义时使用所选模式的9:16默认。漫剧的`cut.lens`可描述虚拟透视，`cut.animation`与`cut.visualTreatment`为可选补充；导出保留这些动画/画面说明。台词按节拍认领保留，不翻译、不删改。

真人剧默认统一提示词包含从[ANERNEQ光影参考](anerneq-lighting.md)提炼的已有光源、受光面、阴影与曝光连续性原则，不自动增加雪地、火焰或夜景。具体模板与光源地图由agent按场景编写，保存到`storyboard.unifiedPrompt`、剧本场景`lighting`及逐镜`lighting`。自定义统一提示词优先，不被默认文本追加或重写；命令不会仅凭片名反推场景或验证生成效果。漫剧导出继续使用其独立画风规则。

默认无BGM、无字幕。源分镜有配乐时导出明确报错，需根据用户实际要求在源资料中修改或显式使用`--allow-music`，不静默丢弃原配乐。输出后的空间和表演连续性还需按主技能复核，结构检查不能证明画面实际正确。
