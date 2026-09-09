<template>
  <BaseLayout>
    <aside
      v-show="!appStore.contentFullscreen"
      class="layout-double"
      :class="{
        'is-collapsed': !isSidebarOpen,
        'is-secondary-collapsed': !secondaryExpanded,
      }"
    >
      <div class="layout-double__primary">
        <LayoutLogo
          v-if="showLogo"
          :collapse="true"
        />

        <el-scrollbar class="layout-double__primary-scroll">
          <button
            v-for="item in topMenuItems"
            :key="item.path"
            class="layout-double__primary-item"
            :class="{ 'is-active': item.path === activeTopMenuPath }"
            :title="item.meta?.title ? translateRouteTitle(item.meta.title) : undefined"
            type="button"
            @click="handleTopMenuSelect(item.path)"
          >
            <LayoutMenuIcon :icon="item.meta?.icon" />
            <span v-if="item.meta?.title">{{ translateRouteTitle(item.meta.title) }}</span>
          </button>
        </el-scrollbar>

        <button
          class="layout-double__primary-toggle"
          :title="isSidebarOpen ? $t('navbar.collapseMenu') : $t('navbar.expandMenu')"
          type="button"
          @click="toggleSidebar"
        >
          <div class="i-svg:arrow-left-right layout-double__primary-toggle-icon" />
        </button>
      </div>

      <div
        class="layout-double__secondary"
        :class="{ 'is-collapsed': !secondaryExpanded }"
      >
        <div
          v-if="showLogo"
          class="layout-double__title"
        >
          {{ appConfig.title }}
        </div>

        <el-scrollbar class="layout-double__secondary-scroll">
          <LayoutSidebar
            :data="sideMenuRoutes"
            :base-path="activeTopMenuPath"
            :collapse-override="!secondaryExpanded"
          />
        </el-scrollbar>
      </div>
    </aside>

    <main
      class="layout-main"
      :class="{
        'is-collapsed': !isSidebarOpen,
        'is-secondary-collapsed': !secondaryExpanded,
        'is-fullscreen': appStore.contentFullscreen,
      }"
    >
      <LayoutNavbar
        v-show="!appStore.contentFullscreen"
        toggle-target="secondary"
      />
      <LayoutTagsView v-if="showTagsView" />
      <LayoutMain />
    </main>
  </BaseLayout>
</template>

<script setup lang="ts">
import { useLayout } from "../composables/useLayout";
import { useMixMenu } from "../composables/useMixMenu";
import { useAppStore } from "@/stores/app";
import { appConfig } from "@/settings";
import { translateRouteTitle } from "@/lang/utils";
import BaseLayout from "../BaseLayout.vue";
import LayoutLogo from "../components/LayoutLogo.vue";
import LayoutNavbar from "../components/LayoutNavbar.vue";
import LayoutTagsView from "../components/LayoutTagsView.vue";
import LayoutMain from "../components/LayoutMain.vue";
import LayoutSidebar from "../components/LayoutSidebar.vue";
import LayoutMenuIcon from "../components/LayoutMenuIcon.vue";

const appStore = useAppStore();
const { showTagsView, showLogo, isSidebarOpen, toggleSidebar } = useLayout();

const secondaryExpanded = computed(() => appStore.secondarySidebar?.opened ?? true);

const { topMenuItems, activeTopMenuPath, sideMenuRoutes, handleTopMenuSelect } = useMixMenu();
</script>

<style lang="scss" scoped>
$double-sidebar-width: $sidebar-primary-width + $sidebar-secondary-width;

