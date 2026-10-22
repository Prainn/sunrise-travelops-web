import { clearResourceOptionsCache } from "@/services/resource-options-cache";
import { store } from "./store";

import type { UserInfo } from "@/types/user";
import { authService, userService } from "@/services";
import type { LoginRequest } from "@/types/auth";

import { AuthStorage } from "@/utils/auth-storage";
import { reloadPageWithoutConfirmation } from "@/utils/page-lifecycle";
import { sessionGate } from "@/utils/session-gate";
import { usePermissionStoreHook } from "@/stores/permission";
import { useDictStoreHook } from "@/stores/dict";
import { useTagsViewStore } from "./tags-view";

export const useUserStore = defineStore("user", () => {
  // 用户信息
  const userInfo = ref<UserInfo>({ roles: [], perms: [] });
  // 记住我状态
  const rememberMe = ref(AuthStorage.getRememberMe());

  /**
   * 登录
   */
  async function login(loginRequest: LoginRequest): Promise<void> {
    const { accessToken, refreshToken } = await authService.login(loginRequest);
    rememberMe.value = loginRequest.rememberMe ?? false;
    AuthStorage.setLoginTokens(accessToken, refreshToken, rememberMe.value);
    userInfo.value = { roles: [], perms: [] };
    usePermissionStoreHook().resetRouter();
  }

  /**
   * 获取用户信息
   */
  async function getUserInfo(): Promise<UserInfo> {
    const data = await userService.getCurrentUser();
    if (!data) {
      throw new Error("Verification failed, please Login again.");
    }
    adoptSession(data);
    Object.assign(userInfo.value, data);
    return data;
  }

  /** 记录本页加载的会话版本；同会话已有更新版本说明本次结果属于切换前身份，整页重载。 */
  function adoptSession({ sessionId, sessionVersion }: UserInfo): void {
    if (!sessionId || sessionVersion === undefined) return;
    const stored = AuthStorage.getSessionState();
    if (stored?.sessionId === sessionId && stored.version > sessionVersion) {
      sessionGate.retire();
      reloadPageWithoutConfirmation();
      throw new Error("Account session changed.");
    }
    const state = { sessionId, version: sessionVersion };
    AuthStorage.setSessionState(state);
    sessionGate.setKnown(state);
  }

  /**
   * 登出
   */
  async function logout(): Promise<void> {
    try {
      await authService.logout();
    } finally {
      resetAllState();
    }
  }

  /**
   * 重置所有系统状态
   *
   * 统一处理所有清理工作，包括用户凭证、路由、缓存等
   */
  function resetAllState(): void {
    // 1. 重置用户状态
    resetUserState();

    // 2. 重置其他模块状态
    useDictStoreHook().clearDictCache();
    useTagsViewStore().delAllViews();
  }

  /**
   * 重置用户状态
   *
   * 仅处理用户模块内的状态
   */
  function resetUserState(): void {
    AuthStorage.clearAuth();
    clearResourceOptionsCache();
    sessionGate.setKnown(null);
    userInfo.value = { roles: [], perms: [] };
    usePermissionStoreHook().resetRouter();
  }

  return {
    userInfo,
    rememberMe,
    isLoggedIn: () => !!AuthStorage.getAccessToken(),
    login,
    logout,
    getUserInfo,
    resetAllState,
    resetUserState,
  };
});

/**
 * 在组件外部使用 UserStore 的钩子函数
 *
 * @see https://pinia.vuejs.org/core-concepts/outside-component-usage.html
 */
export function useUserStoreHook() {
  return useUserStore(store);
}
