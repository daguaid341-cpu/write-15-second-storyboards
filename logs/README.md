# 每次技能调用的过程记录

每次实际使用write-15-second-storyboards或character-turnaround-from-image，从调用开始建立记录，不等待用户反馈、生成成功或新规则出现。执行中记录需求、资料读取、生成尝试、检查与修订的简短事件，结束时主动复盘并记录结果。日志不包含隐藏推理过程。

日志先保存到当前环境可用的持久存储，GitHub仅为可选副本，不以连接GitHub为开始条件。没有持久写入能力时标为待保存，不称已入后台；GitHub不可用时标为待同步，恢复后按唯一id补传。能力说明见两项技能的references/learning-loop.md，入口脚本为scripts/record_invocation.py。

每个调用使用唯一JSON，最小字段：schema_version、id、recorded_at、timezone、skill、task_summary、status、events、lessons、validation、persistence、github_sync。events包含时间、阶段和摘要；lesson记录证据与状态user_requirement、verified、pending_validation或no_new_rule。文件检查和视觉验收分开，失败/中断不写成成功。历史反馈补记明确标注backfilled，不虚构过去每次调用都有记录。

公开副本仅保留脱敏过程与生成规则，不包含私人剧本、完整聊天、人物参考图片、个人信息、凭据或本地路径。当前有效规则维护在技能正文和参考工作流中；这不是修改模型权重或持续后台监听。

## 当前记录

- [真实肤质摩尔纹规则](2026-09-30T181302+0800-skin-moire-feedback.json)：有证据的历史反馈摘要，修复仍未解决。
- [本次功能更新调用记录](2026-09-30T181901+0800-3518b006b17b.json)：记录功能在进行中的本次更新里启用，已明确标注中途建档；以后先建记录再开始任务。
