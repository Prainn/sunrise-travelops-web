<template>
  <section ref="rootRef" class="ops-map" :class="{ 'is-fullscreen': isFullscreen }">
    <header class="ops-map__header">
      <div class="flex flex-col gap-1 min-w-0">
        <h2 class="ops-map__title">
          {{ viewTitle }}
        </h2>
        <p class="ops-map__subtitle">
          {{ viewSubtitle }}
        </p>
      </div>
      <el-segmented v-model="view" :options="viewOptions" class="ops-map__switch" />
    </header>

    <div class="ops-map__toolbar">
      <div class="flex items-center gap-2">
        <el-button
          :icon="ArrowLeft"
          circle
          size="small"
          :aria-label="$t('dashboard.opsMap.previousDay')"
          @click="pickDate(shiftDate(date, -1))"
        />
        <el-date-picker
          :model-value="date"
          type="date"
          value-format="YYYY-MM-DD"
          size="small"
          :clearable="false"
          :teleported="false"
          :aria-label="$t('dashboard.tourMap.date')"
          class="!w-[140px]"
          @update:model-value="pickDate"
        />
        <el-button
          :icon="ArrowRight"
          circle
          size="small"
          :aria-label="$t('dashboard.opsMap.nextDay')"
          @click="pickDate(shiftDate(date, 1))"
        />
        <el-button
          size="small"
          :type="isFollowingToday ? 'primary' : 'default'"
          :plain="isFollowingToday"
          @click="pickDate(shanghaiToday())"
        >
          {{ $t("dashboard.opsMap.today") }}
        </el-button>
      </div>

      <el-radio-group
        v-if="canSelectBusinessUnit"
        v-model="businessUnit"
        size="small"
        class="ops-map__unit"
        :aria-label="$t('identity.businessUnit')"
      >
        <el-radio-button :label="$t('common.all')" value="" />
        <el-radio-button
          v-for="unit in BUSINESS_UNITS"
          :key="unit"
          :label="$t(`accountLink.businessOptions.${unit}`)"
          :value="unit"
        />
      </el-radio-group>

      <div class="flex items-center gap-2 ml-auto">
        <el-button
          size="small"
          :icon="isPlaying && !prefersReducedMotion ? VideoPause : VideoPlay"
          :disabled="prefersReducedMotion"
          :title="prefersReducedMotion ? $t('dashboard.opsMap.reducedMotion') : undefined"
          @click="isPlaying = !isPlaying"
        >
          {{
            prefersReducedMotion
              ? $t("dashboard.opsMap.reducedMotion")
              : isPlaying
                ? $t("dashboard.opsMap.pause")
                : $t("dashboard.opsMap.play")
          }}
        </el-button>
        <el-button
          v-if="isFullscreenSupported"
          size="small"
          :icon="FullScreen"
          @click="toggleFullscreen"
        >
          {{ isFullscreen ? $t("dashboard.opsMap.exitFullscreen") : $t("dashboard.opsMap.fullscreen") }}
        </el-button>
      </div>
    </div>

    <FlightMapSection
      v-if="visitedViews.has('world')"
      v-show="view === 'world'"
      :date="date"
      :business-unit="businessUnit"
      :active="view === 'world'"
      :animate="isMotionEnabled && view === 'world'"
      @scope="(value) => (scopeByView.world = value)"
    />
    <TourMapSection
      v-if="visitedViews.has('yunnan')"
      v-show="view === 'yunnan'"
      :date="date"
      :business-unit="businessUnit"
      :active="view === 'yunnan'"
      :animate="isMotionEnabled && view === 'yunnan'"
      @scope="(value) => (scopeByView.yunnan = value)"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onDeactivated, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  useDocumentVisibility,
  useFullscreen,
  useIntersectionObserver,
  usePreferredReducedMotion,
  useStorage,
} from "@vueuse/core";
import { ArrowLeft, ArrowRight, FullScreen, VideoPause, VideoPlay } from "@element-plus/icons-vue";
import { STORAGE_KEYS } from "@/constants";
import type { TourMapBusinessUnit } from "@/types/dashboard";
import FlightMapSection from "./flight-map/FlightMapSection.vue";
import TourMapSection from "./tour-map/TourMapSection.vue";
import { msUntilShanghaiMidnight, shanghaiToday, shiftDate } from "./tour-map/tour-map";

