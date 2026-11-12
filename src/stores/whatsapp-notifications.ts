import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import type { WhatsappStreamSignal, WhatsappSummary } from "@/types/whatsapp";
import { whatsappService } from "@/services/whatsapp.service";
import { createCoalescedTask } from "@/utils/coalesced-task";
import { useUserStore } from "./user";
import { usePermissionStore } from "./permission";
import { useWhatsappStreamStore } from "./whatsapp-stream";

/**
 * 全局 WhatsApp 角标：由布局启动并持有实时流，离开收件箱后仍随失效提示更新。
 * 身份或权限上下文变化时关闭旧流、清空角标并丢弃旧响应。
 */
export const useWhatsappNotificationsStore = defineStore("whatsapp-notifications", () => {
  const user = useUserStore();
  const permission = usePermissionStore();
  const stream = useWhatsappStreamStore();
  const counts = ref<WhatsappSummary | null>(null);
  const hasError = ref(false);
  const canView = computed(() => !!user.userInfo.userId && permission.routes.some((route) =>
    route.children?.some((child) => child.name === "WhatsappInbox"),
  ));
  const context = computed(() => JSON.stringify([canView.value, user.userInfo.userId,
    user.userInfo.identityId, user.userInfo.scope, user.userInfo.sessionId,
    user.userInfo.sessionVersion, user.userInfo.roles, user.userInfo.perms]));
  let generation = 0;
  let isRunning = false;
  let stopWatching: (() => void) | undefined;
  let stopStatusWatch: (() => void) | undefined;
  let unsubscribe: (() => void) | undefined;

  async function fetchSummary() {
    if (!isRunning || !canView.value) return;
    const current = generation;
    try {
      const result = await whatsappService.summary();
      if (current !== generation) return;
      counts.value = result;
      hasError.value = false;
    } catch (cause) {
      if (current !== generation) return;
      counts.value = null;
      hasError.value = true;
      throw cause;
    }
  }

  const summaryTask = createCoalescedTask(fetchSummary);
  let identityCheck: Promise<unknown> | undefined;

  /** 范围或权限变化后重新确认身份；/auth/me 结果变化会触发上下文切换并重建连接。 */
  function recheckIdentity() {
    identityCheck ??= user.getUserInfo().catch(() => undefined).finally(() => {
      identityCheck = undefined;
    });
  }

  function handleSignal(signal: WhatsappStreamSignal) {
    if (signal.type === "conversation") return;
    if (signal.type === "access") recheckIdentity();
    summaryTask.request();
  }

  /** 操作后立即重取；与正在进行的读取合并，结束后补跑一次。 */
  function refresh() {
    summaryTask.request();
  }

  function stop() {
    isRunning = false;
    generation++;
    summaryTask.cancel();
    stopWatching?.();
    stopWatching = undefined;
    stopStatusWatch?.();
    stopStatusWatch = undefined;
    unsubscribe?.();
    unsubscribe = undefined;
    stream.stop();
    counts.value = null;
    hasError.value = false;
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    unsubscribe = stream.subscribe(handleSignal);
    // 实时流 403：停止越权重连，重新确认当前身份与权限。
    stopStatusWatch = watch(() => stream.status, (status) => {
      if (status === "forbidden") recheckIdentity();
    });
    stopWatching = watch(context, () => {
      generation++;
      summaryTask.cancel();
      stream.stop();
      counts.value = null;
      hasError.value = false;
      if (!canView.value) return;
      stream.start();
      summaryTask.request();
    }, { immediate: true, flush: "sync" });
  }

  return { counts, hasError, canView, start, stop, refresh };
});
