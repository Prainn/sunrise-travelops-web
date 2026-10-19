import { nextTick, onActivated, onDeactivated, onMounted, ref, useTemplateRef } from "vue";
import type { ComponentPublicInstance } from "vue";
import { useEventListener } from "@vueuse/core";

/**
 * 行程工作区吸顶概览：向下滚动时收起次要信息，向上滚动或回到顶部时展开。
 *
 * 页面根组件须声明 `ref="pageElement"`，滚动容器为外层 `.layout-content`。
 */
export function useCollapsibleOverview() {
  const pageElement = useTemplateRef<ComponentPublicInstance>("pageElement");
  const scrollContainer = ref<HTMLElement>();
  const isOverviewCollapsed = ref(false);
  let scrollAnchor = 0;
  let isHeaderUpdating = false;

  function attachScrollContainer() {
    const root = pageElement.value?.$el as HTMLElement | undefined;
    scrollContainer.value = root?.closest<HTMLElement>(".layout-content") ?? undefined;
    scrollAnchor = scrollContainer.value?.scrollTop ?? 0;
  }

  useEventListener(scrollContainer, "scroll", () => {
    const container = scrollContainer.value;
    if (!container || isHeaderUpdating) return;
    const position = Math.max(0, container.scrollTop);
    const delta = position - scrollAnchor;
    if (position > 24 && Math.abs(delta) < 16) return;
    scrollAnchor = position;
    const shouldCollapse = position > 96 && delta > 0;
    if (position > 24 && delta >= 0 && !shouldCollapse) return;
    if (isOverviewCollapsed.value === shouldCollapse) return;
    isHeaderUpdating = true;
    isOverviewCollapsed.value = shouldCollapse;
    // Header resizing can move the scroll position; it is not a change in user direction.
    void nextTick(() => {
      scrollAnchor = container.scrollTop;
      isHeaderUpdating = false;
    });
  });
  onMounted(attachScrollContainer);
  onActivated(attachScrollContainer);
  onDeactivated(() => { scrollContainer.value = undefined; });

  return { isOverviewCollapsed };
}