.layout-double {
  @apply 'fixed top-0 bottom-0 left-0 z-[999] flex';
  width: $double-sidebar-width;
  @apply 'overflow-hidden bg-[var(--menu-background)] [border-right:1px_solid_var(--menu-border)] [transition:width_0.28s]';

  &.is-collapsed {
    width: $sidebar-width-collapsed + $sidebar-secondary-width;

    .layout-double__primary {
      flex-basis: $sidebar-width-collapsed;
      width: $sidebar-width-collapsed;
    }

    .layout-double__primary-item {
      @apply 'gap-0 min-h-[48px] p-[8px_4px]';

      span {
        @apply 'hidden';
      }
    }
  }

  &.is-secondary-collapsed {
    width: $sidebar-primary-width + $sidebar-width-collapsed;

    .layout-double__secondary {
      flex: 0 0 $sidebar-width-collapsed;
      width: $sidebar-width-collapsed;
      min-width: $sidebar-width-collapsed;
    }

    .layout-double__title {
      @apply 'hidden';
    }
  }

  &.is-collapsed.is-secondary-collapsed {
    width: $sidebar-width-collapsed * 2;
  }

  &__primary {
    @apply 'flex';
    flex: 0 0 $sidebar-primary-width;
    @apply 'flex-col';
    width: $sidebar-primary-width;
    @apply 'overflow-hidden';
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--menu-background) 94%, var(--el-color-primary) 6%),
        var(--menu-background)
      ),
      var(--menu-background);
    @apply '[border-right:1px_solid_var(--menu-border)] [transition:flex-basis_0.28s,_width_0.28s]';

    :deep(.layout-logo) {
      height: $navbar-height;
      background-color: transparent;
    }
  }

  &__primary-scroll {
    @apply '[flex:1] min-h-0';
  }

  &__primary-item {
    @apply 'relative flex flex-col gap-[6px] items-center justify-center w-[calc(100%_-_12px)] min-h-[64px] p-[8px_4px] m-[6px] [font:inherit] text-[14px] leading-[1.2] text-[var(--menu-text)] cursor-pointer [background:transparent] [border:0] rounded-[8px] [transition:color_0.18s,_background-color_0.18s]';

    :deep(.layout-menu-icon) {
      width: 20px !important;
      min-width: 20px !important;
      height: 20px !important;
      font-size: 20px !important;
      color: currentcolor !important;
    }

    span {
      @apply 'max-w-full overflow-hidden text-ellipsis text-center whitespace-nowrap';
    }

    &:hover {
      color: var(--menu-active-text);
      background-color: var(--menu-hover);
    }

    &.is-active {
      color: var(--menu-active-text);
      background-color: var(--menu-active-bg);
    }

    &:focus-visible {
      outline: none;
      background-color: var(--menu-hover);
    }
  }

  &__primary-toggle {
    @apply 'flex [flex:0_0_48px] items-center justify-center w-full p-0 [font:inherit] text-[var(--menu-text)] cursor-pointer [background:transparent] [border:none] [border-top:1px_solid_var(--menu-border)] [transition:color_0.18s,_background-color_0.18s]';

    &:hover {
      color: var(--menu-active-text);
      background-color: var(--menu-hover);
    }
  }

  &__primary-toggle-icon {
    @apply 'w-[18px] h-[18px] text-[18px] [transition:transform_0.28s]';
  }

  &__secondary {
    @apply 'flex [flex:0_0_auto] flex-col';
    width: $sidebar-secondary-width;
    @apply 'min-w-0 overflow-hidden bg-[var(--menu-background)] [transition:width_0.28s]';

    :deep(.el-menu) {
      border: none;
    }

    :deep(.el-menu-item span),
    :deep(.el-sub-menu__title span) {
      visibility: visible !important;
      width: auto !important;
      height: auto !important;
      overflow: visible !important;
    }

    :deep(.el-sub-menu__icon-arrow) {
      display: inline-flex !important;
    }

    &.is-collapsed {
      width: $sidebar-width-collapsed;

      :deep(.el-menu--collapse) {
        .el-menu-item span,
        .el-sub-menu__title span {
          display: none !important;
        }

        .el-sub-menu__icon-arrow {
          @apply '!hidden';
        }
      }
    }
  }

  &__secondary-scroll {
    @apply '[flex:1] min-h-0';
  }

  &__title {
    @apply 'flex';
    flex: 0 0 $navbar-height;
    @apply 'items-center';
    min-width: $sidebar-secondary-width;
    @apply 'p-[0_18px] text-[16px] font-semibold text-[var(--sidebar-logo-text-color)] whitespace-nowrap';
  }
}

.layout-main {
  @apply 'relative h-full';
  margin-left: $double-sidebar-width;
  @apply 'overflow-y-auto [transition:margin-left_0.28s]';

  &.is-collapsed {
    margin-left: $sidebar-width-collapsed + $sidebar-secondary-width;
  }

  &.is-secondary-collapsed {
    margin-left: $sidebar-primary-width + $sidebar-width-collapsed;

    &.is-collapsed {
      margin-left: $sidebar-width-collapsed + $sidebar-width-collapsed;
    }
  }

  &.is-fullscreen {
    margin-left: 0 !important;
  }
}

.is-mobile {
  .layout-double {
    width: $double-sidebar-width;
    @apply '[transition:transform_0.28s,_width_0s]';
  }

  &.is-sidebar-collapsed {
    .layout-double {
      transform: translateX(-$double-sidebar-width);
    }
  }

  &.is-sidebar-open {
    .layout-double {
      @apply '[transform:translateX(0)]';
    }
  }

  .layout-main {
    @apply '!ml-0';
  }
}
</style>
