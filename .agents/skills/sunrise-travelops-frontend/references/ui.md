# UI、表单与样式

按本次影响选读：文案读 State Management / UI 的 i18n 规则；样式读 CSS；表单读表单与选择器；表格页读普通表格页布局。新增组件另读 coding.md 的组件规范。

## State Management / UI

- 所有前端代码及格式遵守 [eslint.config.ts](../../../../eslint.config.ts)，统一使用 ESLint 检查和自动修复，不使用 Prettier。
- 所有新增或修改的静态用户界面文案必须使用现有 vue-i18n（`$t` / `useI18n`），包括标签、正文、占位、提示、校验消息、按钮、选项和可访问性文案；同步维护 [zh-cn.json](../../../../src/lang/package/zh-cn.json) 与 [en.json](../../../../src/lang/package/en.json)，禁止先硬编码后补翻译。
- 中英文优先复用语义一致的 `common.*` 或已有键，可共用文案集中维护，不重复建键。英文以中文为准，两种语言均尽量简短自然；上下文明确时按钮只写动作，如“新增 / 编辑 / 撤销”对应 `Add / Edit / Cancel`，不重复对象名。精简不得改变原意、遗漏业务条件或操作后果，须保留数值、单位与插值，避免生僻缩写。
- 文案与选项标签须随 locale 切换响应式更新，不在模块加载或初始化时固定译文；不翻译或改写管理员录入内容、服务端业务数据，以及已明确指定语言的打印内容。
- 当前 Pinia 管身份、权限菜单、字典与全局界面；行程未保存编辑由页面 composable 持有。沿用对应状态所有者，不为单页编辑新增全局业务 store。
- Store 使用 Setup Store、扁平目录；组件外调用现有 `useXxxStoreHook()`。生成的根 `types/*.d.ts` 是工具声明，不能代替 `src/types` 领域合同。
- 复用现有组件及页面布局。UnoCSS 优先，不能等价表达的 Element Plus 覆盖/复杂选择器保留 SCSS；不为默认间距刻度改变现有尺寸，不动态拼接 UnoCSS 类名。详细规则见前端技能。

## 表单与选择器

- 必填字段在 `el-form-item` 的 `prop` 与表单规则中声明，显示必填标记并阻止空值提交；不能只添加红色星号。数值字段清空后保留空值，不转成 0 或默认值绕过校验；按业务约束设置最小值与整数精度，并与后端 DTO 保持一致。
- 下拉选择器（含可搜索、远程选择器及共享组件内的 `el-select`）统一设置 `autocomplete="new-password"`，阻止 Chrome 地址自动填充；Element Plus 默认的 `off` 不能可靠阻止地址建议。保留组件自身的筛选、键盘选择与回填；新增下拉也须遵守。普通自由输入与资源选择按需求区分，不能把自由文本擅自限制为资源选项。
- 新增表单中未要求默认值的地区字段从空值开始，不读取浏览器地址资料或继承上一次表单输入。编辑表单按当前记录回填。
- 窄侧栏或面板内的单行搜索使用 `FilterBar variant="compact"`，让输入区域占满可用宽度；不另写固定栅格比例或表单项外边距。检查中英文及窄屏布局。

## 普通表格页布局

适用于资源列表、成团表、导游列表/请假/评分等“筛选 + 表格 + 分页”页面。以 [ResourceTable](../../../../src/views/resources/components/ResourceTable.vue) 为结构参考；业务字段、权限、查询和保存逻辑仍由各页面负责。

```text
PageShell（左侧分类/树用 #aside 插槽）
├─ FilterBar → el-form-item → 筛选控件；重置内置，其他按钮放 #actions
└─ SectionCard（fill）
   ├─ TableToolbar → 新增等列表操作、刷新
   ├─ DataTable（fill、稳定 row-key）→ el-table-column
   └─ Pagination → 页码、每页条数、总数
```

