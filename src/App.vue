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
import AppVersionNotifier from "@/components/AppVersionNotifier.vue";
import { useAppStore } from "@/stores/app";
import { useSettingsStore } from "@/stores/settings";
import { appConfig } from "@/settings";
import { ThemeMode, ComponentSize } from "@/enums";
import { translateRouteTitle } from "@/lang/utils";
import { pageTitle } from "@/composables/usePageTitle";

const appStore = useAppStore();
const settingsStore = useSettingsStore();
const route = useRoute();

// 网页标题：页面业务标题优先（如行程页的“独立站行程 · 客户”），否则用当前菜单路由名称；随语言切换更新，无标题路由回退应用名。
watchEffect(() => {
  void appStore.locale;
  const title = route.meta.title;
  document.title = pageTitle.value || (title ? translateRouteTitle(title) : appConfig.title);
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
