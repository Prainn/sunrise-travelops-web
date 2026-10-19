import type { App } from "vue";
import { createI18n } from "vue-i18n";
import { useAppStoreHook } from "@/stores/app";
// 本地语言包
import enLocale from "./package/en.json";
import zhCnLocale from "./package/zh-cn.json";

const appStore = useAppStoreHook();

const messages = {
  "zh-cn": zhCnLocale,
  en: enLocale,
};

// 动态键末段为空值（如 `statuses.${row.status}` 中 status 缺失，或表格列渲染时以空 row 探测插槽）
const EMPTY_VALUE_KEY = /\.(?:undefined|null|)$/;

const i18n = createI18n({
  legacy: false,
  locale: appStore.language,
  messages,
  globalInjection: true,
  // 没有数据时不套用文案模板：返回空文本且不告警；其余缺失键保持默认告警并显示键名
  missing: (locale, key) => {
    if (EMPTY_VALUE_KEY.test(key)) return "";
    if (import.meta.env.DEV) {
      console.warn(`[intlify] Not found '${key}' key in '${locale}' locale messages.`);
    }
  },
});

// 全局注册 i18n
export function setupI18n(app: App<Element>) {
  app.use(i18n);
}

export default i18n;
