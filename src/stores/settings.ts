import { useWindowSize } from "@vueuse/core";
import { SidebarColor, ThemeMode, UiDensity } from "@/enums";
import type { LayoutMode, TagsViewStyle } from "@/enums";
import {
  applyTheme,
  generateThemeColors,
  resolveThemeMode,
  toggleDarkMode,
  toggleSidebarColor,
  watchSystemTheme,
} from "@/utils/theme";
import { STORAGE_KEYS } from "@/constants";
import { defaults } from "@/settings";
import type { ThemeColorMap } from "@/settings";

// 自动密度在 1366 笔记本等窄屏或矮屏视口下切换为紧凑
const COMPACT_MAX_WIDTH = 1440;
const COMPACT_MAX_HEIGHT = 720;

export const useSettingsStore = defineStore("setting", () => {
  // 界面显示
  const showTagsView = useStorage(STORAGE_KEYS.SHOW_TAGS_VIEW, defaults.showTagsView);
  const tagsViewStyle = useStorage<TagsViewStyle>(
    STORAGE_KEYS.TAGS_VIEW_STYLE,
    defaults.tagsViewStyle,
  );
  const showAppLogo = useStorage(STORAGE_KEYS.SHOW_APP_LOGO, defaults.showAppLogo);
  const showWatermark = useStorage(STORAGE_KEYS.SHOW_WATERMARK, defaults.showWatermark);
  const pageSwitchingAnimation = useStorage(
    STORAGE_KEYS.PAGE_SWITCHING_ANIMATION,
    defaults.pageSwitchingAnimation,
  );

  // 布局
  const layout = useStorage<LayoutMode>(STORAGE_KEYS.LAYOUT, defaults.layout as LayoutMode);
  const sidebarColorScheme = useStorage(
    STORAGE_KEYS.SIDEBAR_COLOR_SCHEME,
    defaults.sidebarColorScheme,
  );

  // 主题
  const theme = useStorage<ThemeMode>(STORAGE_KEYS.THEME, defaults.theme);
  const themeColors = useStorage<ThemeColorMap>(STORAGE_KEYS.THEME_COLORS, {
    ...defaults.themeColors,
  });

  // 界面密度
  const density = useStorage<UiDensity>(STORAGE_KEYS.UI_DENSITY, defaults.density);
  const { width: viewportWidth, height: viewportHeight } = useWindowSize();
  const isCompact = computed(() => {
    if (density.value === UiDensity.AUTO) {
      return viewportWidth.value < COMPACT_MAX_WIDTH || viewportHeight.value < COMPACT_MAX_HEIGHT;
    }
    return density.value === UiDensity.COMPACT;
  });

  watch(isCompact, (v) => document.documentElement.classList.toggle("is-compact", v), {
    immediate: true,
  });

  const resolvedTheme = ref<ThemeMode>(resolveThemeMode(theme.value));

  // 主题变化监听
  let stopWatchingSystemTheme: (() => void) | undefined;

  watch(
    theme,
    (value) => {
      stopWatchingSystemTheme?.();
      resolvedTheme.value = resolveThemeMode(value);

      if (value === ThemeMode.AUTO) {
        stopWatchingSystemTheme = watchSystemTheme((systemTheme) => {
          resolvedTheme.value = systemTheme;
        });
      } else {
        stopWatchingSystemTheme = undefined;
      }
    },
    { immediate: true },
  );

  watch(
    [resolvedTheme, themeColors],
    ([t, colors]) => {
      toggleDarkMode(t === ThemeMode.DARK);
      applyTheme(generateThemeColors(colors, t));
    },
    { immediate: true, deep: true },
  );

  watch(sidebarColorScheme, (v) => toggleSidebarColor(v === SidebarColor.CLASSIC_BLUE), {
    immediate: true,
  });

  return {
    showTagsView,
    tagsViewStyle,
    showAppLogo,
    showWatermark,
    pageSwitchingAnimation,
    sidebarColorScheme,
    layout,
    themeColors,
    theme,
    resolvedTheme,
    density,
    isCompact,
  };
});
