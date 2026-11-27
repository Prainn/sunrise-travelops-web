<template>
  <AppDialog
    :model-value="modelValue"
    size="full"
    :append-to-body="recovery"
    :title="dialogTitle"
    @close="emit('update:modelValue', false)"
  >
    <template #header>
      <div class="flex w-full items-center gap-4 flex-wrap">
        <strong>{{ dialogTitle }}</strong>
        <el-button v-if="!recovery" :disabled="!recycledDays.length || busy" @click="isRecycleVisible = true">
          {{ $t('itineraryWorkspace.deletedDays') }} ({{ recycledDays.length }})
        </el-button>
        <div
          v-if="compact"
          class="itinerary-reorder__zoom ml-auto flex items-center gap-2"
          role="group"
          :aria-label="$t('itineraryWorkspace.boardZoom')"
        >
          <el-button size="small" :disabled="zoomPercent <= ZOOM_MIN" @click="zoomBy(-ZOOM_STEP)">
            {{ $t('itineraryWorkspace.zoomOut') }}
          </el-button>
          <output class="min-w-[44px] text-center text-[14px] tabular-nums" aria-live="polite">{{ zoomPercent }}%</output>
          <el-button
            size="small"
            class="ml-0!"
            :disabled="zoomPercent >= ZOOM_MAX"
            @click="zoomBy(ZOOM_STEP)"
          >
            {{ $t('itineraryWorkspace.zoomIn') }}
          </el-button>
        </div>
      </div>
    </template>
    <p class="m-0 mb-3 text-[12px] text-muted">
      {{ $t(recovery ? "itineraryWorkspace.deletedHint" : readonly ? "itineraryWorkspace.reorderReadonly" : transfer ? "itineraryWorkspace.transfer.hint" : "itineraryWorkspace.reorderHint") }}
    </p>
    <!-- 缩放只作用于画布：外层按缩放后尺寸占位，保证滚动范围与拖放命中区域一致。 -->
    <div ref="boardViewport" class="itinerary-reorder__board overflow-x-auto pb-3" :inert="busy">
      <div :style="zoomFrameStyle">
        <div
          ref="boardCanvas"
          class="flex w-max gap-3"
          role="list"
          :style="zoomCanvasStyle"
        >
          <section
            v-for="(day, dayIndex) in displayedDays"
            :key="day.id"
            role="listitem"
            class="itinerary-reorder__day shrink-0 flex flex-col gap-2 p-3 rounded-[var(--card-radius)] surface-muted [border:1px_solid_var(--divider-color)]"
            :class="[compact ? 'w-[184px]' : 'w-[240px]', { 'is-drop-target': dropDayId === day.id }]"
            @dragover="allowDayDrop($event, day.id)"
            @dragleave="dropDayId = ''"
            @drop="dropDay($event, dayIndex)"
          >
            <header
              class="flex flex-col gap-1"
              :draggable="!readonly && !recovery"
              :class="{ 'cursor-grab': !readonly && !recovery }"
              @dragstart="startDayDrag($event, day.id)"
              @dragend="endDrag"
            >
              <div class="flex items-start justify-between gap-1">
                <h4 class="m-0 min-w-0 text-[14px] text-strong font-600">
                  D{{ recovery ? day.dayNumber : dayIndex + 1 }}
                  <span
                    v-if="!hideDates && (recovery ? day.date : boardDate(dayIndex))"
                    class="ml-1 whitespace-nowrap font-400 text-muted"
                    :class="{ 'text-[12px]': compact }"
                  >{{ recovery ? day.date : boardDate(dayIndex) }}</span>
                </h4>
                <div v-if="!readonly && !recovery" class="itinerary-reorder__actions flex shrink-0 items-center gap-1">
                  <el-button
                    link
                    :disabled="dayIndex === 0"
                    :aria-label="$t('itineraryWorkspace.moveEarlier')"
                    :title="$t('itineraryWorkspace.moveEarlier')"
                    @click="moveDay(dayIndex, -1)"
                  >
                    <el-icon><ArrowLeft /></el-icon>
                  </el-button>
                  <el-button
                    link
                    :disabled="dayIndex === orderedDays.length - 1"
                    :aria-label="$t('itineraryWorkspace.moveLater')"
                    :title="$t('itineraryWorkspace.moveLater')"
                    @click="moveDay(dayIndex, 1)"
                  >
                    <el-icon><ArrowRight /></el-icon>
                  </el-button>
                  <el-button
                    link
                    type="danger"
                    :disabled="!serviceDates && orderedDays.length <= 1"
                    :aria-label="$t('itineraryWorkspace.deleteDay')"
                    :title="$t('itineraryWorkspace.deleteDay')"
                    @click="deleteDay(day.id)"
                  >
                    <el-icon><Close /></el-icon>
                  </el-button>
                </div>
              </div>
              <div v-if="recovery && !readonly" class="flex flex-col items-end gap-1">
                <el-select
                  v-if="serviceDates"
                  v-model="restoreDates[day.id]"
                  :aria-label="$t('websiteWorkspace.restoreToDate')"
                  :placeholder="$t('websiteWorkspace.restoreToDate')"
                  autocomplete="new-password"
                  class="w-full!"
                >
                  <el-option
                    v-for="date in serviceDates"
                    :key="date"
                    :value="date"
                    :label="date"
                  />
                </el-select>
                <el-button
                  link
                  type="primary"
                  :disabled="restoreDisabled || Boolean(serviceDates && !restoreDates[day.id])"
                  @click="emit('restore', day.id, restoreDates[day.id])"
                >
                  {{ $t('itineraryWorkspace.restoreDay') }}
                </el-button>
              </div>
              <p
                v-if="day.remark"
                class="itinerary-reorder__remark m-0 text-[12px] text-muted [overflow-wrap:anywhere]"
                :class="{ 'line-clamp-2': compact }"
                :title="compact ? day.remark : undefined"
              >
                {{ day.remark }}
              </p>
              <p
                class="m-0 text-[14px] [overflow-wrap:anywhere]"
                :class="{ 'line-clamp-2': compact }"
                :title="compact ? day.title : undefined"
              >
                {{ day.title }}
              </p>
              <p v-if="day.viaDestinations?.length" class="m-0 flex items-baseline gap-1 text-[12px] text-muted">
                <span class="shrink-0">{{ $t("itinerary.viaDestinations") }}</span>
                <span
                  class="min-w-0 [overflow-wrap:anywhere]"
                  :class="{ 'line-clamp-2': compact }"
                  :title="compact ? day.viaDestinations.join(' → ') : undefined"
                >{{ day.viaDestinations.join(" → ") }}</span>
              </p>
            </header>
            <div
              v-for="group in day.groups"
              :key="group.key"
              class="itinerary-reorder__group flex flex-col gap-1 rounded-[6px]"
              :class="{ 'is-drop-target': dropGroupKey === `${day.id}:${group.key}` }"
              @dragover="allowGroupDrop($event, day.id, group)"
              @dragleave="dropGroupKey = ''"
              @drop="dropGroup($event, day.id, group)"
            >
              <h5 class="m-0 flex items-center gap-1 text-[12px] text-muted font-500">
                <el-icon v-if="group.icon">
                  <component :is="group.icon" />
                </el-icon>
                {{ group.label }}
                <span v-if="group.scope" class="ml-1 font-normal text-muted">{{ group.scope }}</span>
              </h5>
              <p v-if="!group.items.length" class="m-0 text-[12px] text-muted">
                {{ $t("itineraryWorkspace.notArranged") }}
              </p>
              <div
                v-for="(item, itemIndex) in group.items"
                :key="item.id"
                class="itinerary-reorder__item flex flex-col gap-1 px-2 py-[6px] rounded-[6px] bg-surface [border:1px_solid_var(--divider-color)] text-[14px]"
                :class="{
                  'cursor-grab': canSortItem(group, item) || canMove(group, item),
                  'is-drop-target': dropItemId === item.id,
                  'is-invalid': invalidItemIds.has(item.id),
                }"
                :draggable="canSortItem(group, item) || canMove(group, item)"
                @dragstart.stop="startItemDrag($event, day.id, item, group)"
                @dragend.stop="endDrag"
                @dragover="allowItemDrop($event, day.id, item.id, group)"
                @drop="dropItem($event, day.id, group, item.id)"
              >
                <div class="flex items-start gap-1">
                  <el-icon v-if="item.icon" class="shrink-0 mt-[3px] text-muted" aria-hidden="true">
                    <component :is="item.icon" />
                  </el-icon>
                  <span class="min-w-0 flex-1 [overflow-wrap:anywhere]">
                    <span :class="{ 'line-clamp-2': compact }" :title="compact ? item.label : undefined">
                      <el-tag
                        v-if="isPendingCopy(item.id)"
                        size="small"
                        type="warning"
                        class="mr-1"
                      >
                        {{ $t("itineraryWorkspace.transfer.copyTag") }}
                      </el-tag>
                      {{ item.label }}
                    </span>
                    <small
                      v-if="item.detail"
                      class="text-[12px] text-muted"
                      :class="compact ? 'line-clamp-2' : 'block'"
                      :title="compact ? item.detail : undefined"
                    >{{ item.detail }}</small>
                  </span>
                </div>
                <div class="itinerary-reorder__actions flex items-center justify-end gap-1 empty:hidden">
                  <el-button
                    v-if="!isPendingCopy(item.id) && canMove(group, item)"
                    link
                    :aria-label="$t('itineraryWorkspace.transfer.copy')"
                    :title="$t('itineraryWorkspace.transfer.copy')"
                    @click="copyItem(day.id, group.key, item.id)"
                  >
                    <el-icon><CopyDocument /></el-icon>
                  </el-button>
                  <el-button
                    v-if="canMove(group, item) && item.transportLeg && board.copies[item.id] && editTransport"
                    link
                    :aria-label="$t('common.edit')"
                    :title="$t('common.edit')"
                    @click="editTransportCopy(item.id)"
                  >
                    <el-icon><Edit /></el-icon>
                  </el-button>
                  <template v-if="canSortItem(group, item)">
                    <el-button
                      link
                      :disabled="itemIndex === 0 || Boolean(group.items[itemIndex - 1]?.pinned)"
                      :aria-label="$t('common.moveUp')"
                      :title="$t('common.moveUp')"
                      @click="moveItem(day.id, group, item.id, group.items[itemIndex - 1]?.id)"
                    >
                      <el-icon><ArrowUp /></el-icon>
                    </el-button>
                    <el-button
                      link
                      :disabled="itemIndex === group.items.length - 1"
                      :aria-label="$t('common.moveDown')"
                      :title="$t('common.moveDown')"
                      @click="moveItem(day.id, group, item.id, group.items[itemIndex + 1]?.id)"
                    >
                      <el-icon><ArrowDown /></el-icon>
                    </el-button>
                  </template>
                  <el-button
                    v-if="canTransfer && group.transferable"
                    link
                    type="danger"
                    :aria-label="$t('common.remove')"
                    :title="$t('common.remove')"
                    @click="removeItem(item.id)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>
          </section>
          <el-button
            v-if="createDay && !readonly && !recovery"
            :disabled="dayIds.length >= maxDays || busy"
            class="shrink-0"
            @click="addBoardDay"
          >
            {{ $t('itineraryWorkspace.addDay') }}
          </el-button>
        </div>
      </div>
    </div>
    <div ref="issueAnchor" />
    <el-alert
      v-if="!readonly && !recovery && blockingIssues.length"
      type="error"
      :closable="false"
      :title="$t('itineraryWorkspace.transfer.blockingTitle')"
      class="mt-3!"
    >
      <ul class="m-0 pl-4">
        <li v-for="(issue, index) in blockingIssues" :key="index">
          {{ $t(issue.key, issue.params ?? {}) }}
          <el-button
            v-if="issue.retry"
            link
            class="align-baseline!"
            type="primary"
            @click="issue.retry()"
          >
            {{ $t("common.retry") }}
          </el-button>
        </li>
      </ul>
    </el-alert>
    <el-alert
      v-if="!readonly && !recovery && hintIssues.length"
      type="warning"
      :closable="false"
      :title="$t('itineraryWorkspace.issuesTitle')"
      class="mt-3!"
    >
      <ul class="m-0 pl-4">
        <li v-for="(issue, index) in hintIssues" :key="index">
          {{ $t(issue.key, issue.params ?? {}) }}
        </li>
      </ul>
    </el-alert>
    <template #footer>
      <el-button v-if="stash && !readonly && !recovery" :loading="busy" @click="stashBoard">
        {{ $t('itineraryWorkspace.stash') }}
      </el-button>
      <el-button @click="emit('update:modelValue', false)">
        {{ $t(readonly || recovery ? "common.close" : "common.cancel") }}
      </el-button>
      <el-button
        v-if="!readonly && !recovery"
        type="primary"
        :disabled="busy || (!transfer && (!isChanged || blockingIssues.length > 0))"
        :loading="busy"
        @click="apply"
      >
        {{ $t(warningsAccepted ? "itineraryWorkspace.applyDespiteWarnings" : "itineraryWorkspace.applyOrder") }}
      </el-button>
    </template>
  </AppDialog>
  <ItineraryReorderDialog
    v-if="!recovery"
    v-model="isRecycleVisible"
    :days="recycledDays"
    :hide-dates="hideDates"
    :readonly="readonly"
    :service-dates="serviceDates"
    :compact="compact"
    recovery
    :restore-disabled="(!serviceDates && dayIds.length >= maxDays) || busy"
    @restore="restoreDay"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from "vue";
