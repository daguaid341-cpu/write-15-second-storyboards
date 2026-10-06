# 真人角色参考图与版本管理

用户只要上传人物图的原版三视图拼版时，继续执行 [三视图工作流](turnaround-workflow.md)，不强制分图或建立资产。用户要求独立参考图、重出单张、角色资产库或长期追踪时使用此流程。用户明确要求原创人物而没有参考图时，依据已给描述建立虚构角色，不声称参考了照片。

本独立技能沿用真人模式。漫剧角色资产使用 Rui-Skills 主入口的漫剧流程，分别建立造型与资产，不将本文件的真人肤质模板套入漫剧。

## 身份、风格与图像工具

实际查看当前指定参考图，锁定可见身份、年龄、衣饰；不能将文字生成的新脸取代当前参考脸。原图看不到的部分标明推断。默认真人写实、自然肤质；使用 [三视图工作流](turnaround-workflow.md) 的肤质正负向控制。单张浅灰拼版保持原版式；独立参考图可按下游要求使用白底，不能把两种交付混为一份。

优先使用本会话可用的图像工具，按工具实际支持的路径传入原图或锚点，不要求配置 API、不自动启动另一层 Codex。没有图像工具时交付提示词与待生成清单；不创建假图片。用户明确选择外部服务后才参考模块适配器说明。

## 先建立资产，再生成与登记

以下命令从 skill 目录执行，所有项目文件保存在用户项目目录。模块是随包资源，不需要另行安装。

```powershell
node modules/character-refs/scripts/character-refs.mjs intake-template
node modules/character-refs/scripts/character-refs.mjs intake-check "项目/角色-intake.json"
node modules/character-refs/scripts/character-refs.mjs new "项目/角色-intake.json" --out "项目/角色资产" --look 写实
```

按用户的一次描述或实际图像观察填写模板，把用户事实、观察、推断和默认区分开；不编造精确年龄或看不到的细节。已有明确授权与设定时继续执行，不重复索要同一确认。原模块 `WORKFLOW.md` 是字段和高级适配参考；其动漫默认和外部模型配置步骤不能覆盖本流程。

1. **正面全身锚点。**运行 `prepare` 保存生成前的描述、画风和参考文件指纹。上传图任务必须加 `--reference`，再将返回的 `inputs` 路径实际传给图像工具；图像请求同时采用准备记录内的正负提示词及本技能肤质规则。原创文字角色可以没有外部参考。
2. **登记真实输出。**生成工具返回实际PNG后运行 `import-image`。它保留像素、写入标识、创建新版本、记录来源指纹并检查尺寸/比例/背景；默认视觉状态为 `not_run`。原文件不被覆盖，失败检查明确记录。
3. **查看锚点。**实际检查身份、肤质、衣饰、正面角度和头脚取景；通过后运行 `review --status passed --note`，不把脚本检查当视觉通过。失败则记 `failed` 并定向重出。用户要求先审锚点时等待其反馈；已授权自动继续时 agent 可在实际查看后继续。
4. **独立派生。**为 `face-front`、`side-full`、`back-full` 分别准备记录。每张都参考当前正面锚点，不从侧面生背面；需要面部/发饰特写时可额外使用已验证大头照。原人物图仍有必要时用 `--reference`补充。逐张生成、登记与检查。

```powershell
node modules/character-refs/scripts/native-assets.mjs prepare "项目/角色资产/角色/asset.json" front-full --reference "项目/原图.png" --out "项目/front-ticket-v1.json"
# 读取准备记录，将 prompt 和 inputs 交给当前图像工具；得到真实PNG后：
node modules/character-refs/scripts/native-assets.mjs import-image "项目/角色资产/角色/asset.json" front-full "项目/已生成正面.png" --ticket "项目/front-ticket-v1.json" --model native-tool
# 仅在实际查看且合格后：
node modules/character-refs/scripts/native-assets.mjs review "项目/角色资产/角色/asset.json" front-full --status passed --note "已查看身份、肤质、正面角度和完整头脚"
node modules/character-refs/scripts/native-assets.mjs prepare "项目/角色资产/角色/asset.json" side-full --out "项目/side-ticket-v1.json"
```

生成期间描述、画风、原图或锚点变化会使旧准备记录失效；重新准备并生成，不强行登记旧图。新准备记录使用新文件名。每次重出创建新版本，旧版本保留；重出锚点后旧派生图自动过期。`review`的说明写实际观察，不照抄示例冒充检查。

## 检查与报告

```powershell
node modules/character-refs/scripts/character-refs.mjs check "项目/角色资产/角色/asset.json"
node modules/character-refs/scripts/character-refs.mjs render "项目/角色资产/角色/asset.json" --out "项目/角色资产/报告.html"
```

原模块 `check`/报告主要显示文件检查与过期状态；视觉检查以各版本的 `visualReview` 字段为准。没有图时只是待生成，代码通过不能证明脸、姿态或肤质正确。输出资产名、当前版本、通过与失败项、待生成/过期项，清楚区分文件检查和视觉验收。
