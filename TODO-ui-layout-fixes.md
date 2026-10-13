# 本次页面布局修复

- [x] 定位：成团/导游筛选缺 el-card，关键词缺 label/宽度；消息缩小仍展示正文。
- [x] 消息缩小仅保留 42px 标题栏，保持拖拽和展开。
- [x] 行程顶部辅助信息和操作随滚动方向收起/展开，保留行程选择和标题。
- [x] 成团、导游列表、请假、评分及价格设置复用 page-search 卡片、common.keywords 和公共输入宽度。
- [x] 受影响 7 个 Vue 文件 ESLint --fix 与 pnpm type-check 均退出 0；按用户限定仅此两项检查。

索引收尾入口：aoci_maintain 签发本次完整批次后提交 aoci_update_entry；正式维护结果以工具报告为准。

文件：src/views/inquiries/itineraries/{index.vue,components/InquiryMessagePreview.vue}；src/views/tours/index.vue；src/views/guides/{leaves,ratings}/index.vue；src/views/resources/guide/components/{GuidePersonTable,GuideTable}.vue。
