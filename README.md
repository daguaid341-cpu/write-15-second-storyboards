# Rui-Skills

提供分别使用的 **真人剧** 与 **漫剧** 视频流程，把一句剧情、小说或完整剧本转成保持人物、场景与道具连续性的 **30秒分镜**。真人剧保留从 Higgsfield《ANERNEQ》（北极之息）画面分析提炼的光影参考。人物设定图与场景资产设计作为独立任务，视频流程只引用已有资产，不混用设计模板。

界面名称：**Rui-Skills**。调用标识：`$rui-skills`。主技能目录：[rui-skills/](rui-skills/SKILL.md)。GitHub 仓库地址沿用原地址。

## 先区分视频与人物设定图

- **视频分镜：**调用 `$rui-skills`，再选择真人剧或漫剧。沿用指定角色与场景，交付前内部检查空间、机位、画面来源和连续性，不自行补写衣服颜色款式或重设房间。
- **人物设定图：**调用独立技能 `$character-turnaround-from-image`。人物设计、三视图排版与图外补全仅在该任务执行。
- **文字人物、场景或道具设计：**明确委托对应资产产物后才进入[独立资产设计流程](rui-skills/references/asset-design-workflow.md)。它不是视频提示词的默认前置步骤。

同时要求视频和设定图时分开交付，仅通过指定资产及已确定状态交接。

## 视频制作模式

| 独立入口 | 适合的任务 | 专用规范 |
| --- | --- | --- |
| **真人剧 / live-action** | 真人短剧、写实人物、实拍质感 | 自然肤质、ANERNEQ场景光影参考、真实空间、摄影机位与克制微表演；[真人剧流程](rui-skills/references/live-action-workflow.md) |
| **漫剧 / comic** | 漫剧、2D动漫、国风/日漫或指定动画风格 | 角色造型、头身比、线条、色板、关键姿态、虚拟镜头与分层运动；[漫剧流程](rui-skills/references/comic-workflow.md) |

在请求中直接指定「真人剧」或「漫剧」。已建立项目沿用项目模式；未指定且没有项目配置时默认真人剧。漫剧默认2D动漫，用户指定其他画风时按指定执行。两种模式均默认30秒、中文、无BGM/字幕。需要同一故事的两个版本时分别建立项目子目录、设定、素材与输出。

## 真人剧示例

```text
调用 $rui-skills，使用真人剧模式。
女生在餐桌上吃饭，听见门响后停下来，慢慢抬头看门口。
表面平静，但她已经开始紧张。写成一组30秒分镜，表演克制。
```

直接交付「统一提示词 → 0–30 秒逐镜分镜 → 本场约束」。无需先学习影视术语或手填 JSON；用户指定其他时长、格式或修改范围时按指定执行。只有一句剧情也能开始，不强制提供整部剧本。

### 北极之息光影参考

```text
调用 $rui-skills，使用真人剧模式，采用ANERNEQ（北极之息）光影参考。
保留餐厅、人物和原剧情，用现有窗光与台灯建立明暗层次。
写成30秒分镜，写清人物转头后的受光变化和正反打光源连续性。
```

[光影参考与原创模板](rui-skills/references/anerneq-lighting.md)覆盖夜外局部暖光、洞穴/暗室、低位日光、阴天，以及现代室内的方法迁移。默认吸收有来源的局部照明、阴影、材质与跨镜连续性，昼夜、天气及用户风格优先。

