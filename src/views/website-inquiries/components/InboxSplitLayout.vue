<template>
  <div
    class="inbox-split"
    :class="{ 'is-overlay': isOverlay }"
    @keydown.esc="closeOverlays"
  >
    <div
      v-if="hasActiveOverlay"
      class="inbox-split__backdrop"
      aria-hidden="true"
      @click="closeOverlays"
    />
    <aside
      class="inbox-split__list"
      :class="{ 'is-collapsed': !listOpen }"
    >
      <div class="inbox-split__panel" :inert="!listOpen">
        <div class="inbox-split__panel-inner">
          <slot name="list" />
        </div>
      </div>
      <button
        type="button"
        class="inbox-split__toggle inbox-split__toggle--list"
        :aria-expanded="listOpen"
        :aria-label="listOpen ? listCollapseLabel : listExpandLabel"
        :title="listOpen ? listCollapseLabel : listExpandLabel"
        @click="toggleList"
      >
        <el-icon aria-hidden="true">
          <ArrowLeft v-if="listOpen" />
          <ArrowRight v-else />
        </el-icon>
      </button>
    </aside>
    <div class="inbox-split__content">
      <slot name="banner" />
      <div class="inbox-split__body">
        <slot />
        <aside
          v-if="hasInfo"
          class="inbox-split__info"
          :class="{ 'is-collapsed': !infoOpen }"
        >
          <button
            type="button"
            class="inbox-split__toggle inbox-split__toggle--info"
            :aria-expanded="infoOpen"
            :aria-label="infoOpen ? infoCollapseLabel : infoExpandLabel"
            :title="infoOpen ? infoCollapseLabel : infoExpandLabel"
            @click="toggleInfo"
          >
            <el-icon aria-hidden="true">
              <ArrowRight v-if="infoOpen" />
              <ArrowLeft v-else />
            </el-icon>
          </button>
          <div class="inbox-split__panel" :inert="!infoOpen">
            <div class="inbox-split__panel-inner">
              <slot name="info" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ArrowLeft, ArrowRight } from "@element-plus/icons-vue";
import { useWindowSize } from "@vueuse/core";

const props = withDefaults(
  defineProps<{
    /** 右侧信息面板是否可用；未选中记录时不渲染右侧面板与展开箭头。 */
    hasInfo?: boolean;
    listCollapseLabel: string;
    listExpandLabel: string;
    infoCollapseLabel: string;
    infoExpandLabel: string;
  }>(),
  { hasInfo: false },
);

const { width: windowWidth } = useWindowSize();
const listOpen = ref(true);
const infoOpen = ref(true);

/** 宽屏两侧面板都展开；中屏先收起右侧信息；小屏都收起，把宽度留给主体内容。 */
const panelLayout = computed(() => {
  if (windowWidth.value >= 1400) return "wide";
  return windowWidth.value >= 1024 ? "medium" : "narrow";
});

/** 移动端窄屏下改用叠层抽屉展开侧栏，避免挤压主体内容或造成左右按钮重叠。 */
const isOverlay = computed(() => windowWidth.value < 768);
const hasActiveOverlay = computed(() => isOverlay.value && (listOpen.value || (props.hasInfo && infoOpen.value)));

// 窗口跨过断点时按新宽度重置面板，同一断点内保留用户手动展开或收起的状态。
watch(panelLayout, (layout) => {
  listOpen.value = layout !== "narrow";
  infoOpen.value = layout === "wide";
}, { immediate: true });

function toggleList() {
  const next = !listOpen.value;
  listOpen.value = next;
  // 窄屏下同一时间只展开一侧面板，避免两侧同时占用空间或叠层冲突。
  if (next && panelLayout.value === "narrow") infoOpen.value = false;
}

function toggleInfo() {
  const next = !infoOpen.value;
  infoOpen.value = next;
  if (next && panelLayout.value === "narrow") listOpen.value = false;
}

function closeOverlays() {
  if (!isOverlay.value) return;
  listOpen.value = false;
  infoOpen.value = false;
}

/** 移动端抽屉模式下选中列表项后自动收起左侧列表，直接露出主体内容。 */
function closeOverlayList() {
  if (isOverlay.value) listOpen.value = false;
}

defineExpose({ closeOverlayList });
</script>

<style scoped lang="scss">
.inbox-split {
  --inbox-panel-width: 320px;

  position: relative;
  display: flex;
  flex: 1 1 0;
  gap: var(--page-gap);
  min-width: 0;
  min-height: 0;
  container-type: inline-size;

  &.is-overlay {
    --inbox-panel-width: min(320px, calc(100cqi - 36px));
    gap: 0;
  }
}

