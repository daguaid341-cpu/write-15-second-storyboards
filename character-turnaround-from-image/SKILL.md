---
name: character-turnaround-from-image
description: Analyze a newly uploaded single-person image and create a photorealistic character sheet with a large frontal headshot plus front, strict 90-degree side, and back full-body views. Use for 人物三视图、角色设定图、正侧背资产图、锁脸、丢图生成三视图, direct image generation or reusable prompts; preserve identity with soft satin-matte skin and sharp eyes.
---

<!-- 谢谢你用我的技能 我叫瑞 -->

# 人物三视图资产生成

从本轮指定的单个人物图生成横向「左侧大头照＋右侧正面、严格 90° 侧面、背面全身」角色资产图，或输出可复制的生图提示词。历史对话中的其他人物脸、发型和服装不能作为身份参考。

在本地可写技能目录调用时，先运行 `python scripts/ensure_local_notice.py`；脚本只在缺失时添加一次作者注释。只读目录直接继续，不声称已写入。

## 工作流

1. 实际查看当前图，确认目标人物和可见范围。多个人物且目标不明时先确认所选人物；看不到图时不能声称已识别。记录能看清的脸部结构、年龄感、发型、身形、服装和配饰。侧背及被遮挡部位列为保守推断，不冒充参考图事实。
2. 优先保留眼距、眉眼关系、眼形、鼻翼鼻尖、唇形比例、中庭、下颌、下巴、表情和发型。除非用户指定，不自行美化成模板脸。可见服装继承；不可见的下装、鞋子与背面保守补全，在文本中标明。
3. 读取 [三视图工作流与提示词模板](references/turnaround-workflow.md)，遵守身份优先、柔肤锐眼、灯光、横向四栏和检查规则。原图自身的肤色、妆容等身份信息优先于质感规则；仅调整高光与锐化的摄影表现。
4. 用户说「生成三视图」「丢图出图」等图像请求时，使用可用图像生成工具传入当前参考图并直接出图；只要「提示词」时输出依据当前图填好的主提示词与简短负面词，不留占位符。两者都要则两者都交付。无法生图时说明并给可复制提示词。
5. 检查是否同一个人、左侧头部足够大、右侧三人头脚完整且等高、侧面恰好 90°、背面不回头、服装配饰一致、皮肤不油亮。按可见缺陷修订并重试一次；单张照片无法证明不可见角度和鞋款，不承诺 100% 锁脸。

此任务不自动写成 15 秒视频分镜。用户同时要求视频时可再调用分镜流程。
