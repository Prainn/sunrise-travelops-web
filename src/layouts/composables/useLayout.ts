import { useUserStore } from "@/stores/user";
import { useRoute } from "vue-router";
import { useAppStore } from "@/stores/app";
import { usePermissionStore } from "@/stores/permission";
import { useSettingsStore } from "@/stores/settings";
import { DeviceEnum } from "@/enums/settings";

/**
 * 提供布局组件共用的响应式状态
 */
export function useLayout() {
  const route = useRoute();
  const appStore = useAppStore();
  const userStore = useUserStore();
  const settingsStore = useSettingsStore();
  const permissionStore = usePermissionStore();

  const isMobile = computed(() => appStore.device === DeviceEnum.MOBILE);
  const currentLayout = computed(() => settingsStore.layout);
  const isSidebarOpen = computed(() => appStore.sidebar.opened);
  const showTagsView = computed(() => settingsStore.showTagsView);
  const showLogo = computed(() => settingsStore.showAppLogo && userStore.userInfo.scope !== "headquarters");
  /** 行程工作区在独立浏览器标签页中使用，只保留菜单，隐藏系统顶栏与站内页签。 */
  const isWorkspaceChromeless = computed(() =>
    route.matched.some((record) => record.meta.inquiryWorkspace),
  );
  /** 移动端菜单入口在顶栏内，工作区仅在桌面端隐藏左侧/双列布局的顶栏。 */
  const isWorkspaceNavbarHidden = computed(() => isWorkspaceChromeless.value && !isMobile.value);

  const layoutClass = computed(() => ({
    "is-sidebar-collapsed": !appStore.sidebar.opened,
    "is-sidebar-open": appStore.sidebar.opened,
    "is-mobile": appStore.device === DeviceEnum.MOBILE,
    [`layout--${settingsStore.layout}`]: true,
  }));

  /**
   * 左侧和顶部菜单共用的路由列表
   */
  const routes = computed(() => permissionStore.routes);

  /**
   * 混合布局中随顶部菜单切换的侧边菜单
   */
  const sideMenuRoutes = computed(() => permissionStore.mixLayoutSideMenus);

  /**
   * 混合布局当前激活的顶部菜单路径
   */
  const activeTopMenuPath = computed(() => appStore.activeTopMenuPath);

  /**
   * 当前侧边菜单激活路径
   */
  const activeMenu = computed(() => {
    const { meta, path } = route;
    return meta?.activeMenu || path;
  });

  function toggleSidebar() {
    appStore.toggleSidebar();
  }

  function closeSidebar() {
    appStore.closeSidebar();
  }

  return {
    isMobile,
    currentLayout,
    layoutClass,
    isSidebarOpen,
    showTagsView,
    showLogo,
    isWorkspaceChromeless,
    isWorkspaceNavbarHidden,
    routes,
    sideMenuRoutes,
    activeMenu,
    activeTopMenuPath,
    toggleSidebar,
    closeSidebar,
  };
}
