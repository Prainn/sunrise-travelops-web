<template>
  <el-card
    :id="`day-${day.id}`"
    class="day-card"
    shadow="never"
  >
    <template #header>
      <div class="day-card__header">
        <div class="day-card__identity">
          <span class="day-card__number">D{{ day.dayNumber }}</span>
          <div>
            <div class="day-card__route">
              {{ day.departure || $t("itinerary.departure") }}
              <el-icon><Right /></el-icon>
              {{ day.destination || $t("itinerary.destination") }}
            </div>
            <span class="day-card__date">{{ day.date }}</span>
          </div>
        </div>
        <div
          v-if="contentEditable"
          class="day-card__actions"
        >
          <el-button
            link
            :disabled="isFirst"
            @click="emit('move', -1)"
          >
            <el-icon><ArrowUp /></el-icon>
          </el-button>
          <el-button
            link
            :disabled="isLast"
            @click="emit('move', 1)"
          >
            <el-icon><ArrowDown /></el-icon>
          </el-button>
          <el-button
            link
            @click="emit('duplicate')"
          >
            {{ $t("itinerary.copyDay") }}
          </el-button>
          <el-button
            type="danger"
            link
            @click="emit('remove')"
          >
            {{ $t("common.delete") }}
          </el-button>
        </div>
      </div>
    </template>

    <ItineraryDayForm
      :is-last="isLast"
      :day="day"
      :destinations="destinations"
      :editable="contentEditable"
      @update-field="updateField"
    />

    <div class="day-card__resources-header">
      <strong>{{ $t("itinerary.dailyResources") }}</strong>
      <el-button
        v-if="contentEditable"
        type="primary"
        plain
        @click="emit('add-item')"
      >
        {{ $t("itinerary.addResource") }}
      </el-button>
    </div>
    <div class="day-card__meals">
      <el-tag
        :type="breakfastStatus === 'included' ? 'success' : breakfastStatus === 'excluded' ? 'info' : 'warning'"
        :title="$t(breakfastStatus === 'pending' ? 'itinerary.breakfastPending' : breakfastStatus === 'mixed' ? 'itinerary.breakfastMixed' : breakfastStatus === 'included' ? 'itinerary.breakfastIncluded' : 'itinerary.breakfastExcluded')"
      >
        {{ $t(breakfastStatus === 'pending' ? 'itinerary.breakfastPending' : breakfastStatus === 'mixed' ? 'itinerary.breakfastMixed' : breakfastStatus === 'included' ? 'itinerary.breakfastIncluded' : 'itinerary.breakfastExcluded') }}
      </el-tag>
      <div
        v-for="slot in ['lunch', 'dinner'] as const"
        :key="slot"
        class="day-card__meal"
      >
        <el-checkbox
          :model-value="day.meals[slot]"
          :disabled="!contentEditable"
          @update:model-value="emit('update-meal', slot, Boolean($event))"
        >
          {{ $t(`itinerary.meals.${slot}`) }}
        </el-checkbox>
        <el-button
          v-if="day.meals[slot]"
          :disabled="!contentEditable"
          link
          type="primary"
          @click="emit('select-meal', slot)"
        >
          {{ mealLabel(slot) }}
        </el-button>
      </div>
    </div>
    <el-table
      v-if="day.items.length"
      :data="day.items"
      border
      size="small"
    >
      <el-table-column
        :label="$t('itinerary.resource')"
        min-width="120"
      >
        <template #default="scope">
          <div class="day-card__resource-name">
            <el-tag
              v-if="scope.row.mealSlot"
              size="small"
            >
              {{ $t(`itinerary.meals.${scope.row.mealSlot}`) }}
            </el-tag>
            {{ scope.row.resourceName }}
          </div>
          <small>{{ scope.row.priceName }}</small>
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('itinerary.quantity')"
        width="160"
        align="right"
      >
        <template #default="scope">
          <el-input-number
            v-if="contentEditable"
            class="day-card__quantity"
            :model-value="scope.row.quantity"
            :min="1"
            :precision="0"
            controls-position="right"
            @change="emit('update-item-quantity', scope.$index, Number($event ?? 1))"
          />
          <template v-else>
            {{ scope.row.quantity }}
          </template>
          <small>{{ resourceUnitName(scope.row.unit) }}</small>
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('itinerary.unitCost')"
        width="190"
        align="right"
      >
        <template #default="scope">
          ¥{{ formatMoney(scope.row.unitCost) }}
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('itinerary.totalCost')"
        width="100"
        align="right"
      >
        <template #default="scope">
          ¥{{ formatMoney(scope.row.totalCost) }}
        </template>
      </el-table-column>
      <el-table-column
        v-if="contentEditable"
        :label="$t('common.actions')"
        width="62"
        align="center"
      >
        <template #default="scope">
          <el-button
            type="danger"
            link
            @click="emit('remove-item', scope.$index)"
          >
            {{ $t("common.delete") }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty
      v-else
      :description="$t('itinerary.noDailyResources')"
      :image-size="52"
    />
    <div class="day-card__subtotal">
      <span>{{ $t("itinerary.dayCost") }} ¥{{ formatMoney(dayCost) }}</span>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowDown, ArrowUp, Right } from "@element-plus/icons-vue";