.inbox-split__backdrop {
  position: absolute;
  inset: 0;
  z-index: 15;
  background: rgb(15 23 42 / 28%);
  border-radius: var(--card-radius);
}

.inbox-split__list,
.inbox-split__info {
  position: relative;
  display: flex;
  flex: 0 0 var(--inbox-panel-width);
  min-width: 0;
  min-height: 0;
  transition: flex-basis 0.25s ease-out;

  &.is-collapsed {
    flex-basis: 0;
  }
}

.inbox-split__panel {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  transition: opacity 0.25s ease-out;

  .is-collapsed > & {
    pointer-events: none;
    opacity: 0;
  }
}

.inbox-split__panel-inner {
  display: flex;
  flex-direction: column;
  width: var(--inbox-panel-width);
  height: 100%;
  min-height: 0;
}

.inbox-split__content {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: var(--page-gap);
  min-width: 0;
  min-height: 0;
}

.inbox-split__body {
  display: flex;
  flex: 1 1 0;
  gap: var(--page-gap);
  min-width: 0;
  min-height: 0;

  .is-overlay & {
    gap: 0;
  }
}

.inbox-split__toggle {
  position: absolute;
  top: 50%;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 52px;
  padding: 0;
  font-size: 14px;
  color: var(--el-text-color-primary);
  cursor: pointer;
  background: var(--content-bg);
  border: 1px solid var(--el-border-color-darker);
  border-radius: 999px;
  box-shadow: 0 2px 8px rgb(16 24 40 / 14%), 0 1px 2px rgb(16 24 40 / 8%);
  transition: color 0.16s, border-color 0.16s, background-color 0.16s, box-shadow 0.16s;

  // 触屏下通过透明伪元素扩展热区到 44px 以上，不遮挡相邻内容。
  &::after {
    position: absolute;
    inset: -6px;
    content: "";
  }

  &:hover {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
    box-shadow: 0 4px 12px rgb(22 93 255 / 22%);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &--list {
    right: calc(var(--page-gap) / -2);
    transform: translate(50%, -50%);
  }

  &--info {
    left: calc(var(--page-gap) / -2);
    transform: translate(-50%, -50%);
  }

  // 收起态是展开面板的唯一入口，使用高对比主题色确保在浅色卡片与气泡旁都清晰可见。
  .is-collapsed > & {
    color: #fff;
    background: var(--el-color-primary);
    border-color: var(--el-color-primary);
    box-shadow: 0 4px 12px rgb(22 93 255 / 32%);

    &:hover {
      color: #fff;
      background: var(--el-color-primary-light-3);
      border-color: var(--el-color-primary-light-3);
    }
  }
}

.inbox-split.is-overlay {
  .inbox-split__list,
  .inbox-split__info {
    position: absolute;
    inset-block: 0;
    z-index: 20;
    flex: none;
    width: var(--inbox-panel-width);
    transition: width 0.25s ease-out;

    &.is-collapsed {
      z-index: 10;
      width: 0;
    }

    &:not(.is-collapsed) > .inbox-split__panel {
      border-radius: var(--card-radius);
      box-shadow: var(--overlay-shadow);
    }
  }

  .inbox-split__list {
    left: 0;
  }

  .inbox-split__info {
    right: 0;
  }

  .inbox-split__toggle {
    width: 28px;
    height: 60px;
    font-size: 16px;

    &::after {
      inset: -8px;
    }

    &--list {
      right: 0;
      left: auto;
      transform: translate(50%, -50%);
    }

    &--info {
      right: auto;
      left: 0;
      transform: translate(-50%, -50%);
    }
  }

  .inbox-split__list.is-collapsed > .inbox-split__toggle--list {
    right: auto;
    left: -10px;
    border-radius: 0 12px 12px 0;
    transform: translateY(-50%);
  }

  .inbox-split__info.is-collapsed > .inbox-split__toggle--info {
    right: -10px;
    left: auto;
    border-radius: 12px 0 0 12px;
    transform: translateY(-50%);
  }
}

@media (pointer: coarse) {
  .inbox-split__toggle {
    width: 28px;
    height: 60px;
    font-size: 16px;

    &::after {
      inset: -8px;
    }
  }
}

:global(html.dark) .inbox-split__toggle {
  box-shadow: 0 2px 8px rgb(0 0 0 / 40%);
}

@media (prefers-reduced-motion: reduce) {
  .inbox-split__list,
  .inbox-split__info,
  .inbox-split__panel,
  .inbox-split__toggle {
    transition: none;
  }
}
</style>
