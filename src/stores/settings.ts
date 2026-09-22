import { SidebarColor, ThemeMode } from "@/enums";
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
  };
});
