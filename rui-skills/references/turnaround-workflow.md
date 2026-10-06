# 单图到人物三视图：执行细则与模板

## 图像分析与优先级

优先级：当前指定图中人物的身份与可见事实 → 面部结构、年龄感 → 发型、服装、配饰 → 正侧背比例一致 → 排版与摄影质感。禁止引入历史人物。若用户指定多张同一人物图片，主图锁脸，其他图只辅助角度和衣饰。记录图中确定的特征、遮挡和画面外部分、必须推断的侧脸背部与鞋子。不把某一种脸、肤色、发型或服装写成所有输入的默认值。低清晰度图像保守描述，不凭空编出鼻唇细节。

## 固定摄影标准

- 横向资产图；左侧约 42% 宽为正面头肩大头照，右侧约 58% 依次为正面、严格 90° 侧面、真正背面三张全身像。右侧三人等高、从头到鞋完整、脚底同一水平线；同一人物、头身比例、衣服、配饰、发型。自然站姿、手臂放松，不扭胯、不回头。
- 中性浅灰无缝背景，中性白平衡、低饱和与克制对比。头照等效 100–135mm 正面平视人像透视。大型柔光在前左约 20–30°、略高眼线，弱填充保留眼窝、鼻侧、唇下与下颌浅影。全身视图保持相同机高、近似正交弱透视、光向和曝光。
- `photographic human skin, discreet irregular dot-like pores, subtle low-contrast organic skin texture, natural skin-tone variation, satin-matte finish, restrained soft highlights, clear eyes and naturally detailed skin`。清晰度优先级：眼睛 → 睫毛眉毛 → 鼻唇 → 皮肤。眼睑与唇线自然清楚；面颊额头柔和，同时保留符合画面尺度的真实纹理。避免油亮、水光、玻璃肌、夸张毛孔、过度磨皮、HDR 锐化和美妆广告轮廓光。肤质标准不能覆盖人物本身的面貌。

## 真实肤质：默认生图规则

生成或编辑真人角色图时，默认把本节写入主提示词，适用于大头照、正侧背全身、角色资产与包含人物的剧情图；仅输出文字时也提供相同的正向与负面控制。以当前参考图的身份、年龄感、肤色、妆容和已见特征为依据，保留已有痣、雀斑、细纹等可辨识细节；不为追求真实擅自增加斑点、痘疤、皱纹、衰老或改变脸型。

- **保留真实结构：**近景面部保留细小且分布不均的毛孔、轻微皮肤纹理、自然细绒毛，以及符合年龄与表情的眼周和唇部细节。鼻翼、面颊、额头的纹理应有区域差异，嘴唇保留细微唇纹；不要把同一噪点贴满全脸，或把毛孔夸大成粗糙颗粒。
- **保留自然肤色与光照：**保持参考人物原有肤色和局部微小色调变化，允许符合光照的柔和散射、弱反射与面部明暗层次。肤质以干爽自然、柔和哑缎为基准，鼻尖与颧骨可有少量受控柔和高光，不能油亮，也不能把面部压成没有层次的绝对哑光平面。不要将肤色变化写成眼睛或虹膜变色。
- **柔光不抹除纹理：**柔化光线和高光过渡，保留真实表面细节。眼睛、眉毛、睫毛与唇线清楚；皮肤不做美容滤镜、AI磨皮、蜡像感、塑料感、橡胶感、瓷娃娃感或CG渲染感。不要用锐化光晕、强HDR局部对比或粗颗粒伪造肤质。
- **服从画面尺度：**大头照与面部近景可读到细微纹理；全身远景只维持自然肤色和明暗，不强行显示不合尺度的巨大毛孔。三视图各角度维持一致年龄、肤色、妆容与细节密度，面部透视和光照变化不能让人物变脸。
- **查看实际结果：**直接生图后若可检查结果，实际查看面部与大头区域；发现磨皮、油光、重复纹理、夸大毛孔或身份漂移时，指出具体问题并定向修正。只有已查看的结果才能声称已核验；提示词规则不能保证生成模型每次都完全符合真人肤质。

**默认正向肤质提示词：**

`photographic human facial skin, fine naturally irregular pores appropriate to image scale, subtle low-contrast organic skin texture, natural local skin-tone variation consistent with the reference, age-appropriate eyelid detail and fine lip lines, dry natural satin-matte finish with restrained soft highlights, realistic soft-light scattering and tonal transitions, clear eyes and naturally detailed skin, preserved facial identity and age, no beauty retouching`

**默认负面肤质控制：**

`AI beauty smoothing, airbrushed skin, waxy skin, plastic skin, rubber skin, porcelain doll face, CGI face, oily or wet-looking skin, glass skin, featureless flat matte skin, oversized or oversharpened pores, uniform repeated pore pattern, moire-like skin pattern, repetitive wavy lines, crosshatched skin, fingerprint-like ridges, embossed leather texture, synthetic pore map, gritty noise painted onto the face, sharpening halos, excessive HDR micro-contrast, invented blemishes, altered age or skin tone, identity drift`


