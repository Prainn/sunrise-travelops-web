<template>
  <div :class="['layout-toolbar', toolbarToneClass]">
    <template v-if="isDesktop">
      <div class="layout-toolbar__item layout-toolbar__item--search">
        <CommandPalette />
      </div>

      <div class="layout-toolbar__item">
        <Fullscreen />
      </div>

      <div class="layout-toolbar__item">
        <SizeSelect />
      </div>

      <div class="layout-toolbar__item">
        <LangSelect />
      </div>
    </template>

    <div class="layout-toolbar__item layout-toolbar__item--profile">
      <el-dropdown trigger="click">
        <div class="layout-user">
          <div class="layout-user__avatar">
            <img
              :src="userStore.userInfo.avatar"
              class="layout-user__avatar-img"
            />
          </div>
          <span class="layout-user__name">{{ userStore.userInfo.username }}</span>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="handleProfileClick">
              {{ t("navbar.profile") }}
            </el-dropdown-item>
            <el-dropdown-item
              divided
              @click="logout"
            >
              {{ t("navbar.logout") }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <div
      v-if="defaults.showSettings"
      class="layout-toolbar__item"
      @click="handleSettingsClick"
    >
      <div class="i-svg:setting" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { defaults } from "@/settings";
import { DeviceEnum, SidebarColor, ThemeMode, LayoutMode } from "@/enums/settings";
import { useAppStore } from "@/stores/app";
import { useSettingsStore } from "@/stores/settings";
import { useUserStore } from "@/stores/user";

import CommandPalette from "@/components/CommandPalette/index.vue";
import Fullscreen from "@/components/Fullscreen/index.vue";
import SizeSelect from "@/components/SizeSelect/index.vue";
import LangSelect from "@/components/LangSelect/index.vue";

const { t } = useI18n();
const appStore = useAppStore();
const settingStore = useSettingsStore();
const userStore = useUserStore();

const router = useRouter();

const isDesktop = computed(() => appStore.device === DeviceEnum.DESKTOP);

/**
 * 打开个人中心页面
 */
function handleProfileClick() {
  router.push({ name: "Profile" });
}

const toolbarToneClass = computed(() => {
  const { resolvedTheme, sidebarColorScheme, layout } = settingStore;

  if (resolvedTheme === ThemeMode.DARK) {
    return "layout-toolbar--light";
  }

  const isHeaderMenuLayout = layout === LayoutMode.TOP || layout === LayoutMode.MIX;
  if (isHeaderMenuLayout && sidebarColorScheme === SidebarColor.CLASSIC_BLUE) {
    return "layout-toolbar--light";
  }

  return "layout-toolbar--dark";
});

/**
 * 退出登录
 */
function logout() {
  ElMessageBox.confirm(t("navbar.logoutConfirm"), t("common.tip"), {
    confirmButtonText: t("common.confirm"),
    cancelButtonText: t("common.cancel"),
    type: "warning",
    lockScroll: false,
  }).then(() => {
    userStore.logout().then(() => {
      router.push("/login");
    });
  });
}

/**
 * 打开系统设置页面
 */
function handleSettingsClick() {
  settingStore.settingsVisible = true;
}
</script>

<style lang="scss" scoped>
.layout-toolbar {
  --layout-toolbar-color: var(--el-text-color-secondary);
  --layout-toolbar-hover-color: var(--el-color-primary);
  --layout-toolbar-hover-bg: var(--el-fill-color-light);

  @apply 'flex gap-[4px] items-center min-h-[32px]';

  &__item {
    @apply 'relative flex items-center justify-center min-w-[32px] h-[32px] p-[0_6px] text-[var(--layout-toolbar-color)] text-center cursor-pointer rounded-[6px] [transition:background-color_0.16s,_color_0.16s]';

    > [class*="i-svg:"] {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    :deep(.el-dropdown),
    :deep(.el-tooltip) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 32px;
      color: inherit !important;
    }

    :deep(.el-tooltip__trigger),
    :deep(.fullscreen-trigger),
    :deep(.size-trigger),
    :deep(.notice__trigger) {
      color: inherit;
    }

    :deep(.i-svg\:language) {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      font-size: 16px;
      line-height: 16px;
      background-size: 16px 16px;
    }

    :deep([class*="i-svg:"]),
    :deep(.el-icon) {
      --color: currentColor;

      font-size: 16px;
      line-height: 1;
      color: currentColor !important;
      transition: color 0.16s;
    }

    :deep([class*="i-svg:"]) {
      background-color: currentColor !important;
    }

    &:hover {
      color: var(--layout-toolbar-hover-color);
      background: var(--layout-toolbar-hover-bg);
    }
  }

  &__item--search {
    @apply 'text-[var(--el-text-color-secondary)]';

    &:hover {
      background: transparent;
    }
  }

  &__item--profile {
    @apply 'pr-[4px] pl-[4px]';

    &:hover {
      background: transparent;
    }
  }
}

.layout-user {
  @apply 'flex items-center justify-center h-[32px] p-[0_6px_0_2px]';

  &__avatar {
    @apply 'shrink-0 w-[28px] h-[28px] overflow-hidden rounded-[50%]';
  }

  &__avatar-img {
    @apply 'w-full h-full object-cover [object-position:center]';
  }

  &__name {
    @apply 'ml-[8px] text-[14px] text-[currentColor] whitespace-nowrap [transition:color_0.3s]';
  }
}

.layout-toolbar--light {
  --layout-toolbar-color: var(--menu-text);
  --layout-toolbar-hover-color: var(--menu-active-text);
  --layout-toolbar-hover-bg: var(--menu-hover);

  .layout-user__name {
    @apply 'text-[currentColor]';
  }

}

.layout-toolbar--dark {
  --layout-toolbar-color: var(--el-text-color-secondary);
  --layout-toolbar-hover-color: var(--el-color-primary);
  --layout-toolbar-hover-bg: var(--el-fill-color-light);

  .layout-user__name {
    @apply 'text-[var(--el-text-color-regular)]';
  }

}

::v-deep(.el-dropdown-menu) {
  [class*="i-svg:"] {
    color: var(--el-text-color-regular) !important;

    &:hover {
      color: var(--el-color-primary) !important;
    }
  }
}
</style>
