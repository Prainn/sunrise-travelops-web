import { configDefaults, defineConfig } from "vitest/config";
import remoteSelect from "./src/components/RemoteSelect/vitest.config.js";
import websiteRenderer from "./src/views/resources/website/vitest.config.js";

// 专用组件测试不经过应用的样式自动导入，且只在各自的执行环境中运行一次。
export default defineConfig({
  test: {
    projects: [
      {
        extends: "./vite.config.ts",
        test: {
          name: "unit",
          exclude: [
            ...configDefaults.exclude,
            ...remoteSelect.test!.include!,
            ...websiteRenderer.test!.include!,
          ],
        },
      },
      { ...remoteSelect, test: { ...remoteSelect.test, name: "remote-select" } },
      { ...websiteRenderer, test: { ...websiteRenderer.test, name: "website-renderer" } },
    ],
  },
});
