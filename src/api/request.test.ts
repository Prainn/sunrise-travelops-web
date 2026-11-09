import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  accessToken: "old-access",
  refreshToken: "old-refresh",
  sessionState: null as { sessionId: string; version: number } | null,
  setTokens: vi.fn(),
  clearAuth: vi.fn(),
}));

const translations = vi.hoisted(() => ({ messages: {} as Record<string, string> }));

vi.mock("@/utils/auth-storage", () => ({
  AuthStorage: {
    getAccessToken: () => auth.accessToken,
    getRefreshToken: () => auth.refreshToken,
    getRememberMe: () => true,
    getSessionState: () => auth.sessionState,
    setTokens: auth.setTokens,
    clearAuth: auth.clearAuth,
  },
}));

vi.mock("@/utils/page-lifecycle", () => ({ reloadPageWithoutConfirmation: vi.fn() }));

vi.mock("@/lang/utils", () => ({
  translate: (key: string) => key,
  translateIfExists: (key: string) => translations.messages[key],
}));

import { sessionGate } from "@/utils/session-gate";
import { ApiError, request } from "./request";
import { requestErrorMessage } from "@/utils/version-conflict";

function response(status: number, code: string, data: unknown = null): Response {
  return new Response(JSON.stringify({ code, message: code, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function deferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((resolveResponse) => {
    resolve = resolveResponse;
  });
  return { promise, resolve };
}

describe("request session recovery", () => {
  beforeEach(() => {
    auth.accessToken = "old-access";
    auth.refreshToken = "old-refresh";
    auth.setTokens.mockReset().mockImplementation((accessToken: string, refreshToken: string) => {
      auth.accessToken = accessToken;
      auth.refreshToken = refreshToken;
    });
    auth.clearAuth.mockReset().mockImplementation(() => {
      auth.accessToken = "";
      auth.refreshToken = "";
    });
    auth.sessionState = null;
    translations.messages = {};
    sessionGate.resetForTest();
    vi.unstubAllGlobals();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("keeps tokens when refresh fails during a temporary outage and retries later", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(401, "AUTH_TOKEN_EXPIRED"))
      .mockResolvedValueOnce(response(503, "HTTP_503"))
      .mockResolvedValueOnce(response(401, "AUTH_TOKEN_EXPIRED"))
      .mockResolvedValueOnce(
        response(200, "SUCCESS", {
          accessToken: "new-access",
          refreshToken: "new-refresh",
        }),
      )
      .mockResolvedValueOnce(response(200, "SUCCESS", { id: "user-1" }));
    vi.stubGlobal("fetch", fetch);

    await expect(request.get("/auth/me")).rejects.toMatchObject({ status: 503 });
    expect(auth.clearAuth).not.toHaveBeenCalled();
    expect(auth.refreshToken).toBe("old-refresh");

    await expect(request.get("/auth/me")).resolves.toEqual({ id: "user-1" });
    expect(auth.accessToken).toBe("new-access");
    expect(auth.refreshToken).toBe("new-refresh");
    expect(auth.clearAuth).not.toHaveBeenCalled();
  });

  it("clears tokens when the server confirms the refresh token is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response(401, "AUTH_TOKEN_EXPIRED"))
        .mockResolvedValueOnce(response(401, "AUTH_REFRESH_TOKEN_INVALID")),
    );

    await expect(request.get("/auth/me")).rejects.toMatchObject({
      code: "AUTH_REFRESH_TOKEN_INVALID",
    });
    expect(auth.clearAuth).toHaveBeenCalledOnce();
  });

  it("clears tokens when refresh is rejected with any other 401 code", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response(401, "AUTH_TOKEN_EXPIRED"))
        .mockResolvedValueOnce(response(401, "AUTH_SESSION_REVOKED")),
    );

    await expect(request.get("/auth/me")).rejects.toMatchObject({ status: 401 });
    expect(auth.clearAuth).toHaveBeenCalledOnce();
  });

  it("displays the server reason instead of the localized generic error", async () => {
    translations.messages = { "apiErrors.ITINERARY_RESOURCE_DUPLICATE": "通用错误" };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: "ITINERARY_RESOURCE_DUPLICATE",
            message: "行程中不可重复使用非标准价景点或餐食",
            data: null,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(request.post("/itineraries/id/quote-calculation", {})).rejects.toMatchObject({
      code: "ITINERARY_RESOURCE_DUPLICATE",
      message: "行程中不可重复使用非标准价景点或餐食",
      serverMessage: "行程中不可重复使用非标准价景点或餐食",
    });
  });

  it.each([
    { name: "array", details: ["field error"], expected: undefined },
    { name: "object", details: { field: ["field error"] }, expected: { field: ["field error"] } },
  ])("normalizes $name error details without losing diagnostics", async ({ details, expected }) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: "BAD_REQUEST",
            message: "Request rejected",
            data: null,
            details,
            path: "/api/example",
            requestId: "request-1",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(request.get("/example")).rejects.toMatchObject({
      code: "BAD_REQUEST",
      serverMessage: "Request rejected",
      status: 400,
      details: expected,
      path: "/api/example",
      requestId: "request-1",
    });
  });

  it("prefers the localized business code message over the HTTP message", async () => {
    translations.messages = {
      "apiErrors.BAD_REQUEST": "业务错误",
      "apiErrors.HTTP_400": "HTTP 错误",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "BAD_REQUEST" }), { status: 400 })));

    await expect(request.get("/example")).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "业务错误",
      serverMessage: undefined,
    });
  });

  it("uses the localized HTTP message when the business code has no translation", async () => {
    translations.messages = { "apiErrors.HTTP_400": "HTTP 错误" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "UNKNOWN_CODE" }), { status: 400 })));

    await expect(request.get("/example")).rejects.toMatchObject({
      code: "UNKNOWN_CODE",
      message: "HTTP 错误",
    });
  });

  it.each(["json", "upload", "blob"])("preserves the exact ledger rejection in %s requests", async (kind) => {
    translations.messages = { "apiErrors.VALIDATION_ERROR": "输入有误，请检查后重试" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "VALIDATION_ERROR", message: "请使用成团操作修改订单状态", data: null,
    }), { status: 400 })));

    const result = kind === "blob"
      ? request.getBlob("/export")
      : kind === "upload"
        ? request.post("/upload", new FormData())
        : request.put("/ledgers/direct/ledger-1", { orderStatus: "converted" });
    await expect(result).rejects.toMatchObject({
      message: "请使用成团操作修改订单状态", code: "VALIDATION_ERROR", status: 400,
    });
  });

  it.each([undefined, null, "", "  ", 42, ["invalid"]])("falls back when the message is invalid: %j", async (message) => {
    translations.messages = { "apiErrors.VALIDATION_ERROR": "输入有误，请检查后重试" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "VALIDATION_ERROR", message,
    }), { status: 400 })));
    await expect(request.get("/example")).rejects.toMatchObject({
      message: "输入有误，请检查后重试", serverMessage: undefined,
    });
  });

  it.each([
    ["INTERNAL_SERVER_ERROR", 500, "服务器内部错误"],
    ["TOO_MANY_REQUESTS", 429, "请求过于频繁，请稍后重试"],
  ])("localizes the fixed %s message instead of the server text", async (code, status, message) => {
    translations.messages = { [`apiErrors.${code}`]: "Localized" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code, message }), { status })));
    const error = await request.get("/example").catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code, message: "Localized", serverMessage: undefined });
    expect(requestErrorMessage(error)).toBe("Localized");
  });

  it("keeps a specific AUTH_FORBIDDEN reason from the server", async () => {
    translations.messages = { "apiErrors.AUTH_FORBIDDEN": "Forbidden" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "AUTH_FORBIDDEN", message: "只能删除当前本人负责的询盘",
    }), { status: 403 })));
    await expect(request.get("/example")).rejects.toMatchObject({ message: "只能删除当前本人负责的询盘" });
  });

  it("falls back for non-JSON proxy failures", async () => {
    translations.messages = { "apiErrors.HTTP_502": "服务暂不可用" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502 })));
    await expect(request.getBlob("/export")).rejects.toMatchObject({ message: "服务暂不可用" });
  });

  it("uses the generic fallback when neither the code nor HTTP status has a translation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 400 })));
    await expect(request.get("/example")).rejects.toMatchObject({ message: "apiErrors.REQUEST_FAILED" });
  });

  it("keeps an explicit conflict reason ahead of the version fallback", () => {
    const options = { code: "CONFLICT", details: { currentVersion: 8 } };
    expect(requestErrorMessage(new ApiError("通用冲突", {
      ...options, serverMessage: " 台账已由其他人修改，请刷新后重试 ",
    }))).toBe("台账已由其他人修改，请刷新后重试");
    expect(requestErrorMessage(new ApiError("通用冲突", options))).toBe("common.versionConflict");
  });

  it("shares one refresh between concurrent JSON and Blob requests", async () => {
    const refresh = deferredResponse();
    const fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url.endsWith("/auth/refresh")) return refresh.promise;
      if (new Headers(options?.headers).get("Authorization") === "Bearer old-access") {
        return response(401, "AUTH_TOKEN_EXPIRED");
      }
      if (url.endsWith("/document.pdf")) return new Response("%PDF-test");
      return response(200, "SUCCESS", { id: "user-1" });
    });
    vi.stubGlobal("fetch", fetch);

    const pending = Promise.all([request.get("/auth/me"), request.getBlob("/document.pdf")]);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    refresh.resolve(
      response(200, "SUCCESS", { accessToken: "new-access", refreshToken: "new-refresh" }),
    );

    const [user, blob] = await pending;
    expect(user).toEqual({ id: "user-1" });
    expect(await blob.text()).toBe("%PDF-test");
    expect(fetch.mock.calls.filter(([url]) => url.endsWith("/auth/refresh"))).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(auth.setTokens).toHaveBeenCalledOnce();
  });

  it("does not restore credentials when logout completes during refresh", async () => {
    const refresh = deferredResponse();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(401, "AUTH_TOKEN_EXPIRED"))
      .mockImplementationOnce(() => refresh.promise)
      .mockResolvedValueOnce(response(401, "AUTH_TOKEN_INVALID"));
    vi.stubGlobal("fetch", fetch);

    const rejected = expect(request.get("/auth/me")).rejects.toMatchObject({
      code: "AUTH_TOKEN_INVALID",
    });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    auth.clearAuth();
    refresh.resolve(
      response(200, "SUCCESS", { accessToken: "new-access", refreshToken: "new-refresh" }),
    );

    await rejected;
    expect(auth.setTokens).not.toHaveBeenCalled();
    expect(auth.accessToken).toBe("");
    expect(auth.refreshToken).toBe("");
    expect(new Headers(fetch.mock.calls[2]?.[1]?.headers).has("Authorization")).toBe(false);
  });

  it("keeps a new session when the previous session's refresh completes", async () => {
    const refresh = deferredResponse();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(401, "AUTH_TOKEN_EXPIRED"))
      .mockImplementationOnce(() => refresh.promise)
      .mockResolvedValueOnce(response(200, "SUCCESS", { id: "other-user" }));
    vi.stubGlobal("fetch", fetch);

    const pending = request.get("/auth/me");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    auth.accessToken = "other-access";
    auth.refreshToken = "other-refresh";
    refresh.resolve(
      response(200, "SUCCESS", { accessToken: "new-access", refreshToken: "new-refresh" }),
    );

    await expect(pending).resolves.toEqual({ id: "other-user" });
    expect(auth.setTokens).not.toHaveBeenCalled();
    expect(auth.accessToken).toBe("other-access");
    expect(auth.refreshToken).toBe("other-refresh");
    expect(new Headers(fetch.mock.calls[2]?.[1]?.headers).get("Authorization")).toBe("Bearer other-access");
  });

  it("retries with tokens already rotated by another tab instead of refreshing again", async () => {
    let release!: () => void;
    const lockHeld = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal("navigator", {
      locks: { request: async (_name: string, task: () => Promise<void>) => (await lockHeld, task()) },
    });
    const fetch = vi.fn(async (_url: string, options?: RequestInit) =>
      new Headers(options?.headers).get("Authorization") === "Bearer old-access"
        ? response(401, "AUTH_TOKEN_EXPIRED")
        : response(200, "SUCCESS", { id: "user-1" }),
    );
    vi.stubGlobal("fetch", fetch);

    const pending = request.get("/auth/me");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    auth.accessToken = "tab-b-access";
    auth.refreshToken = "tab-b-refresh";
    release();

    await expect(pending).resolves.toEqual({ id: "user-1" });
    expect(fetch.mock.calls.some(([url]) => url.endsWith("/auth/refresh"))).toBe(false);
    expect(auth.clearAuth).not.toHaveBeenCalled();
  });

  it("keeps the session when another tab replaced the refresh token that was rejected", async () => {
    const refresh = deferredResponse();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(401, "AUTH_TOKEN_EXPIRED"))
      .mockImplementationOnce(() => refresh.promise)
      .mockResolvedValueOnce(response(200, "SUCCESS", { id: "user-1" }));
    vi.stubGlobal("fetch", fetch);

    const pending = request.get("/auth/me");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    auth.refreshToken = "tab-b-refresh";
    refresh.resolve(response(401, "AUTH_REFRESH_TOKEN_INVALID"));

    await expect(pending).resolves.toEqual({ id: "user-1" });
    expect(auth.clearAuth).not.toHaveBeenCalled();
  });
});

