# Sunrise TravelOps 本地开发

环境要求：Node.js 24、pnpm 11。

1. 先按后端项目 README 配置并启动本地后端，默认地址为 `http://localhost:4000`。
2. 在当前前端仓库目录安装依赖并启动：

```bash
pnpm install
pnpm dev
```

默认访问 `http://localhost:3000`；若端口被占用，以终端输出的地址为准。

开发配置位于 `.env.development`：

```dotenv
VITE_APP_PORT=3000
VITE_APP_TITLE=Sunrise TravelOps
VITE_APP_BASE_API=/api
VITE_APP_API_URL=http://localhost:4000
```

`/api` 请求由 Vite 代理到 `VITE_APP_API_URL`。本地后端地址或端口变化时，修改该配置并重启前端开发服务。