import { useResizeObserver } from "@vueuse/core";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Close, CopyDocument, Delete, Edit } from "@element-plus/icons-vue";
import { ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import type { WebsiteReorderDraft, WebsiteLeg } from "@/types/website";
import AppDialog from "@/components/AppDialog/index.vue";
import { clonePlainData } from "@/utils";
import { serviceDayDate } from "@/utils/service-dates";
import {
  boardPlacements,
  boardTransferIssues,
  copyBoardItem,
  planBoardTransfer,
  removeBoardCopy,
  removeBoardItem,
  restoredDayIndex,
  restoreWebsiteBoard,
  type BoardState,
  type DayOrderChange,
  type DayOrderIssue,
  type ReorderBoardDay,
  type ReorderBoardGroup,
  type ReorderBoardItem,
} from "../reorder-board";

/**
 * 顺序调整看板：打开时建立临时顺序副本，拖动和按钮只改副本；取消不改变草稿，应用后由页面写回并标记未保存。
 *
 * transfer 由业务页面显式开启（仅霖熹/独立站）：transferable 分组的条目可跨天移动与复制，
 * 同 slot 冲突需确认替换；未安置副本与 blocking 问题存在时禁止应用。
 */
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    days: ReorderBoardDay[];
    deletedDays?: ReorderBoardDay[];
    recovery?: boolean;
    restoreDisabled?: boolean;
    readonly?: boolean;
    startDate?: string | null;
    /** 独立站自选服务日：Dn 取 serviceDates[n - 1]，看板日历顺序固定。 */
    serviceDates?: string[] | null;
    /** 活动日上限；自选模式为服务日数量。 */
    maxDays?: number;
    hideDates?: boolean;
    /** 开启跨天移动与复制 */
    transfer?: boolean;
    /** 预演本次调整，返回需核对事项；不修改草稿 */
    validate?: (change: DayOrderChange) => DayOrderIssue[] | Promise<DayOrderIssue[]>;
    draft?: WebsiteReorderDraft | null;
    createDay?: (id: string) => ReorderBoardDay;
    stash?: (change: DayOrderChange) => Promise<boolean>;
    editTransport?: (leg: WebsiteLeg) => Promise<WebsiteLeg | undefined>;
    transportItem?: (leg: WebsiteLeg) => ReorderBoardItem;
    /** 紧凑编排使用窄日列、两行省略和日卡区域缩放。 */
    compact?: boolean;
  }>(),
  { compact: false, readonly: false, startDate: null, serviceDates: null, maxDays: 365, transfer: false, validate: undefined, deletedDays: () => [], recovery: false, restoreDisabled: false },
);
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  apply: [change: DayOrderChange];
  restore: [dayId: string, date?: string];
}>();

