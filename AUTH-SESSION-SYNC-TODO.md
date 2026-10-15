# 重新登录后同步旧标签页

边界：仅修复前端会话同步及必要测试；不做浏览器验证、提交、推送、部署或业务数据库操作。

- [x] 核对登录、令牌刷新、共享存储、路由初始化及页面缓存链路。
- [x] 登录结束后发布共享会话标识，旧标签页通过现有无确认重载入口重新初始化；刷新令牌保持标识不变。
- [x] 验证跨标签页重新登录、退出和普通刷新；运行受影响 ESLint、类型检查。
- [!] AOCI 收尾返回 blocked，未签发候选；记录下方继续入口，不扩展为历史全仓索引维护。

证据：`src/utils/auth-storage.ts` 共享令牌，`src/stores/user.ts` 写入登录令牌，`src/api/request.ts` 普通刷新，`src/router/guards/permission.ts` 页面启动时读取身份，`src/utils/page-lifecycle.ts` 已有无确认重载入口。完整重载清除当前页面及 KeepAlive 缓存，避免保留旧业务内容；不会清除另一个标签页刚写入的新令牌。

已修改：`src/constants/index.ts`、`src/utils/auth-storage.ts`、`src/utils/auth-storage.test.ts`、`src/stores/user.ts`、`src/main.ts`；同步根 `docs/architecture/overview.md` 的状态说明。沿用前端技能的 Store/认证规范，没有修改后端或 API 合同。

验证：受影响文件 ESLint（修复模式后再次无修复检查）通过；`pnpm type-check` 通过；`pnpm exec vitest run src/utils/auth-storage.test.ts src/api/request.test.ts src/router/guards/permission.test.ts src/router/access.test.ts` 共 30 项通过，其中新增 5 项覆盖共享重新登录、普通刷新不重载、退出、取消记住我和存储范围。没有修改角色权限、路由或接口门禁，不重复运行权限矩阵脚本。测试生成的 `.eslintrc-auto-import.json` 和 `types/auto-imports.d.ts` 已按测试前干净状态还原；无存活测试进程。还原后最终 `pnpm type-check` 与 `git diff --check` 均通过。

AOCI：运行 0.1.0-rc12，`aoci_maintain` 返回 `stopped/blocked`，`candidates=[]`，logical_plan `55191c91291c379361cd8fde698479dee76eb30f44d04f1a3de706eda464a929`，65 个目标混入既有菜单/后端实现漂移；pending_transactions=0、recovery_pending=false、third_party_conflict=false，无正式 Entry/Baseline 写入。普通维护没有任务路径筛选（object_refs 只支持已对齐的 cognition_optimization）。后续独立维护从当前 Guide 与 `scope status --json` 开始，复核 observed_pending_review=4 后继续当前机器流程，不复用旧批次作写入凭据。
