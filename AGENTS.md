# Sunrise TravelOps Web

遵守[根导航](../AGENTS.md)；已有内容不重复读。前端实现或审查使用[前端 Skill](.agents/skills/sunrise-travelops-frontend/SKILL.md)，只加载本次命中的 reference 章节。

## Stack

以 [package.json](package.json) 和 lockfile 为准：Vue 3、TypeScript 6、Vite 8、Vue Router 5、Pinia 4、Element Plus 2、UnoCSS/SCSS、VueUse、vue-i18n；请求使用原生 fetch 封装。客户 PDF 使用 HTML + 浏览器打印，普通询盘 Word 使用 docx 生成可编辑文件。

## Architecture / Feature Navigation

| 目标 | 入口 |
|---|---|
| 启动、路由、访问控制 | `src/main.ts`、`src/router/index.ts`、`src/router/guards/permission.ts`、`src/router/access.ts` |
| 页面与组件 | `src/views/<业务>/index.vue`、附近 `components`；共享组件在 `src/components` |
| 请求与领域类型 | `src/api/request.ts` → `src/services/*.service.ts`；`src/types`，分页在 `common.ts` |
| 状态与组合函数 | `src/stores`、`src/composables`；业务 composables 就近放在 views 下 |
| Inquiry | `src/views/inquiries`、`src/services/inquiry.service.ts`、`src/types/inquiry.ts` |
| Itinerary / Quotation | `src/views/inquiries/itineraries` 的 Workspace/Editor/Quote/Pdf composables、`pdf.ts` / `docx.ts`；同一个 inquiry service、`src/types/itinerary.ts` |
| 独立站询盘 / 行程 / 配置 | `src/views/website-inquiries`、`src/views/resources/website`；业务合同见根 [统一 API 第 18 节](../docs/api/Sunrise%20TravelOps%20后端说明.md#website-api) |
| 成团 / 导游请假与评分 | `src/views/tours`、`src/views/guides`；根 P0 第 11 节及共享 API 成团章节 |
| 系统操作日志 | `src/views/system/operation-logs`、`src/services/operation-log.service.ts` |


## 按任务开发

- 代码遵守 [eslint.config.ts](eslint.config.ts)，用 ESLint，不用 Prettier。静态 UI 文案遵守 Skill 的 i18n 规则，同步中英文。

- 局部样式/文案：目标组件 + Skill 的 UI/CSS/i18n 章节；不预读需求、API、架构、发布或 AOCI。
- 新页面/表单/表格：Skill 页面参考导航选一个同类页面，再读对应布局/组件规则及相关需求/接口。
- TS/Vue 逻辑：Skill 的命名/组件/可读性对应章节；请求、类型或状态变化才读取 data reference。
- 业务/API 改动：Page → Service → Type → backend endpoint；只读对应 P0/P0.1 和 API 主题。2026-11-02 起新增范围再读新的 P0.1；新需求放入 P0.1，P0 既有需求的变更记录在 CRF 中并关联原 P0 章节。类型变化核对受影响的表单、列表、详情、保存及冻结/PDF 消费者。报价没有独立 quotations 页面。
- 依赖仍不清楚才读[架构 §3、§12](../docs/architecture/overview.md)相关章节；跨端不触发全量 AOCI。

## Testing / Verification

- 测试以当前业务风险和可观察行为为依据，避免为了测试而测试。
- 普通页面、静态展示、简单字段绑定和事件透传不机械新增测试，不用实现细节或文字快照代替业务验证。
- 报价金额、人数与房间数、资源筛选和保存、防重复提交等关键规则保留必要的针对性验证。
- 优先调整现有相关测试，不新增只复述实现的断言；只运行本次相关检查。
- 命令：`pnpm type-check`；`pnpm exec eslint <受影响文件>`；`pnpm test <测试文件>`。`pnpm lint` / `pnpm test` 是全量入口；`pnpm build` 包含类型检查和构建，`build-only` 不含类型检查。
- 本地联调用 `pnpm dev:local`（localhost:4000）；`pnpm dev` 默认代理远程开发 API，勿把远程结果当成本地后端验证。
- PR 的 [ci.yml](.github/workflows/ci.yml) 在 GitHub-hosted 运行类型检查、构建和发布恢复定向检查；[deploy.yml](.github/workflows/deploy.yml) 在 ECS runner 串行构建发布。dev push 发布 dev，main 仅经 PR 更新后手动发布 prod；根命令只发布 dev。步骤与验收见 [前端自动部署](../docs/deployment/前端自动部署.md)。
- 生产发布按 `deploy-production` Skill 和[需求维护规范](../docs/agent-guides/requirements.md)的 CRF 规则执行：发布前核对本次新旧需求变更，发布核验后回填实际交付条目的上线时间。小 UI 调整和按原需求修复的 bug 不登记 CRF。
- 修改权限或任何生产发布前，按[共享门禁](../docs/agent-guides/workflow.md#权限与生产门禁)运行根角色权限检查；生产还须[后端业务隔离门禁](../sunrise-travel-ops-backend/AGENTS.md#不可绕过的门禁)。
- 验证前读取[共享验证边界](../docs/agent-guides/workflow.md#validation)；提交/发布只启用适用 Skill，普通开发不预读部署资料。
