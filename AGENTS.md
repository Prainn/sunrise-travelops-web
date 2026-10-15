# Sunrise TravelOps Web

先读 [workspace AGENTS](../AGENTS.md) 的事实来源与任务分级；详细导航见 [架构 §3、§12](../docs/architecture/overview.md)。新增页面先按 [前端技能的页面参考导航](.agents/skills/sunrise-travelops-frontend/SKILL.md#页面参考导航) 选同类页面；局部修改只读对应命名、样式或组件章节。

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
| 独立站询盘 / 行程 / 配置 | `src/views/website-inquiries`、`src/views/resources/website`；业务合同见根 `docs/api/独立站行程与报价V1.md` |
| 成团 / 导游请假与评分 | `src/views/tours`、`src/views/guides`；根成团专题及共享 API 成团章节 |
| 系统操作日志 | `src/views/system/operation-logs`、`src/services/operation-log.service.ts` |

修改业务按 Page → Service → Type → backend endpoint 核对实际链路；Inquiry/Itinerary/Quotation 读根 P0、P0.1 和 API 的受影响主题。局部样式/文案无需走接口链；简单接口改动只因实际共享依赖扩大阅读，不因跨端而全量 AOCI。报价没有独立 quotations 页面。类型变化同时检查表单、列表、详情、保存映射和冻结数据/PDF 消费者，只修改受影响部分。

## API Rules

- `/api` 无 `/v1`；成功 `{ code: "SUCCESS", message, data }`，字段是 `message`。request 返回解包后的 data，204 返回 undefined；组件通过业务 service 调用，不重复包装响应。
- `src/types/common.ts` 的 `PageResult<T>` 为 `{ list, total, page, pageSize }`；列表项、详情和表单按各业务合同定义，非分页接口不强套分页。
- request 抛本地化 `ApiError`，错误码在 `src/api/error-code.ts`；页面/composable 负责适当提示，不把请求失败变成成功空数据。
- Bearer、401 合并刷新及单次重试由 request 处理；token 存取走 `utils/auth-storage.ts`，身份状态走 user store，不绕过现有认证层。
- 菜单/按钮使用现有路由权限、指令和业务 workflow；隐藏 UI 不能替代后端数据范围校验。
- 新增页面后，静态检查菜单图标是否已注册：路由 `meta.icon` 使用 `el-icon-*` 时，核对 `src/main.ts` 中对应图标的导入及 `routeIcons` 全局注册。此项只检查注册，不要求浏览器验证。

## State Management / UI

- 所有前端代码及格式遵守 [eslint.config.ts](eslint.config.ts)，统一使用 ESLint 检查和自动修复，不使用 Prettier。
- 所有新增或修改的静态用户界面文案必须使用现有 vue-i18n（`$t` / `useI18n`），包括标签、正文、占位、提示、校验消息、按钮、选项和可访问性文案；同步维护 [zh-cn.json](src/lang/package/zh-cn.json) 与 [en.json](src/lang/package/en.json)，优先复用已有键，禁止先硬编码后补翻译。
- 文案与选项标签须随 locale 切换响应式更新，不在模块加载或初始化时固定译文；不翻译或改写管理员录入内容、服务端业务数据，以及已明确指定语言的打印内容。
- 当前 Pinia 管身份、权限菜单、字典与全局界面；行程未保存编辑由页面 composable 持有。沿用对应状态所有者，不为单页编辑新增全局业务 store。
- Store 使用 Setup Store、扁平目录；组件外调用现有 `useXxxStoreHook()`。生成的根 `types/*.d.ts` 是工具声明，不能代替 `src/types` 领域合同。
- 复用现有组件及页面布局。UnoCSS 优先，不能等价表达的 Element Plus 覆盖/复杂选择器保留 SCSS；不为默认间距刻度改变现有尺寸，不动态拼接 UnoCSS 类名。详细规则见前端技能。

## 表单与选择器

- 必填字段在 `el-form-item` 的 `prop` 与表单规则中声明，显示必填标记并阻止空值提交；不能只添加红色星号。数值字段清空后保留空值，不转成 0 或默认值绕过校验；按业务约束设置最小值与整数精度，并与后端 DTO 保持一致。
- 下拉选择器（含可搜索、远程选择器及共享组件内的 `el-select`）统一设置 `autocomplete="new-password"`，阻止 Chrome 地址自动填充；Element Plus 默认的 `off` 不能可靠阻止地址建议。保留组件自身的筛选、键盘选择与回填；新增下拉也须遵守。普通自由输入与资源选择按需求区分，不能把自由文本擅自限制为资源选项。
- 新增表单中未要求默认值的地区字段从空值开始，不读取浏览器地址资料或继承上一次表单输入。编辑表单按当前记录回填。
- 窄侧栏的单行搜索使用弹性布局：标签与操作按钮保持内容宽度，输入区域 `flex: 1; min-width: 0`，清除表单项默认外边距，让整行占满可用宽度；避免固定栅格比例挤压输入框或留下尾部空白。检查中英文及窄屏布局。

## 普通表格页布局

适用于资源列表、成团表、导游列表/请假/评分等“筛选 + 表格 + 分页”页面。以 [ResourceTable](src/views/resources/components/ResourceTable.vue) 和 [page.scss](src/styles/page.scss) 为结构与样式参考；业务字段、权限、查询和保存逻辑仍由各页面负责。

```text
.page-container
├─ el-card.page-search（shadow="never"）
│  └─ el-form（inline）→ el-form-item → 筛选控件、查询/重置按钮
└─ el-card.page-content（shadow="never"）
   ├─ TableToolbar → 新增等列表操作、刷新
   ├─ .page-table-wrapper → el-table（border、height="100%"、稳定 row-key）
   └─ Pagination → 页码、每页条数、总数
```

- **筛选区域**：必须使用独立的 `el-card.page-search`，内放 `el-form`；不能只给裸 `el-form` 加 `page-search`，也不能把筛选控件直接放在页面背景上。每个字段用 `el-form-item` 包裹，查询/重置按钮放在同一表单的操作项中。
- **表格区域**：使用独立的 `el-card.page-content`，依次放工具栏、表格容器、分页。复用 `TableToolbar` 和 `Pagination`；表格容器使用 `page-table-wrapper`，保留 `page-content` 的高度与滚动布局，不另造固定视口高度、卡片边框或间距。
- **组件选择**：符合公共资源维护语义的页面优先复用 `ResourceTable` 及其筛选/列插槽；成团、请假、评分等专用业务页面复用上述布局和共享组件，不强套资源 CRUD、状态或权限语义。远程选项沿用 `RemoteSelect`、`ResourceSelect` 或现有业务选择器，避免为筛选加载全库。
- **label**：每个筛选字段必须有可见的 `el-form-item :label`，关键词统一复用 `$t('common.keywords')`，其他字段使用准确的业务名称；只有按钮操作项可以不带 label。placeholder 不能代替 label。
- **placeholder**：关键词说明实际支持搜索的字段；选择器说明“请选择”“全部状态”等真实筛选含义，日期范围分别说明开始/结束日期。label、placeholder 和按钮文案均使用响应式 i18n，优先复用已有键，新增键同步中英文；不能提示接口不支持的筛选条件。
- **宽度与换行**：关键词输入框使用 `page-search__keywords`，选择器等普通控件沿用 `page-search` 的公共宽度。不要让长搜索提示落到默认窄输入框，也不要每页另写随意的宽度；字段确需特殊尺寸时按内容局部调整。窄屏允许字段及按钮换行，不能挤压 label 或把 placeholder 的截断当作正常布局；应在中英文下考虑提示长度。
- 新增或修改这类页面时，对照参考组件检查卡片层级、字段 label、placeholder、宽度及分页位置；ESLint 和类型检查通过不代表布局已符合规范。既有同类组件有遗漏时不能直接照抄遗漏。

## Testing / Verification

- 测试以当前业务风险和可观察行为为依据，避免为了测试而测试。
- 普通页面、静态展示、简单字段绑定和事件透传不机械新增测试，不用实现细节或文字快照代替业务验证。
- 报价金额、人数与房间数、资源筛选和保存、防重复提交等关键规则保留必要的针对性验证。
- 优先调整现有相关测试，不新增只复述实现的断言；只运行本次相关检查。
- 命令：`pnpm type-check`；`pnpm exec eslint <受影响文件>`；`pnpm test <测试文件>`。`pnpm lint` / `pnpm test` 是全量入口；`pnpm build` 包含类型检查和构建，`build-only` 不含类型检查。
- 本地联调用 `pnpm dev:local`（localhost:4000）；`pnpm dev` 默认代理远程开发 API，勿把远程结果当成本地后端验证。
- PR 的 [ci.yml](.github/workflows/ci.yml) 在 GitHub-hosted 运行类型检查、构建和发布恢复定向检查；[deploy.yml](.github/workflows/deploy.yml) 在 ECS runner 串行构建发布。dev push 发布 dev，main 仅经 PR 更新后手动发布 prod；根命令只发布 dev。步骤与验收见 [前端自动部署](../docs/deployment/前端自动部署.md)。
