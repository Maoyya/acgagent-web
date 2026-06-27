# Changelog

记录 acgagent-web（前端）的变更。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。仅记录有意义的代码变更（新增功能、修 bug、行为变化、破坏性改动、chore）；纯格式 / 注释 / 重命名类改动不记。

> **归档说明（2026-06-27）**：本文件为此日期前的历史记录（Keep-a-Changelog 单文件格式）。自 2026-06-27 起，变更改用「每次一篇深度文档」记录，见同目录下 `YYYY-MM-DD-<slug>.zh.md` 文件；本文件不再追加新条目。

## [Unreleased]

### Fixed

- **登录页构建失败（类型错误）**：`src/utils/crypto.ts` 中 `import md5 from 'js-md5'` 在 vue-tsc 严格检查下报 TS2349（js-md5 仅有命名导出 `md5`，无默认导出），阻塞 `npm run build`。改为 `import { md5 } from 'js-md5'`。
- **js-md5 未安装**：`js-md5` 此前仅在 `package.json` 声明、未实际安装进 `node_modules`，导致 Vite 依赖扫描报 "could not be resolved"。已执行 `npm install` 补装（`js-md5@0.8.3`）。
- **登录页输入框在深色背景下不可见（"空白"）**：`src/views/auth/Login.vue` 输入框背景 / 边框对比度过低（rgba 0.04 / 0.08、无阴影、占位符 0.2），在深色卡片上几乎看不见。重做为蚀刻玻璃质感（渐变填充 + 内高光 + 外阴影）、聚焦时珊瑚色发光、占位符可读性提升，并将用户名 / 密码图标由 label 移入输入框前缀；新增浏览器自动填充（`-webkit-autofill`）的深色主题适配，避免保存的账号密码显示为白底黑字。

### Changed

- 登录页提交按钮高度 46 → 52px，与输入框对齐；悬停阴影增强。

### Removed

- 登录页 `<el-icon>` 上未使用的 `field-icon` class（图标样式实际经由 Element Plus 的 `.el-input__prefix-inner` 实现，该 class 无任何 CSS 引用）——代码评审（CR）发现并清理。

### Chore

- `.gitignore` 新增 `.playwright-mcp/`（Playwright MCP 本地运行产物），并 `git rm --cached` 取消已跟踪的历史快照 11 个，避免误提交。