const { t } = useI18n();
const dialogTitle = computed(() => t(props.recovery ? "itineraryWorkspace.deletedDays" : "itineraryWorkspace.reorderTitle"));
const isRecycleVisible = ref(false);
const recycledDays = ref<ReorderBoardDay[]>([]);
const dayIds = ref<string[]>([]);
const board = ref<BoardState>({ placements: {}, copies: {} });
const initialPlacements = ref("");
const dragging = ref<{ dayId: string; itemId?: string; groupKey?: string }>();
const dropDayId = ref("");
const dropItemId = ref("");
const dropGroupKey = ref("");

const addedDays = ref<ReorderBoardDay[]>([]);
const restoreDates = ref<Record<string, string>>({});
const overnight = ref<Record<string, string>>({});
const busy = ref(false);
const issueAnchor = ref<HTMLElement>();
/** 跨天看板点击应用时检查排布冲突；普通询盘实时显示核对事项 */
const issues = ref<DayOrderIssue[]>([]);
let session = 0;
const warningsAccepted = ref(false);
const ZOOM_MIN = 50;
const ZOOM_MAX = 150;
const ZOOM_STEP = 10;
/** 看板画布缩放百分比；每次打开恢复 100%。 */
const zoomPercent = ref(100);
const boardViewport = useTemplateRef<HTMLElement>("boardViewport");
const boardCanvas = useTemplateRef<HTMLElement>("boardCanvas");
/** 画布未缩放的布局尺寸（offset 尺寸不受 transform 影响） */
const canvasSize = ref({ width: 0, height: 0 });
useResizeObserver(boardCanvas, () => {
  const canvas = boardCanvas.value;
  if (canvas) canvasSize.value = { width: canvas.offsetWidth, height: canvas.offsetHeight };
});
const isZoomed = computed(() => props.compact && zoomPercent.value !== 100);
const zoomFrameStyle = computed(() => isZoomed.value && canvasSize.value.width > 0
  ? {
    width: `${canvasSize.value.width * zoomPercent.value / 100}px`,
    height: `${canvasSize.value.height * zoomPercent.value / 100}px`,
    overflow: "hidden",
  }
  : undefined);