依据[官方公开版原片](https://higgsfield.ai/@higgsfield.studio/projects/anerneq)约20分02秒全时间线的逐秒画面分析和四段密集帧检查；原片同时包含夜景和日景。模板是视觉反推的原创方案，不是官方原始提示词、LUT或摄影参数，实际生成效果需另行验收。影片画面与播放流不随技能包分发。

## 漫剧示例

```text
调用 $rui-skills，使用漫剧模式，画风为2D国风。
女生吃饭时听到门响，停下筷子，抬头看门口。
写成30秒分镜，固定角色造型和色板，写清关键姿态、反应停顿和各层运动。
```

漫剧交付包含画风、造型、线条、上色、关键姿态和虚拟镜头；真人剧交付包含身份、肤质、光照、摄影与表演。切换模式时同步整理该模式的设定与提示词。

30 秒是**分镜交付组长度**，不保证某个视频服务支持一次生成 30 秒。实际投产时核对所选服务的上限，必要时在镜头边界拆批，保留完整时间映射、台词及末首帧连续性。

## 制作能力

| 功能 | 产物与作用 |
| --- | --- |
| 大纲与已有大纲体检 | 改编说明、人物表、戏剧节点、分集梗概、资产清单与结构检查 |
| 人物设定 | 人物画像、外形及音色提示词，沿用大纲角色 ID |
| 美术设定 | 场景入口、光照、辨识锚点、叙事道具与状态变体 |
| 剧本 | 场次、动作和台词节拍、时长估算、按角色汇总的台词本 |
| 真人剧30秒分镜 | 景别、实拍机位、焦距、站位、微表演、动作、光照、声音与切点 |
| 真人剧光影参考 | ANERNEQ场景观察、原创反推模板、受光与遮挡、昼夜曝光及跨镜光源检查 |
| 漫剧30秒分镜 | 景别、虚拟视角、关键姿态、表情、层运动、画面风格、声音与切点 |
| 校验与报告 | JSON 字段、引用、节拍覆盖、对白容量与时长检查，Markdown/HTML 报告 |
| 原有人物三视图 | 当前参考图锁定人物；横向左大头照、右正面／严格90°侧面／背面全身 |
| 可选角色参考图管理 | 正面全身锚点、独立派生视图、单张重出、版本与过期追踪 |

完整制作模式通过随包附带的 shuohao-skills 模块实现，固定来源版本，不需要另行安装这组技能。只读取本次需要的环节。五个 `novel-*` 模块交付结构化内容和提示词；图像必须由实际可用的图像工具生成，视频生成和剪辑另行执行。

## 原有规则继续生效

- **全剧理解与连续性：**记录实际已读场次、剧本版本、人物知情范围、服装、姿态、道具握持手、入口、光源和跨组起止状态；不声称读过缺失章节。
- **场景展示：**每次分镜先核对全剧出场状态，首次出现默认安排大全景与移动氛围交代（可合镜）；已出现的低频场景优先动作特写；高频复用通常直接进入人物戏。交付前核对依据与对应镜号，用户本轮指定的镜头范围和拍法优先；不固定每集开场顺序。
- **表演：**从剧情与潜台词推导少量可见微动作，视线有目标、反应有时差，避免全员同步反应、瞬移、无因接触和擅改站坐状态。
- **声音与画面：**两种模式默认中文、无音乐/BGM/字幕，保留剧情要求的环境音、动作音与对白；不为凑满时长暗删台词。
- **真人身份与肤质：**保留当前指定人物的脸、年龄、肤色与衣饰；真实纹理服从画面尺度，排除磨皮、塑料感、摩尔纹式波纹与重复毛孔。
- **漫剧造型与画风：**保持五官造型、头身比、发束、线条、色板、服饰纹样和上色一致。没有看过实际图像不能声称视觉验收通过。
- **原拼版：**保持中性浅灰背景与原版式；独立白底参考图属于可选投产资产，不覆盖原图。

详细规则见[主技能](rui-skills/SKILL.md)、[连续性工作流](rui-skills/references/script-continuity.md)和[三视图工作流](rui-skills/references/turnaround-workflow.md)。

## 完整项目与模块命令

```text
调用 $rui-skills，将这份小说改编成漫剧，采用2D国风。
先整理改编大纲、角色、场景与道具，再完成剧本和30秒分镜。
保留人物和台词来源，输出可检查的结构化资料与制作报告。
```

```text
project/
├── production.json
├── outline/outline.json
├── characters/cast.json
├── art/art.json
├── script/script.json
└── storyboard/storyboard.json
```

下列命令从仓库根目录执行，需要 Node.js ≥18。路径含空格时使用引号。正文生成由 agent 完成；脚本负责确定性校验、整理与导出。

```powershell
node rui-skills/scripts/production.mjs check "C:/Projects/My Drama" --mode comic
node rui-skills/scripts/production.mjs report "C:/Projects/My Drama" --out "C:/Projects/My Drama/reports"
node rui-skills/scripts/production.mjs export-text "C:/Projects/My Drama" --out "C:/Projects/My Drama/storyboard/分镜.md"
node rui-skills/scripts/production.mjs export-text "C:/Projects/My Drama" --mode live-action --out "C:/Projects/My Drama/storyboard/真人分镜.md"
node rui-skills/scripts/production.mjs run novel-outline checkup "C:/Projects/My Drama/outline/outline.json"
```

默认文本导出要求每段精确 30 秒，失败时指出段号；不会自动填空、倍速或删对白。只有明确需要可变时长时使用 `--variable-length`。制作流程、字段和参数见[制作工作流](rui-skills/references/production-workflow.md)与[数据和命令](rui-skills/references/production-data.md)。

项目 `production.json` 保存模式与可选风格，例如 `{"mode":"comic","style":"2D国风，清晰线稿、统一色板"}`；真人剧使用 `{"mode":"live-action"}`。`check`、`report` 和 `export-text` 都读取该配置，`--mode`可明确选择本次模式，不改写源文件。选择其他模式不会自动转换已有剧本、绘制资产或自定义统一提示词，需在对应模式项目中先完成这些资料。报告明确显示当前制作模式。

## 人物资产

```text
调用 $character-turnaround-from-image，用我本轮上传的人物图生成原版三视图拼版。
保留脸和衣服，左大头照、右正面/严格侧面/背面，浅灰背景与自然肤质。
```

```text
调用 $character-turnaround-from-image，为这个角色建立可持续修改的独立参考图资产。
使用写实风格，先建立正面全身锚点，再生成大头照、侧面和背面。
保留每张图的版本；锚点变化后标记旧派生图过期。
```

人物设定图使用独立技能 [`character-turnaround-from-image/`](character-turnaround-from-image/SKILL.md)，详见其[角色资产流程](character-turnaround-from-image/references/character-assets.md)。视频提示词不调用此流程。优先使用本会话可用的图像工具；只有用户选择外部服务时才配置对应适配器。无图像能力时交付提示词与待生成清单。

## 安装与更新

在支持本地 skill 的环境导入完整 `rui-skills/` 目录，保留内部 `modules/`、`scripts/`、`references/`、`agents/` 和 `assets/`。不要只复制 `SKILL.md` 或 README。独立人物技能按需导入完整 `character-turnaround-from-image/` 目录。

旧安装不会因为仓库更新自动迁移：使用新目录更新后，检查技能列表显示 **Rui-Skills**，正文包含 **真人剧 / 漫剧** 两个入口、两种模式均默认 **30秒**，并附带真人剧`references/anerneq-lighting.md`，再停用旧入口，避免重复触发。仓库更新与个人技能安装是两个状态，不能互相替代。

原有过程记录、主动复盘与作者注释继续保留：`<!-- 谢谢你用我的技能 我叫瑞 -->`。调用脚本使用 Python ≥3.9；没有 Python 时按[记录流程](rui-skills/references/learning-loop.md)使用文件工具写同结构日志，不阻塞创作。Windows 若缺少 IANA 时区数据，记录脚本使用明确的上海 UTC+08:00 偏移。

项目剧本、用户参考图、生成素材、密钥与私有配置保存在用户项目目录；公开仓库只保存脱敏过程摘要。备用规则见 [docs/runtime-rules.md](docs/runtime-rules.md)，历史日志保留原技能名称和时间，不改写过去记录。

## 验证与来源

```powershell
node scripts/selftest.mjs
```

测试覆盖模块确定性逻辑、报告、两种模式的30秒导出、项目模式配置、角色资产登记及技能打包；不会调用真实模型。图像和视频效果仍需实际生成后检查。

上游：[eternityspring/shuohao-skills](https://github.com/eternityspring/shuohao-skills)，固定提交 `ef4ac0c313c7eeb1f918db5f0f0eb319745900bc`。导入模块保留 Apache-2.0 [许可证](rui-skills/modules/LICENSE)、[署名](rui-skills/modules/NOTICE)与[修改记录](rui-skills/modules/UPSTREAM.md)。这些许可文件适用于导入部分，不将原仓库内容自动重新授权。

30秒虚构示例见 [examples/dinner-scene.md](examples/dinner-scene.md)。上游回归样例保留其原始时长，不代表 Rui-Skills 的默认输出。
