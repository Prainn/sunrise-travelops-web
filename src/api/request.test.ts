import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  accessToken: "old-access",
  refreshToken: "old-refresh",
  clearAuth: vi.fn(),
}));

vi.mock("@/utils/auth-storage", () => ({
  AuthStorage: {
    getAccessToken: () => auth.accessToken,
    getRefreshToken: () => auth.refreshToken,
    getRememberMe: () => true,
    setTokens: (accessToken: string, refreshToken: string) => {
      auth.accessToken = accessToken;
      auth.refreshToken = refreshToken;
    },
    clearAuth: auth.clearAuth,
  },
}));

vi.mock("@/lang/utils", () => ({
  translate: (key: string) => key,
  translateIfExists: () => undefined,
}));

import { request } from "./request";

function response(status: number, code: string, data: unknown = null): Response {
  return new Response(JSON.stringify({ code, message: code, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("request session recovery", () => {
  beforeEach(() => {
    auth.accessToken = "old-access";
    auth.refreshToken = "old-refresh";
    auth.clearAuth.mockClear();
    vi.unstubAllGlobals();
  });

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

  it("keeps the server error reason alongside the localized message", async () => {
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
      serverMessage: "行程中不可重复使用非标准价景点或餐食",
    });
  });
});