type MapView = "world" | "yunnan";

const BUSINESS_UNITS: TourMapBusinessUnit[] = ["shengxu", "linxi", "website"];

const { t } = useI18n();
const rootRef = ref<HTMLElement | null>(null);
/** 记住上次选择的地图视图，刷新后保留；存储值无效时回到世界航班地图 */
const storedView = useStorage<MapView>(STORAGE_KEYS.DASHBOARD_MAP_VIEW, "world");
const view = computed<MapView>({
  get: () => (storedView.value === "yunnan" ? "yunnan" : "world"),
  set: (value) => (storedView.value = value),
});
/** 视图首次打开后才挂载，之后用 v-show 保留状态 */
const visitedViews = reactive(new Set<MapView>([view.value]));
const date = ref(shanghaiToday());
/** 今日模式随上海午夜跨天；用户选了其他日期后不再强制回到今天 */
const isFollowingToday = ref(true);
const businessUnit = ref<TourMapBusinessUnit | "">("");
/** 各视图沿用最近一次响应，加载中不让业务筛选闪烁消失 */
const scopeByView = reactive<Record<MapView, boolean>>({ world: false, yunnan: false });
const isPlaying = ref(true);
const isActivated = ref(true);
const isOnScreen = ref(true);
const visibility = useDocumentVisibility();
const reducedMotion = usePreferredReducedMotion();
const {
  isFullscreen,
  isSupported: isFullscreenSupported,
  toggle: toggleFullscreen,
} = useFullscreen(rootRef);
let midnightTimer: ReturnType<typeof setTimeout> | undefined;

const prefersReducedMotion = computed(() => reducedMotion.value === "reduce");
const isMotionEnabled = computed(
  () =>
    isPlaying.value &&
    !prefersReducedMotion.value &&
    isActivated.value &&
    isOnScreen.value &&
    visibility.value === "visible",
);
const canSelectBusinessUnit = computed(() => scopeByView[view.value]);
const viewOptions = computed(() => [
  { value: "world", label: t("dashboard.flightMap.title") },
  { value: "yunnan", label: t("dashboard.tourMap.title") },
]);
const viewTitle = computed(() =>
  view.value === "world" ? t("dashboard.flightMap.title") : t("dashboard.tourMap.title"),
);
const viewSubtitle = computed(() =>
  view.value === "world" ? t("dashboard.flightMap.subtitle") : t("dashboard.tourMap.subtitle"),
);

watch(view, (value) => visitedViews.add(value));
// 后台标签页的定时器可能被节流，回到前台时再核对一次日期。
watch(visibility, (value) => {
  if (value === "visible") syncToday();
});
useIntersectionObserver(rootRef, (entries) => {
  isOnScreen.value = entries.some((entry) => entry.isIntersecting);
});

scheduleMidnight();
onActivated(() => {
  isActivated.value = true;
  syncToday();
  scheduleMidnight();
});
onDeactivated(() => {
  isActivated.value = false;
  clearTimeout(midnightTimer);
});
onBeforeUnmount(() => clearTimeout(midnightTimer));

function pickDate(value: string) {
  date.value = value;
  isFollowingToday.value = value === shanghaiToday();
}

function syncToday() {
  if (isFollowingToday.value) date.value = shanghaiToday();
}

function scheduleMidnight() {
  clearTimeout(midnightTimer);
  // 多等 1 秒，避免定时器略早触发时仍取到前一天。
  midnightTimer = setTimeout(() => {
    syncToday();
    scheduleMidnight();
  }, msUntilShanghaiMidnight() + 1000);
}
</script>

