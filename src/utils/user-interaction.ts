import type { RouteLocationRaw, Router } from "vue-router";
import { recordClientOperation, resolveClientPage } from "./client-operation-log";

let activeInput: Event | undefined;
const originalPush = new WeakMap<Router, Router["push"]>();

function reportPage(router: Router) {
  recordClientOperation({ page: resolveClientPage(router.currentRoute.value), action: "navigate", result: "success" });
}

const GUARD_FALLBACK_PATHS = new Set(["/login", "/401", "/404", "/unavailable"]);

/** Call from a navigation control after the user chooses a page. */
export async function openUserPage(router: Router, target: RouteLocationRaw) {
  const destination = router.resolve(target).fullPath;
  const push = originalPush.get(router) ?? router.push.bind(router);
  const failure = await push(target);
  if (failure) return failure;
  const current = router.currentRoute.value;
  const isBlocked = GUARD_FALLBACK_PATHS.has(current.path);
  const reachedTarget = current.fullPath === destination
    || (!isBlocked && destination !== "/" && current.fullPath.startsWith(`${destination}/`))
    || (!isBlocked && destination === "/" && Boolean(current.path) && current.path !== "/");
  if (reachedTarget) reportPage(router);
  return failure;
}

/** Only the native event currently being dispatched can give a control user intent. */
export function isUserInput(root?: Element | null, popperClass?: string): boolean {
  return Boolean(activeInput?.isTrusted && activeInput.eventPhase !== Event.NONE
    && (root === undefined || activeInput.composedPath().some((node) =>
      node === root || (popperClass && node instanceof Element && node.classList.contains(popperClass)))));
}

export function setupOperationNavigation(router: Router) {
  for (const type of ["click", "keydown", "keyup", "change", "input", "pointerup"]) {
    window.addEventListener(type, (event) => { activeInput = event; }, { capture: true, passive: true });
  }

  const push = router.push.bind(router);
  originalPush.set(router, push);
  router.push = (target) => {
    if (!isUserInput()) return push(target);
    const href = new URL(router.resolve(target).href, window.location.href).href;
    const link = activeInput?.composedPath().some((node) =>
      node instanceof HTMLAnchorElement && node.href === href);
    return link ? openUserPage(router, target) : push(target);
  };

  // Browser Back / Forward exposes userInitiated on supporting browsers.
  const navigation = (window as Window & { navigation?: EventTarget }).navigation;
  let traversal: string | undefined;
  navigation?.addEventListener("navigate", (event) => {
    const move = event as Event & { navigationType: string; userInitiated: boolean; destination: { url: string } };
    if (move.navigationType === "traverse" && move.userInitiated) {
      const target = new URL(move.destination.url);
      traversal = target.pathname + target.search + target.hash;
    } else traversal = undefined;
  });
  router.afterEach((to, _from, failure) => {
    if (traversal === to.fullPath && !failure) reportPage(router);
    traversal = undefined;
  });
}
