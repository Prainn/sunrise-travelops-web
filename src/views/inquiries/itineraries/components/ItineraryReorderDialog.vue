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
      {{ $t(recovery ? "itineraryWorkspace.deletedHint" : readonly ? "itineraryWorkspace.reorderReadonly" : "itineraryWorkspace.reorderHint") }}
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
        <div v-for="group in day.groups" :key="group.key" class="flex flex-col gap-1">
          <h5 class="m-0 text-[12px] text-muted font-500">
            {{ group.label }}
            <span v-if="group.scope">· {{ group.scope }}</span>
          </h5>
          <p v-if="!group.items.length" class="m-0 text-[12px] text-muted">
            {{ $t("itineraryWorkspace.notArranged") }}
          </p>
          <div
            v-for="(item, itemIndex) in sortedItems(day.id, group)"
            :key="item.id"
            class="itinerary-reorder__item flex items-center gap-1 px-2 py-[6px] rounded-[6px] bg-surface [border:1px_solid_var(--divider-color)] text-[13px]"
            :class="{ 'cursor-grab': canSort(group), 'is-drop-target': dropItemId === item.id }"
            :draggable="canSort(group)"
            @dragstart.stop="startItemDrag($event, day.id, item.id)"
            @dragend.stop="endDrag"
            @dragover.stop="allowItemDrop($event, day.id, item.id)"
            @drop.stop="dropItem($event, day.id, group, itemIndex)"
          >
            <span class="min-w-0 flex-1 [overflow-wrap:anywhere]">
              {{ item.label }}
              <small v-if="item.detail" class="block text-muted">{{ item.detail }}</small>
            </span>
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
                :disabled="itemIndex === group.items.length - 1"
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
      v-if="!readonly && !recovery && issues.length"
      type="warning"
      :closable="false"
      :title="$t('itineraryWorkspace.issuesTitle')"
      class="mt-3!"
    >
      <ul class="m-0 pl-4">
        <li v-for="(issue, index) in issues" :key="index">
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
        :disabled="!isChanged"
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
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Close } from "@element-plus/icons-vue";
import { ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import { addDays } from "@/utils";
import {
  orderById,
  restoredDayIndex,
  type DayOrderChange,
  type DayOrderIssue,
  type ReorderBoardDay,
  type ReorderBoardGroup,
} from "../reorder-board";

/**
 * 顺序调整看板：打开时建立临时顺序副本，拖动和按钮只改副本；取消不改变草稿，应用后由页面写回并标记未保存。
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
    /** 预演本次调整，返回需核对事项；不修改草稿 */
    validate?: (change: DayOrderChange) => DayOrderIssue[];
  }>(),
  { readonly: false, startDate: null, validate: undefined, deletedDays: () => [], recovery: false, restoreDisabled: false },
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
const itemIds = ref<Record<string, string[]>>({});
const dragging = ref<{ dayId: string; itemId?: string }>();
const dropDayId = ref("");
const dropItemId = ref("");

const allDays = computed(() => [...props.days, ...props.deletedDays]);
const orderedDays = computed(() => dayIds.value.map((id) => allDays.value.find((day) => day.id === id)!).filter(Boolean));
const change = computed<DayOrderChange>(() => ({
  dayIds: dayIds.value,
  itemIds: itemIds.value,
  deletedDays: recycledDays.value.map((day) => ({ id: day.id, dayNumber: day.dayNumber!, date: day.date ?? null })),
}));
const isChanged = computed(
  () =>
    dayIds.value.length !== props.days.length ||
    recycledDays.value.some((day, index) => day.id !== props.deletedDays[index]?.id || day.dayNumber !== props.deletedDays[index]?.dayNumber || day.date !== props.deletedDays[index]?.date) ||
    dayIds.value.some((id, index) => id !== props.days[index]?.id) ||
    props.days.some((day) =>
      day.groups.some(
        (group) => group.sortable && group.items.some((item, index) => item.id !== itemIds.value[day.id]?.[index]),
      ),
    ),
);
const issues = computed(() => (isChanged.value && props.validate ? props.validate(change.value) : []));

watch(
  () => props.modelValue,
  (visible) => {
    isRecycleVisible.value = false;
    if (!visible) return;
    recycledDays.value = props.deletedDays.map((day) => ({ ...day }));
    dayIds.value = props.days.map((day) => day.id);
    itemIds.value = Object.fromEntries(
      allDays.value.map((day) => [day.id, day.groups.find((group) => group.sortable)?.items.map((item) => item.id) ?? []]),
    );
  },
  { immediate: true },
);

function canSort(group: ReorderBoardGroup) {
  return Boolean(group.sortable && !props.readonly && !props.recovery);
}

function sortedItems(dayId: string, group: ReorderBoardGroup) {
  return group.sortable ? orderById(group.items, itemIds.value[dayId] ?? []) : group.items;
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
  recycledDays.value.push({ ...day, dayNumber: index + 1, date: props.startDate ? addDays(props.startDate, index) : null });
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
  const next = sortedItems(dayId, group).map((item) => item.id);
  const [id] = next.splice(index, 1);
  if (!id) return;
  next.splice(index + direction, 0, id);
  itemIds.value = { ...itemIds.value, [dayId]: next };
}

function startDayDrag(event: DragEvent, dayId: string) {
  if (props.readonly || props.recovery) return;
  dragging.value = { dayId };
  event.dataTransfer?.setData("text/plain", dayId);
}

function startItemDrag(event: DragEvent, dayId: string, itemId: string) {
  dragging.value = { dayId, itemId };
  event.dataTransfer?.setData("text/plain", itemId);
}

function allowDayDrop(event: DragEvent, dayId: string) {
  if (!dragging.value || dragging.value.itemId) return;
  event.preventDefault();
  dropDayId.value = dayId;
}

function allowItemDrop(event: DragEvent, dayId: string, itemId: string) {
  // 资源只在当天内调整，不支持跨天拖动。
  if (!dragging.value?.itemId || dragging.value.dayId !== dayId) return;
  event.preventDefault();
  dropItemId.value = itemId;
}

function dropDay(event: DragEvent, targetIndex: number) {
  const source = dragging.value;
  if (!source || source.itemId) return;
  event.preventDefault();
  const index = dayIds.value.indexOf(source.dayId);
  if (index >= 0 && index !== targetIndex) moveDay(index, targetIndex - index);
  endDrag();
}

function dropItem(event: DragEvent, dayId: string, group: ReorderBoardGroup, targetIndex: number) {
  const source = dragging.value;
  if (!source?.itemId || source.dayId !== dayId) return;
  event.preventDefault();
  const index = sortedItems(dayId, group).findIndex((item) => item.id === source.itemId);
  if (index >= 0 && index !== targetIndex) moveItem(dayId, group, index, targetIndex - index);
  endDrag();
}

function endDrag() {
  dragging.value = undefined;
  dropDayId.value = "";
  dropItemId.value = "";
}

function apply() {
  if (props.readonly || !isChanged.value) return;
  emit("apply", { ...change.value, dayIds: [...dayIds.value], itemIds: { ...itemIds.value } });
  emit("update:modelValue", false);
}
</script>

<style scoped>
.itinerary-reorder__day.is-drop-target,
.itinerary-reorder__item.is-drop-target {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary);
}
</style>
