<template>
  <span v-show="false" />
</template>

<script setup lang="ts">
import { h, onBeforeUnmount, onMounted } from "vue";
import { ElButton, ElNotification } from "element-plus";
import type { NotificationHandle } from "element-plus";
import { useI18n } from "vue-i18n";
import { reloadPageWithoutConfirmation } from "@/utils/page-lifecycle";

const CHECK_INTERVAL_MS = 60_000;
const currentVersion = String(__APP_INFO__.buildTimestamp);
const { t } = useI18n();

let checkTimer: ReturnType<typeof setInterval> | undefined;
let notification: NotificationHandle | undefined;
let dismissedVersion = "";
let notifiedVersion = "";
let isChecking = false;

async function checkForNewVersion() {
  if (isChecking || document.visibilityState !== "visible") return;

  isChecking = true;
  try {
    const entryUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
    entryUrl.searchParams.set("_version", String(Date.now()));
    const response = await fetch(entryUrl, { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) return;

    const html = await response.text();
    const documentSnapshot = new DOMParser().parseFromString(html, "text/html");
    const latestVersion = documentSnapshot
      .querySelector<HTMLMetaElement>('meta[name="app-version"]')
      ?.content;

    if (
      !latestVersion
      || latestVersion === currentVersion
      || latestVersion === dismissedVersion
      || latestVersion === notifiedVersion
    ) return;

    notification?.close();
    notifiedVersion = latestVersion;
    notification = ElNotification({
      title: t("appVersion.title"),
      message: h("div", [
        h("div", t("appVersion.message")),
        h(ElButton, {
          class: "mt-3",
          size: "small",
          type: "primary",
          onClick: reloadPageWithoutConfirmation,
        }, () => t("appVersion.refresh")),
      ]),
      duration: 0,
      position: "top-right",
      showClose: true,
      onClose: () => {
        dismissedVersion = latestVersion;
        notifiedVersion = "";
        notification = undefined;
      },
    });
  } catch {
    // 版本检查失败不影响当前页面使用，下一轮轮询会自动重试。
  } finally {
    isChecking = false;
  }
}

function checkWhenVisible() {
  if (document.visibilityState === "visible") void checkForNewVersion();
}

onMounted(() => {
  void checkForNewVersion();
  checkTimer = setInterval(checkForNewVersion, CHECK_INTERVAL_MS);
  window.addEventListener("focus", checkForNewVersion);
  document.addEventListener("visibilitychange", checkWhenVisible);
});

onBeforeUnmount(() => {
  if (checkTimer) clearInterval(checkTimer);
  window.removeEventListener("focus", checkForNewVersion);
  document.removeEventListener("visibilitychange", checkWhenVisible);
  notification?.close();
});
</script>
