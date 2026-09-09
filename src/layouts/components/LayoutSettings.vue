<template>
  <el-drawer
    v-model="drawerVisible"
    size="380"
    :title="t('settings.project')"
    :before-close="handleCloseDrawer"
    class="settings-drawer"
  >
    <div class="layout-settings__content [flex:1_1_auto] p-[16px_18px_20px] overflow-y-auto text-[var(--el-text-color-regular)]">
      <section class="layout-settings__section">
        <div class="layout-settings__section-title">
          {{ t("settings.theme") }}
        </div>

        <div class="theme-mode flex justify-center">
          <el-radio-group v-model="themeMode">
            <el-radio-button :value="ThemeMode.LIGHT">
              {{ t("login.light") }}
            </el-radio-button>
            <el-radio-button :value="ThemeMode.DARK">
              {{ t("login.dark") }}
            </el-radio-button>
            <el-radio-button :value="ThemeMode.AUTO">
              {{ t("login.auto") }}
            </el-radio-button>
          </el-radio-group>
        </div>

        <div class="layout-settings__card mt-[14px]">
          <div class="layout-settings__card-header">
            <span>{{ t("settings.themePalette") }}</span>
            <button
              type="button"
              :class="['custom-color-trigger', { 'is-open': isCustomColorsOpen }]"
              @click="toggleCustomColors"
            >
              <span>{{ t("settings.customColors") }}</span>
              <el-icon><ArrowRight /></el-icon>
            </button>
          </div>

          <div class="palette-strip grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-[6px]">
            <el-tooltip
              v-for="item in themePalettePresets"
              :key="item.id"
              :content="getPaletteDescription(item)"
              placement="bottom"
            >
              <button
                type="button"
                :aria-label="getPaletteName(item)"
                :class="['palette-option', { 'is-active': settingsStore.themePalette === item.id }]"
                @click="settingsStore.applyThemePalette(item.id)"
              >
                <span class="palette-option__name w-full overflow-hidden text-ellipsis text-[14px] font-bold leading-[1.1] text-[var(--el-text-color-primary)] whitespace-nowrap">{{ getPaletteName(item) }}</span>
                <span class="palette-option__colors inline-flex shrink-0 items-center">
                  <span
                    v-for="color in getPaletteColors(item.colors)"
                    :key="color"
                    class="palette-option__dot"
                    :style="{ backgroundColor: color }"
                  />
                </span>
              </button>
            </el-tooltip>
          </div>
        </div>

        <el-collapse-transition>
          <div
            v-show="isCustomColorsOpen"
            class="custom-colors-panel p-[10px] mt-[8px] [background:var(--el-fill-color-blank)] [border:1px_solid_var(--el-border-color-lighter)] rounded-[8px]"
          >
            <div class="custom-colors-panel__header">
              <span>{{ t("settings.customColors") }}</span>
              <span>{{ activePaletteName }}</span>
            </div>

            <div class="custom-color-list grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] gap-[8px]">
              <div
                v-for="item in colorOptions"
                :key="item.name"
                class="custom-color-row grid [grid-template-columns:minmax(0,_1fr)_28px] gap-[6px] items-center min-h-[34px] p-[0_8px] [background:var(--el-bg-color)] [border:1px_solid_var(--el-border-color-lighter)] rounded-[8px]"
              >
                <span class="custom-color-row__label text-[14px] font-bold text-[var(--el-text-color-regular)]">{{ getColorLabel(item.name) }}</span>
                <span class="custom-color-row__value">
                  {{ settingsStore.themeColors[item.name] }}
                </span>
                <el-color-picker
                  :model-value="settingsStore.themeColors[item.name]"
                  :predefine="colorPresets[item.name]"
                  popper-class="theme-picker-dropdown"
                  @update:model-value="(color) => handleThemeColorChange(item.name, color)"
                />
              </div>
            </div>
          </div>
        </el-collapse-transition>
      </section>

      <section class="layout-settings__section">
        <div class="layout-settings__section-title">
          {{ t("settings.navigation") }}
        </div>

        <div class="settings-layout-select">
          <div class="settings-layout-select__grid">
            <el-tooltip
              v-for="item in layoutOptions"
              :key="item.value"
              :content="item.label"
              placement="bottom"
            >
              <div
                role="button"
                tabindex="0"
                :class="[
                  'settings-layout-select__item',
                  item.className,
                  {
                    'is-active': settingsStore.layout === item.value,
                  },
                ]"
                @click="handleLayoutChange(item.value)"
                @keydown.enter="handleLayoutChange(item.value)"
                @keydown.space.prevent="handleLayoutChange(item.value)"
              >
                <div class="settings-layout-preview">
                  <div
                    v-if="item.value === LayoutMode.TOP || item.value === LayoutMode.MIX"
                    class="settings-layout-preview__header"
                  ></div>
                  <div
                    v-if="item.value !== LayoutMode.TOP"
                    class="settings-layout-preview__sidebar"
                  ></div>
                  <div
                    v-if="item.value === LayoutMode.DOUBLE"
                    class="settings-layout-preview__sub-sidebar"
                  ></div>
                  <div class="settings-layout-preview__main"></div>
                </div>
                <div class="settings-layout-select__name">
                  {{ item.label }}
                </div>
                <div
                  v-if="settingsStore.layout === item.value"
                  class="settings-layout-select__check"
                >
                  <el-icon><Check /></el-icon>
                </div>
              </div>
            </el-tooltip>
          </div>
        </div>

        <div
          v-if="settingsStore.resolvedTheme !== ThemeMode.DARK"
          class="layout-settings__item layout-settings__item--sidebar-color"
        >
          <span class="layout-settings__item-label text-xs">
            {{ t("settings.sidebarColorScheme") }}
          </span>
          <el-radio-group
            v-model="sidebarColor"
            class="layout-settings__item-control"
            @change="setSidebarColor"
          >
            <el-radio :value="SidebarColor.MINIMAL_WHITE">
              {{ t("settings.minimalWhite") }}
            </el-radio>
            <el-radio :value="SidebarColor.CLASSIC_BLUE">
              {{ t("settings.classicBlue") }}
            </el-radio>
          </el-radio-group>
        </div>
      </section>

      <section class="layout-settings__section">
        <div class="layout-settings__section-title">
          {{ t("settings.interface") }}
        </div>

        <div class="layout-settings__item flex-x-between">
          <span class="text-xs">{{ t("settings.showTagsView") }}</span>
          <el-switch v-model="settingsStore.showTagsView" />
        </div>

        <div
          v-if="settingsStore.showTagsView"
          class="layout-settings__item layout-settings__item--block"
        >
          <div class="layout-settings__card-header">
            <span class="text-xs">{{ t("settings.tagsViewStyle") }}</span>
          </div>
          <div class="settings-tabs-style grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] gap-[8px]">
            <button
              v-for="item in tagsViewStyleOptions"
              :key="item.value"
              type="button"
              :aria-label="item.label"
              :class="[
                'settings-tabs-style__option',
                { 'is-active': settingsStore.tagsViewStyle === item.value },
              ]"
              @click="settingsStore.tagsViewStyle = item.value"
            >
              <span
                :class="[
                  'settings-tabs-style__preview',
                  `settings-tabs-style__preview--${item.value}`,
                ]"
              >
                <i></i>
                <i></i>
                <i></i>
              </span>
              <span class="settings-tabs-style__label max-w-full overflow-hidden text-ellipsis text-[14px] font-semibold leading-[1.1] whitespace-nowrap">{{ item.label }}</span>
            </button>
          </div>
        </div>

        <div class="layout-settings__item flex-x-between">
          <span class="text-xs">{{ t("settings.showAppLogo") }}</span>
          <el-switch v-model="settingsStore.showAppLogo" />
        </div>

        <div class="layout-settings__item flex-x-between">
          <span class="text-xs">{{ t("settings.pageSwitchingAnimation") }}</span>
          <el-select
            v-model="settingsStore.pageSwitchingAnimation"
            class="w-[150px]"
          >
            <el-option
              v-for="(item, key) in pageSwitchingAnimationOptions"
              :key
              :label="t(`settings.${item.value}`)"
              :value="item.value"
            />
          </el-select>
        </div>
      </section>

      <section class="layout-settings__section">
        <div class="layout-settings__section-title">
          {{ t("settings.assist") }}
        </div>

        <div class="layout-settings__item flex-x-between">
          <span class="text-xs">{{ t("settings.showWatermark") }}</span>
          <el-switch v-model="settingsStore.showWatermark" />
        </div>

        <div class="layout-settings__item flex-x-between">
          <span class="text-xs">{{ t("settings.grayMode") }}</span>
          <el-switch v-model="settingsStore.grayMode" />
        </div>

        <div class="layout-settings__item flex-x-between">
          <span class="text-xs">{{ t("settings.colorWeak") }}</span>
          <el-switch v-model="settingsStore.colorWeak" />
        </div>
      </section>
    </div>

    <template #footer>
      <div class="settings-footer">
        <el-button
          type="primary"
          :icon="copyIcon"
          :loading="copyLoading"
          @click="copyCurrentSettings"
        >
          {{ copyLoading ? t("settings.copying") : t("settings.copyConfig") }}
        </el-button>
        <el-button
          type="default"
          :icon="resetIcon"
          :loading="resetLoading"
          @click="resetSettingsToDefault"
        >
          {{ resetLoading ? t("settings.resetting") : t("settings.resetConfig") }}
        </el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ArrowRight, Check, DocumentCopy, RefreshLeft } from "@element-plus/icons-vue";
