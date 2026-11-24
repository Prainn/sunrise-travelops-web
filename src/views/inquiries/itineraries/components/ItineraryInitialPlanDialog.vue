<template>
  <AppDialog
    :model-value="true"
    :title="$t('itineraryWorkspace.initialPlanningTitle')"
    size="full"
    :close-on-press-escape="false"
    :close-on-click-modal="false"
    :busy="saving"
    @close="emit('cancel')"
  >
    <p class="m-0 mb-3 text-[12px] text-muted">
      {{ $t("itineraryWorkspace.initialPlanningHint") }}
    </p>
    <div class="flex items-start gap-3 overflow-x-auto pb-3" role="list" :inert="saving">
      <section
        v-for="(day, index) in days"
        :key="day.id"
        role="listitem"
        class="itinerary-initial-plan__day w-[240px] shrink-0 rounded-[var(--card-radius)] p-3 surface-muted [border:1px_solid_var(--divider-color)]"
        :class="{ 'is-drop-target': targetDayId === day.id }"
        @dragover="allowDayDrop($event, day.id)"
        @dragleave.self="targetDayId = ''"
        @drop="dropDay($event, index)"
      >
        <header
          class="mb-2 flex items-center justify-between gap-2"
          :class="{ 'cursor-grab': !saving && days.length > 1 }"
          :draggable="!saving && days.length > 1"
          @dragstart="startDayDrag($event, day.id)"
          @dragend="clearDrag"
        >
          <h3 class="m-0 text-[14px] font-600 text-strong">
            D{{ day.dayNumber }}
            <span v-if="day.date" class="ml-1 font-400 text-muted">{{ day.date }}</span>
          </h3>
          <div class="flex shrink-0">
            <el-button
              link
              :icon="ArrowLeft"
              :disabled="saving || index === 0"
              :aria-label="$t('itineraryWorkspace.moveEarlier')"
              :title="$t('itineraryWorkspace.moveEarlier')"
              @click="emit('move-day', index, index - 1)"
            />
            <el-button
              link
              :icon="ArrowRight"
              :disabled="saving || index === days.length - 1"
              :aria-label="$t('itineraryWorkspace.moveLater')"
              :title="$t('itineraryWorkspace.moveLater')"
              @click="emit('move-day', index, index + 1)"
            />
          </div>
        </header>
        <el-form
          :model="day"
          label-position="top"
          size="small"
          :aria-label="$t('itineraryWorkspace.dayRouteForm', { day: day.dayNumber })"
          @submit.prevent
        >
          <ItineraryDayRouteFields
            :day="day"
            :destinations="destinations"
            :is-last="index === days.length - 1"
            :editable="!saving"
            initial-planning
            @update-field="(field, value) => emit('update-field', index, field, value)"
            @update-via="emit('update-via', index, $event)"
          />
        </el-form>
      </section>
    </div>
    <template #footer>
      <span class="mr-auto text-[13px] text-muted" role="status">
        {{ $t("itineraryWorkspace.planningProgress", { complete: completedDays, total: days.length }) }}
      </span>
      <el-button
        type="primary"
        :disabled="completedDays !== days.length"
        :loading="saving"
        @click="emit('save')"
      >
        {{ $t("itineraryWorkspace.saveAndManage") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ArrowLeft, ArrowRight } from "@element-plus/icons-vue";
import AppDialog from "@/components/AppDialog/index.vue";
import type { ItineraryDayRecord, ItineraryEditableDayField } from "@/types/itinerary";
import ItineraryDayRouteFields from "./ItineraryDayRouteFields.vue";

const props = defineProps<{
  days: ItineraryDayRecord[];
  destinations: string[];
  completedDays: number;
  saving: boolean;
}>();
const emit = defineEmits<{
  "move-day": [from: number, to: number];
  "update-field": [index: number, field: ItineraryEditableDayField, value: string | null];
  "update-via": [index: number, cities: string[]];
  cancel: [];
  save: [];
}>();
const draggedDayId = ref("");
const targetDayId = ref("");

function startDayDrag(event: DragEvent, dayId: string) {
  draggedDayId.value = dayId;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-itinerary-day", dayId);
  }
}
function allowDayDrop(event: DragEvent, dayId: string) {
  if (!draggedDayId.value || props.saving) return;
  event.preventDefault();
  targetDayId.value = draggedDayId.value === dayId ? "" : dayId;
}
function dropDay(event: DragEvent, index: number) {
  if (!draggedDayId.value || props.saving) return;
  event.preventDefault();
  const from = props.days.findIndex(day => day.id === draggedDayId.value);
  if (from >= 0 && from !== index) emit("move-day", from, index);
  clearDrag();
}
function clearDrag() {
  draggedDayId.value = "";
  targetDayId.value = "";
}
</script>

<style scoped>
.itinerary-initial-plan__day.is-drop-target {
  border-color: var(--el-color-primary);
}
</style>
