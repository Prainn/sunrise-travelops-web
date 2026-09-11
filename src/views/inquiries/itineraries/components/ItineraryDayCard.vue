<template>
  <el-card
    :id="`day-${day.id}`"
    class="day-card mt-[16px] scroll-mt-[270px] rounded-[10px]"
    :class="{ 'is-collapsed': !expanded }"
    shadow="never"
  >
    <template #header>
      <div class="day-card__header flex items-center justify-between">
        <div class="day-card__identity flex items-center gap-[12px]">
          <span class="day-card__number grid w-[44px] h-[44px] place-items-center rounded-[10px] [background:var(--el-color-primary)] [color:#fff] font-bold">D{{ day.dayNumber }}</span>
          <div>
            <div class="day-card__route flex items-center gap-[6px] text-[16px] font-semibold">
              {{ day.departure || $t("itinerary.departure") }}
              <el-icon><Right /></el-icon>
              {{ day.destination || $t("itinerary.destination") }}
            </div>
            <span class="day-card__date text-[14px] text-[var(--el-text-color-secondary)]">{{ day.date }}</span>
          </div>
        </div>
        <div class="day-card__actions flex items-center">
          <el-button
            link
            :aria-expanded="expanded"
            :aria-controls="`day-body-${day.id}`"
            @click="expanded = !expanded"
          >
            {{ $t(expanded ? 'itinerary.collapseDay' : 'itinerary.expandDay') }}
          </el-button>
          <el-button
            v-if="contentEditable"
            link
            @click="emit('duplicate')"
          >
            {{ $t("itinerary.copyDay") }}
          </el-button>
          <el-button
            v-if="contentEditable"
            type="danger"
            link
            @click="emit('remove')"
          >
            {{ $t("common.delete") }}
          </el-button>
        </div>
      </div>
    </template>

    <div
      v-show="expanded"
      :id="`day-body-${day.id}`"
    >
      <ItineraryDayForm
        :allow-custom-destination="isLast && day.dayNumber >= plannedDays"
        :day="day"
        :destinations="destinations"
        :editable="contentEditable"
        @update-field="updateField"
      />

      <div class="day-card__resources-header m-[20px_0_10px] flex items-center justify-between">
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
      <div class="day-card__meals flex flex-wrap items-center gap-[16px] mb-[12px]">
        <el-tag
          :type="breakfastStatus === 'included' ? 'success' : breakfastStatus === 'excluded' ? 'info' : 'warning'"
          :title="$t(breakfastStatus === 'pending' ? 'itinerary.breakfastPending' : breakfastStatus === 'included' ? 'itinerary.breakfastIncluded' : 'itinerary.breakfastExcluded')"
        >
          {{ $t(breakfastStatus === 'pending' ? 'itinerary.breakfastPending' : breakfastStatus === 'included' ? 'itinerary.breakfastIncluded' : 'itinerary.breakfastExcluded') }}
        </el-tag>
        <div
          v-for="slot in ['lunch', 'dinner'] as const"
          :key="slot"
          class="day-card__meal flex items-center gap-[8px]"
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
            <div class="day-card__resource-name font-medium">
              <el-tag
                v-if="scope.row.mealSlot"
                size="small"
              >
                {{ $t(`itinerary.meals.${scope.row.mealSlot}`) }}
              </el-tag>
              {{ scope.row.resourceName }}
            </div>
            <small class="text-[14px] text-[var(--el-text-color-secondary)]">{{ scope.row.priceName }}</small>
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
              class="day-card__quantity w-[72px] mr-[4px]"
              :model-value="scope.row.quantity"
              :min="1"
              :precision="0"
              controls-position="right"
              @change="emit('update-item-quantity', scope.$index, Number($event ?? 1))"
            />
            <template v-else>
              {{ scope.row.quantity }}
            </template>
            <small class="text-[14px] text-[var(--el-text-color-secondary)]">{{ resourceUnitName(scope.row.unit) }}</small>
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
      <div class="day-card__subtotal mt-[12px] flex items-center justify-between text-[var(--el-text-color-secondary)]">
        <span>{{ $t("itinerary.dayCost") }} ¥{{ formatMoney(dayCost) }}</span>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Right } from "@element-plus/icons-vue";
import type { ItineraryDayRecord, MealSlot } from "@/types/itinerary";
import { formatMoney, sumMoney } from "@/utils";
import { getResourceUnitName } from "@/utils/resource-unit";
import ItineraryDayForm from "./ItineraryDayForm.vue";

type EditableDayField = "departure" | "destination" | "overnightDestination" | "transport" | "description";
const props = defineProps<{
  day: ItineraryDayRecord;
  breakfastStatus: "included" | "excluded" | "pending";
  destinations: string[];
  contentEditable: boolean;
  isLast: boolean;
  plannedDays: number;
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
}>();
const expanded = ref(true);
defineExpose({ expand: () => { expanded.value = true; } });
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
.day-card.is-collapsed :deep(.el-card__body) { display: none; }
.day-card.is-collapsed :deep(.el-card__header) { border-bottom: 0; }
</style>
