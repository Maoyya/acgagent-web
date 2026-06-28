# 路由守卫增加 access token 过期校验

> 日期：2026-06-27 | 类型：fix | 关联代码：`src/router/index.ts`、`src/utils/jwt.ts`

---

## 1. 背景

路由守卫 `beforeEach` 此前只用 `localStorage.getItem('accessToken')` 判断是否登录——**只查"有没有"，不查"有没有效"**。后果：access token 过期后，访问受保护页面仍被放行进入 dashboard，直到后续接口返回 401 才被 `src/utils/request.ts` 被动清退跳登录。

用户反馈"点 `/` 直接进 dashboard，逻辑有问题"。排查结论有两点：
- `/` 配置了 `{ path: '', redirect: '/dashboard' }`，**已登录必落 dashboard**——属设计如此，保留；
- 守卫不校验过期——**真正的缺陷**，本次修复对象。

## 2. 方案

在守卫阶段依据 JWT 的 `exp` 提前拦截过期 token，落地页仍为 dashboard：

```
accessToken 存在？
  ├ 否 → 跳 /login（带 redirect 回跳参数）
  └ 是 → isTokenExpired(token)？
         ├ 否（有效） → 放行
         └ 是（过期） → 清 accessToken/refreshToken → 跳 /login
```

## 3. 改动清单

| 文件 | 改动 |
| --- | --- |
| `src/utils/jwt.ts` | **新增** `isTokenExpired(token)`：解析 JWT payload 的 `exp` 判定过期；token 损坏或缺 `exp` 时返回 `false`，交后端 401 兜底 |
| `src/router/index.ts` | `beforeEach`：`tokenValid = 存在 && 未过期`；过期时清两个 token 后跳登录（清理策略与 `request.ts` 的 401 处理一致）；已登录访问 `/login`、`/register` 的判定改用 `tokenValid`，过期 token 不再被甩去 dashboard |

## 4. 设计决定

| 项 | 决定 | 理由 |
| --- | --- | --- |
| 过期判定依据 | 前端解析 JWT `exp` | 提前拦截优化体验；最终仍以后端 401 为权威 |
| 损坏 / 缺 `exp` | 返回 `false`（视为未过期，放行） | 避免前端解析失败误踢用户，交后端 401 兜底 |
| 过期时清理 | 同时清 `accessToken` + `refreshToken` | 与 `request.ts` 的 401 处理保持一致 |
| 是否做无感刷新 | 否，过期直接跳登录 | 用户明确要求"过期则重新登录"；refresh 未在路由层接入，超出本次范围 |
| 落地页 | 维持 `/` → `/dashboard` | 用户确认 dashboard 作为登录后第一屏 |

## 5. 验证

- `isTokenExpired` 临时 node 脚本（跑完即删）：有效 / 过期 / 无 exp / 损坏 / 空串 / 含中文 payload 共 6 case + padding 公式 7 case，全 pass；
- `npm run type-check`：本次改动文件（`jwt.ts`、`router/index.ts`）类型干净；仍有 3 个**预存** TS6133（`ChatPanel.vue` 的 abort、`AdminLayout.vue` 的 SwitchButton、`Dashboard.vue` 的 idx），与本次无关，未处理；
- 代码评审（CR）发现 `atob` 缺 base64 padding 补全（见 §7），已修。

## 6. 范围（本次未做）

- **无感 token 刷新**（access 过期用 refresh 续期）：未接入路由层，过期即跳登录；
- **3 个预存 TS6133 未使用变量**：不在本次范围，留待单独清理；
- **`tsconfig.app.tsbuildinfo` 入库**：构建缓存应进 `.gitignore`，属预存问题，未处理。

## 7. 配套修复与踩坑（2026-06-27）

CR 发现一个会让"过期校验形同虚设"的坑：

- **`atob` 缺 base64url padding**：JWT payload 是 base64url，常省略尾部 `=`。当 payload 长度 `% 4 ≠ 0` 时，**浏览器 `atob` 抛 `InvalidCharacterError`**（Node 的 `atob` 较宽容，临时脚本未暴露该差异）。抛错被 `catch` 吞掉 → 返回 `null` → `isTokenExpired` 返回 `false`（不过期）→ 过期 token 照样放行，本次修复失效。**已修**：解码前按 `(4 - len % 4) % 4` 补齐 `=`。补全后 `atob` 必然成功，剩余抛错仅来自损坏 token，`catch` 兜底合理。
