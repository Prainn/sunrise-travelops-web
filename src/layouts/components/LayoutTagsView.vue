<template>
  <div :class="['layout-tabs', tabsStyleClass]">
    <el-scrollbar
      ref="scrollbarRef"
      class="layout-tabs__scroll"
      :view-style="{ height: '100%' }"
      @wheel="handleScroll"
    >
      <div class="layout-tabs__list flex gap-[4px] items-center h-full">
        <div
          v-for="tag in visitedViews"
          :key="tag.fullPath"
          class="layout-tabs__item"
          :class="{
            'is-active': tagsViewStore.isActive(tag),
            'is-affix': tag.affix,
          }"
          @click="openTag(tag)"
          @click.middle="handleMiddleClick(tag)"
          @contextmenu.prevent="openContextMenu(tag, $event)"
        >
          <template v-if="tag.icon">
            <el-icon
              v-if="isEpIcon(tag.icon)"
              :size="14"
            >
              <component :is="toEpIconName(tag.icon)" />
            </el-icon>
            <span
              v-else
              class="layout-tabs__item-icon"
              :class="`i-svg:${tag.icon}`"
            />
          </template>
          <span class="layout-tabs__item-text">
            {{ translateRouteTitle(tag.title) }}
          </span>
          <span
            v-if="!tag.affix"
            class="layout-tabs__item-close"
            @click.stop="closeSelectedTag(tag)"
          >
            <div class="i-svg:close" />
          </span>
        </div>
      </div>
    </el-scrollbar>

    <div class="layout-tabs__actions">
      <button
        type="button"
        class="layout-tabs__action"
        :aria-label="$t('tags.refreshCurrent')"
        :title="$t('tags.refreshCurrent')"
        @click="refreshSelectedTag(currentTag)"
      >
        <el-icon :size="16">
          <Refresh />
        </el-icon>
      </button>
      <button
        type="button"
        class="layout-tabs__action"
        :aria-label="$t('tags.contentFullscreen')"
        :title="$t('tags.contentFullscreen')"
        @click="appStore.toggleContentFullscreen()"
      >
        <div
          v-if="!appStore.contentFullscreen"
          class="i-svg:fullscreen icon-16 w-[16px] h-[16px]"
        />
        <div
          v-else
          class="i-svg:fullscreen-exit icon-16 w-[16px] h-[16px]"
        />
      </button>
      <el-dropdown
        trigger="click"
        @command="handleActionCommand"
      >
        <button
          type="button"
          class="layout-tabs__action"
          :aria-label="$t('tags.actions')"
          :title="$t('tags.actions')"
        >
          <el-icon :size="16">
            <ArrowDown />
          </el-icon>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="refresh">
              <el-icon
                :size="14"
                class="icon-14"
              >
                <Refresh />
              </el-icon>
              <span>{{ $t("tags.refreshCurrent") }}</span>
            </el-dropdown-item>
            <el-dropdown-item
              v-if="currentTag && !currentTag.affix"
              command="closeCurrent"
            >
              <div class="i-svg:close icon-14" />
              <span>{{ $t("tags.closeCurrent") }}</span>
            </el-dropdown-item>
            <el-dropdown-item
              divided
              command="closeOtherTags"
            >
              <div class="i-svg:close_other icon-14" />
              <span>{{ $t("tags.closeOthers") }}</span>
            </el-dropdown-item>
            <el-dropdown-item command="closeLeftTags">
              <div class="i-svg:close_left icon-14" />
              <span>{{ $t("tags.closeLeft") }}</span>
            </el-dropdown-item>
            <el-dropdown-item command="closeRightTags">
              <div class="i-svg:close_right icon-14" />
              <span>{{ $t("tags.closeRight") }}</span>
            </el-dropdown-item>
            <el-dropdown-item
              divided
              command="closeAllTags"
            >
              <div class="i-svg:close_all icon-14" />
              <span>{{ $t("tags.closeAll") }}</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <Teleport to="body">
      <ul
        v-show="contextMenu.visible"
        class="layout-tabs-menu"
        :style="contextMenuStyle"
      >
        <li @click="refreshSelectedTag(selectedTag)">
          <el-icon
            :size="16"
            class="layout-tabs-menu__icon"
          >
            <Refresh />
          </el-icon>
          <span>{{ $t("common.refresh") }}</span>
        </li>
        <li
          v-if="!selectedTag?.affix"
          class="layout-tabs-menu__danger"
          @click="closeSelectedTag(selectedTag)"
        >
          <div class="i-svg:close layout-tabs-menu__icon" />
          <span>{{ $t("common.close") }}</span>
        </li>
        <li class="layout-tabs-menu__divider" />
        <li @click="closeOtherTags">
          <div class="i-svg:close_other layout-tabs-menu__icon" />
          <span>{{ $t("tags.closeOthers") }}</span>
        </li>
        <li
          v-if="!isFirstView"
          @click="closeLeftTags"
        >
          <div class="i-svg:close_left layout-tabs-menu__icon" />
          <span>{{ $t("tags.closeLeft") }}</span>
        </li>
        <li
          v-if="!isLastView"
          @click="closeRightTags"
        >
          <div class="i-svg:close_right layout-tabs-menu__icon" />
          <span>{{ $t("tags.closeRight") }}</span>
        </li>
        <li class="layout-tabs-menu__divider" />
        <li @click="closeAllTags(selectedTag)">
          <div class="i-svg:close_all layout-tabs-menu__icon" />
          <span>{{ $t("tags.closeAll") }}</span>
        </li>
      </ul>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter, type RouteRecordRaw } from "vue-router";
