import { ElLoading } from "element-plus";
import { isApiError, runWithRefreshLock } from "@/api/request";
import { getEditBlockers } from "@/composables/useAccountSwitchGuard";
import { translate } from "@/lang/utils";
import router from "@/router";
import { hasRouteChainAccess } from "@/router/access";
import { authService, userService } from "@/services";
import { clearResourceOptionsCache } from "@/services/resource-options-cache";
import { useDictStoreHook } from "@/stores/dict";
import type { UserInfo } from "@/types/user";
import { AuthStorage, type SessionState } from "@/utils/auth-storage";
import { navigateWithoutConfirmation, reloadPageWithoutConfirmation } from "@/utils/page-lifecycle";
import { sessionGate } from "@/utils/session-gate";
import {
  createAccountSwitchCoordinator,
  LOCK_UNAVAILABLE,
  type AccountSwitchCoordinator,
  type SwitchBlockReason,
  type SwitchBus,
  type SwitchLocks,
  type SwitchMessage,
  type SwitchResult,
} from "./account-switch";

/** 切换成功后发布给同会话标签页的新凭证与落地页。 */
interface SwitchCommit {
  accessToken: string;
  refreshToken: string;
  rememberMe: boolean;
  state: SessionState;
  landing: string;
}

const SWITCH_CHANNEL = "sunrise-account-switch";
/** 超时即结果不明，不重试切换。 */
const SWITCH_TIMEOUT_MS = 15_000;
/** 隐藏超过该时长后恢复可见，先确认会话版本再放行请求。 */
const RESUME_VERIFY_AFTER_MS = 60_000;

/** 切换后按目标业务落到有权列表：盛旭询盘；霖熹/独立站优先台账，其次询盘；均无权限回首页。 */
const LANDING_ROUTES: Record<string, string[]> = {
  shengxu: ["InquiryList"],
  linxi: ["DirectLedger", "WebsiteInquiryList"],
  website: ["WebsiteLedger", "WebsiteInquiryList"],
};

let coordinator: AccountSwitchCoordinator<SwitchCommit> | null = null;
let overlay: ReturnType<typeof ElLoading.service> | null = null;

function webLocks(): SwitchLocks | null {
  if (typeof navigator === "undefined" || !navigator.locks) return null;
  const locks = navigator.locks;
  return {
    tryExclusive: (name, task) =>
      locks.request(name, { ifAvailable: true }, (lock) => (lock ? task() : LOCK_UNAVAILABLE)),
    run: (name, task) => locks.request(name, task),
    hold(name) {
      let release!: () => void;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      void locks.request(name, () => held);
      return release;
    },
    async heldNames() {
      const { held = [] } = await locks.query();
      return held.flatMap((lock) => (lock.name ? [lock.name] : []));
    },
  };
}

function channelBus(): SwitchBus<SwitchCommit> | null {
  if (typeof BroadcastChannel === "undefined") return null;
  const channel = new BroadcastChannel(SWITCH_CHANNEL);
  const handlers = new Set<(message: SwitchMessage<SwitchCommit>) => void>();
  channel.onmessage = ({ data }: MessageEvent<SwitchMessage<SwitchCommit>>) =>
    handlers.forEach((handler) => handler(data));
  return {
    post: (message) => channel.postMessage(message),
    subscribe(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  };
}

function freeze(): void {
  sessionGate.freeze();
  overlay ??= ElLoading.service({
    fullscreen: true,
    lock: true,
    text: translate("accountSwitch.switching"),
  });
}

function unfreeze(): void {
  sessionGate.unfreeze();
  overlay?.close();
  overlay = null;
}

function getBlockers(): SwitchBlockReason[] {
  const blockers: SwitchBlockReason[] = getEditBlockers();
  if (sessionGate.pendingWrites() > 0) blockers.push("saving");
  return blockers;
}

/** 服务端明确拒绝（4xx，除 401/408）时切换未发生；网络、超时、5xx、401 等均视为结果不明。 */
function isDefiniteFailure(error: unknown): boolean {
  return (
    isApiError(error) &&
    error.status !== undefined &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 401 &&
    error.status !== 408
  );
}

function resolveLanding(user: UserInfo): string {
  const context = {
    scope: user.scope,
    roles: user.roles,
    perms: user.perms,
    menuKeys: user.menuKeys,
  };
  for (const name of LANDING_ROUTES[user.scope ?? ""] ?? []) {
    if (!router.hasRoute(name)) continue;
    const resolved = router.resolve({ name });
    if (hasRouteChainAccess(resolved.matched.map((route) => route.meta), context))
      return resolved.fullPath;
  }
  return "/";
}

/** 清除旧身份的字典与业务缓存后整页进入目标身份；路由、菜单、tags 与 keep-alive 随页面重建。 */
function enterSwitchedSession(landing: string): void {
  useDictStoreHook().clearDictCache();
  clearResourceOptionsCache();
  navigateWithoutConfirmation(landing);
}

function leaveForLogin(): void {
  sessionGate.retire();
  AuthStorage.clearSessionCredentials();
  navigateWithoutConfirmation("/login");
}

function handlePeerCommitted(payload: SwitchCommit): void {
  sessionGate.retire();
  if (!payload.rememberMe)
    AuthStorage.adoptSwitchedSession(payload.accessToken, payload.refreshToken, payload.state);
  enterSwitchedSession(payload.landing);
}

/** 在全部标签页就绪后调用一次；不重试。成功后先发布新会话版本与凭证，再读取目标身份。 */
function performSwitch(targetUserId: string): Promise<SwitchCommit> {
  return runWithRefreshLock(async () => {
    const known = sessionGate.getKnown();
    if (!known) throw new Error("Account session is not loaded.");
    const rememberMe = AuthStorage.getRememberMe();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SWITCH_TIMEOUT_MS);
    let tokens;
    try {
      tokens = await authService.switchAccount(targetUserId, controller.signal);
    } finally {
      clearTimeout(timer);
    }

    let state: SessionState = { sessionId: known.sessionId, version: known.version + 1 };
    sessionGate.retire();
    AuthStorage.setSwitchedTokens(tokens.accessToken, tokens.refreshToken, rememberMe, state);

    let landing = "/";
    try {
      const user = await userService.getCurrentUser(true);
      if (user.sessionId && user.sessionVersion !== undefined) {
        state = { sessionId: user.sessionId, version: user.sessionVersion };
        AuthStorage.setSessionState(state);
      }
      landing = resolveLanding(user);
    } catch {
      // 切换已成功；目标页面加载时会重新获取身份，此处落到首页。
    }
    return { ...tokens, rememberMe, state, landing };
  });
}