import {
  LayoutMode,
  PageSwitchingAnimationOptions,
  SidebarColor,
  TagsViewStyle,
  ThemeMode,
} from "@/enums";
import { useSettingsStore } from "@/stores/settings";
import { themeColorNames, themePalettePresets } from "@/settings";
import type { ThemeColorMap, ThemeColorName, ThemePalettePreset } from "@/settings";

const { t } = useI18n();

const pageSwitchingAnimationOptions = PageSwitchingAnimationOptions;

const copyIcon = markRaw(DocumentCopy);
const resetIcon = markRaw(RefreshLeft);

const copyLoading = ref(false);
const resetLoading = ref(false);

interface LayoutOption {
  value: LayoutMode;
  label: string;
  className: string;
}

interface TagsViewStyleOption {
  value: TagsViewStyle;
  label: string;
}

interface ColorOption {
  name: ThemeColorName;
}

const layoutOptions = computed<LayoutOption[]>(() => [
  { value: LayoutMode.LEFT, label: t("settings.leftLayout"), className: "left" },
  { value: LayoutMode.TOP, label: t("settings.topLayout"), className: "top" },
  { value: LayoutMode.MIX, label: t("settings.mixLayout"), className: "mix" },
  { value: LayoutMode.DOUBLE, label: t("settings.doubleLayout"), className: "double" },
]);

