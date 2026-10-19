import { STORAGE_KEYS } from "@/constants";
import { Storage } from "@/utils/storage";
import { reloadPageWithoutConfirmation } from "@/utils/page-lifecycle";

const SESSION_TOKEN_CHANNEL = "sunrise-auth-session-tokens";

interface SessionTokenRotation {
  previousRefreshToken: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * 未勾选“记住我”时凭证在 sessionStorage，新标签页打开时复制的是一份独立副本。
 * 刷新令牌一次性有效，某个标签页刷新后需把新令牌同步给持有同一旧令牌的标签页。
 */
let sessionTokenChannel: BroadcastChannel | null = null;

/** 负责认证凭证与“记住我”偏好的读写。 */
export const AuthStorage = {
  getAccessToken(): string {
    const isRememberMe = Storage.get<boolean>(STORAGE_KEYS.REMEMBER_ME, false);
    return isRememberMe
      ? Storage.get(STORAGE_KEYS.ACCESS_TOKEN, "")
      : Storage.sessionGet(STORAGE_KEYS.ACCESS_TOKEN, "");
  },

  getRefreshToken(): string {
    const isRememberMe = Storage.get<boolean>(STORAGE_KEYS.REMEMBER_ME, false);
    return isRememberMe
      ? Storage.get(STORAGE_KEYS.REFRESH_TOKEN, "")
      : Storage.sessionGet(STORAGE_KEYS.REFRESH_TOKEN, "");
  },

  setTokens(accessToken: string, refreshToken: string, rememberMe: boolean): void {
    Storage.set(STORAGE_KEYS.REMEMBER_ME, rememberMe);
    if (rememberMe) {
      Storage.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      Storage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      Storage.sessionRemove(STORAGE_KEYS.ACCESS_TOKEN);
      Storage.sessionRemove(STORAGE_KEYS.REFRESH_TOKEN);
    } else {
      const previousRefreshToken = Storage.sessionGet(STORAGE_KEYS.REFRESH_TOKEN, "");
      Storage.sessionSet(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      Storage.sessionSet(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      Storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
      Storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
      if (previousRefreshToken && previousRefreshToken !== refreshToken) {
        const rotation: SessionTokenRotation = { previousRefreshToken, accessToken, refreshToken };
        sessionTokenChannel?.postMessage(rotation);
      }
    }
  },

  setLoginTokens(accessToken: string, refreshToken: string, rememberMe: boolean): void {
    AuthStorage.setTokens(accessToken, refreshToken, rememberMe);
    // 最后发布登录标识，确保其他标签页重载时已能读取完整的新凭证。
    if (rememberMe) Storage.set(STORAGE_KEYS.LOGIN_SESSION, crypto.randomUUID());
    else Storage.remove(STORAGE_KEYS.LOGIN_SESSION);
  },

  clearAuth(): void {
    Storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
    Storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    Storage.sessionRemove(STORAGE_KEYS.ACCESS_TOKEN);
    Storage.sessionRemove(STORAGE_KEYS.REFRESH_TOKEN);
    Storage.remove(STORAGE_KEYS.LOGIN_SESSION);
  },

  getRememberMe(): boolean {
    return Storage.get<boolean>(STORAGE_KEYS.REMEMBER_ME, false);
  },
};

/**
 * 共享登录会话变化时重载旧标签页，清除旧身份、菜单和业务页面缓存；
 * 同时接收其他标签页对同一 sessionStorage 会话副本的令牌刷新。
 *
 * @returns 解除监听的清理函数
 */
export function setupAuthSessionSync(): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.storageArea !== localStorage) return;
    if (event.key === STORAGE_KEYS.LOGIN_SESSION || event.key === null)
      reloadPageWithoutConfirmation();
  };
  window.addEventListener("storage", handleStorage);

  sessionTokenChannel?.close();
  sessionTokenChannel =
    typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(SESSION_TOKEN_CHANNEL);
  const channel = sessionTokenChannel;
  if (channel) {
    channel.onmessage = ({ data }: MessageEvent<SessionTokenRotation>) => {
      if (AuthStorage.getRememberMe()) return;
      if (Storage.sessionGet(STORAGE_KEYS.REFRESH_TOKEN, "") !== data.previousRefreshToken) return;
      // 直接写入而不走 setTokens，避免再次广播
      Storage.sessionSet(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
      Storage.sessionSet(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
    };
  }

  return () => {
    window.removeEventListener("storage", handleStorage);
    channel?.close();
    if (sessionTokenChannel === channel) sessionTokenChannel = null;
  };
}
