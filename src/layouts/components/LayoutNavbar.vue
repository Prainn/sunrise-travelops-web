<template>
  <div class="layout-navbar">
    <div class="flex-y-center">
      <Hamburger
        :is-active="sidebarState.opened"
        @toggle-click="sidebarState.toggle"
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
  }
);

const appStore = useAppStore();

const sidebarState = computed(() =>
  props.toggleTarget === "secondary"
    ? {
        opened: appStore.secondarySidebar?.opened ?? true,
        toggle: () => appStore.toggleSecondarySidebar(),
      }
    : { opened: appStore.sidebar.opened, toggle: () => appStore.toggleSidebar() }
);
</script>

<style lang="scss" scoped>
.layout-navbar {
  @apply 'flex items-center justify-between';
  height: $navbar-height;
  @apply 'p-[0_14px_0_6px] bg-[var(--content-bg)] [border-bottom:1px_solid_var(--card-border)]';
  box-shadow: 0 1px 0 rgb(15 23 42 / 3%);

  &__actions {
    @apply 'flex items-center h-full';
  }
}
</style>