const tagsViewStyleOptions = computed<TagsViewStyleOption[]>(() => [
  { value: TagsViewStyle.CARD, label: t("settings.tagsViewStyles.card") },
  { value: TagsViewStyle.LINE, label: t("settings.tagsViewStyles.line") },
]);

const colorOptions: ColorOption[] = themeColorNames.map((name) => ({ name }));

const colorPresets: Record<ThemeColorName, string[]> = {
  primary: ["#165DFF", "#1677FF", "#409EFF", "#FF7D00", "#14C9C9", "#EB2F96", "#722ED1"],
  success: ["#00B42A", "#23C343", "#67C23A", "#22C55E"],
  warning: ["#FF7D00", "#FF9A2E", "#E6A23C", "#FAAD14"],
  danger: ["#F53F3F", "#F76560", "#F56C6C", "#FF4D4F"],
  info: ["#86909C", "#909399", "#788896", "#6B7785"],
};

const paletteI18nKeys: Record<string, string> = {
  arco: "arco",
  "ant-design": "antDesign",
  "element-plus": "elementPlus",
};

const settingsStore = useSettingsStore();

const isCustomColorsOpen = ref(false);
const sidebarColor = ref(settingsStore.sidebarColorScheme);
const themeMode = computed({
  get: () => settingsStore.theme,
  set: (value: ThemeMode) => {
    settingsStore.theme = value;
  },
});

