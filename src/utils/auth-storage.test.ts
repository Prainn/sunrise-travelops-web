import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/constants";
import { AuthStorage, setupAuthSessionSync } from "./auth-storage";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
  };
}

const reload = vi.fn();
let tab: EventTarget;
let cleanupSync: () => void;

function notifyOtherTab(key: string | null, storageArea = localStorage) {
  tab.dispatchEvent(Object.assign(new Event("storage"), { key, storageArea }));
}

describe("shared login session synchronization", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
    vi.stubGlobal("sessionStorage", memoryStorage());
    tab = new EventTarget();
    reload.mockReset();
    vi.stubGlobal("window", Object.assign(tab, { location: { reload } }));
    AuthStorage.setLoginTokens("old-access", "old-refresh", true);
    cleanupSync = setupAuthSessionSync();
  });
  afterEach(() => {
    cleanupSync();
    vi.unstubAllGlobals();
  });

  it("reloads the old tab after a new login without clearing the new credentials", () => {
    const oldSession = localStorage.getItem(STORAGE_KEYS.LOGIN_SESSION);
    reload.mockImplementation(() => {
      expect(AuthStorage.getAccessToken()).toBe("new-access");
      expect(AuthStorage.getRefreshToken()).toBe("new-refresh");
    });

    AuthStorage.setLoginTokens("new-access", "new-refresh", true);
    expect(localStorage.getItem(STORAGE_KEYS.LOGIN_SESSION)).not.toBe(oldSession);
    // storage 只通知其他标签页，本页登录不会重载。
    expect(reload).not.toHaveBeenCalled();
    notifyOtherTab(STORAGE_KEYS.LOGIN_SESSION);

    expect(reload).toHaveBeenCalledOnce();
    expect(AuthStorage.getAccessToken()).toBe("new-access");
  });

  it("keeps the session marker and existing page state during ordinary token refresh", () => {
    const session = localStorage.getItem(STORAGE_KEYS.LOGIN_SESSION);

    AuthStorage.setTokens("refreshed-access", "refreshed-refresh", true);
    notifyOtherTab(STORAGE_KEYS.ACCESS_TOKEN);
    notifyOtherTab(STORAGE_KEYS.REFRESH_TOKEN);

    expect(localStorage.getItem(STORAGE_KEYS.LOGIN_SESSION)).toBe(session);
    expect(reload).not.toHaveBeenCalled();
    expect(AuthStorage.getAccessToken()).toBe("refreshed-access");
  });

  it("reloads the old shared tab on logout with credentials already cleared", () => {
    AuthStorage.clearAuth();
    notifyOtherTab(STORAGE_KEYS.LOGIN_SESSION);

    expect(reload).toHaveBeenCalledOnce();
    expect(AuthStorage.getAccessToken()).toBe("");
    expect(localStorage.getItem(STORAGE_KEYS.LOGIN_SESSION)).toBeNull();
  });

  it("invalidates the old shared session when login switches off remember me", () => {
    AuthStorage.setLoginTokens("private-access", "private-refresh", false);
    notifyOtherTab(STORAGE_KEYS.LOGIN_SESSION);

    expect(reload).toHaveBeenCalledOnce();
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.LOGIN_SESSION)).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe('"private-access"');
  });

  it("ignores unrelated preferences and private storage, but handles shared storage clearing", () => {
    notifyOtherTab(STORAGE_KEYS.THEME);
    notifyOtherTab(STORAGE_KEYS.LOGIN_SESSION, sessionStorage);
    expect(reload).not.toHaveBeenCalled();

    localStorage.clear();
    notifyOtherTab(null);
    expect(reload).toHaveBeenCalledOnce();
    expect(AuthStorage.getAccessToken()).toBe("");
  });
});

describe("private session token rotation across opened tabs", () => {
  const CHANNEL = "sunrise-auth-session-tokens";
  let otherTab: BroadcastChannel;

  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
    vi.stubGlobal("sessionStorage", memoryStorage());
    vi.stubGlobal("window", new EventTarget());
    AuthStorage.setLoginTokens("old-access", "old-refresh", false);
    cleanupSync = setupAuthSessionSync();
    otherTab = new BroadcastChannel(CHANNEL);
  });
  afterEach(() => {
    otherTab.close();
    cleanupSync();
    vi.unstubAllGlobals();
  });

  function nextMessage(): Promise<unknown> {
    return new Promise((resolve) => {
      otherTab.onmessage = (event) => resolve(event.data);
    });
  }

  function receiveRotation(previousRefreshToken: string): Promise<void> {
    otherTab.postMessage({ previousRefreshToken, accessToken: "new-access", refreshToken: "new-refresh" });
    return new Promise((resolve) => setTimeout(resolve, 20));
  }

  it("announces a refresh so copies of the same session keep a valid refresh token", async () => {
    const message = nextMessage();
    AuthStorage.setTokens("new-access", "new-refresh", false);

    await expect(message).resolves.toEqual({
      previousRefreshToken: "old-refresh",
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
  });

  it("adopts a rotation of its own refresh token", async () => {
    await receiveRotation("old-refresh");

    expect(AuthStorage.getAccessToken()).toBe("new-access");
    expect(AuthStorage.getRefreshToken()).toBe("new-refresh");
  });

  it("ignores rotations from other sessions and in remember-me mode", async () => {
    await receiveRotation("someone-else-refresh");
    expect(AuthStorage.getRefreshToken()).toBe("old-refresh");

    AuthStorage.setLoginTokens("shared-access", "shared-refresh", true);
    await receiveRotation("old-refresh");
    expect(AuthStorage.getRefreshToken()).toBe("shared-refresh");
    expect(sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
  });
});
