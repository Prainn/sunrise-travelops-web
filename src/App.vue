<template>
  <el-config-provider :locale="locale" :size="size" :table="tableConfig">
    <AppVersionNotifier />
    <el-watermark
      :font="{ color: fontColor }"
      :content="showWatermark ? watermarkContent : ''"
      :z-index="9999"
      class="wh-full"
    >
      <router-view />
    </el-watermark>
  </el-config-provider>
</template>

<script setup lang="ts">
import { usePreferredReducedMotion } from "@vueuse/core";
import AppVersionNotifier from "@/components/AppVersionNotifier.vue";
import { useAppStore } from "@/stores/app";
import { useSettingsStore } from "@/stores/settings";
import { useWhatsappNotificationsStore } from "@/stores/whatsapp-notifications";
import { appConfig } from "@/settings";
import { ThemeMode, ComponentSize } from "@/enums";
import { translate, translateRouteTitle } from "@/lang/utils";
import { pageTitle } from "@/composables/usePageTitle";

const appStore = useAppStore();
const settingsStore = useSettingsStore();
const notifications = useWhatsappNotificationsStore();
const route = useRoute();

// 单条询盘的行程、日志和从汇总打开的详情，加载期间也保留自己的标题。
const isInquiryTab = computed(() =>
  route.meta.menuKey === "inquiries" &&
  Boolean(route.params.inquiryId || route.query.inquiryId || route.query.code),
);

const UNREAD_TITLE_BLINK_MS = 1000;
const prefersReducedMotion = usePreferredReducedMotion();

watchEffect((onCleanup) => {
  void appStore.locale;
  const routeTitle = route.meta.title;
  const baseTitle = pageTitle.value || (routeTitle ? translateRouteTitle(routeTitle) : appConfig.title);
  const count = isInquiryTab.value || !notifications.canView ? 0 : (notifications.counts?.unreadCount ?? 0);

  if (count <= 0) {
    document.title = baseTitle;
    return;
  }

  const unreadTitle = translate("whatsapp.notifications.unreadPageTitle", { count, title: baseTitle });
  document.title = unreadTitle;

  if (prefersReducedMotion.value === "reduce") return;

  let showUnread = true;
  const timer = window.setInterval(() => {
    showUnread = !showUnread;
    document.title = showUnread ? unreadTitle : baseTitle;
  }, UNREAD_TITLE_BLINK_MS);

  onCleanup(() => {
    window.clearInterval(timer);
  });
});

const locale = computed(() => appStore.locale);
const size = computed(() =>
  settingsStore.isCompact ? ComponentSize.SMALL : (appStore.size as ComponentSize),
);
const showWatermark = computed(() => settingsStore.showWatermark);
const watermarkContent = appConfig.name;
const tableConfig = { showOverflowTooltip: true };

// 明亮/暗黑主题水印字体颜色适配
const fontColor = computed(() => {
  return settingsStore.resolvedTheme === ThemeMode.DARK
    ? "rgba(255, 255, 255, .15)"
    : "rgba(0, 0, 0, .15)";
});
</script>
