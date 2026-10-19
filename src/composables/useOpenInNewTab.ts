import { useRouter, type RouteLocationRaw } from "vue-router";

/**
 * 业务页面间跳转统一在浏览器新标签页打开；菜单、页签和面包屑仍在当前标签页切换。
 *
 * 不传 noopener：未勾选“记住我”时凭证在 sessionStorage，保留 opener 才会复制到新标签页。
 */
export function useOpenInNewTab() {
  const router = useRouter();

  return (to: RouteLocationRaw) => {
    window.open(router.resolve(to).href, "_blank");
  };
}
