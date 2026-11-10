import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import type { WhatsappSummary } from "@/types/whatsapp";
import { whatsappService } from "@/services/whatsapp.service";
import { useUserStore } from "./user";
import { usePermissionStore } from "./permission";

export const useWhatsappNotificationsStore = defineStore("whatsapp-notifications", () => {
  const user = useUserStore();
  const permission = usePermissionStore();
  const counts = ref<WhatsappSummary | null>(null);
  const hasError = ref(false);
  const canView = computed(() => !!user.userInfo.userId && permission.routes.some((route) =>
    route.children?.some((child) => child.name === "WhatsappInbox"),
  ));
  const context = computed(() => JSON.stringify([canView.value, user.userInfo.userId,
    user.userInfo.identityId, user.userInfo.scope, user.userInfo.sessionId,
    user.userInfo.sessionVersion, user.userInfo.roles, user.userInfo.perms]));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  let isRunning = false;
  let isLoading = false;
  let refreshRequested = false;
  let stopWatching: (() => void) | undefined;

  function clearTimer() {
    if (timer) clearTimeout(timer);
    timer = undefined;
  }

  async function refresh() {
    clearTimer();
    if (!isRunning || !canView.value) return;
    if (isLoading) {
      refreshRequested = true;
      return;
    }
    isLoading = true;
    const current = generation;
    try {
      const result = await whatsappService.summary();
      if (current !== generation) return;
      counts.value = result;
      hasError.value = false;
    } catch {
      if (current !== generation) return;
      counts.value = null;
      hasError.value = true;
    } finally {
      if (current === generation) {
        isLoading = false;
        if (refreshRequested) {
          refreshRequested = false;
          void refresh();
        } else if (isRunning && canView.value) {
          timer = setTimeout(() => void refresh(), document.visibilityState === "visible" ? 15000 : 60000);
        }
      }
    }
  }

  function handleVisibility() {
    if (document.visibilityState === "visible") void refresh();
  }

  function stop() {
    isRunning = false;
    generation++;
    clearTimer();
    stopWatching?.();
    stopWatching = undefined;
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("focus", handleVisibility);
    counts.value = null;
    hasError.value = false;
    isLoading = false;
    refreshRequested = false;
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    stopWatching = watch(context, () => {
      generation++;
      clearTimer();
      counts.value = null;
      hasError.value = false;
      isLoading = false;
      refreshRequested = false;
      void refresh();
    }, { immediate: true, flush: "sync" });
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
  }

  return { counts, hasError, canView, start, stop, refresh };
});