const zoomCanvasStyle = computed(() => isZoomed.value
  ? { transform: `scale(${zoomPercent.value / 100})`, transformOrigin: "top left" }
  : undefined);
const allDays = computed(() => [...props.days, ...props.deletedDays, ...addedDays.value]);
const orderedDays = computed(() => dayIds.value.map((id) => allDays.value.find((day) => day.id === id)!).filter(Boolean));
const canTransfer = computed(() => props.transfer && !props.readonly && !props.recovery);
/** 看板条目（含临时副本：内容同原卡片，仅 ID 不同） */
const boardItems = computed(() => {
  const items = new Map(allDays.value.flatMap((day) => day.groups.flatMap((group) => group.items.map((item) => [item.id, item] as const))));
  Object.entries(board.value.copies).forEach(([id, copy]) => {
    const source = items.get(copy.sourceId);
    const leg = board.value.transportCopies?.find(leg => leg.id === id);
    if (leg && props.transportItem) items.set(id, props.transportItem(leg));
    else if (source) items.set(id, { ...source, id });
  });
  return items;
});
const boardItem = (id: string) => boardItems.value.get(id);
// 展示时隐藏重复的早餐占位，暂存和应用仍使用完整排布。
const displayedDays = computed(() => orderedDays.value.map(day => {
  const cityId = overnight.value[day.id] ?? day.overnightCityId;
  const groups = day.groups.map(group => {
    const items = groupItems(day.id, group);
    const hasHotelBreakfast = cityId && items.some(item =>
      item.hotelCityId === cityId && item.breakfastIncluded && !isPendingCopy(item.id),
    );
    return {
      ...group,
      items: hasHotelBreakfast ? items.filter(item => item.slot !== "meal-breakfast" || !item.placeholder) : items,
    };
  });
  return { ...day, groups };
}));
const change = computed<DayOrderChange>(() => ({
  removedItemIds: board.value.removedItemIds,
  transportCopies: board.value.transportCopies,
  dayIds: dayIds.value,
  addedDayIds: addedDays.value.map(day => day.id),
  overnight: overnight.value,
  draft: props.transfer ? {
    removedItemIds: board.value.removedItemIds ?? [],
    transportCopies: board.value.transportCopies ?? [],
    dayIds: dayIds.value,
    addedDayIds: addedDays.value.map(day => day.id),
    deletedDays: recycledDays.value.map(day => ({ id: day.id, dayNumber: day.dayNumber!, date: day.date ?? null })),
    placements: Object.entries(board.value.placements).map(([dayId, groups]) => ({ dayId, itemIds: groups.events ?? [] })),
    copies: Object.entries(board.value.copies).map(([id, copy]) => ({ id, sourceId: copy.sourceId, parentId: copy.parentId ?? copy.sourceId, dayId: copy.dayId, placed: Boolean(copy.placed) })),
    overnight: Object.entries(overnight.value).map(([dayId, cityId]) => ({ dayId, cityId })),
  } : undefined,
  itemIds: Object.fromEntries(
    allDays.value.map((day) => {
      const group = day.groups.find((value) => value.sortable);
      return [day.id, group ? (board.value.placements[day.id]?.[group.key] ?? []) : []];
    }),
  ),
  deletedDays: recycledDays.value.map((day) => ({ id: day.id, dayNumber: day.dayNumber!, date: day.date ?? null })),
  ...(props.transfer
    ? {
      placements: board.value.placements,
      copies: Object.fromEntries(Object.entries(board.value.copies).map(([id, copy]) => [id, copy.sourceId])),
    }
    : {}),
}));
const isChanged = computed(
  () =>
    dayIds.value.length !== props.days.length ||
    recycledDays.value.some((day, index) => day.id !== props.deletedDays[index]?.id || day.dayNumber !== props.deletedDays[index]?.dayNumber || day.date !== props.deletedDays[index]?.date) ||
    dayIds.value.some((id, index) => id !== props.days[index]?.id) ||
    JSON.stringify(board.value) !== initialPlacements.value,
);
const liveIssues = computed<DayOrderIssue[]>(() =>
  !props.transfer && isChanged.value && props.validate ? (props.validate(change.value) as DayOrderIssue[]) : [],
);
const shownIssues = computed(() => (props.transfer ? issues.value : liveIssues.value));
const blockingIssues = computed(() => shownIssues.value.filter((issue) => issue.blocking));
const hintIssues = computed(() => shownIssues.value.filter((issue) => !issue.blocking));
const invalidItemIds = computed(() => new Set(blockingIssues.value.flatMap((issue) => (issue.itemId ? [issue.itemId] : []))));

