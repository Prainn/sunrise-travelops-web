# 独立站台账入口拆分（2026-10-22）

- [x] 核对现有入口、表单、服务与菜单权限链路。
- [x] 更新需求/合同，两个固定业务路由复用现有台账页面；同步后端菜单定义及既有授权迁移。
- [x] 验证路由权限、独立站新增规则、lint/类型与相关测试。
- [!] 已执行一次 AOCI 收尾；混入历史漂移/观察待审，索引尚未对齐，未扩展处理其它任务。

## 边界与实现

- 初始授权仅本地修改；后续用户授权将当前前后端全部改动提交，不 push、不发布、不操作业务数据库。
- 霖熹/独立站使用独立菜单键，沿用 ledger:direct:* 动作权限和接口；独立站新增规则不变。
- 后续提交包含已有列宽调整：direct/index.vue 的收客/操作计调列宽 200、shengxu/index.vue 收客计调列宽 200、system/user/index.vue 姓名列宽 240。direct/index.vue-E 已确认与原 HEAD 源文件完全一致，清理冗余备份，历史仍可从 Git 恢复。
- 现有 LayoutMain 按 fullPath 缓存，两个固定 props 路由可保留独立列表/弹窗状态，不改全局缓存。
- 证据：src/views/ledgers/direct/index.vue、components/DirectLedgerDialog.vue；后端 src/roles/menu-definitions.ts、menu-permissions.service.ts；根 docs/requirements/手工台账.md 和 API §21。

## 修改与验证

- 前端：router/index.ts 新增 WebsiteLedger，两个路由通过固定 props 复用 direct/index.vue；移除业务切换及对应状态/监听；新增中英文菜单标题。保持原有列宽改动。
- 后端：menu-definitions.ts 新增 website-ledger 独立菜单及范围；1793318400000-AddWebsiteLedgerMenu.ts 只为已有 direct-ledger 的合资格角色追加授权，不执行业务库迁移。
- 根目录：手工台账需求、P0.1 菜单章节、API §21.1；scripts/check-role-permissions.cjs 新增真实接口绑定。
- 已通过：前端受影响文件 ESLint、pnpm type-check；路由权限及原表单测试 27 项；后端受影响文件 ESLint、tsc --noEmit、菜单测试 13 项、迁移命名检查；根角色权限检查（201 endpoints / 30 protected routes / 35 role-scope cases）。
- 表单和 Service 未改动：独立站 source 提示客户姓名、接单账号固定独立站且 receivingGroupId=null；本业务操作计调/收客计调和 ROOT 代建分工校验继续沿用。
- 隔离 PostgreSQL 16 验证通过：用真实迁移 up/down SQL 在一次性、无网络/无挂载容器中检查 8 类旧授权，覆盖合法角色追加、原未开启菜单不追加、无资格角色不追加、其它键保留、版本更新、重复 up 不重复追加及 down；容器已清理，业务库未操作。
- 图标检查：沿用 el-icon-List，main.ts 已导入及注册。两仓 git diff --check 通过。未做浏览器验收；列表/表单/公共样式组件直接复用，原有表单未修改。

## AOCI 与交付状态

- aoci_maintain 返回 stopped/blocked，candidates=[]，pending_transactions=0，recovery_pending=false，third_party_conflict=false；没有正式索引写入或需要恢复的事务。
- 当前 logical_plan=5db96a2fa15b811a30864191b40ae6d8839692cdc3cde71bda5557216b888b33，batch_identity=a388629625d05909d30bcdfee8c055d8cc0d14a53ae8d47e8cb4dad7d698139a，35 个待处理目标，未签发候选。普通维护不支持按本任务路径缩小范围。
- scope status 确认 observed_evidence_review_required、observed_pending_review=7，混有其它任务的鉴权、操作日志、成团及文档漂移；不全局 acknowledge，也不裁剪或重写无关条目。
- 继续入口：独立索引维护任务核对当前 scope status/实时 Guide 与实际源码后重新规划；本次索引尚未对齐。
- 菜单迁移文件已准备但未对业务库执行。将来发布后需重新登录取得新菜单快照。

## 本地提交（用户后续授权）

- [x] 核对两仓全部变动，包括原有列宽修改；清理与原 HEAD 完全一致的冗余备份。
- [x] 后端 pnpm verify:release 通过（73 项迁移命名检查、全量 lint、Nest 构建）；前端新增纳入提交的盛旭台账及用户页 ESLint 通过；此前类型、路由和表单验证仍适用。
- [x] 两仓全部变动暂存并通过差异检查；由本次提交操作创建本地提交，不 push。最终提交身份与完成状态以两仓 Git 日志和工作区为准。
- 根需求/API 文档及 scripts/check-role-permissions.cjs 位于仓库外，不进入任一子仓提交；保留本地修改，不复制共享合同。
