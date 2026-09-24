# 单图到人物三视图：执行细则与模板

## 图像分析与优先级

优先级：当前指定图中人物的身份与可见事实 → 面部结构、年龄感 → 发型、服装、配饰 → 正侧背比例一致 → 排版与摄影质感。禁止引入历史人物。若用户指定多张同一人物图片，主图锁脸，其他图只辅助角度和衣饰。记录图中确定的特征、遮挡和画面外部分、必须推断的侧脸背部与鞋子。不把某一种脸、肤色、发型或服装写成所有输入的默认值。低清晰度图像保守描述，不凭空编出鼻唇细节。

## 固定摄影标准

- 横向资产图；左侧约 42% 宽为正面头肩大头照，右侧约 58% 依次为正面、严格 90° 侧面、真正背面三张全身像。右侧三人等高、从头到鞋完整、脚底同一水平线；同一人物、头身比例、衣服、配饰、发型。自然站姿、手臂放松，不扭胯、不回头。
- 中性浅灰无缝背景，中性白平衡、低饱和与克制对比。头照等效 100–135mm 正面平视人像透视。大型柔光在前左约 20–30°、略高眼线，弱填充保留眼窝、鼻侧、唇下与下颌浅影。全身视图保持相同机高、近似正交弱透视、光向和曝光。
- `soft satin-matte natural skin, very low skin specularity, soft diffuse facial rendering, restrained highlights, low facial micro-contrast, smooth tonal transition; sharp eyes with softly rendered skin`。清晰度优先级：眼睛 → 睫毛眉毛 → 鼻唇 → 皮肤。眼睑与唇线自然清楚；面颊额头柔和，仅有轻微真实纹理。避免油亮、水光、玻璃肌、夸张毛孔、过度磨皮、HDR 锐化和美妆广告轮廓光。肤质标准不能覆盖人物本身的面貌。

## 主提示词模板

根据实际观察把方括号替换为可信的具体描述；对用户输出时不能留占位符。参考图必须作为图像输入传给生图工具，纯文字无法精确锁定 Face ID。

```text
Use the current uploaded image of [目标人物] as the sole facial identity reference. Preserve this specific person's visible facial structure: [脸型/额头/眼距/眉眼关系/鼻型/唇形/中庭/下颌/年龄感/表情，只填能判断的特征]. Keep [发型与配饰] and the visible [服装]. For unseen anatomy or clothing, make conservative, stylistically consistent inferences: [必要补全]. Do not beautify into a different person or borrow another face.

Create one wide photorealistic character turnaround sheet. Left ~42%: a large straight-on head-and-shoulders portrait, eyes at camera height, equivalent 100–135mm portrait perspective. Right ~58%: three equally tall, fully visible figures, in order front, exact 90-degree side, and true back view. Align their feet on one baseline. Same person, hairstyle, clothing, accessories, body proportions, camera height and soft light in all views. Natural upright posture; arms relaxed; no twist, runway pose or turned back-view head.

Neutral light-gray seamless studio background. Large soft key front-left at roughly 25 degrees and slightly above eye level, weak fill, subtle natural facial shadows; neutral white balance, low saturation, restrained contrast and soft tonal roll-off. Soft satin-matte natural skin, very low specularity, diffuse facial rendering, restrained highlights and low skin micro-contrast. The eyes, eyelids, lashes, brows and lip contour are clear; cheeks, forehead and jaw retain soft natural transitions. Sharp eyes with softly rendered skin. Photorealistic casting portrait and practical character asset sheet, accurate anatomy, no lettering.
```

## 精简负面控制与检查

`different person, identity drift, altered facial proportions, generic beauty template, different outfit or hairstyle, oily/glass/dewy skin, strong specular highlights, beauty advertisement, ring light, oversharpened pores, waxy over-smoothed skin, 3/4 view instead of strict side, turned back view, cropped feet, mismatched heights, fashion pose, text, watermark`

平台有独立负面栏时单独放入，否则只把关键限制写进主提示词。参考权重和 Face ID 参数因平台而异，不能编造通用百分比。交付前核对脸、顺序、严格侧面、真正背面、脚、衣饰、肤质；若用户需要精确建模，可分别生成和核验各视角，单张拼版不可视为未观测面的精确测量。
