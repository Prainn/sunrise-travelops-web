<template>
  <div
    class="hamburger-wrapper"
    @click="toggleClick"
  >
    <div :class="['i-svg:collapse', { hamburger: true, 'is-active': isActive }, hamburgerClass]" />
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from "@/stores/settings";
import { ThemeMode, SidebarColor, LayoutMode } from "@/enums/settings";

defineProps({
  isActive: { type: Boolean, required: true },
});

const emit = defineEmits(["toggleClick"]);

const settingsStore = useSettingsStore();
const layout = computed(() => settingsStore.layout);

const hamburgerClass = computed(() => {
  if (settingsStore.resolvedTheme === ThemeMode.DARK) {
    return "hamburger--white";
  }

  if (
    layout.value === LayoutMode.MIX &&
    settingsStore.sidebarColorScheme === SidebarColor.CLASSIC_BLUE
  ) {
    return "hamburger--white";
  }

  return "";
});

function toggleClick() {
  emit("toggleClick");
}
</script>

<style scoped lang="scss">
.hamburger-wrapper {
  @apply 'flex items-center justify-center w-[48px] h-full p-0 text-[var(--el-text-color-regular)] cursor-pointer';

  .hamburger {
    @apply 'w-[16px] h-[16px] text-[16px] [vertical-align:middle] bg-[currentcolor] [transform:scaleX(-1)] [transition:color_0.16s,_transform_0.3s_ease]';
    color: currentcolor;

    &--white {
      color: #fff;
    }

    &.is-active {
      transform: scaleX(1);
    }
  }

  &:hover {
    color: var(--el-color-primary);
  }
}
</style>
