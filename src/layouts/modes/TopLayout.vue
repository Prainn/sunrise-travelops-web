<template>
  <BaseLayout>
    <div
      v-show="!appStore.contentFullscreen"
      class="layout-header"
    >
      <div class="layout-header__left">
        <div
          v-if="showLogo"
          class="layout-header__logo"
        >
          <LayoutLogo :collapse="isLogoCollapsed" />
        </div>
        <div class="layout-header__menu">
          <LayoutSidebar
            :data="topMenuItems"
            menu-mode="horizontal"
            base-path=""
          />
        </div>
      </div>
      <div class="layout-header__right">
        <LayoutToolbar />
      </div>
    </div>

    <div class="layout-main">
      <LayoutTagsView v-if="showTagsView" />
      <LayoutMain />
    </div>
  </BaseLayout>
</template>

<script setup lang="ts">
import { useWindowSize } from "@vueuse/core";
import { useLayout } from "../composables/useLayout";
import { useAppStore } from "@/stores/app";
import { usePermissionStore } from "@/stores/permission";
import BaseLayout from "../BaseLayout.vue";
import LayoutLogo from "../components/LayoutLogo.vue";
import LayoutSidebar from "../components/LayoutSidebar.vue";
import LayoutToolbar from "../components/LayoutToolbar.vue";
import LayoutTagsView from "../components/LayoutTagsView.vue";
import LayoutMain from "../components/LayoutMain.vue";

const { showTagsView, showLogo } = useLayout();
const appStore = useAppStore();
const { width } = useWindowSize();

const permissionStore = usePermissionStore();

const topMenuItems = computed(() => {
  return permissionStore.routes.filter((item) => !item.meta?.hidden);
});

const isLogoCollapsed = computed(() => width.value < 768);
</script>

<style lang="scss" scoped>
@use "@/styles/mixins" as *;

.layout-header {
  @apply 'sticky top-0 z-[999] flex items-center justify-between w-full';
  height: $navbar-height;
  background-color: $menu-background;
  @apply '[border-bottom:1px_solid_var(--card-border)]';

  &__left {
    @apply 'flex [flex:1] items-center min-w-0 h-full';
  }

  &__logo {
    @apply 'flex shrink-0 items-center h-full';

    :deep(.layout-logo) {
      height: $navbar-height;
    }
  }

  &__menu {
    @apply 'flex [flex:1] items-center min-w-0 h-full overflow-hidden';

    :deep(.el-menu) {
      height: 100%;
      background-color: transparent;
      border: none;
    }

    :deep(.el-menu--horizontal) {
      flex: 1;
      min-width: 0;
      height: $navbar-height;
      overflow: hidden;
      line-height: $navbar-height;
      background-color: transparent;
      border: none;

      .el-menu-item {
        @apply 'relative';
        height: $navbar-height;
        line-height: $navbar-height;
        @apply '![border-bottom:none]';

        &::after {
          position: absolute;
          right: 16px;
          bottom: 0;
          left: 16px;
          height: 2px;
          content: "";
          background: var(--el-color-primary);
          border-radius: 999px 999px 0 0;
          opacity: 0;
          transform: scaleX(0.5);
          transition:
            opacity 0.16s ease,
            transform 0.16s ease;
        }

        &:hover {
          color: var(--el-color-primary) !important;
          background-color: transparent !important;
        }

        &.is-active {
          color: var(--el-color-primary) !important;
          background-color: transparent !important;
        }

        &.is-active::after {
          opacity: 1;
          transform: scaleX(1);
        }
      }

      .el-sub-menu {
        .el-sub-menu__title {
          height: $navbar-height;
          line-height: $navbar-height;
        }

        &.has-active-child {
          .el-sub-menu__title {
            @apply 'relative !text-[var(--el-color-primary)] !bg-[transparent] ![border-bottom:none]';

            .menu-icon {
              @apply '!text-[var(--el-color-primary)]';
            }

            &::after {
              position: absolute;
              right: 16px;
              bottom: 0;
              left: 16px;
              height: 2px;
              content: "";
              background: var(--el-color-primary);
              border-radius: 999px 999px 0 0;
            }
          }
        }
      }

      .el-menu--popup {
        @apply 'min-w-[160px]';
      }
    }
  }

  &__right {
    @apply 'flex shrink-0 items-center h-full pl-[12px]';
  }
}

.layout-main {
  @include app-main-height;
  @apply 'overflow-y-auto';
}
</style>
