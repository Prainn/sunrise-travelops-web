# Sunrise TravelOps Web

遵守[根导航](../AGENTS.md)；已有内容不重复读。前端实现或审查使用[前端 Skill](.agents/skills/sunrise-travelops-frontend/SKILL.md)，只加载本次命中的 reference 章节。

## Modern Web Guidance

[modern-web-guidance Skill](.agents/skills/modern-web-guidance/SKILL.md)（来源 [GoogleChrome/modern-web-guidance-src](https://github.com/GoogleChrome/modern-web-guidance-src)）用于查询 Web 平台的现行做法，按该 Skill 的流程执行。

- **触发**：新增或修改涉及浏览器原生能力的 UI/CSS/客户端 JS，例如弹窗/浮层、表单校验与自动填充、可访问性、表格与滚动、深色模式、动画、性能（LCP/INP/CLS、图片、懒加载）、HTML 清洗与文件预览安全、日期时区。动手写代码或新增依赖之前先查询。
- **不触发**：纯文案/i18n、业务规则与金额计算、service/type 对接、测试、Vite/ESLint/tsconfig 等工具配置，以及后端、部署任务。
- **用法**：`pnpx modern-web-guidance@latest search "<2–5 个英文词>"`，再用 `retrieve "<id>"` 读取命中的指南；只查本次涉及的能力，不做全量浏览，不运行 `legacy-scan`（用户明确要求现代化扫描时除外）。命令需要外网；失败时继续按项目规范实现，并在交付说明中写明未能查询。
- **优先级**：项目 Skill、共享组件和 Element Plus 优先。指南只决定这些组件内部及原生 DOM/CSS 的写法，不能成为替换组件的理由（例如弹窗仍用 `AppDialog`，不改成原生 `<dialog>`）。指南建议的 polyfill 或新依赖仍须按项目规范说明理由并经确认。
- **浏览器支持**：只支持最近 3 年发布的主流浏览器（Chrome、Edge、Firefox、Safari），按滚动的 `Baseline <当前年份−3>` 判断（2026 年即 Baseline 2023）。指南中 “Baseline since” 不晚于该年份的特性直接使用，不写回退代码或 polyfill，也不保留为旧浏览器准备的兼容写法；更新的特性只在确有需要时使用，先做特性检测，不支持时简单降级，不引入 polyfill。
- **披露**：用到指南时，在交付说明末尾按 Skill 要求附 `### Modern Web Guidance` 小节；只写本次实际采用的指南。

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
- 新增或修改业务名词时，先查中英文语言包和同类页面，优先复用已确认的叫法及其 i18n 键。同一对象、字段、状态或动作在菜单、表单、日志和导出中统一用词。含义不同的概念分别命名，例如「组团社」和「成团记录」。合并重复词条时核对静态和动态引用，并同步删除两种语言中已无调用的旧键。
- PDF 和 Word 报告之外，前端界面不使用「·」等装饰性符号分隔信息。优先用布局间距、标签或换行区分独立信息，句子和列表使用对应语言的自然标点。酒店名称等原始业务内容按原样显示。

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
- 普通本地提交和自动合并提交由 Husky 在暂存内容上完成完整类型检查，满足本次 dev 提交前的 `pnpm type-check` 门禁。dev 发布在新机执行 Vite 打包与线上版本核验。
- GitHub Actions 触发新机隔离 PR 检查及前端构建。dev 在新机发布，main 通过受保护 PR 后手动构建，生产静态包走私网到旧机激活或预验。见 [前端自动部署](../docs/deployment/前端自动部署.md)。
- 生产发布按 `deploy-production` Skill 和[需求维护规范](../docs/agent-guides/requirements.md)的 CRF 规则执行：发布前核对本次新旧需求变更，发布核验后回填实际交付条目的上线时间。小 UI 调整和按原需求修复的 bug 不登记 CRF。
- 修改权限或任何生产发布前，按[共享门禁](../docs/agent-guides/workflow.md#权限与生产门禁)运行根角色权限检查；生产还须[后端业务隔离门禁](../sunrise-travel-ops-backend/AGENTS.md#不可绕过的门禁)。
- 验证前读取[共享验证边界](../docs/agent-guides/workflow.md#validation)；提交/发布只启用适用 Skill，普通开发不预读部署资料。