const drawerVisible = computed({
  get: () => settingsStore.settingsVisible,
  set: (value) => (settingsStore.settingsVisible = value),
});

function getPaletteColors(colors: ThemeColorMap) {
  return colorOptions.map((item) => colors[item.name]);
}

function getPaletteName(palette: ThemePalettePreset) {
  const key = paletteI18nKeys[palette.id];
  return key ? t(`settings.themePalettes.${key}.name`) : palette.name;
}

function getPaletteDescription(palette: ThemePalettePreset) {
  const key = paletteI18nKeys[palette.id];
  return key ? t(`settings.themePalettes.${key}.description`) : palette.description;
}

function getColorLabel(name: ThemeColorName) {
  return t(`settings.themeColorNames.${name}`);
}

const activePaletteName = computed(() =>
  settingsStore.activeThemePalette
    ? getPaletteName(settingsStore.activeThemePalette)
    : t("settings.customPalette")
);

/**
 * 展开或收起自定义颜色
 */
function toggleCustomColors(): void {
  isCustomColorsOpen.value = !isCustomColorsOpen.value;
}

/**
 * 更新单个主题色
 */
function handleThemeColorChange(name: ThemeColorName, color: string | null): void {
  if (!color) return;
  settingsStore.updateThemeColor(name, color);
}

/**
 * 切换侧边栏配色
 */
function setSidebarColor(value: string | number | boolean | undefined): void {
  if (value !== SidebarColor.CLASSIC_BLUE && value !== SidebarColor.MINIMAL_WHITE) return;

  settingsStore.sidebarColorScheme = value;
}

/**
 * 切换导航布局
 */
function handleLayoutChange(layout: LayoutMode): void {
  if (settingsStore.layout === layout) return;

  settingsStore.layout = layout;
}

/**
 * 复制当前 settings 默认配置片段
 */
async function copyCurrentSettings(): Promise<void> {
  try {
    copyLoading.value = true;

    const configCode = buildDefaultsCode();

    await navigator.clipboard.writeText(configCode);

    ElMessage.success({
      message: t("settings.copySuccess"),
      duration: 3000,
    });
  } catch {
    ElMessage.error(t("settings.copyFailed"));
  } finally {
    copyLoading.value = false;
  }
}

/**
 * 恢复所有设置为默认值
 */
async function resetSettingsToDefault(): Promise<void> {
  try {
    await ElMessageBox.confirm(t("settings.confirmReset"), t("settings.resetConfig"), {
      confirmButtonText: t("common.confirm"),
      cancelButtonText: t("common.cancel"),
      type: "warning",
    });

    resetLoading.value = true;
    settingsStore.resetSettings();

    sidebarColor.value = settingsStore.sidebarColorScheme;

    ElMessage.success(t("settings.resetSuccess"));
  } catch {
    // 用户取消时不提示
  } finally {
    resetLoading.value = false;
  }
}

/**
 * 生成 src/settings.ts 中 defaults 的配置片段
 */