import { resolve } from "path-browserify";
import { TagsViewStyle } from "@/enums";
import { translateRouteTitle } from "@/lang/utils";
import { useAppStore } from "@/stores/app";
import { usePermissionStore } from "@/stores/permission";
import { useSettingsStore } from "@/stores/settings";
import { useTagsViewStore } from "@/stores/tags-view";
import { isExternal } from "@/utils";
import type { TagView } from "@/stores/tags-view";
import { ArrowDown, Refresh } from "@element-plus/icons-vue";

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
}

const router = useRouter();
const route = useRoute();

const appStore = useAppStore();
const permissionStore = usePermissionStore();
const settingsStore = useSettingsStore();
const tagsViewStore = useTagsViewStore();

const { visitedViews } = storeToRefs(tagsViewStore);

const selectedTag = ref<TagView | null>(null);

const contextMenu = reactive<ContextMenu>({
  visible: false,
  x: 0,
  y: 0,
});

const scrollbarRef = ref();

const currentTag = computed(() => {
  return visitedViews.value.find((tag) => tagsViewStore.isActive(tag)) || null;
});

const tabsStyleClass = computed(() => {
  switch (settingsStore.tagsViewStyle) {
    case TagsViewStyle.CARD:
      return "layout-tabs--card";
    case TagsViewStyle.LINE:
    default:
      return "layout-tabs--line";
  }
});

const isEpIcon = (icon: string) => icon.startsWith("el-icon");

const toEpIconName = (icon: string) =>
  icon.replace("el-icon-", "").replace(/(^|-)\w/g, (s) => s.slice(-1).toUpperCase());

const contextMenuStyle = computed(() => {
  const menuWidth = 160;
  const menuHeight = 220;
  const padding = 8;

  let x = contextMenu.x;
  let y = contextMenu.y;

  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - padding;
  }
  if (y + menuHeight > window.innerHeight) {
    y = window.innerHeight - menuHeight - padding;
  }

  return {
    left: `${Math.max(padding, x)}px`,
    top: `${Math.max(padding, y)}px`,
  };
});

const handleActionCommand = (command: string) => {
  switch (command) {
    case "refresh":
      refreshSelectedTag(currentTag.value);
      break;
    case "closeCurrent":
      closeSelectedTag(currentTag.value);
      break;
    case "closeOtherTags":
      closeOtherTagsForActive();
      break;
    case "closeLeftTags":
      closeLeftTagsForActive();
      break;
    case "closeRightTags":
      closeRightTagsForActive();
      break;
    case "closeAllTags":
      closeAllTags(currentTag.value);
      break;
  }
};

