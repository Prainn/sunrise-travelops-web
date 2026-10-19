<template>
  <el-dropdown trigger="click" @command="handleDensityChange">
    <el-icon :aria-label="$t('densitySelect.label')" role="button">
      <ScaleToOriginal />
    </el-icon>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="item in densityOptions"
          :key="item.value"
          :disabled="settingsStore.density === item.value"
          :command="item.value"
        >
          {{ item.label }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { ScaleToOriginal } from "@element-plus/icons-vue";
import { useSettingsStore } from "@/stores/settings";
import { UiDensity } from "@/enums/settings";

/**
 * 界面密度切换：自动按视口尺寸切换紧凑，或固定为标准/紧凑。
 */
const settingsStore = useSettingsStore();
const { t } = useI18n();
const densityOptions = computed(() => [
  { label: t("densitySelect.auto"), value: UiDensity.AUTO },
  { label: t("densitySelect.default"), value: UiDensity.DEFAULT },
  { label: t("densitySelect.compact"), value: UiDensity.COMPACT },
]);

function handleDensityChange(value: UiDensity) {
  settingsStore.density = value;
}
</script>
