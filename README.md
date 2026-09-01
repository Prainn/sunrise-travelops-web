# Sunrise TravelOps

当前仓库是 Sunrise TravelOps P0 交互原型。登录、Token 刷新、退出和当前用户权限已接入本地后端，其他业务模块仍使用前端 mock 数据和运行时内存状态。仓库内需求基线见 [完整重构需求说明](docs/Sunrise%20TravelOps%20完全重构需求说明.md)、[P0 需求说明](docs/Sunrise%20TravelOps%20P0需求说明.md) 和 [前端接入后端待办](docs/backend-integration-todo.md)。

本地开发默认将 `/api` 代理到 `http://localhost:4000`。启动前端前请先启动后端，然后执行 `pnpm dev`。