const routePathMap = computed(() => {
  const map = new Map<string, TagView>();
  visitedViews.value.forEach((tag) => {
    map.set(tag.path, tag);
  });
  return map;
});

const isFirstView = computed(() => {
  if (!selectedTag.value) return false;
  return (
    selectedTag.value.path === "/dashboard" ||
    selectedTag.value.fullPath === visitedViews.value[1]?.fullPath
  );
});

const isLastView = computed(() => {
  if (!selectedTag.value) return false;
  return selectedTag.value.fullPath === visitedViews.value[visitedViews.value.length - 1]?.fullPath;
});

const extractAffixTags = (routes: RouteRecordRaw[], basePath = "/"): TagView[] => {
  const affixTags: TagView[] = [];

  const traverse = (routeList: RouteRecordRaw[], currentBasePath: string) => {
    routeList.forEach((route) => {
      const fullPath = resolve(currentBasePath, route.path);

      if (route.meta?.affix) {
        affixTags.push({
          path: fullPath,
          fullPath,
          name: String(route.name || ""),
          title: route.meta.title || "no-name",
          icon: route.meta.icon,
          affix: true,
          keepAlive: route.meta.keepAlive || false,
        });
      }

      if (route.children?.length) {
        traverse(route.children, fullPath);
      }
    });
  };

  traverse(routes, basePath);
  return affixTags;
};

const initAffixTags = () => {
  const affixTags = extractAffixTags(permissionStore.routes);

  affixTags.forEach((tag) => {
    if (tag.name) {
      tagsViewStore.addVisitedView(tag);
    }
  });
};

const addCurrentTag = () => {
  if (!route.meta?.title) return;
  if (isExternal(route.path) || isExternal(route.fullPath)) return;

  tagsViewStore.addView({
    name: route.name as string,
    title: route.meta.title,
    path: route.path,
    fullPath: route.fullPath,
    icon: route.meta.icon,
    affix: route.meta.affix || false,
    keepAlive: route.meta.keepAlive || false,
    query: route.query,
  });
};

const openTag = (tag: TagView) => {
  if (isExternal(tag.fullPath)) {
    window.open(tag.fullPath, "_blank", "noopener,noreferrer");
    return;
  }

  router.push({
    path: tag.fullPath,
    query: tag.query,
  });
};

const updateCurrentTag = () => {
  nextTick(() => {
    const currentTag = routePathMap.value.get(route.path);

    if (currentTag && currentTag.fullPath !== route.fullPath) {
      tagsViewStore.updateVisitedView({
        name: route.name as string,
        title: route.meta?.title || "",
        path: route.path,
        fullPath: route.fullPath,
        icon: route.meta?.icon,
        affix: route.meta?.affix || false,
        keepAlive: route.meta?.keepAlive || false,
        query: route.query,
      });
    }
  });
};

const handleMiddleClick = (tag: TagView) => {
  if (!tag.affix) {
    closeSelectedTag(tag);
  }
};

const openContextMenu = (tag: TagView, event: MouseEvent) => {
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.visible = true;
  selectedTag.value = tag;
};

const closeContextMenu = () => {
  contextMenu.visible = false;
};

const handleScroll = (event: WheelEvent) => {
  closeContextMenu();

  const scrollWrapper = scrollbarRef.value?.wrapRef;
  if (!scrollWrapper) return;

  const hasHorizontalScroll = scrollWrapper.scrollWidth > scrollWrapper.clientWidth;
  if (!hasHorizontalScroll) return;

  const legacyEvent = event as WheelEvent & { wheelDelta?: number };
  const deltaY = event.deltaY || -(legacyEvent.wheelDelta ?? 0);
  const newScrollLeft = scrollWrapper.scrollLeft + deltaY;

  scrollbarRef.value.setScrollLeft(newScrollLeft);
};

const refreshSelectedTag = (tag: TagView | null) => {
  if (!tag) return;

  tagsViewStore.delCachedView(tag);
  nextTick(() => {
    router.replace("/redirect" + tag.fullPath);
  });
};

const closeSelectedTag = (tag: TagView | null) => {
  if (!tag) return;

  tagsViewStore.delView(tag).then((result) => {
    if (tagsViewStore.isActive(tag)) {
      tagsViewStore.toLastView(result.visitedViews, tag);
    }
  });
};

