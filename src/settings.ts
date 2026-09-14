/**
 * 应用配置
 */

import {
  LayoutMode,
  ComponentSize,
  SidebarColor,
  ThemeMode,
  LanguageEnum,
  TagsViewStyle,
} from "@/enums";

const env = import.meta.env;
const { pkg } = __APP_INFO__;
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

export const themeColorNames = ["primary", "success", "warning", "danger", "info"] as const;

export type ThemeColorName = (typeof themeColorNames)[number];

export type ThemeColorMap = Record<ThemeColorName, string>;

const defaultThemeColors: ThemeColorMap = {
  primary: "#165DFF",
  success: "#00B42A",
  warning: "#FF7D00",
  danger: "#F53F3F",
  info: "#86909C",
};

export const appConfig = {
  name: pkg.name as string,
  version: pkg.version as string,
  title: (env.VITE_APP_TITLE as string) || pkg.name,
} as const;

export const defaults = {
  theme: prefersDark ? ThemeMode.DARK : ThemeMode.LIGHT,
  themeColors: { ...defaultThemeColors },
  sidebarColorScheme: SidebarColor.MINIMAL_WHITE,
  layout: LayoutMode.LEFT,
  size: ComponentSize.DEFAULT,
  language: LanguageEnum.ZH_CN,
  showTagsView: true,
  tagsViewStyle: TagsViewStyle.CARD,
  showAppLogo: true,
  showWatermark: false,
  pageSwitchingAnimation: "fade-slide",
  watermarkContent: pkg.name,
} as const;
