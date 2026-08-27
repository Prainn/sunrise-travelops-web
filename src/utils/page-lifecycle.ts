let isUnloadConfirmationEnabled = true;

export function shouldConfirmPageUnload(hash: string) {
  const routePath = hash.slice(1).split("?")[0].replace(/\/+$/, "");
  return routePath !== "/login";
}

export function setupPageUnloadConfirmation(isProduction = import.meta.env.PROD) {
  if (!isProduction) return;
  window.addEventListener("beforeunload", (event) => {
    if (!isUnloadConfirmationEnabled || !shouldConfirmPageUnload(window.location.hash)) return;
    event.preventDefault();
  });
}

export function reloadPageWithoutConfirmation() {
  isUnloadConfirmationEnabled = false;
  window.location.reload();
}