watch(
  () => props.modelValue,
  (visible) => {
    isRecycleVisible.value = false;
    zoomPercent.value = 100;
    // 重开即新会话：丢弃上一次仍在途的校验或暂存结果。
    session += 1;
    busy.value = false;
    if (!visible) return;
    restoreDates.value = Object.fromEntries(props.days.flatMap(day =>
      day.date && props.serviceDates?.includes(day.date) ? [[day.id, day.date]] : [],
    ));
    addedDays.value = (props.draft?.addedDayIds ?? []).flatMap(id => props.createDay ? [props.createDay(id)] : []);
    overnight.value = Object.fromEntries((props.draft?.overnight ?? []).map(entry => [entry.dayId, entry.cityId]));
    issues.value = [];
    warningsAccepted.value = false;
    recycledDays.value = props.deletedDays.map((day) => ({ ...day }));
    dayIds.value = props.days.map((day) => day.id);
    board.value = { placements: boardPlacements(allDays.value), copies: {} };
    // 已保存的未完成草稿可跳过某个日序。补上空位，让已有 D3 仍落在第三个服务日。
    if (!props.draft && !props.recovery && props.serviceDates && props.createDay) {
      const byNumber = new Map(props.days.map(day => [day.dayNumber, day.id]));
      const lastNumber = Math.max(0, ...props.days.map(day => day.dayNumber ?? 0));
      dayIds.value = Array.from({ length: lastNumber }, (_, index) => byNumber.get(index + 1) ?? newBoardDay());
    }
    if (props.draft) {
      const activeDays = new Set([...props.days, ...addedDays.value].map(day => day.id));
      if (props.serviceDates) props.deletedDays.forEach(day => activeDays.add(day.id));
      const recorded = new Set([...props.draft.dayIds, ...props.draft.deletedDays.map(day => day.id)]);
      // 暂存后在主页面删除的天不复活，保留在回收中。
      const draftIds = props.draft.dayIds;
      const newDays = props.days.filter(day =>
        !recorded.has(day.id) && !(props.serviceDates && day.emptySlot && draftIds[(day.dayNumber ?? 0) - 1]),
      );
      dayIds.value = [...draftIds.filter(id => activeDays.has(id)), ...newDays.map(day => day.id)];
      recycledDays.value = props.draft.deletedDays.flatMap(entry => {
        const day = allDays.value.find(day => day.id === entry.id);
        return day ? [{ ...day, dayNumber: entry.dayNumber, date: entry.date }] : [];
      });
      const placed = new Set([...dayIds.value, ...recycledDays.value.map(day => day.id)]);
      recycledDays.value.push(...props.deletedDays.filter(day => !placed.has(day.id)).map(day => ({ ...day })));
      board.value = restoreWebsiteBoard(allDays.value, props.draft);
    }
    initialPlacements.value = JSON.stringify(board.value);
  },
  { immediate: true },
);