function buildDefaultsCode(): string {
  const themeColorsCode = JSON.stringify(settingsStore.themeColors, null, 4)
    .replace(/"([^"]+)":/g, "$1:")
    .replace(/^/gm, "  ");
  const settings = {
    theme: `ThemeMode.${settingsStore.theme.toUpperCase()}`,
    themePalette: `"${settingsStore.themePalette}"`,
    themeColors: themeColorsCode.trimStart(),
    sidebarColorScheme: `SidebarColor.${settingsStore.sidebarColorScheme.toUpperCase().replace("-", "_")}`,
    layout: `LayoutMode.${settingsStore.layout.toUpperCase()}`,
    size: "ComponentSize.DEFAULT",
    language: "LanguageEnum.ZH_CN",
    showTagsView: settingsStore.showTagsView,
    tagsViewStyle: `TagsViewStyle.${settingsStore.tagsViewStyle.toUpperCase()}`,
    showAppLogo: settingsStore.showAppLogo,
    showWatermark: settingsStore.showWatermark,
    pageSwitchingAnimation: `"${settingsStore.pageSwitchingAnimation}"`,
    showSettings: true,
    watermarkContent: "pkg.name",
  };

  return `export const defaults = {
  theme: ${settings.theme},
  themePalette: ${settings.themePalette},
  themeColors: ${settings.themeColors},
  sidebarColorScheme: ${settings.sidebarColorScheme},
  layout: ${settings.layout},
  size: ${settings.size},
  language: ${settings.language},
  showTagsView: ${settings.showTagsView},
  tagsViewStyle: ${settings.tagsViewStyle},
  showAppLogo: ${settings.showAppLogo},
  showWatermark: ${settings.showWatermark},
  pageSwitchingAnimation: ${settings.pageSwitchingAnimation},
  showSettings: ${settings.showSettings},
  watermarkContent: ${settings.watermarkContent},
} as const;`;
}

function handleCloseDrawer(): void {
  settingsStore.settingsVisible = false;
}
</script>

<style lang="scss" scoped>
.settings-drawer {
  :deep(.el-drawer__body) {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0;
    overflow: hidden;
    color: var(--el-text-color-regular);
  }

  :deep(.el-drawer__footer) {
    padding: 12px 18px 16px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}

.layout-settings__section {
  & + & {
    margin-top: 20px;
  }

  .layout-settings__item {
    @apply 'flex gap-[12px] items-center justify-between min-h-[42px] p-[8px_0] [border-bottom:1px_solid_var(--el-border-color-lighter)]';

    &:last-child {
      border-bottom: none;
    }

    > .text-xs {
      flex-shrink: 0;
      color: var(--el-text-color-regular);
      white-space: nowrap;
    }
  }

  .layout-settings__item--sidebar-color {
    @apply 'grid [grid-template-columns:auto_minmax(0,_1fr)] gap-x-[14px] p-[12px] mt-[12px] [background:var(--el-fill-color-extra-light)] [border:1px_solid_var(--el-border-color-lighter)] rounded-[8px]';

    .layout-settings__item-label {
      @apply 'min-w-[64px] text-[var(--el-text-color-regular)] whitespace-nowrap';
    }

    .layout-settings__item-control {
      @apply 'justify-end min-w-0';
    }

    :deep(.el-radio) {
      margin-right: 0;

      & + .el-radio {
        margin-left: 18px;
      }
    }

    :deep(.el-radio__label) {
      color: var(--el-text-color-regular);
    }

    :deep(.el-radio.is-checked .el-radio__label) {
      color: var(--el-color-primary);
    }
  }

  .layout-settings__item--block {
    @apply 'block min-h-0 pt-[10px] pb-[12px] [border-bottom:1px_solid_var(--el-border-color-lighter)]';
  }
}

.layout-settings__section-title {
  @apply 'flex gap-[10px] items-center mb-[12px] text-[14px] font-semibold leading-[1] text-[var(--el-text-color-primary)]';

  &::before,
  &::after {
    flex: 1;
    height: 1px;
    content: "";
    background: var(--el-border-color-lighter);
  }
}

.layout-settings__card-header {
  @apply 'flex items-center justify-between mb-[8px] text-[14px] text-[var(--el-text-color-regular)]';

  > span {
    font-weight: 500;
  }
}

.settings-footer {
  @apply 'grid [grid-template-columns:repeat(2,_minmax(0,_1fr))] gap-[8px]';

  .el-button {
    @apply 'm-0';
  }
}

.palette-option {
  @apply 'grid gap-[5px] [align-content:center] [justify-items:start] w-full h-[44px] p-[6px_8px] [font:inherit] text-[var(--el-text-color-regular)] text-left [appearance:none] cursor-pointer [background:var(--el-bg-color)] [border:1px_solid_var(--el-border-color-lighter)] rounded-[8px] [transition:background-color_0.18s,_border-color_0.18s,_box-shadow_0.18s]';

  &:hover {
    background: var(--el-fill-color-lighter);
    border-color: var(--el-color-primary-light-5);
  }

  &.is-active {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-5);
    box-shadow: inset 0 0 0 1px var(--el-color-primary-light-5);
  }
}

