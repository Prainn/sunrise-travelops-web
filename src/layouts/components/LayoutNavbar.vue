<template>
  <div class="layout-navbar">
    <div class="flex-y-center">
      <Hamburger
        role="button"
        tabindex="0"
        :aria-label="sidebarState.opened ? $t('navbar.collapseMenu') : $t('navbar.expandMenu')"
        :aria-expanded="sidebarState.opened"
        :is-active="sidebarState.opened"
        @toggle-click="sidebarState.toggle"
        @keydown.enter.prevent="sidebarState.toggle"
        @keydown.space.prevent="sidebarState.toggle"
      />
      <Breadcrumb />
    </div>

    <div class="layout-navbar__actions">
      <LayoutToolbar />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from "@/stores/app";
import Hamburger from "@/components/Hamburger/index.vue";
import Breadcrumb from "@/components/Breadcrumb/index.vue";

const props = withDefaults(
  defineProps<{
    toggleTarget?: "primary" | "secondary";
  }>(),
  {
    toggleTarget: "primary",
  },
);

const appStore = useAppStore();

const sidebarState = computed(() =>
  props.toggleTarget === "secondary"
    ? {
      opened: appStore.secondarySidebar?.opened ?? true,
      toggle: () => appStore.toggleSecondarySidebar(),
    }
    : { opened: appStore.sidebar.opened, toggle: () => appStore.toggleSidebar() },
);
</script>

<style lang="scss" scoped>
.layout-navbar {
  @apply 'flex items-center justify-between';
  height: $navbar-height;
  @apply 'p-[0_14px_0_6px] bg-[var(--content-bg)] [border-bottom:1px_solid_var(--divider-color)]';

  &__actions {
    @apply 'flex items-center h-full';
  }
}
</style>
