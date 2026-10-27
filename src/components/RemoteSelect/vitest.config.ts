import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// Use the real Element Plus controls without the app's style auto-import plugin.
export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { "@": fileURLToPath(new URL("../../", import.meta.url)) } },
  test: { include: ["src/components/RemoteSelect/*.test.ts"] },
});
