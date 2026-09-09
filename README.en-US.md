# Sunrise TravelOps Local Development

Requirements: Node.js 24 and pnpm 11.

Install dependencies and start the frontend from this repository:

```bash
pnpm install
pnpm dev
```

`pnpm dev` uses the online development API at `https://api-dev.sunrisevacation.cn/api` by default.

To use the local backend development service (at `http://localhost:4000` by default), start the backend first and then run:

```bash
pnpm dev-local
```

Open `http://localhost:3000`. If the port is occupied, use the URL printed in the terminal.

The default development settings are in `.env.development`, and the local-backend settings are in `.env.dev-local`. Vite proxies `/api` requests to the corresponding environment's `VITE_APP_API_URL`.

```dotenv
VITE_APP_PORT=3000
VITE_APP_TITLE=Sunrise TravelOps
VITE_APP_BASE_API=/api
VITE_APP_API_URL=https://api-dev.sunrisevacation.cn
```
