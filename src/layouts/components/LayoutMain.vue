<template>
  <section class="layout-content" :style="{ height: appMainHeight }">
    <router-view>
      <template #default="{ Component, route }">
        <transition :name="transitionName" mode="out-in">
          <keep-alive :include="cachedViews">
            <component
              :is="currentComponent(Component, route)"
              :key="viewKey(route)"
            />
          </keep-alive>
        </transition>
      </template>
    </router-view>
  </section>
</template>

<script setup lang="ts">
import { type RouteLocationNormalized } from "vue-router";
import { useSettingsStore } from "@/stores/settings";
import { useTagsViewStore } from "@/stores/tags-view";
import variables from "@/styles/variables.module.scss";
import Error404 from "@/views/error/404.vue";
import { LayoutMode } from "@/enums/settings";
import { useLayout } from "../composables/useLayout";

const { cachedViews } = toRefs(useTagsViewStore());

const settingsStore = useSettingsStore();
const { currentLayout, isWorkspaceChromeless, isWorkspaceNavbarHidden } = useLayout();
const wrapperMap = new Map<string, Component>();
const viewKey = (route: RouteLocationNormalized) => (route.meta.reuseOnQueryChange ? route.path : route.fullPath);
const currentComponent = (component: Component, route: RouteLocationNormalized) => {
  if (!component) return;

  const componentName = viewKey(route);
  let wrapper = wrapperMap.get(componentName);

  if (!wrapper) {
    wrapper = {
      name: componentName,
      render: () => {
        try {
          return h(component);
        } catch (error) {
          console.error(`Error rendering component for route: ${componentName}`, error);
          return h(Error404);
        }
      },
    };
    wrapperMap.set(componentName, wrapper);
  }

  if (wrapperMap.size > 100) {
    const firstKey = wrapperMap.keys().next().value;
    if (firstKey) {
      wrapperMap.delete(firstKey);
    }
  }

  return h(wrapper);
};

const appMainHeight = computed(() => {
  if (isWorkspaceChromeless.value) {
    // 顶部/混合布局的顶栏承载菜单，移动端顶栏承载菜单入口，均需保留。
    const isMenuHeader = currentLayout.value === LayoutMode.TOP || currentLayout.value === LayoutMode.MIX;
    return isWorkspaceNavbarHidden.value && !isMenuHeader
      ? "100dvh"
      : `calc(100dvh - ${variables["navbar-height"]})`;
  }
  if (settingsStore.showTagsView) {
    return `calc(100dvh - ${variables["navbar-height"]} - ${variables["tags-view-height"]})`;
  } else {
    return `calc(100dvh - ${variables["navbar-height"]})`;
  }
});

const transitionName = computed(() => {
  return settingsStore.pageSwitchingAnimation ?? "";
});
</script>

<style lang="scss" scoped>
.layout-content {
  @apply 'relative overflow-x-hidden overflow-y-auto bg-[var(--page-bg)]';

  /* fade */
  .fade-enter-active,
  .fade-leave-active {
    @apply '[transition:opacity_0.25s_ease-out]';
  }
  .fade-enter-from,
  .fade-leave-to {
    @apply 'opacity-0';
  }

  /* fade-slide / fade-scale：已存偏好统一为淡入淡出，不做位移或缩放。 */
  .fade-slide-leave-active,
  .fade-slide-enter-active,
  .fade-scale-leave-active,
  .fade-scale-enter-active {
    @apply '[transition:opacity_0.25s_ease-out]';
  }
  .fade-slide-enter-from,
  .fade-slide-leave-to,
  .fade-scale-enter-from,
  .fade-scale-leave-to {
    @apply 'opacity-0';
  }
}
</style>
