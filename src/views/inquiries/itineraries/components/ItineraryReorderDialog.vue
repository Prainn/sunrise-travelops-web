<template>
  <AppDialog
    :model-value="modelValue"
    size="full"
    :append-to-body="recovery"
    :title="$t(recovery ? 'itineraryWorkspace.deletedTitle' : 'itineraryWorkspace.reorderTitle')"
    @close="emit('update:modelValue', false)"
  >
    <template #header>
      <div class="flex items-center gap-4 flex-wrap">
        <strong>{{ $t(recovery ? 'itineraryWorkspace.deletedTitle' : 'itineraryWorkspace.reorderTitle') }}</strong>
        <el-button v-if="!recovery" :disabled="!recycledDays.length" @click="isRecycleVisible = true">
          {{ $t('itineraryWorkspace.deletedDays') }} ({{ recycledDays.length }})
        </el-button>
      </div>
    </template>
    <p class="m-0 mb-3 text-[13px] text-muted">
      {{ $t(recovery ? "itineraryWorkspace.deletedHint" : readonly ? "itineraryWorkspace.reorderReadonly" : transfer ? "itineraryWorkspace.transfer.hint" : "itineraryWorkspace.reorderHint") }}
    </p>
    <div class="itinerary-reorder__board flex gap-3 overflow-x-auto pb-3" role="list">
      <section
        v-for="(day, dayIndex) in orderedDays"
        :key="day.id"
        role="listitem"
        class="itinerary-reorder__day w-[240px] shrink-0 flex flex-col gap-2 p-3 rounded-[var(--card-radius)] surface-muted [border:1px_solid_var(--divider-color)]"
        :class="{ 'is-drop-target': dropDayId === day.id }"
        @dragover="allowDayDrop($event, day.id)"
        @dragleave="dropDayId = ''"
        @drop="dropDay($event, dayIndex)"
      >
        <header
          class="flex items-start justify-between gap-2"
          :draggable="!readonly && !recovery"
          :class="{ 'cursor-grab': !readonly && !recovery }"
          @dragstart="startDayDrag($event, day.id)"
          @dragend="endDrag"
        >
          <div class="min-w-0">
            <h4 class="m-0 text-[14px] text-strong font-600">
              D{{ recovery ? day.dayNumber : dayIndex + 1 }}
              <span v-if="recovery ? day.date : startDate" class="ml-1 font-400 text-muted">{{ recovery ? day.date : addDays(startDate!, dayIndex) }}</span>
            </h4>
            <p class="m-0 mt-1 text-[13px] [overflow-wrap:anywhere]">
              {{ day.title }}
            </p>
          </div>
          <el-button
            v-if="recovery && !readonly"
            link
            type="primary"
            :disabled="restoreDisabled"
            @click="emit('restore', day.id)"
          >
            {{ $t('itineraryWorkspace.restoreDay') }}
          </el-button>
          <div v-if="!readonly && !recovery" class="flex shrink-0">
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
              :disabled="orderedDays.length <= 1"
              :aria-label="$t('itineraryWorkspace.deleteDay')"
              :title="$t('itineraryWorkspace.deleteDay')"
              @click="deleteDay(day.id)"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
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
            <span v-if="group.scope">· {{ group.scope }}</span>
          </h5>
          <p v-if="!groupItems(day.id, group).length" class="m-0 text-[12px] text-muted">
            {{ $t("itineraryWorkspace.notArranged") }}
          </p>
          <div
            v-for="(item, itemIndex) in groupItems(day.id, group)"
            :key="item.id"
            class="itinerary-reorder__item flex items-center gap-1 px-2 py-[6px] rounded-[6px] bg-surface [border:1px_solid_var(--divider-color)] text-[13px]"
            :class="{
              'cursor-grab': canSort(group) || canMove(group, item),
              'is-drop-target': dropItemId === item.id,
              'is-invalid': invalidItemIds.has(item.id),
            }"
            :draggable="canSort(group) || canMove(group, item)"
            @dragstart.stop="startItemDrag($event, day.id, item.id, group.key)"
            @dragend.stop="endDrag"
            @dragover="allowItemDrop($event, day.id, item.id, group)"
            @drop="dropItem($event, day.id, group, itemIndex)"
          >
            <span class="min-w-0 flex-1 [overflow-wrap:anywhere]">
              <el-tag
                v-if="board.copies[item.id]"
                size="small"
                type="warning"
                class="mr-1"
              >
                {{ $t("itineraryWorkspace.transfer.copyTag") }}
              </el-tag>
              {{ item.label }}
              <small v-if="item.detail" class="block text-muted">{{ item.detail }}</small>
            </span>
            <el-button
              v-if="board.copies[item.id] && canMove(group, item)"
              link
              type="danger"
              :aria-label="$t('itineraryWorkspace.transfer.removeCopy')"
              :title="$t('itineraryWorkspace.transfer.removeCopy')"
              @click="removeCopy(item.id)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
            <el-button
              v-else-if="canMove(group, item)"
              link
              class="itinerary-reorder__copy"
              :aria-label="$t('itineraryWorkspace.transfer.copy')"
              :title="$t('itineraryWorkspace.transfer.copy')"
              @click="copyItem(day.id, group.key, item.id)"
            >
              <el-icon><CopyDocument /></el-icon>
            </el-button>
            <template v-if="canSort(group)">
              <el-button
                link
                :disabled="itemIndex === 0"
                :aria-label="$t('itineraryWorkspace.moveUp')"
                :title="$t('itineraryWorkspace.moveUp')"
                @click="moveItem(day.id, group, itemIndex, -1)"
              >
                <el-icon><ArrowUp /></el-icon>
              </el-button>
              <el-button
                link
                :disabled="itemIndex === groupItems(day.id, group).length - 1"
                :aria-label="$t('itineraryWorkspace.moveDown')"
                :title="$t('itineraryWorkspace.moveDown')"
                @click="moveItem(day.id, group, itemIndex, 1)"
              >
                <el-icon><ArrowDown /></el-icon>
              </el-button>
            </template>
          </div>
        </div>
      </section>
    </div>
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
      <el-button @click="emit('update:modelValue', false)">
        {{ $t(readonly || recovery ? "common.close" : "common.cancel") }}
      </el-button>
      <el-button
        v-if="!readonly && !recovery"
        type="primary"
        :disabled="!isChanged || blockingIssues.length > 0"
        @click="apply"
      >
        {{ $t("itineraryWorkspace.applyOrder") }}
      </el-button>
    </template>
  </AppDialog>
  <ItineraryReorderDialog
    v-if="!recovery"
    v-model="isRecycleVisible"
    :days="recycledDays"
    :readonly="readonly"
    recovery
    :restore-disabled="dayIds.length >= 365"
    @restore="restoreDay"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Close, CopyDocument, Delete } from "@element-plus/icons-vue";
import { ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import { addDays } from "@/utils";
import {
  boardPlacements,
  boardTransferIssues,
  copyBoardItem,
  planBoardTransfer,
  removeBoardCopy,
  restoredDayIndex,
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
    /** 开启跨天移动与复制 */
    transfer?: boolean;
    /** 预演本次调整，返回需核对事项；不修改草稿 */
    validate?: (change: DayOrderChange) => DayOrderIssue[];
  }>(),
  { readonly: false, startDate: null, transfer: false, validate: undefined, deletedDays: () => [], recovery: false, restoreDisabled: false },
);
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  apply: [change: DayOrderChange];
  restore: [dayId: string];
}>();

const { t } = useI18n();
const isRecycleVisible = ref(false);
const recycledDays = ref<ReorderBoardDay[]>([]);
const dayIds = ref<string[]>([]);
const board = ref<BoardState>({ placements: {}, copies: {} });
const initialPlacements = ref("");
const dragging = ref<{ dayId: string; itemId?: string; groupKey?: string }>();
const dropDayId = ref("");
const dropItemId = ref("");
const dropGroupKey = ref("");

const allDays = computed(() => [...props.days, ...props.deletedDays]);
const orderedDays = computed(() => dayIds.value.map((id) => allDays.value.find((day) => day.id === id)!).filter(Boolean));
const canTransfer = computed(() => props.transfer && !props.readonly && !props.recovery);
/** 看板条目（含临时副本：内容同原卡片，仅 ID 不同） */
const boardItems = computed(() => {
  const items = new Map(allDays.value.flatMap((day) => day.groups.flatMap((group) => group.items.map((item) => [item.id, item] as const))));
  Object.entries(board.value.copies).forEach(([id, copy]) => {
    const source = items.get(copy.sourceId);
    if (source) items.set(id, { ...source, id });
  });
  return items;
});
const boardItem = (id: string) => boardItems.value.get(id);
const change = computed<DayOrderChange>(() => ({
  dayIds: dayIds.value,
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
    JSON.stringify(board.value.placements) !== initialPlacements.value,
);
const issues = computed<DayOrderIssue[]>(() =>
  isChanged.value
    ? [
      ...(props.transfer ? boardTransferIssues(board.value, orderedDays.value, boardItem) : []),
      ...(props.validate ? props.validate(change.value) : []),
    ]
    : [],
);
const blockingIssues = computed(() => issues.value.filter((issue) => issue.blocking));
const hintIssues = computed(() => issues.value.filter((issue) => !issue.blocking));
const invalidItemIds = computed(() => new Set(blockingIssues.value.flatMap((issue) => (issue.itemId ? [issue.itemId] : []))));

watch(
  () => props.modelValue,
  (visible) => {
    isRecycleVisible.value = false;
    if (!visible) return;
    recycledDays.value = props.deletedDays.map((day) => ({ ...day }));
    dayIds.value = props.days.map((day) => day.id);
    board.value = { placements: boardPlacements(allDays.value), copies: {} };
    initialPlacements.value = JSON.stringify(board.value.placements);
  },
  { immediate: true },
);

function canSort(group: ReorderBoardGroup) {
  return Boolean(group.sortable && !props.readonly && !props.recovery);
}

function canMove(group: ReorderBoardGroup, item: ReorderBoardItem) {
  return Boolean(canTransfer.value && group.transferable && !item.placeholder);
}

function groupItems(dayId: string, group: ReorderBoardGroup) {
  return (board.value.placements[dayId]?.[group.key] ?? []).flatMap((id) => boardItem(id) ?? []);
}

async function deleteDay(id: string) {
  if (props.readonly || props.recovery || dayIds.value.length <= 1) return;
  const index = dayIds.value.indexOf(id);
  if (index < 0) return;
  try {
    await ElMessageBox.confirm(t("itineraryWorkspace.deleteDayConfirm", { day: index + 1 }), t("itineraryWorkspace.deleteDay"), {
      type: "warning", confirmButtonText: t("common.confirm"), cancelButtonText: t("common.cancel"),
    });
  } catch { return; }
  const day = orderedDays.value[index];
  if (!day || day.id !== id) return;
  // 未安置的临时副本不随整天进入回收；回收展示当前看板排布。
  Object.entries(board.value.copies).forEach(([copyId, copy]) => {
    if (copy.dayId === id && Object.values(board.value.placements[id] ?? {}).some((ids) => ids.includes(copyId)))
      board.value = removeBoardCopy(board.value, copyId);
  });
  const groups = day.groups.map((group) => ({ ...group, items: groupItems(id, group) }));
  recycledDays.value.push({ ...day, groups, dayNumber: index + 1, date: props.startDate ? addDays(props.startDate, index) : null });
  dayIds.value.splice(index, 1);
}

function restoreDay(id: string) {
  if (props.readonly || dayIds.value.length >= 365) return;
  const index = recycledDays.value.findIndex((day) => day.id === id);
  const day = recycledDays.value[index];
  if (!day) return;
  const dates = dayIds.value.map((_, dayIndex) => props.startDate ? addDays(props.startDate, dayIndex) : null);
  const target = restoredDayIndex(dates, day.date ?? null, day.dayNumber!);
  dayIds.value.splice(target, 0, id);
  recycledDays.value.splice(index, 1);
  if (!recycledDays.value.length) isRecycleVisible.value = false;
}

function moveDay(index: number, direction: number) {
  const next = [...dayIds.value];
  const [id] = next.splice(index, 1);
  if (!id) return;
  next.splice(index + direction, 0, id);
  dayIds.value = next;
}

function moveItem(dayId: string, group: ReorderBoardGroup, index: number, direction: number) {
  const next = groupItems(dayId, group).map((item) => item.id);
  const [id] = next.splice(index, 1);
  if (!id) return;
  next.splice(index + direction, 0, id);
  board.value = {
    ...board.value,
    placements: { ...board.value.placements, [dayId]: { ...board.value.placements[dayId], [group.key]: next } },
  };
}

function copyItem(dayId: string, groupKey: string, itemId: string) {
  if (!canTransfer.value) return;
  board.value = copyBoardItem(board.value, dayId, groupKey, itemId, crypto.randomUUID());
}

function removeCopy(id: string) {
  board.value = removeBoardCopy(board.value, id);
}

/** 跨天放入；同 slot 已有安排时确认替换，取消则保持拖动前的完整排布。 */
async function transferItem(dayId: string, group: ReorderBoardGroup, index?: number) {
  const source = dragging.value;
  endDrag();
  if (!source?.itemId || !canTransfer.value || !group.transferable || source.groupKey !== group.key) return;
  const plan = planBoardTransfer(board.value, group, { dayId: source.dayId, itemId: source.itemId }, { dayId, index }, boardItem);
  if (!plan) return;
  if (plan.replaced.length) {
    const before = board.value;
    try {
      await ElMessageBox.confirm(
        t("itineraryWorkspace.transfer.replaceConfirm", {
          day: dayIds.value.indexOf(dayId) + 1,
          name: plan.replaced.map((id) => boardItem(id)?.label ?? "").join("、"),
          next: boardItem(source.itemId)?.label ?? "",
        }),
        t("itineraryWorkspace.transfer.replaceTitle"),
        { type: "warning", confirmButtonText: t("itineraryWorkspace.transfer.replace"), cancelButtonText: t("common.cancel") },
      );
    } catch { return; }
    if (!props.modelValue || board.value !== before) return;
  }
  board.value = plan.next;
}

function startDayDrag(event: DragEvent, dayId: string) {
  if (props.readonly || props.recovery) return;
  dragging.value = { dayId };
  event.dataTransfer?.setData("text/plain", dayId);
}

function startItemDrag(event: DragEvent, dayId: string, itemId: string, groupKey: string) {
  dragging.value = { dayId, itemId, groupKey };
  event.dataTransfer?.setData("text/plain", itemId);
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

function dropItem(event: DragEvent, dayId: string, group: ReorderBoardGroup, targetIndex: number) {
  const source = dragging.value;
  if (isTransferTarget(dayId, group)) {
    event.preventDefault();
    event.stopPropagation();
    void transferItem(dayId, group, targetIndex);
    return;
  }
  if (!source?.itemId || source.dayId !== dayId || source.groupKey !== group.key || !canSort(group)) return;
  event.preventDefault();
  event.stopPropagation();
  const index = groupItems(dayId, group).findIndex((item) => item.id === source.itemId);
  if (index >= 0 && index !== targetIndex) moveItem(dayId, group, index, targetIndex - index);
  endDrag();
}

function endDrag() {
  dragging.value = undefined;
  dropDayId.value = "";
  dropItemId.value = "";
  dropGroupKey.value = "";
}

function apply() {
  if (props.readonly || !isChanged.value || blockingIssues.value.length) return;
  // 排布嵌套在响应式状态中，按纯数据复制后交给页面，避免页面写回时与看板状态共享引用。
  emit("apply", JSON.parse(JSON.stringify(change.value)) as DayOrderChange);
  emit("update:modelValue", false);
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

/* 复制按钮悬浮或键盘聚焦卡片时显示 */
.itinerary-reorder__copy {
  opacity: 0;
}

.itinerary-reorder__item:hover .itinerary-reorder__copy,
.itinerary-reorder__item:focus-within .itinerary-reorder__copy {
  opacity: 1;
}
</style>
