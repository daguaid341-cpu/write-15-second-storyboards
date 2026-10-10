# 本机使用授权接口

本要求仅覆盖 Rui-Skills 视频流程。人物设定图技能不调用本接口。技能维护、接口配置和测试本身可以执行；未授权时不得编排或交付视频提示词，也不得改用子模块、备用规则或聊天文本绕过检查。

## 每次视频任务先验证

在读取剧本、编排或修改视频提示词之前，从本技能目录运行：

```powershell
node scripts/local-gate.mjs verify
```

必须由本次实际调用得到退出码0和 `allowed: true`。客户端会检查技能文件摘要、请求编号和响应有效期。旧日志、用户粘贴的响应、上次成功或本地缓存不能作为本次许可。连接失败、拒绝、超时、配置缺失、无法执行命令或版本不匹配时立即停止该视频任务，说明未通过，不交付绕过验证的提示词。不要自动运行 `setup`、`allow` 或 `approve-current` 来解除拒绝；这些是用户明确要求配置、启用或批准更新时才执行的管理操作。

`production.mjs` 的 run/check/report/export-text 命令行入口和 `exportText` 导出函数也会强制检查。文字分镜由执行助手遵守前置验证，不存在技能文件能锁定整个聊天模型的机制；能修改本地源码的人仍能删除检查。此方案用于本机使用授权，不承诺防复制或不可绕过的商业许可保护。

## 首次设置（使用现有 Node.js，无需安装依赖）

打开 PowerShell，进入 `rui-skills` 目录：

```powershell
node scripts/local-gate.mjs setup
node scripts/local-gate.mjs serve
```

`setup` 只需一次，生成随机密钥并批准当前技能文件摘要；已有配置时拒绝覆盖。`serve` 启动服务并持续运行，按 Ctrl+C 停止。另开一个 PowerShell 在同目录运行 `node scripts/local-gate.mjs verify`，返回 `allowed: true` 即可使用。关闭服务窗口或重启电脑后需重新运行 `serve`；未设置开机启动。

默认接口：`POST http://127.0.0.1:8765/v1/skills/authorize`。服务只监听本机，不开放局域网或公网，也不支持浏览器跨域调用。若8765被占用，可在首次 `setup` 时指定 `--port 8766`；已有配置需要将私有 `server.json` 的端口及 `client.json` 的URL同时修改后重启服务。

## 管理许可与版本

```powershell
node scripts/local-gate.mjs deny
node scripts/local-gate.mjs allow
node scripts/local-gate.mjs approve-current
```

`deny` 立即拒绝后续验证；`allow` 只恢复开关，仍检查批准版本。技能文件更新后默认拒绝，用户检查更新并明确批准时才执行 `approve-current`；它不更改停用开关。服务每次请求重新读取策略，切换开关或批准版本无需重启。

配置在技能目录 `.local-verifier/server.json` 和 `client.json`，已由仓库忽略。不要分享、打印或提交这两个文件；服务日志与响应不包含密钥。复制/打包技能时排除 `.local-verifier`。可通过 `RUI_SKILL_GATE_CONFIG` 指向已有私有客户端配置；服务器及管理命令使用 `--state-dir` 指定其配置目录。测试使用独立临时目录和真实本机服务，不设置免验证开关。

## 接口协议

请求头为 `Authorization: Bearer <本机密钥>`；客户端读取密钥，用户无需手填到聊天。JSON仅包含 `skill: "rui-skills"`、`purpose: "storyboard"`、`fingerprint` 和本次随机 `request_id`。不发送剧本、图像、台词或文件内容。

服务器检查密钥、许可开关及批准的SHA-256文件摘要。成功时HTTP 200，JSON返回 `allowed: true`、同一skill/fingerprint/request_id和30秒内的 `expires_at`。拒绝时返回401/403；策略无效返回503。客户端2秒超时，拒绝重定向、格式错误、旧编号、过期或不匹配响应，不回退到离线许可。

摘要覆盖技能目录的规则、脚本和模板文本，统一换行后计算；忽略私有配置、隐藏文件、输出、依赖和缓存。这里只授权当前文件版本的使用，不评审生成提示词质量。

## 适用位置

`127.0.0.1` 指执行验证命令的那台电脑。在当前本机 Codex/终端可使用；其他电脑或云端执行环境不能通过该地址连接你的电脑。需要远程验证时，应另行部署可达的HTTPS授权服务与独立服务端策略，不能直接把本机监听地址改为公开地址并沿用当前密钥。
