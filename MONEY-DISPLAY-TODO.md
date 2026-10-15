# 金额展示统一

- [x] 统一 parseMoney/formatMoney：0 保留，null/undefined/空白字符串按未填；未填显示 —，有效金额两位小数。
- [x] 修复资源、询盘响应金额读取，接入酒店/景点/餐厅、资源选择、调价历史、独立站配置价和普通报价/PDF的金额展示入口；酒店及导游新建价格留空，行程引用拦截无价资源。
- [x] 验证：pnpm type-check；受影响源码与测试 ESLint；4 个定向测试文件、22 项测试通过；git diff --check 通过。
- [!] AOCI 未对齐：2026-10-15 aoci_maintain 返回 stopped/blocked，混入 outputs/hotel-english-20261015 的19个无关 missing/unbaselined 对象，无法单独签发本次批次。candidates=[]，pending_transactions=0，recovery_pending=false，third_party_conflict=false，正式索引无写入。普通维护没有路径范围参数，未扩大处理无关任务。

续接：logical_plan=394225404948789a5c58ce8c21fe94fcd731e6ef8444b066440bc319cf9d10dc，batch_identity=18fe264582b73e5c65d5068aae6c9b3f1bb426db85fdae4145e4be3ff0a59521；total_targets=40，included=0，remaining=40。独立维护任务按当前 scope status / Guide 解决历史漂移后重新领取完整批次。

范围：前端展示和接口金额读取，不改计算公式、后端合同、业务数据库，发布授权已于本轮更新：当前前端全部未发布内容提交至 dev，并经 PR 合入 main 部署 prod。独立站已由服务端生成的双语报价整段文案和冻结快照仍按既有合同原样展示；不解析或改写整段报价文本。可编辑数值输入保留原生输入行为，金额展示统一格式化。
现有修改：AttractionTable.vue 有用户的 0 展示调整，本次按最新要求统一替换。

修改文件：
- src/components/ResourceSelect/index.vue
- src/services/inquiry.service.ts
- src/services/resource.service.test.ts
- src/services/resource.service.ts
- src/types/resource.ts
- src/utils/format.ts
- src/utils/index.ts
- src/views/inquiries/itineraries/components/ItineraryPriceAdjustments.vue
- src/views/inquiries/itineraries/components/ItineraryResourceDialog.vue
- src/views/inquiries/itineraries/components/ItineraryVehiclePlansDialog.vue
- src/views/inquiries/itineraries/pdf.ts
- src/views/inquiries/itineraries/pricing.ts
- src/views/inquiries/itineraries/useItineraryEditor.ts
- src/views/resources/attraction/components/AttractionTable.vue
- src/views/resources/guide/index.vue
- src/views/resources/hotel/components/HotelTable.vue
- src/views/resources/hotel/index.vue
- src/views/resources/restaurant/components/RestaurantTable.vue
- src/views/resources/website/components/WebsiteConfigHotels.vue
- src/views/website-inquiries/itineraries/components/WebsiteDayHotels.vue
- src/views/website-inquiries/itineraries/components/WebsiteVehiclePrices.vue
- src/utils/format.test.ts
- src/services/inquiry.service.test.ts

## 发布（2026-10-15）

- [x] 审查本次修改并核对发布基线，运行受影响 ESLint/类型检查（已通过）。
- [~] 按用户最新要求：提交前端全部未发布内容，并合并 origin/main；不提取、不丢弃本地已有提交。
- [ ] 推送远端 dev，等待 Actions 并核对开发公网版本。
- [ ] 创建 dev → main PR，等待 verify-frontend，通过后合并、触发 prod 部署并核对生产公网版本。

基线：本地 dev=2556cf7（含其他未发布提交），origin/dev=f2af9ef，origin/main=aaa920b；公网 dev=f2af9ef，prod=aaa920b。无后端/数据库操作。