watch(change, () => { issues.value = []; warningsAccepted.value = false; }, { deep: true });
/** 按步长缩放画布，并按比例保持当前横向滚动位置。 */
function zoomBy(step: number) {
  const previous = zoomPercent.value;
  const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, previous + step));
  if (next === previous) return;
  const canvas = boardCanvas.value;
  if (canvas && canvas.offsetWidth > 0) {
    canvasSize.value = { width: canvas.offsetWidth, height: canvas.offsetHeight };
  }
  zoomPercent.value = next;
  const viewport = boardViewport.value;
  if (viewport && typeof viewport.scrollLeft === "number") viewport.scrollLeft = viewport.scrollLeft * next / previous;
}
function boardDate(dayIndex: number) {
  return serviceDayDate({ startDate: props.startDate, serviceDates: props.serviceDates }, dayIndex + 1);
}
function isPendingCopy(id: string) { return Boolean(board.value.copies[id] && !board.value.copies[id].placed); }
function addBoardDay() {
  if (!props.createDay || dayIds.value.length >= props.maxDays) return;
  dayIds.value.push(newBoardDay());
}
function newBoardDay() {
  const day = props.createDay!(crypto.randomUUID());
  addedDays.value.push(day);
  board.value = { ...board.value, placements: { ...board.value.placements, ...boardPlacements([day]) } };
  return day.id;
}
async function stashBoard() {
  if (!props.stash || busy.value) return;
  const current = session;
  busy.value = true;
  try { if (await props.stash(change.value) && current === session) emit("update:modelValue", false); }
  finally { if (current === session) busy.value = false; }
}
function canSort(group: ReorderBoardGroup) {
  return Boolean(group.sortable && !props.readonly && !props.recovery);
}

function canSortItem(group: ReorderBoardGroup, item: ReorderBoardItem) {
  return canSort(group) && !item.pinned;
}

function canMove(group: ReorderBoardGroup, item: ReorderBoardItem) {
  return Boolean(canTransfer.value && group.transferable && !item.placeholder && !item.pinned);
}

function groupItems(dayId: string, group: ReorderBoardGroup) {
  const items = (board.value.placements[dayId]?.[group.key] ?? []).flatMap((id) => boardItem(id) ?? []);
  return [...items.filter((item) => item.pinned), ...items.filter((item) => !item.pinned)];
}

async function deleteDay(id: string) {
  if (props.readonly || props.recovery || (!props.serviceDates && dayIds.value.length <= 1)) return;
  const index = dayIds.value.indexOf(id);
  if (index < 0) return;
  try {
    await ElMessageBox.confirm(t("itineraryWorkspace.deleteDayConfirm", { day: index + 1 }), t("itineraryWorkspace.deleteDay"), {
      type: "warning", confirmButtonText: t("common.confirm"), cancelButtonText: t("common.cancel"),
    });
  } catch { return; }
  const day = orderedDays.value[index];
  if (!day || day.id !== id || props.readonly || !props.modelValue) return;
  recycleDay(day, index);
  if (props.serviceDates && props.createDay) dayIds.value.splice(index, 1, newBoardDay());
  else dayIds.value.splice(index, 1);
}
function recycleDay(day: ReorderBoardDay, index: number) {
  const id = day.id;
  // 未安置的临时副本不随整天进入回收；回收展示当前看板排布。
  Object.entries(board.value.copies).forEach(([copyId, copy]) => {
    if (!copy.placed && copy.dayId === id && Object.values(board.value.placements[id] ?? {}).some((ids) => ids.includes(copyId)))
      board.value = removeBoardCopy(board.value, copyId);
  });
  const groups = day.groups.map((group) => ({ ...group, items: groupItems(id, group) }));
  recycledDays.value.push({
    ...day,
    groups,
    overnightCityId: overnight.value[id] ?? day.overnightCityId,
    dayNumber: index + 1,
    date: boardDate(index),
  });
}

async function restoreDay(id: string, date?: string) {
  if (props.readonly || busy.value) return;
  const day = recycledDays.value.find(item => item.id === id);
  if (!day) return;
  if (props.serviceDates) {
    const target = date ? props.serviceDates.indexOf(date) : -1;
    if (target < 0 || !props.createDay) return;
    const occupant = orderedDays.value[target];
    const empty = occupant?.emptySlot && !overnight.value[occupant.id] &&
      occupant.groups.every(group => groupItems(occupant.id, group).every(item => item.placeholder)) &&
      !Object.values(board.value.copies).some(copy => copy.dayId === occupant.id);
    if (occupant && empty) {
      addedDays.value = addedDays.value.filter(item => item.id !== occupant.id);
      delete board.value.placements[occupant.id];
    } else if (occupant) {
      const current = session;
      try {
        await ElMessageBox.confirm(t("websiteWorkspace.restoreReplacesDay", { date }), t("itineraryWorkspace.restoreDay"), {
          type: "warning", confirmButtonText: t("common.confirm"), cancelButtonText: t("common.cancel"),
        });
      } catch { return; }
      if (current !== session || props.readonly || dayIds.value[target] !== occupant.id) return;
      recycleDay(occupant, target);
    }
    while (dayIds.value.length < target) dayIds.value.push(newBoardDay());
    dayIds.value.splice(target, 1, id);
  } else {
    if (dayIds.value.length >= props.maxDays) return;
    const dates = dayIds.value.map((_, index) => boardDate(index));
    const target = restoredDayIndex(dates, day.date ?? null, day.dayNumber!);
    dayIds.value.splice(target, 0, id);
  }
  recycledDays.value = recycledDays.value.filter(item => item.id !== id);
  if (!recycledDays.value.length) isRecycleVisible.value = false;
}

function moveDay(index: number, direction: number) {
  const next = [...dayIds.value];
  const [id] = next.splice(index, 1);
  if (!id) return;
  next.splice(index + direction, 0, id);
  dayIds.value = next;
}

