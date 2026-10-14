# 报价导出与资源选择修复

当前口径：用户明确最终客户 PDF/Word 不显示小费，撤销上一轮新增的小费展示。保留旧冻结酒店早餐及缺描述资源选择修复。修复阶段保留本地改动；2026-10-14 用户已授权提交并部署开发环境，发布进度见根 `TODO-dev-release-2026-10-14-review-fixes.md`。

- [x] PDF/Word 不输出小费金额、语言或单独小费栏，存储和利润计算不变。
- [x] 同步根 P0 客户导出要求与共享 API 的小费展示说明。
- [x] 早餐按冻结记录中保存的酒店计划判断，保留旧字符串档位。
- [x] 前后端禁止新选缺描述/缺价的景点、餐厅，已有历史引用可保留。
- [x] 当前前端 13 项回归、受影响 ESLint 和类型检查通过。

验证：前端回归实际生成 DOCX 并解包检查，同时验证 PDF HTML；覆盖中文/第二语言正数小费均不输出、零值/空值、儿童开关、旧酒店档位早餐、冻结数据未改写及内部利润/原因不导出。资源测试覆盖空白描述、缺价、零价和完整记录。上一轮后端 40 项定向测试、受影响 ESLint 和类型检查通过，本轮后端源码未变。

命令：前端 `pnpm type-check`、`pnpm exec eslint src/views/inquiries/itineraries/pdf.ts src/views/inquiries/itineraries/customer-export.test.ts`；`pnpm exec vitest run --config /tmp/sunrise-quote-review-fixes/vitest.config.mjs src/views/inquiries/itineraries/customer-export.test.ts src/views/inquiries/itineraries/pricing.test.ts`。独立 Vitest 配置仅设置源码别名和 Node 环境，避免生成自动导入声明。

先前 QA 样张包含已经撤销的小费行，不代表本轮最终输出。本轮通过实际 DOCX 文本与 PDF HTML 验证不显示小费。捆绑 LibreOffice 缺中文字体，Word 中文排版未判为通过；Docker daemon 未运行，未执行数据库集成测试；未操作业务库。

修改入口：前端 `pdf.ts`、`hotel-plans.ts`、`pricing.ts` 和两个回归文件；后端 `selection.service.ts`、`itinerary-validation.ts` 及其回归文件；根 `docs/requirements/Sunrise TravelOps P0需求说明.md`、`docs/api/Sunrise TravelOps 后端说明.md`。最终索引收尾通过 AOCI 候选、Receipt 及终态验证记录，不据旧索引状态宣称本轮完成。
