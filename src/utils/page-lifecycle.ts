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
