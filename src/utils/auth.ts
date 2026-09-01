import { ROLE_ROOT } from "@/constants";
import { useUserStoreHook } from "@/stores/user";
import router from "@/router";
import { translate } from "@/lang/utils";

export { AuthStorage } from "@/utils/auth-storage";

/**
 * 权限判断
 */
export function hasPerm(value: string | string[], type: "button" | "role" = "button"): boolean {
  const { roles, perms } = useUserStoreHook().userInfo;

  if (!roles || !perms) {
    return false;
  }

  // 超级管理员拥有所有权限
  if (type === "button" && roles.includes(ROLE_ROOT)) {
    return true;
  }

  const auths = type === "button" ? perms : roles;
  return typeof value === "string"
    ? auths.includes(value)
    : value.some((perm) => auths.includes(perm));
}

let redirectingToLogin = false;

/**
 * 重定向到登录页面
 */
export async function redirectToLogin(
  message: string = translate("request.relogin"),
  notify: boolean = true
): Promise<void> {
  if (redirectingToLogin) return;
  redirectingToLogin = true;

  if (notify) {
    ElNotification({
      title: translate("common.tip"),
      message,
      type: "warning",
      duration: 3000,
    });
  }

  await useUserStoreHook().resetAllState();

  try {
    // 跳转到登录页，保留当前路由用于登录后跳转
    const currentPath = router.currentRoute.value.fullPath;
    await router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
  } catch (error) {
    console.error("Redirect to login error:", error);
    // 强制跳转，即使路由重定向失败
    window.location.href = "/login";
  } finally {
    redirectingToLogin = false;
  }
}
