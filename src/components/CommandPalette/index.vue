<template>
  <div>
    <div
      class="command-palette-trigger flex gap-[8px] items-center justify-between w-[200px] h-[28px] p-[0_8px_0_10px] [user-select:none] [background:var(--el-fill-color-extra-light)] [border:1px_solid_var(--el-border-color-light)] rounded-[6px] [transition:background-color_0.16s,_border-color_0.16s]"
      role="button"
      tabindex="0"
      :aria-label="$t('commandPalette.open')"
      @click="open"
      @keydown.enter.prevent="open"
      @keydown.space.prevent="open"
    >
      <div class="command-palette-trigger__left flex gap-[6px] items-center min-w-0">
        <div class="i-svg:search" />
        <span class="command-palette-trigger__text overflow-hidden text-ellipsis text-[14px] text-[var(--el-text-color-secondary)] whitespace-nowrap">{{ $t("commandPalette.searchMenu") }}</span>
      </div>
      <kbd class="command-palette-trigger__kbd inline-flex items-center justify-center h-[18px] p-[0_6px] text-[14px] leading-[1] text-[var(--el-text-color-placeholder)] whitespace-nowrap [background:var(--el-bg-color-overlay)] [border:1px_solid_var(--el-border-color)] rounded-[4px]">Ctrl K</kbd>
    </div>

    <el-dialog
      v-model="visible"
      width="720px"
      :close-on-click-modal="true"
      :show-close="false"
      @close="close"
    >
      <div class="command-palette-dialog flex flex-col gap-[14px]">
        <el-input
          ref="inputRef"
          v-model="keyword"
          class="command-palette-input"
          :placeholder="$t('commandPalette.searchMenu')"
          @input="onSearch"
          @keydown="handleInputKeydown"
        >
          <template #prefix>
            <div class="i-svg:search" />
          </template>
          <template #suffix>
            <div class="command-palette-input__suffix inline-flex gap-[10px] items-center">
              <div
                class="i-svg:close"
                role="button"
                tabindex="0"
                :aria-label="$t('common.close')"
                @click="close"
              />
            </div>
          </template>
        </el-input>

        <div class="command-palette-results max-h-[48vh] overflow-auto">
          <div
            v-if="displayList.length === 0"
            class="command-palette-empty p-[24px_0] text-[var(--el-text-color-secondary)] text-center"
          >
            {{ $t("commandPalette.noHistory") }}
          </div>

          <ul
            v-else
            class="command-palette-list flex flex-col gap-[6px] p-0 m-0 [list-style:none]"
          >
            <li
              v-for="(item, idx) in displayList"
              :key="item.path + idx"
              :class="['command-palette-item', { 'is-active': activeIndex === idx }]"
              @mouseenter="activeIndex = idx"
              @click="onGo(item)"
            >
              <div class="command-palette-item__title text-[14px] text-[var(--el-text-color-primary)]">
                {{ item.title }}
              </div>
              <div class="command-palette-item__path mt-[2px] text-[14px] text-[var(--el-text-color-secondary)]">
                {{ item.path }}
              </div>
            </li>
          </ul>
        </div>

        <div class="command-palette-hints flex gap-[14px] items-center pt-[10px] [border-top:1px_solid_var(--el-border-color-lighter)]">
          <div class="command-palette-hint inline-flex gap-[6px] items-center">
            <div class="command-palette-hint__key inline-flex items-center justify-center h-[24px] p-[0_8px] [background:var(--el-bg-color-overlay)] [border:1px_solid_var(--el-border-color-lighter)] rounded-[8px]">
              <div class="i-svg:up" />
            </div>
            <div class="command-palette-hint__key inline-flex items-center justify-center h-[24px] p-[0_8px] [background:var(--el-bg-color-overlay)] [border:1px_solid_var(--el-border-color-lighter)] rounded-[8px]">
              <div class="i-svg:down" />
            </div>
            <span class="command-palette-hint__text text-[14px] text-[var(--el-text-color-secondary)]">{{ $t("commandPalette.navigate") }}</span>
          </div>
          <div class="command-palette-hint inline-flex gap-[6px] items-center">
            <div class="command-palette-hint__key inline-flex items-center justify-center h-[24px] p-[0_8px] [background:var(--el-bg-color-overlay)] [border:1px_solid_var(--el-border-color-lighter)] rounded-[8px]">
              <div class="i-svg:enter" />
            </div>
            <span class="command-palette-hint__text text-[14px] text-[var(--el-text-color-secondary)]">{{ $t("common.select") }}</span>
          </div>
          <div class="command-palette-hint inline-flex gap-[6px] items-center">
            <div class="command-palette-hint__key inline-flex items-center justify-center h-[24px] p-[0_8px] [background:var(--el-bg-color-overlay)] [border:1px_solid_var(--el-border-color-lighter)] rounded-[8px]">
              <div class="i-svg:esc" />
            </div>
            <span class="command-palette-hint__text text-[14px] text-[var(--el-text-color-secondary)]">{{ $t("common.close") }}</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useCommandPalette } from "./useCommandPalette";

const {
  visible,
  keyword,
  results,
  history,
  activeIndex,
  inputRef,
  open,
  close,
  onSearch,
  onSelect,
  onNavigate,
  onGo,
} = useCommandPalette();

const displayList = computed(() => (results.value.length ? results.value : history.value));

const handleInputKeydown: (evt: KeyboardEvent | Event) => void = (evt) => {
  if (!(evt instanceof KeyboardEvent)) return;
  const e = evt;
  const key = e.key.toLowerCase();

  if (key === "escape") {
    e.preventDefault();
    close();
    return;
  }

  if (key === "arrowup") {
    e.preventDefault();
    onNavigate("up");
    return;
  }

  if (key === "arrowdown") {
    e.preventDefault();
    onNavigate("down");
    return;
  }

  if (key === "enter") {
    e.preventDefault();
    if (displayList.value.length === 0) return;
    if (activeIndex.value < 0) activeIndex.value = 0;
    onSelect();
  }
};
</script>

<style scoped>
.command-palette-trigger__left :deep([class^="i-svg:"]) {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  color: var(--el-text-color-secondary) !important;
}

.command-palette-trigger:focus-visible {
  @apply '[outline:2px_solid_var(--el-color-primary)] [outline-offset:2px]';
}

.command-palette-trigger:hover {
  @apply '[background:var(--el-fill-color-light)] [border-color:var(--el-border-color)]';
}

.command-palette-input :deep(.el-input__wrapper) {
  border-radius: 10px;
}

.command-palette-input__suffix :deep([class^="i-svg:"]) {
  font-size: 16px;
  color: var(--el-text-color-secondary);
}

.command-palette-input__suffix :deep([class^="i-svg:"]):hover {
  color: var(--el-color-primary);
}

.command-palette-item {
  @apply 'p-[10px_12px] cursor-pointer rounded-[10px]';
}

.command-palette-item:hover {
  @apply '[background:var(--el-fill-color-light)]';
}

.command-palette-item.is-active {
  background: var(--el-color-primary-light-9);
}

.command-palette-hint__key :deep([class^="i-svg:"]) {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

</style>
