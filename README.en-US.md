# Sunrise TravelOps Local Development

Requirements: Node.js 24 and pnpm 11.

1. Configure and start the local backend using its README. The default backend URL is `http://localhost:4000`.
2. Install dependencies and start the frontend from this repository:

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. If the port is occupied, use the URL printed in the terminal.

Development settings are in `.env.development`:

```dotenv
VITE_APP_PORT=3000
VITE_APP_TITLE=Sunrise TravelOps
VITE_APP_BASE_API=/api
VITE_APP_API_URL=http://localhost:4000
```

Vite proxies `/api` requests to `VITE_APP_API_URL`. Update this setting and restart the frontend development server when the local backend address or port changes.