/**
 * 关闭指定方向的标签
 */
function closeDirectionalTags(
  source: Ref<TagView | null>,
  batchFn: (tag: TagView) => Promise<{ visitedViews: TagView[] }>
) {
  const tag = source.value;
  if (!tag) return;

  batchFn(tag).then(({ visitedViews }) => {
    const stillVisible = visitedViews.some((v) => v.path === route.path);
    if (!stillVisible) {
      tagsViewStore.toLastView(visitedViews);
    }
  });
}

/**
 * 关闭当前激活标签之外的其它标签
 */
const closeOtherTagsForActive = () => {
  if (!currentTag.value) return;
  tagsViewStore.delOtherViews(currentTag.value).then(() => {
    updateCurrentTag();
  });
};

const closeLeftTagsForActive = () => closeDirectionalTags(currentTag, tagsViewStore.delLeftViews);
const closeRightTagsForActive = () => closeDirectionalTags(currentTag, tagsViewStore.delRightViews);
const closeLeftTags = () => closeDirectionalTags(selectedTag, tagsViewStore.delLeftViews);
const closeRightTags = () => closeDirectionalTags(selectedTag, tagsViewStore.delRightViews);

const closeOtherTags = () => {
  if (!selectedTag.value) return;
  router.push(selectedTag.value);
  tagsViewStore.delOtherViews(selectedTag.value).then(() => {
    updateCurrentTag();
  });
};

const closeAllTags = (tag: TagView | null) => {
  tagsViewStore.delAllViews().then((result) => {
    tagsViewStore.toLastView(result.visitedViews, tag || undefined);
  });
};

const useContextMenuManager = () => {
  const handleOutsideClick = () => {
    closeContextMenu();
  };

  watchEffect(() => {
    if (contextMenu.visible) {
      document.addEventListener("click", handleOutsideClick);
    } else {
      document.removeEventListener("click", handleOutsideClick);
    }
  });

  onBeforeUnmount(() => {
    document.removeEventListener("click", handleOutsideClick);
  });
};

watch(
  route,
  () => {
    addCurrentTag();
    updateCurrentTag();
  },
  { immediate: true }
);

onMounted(() => {
  initAffixTags();
});

useContextMenuManager();
</script>

<style lang="scss" scoped>
.layout-tabs {
  @apply 'relative z-[10] flex items-center w-full';
  height: $tags-view-height;
  @apply 'p-[0_12px] bg-[var(--content-bg)] [border-bottom:1px_solid_var(--card-border)]';
}

.layout-tabs__scroll {
  @apply '[flex:1] min-w-0 h-full';

  :deep(.el-scrollbar__wrap) {
    overflow-y: hidden;
  }
}

.layout-tabs__item {
  @apply 'relative inline-flex shrink-0 gap-[6px] items-center h-[26px] p-[0_12px] text-[14px] text-[var(--el-text-color-regular)] cursor-pointer [user-select:none] [background:#f8fafc] [border:1px_solid_var(--card-border)] rounded-[2px] [transition:color_0.15s_ease,_background-color_0.15s_ease,_border-color_0.15s_ease]';

  &-icon {
    @apply 'shrink-0 w-[14px] h-[14px] opacity-[0.5] [transition:opacity_0.15s_ease]';
  }

  &-text {
    @apply 'whitespace-nowrap';
  }

  &-close {
    @apply 'inline-flex items-center justify-center w-[16px] h-[16px] ml-[1px] text-[14px] rounded-[4px] opacity-0 [transition:opacity_0.12s_ease,_background-color_0.12s_ease]';

    :deep(div) {
      width: 12px;
      height: 12px;
    }

    &:hover {
      background-color: rgb(0 0 0 / 10%);
    }
  }

  &:hover {
    color: var(--el-text-color-primary);
    background-color: var(--content-bg);
    border-color: var(--el-border-color);

    .layout-tabs__item-close {
      @apply 'opacity-[1]';
    }

    .layout-tabs__item-icon {
      @apply 'opacity-[0.7]';
    }
  }

  &.is-active {
    font-weight: 500;
    color: var(--el-color-primary);
    background-color: var(--content-bg);
    border-color: var(--el-color-primary-light-5);

    .layout-tabs__item-icon {
      @apply 'text-[var(--el-color-primary)] opacity-[1]';
    }

    .layout-tabs__item-close {
      @apply 'opacity-[0.6]';

      &:hover {
        background-color: var(--el-color-primary-light-7);
        opacity: 1;
      }
    }
  }

  &.is-affix {
    .layout-tabs__item-text {
      @apply 'font-medium';
    }
  }
}