<style scoped lang="scss">
/* 桌面端整块固定高度，切换视图或数据多少不改变高度，列表在面板内滚动。 */
/* 运营地图区独立深色视觉：只在本区域覆写 Element Plus 变量，不影响全站主题。 */
.ops-map {
  --el-bg-color: #142a47;
  --el-bg-color-overlay: #19304f;
  --el-fill-color-blank: rgba(255, 255, 255, 0.03);
  --el-fill-color: #1e3657;
  --el-fill-color-light: rgba(56, 217, 255, 0.08);
  --el-fill-color-lighter: rgba(56, 217, 255, 0.05);
  --el-fill-color-extra-light: rgba(255, 255, 255, 0.03);
  --el-fill-color-dark: #253f63;
  --el-fill-color-darker: #2b4870;
  --el-text-color-primary: #e8f1ff;
  --el-text-color-regular: #c2d1e6;
  --el-text-color-secondary: #8ea3bf;
  --el-text-color-placeholder: #6b7f99;
  --el-text-color-disabled: #4f627c;
  --el-border-color: rgba(120, 180, 240, 0.28);
  --el-border-color-light: rgba(120, 180, 240, 0.2);
  --el-border-color-lighter: rgba(120, 180, 240, 0.14);
  --el-border-color-extra-light: rgba(120, 180, 240, 0.08);
  --el-border-color-hover: rgba(56, 217, 255, 0.5);
  --el-color-primary: #38d9ff;
  --el-color-primary-light-3: #2b9fbd;
  --el-color-primary-light-5: #23798f;
  --el-color-primary-light-7: #1a5263;
  --el-color-primary-light-8: #163f4e;
  --el-color-primary-light-9: #122c39;
  --el-color-primary-dark-2: #7ae6ff;
  --el-color-warning: #ffb547;
  --el-color-warning-light-3: #c48b38;
  --el-color-warning-light-5: #8f6630;
  --el-color-warning-light-7: #5c4326;
  --el-color-warning-light-8: #45331f;
  --el-color-warning-light-9: #2e2418;
  --el-color-warning-dark-2: #ffc978;
  --el-mask-color: rgba(14, 30, 52, 0.55);
  --el-box-shadow-light: 0 8px 28px rgba(0, 0, 0, 0.45);

  @apply relative flex flex-col gap-4 p-4 rounded-[16px] overflow-hidden text-[var(--el-text-color-regular)] sm:p-5 lg:h-[860px];

  background:
    radial-gradient(1200px 500px at 15% -10%, rgba(56, 217, 255, 0.16), transparent 60%),
    radial-gradient(900px 480px at 100% 110%, rgba(255, 181, 71, 0.08), transparent 60%),
    linear-gradient(180deg, #17304f 0%, #10233d 100%);
  border: 1px solid rgba(120, 180, 240, 0.22);
  box-shadow:
    0 18px 48px rgba(3, 8, 18, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);

  &.is-fullscreen {
    @apply rounded-none overflow-y-auto lg:h-screen;
  }
}

.ops-map__header {
  @apply flex flex-wrap items-start justify-between gap-3;
}

.ops-map__title {
  @apply m-0 text-[20px] font-semibold leading-[1.3] tracking-[0.02em] text-[var(--el-text-color-primary)];
}

.ops-map__subtitle {
  @apply m-0 text-[13px] text-[var(--el-text-color-secondary)];
}

.ops-map__switch {
  --el-segmented-bg-color: rgba(255, 255, 255, 0.04);
  --el-segmented-item-selected-bg-color: #38d9ff;
  --el-segmented-item-selected-color: #04121f;
  --el-segmented-color: #c2d1e6;
}

/* 业务单元筛选：选中态用半透明青色底 + 青色描边，避免实心亮底配白框。 */
.ops-map__unit {
  --el-radio-button-checked-bg-color: rgba(56, 217, 255, 0.16);
  --el-radio-button-checked-text-color: #7ae6ff;
  --el-radio-button-checked-border-color: rgba(56, 217, 255, 0.6);

  :deep(.el-radio-button__inner) {
    @apply bg-[rgba(255,255,255,0.04)] text-[#c2d1e6] border-[rgba(120,180,240,0.28)] shadow-none;
  }

  :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    @apply shadow-none;

    background-color: var(--el-radio-button-checked-bg-color);
    border-color: var(--el-radio-button-checked-border-color);
    color: var(--el-radio-button-checked-text-color);
  }
}

.ops-map__toolbar {
  @apply flex flex-wrap items-center gap-3;
}

/* 以下为两个视图共用的面板语言 */
:deep(.ops-map__stat) {
  @apply flex flex-col gap-[2px] min-w-0 px-3 py-[10px] text-left rounded-[10px] border border-solid border-[rgba(120,180,240,0.16)] bg-[rgba(255,255,255,0.03)] backdrop-blur-sm;

  &.is-clickable {
    @apply cursor-pointer transition-colors;

    &:hover,
    &.is-active {
      @apply border-[#38d9ff] bg-[rgba(56,217,255,0.08)];
    }
  }

  &.is-pickup .ops-map__stat-value {
    @apply text-[#6ee7b7];
  }

  &.is-drop .ops-map__stat-value {
    @apply text-[#38d9ff];
  }

  &.is-warning .ops-map__stat-value {
    @apply text-[#ffb547];
  }
}

:deep(.ops-map__stat-label) {
  @apply text-[12px] text-[var(--el-text-color-secondary)] truncate;
}

:deep(.ops-map__stat-value) {
  @apply text-[22px] font-semibold leading-[1.2] text-[var(--el-text-color-primary)] tabular-nums;
}

:deep(.ops-map__stage) {
  @apply relative min-w-0 overflow-hidden rounded-[12px] border border-solid border-[rgba(120,180,240,0.14)];

  background:
    radial-gradient(ellipse at 50% 40%, rgba(56, 217, 255, 0.1), transparent 65%),
    #0f2140;
}

:deep(.ops-map__overlay) {
  @apply absolute inset-0 z-[5] flex items-center justify-center p-4 pointer-events-none;
}

:deep(.ops-map__overlay-card) {
  @apply flex flex-col items-center gap-2 max-w-[360px] px-5 py-4 text-center rounded-[12px] border border-solid border-[rgba(120,180,240,0.24)] bg-[rgba(16,34,60,0.9)] backdrop-blur pointer-events-auto;
}

:deep(.ops-map__legend) {
  @apply absolute left-3 bottom-3 z-[4] flex flex-wrap items-center gap-x-4 gap-y-1 max-w-[calc(100%-24px)] px-3 py-[6px] text-[12px] text-[var(--el-text-color-regular)] rounded-full border border-solid border-[rgba(120,180,240,0.2)] bg-[rgba(16,34,60,0.78)] backdrop-blur-sm;
}

:deep(.ops-map__legend-line) {
  @apply inline-block w-5 h-[3px] rounded-full;

  &.is-pickup {
    @apply bg-[#6ee7b7] shadow-[0_0_8px_#6ee7b7];
  }

  &.is-drop {
    @apply bg-[#38d9ff] shadow-[0_0_8px_#38d9ff];
  }
}

:deep(.ops-map__dot) {
  @apply inline-block shrink-0 w-2 h-2 rounded-full;

  &.is-pickup {
    @apply bg-[#6ee7b7] shadow-[0_0_6px_#6ee7b7];
  }

  &.is-drop {
    @apply bg-[#38d9ff] shadow-[0_0_6px_#38d9ff];
  }
}

:deep(.ops-map__panel) {
  @apply flex flex-col min-w-0 lg:min-h-0 p-3 rounded-[12px] border border-solid border-[rgba(120,180,240,0.16)] bg-[rgba(255,255,255,0.025)] backdrop-blur-sm;
}

:deep(.ops-map__panel-body) {
  @apply min-h-0 max-h-[600px] overflow-y-auto lg:flex-1 lg:max-h-none;
}

:deep(.ops-map__filter) {
  @apply flex items-center justify-between gap-2 mb-2 px-2 py-[6px] text-[12px] text-[var(--el-text-color-primary)] rounded-[8px] bg-[rgba(56,217,255,0.08)];
}

:deep(.ops-map__row) {
  @apply flex w-full items-center justify-between gap-3 px-2 py-[10px] text-left bg-transparent border-0 border-b border-solid border-[var(--el-border-color-extra-light)] rounded-[6px] cursor-pointer transition-colors;

  &.is-stacked {
    @apply flex-col items-stretch justify-start gap-1;
  }

  &:hover,
  &.is-active {
    @apply bg-[rgba(56,217,255,0.07)];
  }

  &.is-static {
    @apply cursor-default bg-transparent;
  }

  &:last-child {
    @apply border-b-0;
  }
}

:deep(.ops-map__tour-link) {
  @apply text-[12px] text-[#7ae6ff] no-underline;

  &:hover {
    @apply underline;
  }
}
</style>
