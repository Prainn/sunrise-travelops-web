# Sunrise TravelOps 本地开发

环境要求：Node.js 24、pnpm 11。

在当前前端仓库目录安装依赖并启动：

```bash
pnpm install
pnpm dev
```

`pnpm dev` 默认访问线上开发 API：`https://api-dev.sunrisevacation.cn/api`。

如需访问本地后端开发服务（默认为 `http://localhost:4000`），请先启动后端，再运行：

```bash
pnpm dev:local
```

默认访问 `http://localhost:3000`；若端口被占用，以终端输出的地址为准。

默认开发配置位于 `.env.development`，本地后端配置位于 `.env.dev-local`。`/api` 请求由 Vite 代理到对应环境的 `VITE_APP_API_URL`。

```dotenv
VITE_APP_PORT=3000
VITE_APP_TITLE=Sunrise TravelOps
VITE_APP_BASE_API=/api
VITE_APP_API_URL=https://api-dev.sunrisevacation.cn
```

## 验证

`pnpm test` 统一运行普通单元测试、RemoteSelect SSR 测试和独立站组件 renderer 测试。根 `vitest.config.ts` 按现有专用配置分组，避免应用的 Element Plus 样式自动导入干扰 Node 测试，且每个测试文件只执行一次。

定向验证仍使用 `pnpm test <测试文件>`；类型检查使用 `pnpm type-check`，提交前执行 `pnpm lint`。这些测试不连接业务数据库。

## Deployment

Daily development uses `dev`; pushes deploy dev through the ECS self-hosted runner. `main` requires a verified PR and a manual production deployment. Root `node deploy-web` only dispatches dev Actions. See [deployment guide](../docs/deployment/前端自动部署.md) for rollback and cutover prerequisites.