/**
 * 切换到同组账号。阻止或明确失败时本页恢复编辑；结果不明时清除凭证转登录。
 * 成功时当前页面整页跳转，不会返回到调用方继续使用旧身份。
 */
export async function switchToLinkedAccount(
  targetUserId: string,
): Promise<SwitchResult<SwitchCommit>> {
  if (!coordinator) return { status: "blocked", reasons: ["unsupported"], local: true };
  const result = await coordinator.initiate(() => performSwitch(targetUserId));
  if (result.status === "committed") enterSwitchedSession(result.payload.landing);
  if (result.status === "unknown") leaveForLogin();
  return result;
}

/** 阻止原因提示，提示先处理，不提供强制丢弃。 */
export function switchBlockedMessage(reasons: SwitchBlockReason[], local: boolean): string {
  if (reasons.includes("unsupported")) return translate("accountSwitch.unsupported");
  if (reasons.includes("busy")) return translate("accountSwitch.busy");
  const details = reasons
    .map((reason) => translate(`accountSwitch.reasons.${reason}`))
    .join(translate("accountSwitch.separator"));
  return translate(local ? "accountSwitch.blockedCurrent" : "accountSwitch.blockedOther", {
    reasons: details,
  });
}

function verifyResumedSession(): void {
  const known = sessionGate.getKnown();
  if (!known || sessionGate.isRetired()) return;
  if (sessionGate.isStale()) {
    sessionGate.retire();
    reloadPageWithoutConfirmation();
    return;
  }
  void sessionGate.verify(async () => {
    const user = await authService.getCurrentUser(true);
    if (user.sessionId === known.sessionId && user.sessionVersion === known.version) return;
    sessionGate.retire();
    reloadPageWithoutConfirmation();
  });
}

/**
 * 建立同会话切换协调：在场锁、消息监听，以及恢复休眠/往返缓存页面时的会话版本确认。
 * 浏览器不支持 BroadcastChannel 或 Web Locks 时禁用切换（失败即关闭）。
 */
export function setupAccountSwitchSync(): () => void {
  const locks = webLocks();
  const bus = channelBus();
  if (locks && bus) {
    coordinator = createAccountSwitchCoordinator<SwitchCommit>({
      tabId: crypto.randomUUID(),
      bus,
      locks,
      getSessionId: () => sessionGate.getKnown()?.sessionId,
      isSessionCurrent: () =>
        Boolean(sessionGate.getKnown()) && !sessionGate.isRetired() && !sessionGate.isStale(),
      getBlockers,
      freeze,
      unfreeze,
      onCommitted: handlePeerCommitted,
      onUnknown: leaveForLogin,
      isDefiniteFailure,
      createId: () => crypto.randomUUID(),
    });
  }
  const active = coordinator;
  const stopCoordinator = active?.start();
  const updatePresence = (state: SessionState | null) =>
    active?.updatePresence(state ? state.sessionId : AuthStorage.getAccessToken() ? undefined : null);
  updatePresence(sessionGate.getKnown());
  const stopKnown = sessionGate.onKnownChange(updatePresence);

  let hiddenAt = 0;
  const handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) verifyResumedSession();
  };
  const handleVisibility = () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      return;
    }
    if (sessionGate.isStale() || (hiddenAt && Date.now() - hiddenAt >= RESUME_VERIFY_AFTER_MS))
      verifyResumedSession();
    hiddenAt = 0;
  };
  window.addEventListener("pageshow", handlePageShow);
  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    stopCoordinator?.();
    stopKnown();
    window.removeEventListener("pageshow", handlePageShow);
    document.removeEventListener("visibilitychange", handleVisibility);
    if (coordinator === active) coordinator = null;
  };
}
