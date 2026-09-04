import { beforeEach, describe, expect, it, vi } from "vitest";

const authStorageMock = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  getRememberMe: vi.fn(),
  setTokens: vi.fn(),
  clearAuth: vi.fn(),
}));

vi.mock("@/utils/auth-storage", () => ({ AuthStorage: authStorageMock }));

import { ApiError, isApiError, request } from "./request";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function success<T>(data: T) {
  return { code: "SUCCESS", message: "success", data } as const;
}

function errorResponse(status: number, code: string, message: string) {
  return jsonResponse({
    code,
    message,
    data: null,
    timestamp: "2026-09-04T00:00:00.000Z",
    path: "/api/test",
  }, status);
}

describe("request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    authStorageMock.getAccessToken.mockReturnValue("");
    authStorageMock.getRefreshToken.mockReturnValue("");
    authStorageMock.getRememberMe.mockReturnValue(false);
  });

  it("unwraps the unified success envelope and serializes query parameters", async () => {
    fetchMock.mockResolvedValue(jsonResponse(success([{ value: 1, label: "系统管理部" }])));

    await expect(request.get<Array<{ value: number; label: string }>>("/departments", {
      params: {
        page: 2,
        enabled: true,
        empty: undefined,
        createTime: ["2026-09-01", "2026-09-02"],
      },
    })).resolves.toEqual([{ value: 1, label: "系统管理部" }]);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/departments?page=2&enabled=true&createTime=2026-09-01&createTime=2026-09-02",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("sends mutation bodies as JSON and returns business data", async () => {
    fetchMock.mockResolvedValue(jsonResponse(success({ id: "inquiry-1" })));

    await expect(request.patch<{ id: string }>(
      "/inquiries/inquiry-1",
      { name: "Updated" }
    )).resolves.toEqual({ id: "inquiry-1" });

    const [, init] = fetchMock.mock.calls[0];
    expect(init).toEqual(expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
    }));
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
  });

  it("preserves validation details and request metadata on ApiError", async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      code: "VALIDATION_ERROR",
      message: "请求参数校验失败",
      data: null,
      details: {
        username: ["用户名格式不正确"],
        password: ["密码长度不能少于 8 位"],
      },
      timestamp: "2026-09-04T00:00:00.000Z",
      path: "/api/auth/login",
      requestId: "request-1",
    }, 400));

    const error = await request.post("/auth/login", {}, { requiresAuth: false })
      .catch((caught: unknown) => caught);

    expect(isApiError(error)).toBe(true);
    expect(error).toMatchObject({
      name: "ApiError",
      code: "VALIDATION_ERROR",
      message: "请求参数校验失败",
      status: 400,
      details: {
        username: ["用户名格式不正确"],
        password: ["密码长度不能少于 8 位"],
      },
      path: "/api/auth/login",
      requestId: "request-1",
    });
  });

  it.each([
    [403, "AUTH_FORBIDDEN"],
    [404, "INQUIRY_NOT_FOUND"],
    [409, "INQUIRY_NOT_EDITABLE"],
    [429, "RATE_LIMIT_EXCEEDED"],
  ])("converts HTTP %i responses to ApiError without clearing auth", async (status, code) => {
    fetchMock.mockResolvedValue(errorResponse(status, code, "请求失败"));

    await expect(request.get("/test")).rejects.toMatchObject({ status, code });
    expect(authStorageMock.clearAuth).not.toHaveBeenCalled();
  });

  it("converts fetch failures to NETWORK_ERROR", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(request.get("/test")).rejects.toEqual(expect.objectContaining({
      name: "ApiError",
      code: "NETWORK_ERROR",
      message: "网络连接失败，请稍后重试",
    }));
  });

  it("refreshes once and retries the original authenticated request", async () => {
    authStorageMock.getAccessToken.mockReturnValueOnce("expired-access-token")
      .mockReturnValue("new-access-token");
    authStorageMock.getRefreshToken.mockReturnValue("refresh-token");
    authStorageMock.getRememberMe.mockReturnValue(true);
    fetchMock
      .mockResolvedValueOnce(errorResponse(401, "AUTH_TOKEN_EXPIRED", "登录已过期"))
      .mockResolvedValueOnce(jsonResponse(success({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        tokenType: "Bearer",
        expiresIn: 900,
      })))
      .mockResolvedValueOnce(jsonResponse(success({ id: "user-1" })));

    await expect(request.get<{ id: string }>("/auth/me")).resolves.toEqual({ id: "user-1" });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/refresh");
    expect(authStorageMock.setTokens).toHaveBeenCalledWith(
      "new-access-token",
      "new-refresh-token",
      true
    );
  });

  it("clears auth when refresh fails", async () => {
    authStorageMock.getAccessToken.mockReturnValue("expired-access-token");
    authStorageMock.getRefreshToken.mockReturnValue("invalid-refresh-token");
    fetchMock
      .mockResolvedValueOnce(errorResponse(401, "AUTH_TOKEN_EXPIRED", "登录已过期"))
      .mockResolvedValueOnce(errorResponse(401, "AUTH_REFRESH_TOKEN_INVALID", "登录已失效"));

    await expect(request.get("/auth/me")).rejects.toMatchObject({
      code: "AUTH_REFRESH_TOKEN_INVALID",
      status: 401,
    });
    expect(authStorageMock.clearAuth).toHaveBeenCalledOnce();
  });

  it("returns blobs without applying JSON envelope parsing", async () => {
    const source = new Blob(["pdf-content"], { type: "application/pdf" });
    fetchMock.mockResolvedValue(new Response(source, {
      status: 200,
      headers: { "Content-Type": "application/pdf" },
    }));

    const result = await request.getBlob("/quotations/quotation-1/pdf");

    expect(result.type).toBe("application/pdf");
    expect(await result.text()).toBe("pdf-content");
  });

  it("accepts 204 responses for void operations", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(request.delete<void>("/users", {
      params: { ids: "user-1" },
    })).resolves.toBeUndefined();
  });

  it("rejects the old bare JSON response format", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "legacy-user" }));

    await expect(request.get("/auth/me")).rejects.toEqual(expect.objectContaining({
      name: "ApiError",
      code: "INVALID_API_RESPONSE",
    }));
  });

  it("exposes ApiError as an Error subclass", () => {
    const error = new ApiError("不可编辑", {
      code: "INQUIRY_NOT_EDITABLE",
      status: 409,
    });

    expect(error).toBeInstanceOf(Error);
    expect(isApiError(error)).toBe(true);
  });
});
