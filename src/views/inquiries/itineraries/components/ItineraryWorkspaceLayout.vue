<template>
  <div
    ref="root"
    class="itinerary-workspace flex flex-col gap-4"
    :style="{ '--itinerary-workspace-offset': `${scrollOffset}px` }"
  >
    <div ref="header" class="itinerary-workspace__header sticky top-0 z-[20]">
      <slot name="header" />
    </div>
    <slot name="notice" />
    <div
      v-if="days.length"
      class="itinerary-workspace__body flex items-start gap-4 max-[900px]:flex-col max-[900px]:items-stretch"
    >
      <nav
        ref="nav"
        class="itinerary-workspace__nav sticky z-[15] w-[168px] shrink-0 flex flex-col gap-2 top-[calc(var(--itinerary-workspace-header)+16px)] max-[900px]:w-full max-[900px]:flex-row max-[900px]:items-center max-[900px]:top-[var(--itinerary-workspace-header)] max-[900px]:py-2 max-[900px]:bg-[var(--page-bg)]"
        :style="{ '--itinerary-workspace-header': `${headerHeight}px` }"
        :aria-label="$t('itineraryWorkspace.dayDirectory')"
      >
        <ol
          class="itinerary-workspace__directory m-0 p-1 list-none flex flex-col gap-[2px] overflow-y-auto rounded-[var(--card-radius)] bg-[var(--content-bg)] [border:1px_solid_var(--card-border)] max-[900px]:flex-row max-[900px]:min-w-0 max-[900px]:flex-1 max-[900px]:overflow-x-auto max-[900px]:overflow-y-hidden"
          :style="{ maxHeight: isNarrow ? undefined : `calc(100vh - ${headerHeight + footerHeight + 120}px)` }"
        >
          <li v-for="day in days" :key="day.id" class="max-[900px]:shrink-0">
            <button
              type="button"
              class="itinerary-workspace__entry w-full flex flex-col items-start gap-[2px] px-3 py-2 text-left rounded-[6px] border-0 bg-transparent cursor-pointer text-[var(--el-text-color-regular)] hover:bg-[var(--el-fill-color-light)] max-[900px]:w-auto max-[900px]:max-w-[180px]"
              :class="{ 'is-active': day.id === activeId }"
              :aria-current="day.id === activeId ? 'step' : undefined"
              @click="scrollToDay(day.id)"
            >
              <strong class="text-[14px]">{{ day.label }}</strong>
              <span
                v-if="day.summary"
                class="w-full overflow-hidden whitespace-nowrap text-ellipsis text-[12px] text-muted"
                :title="day.summary"
              >{{ day.summary }}</span>
            </button>
          </li>
          <li v-if="canAdd" class="p-1 max-[900px]:shrink-0">
            <el-button class="w-full" :disabled="days.length >= 365" @click="emit('add')">
              {{ $t("itineraryWorkspace.addDay") }}
            </el-button>
          </li>
        </ol>
        <el-button class="ml-0! max-[900px]:shrink-0" @click="emit('reorder')">
          <el-icon class="mr-1">
            <Sort />
          </el-icon>
          {{ $t("itineraryWorkspace.reorder") }}
        </el-button>
      </nav>
      <div class="itinerary-workspace__days min-w-0 flex-1 flex flex-col gap-4">
        <div
          v-for="(day, index) in days"
          :id="dayElementId(day.id)"
          :key="day.id"
          :data-day-id="day.id"
          class="scroll-mt-[var(--itinerary-workspace-offset)]"
        >
          <slot name="day" :day="day" :index="index" />
        </div>
      </div>
    </div>
    <slot v-else name="empty" />
    <!-- 有逐日内容时让出左侧目录宽度（168px + gap 16px），与逐日列对齐 -->
    <div
      ref="footer"
      class="itinerary-workspace__footer sticky bottom-0 z-[20] mt-auto"
      :class="{ 'ml-[184px] max-[900px]:ml-0': days.length }"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onMounted, ref, watch } from "vue";