describe("request account switch gate", () => {
  beforeEach(() => {
    auth.accessToken = "old-access";
    auth.refreshToken = "old-refresh";
    auth.sessionState = null;
    auth.setTokens.mockReset();
    auth.clearAuth.mockReset();
    sessionGate.resetForTest();
    vi.unstubAllGlobals();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("sends a JSON body with DELETE", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);

    await request.delete("/system/account-links/1", { body: { version: 2 } });

    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("DELETE");
    expect(init.body).toBe(JSON.stringify({ version: 2 }));
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("rejects new requests while frozen but lets the switch flow through", async () => {
    const fetch = vi.fn().mockResolvedValue(response(200, "SUCCESS", { ok: true }));
    vi.stubGlobal("fetch", fetch);
    sessionGate.freeze();

    await expect(request.post("/inquiries", {})).rejects.toMatchObject({
      code: "ACCOUNT_SWITCH_IN_PROGRESS",
    });
    expect(fetch).not.toHaveBeenCalled();

    await expect(
      request.post("/auth/switch-account", {}, { bypassSessionGate: true }),
    ).resolves.toEqual({ ok: true });
  });

  it("drops a response from the replaced identity without refreshing or retrying", async () => {
    const pending = deferredResponse();
    const fetch = vi.fn().mockReturnValueOnce(pending.promise);
    vi.stubGlobal("fetch", fetch);

    const result = request.get("/inquiries");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    sessionGate.retire();
    pending.resolve(response(401, "AUTH_TOKEN_EXPIRED"));

    await expect(result).rejects.toMatchObject({ code: "ACCOUNT_SESSION_CHANGED" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(auth.setTokens).not.toHaveBeenCalled();
    expect(auth.clearAuth).not.toHaveBeenCalled();
  });

  it("refuses requests once the stored session version moved past this page", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    sessionGate.setKnown({ sessionId: "s1", version: 1 });
    auth.sessionState = { sessionId: "s1", version: 2 };

    await expect(request.get("/inquiries")).rejects.toMatchObject({
      code: "ACCOUNT_SESSION_CHANGED",
    });
    expect(sessionGate.isRetired()).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("tracks in-flight writes but not reads", async () => {
    const write = deferredResponse();
    const read = deferredResponse();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValueOnce(write.promise).mockReturnValueOnce(read.promise),
    );

    const saving = request.put("/inquiries/1", {});
    const loading = request.get("/inquiries");
    await vi.waitFor(() => expect(sessionGate.pendingWrites()).toBe(1));
    write.resolve(response(200, "SUCCESS", null));
    read.resolve(response(200, "SUCCESS", []));
    await Promise.all([saving, loading]);
    expect(sessionGate.pendingWrites()).toBe(0);
  });

  it("leaves 401 handling to the caller when handleUnauthorized is false", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(401, "AUTH_TOKEN_EXPIRED"));
    vi.stubGlobal("fetch", fetch);

    await expect(
      request.post("/auth/switch-account", {}, { handleUnauthorized: false }),
    ).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(auth.clearAuth).not.toHaveBeenCalled();
  });

  it("aborts a stalled request after the timeout and reports REQUEST_TIMEOUT", async () => {
    const fetch = vi.fn(
      (_url: string, options?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => reject(new DOMException("", "AbortError")));
        }),
    );
    vi.stubGlobal("fetch", fetch);

    await expect(request.get("/inquiries", { timeoutMs: 10 })).rejects.toMatchObject({
      code: "REQUEST_TIMEOUT",
    });
  });

  it("applies the timeout while the response body is still streaming", async () => {
    const fetch = vi.fn(async (_url: string, options?: RequestInit) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          options?.signal?.addEventListener("abort", () =>
            controller.error(new DOMException("", "AbortError")),
          );
        },
      });
      return new Response(body, { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetch);

    await expect(request.get("/inquiries", { timeoutMs: 10 })).rejects.toMatchObject({
      code: "REQUEST_TIMEOUT",
    });
  });

  it("keeps caller cancellation as a network error", async () => {
    const fetch = vi.fn(
      (_url: string, options?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => reject(new DOMException("", "AbortError")));
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();

    const pending = request.get("/inquiries", { signal: controller.signal });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});