import type { ItineraryDayRecord, MealSlot } from "@/types/itinerary";
import { formatMoney, sumMoney } from "@/utils";
import { getResourceUnitName } from "@/utils/resource-unit";
import ItineraryDayForm from "./ItineraryDayForm.vue";

type EditableDayField = "departure" | "destination" | "overnightDestination" | "transport" | "description";
const props = defineProps<{
  day: ItineraryDayRecord;
  breakfastStatus: "included" | "excluded" | "mixed" | "pending";
  destinations: string[];
  contentEditable: boolean;
  isFirst: boolean;
  isLast: boolean;
}>();
const emit = defineEmits<{
  "update-field": [field: EditableDayField, value: string | null];
  "update-meal": [slot: MealSlot, included: boolean];
  "select-meal": [slot: MealSlot];
  "add-item": [];
  "remove-item": [index: number];
  "update-item-quantity": [index: number, quantity: number];
  duplicate: [];
  remove: [];
  move: [offset: number];
}>();
const dayCost = computed(() => sumMoney(props.day.items.map((item) => item.totalCost)));
const { locale, t } = useI18n();

function mealLabel(slot: MealSlot) {
  const item = props.day.items.find((item) => item.type === "restaurant" && item.mealSlot === slot);
  return item ? `${item.resourceName} · ${item.priceName}` : t("itinerary.selectMealResource");
}
function updateField(field: EditableDayField, value: string | null) { emit("update-field", field, value); }
function resourceUnitName(code: string) { return getResourceUnitName(code, locale.value); }
</script>

<style scoped lang="scss">
.day-card__meals { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-bottom: 12px; }
.day-card__meal { display: flex; align-items: center; gap: 8px; }
.day-card { scroll-margin-top: 270px; border-radius: 10px; }
.day-card + .day-card__meals { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-bottom: 12px; }
.day-card__meal { display: flex; align-items: center; gap: 8px; }
.day-card { margin-top: 16px; }
.day-card__header, .day-card__identity, .day-card__actions, .day-card__resources-header, .day-card__subtotal { display: flex; align-items: center; }
.day-card__header, .day-card__resources-header, .day-card__subtotal { justify-content: space-between; }
.day-card__identity { gap: 12px; }
.day-card__number { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 10px; background: var(--el-color-primary); color: #fff; font-weight: 700; }
.day-card__route { display: flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 600; }
.day-card__date, small { color: var(--el-text-color-secondary); font-size: 14px; }
.day-card__quantity { width: 72px; margin-right: 4px; }
.day-card__resources-header { margin: 20px 0 10px; }
.day-card__resource-name { font-weight: 500; }
.day-card__subtotal { margin-top: 12px; color: var(--el-text-color-secondary); }
.day-card__subtotal strong { color: var(--el-color-primary); }
</style>
