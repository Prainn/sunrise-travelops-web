import type { Environment } from "vitest/environments";

// Vue's custom renderer needs client compilation but does not need a browser DOM.
export default {
  name: "website-resource-renderer",
  viteEnvironment: "client",
  setup() {
    return { teardown() {} };
  },
} satisfies Environment;
