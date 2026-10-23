import { afterEach, describe, expect, it, vi } from "vitest";
import en from "@/lang/package/en.json";
import zhCn from "@/lang/package/zh-cn.json";

vi.mock("@/utils/auth-storage", () => ({
  AuthStorage: {
    getAccessToken: () => "access",
    getRefreshToken: () => "refresh",
    getRememberMe: () => true,
    setTokens: vi.fn(),
    clearAuth: vi.fn(),
  },
}));

vi.mock("@/lang/utils", async () => {
  const { default: messages } = await import("@/lang/package/zh-cn.json");
  const lookup = (key: string) =>
    key.split(".").reduce<unknown>(
      (value, part) => (value as Record<string, unknown> | undefined)?.[part],
      messages,
    ) as string | undefined;
  return { translate: (key: string) => lookup(key) ?? key, translateIfExists: lookup };
});

import { ApiErrorCode } from "./error-code";
import { request } from "./request";

/** API §21.6 台账业务冲突码。 */
const LEDGER_CODES = Object.values(ApiErrorCode).filter((code) =>
  /^(LEDGER|SHENGXU_LEDGER|DIRECT_LEDGER)_/.test(code),
);

describe("ledger conflict error codes", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("translates all contract codes in both languages", () => {
    expect(LEDGER_CODES).toContain(ApiErrorCode.DIRECT_LEDGER_OPERATION_PREREQUISITES_NOT_MET);
    for (const code of LEDGER_CODES) {
      expect(zhCn.apiErrors).toHaveProperty(code);
      expect(en.apiErrors).toHaveProperty(code);
    }
  });

  it.each([
    ["LEDGER_VERSION_CONFLICT", "记录已更新，请刷新重试"],
    ["DIRECT_LEDGER_DELETE_OPERATED", "曾操作的台账不能删除"],
  ])("localizes 409 %s by code instead of the generic conflict", async (code, message) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code, message: "服务端原文", data: null }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(request.delete("/ledgers/direct/id", { params: { version: 1 } })).rejects.toMatchObject({
      code,
      status: 409,
      message,
    });
  });
});
