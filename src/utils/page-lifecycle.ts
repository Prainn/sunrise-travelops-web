let isUnloadConfirmationEnabled = true;

export function shouldConfirmPageUnload(pathname: string) {
  const routePath = pathname.replace(/\/+$/, "");
  return routePath !== "/login";
}

export function setupPageUnloadConfirmation(isProduction = import.meta.env.PROD) {
  if (!isProduction) return;
  window.addEventListener("beforeunload", (event) => {
    if (!isUnloadConfirmationEnabled || !shouldConfirmPageUnload(window.location.pathname)) return;
    event.preventDefault();
  });
}

export function reloadPageWithoutConfirmation() {
  isUnloadConfirmationEnabled = false;
  window.location.reload();
}

/** 账号切换或结果不明时整页跳转，跳过离开确认以清除旧身份的全部页面状态。 */
export function navigateWithoutConfirmation(path: string) {
  isUnloadConfirmationEnabled = false;
  window.location.assign(path);
}