import { useElementSize, useEventListener, useMediaQuery } from "@vueuse/core";
import { Sort } from "@element-plus/icons-vue";

export interface WorkspaceDayEntry {
  id: string;
  label: string;
  summary: string;
}

/**
 * 行程工作区骨架：固定顶部信息、左侧日程目录（滚动高亮）、逐日内容与底部整程操作区。
 *
 * 滚动容器为布局内容区 `.layout-content`；顶部、目录与底部高度变化时同步跳转偏移。
 */
const props = defineProps<{
  days: WorkspaceDayEntry[];
  /** 当前行程标识；变化时目录状态重置，不沿用上份行程的日 ID */
  resetKey?: string;
  canAdd?: boolean;
}>();
const emit = defineEmits<{
  reorder: [];
  add: [];
  /** 跳转前通知页面展开目标日 */
  expand: [dayId: string];
}>();

const root = ref<HTMLElement>();
const header = ref<HTMLElement>();
const nav = ref<HTMLElement>();
const footer = ref<HTMLElement>();
const scrollContainer = ref<HTMLElement>();
const activeId = ref("");
const isNarrow = useMediaQuery("(max-width: 900px)");
const { height: headerHeight } = useElementSize(header, undefined, { box: "border-box" });
const { height: navHeight } = useElementSize(nav, undefined, { box: "border-box" });
const { height: footerHeight } = useElementSize(footer, undefined, { box: "border-box" });
const scrollOffset = computed(
  () => Math.ceil(headerHeight.value + (isNarrow.value ? navHeight.value : 0)) + 16,
);
let lockedUntil = 0;
let frame = 0;

function dayElementId(id: string) {
  return `itinerary-day-${id}`;
}

function attachScrollContainer() {
  scrollContainer.value = root.value?.closest<HTMLElement>(".layout-content") ?? undefined;
  syncActiveDay();
}

function syncActiveDay() {
  const container = scrollContainer.value;
  if (!container || !props.days.length || Date.now() < lockedUntil) return;
  const containerTop = container.getBoundingClientRect().top;
  const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 2;
  if (isAtBottom && container.scrollTop > 0) {
    activeId.value = props.days[props.days.length - 1]!.id;
    return;
  }
  let current = props.days[0]!.id;
  for (const day of props.days) {
    const element = document.getElementById(dayElementId(day.id));
    if (!element) continue;
    if (element.getBoundingClientRect().top - containerTop <= scrollOffset.value + 8) current = day.id;
    else break;
  }
  activeId.value = current;
}

useEventListener(scrollContainer, "scroll", () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(syncActiveDay);
}, { passive: true });
useEventListener(scrollContainer, "scrollend", () => {
  lockedUntil = 0;
  syncActiveDay();
});

/**
 * 展开并定位到指定日，日标题落在固定顶部信息区下方。
 *
 * @param id - 日 ID。
 */
async function scrollToDay(id: string) {
  emit("expand", id);
  activeId.value = id;
  // 平滑滚动期间经过的其他日不覆盖用户选中的目标。
  lockedUntil = Date.now() + 1000;
  await nextTick();
  document.getElementById(dayElementId(id))?.scrollIntoView({ behavior: "smooth", block: "start" });
}

watch(
  () => [props.resetKey, props.days.map((day) => day.id).join()],
  ([resetKey], previous) => {
    const previousResetKey = previous?.[0];
    if (resetKey !== previousResetKey || !props.days.some((day) => day.id === activeId.value))
      activeId.value = props.days[0]?.id ?? "";
    void nextTick(syncActiveDay);
  },
  { immediate: true },
);
onMounted(attachScrollContainer);
onActivated(attachScrollContainer);

defineExpose({ scrollToDay });
</script>

<style scoped>
.itinerary-workspace__entry.is-active {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
</style>
