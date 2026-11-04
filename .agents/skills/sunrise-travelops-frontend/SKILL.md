---
name: sunrise-travelops-frontend
description: Sunrise TravelOps frontend implementation and review in sunrise-travel-ops-web. Routes Vue pages, components, styles, services and state changes to task-specific standards and existing examples.
---

# Sunrise TravelOps 前端开发规范

遵守[前端 AGENTS](../../../AGENTS.md)与 workspace 根导航；已在上下文里的内容不重复读取。先判断改动类型，再读取下表命中的 reference 章节，不一次加载所有 reference 或参考页面。规范适用即必须遵守；未命中部分不预读。

## 按任务选读

| 改动 | 必读章节 |
|---|---|
| 文案、翻译 | [UI](references/ui.md)的 State Management / UI 中 i18n 规则；中文为准，同步中英文 |
| 样式、布局 | [UI](references/ui.md)的 CSS / UnoCSS / SCSS 边界与布局补充 + 直接使用的共享样式 |
| 表单/选择器 | [UI](references/ui.md)的表单与选择器；新增组件再读 [coding](references/coding.md)的组件规范 |
| 新增/修改普通表格页 | [UI](references/ui.md)的普通表格页布局与 i18n + 下方一个同类参考 |
| TS/Vue 逻辑、组件 | [coding](references/coding.md)中涉及的命名、handle、组件、注释与可读性规则 |
| 请求、领域类型、认证/权限 | [data](references/data.md)的 API Rules、类型与 API 约定 + 根 API 的对应主题及真实调用者 |
| Store / composable | [data](references/data.md)对应章节 + [UI](references/ui.md)的状态归属约束 |
| 验证/发布 | [前端 AGENTS](../../../AGENTS.md#testing--verification)；仅在发布时读取部署资料/Skill |

新页面沿用 i18n、loading/空态/错误反馈和表单提交；涉及哪些能力就读取哪些规范，不把“新页面”当成全量阅读理由。自查只覆盖本次实际影响，验证通过后停止。

## 页面参考导航

以下链接相对本 Skill。新增页面先选择一个最接近的现有页面，读取其相关布局、直接使用的组件及样式；只有缺少所需模式时再扩大搜索。样式一致性不要求全量 AOCI。

| 页面或交互 | 参考入口 | 复用边界 |
|---|---|---|
| 简单资源列表与表单 | [城市资源页](../../../src/views/resources/city/index.vue)、[ResourceTable](../../../src/views/resources/components/ResourceTable.vue)、[ResourceEditorDialog](../../../src/views/resources/components/ResourceEditorDialog.vue) | 带公共资源、状态、版本及资源权限语义；适用于相同资源业务，不作为所有页面的通用外壳 |
| 资源列表配专用表单 | [航班资源页](../../../src/views/resources/flight/index.vue) | 复用列表结构，字段与关联校验由对应业务表单承担 |
| 左侧分类、右侧列表 | [用户页](../../../src/views/system/user/index.vue)、[PageShell](../../../src/components/PageShell/index.vue) | 复用 `PageShell` 的 `#aside` 插槽与 `SectionCard`；账号权限和数据加载按新页面合同实现 |
| 搜索、列表、表格、弹窗 | [FilterBar](../../../src/components/FilterBar/index.vue)、[SectionCard](../../../src/components/SectionCard/index.vue)、[DataTable](../../../src/components/DataTable/index.vue)、[AppDialog](../../../src/components/AppDialog/index.vue)、[theme.scss](../../../src/styles/theme.scss)、[UnoCSS](../../../uno.config.ts) | 复用共享组件和现有主题变量，不直接用 `el-card`/`el-table`，不另造默认间距或颜色体系 |
| 工具栏与分页 | [TableToolbar](../../../src/components/TableToolbar/index.vue)、[Pagination](../../../src/components/Pagination/index.vue) | 核对 props/events 和同类消费者，沿用重置、刷新、分页交互 |
| 远程选项 | [RemoteSelect](../../../src/components/RemoteSelect/index.vue)、[ResourceSelect](../../../src/components/ResourceSelect/index.vue) | 按数据来源选择；保留搜索、分页、回填和资源范围语义，不为下拉加载全库 |

页面参考负责布局和交互模式；业务字段、权限及保存行为由根需求/API 决定。新页面同时沿用现有 i18n、loading/空态/错误反馈和表单提交方式。只读取参考页的相关部分，不因它较大而复制整页或顺带重构。