.layout-tabs--line {
  .layout-tabs__list {
    @apply 'gap-[8px]';
  }

  .layout-tabs__item {
    @apply 'h-full p-[0_8px] text-[var(--el-text-color-secondary)] [background:transparent] [border:0] rounded-0';

    &::after {
      position: absolute;
      right: 6px;
      bottom: 0;
      left: 6px;
      height: 2px;
      content: "";
      background: var(--el-color-primary);
      transform: scaleX(0);
      transform-origin: center;
      transition: transform 0.16s ease;
    }

    &:hover {
      color: var(--el-text-color-primary);
      background: var(--el-fill-color-lighter);
      border-color: transparent;
      border-radius: 4px 4px 0 0;
    }

    &.is-active {
      color: var(--el-color-primary);
      background: transparent;
      border-color: transparent;

      &::after {
        transform: scaleX(1);
      }
    }
  }
}

.layout-tabs--card {
  .layout-tabs__list {
    @apply 'gap-[8px]';
  }

  .layout-tabs__item {
    @apply 'h-[28px] p-[0_10px] text-[var(--el-text-color-secondary)] [background:transparent] [border-color:transparent] rounded-[4px]';

    &:hover {
      color: var(--el-text-color-primary);
      background: var(--el-fill-color-lighter);
      border-color: transparent;
    }

    &.is-active {
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary-light-6);
    }
  }
}

.layout-tabs__actions {
  @apply 'flex shrink-0 gap-[4px] items-center h-full pl-[8px]';

  .layout-tabs__action {
    @apply 'inline-flex items-center justify-center w-[30px] h-[30px] p-0 [font:inherit] text-[var(--el-text-color-regular)] [appearance:none] cursor-pointer [background:transparent] [border:0] rounded-[6px] [transition:color_0.15s_ease,_background-color_0.15s_ease]';

    &:hover {
      color: var(--el-color-primary);
      background-color: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary-light-5);
      outline-offset: 1px;
    }

    :deep(.el-icon) {
      color: currentcolor;
      --color: currentcolor;
    }

    .icon-16 {
      @apply 'bg-[currentcolor]';
      color: currentcolor;
    }
  }
}

.icon-14 {
  @apply 'shrink-0 w-[14px] h-[14px] mr-[6px] opacity-[0.55]';

  &.el-icon {
    width: 14px;
    height: 14px;
  }
}

.layout-tabs-menu {
  @apply 'fixed z-[3000] min-w-[150px] p-[6px] m-0 text-[14px] text-[var(--el-text-color-primary)] [list-style-type:none] [background:var(--el-bg-color-overlay)] [border:1px_solid_var(--el-border-color-lighter)] rounded-[10px] [box-shadow:var(--el-box-shadow)]';

  li {
    @apply 'flex gap-[10px] items-center p-[7px_10px] m-[1px_0] cursor-pointer rounded-[6px] [transition:background-color_0.15s_ease]';

    &:hover {
      background: var(--el-fill-color-light);
    }
  }

  &__icon {
    @apply 'shrink-0 w-[16px] h-[16px] opacity-[0.55]';
  }

  &__danger {
    &:hover {
      color: var(--el-color-danger);
      background-color: var(--el-color-danger-light-9);

      .layout-tabs-menu__icon {
        @apply 'opacity-[1]';
      }
    }
  }

  &__divider {
    @apply 'h-[1px] !p-0 !m-[5px_8px] pointer-events-none !cursor-default bg-[var(--el-border-color-lighter)]';

    &:hover {
      background-color: var(--el-border-color-lighter) !important;
    }
  }
}
</style>
