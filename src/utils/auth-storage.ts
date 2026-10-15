import { STORAGE_KEYS } from "@/constants";
import { Storage } from "@/utils/storage";
import { reloadPageWithoutConfirmation } from "@/utils/page-lifecycle";

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
      Storage.sessionSet(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      Storage.sessionSet(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      Storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
      Storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
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
 * 共享登录会话变化时重载旧标签页，清除旧身份、菜单和业务页面缓存。
 */
export function setupAuthSessionSync(): void {
  window.addEventListener("storage", (event) => {
    if (event.storageArea !== localStorage) return;
    if (event.key === STORAGE_KEYS.LOGIN_SESSION || event.key === null)
      reloadPageWithoutConfirmation();
  });
}