function moveItem(dayId: string, group: ReorderBoardGroup, itemId: string, targetId?: string) {
  if (boardItem(itemId)?.pinned || (targetId && boardItem(targetId)?.pinned)) return;
  const next = groupItems(dayId, group).map((item) => item.id);
  const index = next.indexOf(itemId);
  const targetIndex = next.findIndex(id => id === targetId);
  if (index < 0 || targetIndex < 0 || index === targetIndex) return;
  next.splice(index, 1);
  next.splice(targetIndex, 0, itemId);
  board.value = {
    ...board.value,
    placements: { ...board.value.placements, [dayId]: { ...board.value.placements[dayId], [group.key]: next } },
  };
}

async function copyItem(dayId: string, groupKey: string, itemId: string) {
  if (!canTransfer.value) return;
  const id = crypto.randomUUID();
  const source = boardItem(itemId)?.transportLeg;
  const current = session;
  if (source && props.editTransport) {
    const leg = await props.editTransport({ id, mode: source.mode, routeId: null, fromCityId: "", toCityId: "", nameZh: "", nameEn: "", feeState: "INCLUDED" });
    if (!leg || current !== session) return;
    board.value = { ...board.value, transportCopies: [...(board.value.transportCopies ?? []), leg] };
  }
  board.value = copyBoardItem(board.value, dayId, groupKey, itemId, id);
}

async function editTransportCopy(id: string) {
  const source = boardItem(id)?.transportLeg;
  if (!source || !props.editTransport) return;
  const current = session;
  const leg = await props.editTransport({ ...source, id });
  if (!leg || current !== session) return;
  board.value = { ...board.value, transportCopies: [...(board.value.transportCopies ?? []).filter(leg => leg.id !== id), leg] };
}

function removeItem(id: string) {
  if (canTransfer.value) board.value = removeBoardItem(board.value, id);
}

/** 跨天放入；同 slot 已有安排时确认替换，取消则保持拖动前的完整排布。 */
async function transferItem(dayId: string, group: ReorderBoardGroup, index?: number) {
  const source = dragging.value;
  endDrag();
  if (!source?.itemId || !canTransfer.value || !group.transferable || source.groupKey !== group.key) return;
  const plan = planBoardTransfer(board.value, group, { dayId: source.dayId, itemId: source.itemId }, { dayId, index }, boardItem);
  if (!plan) return;
  const before = board.value;
  const hotelCityId = boardItem(source.itemId)?.hotelCityId;
  const noStayId = `${dayId}-no-stay`;
  const requiresStay = hotelCityId && (allDays.value.some(day => day.id === dayId && day.noOvernight) && !overnight.value[dayId] || Object.values(board.value.placements[dayId] ?? {}).some(ids => ids.includes(noStayId)));
  if (requiresStay) {
    try {
      await ElMessageBox.confirm(t("itineraryWorkspace.arrangeOvernight"), t("common.confirm"), {
        type: "warning", confirmButtonText: t("common.confirm"), cancelButtonText: t("common.cancel"),
      });
    } catch { return; }
    if (!props.modelValue || board.value !== before) return;
  }
  if (plan.replaced.length) {
    const before = board.value;
    try {
      await ElMessageBox.confirm(
        t("itineraryWorkspace.transfer.replaceConfirm", {
          day: dayIds.value.indexOf(dayId) + 1,
          name: plan.replaced.map((id) => boardItem(id)?.label ?? "").join(t("websiteInquiry.listSeparator")),
          next: boardItem(source.itemId)?.label ?? "",
        }),
        t("itineraryWorkspace.transfer.replaceTitle"),
        { type: "warning", confirmButtonText: t("itineraryWorkspace.transfer.replace"), cancelButtonText: t("common.cancel") },
      );
    } catch { return; }
    if (!props.modelValue || board.value !== before) return;
  }
  if (requiresStay) {
    overnight.value = { ...overnight.value, [dayId]: hotelCityId };
    for (const ids of Object.values(plan.next.placements[dayId] ?? {})) {
      const index = ids.indexOf(noStayId);
      if (index >= 0) ids.splice(index, 1);
    }
  }
  board.value = plan.next;
  releaseOvernight(source.dayId);
}

/** 该日由看板安排的住宿已无酒店时，撤销安排并恢复“不住宿”占位。 */
function releaseOvernight(dayId: string) {
  const noStayId = `${dayId}-no-stay`;
  const groups = board.value.placements[dayId];
  if (!overnight.value[dayId] || !groups || !boardItems.value.has(noStayId)) return;
  if (Object.values(groups).some(ids => ids.some(id => boardItem(id)?.hotelCityId))) return;
  overnight.value = Object.fromEntries(Object.entries(overnight.value).filter(([id]) => id !== dayId));
  board.value = { ...board.value, placements: { ...board.value.placements, [dayId]: { ...groups, events: [...(groups.events ?? []), noStayId] } } };
}

function startDayDrag(event: DragEvent, dayId: string) {
  if (props.readonly || props.recovery) return;
  dragging.value = { dayId };
  event.dataTransfer?.setData("text/plain", dayId);
}

function startItemDrag(event: DragEvent, dayId: string, item: ReorderBoardItem, group: ReorderBoardGroup) {
  if (!canSortItem(group, item) && !canMove(group, item)) {
    event.preventDefault();
    return;
  }
  dragging.value = { dayId, itemId: item.id, groupKey: group.key };
  event.dataTransfer?.setData("text/plain", item.id);
}

