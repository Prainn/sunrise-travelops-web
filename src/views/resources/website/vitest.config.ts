import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// Page tests use explicit component stubs, without app-wide auto-import/style generation.
export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { "@": fileURLToPath(new URL("../../../", import.meta.url)) } },
  test: {
    include: ["src/views/resources/website/*.test.ts"],
    environment: fileURLToPath(new URL("./vitest.environment.ts", import.meta.url)),
  },
});
