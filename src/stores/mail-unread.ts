import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { mailService } from "@/services/mail.service";
import { createCoalescedTask } from "@/utils/coalesced-task";
import { usePermissionStore } from "./permission";
import { useUserStore } from "./user";

export const useMailUnreadStore = defineStore("mail-unread", () => {
  const user = useUserStore();
  const permission = usePermissionStore();
  const count = ref<number | null>(null);
  const canView = computed(() => !!user.userInfo.userId && permission.routes.some(route =>
    route.children?.some(child => child.name === "MailInbox"),
  ));
  const context = computed(() => JSON.stringify([canView.value, user.userInfo.userId,
    user.userInfo.identityId, user.userInfo.scope, user.userInfo.sessionId, user.userInfo.sessionVersion,
    user.userInfo.roles, user.userInfo.perms]));
  let stopWatching: (() => void) | undefined;
  let refreshCurrent: (() => void) | undefined;

  function start() {
    stopWatching ??= watch(context, (_, __, onCleanup) => {
      count.value = null;
      if (!canView.value) return;
      let active = true;
      const task = createCoalescedTask(async () => {
        if (document.hidden) return;
        try {
          const result = await mailService.summary();
          if (active) count.value = result.unreadCount;
        } catch (cause) {
          if (active) count.value = null;
          throw cause;
        }
      });
      refreshCurrent = task.request;
      const timer = window.setInterval(task.request, 30_000);
      document.addEventListener("visibilitychange", task.request);
      task.request();
      onCleanup(() => {
        active = false;
        window.clearInterval(timer);
        document.removeEventListener("visibilitychange", task.request);
        task.cancel();
        refreshCurrent = undefined;
      });
    }, { immediate: true, flush: "sync" });
  }

  function stop() {
    stopWatching?.();
    stopWatching = undefined;
    count.value = null;
  }

  return { count, canView, start, stop, refresh: () => refreshCurrent?.() };
});
