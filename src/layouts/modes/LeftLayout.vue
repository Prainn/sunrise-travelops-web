<template>
  <BaseLayout>
    <div
      v-show="!appStore.contentFullscreen"
      class="layout-sidebar"
      :class="{ 'is-collapsed': !sidebarExpanded }"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
    >
      <div :class="{ 'has-logo': showLogo }" class="layout-sidebar__inner">
        <LayoutLogo v-if="showLogo" :collapse="!sidebarExpanded" />
        <el-button
          v-if="isWorkspaceNavbarHidden"
          text
          class="w-full"
          :aria-label="$t(isSidebarOpen ? 'itineraryWorkspace.collapseMenu' : 'itineraryWorkspace.expandMenu')"
          @click="toggleWorkspaceSidebar"
        >
          <el-icon><Fold v-if="isSidebarOpen" /><Expand v-else /></el-icon>
        </el-button>
        <el-scrollbar :class="{ 'workspace-menu': isWorkspaceNavbarHidden }">
          <LayoutSidebar :data="routes" base-path="" :collapse-override="!sidebarExpanded" />
        </el-scrollbar>
      </div>
    </div>

    <div
      class="layout-main"
      :class="{
        'is-collapsed': !isSidebarOpen,
        'is-fullscreen': appStore.contentFullscreen,
      }"
    >
      <LayoutNavbar v-show="!appStore.contentFullscreen && !isWorkspaceNavbarHidden" />
      <LayoutTagsView v-if="showTagsView && !isWorkspaceChromeless" />
      <LayoutMain />
    </div>
  </BaseLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { Fold, Expand } from "@element-plus/icons-vue";
import { useLayout } from "../composables/useLayout";
import { useAppStore } from "@/stores/app";
import BaseLayout from "../BaseLayout.vue";
import LayoutLogo from "../components/LayoutLogo.vue";
import LayoutNavbar from "../components/LayoutNavbar.vue";
import LayoutTagsView from "../components/LayoutTagsView.vue";
import LayoutMain from "../components/LayoutMain.vue";
import LayoutSidebar from "../components/LayoutSidebar.vue";

const { showTagsView, showLogo, isSidebarOpen, isWorkspaceChromeless, isWorkspaceNavbarHidden, routes } = useLayout();
const appStore = useAppStore();
const hovered = ref(false);
const sidebarExpanded = computed(() => isSidebarOpen.value || (isWorkspaceNavbarHidden.value && hovered.value));
function toggleWorkspaceSidebar() { hovered.value = false; appStore.toggleSidebar(); }
watch(isWorkspaceChromeless, (current, previous) => { if (previous && !current) appStore.openSidebar(); hovered.value = false; });
onBeforeUnmount(() => { if (isWorkspaceChromeless.value) appStore.openSidebar(); });
</script>

<style lang="scss" scoped>
@use "@/styles/mixins" as *;

.layout-sidebar {
  @apply 'fixed top-0 bottom-0 left-0 z-[999]';
  width: $sidebar-width;
  background-color: $menu-background;
  @apply '[transition:width_0.28s]';

  &.is-collapsed {
    width: $sidebar-width-collapsed;
  }

  &__inner {
    @apply 'relative h-full bg-[var(--menu-background)] [border-right:1px_solid_var(--menu-border)] [transition:width_0.28s]';

    &.has-logo {
      .el-scrollbar {
        @include sidebar-scroll-height-with-logo;
      }
    }

    .workspace-menu { height: calc(100% - 32px); }
    &.has-logo .workspace-menu { height: calc(100% - 32px - var(--navbar-height, 50px)); }

    :deep(.el-menu) {
      border: none;
    }
  }
}

.layout-main {
  @apply 'relative h-full';
  margin-left: $sidebar-width;
  @apply 'overflow-y-auto [transition:margin-left_0.28s]';

  &.is-collapsed {
    margin-left: $sidebar-width-collapsed;
  }

  &.is-fullscreen {
    margin-left: 0 !important;
  }
}

.is-mobile {
  .layout-sidebar {
    width: $sidebar-width !important;
    @apply '[transition:transform_0.28s,_width_0s]';
  }

  &.is-sidebar-collapsed {
    .layout-sidebar {
      transform: translateX(-$sidebar-width);
    }
  }

  &.is-sidebar-open {
    .layout-sidebar {
      @apply '[transform:translateX(0)]';
    }
  }

  .layout-main {
    @apply '!ml-0';
  }
}
</style>