/** 跨天拖动时卡片可放到目标日任意位置，自动进入该日的同类分组。 */
function dayTransferGroup(dayId: string) {
  const source = dragging.value;
  if (!source?.itemId) return undefined;
  const group = orderedDays.value.find((day) => day.id === dayId)?.groups.find((value) => value.key === source.groupKey);
  return group && isTransferTarget(dayId, group) ? group : undefined;
}

function allowDayDrop(event: DragEvent, dayId: string) {
  const group = dayTransferGroup(dayId);
  if (group) {
    event.preventDefault();
    dropGroupKey.value = `${dayId}:${group.key}`;
    return;
  }
  if (!dragging.value || dragging.value.itemId) return;
  event.preventDefault();
  dropDayId.value = dayId;
}

function isTransferTarget(dayId: string, group: ReorderBoardGroup) {
  const source = dragging.value;
  return Boolean(source?.itemId && canTransfer.value && group.transferable && source.groupKey === group.key && source.dayId !== dayId);
}

function allowItemDrop(event: DragEvent, dayId: string, itemId: string, group: ReorderBoardGroup) {
  // 当天只调整可排序分组；跨天仅在开启 transfer 的同类分组间进行。
  if (boardItem(itemId)?.pinned) return;
  const source = dragging.value;
  const sameDay = source?.itemId && source.dayId === dayId && source.groupKey === group.key && canSort(group);
  // 不能放在此卡片时交给所在日处理（跨天时自动进入同类分组）。
  if (!sameDay && !isTransferTarget(dayId, group)) return;
  event.preventDefault();
  event.stopPropagation();
  dropItemId.value = itemId;
  dropGroupKey.value = "";
}

function allowGroupDrop(event: DragEvent, dayId: string, group: ReorderBoardGroup) {
  if (!isTransferTarget(dayId, group)) return;
  event.preventDefault();
  event.stopPropagation();
  dropGroupKey.value = `${dayId}:${group.key}`;
}

function dropGroup(event: DragEvent, dayId: string, group: ReorderBoardGroup) {
  if (!isTransferTarget(dayId, group)) return;
  event.preventDefault();
  event.stopPropagation();
  void transferItem(dayId, group);
}

function dropDay(event: DragEvent, targetIndex: number) {
  const targetId = orderedDays.value[targetIndex]?.id ?? "";
  const group = dayTransferGroup(targetId);
  if (group) {
    event.preventDefault();
    void transferItem(targetId, group);
    return;
  }
  const source = dragging.value;
  if (!source || source.itemId) return;
  event.preventDefault();
  const index = dayIds.value.indexOf(source.dayId);
  if (index >= 0 && index !== targetIndex) moveDay(index, targetIndex - index);
  endDrag();
}

function dropItem(event: DragEvent, dayId: string, group: ReorderBoardGroup, targetId: string) {
  const source = dragging.value;
  if (isTransferTarget(dayId, group)) {
    event.preventDefault();
    event.stopPropagation();
    const targetIndex = board.value.placements[dayId]?.[group.key]?.indexOf(targetId);
    void transferItem(dayId, group, targetIndex);
    return;
  }
  if (!source?.itemId || source.dayId !== dayId || source.groupKey !== group.key || !canSort(group) || boardItem(targetId)?.pinned) return;
  event.preventDefault();
  event.stopPropagation();
  moveItem(dayId, group, source.itemId, targetId);
  endDrag();
}

function endDrag() {
  dragging.value = undefined;
  dropDayId.value = "";
  dropItemId.value = "";
  dropGroupKey.value = "";
}

async function apply() {
  if (busy.value || props.readonly || props.recovery) return;
  if (!props.transfer) {
    if (!isChanged.value || blockingIssues.value.length) return;
    // 排布嵌套在响应式状态中，按纯数据复制后交给页面，避免页面写回时与看板状态共享引用。
    emit("apply", clonePlainData(change.value));
    emit("update:modelValue", false);
    return;
  }
  if (warningsAccepted.value) {
    emit("apply", change.value);
    emit("update:modelValue", false);
    return;
  }
  const current = session;
  const submitted = change.value;
  busy.value = true;
  try {
    const local = boardTransferIssues(board.value, orderedDays.value, boardItem);
    const external = props.validate ? await props.validate(submitted) : [];
    // 校验期间看板被改动或弹窗已重开时，结果不再适用。
    if (current !== session || !props.modelValue || change.value !== submitted) return;
    issues.value = [...local, ...external];
    if (issues.value.length) {
      warningsAccepted.value = !blockingIssues.value.length;
      await nextTick();
      issueAnchor.value?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    emit("apply", submitted);
    emit("update:modelValue", false);
  } finally { if (current === session) busy.value = false; }
}
</script>

<style scoped>
.itinerary-reorder__day.is-drop-target,
.itinerary-reorder__item.is-drop-target {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary);
}

.itinerary-reorder__group.is-drop-target {
  box-shadow: 0 0 0 1px var(--el-color-primary);
}

.itinerary-reorder__item.is-invalid {
  border-color: var(--el-color-danger);
}

/* 操作按钮行内不要 Element Plus 相邻按钮的默认左外边距 */
.itinerary-reorder__actions .el-button + .el-button {
  margin-left: 0;
}

</style>
