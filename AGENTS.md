# Sunrise TravelOps Web

先读 [workspace AGENTS](../AGENTS.md) 的事实来源与全局流程；详细导航见 [架构 §3、§12](../docs/architecture/overview.md)。命名、样式和组件规范按需读 [前端技能](.agents/skills/sunrise-travelops-frontend/SKILL.md)，此处不复制示例代码。

## Stack

以 [package.json](package.json) 和 lockfile 为准：Vue 3、TypeScript 6、Vite 8、Vue Router 5、Pinia 4、Element Plus 2、UnoCSS/SCSS、VueUse、vue-i18n；请求使用原生 fetch 封装。客户 PDF 当前为 HTML + 浏览器打印。

## Architecture / Feature Navigation

| 目标 | 入口 |
|---|---|
| 启动、路由、访问控制 | `src/main.ts`、`src/router/index.ts`、`src/router/guards/permission.ts`、`src/router/access.ts` |
| 页面与组件 | `src/views/<业务>/index.vue`、附近 `components`；共享组件在 `src/components` |
| 请求与领域类型 | `src/api/request.ts` → `src/services/*.service.ts`；`src/types`，分页在 `common.ts` |
| 状态与组合函数 | `src/stores`、`src/composables`；业务 composables 就近放在 views 下 |
| Inquiry | `src/views/inquiries`、`src/services/inquiry.service.ts`、`src/types/inquiry.ts` |
| Itinerary / Quotation | `src/views/inquiries/itineraries` 的 Workspace/Editor/Quote/Pdf composables、`pdf.ts`；同一个 inquiry service、`src/types/itinerary.ts` |

修改业务按 Page → Service → Type → backend endpoint 核对实际链路；Inquiry/Itinerary/Quotation 先读根 P0、P0.1 和 API 对应章节。报价没有独立 quotations 页面。类型变化同时检查表单、列表、详情、保存映射和冻结数据/PDF 消费者，只修改受影响部分。

## API Rules

- `/api` 无 `/v1`；成功 `{ code: "SUCCESS", message, data }`，字段是 `message`。request 返回解包后的 data，204 返回 undefined；组件通过业务 service 调用，不重复包装响应。
- `src/types/common.ts` 的 `PageResult<T>` 为 `{ list, total, page, pageSize }`；列表项、详情和表单按各业务合同定义，非分页接口不强套分页。
- request 抛本地化 `ApiError`，错误码在 `src/api/error-code.ts`；页面/composable 负责适当提示，不把请求失败变成成功空数据。
- Bearer、401 合并刷新及单次重试由 request 处理；token 存取走 `utils/auth-storage.ts`，身份状态走 user store，不绕过现有认证层。
- 菜单/按钮使用现有路由权限、指令和业务 workflow；隐藏 UI 不能替代后端数据范围校验。

## State Management / UI

- 当前 Pinia 管身份、权限菜单、字典与全局界面；行程未保存编辑由页面 composable 持有。沿用对应状态所有者，不为单页编辑新增全局业务 store。
- Store 使用 Setup Store、扁平目录；组件外调用现有 `useXxxStoreHook()`。生成的根 `types/*.d.ts` 是工具声明，不能代替 `src/types` 领域合同。
- 复用现有组件及页面布局。UnoCSS 优先，不能等价表达的 Element Plus 覆盖/复杂选择器保留 SCSS；不为默认间距刻度改变现有尺寸，不动态拼接 UnoCSS 类名。详细规则见前端技能。

## Testing / Verification

- 测试以当前业务风险和可观察行为为依据，避免为了测试而测试。
- 普通页面、静态展示、简单字段绑定和事件透传不机械新增测试，不用实现细节或文字快照代替业务验证。
- 报价金额、人数与房间数、资源筛选和保存、防重复提交等关键规则保留必要的针对性验证。
- 优先调整现有相关测试，不新增只复述实现的断言；只运行本次相关检查。
- 命令：`pnpm type-check`；`pnpm exec eslint <受影响文件>`；`pnpm test <测试文件>`。`pnpm lint` / `pnpm test` 是全量入口；`pnpm build` 包含类型检查和构建，`build-only` 不含类型检查。
- 本地联调用 `pnpm dev:local`（localhost:4000）；`pnpm dev` 默认代理远程开发 API，勿把远程结果当成本地后端验证。
- CI [deploy-dev.yml](.github/workflows/deploy-dev.yml) 运行发布脚本测试和 `pnpm build:server-dev`，不运行全量 lint/Vitest。发布步骤与验收见 [前端自动部署](../docs/deployment/前端自动部署.md)。
