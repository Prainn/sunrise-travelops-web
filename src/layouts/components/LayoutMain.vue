<template>
  <section
    class="layout-content"
    :style="{ height: appMainHeight }"
  >
    <router-view>
      <template #default="{ Component, route }">
        <transition
          :name="transitionName"
          mode="out-in"
        >
          <keep-alive :include="cachedViews">
            <component
              :is="currentComponent(Component, route)"
              :key="route.fullPath"
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

const { cachedViews } = toRefs(useTagsViewStore());

const settingsStore = useSettingsStore();

const wrapperMap = new Map<string, Component>();
const currentComponent = (component: Component, route: RouteLocationNormalized) => {
  if (!component) return;

  const { fullPath: componentName } = route;
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
  if (settingsStore.showTagsView) {
    return `calc(100vh - ${variables["navbar-height"]} - ${variables["tags-view-height"]})`;
  } else {
    return `calc(100vh - ${variables["navbar-height"]})`;
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
    @apply '[transition:opacity_0.3s_ease-in-out]';
  }
  .fade-enter-from,
  .fade-leave-to {
    @apply 'opacity-0';
  }

  /* fade-slide */
  .fade-slide-leave-active,
  .fade-slide-enter-active {
    @apply '[transition:all_0.3s]';
  }
  .fade-slide-enter-from {
    @apply 'opacity-0 [transform:translateX(-30px)]';
  }
  .fade-slide-leave-to {
    @apply 'opacity-0 [transform:translateX(30px)]';
  }

  /* fade-scale */
  .fade-scale-leave-active,
  .fade-scale-enter-active {
    @apply '[transition:all_0.28s]';
  }
  .fade-scale-enter-from {
    @apply 'opacity-0 [transform:scale(1.2)]';
  }
  .fade-scale-leave-to {
    @apply 'opacity-0 [transform:scale(0.8)]';
  }
}
</style>
