import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/request", () => ({
  request: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    getBlob: vi.fn(),
  },
}));

import { request } from "@/api/request";
import { authService } from "./auth.service";

const getMock = vi.mocked(request.get);
const postMock = vi.mocked(request.post);

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the unified client for login, refresh, logout, and current user", async () => {
    const tokens = {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      tokenType: "Bearer" as const,
      expiresIn: 900,
    };
    postMock.mockResolvedValueOnce(tokens)
      .mockResolvedValueOnce(tokens)
      .mockResolvedValueOnce(undefined);
    getMock.mockResolvedValue({
      id: "user-1",
      username: "admin",
      permissions: ["user:read"],
    });

    await expect(authService.login({
      username: "admin",
      password: "secret123",
    })).resolves.toEqual(tokens);
    await expect(authService.refreshToken("refresh-token")).resolves.toEqual(tokens);
    await authService.logout();
    await expect(authService.getCurrentUser()).resolves.toMatchObject({ username: "admin" });

    expect(postMock).toHaveBeenNthCalledWith(
      1,
      "/auth/login",
      { username: "admin", password: "secret123" },
      { requiresAuth: false }
    );
    expect(postMock).toHaveBeenNthCalledWith(
      2,
      "/auth/refresh",
      { refreshToken: "refresh-token" },
      { requiresAuth: false }
    );
    expect(postMock).toHaveBeenNthCalledWith(3, "/auth/logout");
    expect(getMock).toHaveBeenCalledWith("/auth/me");
  });

  it("preserves ApiError values from login", async () => {
    const error = Object.assign(new Error("用户名或密码错误"), {
      name: "ApiError",
      code: "AUTH_INVALID_CREDENTIALS",
      status: 401,
    });
    postMock.mockRejectedValue(error);

    await expect(authService.login({
      username: "admin",
      password: "wrong-password",
    })).rejects.toBe(error);
  });
});