- **筛选区域**：使用 `FilterBar`，不能把裸 `el-form` 或筛选控件直接放在页面背景上。每个字段用 `el-form-item` 包裹；查询等额外按钮放 `#actions` 插槽。
- **表格区域**：使用 `SectionCard fill`，依次放 `TableToolbar`、`DataTable fill`、`Pagination`；页面内的卡片、面板统一用 `SectionCard`，表格统一用 `DataTable`，不直接使用 `el-card`/`el-table`，不另造固定视口高度、卡片边框、圆角或间距。
- **组件选择**：符合公共资源维护语义的页面优先复用 `ResourceTable` 及其筛选/列插槽；成团、请假、评分等专用业务页面复用上述布局和共享组件，不强套资源 CRUD、状态或权限语义。远程选项沿用 `RemoteSelect`、`ResourceSelect` 或现有业务选择器，避免为筛选加载全库。
- **label**：每个筛选字段必须有可见的 `el-form-item :label`，关键词统一复用 `$t('common.keywords')`，其他字段使用准确的业务名称；只有按钮操作项可以不带 label。placeholder 不能代替 label。
- **placeholder**：关键词说明实际支持搜索的字段；选择器说明“请选择”“全部状态”等真实筛选含义，日期范围分别说明开始/结束日期。label、placeholder 和按钮文案均使用响应式 i18n，优先复用已有键，新增键同步中英文；不能提示接口不支持的筛选条件。
- **宽度与换行**：关键词等长输入的 `el-form-item` 加 `filter-bar__wide`，选择器等普通控件沿用 `FilterBar` 的公共宽度。不要让长搜索提示落到默认窄输入框，也不要每页另写随意的宽度；字段确需特殊尺寸时按内容局部调整。窄屏允许字段及按钮换行，不能挤压 label 或把 placeholder 的截断当作正常布局；应在中英文下考虑提示长度。
- 新增或修改这类页面时，对照参考组件检查卡片层级、字段 label、placeholder、宽度及分页位置；ESLint 和类型检查通过不代表布局已符合规范。既有同类组件有遗漏时不能直接照抄遗漏。

## CSS / UnoCSS / SCSS 边界

**核心原则：优先使用 UnoCSS；无法直接、等价转换的样式保留 CSS/SCSS。**

- 优先使用项目现有 UnoCSS，在 Vue 模板的 `class` 中编写 utility class，表达布局、间距、尺寸、字体、颜色等样式。
- 使用精确尺寸或 CSS 变量时采用 UnoCSS arbitrary value，保持现有主题和视觉效果；不要为了使用默认刻度改变设计尺寸。
- 确实需要复用的样式组合可以使用 `uno.config.ts` 中的 shortcuts。共享页面类或依赖 scoped 选择器优先级的组件样式可使用 `@apply`。
- 普通静态样式不要新增 `style` 属性或重复的 CSS/SCSS 声明。条件样式使用包含完整 utility class 字符串的 `:class`，不要动态拼接 UnoCSS 类名。
- 无法直接、等价转换的样式可以保留 CSS/SCSS，例如 Element Plus 内部覆盖、`:deep()`、复杂嵌套/组合选择器、关键帧动画及 Sass 计算。PDF 导出模板中需要独立控制的排版样式可保留；运行时计算的尺寸、坐标、颜色和组件样式 API 可以保留 `:style` 或对应属性。
- 转换时保持响应式断点、主题、状态样式和选择器优先级；不要靠批量添加 `!important` 覆盖层叠问题。
- 颜色优先使用 UI 库 CSS 变量或项目变量，保持主题一致。
- 可以保留用于语义、状态和选择器定位的 BEM 类，并与 UnoCSS utility class 共存；不限制单个元素的原子类数量。
- 状态用 `is-*`：`is-collapsed`、`is-loading`；变体用 BEM Modifier：`layout--top`、`todo-row--done`。
- BEM 格式：`block__element--modifier`，kebab-case，Block 带页面前缀：`user-card`、`role-permission`。

## 布局补充

- 优先组件属性/插槽，避免滥用 `:deep()`。
- 页面高度使用 `min-height: 100vh`，避免固定 `height: 100vh`。
- z-index 使用 CSS 变量分层，不写魔法数字。
