import { shallowRef, toValue, watchEffect, onScopeDispose, type MaybeRefOrGetter } from "vue";

/** 页面级网页标题；为空时 App 回退到当前菜单路由名称。 */
export const pageTitle = shallowRef("");

/**
 * 在页面存活期间用业务标题覆盖网页标题，卸载后恢复菜单路由名称。
 *
 * @param title - 已翻译的标题；返回空字符串表示暂用路由名称（如数据未加载）。
 */
export function usePageTitle(title: MaybeRefOrGetter<string>) {
  let current = "";
  watchEffect(() => {
    current = toValue(title);
    pageTitle.value = current;
  });
  // 新页面可能先于旧页面卸载完成设置标题，只清除仍属于本页面的值。
  onScopeDispose(() => {
    if (pageTitle.value === current) pageTitle.value = "";
  });
}
