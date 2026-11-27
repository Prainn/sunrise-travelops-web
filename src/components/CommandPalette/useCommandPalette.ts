import { openUserPage } from "@/utils/user-interaction";
import { computed, onBeforeUnmount, onMounted, ref, toRaw } from "vue";
import type { LocationQueryRaw, RouteRecordRaw } from "vue-router";
import router from "@/router";
import { translateRouteTitle } from "@/lang/utils";
import { useAppStore } from "@/stores/app";
import { usePermissionStore } from "@/stores/permission";
import { isExternal } from "@/utils";

/** 命令面板中的可搜索菜单项。 */
interface SearchItem {
  title: string;
  path: string;
  name?: string;
  icon?: string;
  redirect?: string;
  params?: LocationQueryRaw;
}

const STORAGE_KEY = "menu_search_history";
const MAX_HISTORY = 5;
const EXCLUDED_PATHS = ["/redirect", "/login", "/401", "/404"];

export function clearCommandPaletteHistory(): void {
  if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY);
}

function collectRoutes(routes: RouteRecordRaw[], parentPath = "", output: SearchItem[] = []): SearchItem[] {
  routes.forEach((route) => {
    const path = route.path.startsWith("/")
      ? route.path
      : `${parentPath}${parentPath.endsWith("/") ? "" : "/"}${route.path}`;

    if (EXCLUDED_PATHS.includes(route.path) || isExternal(route.path)) return;

    if (route.children) {
      collectRoutes(route.children, path, output);
    } else if (route.meta?.title) {
      output.push({
        title: translateRouteTitle(route.meta.title),
        path,
        name: typeof route.name === "string" ? route.name : undefined,
        icon: route.meta.icon,
        redirect: typeof route.redirect === "string" ? route.redirect : undefined,
        params: route.meta.params
          ? structuredClone(toRaw(route.meta.params))
          : undefined,
      });
    }
  });
  return output;
}

export function useCommandPalette() {
  const appStore = useAppStore();
  const permissionStore = usePermissionStore();

  // 面板状态
  const visible = ref(false);
  const keyword = ref("");
  const activeIndex = ref(-1);
  const inputRef = ref<HTMLInputElement>();
  function setInputRef(el: unknown) {
    inputRef.value = el as HTMLInputElement | undefined;
  }

  // 菜单数据：随权限路由和语言切换响应式更新，历史记录只保留当前可访问路径并复用最新译文。
  const menuItems = computed<SearchItem[]>(() => {
    void appStore.locale;
    return collectRoutes(permissionStore.routes);
  });
  const menuByPath = computed(() => new Map(menuItems.value.map((item) => [item.path, item])));
  const results = ref<SearchItem[]>([]);
  const historyPaths = ref<string[]>([]);
  const history = computed<SearchItem[]>(() =>
    historyPaths.value.flatMap((path) => {
      const item = menuByPath.value.get(path);
      return item ? [item] : [];
    }),
  );

  function open() {
    keyword.value = "";
    results.value = [];
    activeIndex.value = -1;
    visible.value = true;
    setTimeout(() => inputRef.value?.focus(), 100);
  }

  function close() {
    visible.value = false;
  }

  /**
   * 搜索仅匹配菜单标题，避免路径命中过多造成结果噪音。
   */
  function onSearch() {
    activeIndex.value = -1;
    if (!keyword.value.trim()) {
      results.value = [];
      return;
    }
    const keywordText = keyword.value.toLowerCase();
    results.value = menuItems.value.filter((item) =>
      item.title.toLowerCase().includes(keywordText),
    );
  }

  function getDisplayList(): SearchItem[] {
    return results.value.length ? results.value : history.value;
  }

  /**
   * 键盘选择当前展示列表，搜索为空时回退历史记录。
   */
  function onSelect() {
    const list = getDisplayList();
    if (list.length === 0) return;
    if (activeIndex.value < 0) return;
    const item = list[activeIndex.value];
    if (!item) return;
    onGo(item);
  }

  function onNavigate(direction: "up" | "down") {
    const list = getDisplayList();
    if (list.length === 0) return;

    if (direction === "up") {
      activeIndex.value = activeIndex.value <= 0 ? list.length - 1 : activeIndex.value - 1;
    } else {
      activeIndex.value = activeIndex.value >= list.length - 1 ? 0 : activeIndex.value + 1;
    }
  }

  function onGo(item: SearchItem) {
    close();
    addHistory(item);

    if (isExternal(item.path)) {
      window.open(item.path, "_blank");
    } else {
      openUserPage(router, { path: item.path, query: item.params });
    }
  }

  function loadHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const parsed = data ? (JSON.parse(data) as unknown) : [];
      if (!Array.isArray(parsed)) {
        historyPaths.value = [];
        return;
      }
      historyPaths.value = parsed
        .map((entry) => (typeof entry === "string" ? entry : (entry as Partial<SearchItem>)?.path ?? ""))
        .filter((path, index, all) => Boolean(path) && all.indexOf(path) === index)
        .slice(0, MAX_HISTORY);
    } catch {
      historyPaths.value = [];
    }
  }

  function saveHistory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historyPaths.value));
  }

  /**
   * 历史记录按最近使用排序，并限制本地缓存数量。
   */
  function addHistory(item: SearchItem) {
    const next = historyPaths.value.filter((path) => path !== item.path);
    next.unshift(item.path);
    historyPaths.value = next.slice(0, MAX_HISTORY);
    saveHistory();
  }

  function removeHistory(index: number) {
    const target = history.value[index];
    if (!target) return;
    historyPaths.value = historyPaths.value.filter((path) => path !== target.path);
    saveHistory();
  }

  function clearHistory() {
    historyPaths.value = [];
    clearCommandPaletteHistory();
  }

  /**
   * Ctrl/Cmd + K 打开命令面板，并阻止浏览器默认搜索。
   */
  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      open();
    }
  }

  onMounted(() => {
    loadHistory();
    document.addEventListener("keydown", handleKeydown);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("keydown", handleKeydown);
  });

  return {
    visible,
    keyword,
    results,
    history,
    activeIndex,
    setInputRef,
    open,
    close,
    onSearch,
    onSelect,
    onNavigate,
    onGo,
    removeHistory,
    clearHistory,
  };
}
