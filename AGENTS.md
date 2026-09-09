# Sunrise TravelOps Frontend

遵守 workspace 根目录 AGENTS.md；项目开发规范见 `.agents/skills/sunrise-travelops-frontend/SKILL.md`。

## 测试范围

- 测试以当前业务风险和可观察行为为依据，避免为了测试而测试。
- 普通页面、静态展示、简单字段绑定和事件透传不机械新增测试，不用实现细节或文字快照代替业务验证。
- 报价金额、人数与房间数、资源筛选和保存、防重复提交等关键规则保留必要的针对性验证。
- 优先调整现有相关测试，不新增只复述实现的断言；只运行本次相关检查。
