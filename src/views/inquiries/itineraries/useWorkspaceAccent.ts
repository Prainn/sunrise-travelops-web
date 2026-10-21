import { onScopeDispose, toValue, watchEffect, type MaybeRefOrGetter } from "vue";
import { ThemeMode } from "@/enums";
import { useSettingsStore } from "@/stores/settings";
import { generateThemeColors, getLightColor } from "@/utils/theme";

const ACCENT_CLASS = "itinerary-accent";
const PRIMARY_KEYS = ["primary", ...Array.from({ length: 9 }, (_, i) => `primary-light-${i + 1}`), "primary-dark-2"];

/**
 * 行程页业务强调色：仅在页面存活期间替换内容区、弹窗与下拉层的 Element 主色，侧边栏及其他页面保持全局主题。
 *
 * 变量挂在 body 上但只由 `.itinerary-accent` 下的限定选择器读取（见 ItineraryWorkspaceLayout 全局样式）。
 *
 * @param accent - 强调色 HEX；为空时使用全局主色。
 */
export function useWorkspaceAccent(accent: MaybeRefOrGetter<string | undefined>) {
  const settingsStore = useSettingsStore();
  const body = document.body;

  function clear() {
    body.classList.remove(ACCENT_CLASS);
    PRIMARY_KEYS.forEach((key) => body.style.removeProperty(`--itinerary-accent-${key}`));
  }

  watchEffect(() => {
    const color = toValue(accent);
    if (!color) {
      clear();
      return;
    }
    const isDark = settingsStore.resolvedTheme === ThemeMode.DARK;
    // 深色背景下提亮底色，保证文字与链接对比度。
    const base = isDark ? getLightColor(color, 0.3) : color;
    const colors = generateThemeColors({ ...settingsStore.themeColors, primary: base }, settingsStore.resolvedTheme);
    PRIMARY_KEYS.forEach((key) => body.style.setProperty(`--itinerary-accent-${key}`, colors[key] ?? ""));
    body.classList.add(ACCENT_CLASS);
  });
  onScopeDispose(clear);
}