.palette-option__dot {
  @apply 'w-[10px] h-[10px] ml-[-2px] [border:1px_solid_var(--el-bg-color)] rounded-[50%]';
  box-shadow: 0 0 0 1px rgb(0 0 0 / 4%);

  &:first-child {
    margin-left: 0;
  }
}

.custom-color-trigger {
  @apply 'inline-flex gap-[3px] items-center h-[24px] p-[0_6px_0_8px] [font:inherit] text-[14px] text-[var(--el-text-color-secondary)] [appearance:none] cursor-pointer [background:transparent] [border:none] rounded-[6px] [transition:color_0.18s,_background-color_0.18s]';

  .el-icon {
    @apply 'text-[14px] [transition:transform_0.18s]';
  }

  &:hover,
  &.is-open {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &.is-open .el-icon {
    transform: rotate(90deg);
  }
}

.custom-colors-panel__header {
  @apply 'flex items-center justify-between mb-[8px] text-[14px] text-[var(--el-text-color-placeholder)]';

  span:first-child {
    @apply 'font-bold text-[var(--el-text-color-regular)]';
  }
}

.custom-color-row__value {
  @apply 'hidden overflow-hidden text-ellipsis';
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  @apply 'text-[14px] text-[var(--el-text-color-secondary)] whitespace-nowrap';
}

.custom-color-row :deep(.el-color-picker) {
  width: 28px;
  height: 28px;
}

.custom-color-row :deep(.el-color-picker__trigger) {
  width: 28px;
  height: 28px;
  padding: 2px;
  border-color: var(--el-border-color);
}

.settings-layout-select {
  @apply 'pt-[10px]';

  .settings-layout-select__grid {
    @apply 'grid [grid-template-columns:repeat(4,_minmax(0,_1fr))] gap-[8px]';
  }
}

.settings-layout-select__item {
  @apply 'relative h-[72px] overflow-hidden cursor-pointer [background:var(--el-bg-color)] [border:1px_solid_var(--el-border-color-lighter)] rounded-[8px] [transition:background-color_0.18s,_border-color_0.18s,_box-shadow_0.18s]';

  &:hover {
    background: var(--el-fill-color-lighter);
    border-color: var(--el-color-primary-light-5);
  }

  .settings-layout-preview {
    @apply 'relative w-[54px] h-[34px] m-[8px_auto_4px]';
  }

  .settings-layout-preview__header {
    @apply 'absolute top-0 right-0 left-0 h-[8px] [background:var(--el-color-primary)] rounded-[2px]';
  }

  .settings-layout-preview__sidebar {
    @apply 'absolute left-0 w-[12px] [background:var(--el-color-primary)] rounded-[2px]';
  }

  .settings-layout-preview__sub-sidebar {
    @apply 'absolute top-0 bottom-0 left-[15px] w-[14px] [background:var(--el-color-primary-light-9)] [border:1px_solid_var(--el-color-primary-light-6)] rounded-[2px]';
  }

  .settings-layout-preview__main {
    @apply 'absolute';
    background:
      linear-gradient(var(--el-fill-color-light) 0 0) 7px 7px / 18px 3px no-repeat,
      linear-gradient(var(--el-fill-color-light) 0 0) 7px 14px / 24px 3px no-repeat,
      var(--el-fill-color-lighter);
    @apply '[border:1px_solid_var(--el-border-color-extra-light)] rounded-[2px]';
  }

  .settings-layout-select__name {
    @apply 'absolute right-0 bottom-[5px] left-0 text-[14px] font-medium text-[var(--el-text-color-regular)] text-center [transition:color_0.3s_ease]';
  }

  .settings-layout-select__check {
    @apply 'absolute top-[4px] right-[4px] flex items-center justify-center w-[15px] h-[15px] text-[14px] text-[var(--el-color-primary)] [background:var(--el-color-primary-light-9)] [border:1px_solid_var(--el-color-primary-light-5)] rounded-[50%]';
  }

  &.left {
    .settings-layout-preview__sidebar {
      @apply 'top-[4px] bottom-[4px]';
    }

    .settings-layout-preview__main {
      @apply 'top-[4px] right-0 bottom-[4px] left-[16px]';
    }
  }

  &.top {
    .settings-layout-preview__header {
      @apply 'h-[12px]';
    }

    .settings-layout-preview__main {
      @apply 'top-[16px] right-0 bottom-0 left-0';
    }
  }

  &.mix {
    .settings-layout-preview__header {
      @apply 'h-[10px]';
    }

    .settings-layout-preview__sidebar {
      @apply 'top-[14px] bottom-0';
    }

    .settings-layout-preview__main {
      @apply 'top-[14px] right-0 bottom-0 left-[16px]';
    }
  }

  &.double {
    .settings-layout-preview__sidebar {
      @apply 'top-0 bottom-0 w-[10px]';
    }

    .settings-layout-preview__main {
      @apply 'top-0 right-0 bottom-0 left-[33px]';
    }
  }

  &.is-active {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-5);
    box-shadow: inset 0 0 0 1px var(--el-color-primary-light-6);

    .settings-layout-select__name {
      @apply 'font-semibold text-[var(--el-color-primary)]';
    }
  }
}

