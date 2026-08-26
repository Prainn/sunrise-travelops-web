<template>
  <el-card
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
      :day="day"
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
            {{ scope.row.resourceName }}
          </div>
          <small>{{ scope.row.priceName }}</small>
          <small class="day-card__provider">{{ scope.row.providerName }}</small>
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
        width="96"
        align="right"
      >
        <template #default="scope">
          ¥{{ formatMoney(scope.row.unitCost) }}
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('itinerary.customerUnitPrice')"
        width="138"
        align="right"
      >
        <template #default="scope">
          <el-input-number
            v-if="priceEditable"
            class="day-card__customer-price"
            :class="{ 'is-missing': scope.row.unitPrice === null }"
            :model-value="scope.row.unitPrice"
            :min="0"
            :precision="2"
            controls-position="right"
            :placeholder="$t('itinerary.customerUnitPriceRequired')"
            @update:model-value="emit('update-item-price', scope.$index, $event === undefined ? null : Number($event))"
          />
          <template v-else>
            {{ scope.row.unitPrice === null ? "-" : `¥${formatMoney(scope.row.unitPrice)}` }}
          </template>
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
        :label="$t('itinerary.totalPrice')"
        width="100"
        align="right"
      >
        <template #default="scope">
          <strong>¥{{ formatMoney(scope.row.totalPrice) }}</strong>
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
      <strong>{{ $t("itinerary.daySellingPrice") }} ¥{{ formatMoney(dayPrice) }}</strong>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowDown, ArrowUp, Right } from "@element-plus/icons-vue";
import type { ItineraryDayRecord } from "@/types/itinerary";
import { getResourceUnitName } from "@/utils/resource-unit";
import ItineraryDayForm from "./ItineraryDayForm.vue";

type EditableDayField = "departure" | "destination" | "transport" | "title" | "description" | "mealSummary" | "accommodationSummary";
const props = defineProps<{
  day: ItineraryDayRecord;
  contentEditable: boolean;
  priceEditable: boolean;
  isFirst: boolean;
  isLast: boolean;
}>();
const emit = defineEmits<{
  "update-field": [field: EditableDayField, value: string];
  "add-item": [];
  "remove-item": [index: number];
  "update-item-quantity": [index: number, quantity: number];
  "update-item-price": [index: number, price: number | null];
  duplicate: [];
  remove: [];
  move: [offset: number];
}>();
const dayCost = computed(() => props.day.items.reduce((total, item) => total + item.totalCost, 0));
const dayPrice = computed(() => props.day.items.reduce((total, item) => total + item.totalPrice, 0));
const { locale } = useI18n();

function updateField(field: EditableDayField, value: string) { emit("update-field", field, value); }
function formatMoney(value: number) { return value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function resourceUnitName(code: string) { return getResourceUnitName(code, locale.value); }
</script>

<style scoped lang="scss">
.day-card { border-radius: 10px; }
.day-card + .day-card { margin-top: 16px; }
.day-card__header, .day-card__identity, .day-card__actions, .day-card__resources-header, .day-card__subtotal { display: flex; align-items: center; }
.day-card__header, .day-card__resources-header, .day-card__subtotal { justify-content: space-between; }
.day-card__identity { gap: 12px; }
.day-card__number { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 10px; background: var(--el-color-primary); color: #fff; font-weight: 700; }
.day-card__route { display: flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 600; }
.day-card__date, small { color: var(--el-text-color-secondary); font-size: 12px; }
.day-card__provider { display: block; margin-top: 2px; color: var(--el-color-warning); }
.day-card__quantity { width: 72px; margin-right: 4px; }
.day-card__customer-price { width: 116px; }
.day-card__customer-price.is-missing :deep(.el-input__wrapper) { box-shadow: 0 0 0 1px var(--el-color-danger) inset; }
.day-card__resources-header { margin: 20px 0 10px; }
.day-card__resource-name { font-weight: 500; }
.day-card__subtotal { margin-top: 12px; color: var(--el-text-color-secondary); }
.day-card__subtotal strong { color: var(--el-color-primary); }
</style>
