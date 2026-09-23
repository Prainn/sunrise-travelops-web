import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  guard: undefined as ((to: unknown) => Promise<unknown>) | undefined,
  loggedIn: true,
  getUserInfo: vi.fn(),
  resetAllState: vi.fn(),
}));

vi.mock("@/router", () => ({
  default: {
    beforeEach: (guard: (to: unknown) => Promise<unknown>) => {
      state.guard = guard;
    },
    afterEach: vi.fn(),
  },
}));
vi.mock("@/plugins/nprogress", () => ({ default: { start: vi.fn(), done: vi.fn() } }));
vi.mock("@/router/access", () => ({ hasRouteChainAccess: () => true }));
vi.mock("@/stores/permission", () => ({
  usePermissionStore: () => ({ isRouteGenerated: false, generateRoutes: vi.fn() }),
}));
vi.mock("@/stores/user", () => ({
  useUserStore: () => ({
    isLoggedIn: () => state.loggedIn,
    userInfo: { username: "" },
    getUserInfo: state.getUserInfo,
    resetAllState: state.resetAllState,
  }),
}));

import { setupPermissionGuard } from "./permission";

const route = {
  path: "/dashboard",
  fullPath: "/dashboard",
  matched: [],
  params: {},
  query: {},
};

describe("permission guard during service outages", () => {
  beforeEach(() => {
    state.loggedIn = true;
    state.getUserInfo.mockReset();
    state.resetAllState.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    setupPermissionGuard();
  });

  it("keeps the session and offers a retry when loading the user fails", async () => {
    state.getUserInfo.mockRejectedValueOnce(new Error("Service unavailable"));

    await expect(state.guard?.(route)).resolves.toEqual({
      path: "/unavailable",
      query: { redirect: "/dashboard" },
      replace: true,
    });
    expect(state.resetAllState).not.toHaveBeenCalled();
    await expect(state.guard?.({ ...route, path: "/unavailable" })).resolves.toBeUndefined();
    expect(state.getUserInfo).toHaveBeenCalledOnce();
  });

  it("returns to login after credentials have been cleared", async () => {
    state.getUserInfo.mockImplementationOnce(() => {
      state.loggedIn = false;
      return Promise.reject(new Error("Invalid session"));
    });

    await expect(state.guard?.(route)).resolves.toBe("/login");
  });
});
