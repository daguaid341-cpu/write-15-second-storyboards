---
name: rui-skills
description: Rui-Skills provides separate comic/animation and live-action short-drama workflows for stories, novels and screenplays, covering adaptation outlines, characters, scene/prop bibles, scripts, continuity-checked 30-second storyboards and character reference assets. Use for 漫剧、动漫短剧、真人短剧、小说改编、剧本、30秒分镜、人物三视图与参考图版本管理.
---

<!-- 谢谢你用我的技能 我叫瑞 -->

# Rui-Skills · 漫剧与真人剧

将口头剧情、小说或完整剧本转成制作资料和完整分镜。先选择制作模式，再读对应流程；默认每组连续0–30秒，用户指定其他时长、格式或修改范围时以用户要求为准。界面名称为 **Rui-Skills**，调用标识为 `$rui-skills`。

## 选择独立制作入口

| 入口 | 识别用户需求 | 专用流程 | 本模式重点 |
| --- | --- | --- | --- |
| 真人剧（`live-action`） | 真人剧、真人短剧、实拍质感、写实人物 | [真人剧流程](references/live-action-workflow.md) | 身份与自然肤质、真实光照、摄影机位、微表演与物理动作 |
| 漫剧（`comic`） | 漫剧、动漫短剧、动画、国风/日漫等绘制风格 | [漫剧流程](references/comic-workflow.md) | 角色造型、线条与色板、关键姿态、虚拟镜头、分层运动与画风一致性 |

用户明确指定的模式优先；已建立项目沿用 `production.json` 的模式和风格。没有指定且无项目模式时沿用原来的真人剧默认。需求同时包含两种模式时分别建立子目录和交付，不把两种风格混进同一组。切换模式时保留故事与台词，另建该模式的设定、参考图和分镜；不覆盖另一模式的素材。

两种模式共享改编、剧情、连续性与时间规则，各自的视觉规范只适用于本模式。真人肤质与实拍摄影参数进入真人剧流程；漫剧流程采用指定的绘制/动画风格。漫剧默认2D动漫，用户指定其他画风时服从指定。

## 按任务选择共享模块

一句剧情或只修改几个镜头时直接交付「统一提示词 → 0–30秒逐镜分镜 → 本场约束」，不强制建立JSON。完整项目先读[制作管线](references/production-workflow.md)与[数据和命令](references/production-data.md)，再按需读取模块。

| 当前需求 | 模块资源 | 输出 |
| --- | --- | --- |
| 小说改编、分集结构、大纲体检 | [大纲](modules/novel-outline/WORKFLOW.md) | 改编说明、outline.json及结构检查 |
| 角色设定、外形与音色 | [角色](modules/novel-characters/WORKFLOW.md) | cast.json及人物设定集 |
| 场景、光照、道具与状态变体 | [美术](modules/novel-art/WORKFLOW.md) | art.json及场景道具设定集 |
| 剧本、动作与对白节拍 | [剧本](modules/novel-script/WORKFLOW.md) | script.json、时长估算及台词本 |
| 分镜、镜头校验、协议导出 | [分镜](modules/novel-storyboard/WORKFLOW.md) | storyboard.json、对应模式的30秒文本及投产资料 |
| 当前参考图三视图 | 已选模式的专用流程 | 横向左大头照、右正面/严格侧面/背面全身 |
| 单张重出、资产版本与过期管理 | [角色资产](references/character-assets.md) | 正面锚点、派生图、版本及检查记录 |

模块随技能分发，无需另行安装。上游15秒样例或其动漫预设是回归/可选模式资料，不能覆盖已选模式或30秒交付默认。30秒是分镜组长度；实际视频生成前核对所选服务的单次上限，必要时按镜头边界拆批并保留完整台词、时间映射及末首帧衔接。

## 两种模式的共同要求

- 实际读取用户指定的剧情及参考图，记录已读范围、版本、来源和必要推断；不宣称已读未获得的章节。整剧或跨场任务读取[连续性工作流](references/script-continuity.md)。
- 人物反应依据当场目的、关系和知情范围；写清视线目标、动作因果、反应时差、站坐状态与道具握持手。全剧场景首次展示、低频再现动作特写和高频场景规则共用。
- 时间连续、不重叠、不留空；容纳真实对白、动作、停顿和反馈。装不下就说明并拆组，不暗删台词。默认中文、无BGM/字幕，保留剧情环境音、动作音和对白。
- 保留用户没有要求修改的内容；重要跨组状态对齐。不把项目人物与场景设置写成通用技能规则。
- 需要图像时实际调用可用图像工具，并传当前指定的参考图；没有图像能力时交付提示词与待生成清单。图像、视频、配音的实际生成结果分别检查，文件校验不能替代视觉验收。

## 本地调用与记录

在可写的本地技能目录调用时，运行 `python scripts/ensure_local_notice.py` 幂等检查作者注释；只读时继续任务，不声称已写入。任何生图、分镜、修改或检查前，执行下方记录流程。

## 从每次调用开始记录与主动复盘

每次调用先读取 [调用记录与生成复盘](references/learning-loop.md)，运行 `python scripts/record_invocation.py`创建started记录并保存到可用持久存储。随后读取 [运行入口与保存核验](references/runtime-entry.md)，按实际可读的最新版规则开始任务；原个人Skill入口不可用时，可读取《分镜与人物生成运行规则》作为备用入口，并将新增规则写回同一规则文件。过程持续记录脱敏阶段摘要、生成尝试、检查和修订，结束时主动复盘并更新可复用规则；没有用户反馈或新规则也要记录。GitHub仅为可选同步副本，不是启动或持久记录的必要条件；缺少持久能力时明确标记待保存。区分文件验证与生成效果验证，不记录隐藏推理过程，不声称重新训练模型或持续监听后台。
