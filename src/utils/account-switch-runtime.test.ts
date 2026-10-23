import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  reload: vi.fn(),
  state: { sessionId: "s1", version: 1 },
}));

vi.mock("element-plus", () => ({ ElLoading: { service: vi.fn() } }));
vi.mock("@/api/request", () => ({ isApiError: vi.fn(), runWithRefreshLock: vi.fn() }));
vi.mock("@/composables/useAccountSwitchGuard", () => ({ getEditBlockers: () => [] }));
vi.mock("@/lang/utils", () => ({ translate: (key: string) => key }));
vi.mock("@/router", () => ({ default: {} }));
vi.mock("@/router/access", () => ({ hasRouteChainAccess: vi.fn() }));
vi.mock("@/services", () => ({
  authService: { getCurrentUser: mocks.getCurrentUser }, userService: {},
}));
vi.mock("@/services/resource-options-cache", () => ({ clearResourceOptionsCache: vi.fn() }));
vi.mock("@/stores/dict", () => ({ useDictStoreHook: vi.fn() }));
vi.mock("@/utils/auth-storage", () => ({
  AuthStorage: { getAccessToken: () => "token", getSessionState: () => mocks.state },
}));
vi.mock("@/utils/page-lifecycle", () => ({
  navigateWithoutConfirmation: vi.fn(), reloadPageWithoutConfirmation: mocks.reload,
}));

import { sessionGate } from "./session-gate";
import { setupAccountSwitchSync } from "./account-switch-runtime";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("account switch page presence", () => {
  let page: EventTarget;
  let doc: EventTarget & { visibilityState: string };
  let held: Set<{ name: string }>;
  let stop: (() => void) | undefined;

  const presenceNames = () => [...held].map((lock) => lock.name);
  function transition(type: string, persisted = false) {
    page.dispatchEvent(Object.assign(new Event(type), { persisted }));
  }

  beforeEach(() => {
    vi.clearAllMocks();
    sessionGate.resetForTest();
    mocks.state = { sessionId: "s1", version: 1 };
    mocks.getCurrentUser.mockResolvedValue({ sessionId: "s1", sessionVersion: 1 });
    sessionGate.setKnown(mocks.state);
    page = new EventTarget();
    doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
    held = new Set();
    vi.stubGlobal("window", page);
    vi.stubGlobal("document", doc);
    vi.stubGlobal("navigator", {
      locks: {
        async request(name: string, task: () => Promise<void>) {
          const lock = { name };
          held.add(lock);
          try {
            await task();
          } finally {
            held.delete(lock);
          }
        },
      },
    });
    vi.stubGlobal("BroadcastChannel", class {
      postMessage() {}
    });
    stop = setupAccountSwitchSync();
  });

  afterEach(async () => {
    stop?.();
    stop = undefined;
    await flush();
    sessionGate.resetForTest();
    vi.unstubAllGlobals();
  });

  it.each([false, true])("releases a departing document (persisted=%s) and ignores late identity updates", async (persisted) => {
    expect(presenceNames()).toHaveLength(1);
    transition("pagehide", persisted);
    sessionGate.setKnown({ sessionId: "s1", version: 2 });
    await flush();

    expect(presenceNames()).toEqual([]);
  });

  it("retains presence when a real tab only moves into the background", async () => {
    const original = presenceNames();
    doc.visibilityState = "hidden";
    doc.dispatchEvent(new Event("visibilitychange"));
    sessionGate.setKnown({ sessionId: "s1", version: 1 });
    await flush();

    expect(presenceNames()).toEqual(original);
  });

  it("restores presence and verifies the session when returning from the page cache", async () => {
    transition("pagehide", true);
    await flush();
    expect(presenceNames()).toEqual([]);

    transition("pageshow", true);
    await sessionGate.waitVerified();

    expect(presenceNames()).toHaveLength(1);
    expect(presenceNames()[0]).toMatch(/^sunrise-account-switch:s1:tab:/);
    expect(mocks.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(mocks.reload).not.toHaveBeenCalled();
  });

  it("reloads a restored document if its session version was switched while away", async () => {
    transition("pagehide", true);
    await flush();
    mocks.state = { sessionId: "s1", version: 2 };
    transition("pageshow", true);

    expect(sessionGate.isRetired()).toBe(true);
    expect(mocks.reload).toHaveBeenCalledTimes(1);
  });

  it("cleans up presence and prevents lifecycle events from registering it again", async () => {
    stop?.();
    stop = undefined;
    transition("pageshow", true);
    sessionGate.setKnown(mocks.state);
    await flush();

    expect(presenceNames()).toEqual([]);
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
  });
});
