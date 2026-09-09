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
pnpm dev-local
```

默认访问 `http://localhost:3000`；若端口被占用，以终端输出的地址为准。

默认开发配置位于 `.env.development`，本地后端配置位于 `.env.dev-local`。`/api` 请求由 Vite 代理到对应环境的 `VITE_APP_API_URL`。

```dotenv
VITE_APP_PORT=3000
VITE_APP_TITLE=Sunrise TravelOps
VITE_APP_BASE_API=/api
VITE_APP_API_URL=https://api-dev.sunrisevacation.cn
```