## 防止摩尔纹式伪肤质

将“真实”落实为符合人物年龄、面部区域、拍摄距离和光线的自然表面，不能简单理解成纹理越多越真实。额头默认自然平滑，毛孔是细小、低对比、不规则的点状或浅凹结构；面颊、鼻翼与额头的纹理密度有差异，正常观看距离下不应出现密集线条覆盖。真实存在的年龄纹、表情纹、眼周细节与唇纹按参考和剧情保留，不将所有自然细纹一律消除。

明确排除额头、面颊、下巴和颈部上重复波纹、交叉网纹、摩尔纹式干涉纹、指纹状沟槽、织物纹、皮革压纹及人为叠加的整脸毛孔贴图。不要以锐化、颗粒、密集绒毛或雕刻感替代真人皮肤。把控真实光照、细微肤色与体积层次优先于堆叠毛孔词；只在实际可见尺度上保留少量自然细节，不能把减少伪纹理等同于美容磨皮。

修正图时区分“保留身份结构”与“复制有缺陷的肤质”。提示只锁定脸型五官、年龄、发型、衣装和构图，不要求逐像素保留异常皮肤；必要时重建受影响表面。若定向修改后仍保留纹路，记录失败并改变策略，例如以同一身份参考重新生成该区域，而非继续堆叠相同正负词。未经实际检查并通过，不承诺已完全修复或把此方法标为成功。

默认正向补充：`naturally smooth forehead appropriate to age, discreet irregular dot-like pores only where visible at this scale, low-contrast organic skin detail, region-specific texture, realistic gentle shading and local color variation; preserve genuine expression lines and lip detail`。
默认负面补充：`moire-like skin pattern, repetitive wavy lines, crosshatched skin, fingerprint-like ridges, woven mesh skin, embossed leather texture, all-over wrinkle overlay, synthetic pore map`。

## 主提示词模板

根据实际观察把方括号替换为可信的具体描述；对用户输出时不能留占位符。参考图必须作为图像输入传给生图工具，纯文字无法精确锁定 Face ID。

```text
Use the current uploaded image of [目标人物] as the sole facial identity reference. Preserve this specific person's visible facial structure: [脸型/额头/眼距/眉眼关系/鼻型/唇形/中庭/下颌/年龄感/表情，只填能判断的特征]. Keep [发型与配饰] and the visible [服装]. For unseen anatomy or clothing, make conservative, stylistically consistent inferences: [必要补全]. Do not beautify into a different person or borrow another face.

Create one wide photorealistic character turnaround sheet. Left ~42%: a large straight-on head-and-shoulders portrait, eyes at camera height, equivalent 100–135mm portrait perspective. Right ~58%: three equally tall, fully visible figures, in order front, exact 90-degree side, and true back view. Align their feet on one baseline. Same person, hairstyle, clothing, accessories, body proportions, camera height and soft light in all views. Natural upright posture; arms relaxed; no twist, runway pose or turned back-view head.

Neutral light-gray seamless studio background. Large soft key front-left at roughly 25 degrees and slightly above eye level, weak fill, subtle natural facial shadows; neutral white balance, low saturation, restrained contrast and soft tonal roll-off. Photographic human facial skin with fine naturally irregular pores appropriate to image scale, subtle authentic skin texture and fine facial vellus hair, natural local skin-tone variation consistent with the reference, age-appropriate eyelid detail and fine lip lines. Dry natural satin-matte finish with restrained soft highlights and realistic soft-light scattering. The eyes, eyelids, lashes, brows and lip contour are clear; cheeks, forehead and jaw retain natural surface detail and soft tonal transitions. Preserve facial identity, age, original skin tone and visible defining skin features; no beauty retouching. Photorealistic casting portrait and practical character asset sheet, accurate anatomy, no lettering.
```

## 精简负面控制与检查

`different person, identity drift, altered facial proportions, generic beauty template, different outfit or hairstyle, oily/glass/dewy skin, strong specular highlights, beauty advertisement, ring light, oversharpened pores, waxy over-smoothed skin, plastic/porcelain/CGI face, flat featureless matte skin, repeated pore patterns, moire-like skin patterns, crosshatched mesh skin, repetitive wavy ridges, woven or leather texture, gritty noise painted onto skin, invented blemishes or wrinkles, altered age or skin tone, 3/4 view instead of strict side, turned back view, cropped feet, mismatched heights, fashion pose, text, watermark`

平台有独立负面栏时单独放入，否则只把关键限制写进主提示词。参考权重和 Face ID 参数因平台而异，不能编造通用百分比。交付前核对脸、顺序、严格侧面、真正背面、脚、衣饰、肤质；近景检查自然毛孔、唇纹和区域纹理差异，禁止油光、磨皮、重复毛孔、CG脸与伪造粗颗粒；若用户需要精确建模，可分别生成和核验各视角，单张拼版不可视为未观测面的精确测量。