.settings-tabs-style__option {
  @apply 'grid gap-[6px] [align-content:center] [justify-items:center] h-[58px] p-[7px_6px] [font:inherit] text-[var(--el-text-color-regular)] [appearance:none] cursor-pointer [background:var(--el-bg-color)] [border:1px_solid_var(--el-border-color-lighter)] rounded-[8px] [transition:background-color_0.16s,_border-color_0.16s]';

  &:hover {
    background: var(--el-fill-color-lighter);
    border-color: var(--el-color-primary-light-5);
  }

  &.is-active {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-5);
  }
}

.settings-tabs-style__preview {
  @apply 'inline-flex items-center justify-center w-[54px] h-[20px]';

  i {
    @apply 'block w-[16px] h-[12px] [background:var(--el-fill-color-light)] [border:1px_solid_var(--el-border-color-lighter)]';
  }
}

.settings-tabs-style__preview--line {
  @apply 'gap-[4px] items-end [border-bottom:1px_solid_var(--el-border-color-lighter)]';

  i {
    @apply 'w-[13px] h-[10px] [background:transparent] [border:0] [border-bottom:2px_solid_transparent]';

    &:nth-child(2) {
      border-bottom-color: var(--el-color-primary);
    }
  }
}

.settings-tabs-style__preview--card {
  @apply 'gap-[4px]';

  i {
    @apply 'w-[14px] h-[12px] [background:transparent] [border-color:transparent] rounded-[4px]';

    &:nth-child(2) {
      background: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary-light-6);
    }
  }
}

:deep(.copy-config-dialog) {
  .el-message-box__content {
    @apply 'max-h-[400px] overflow-y-auto';
  }
}
</style>
