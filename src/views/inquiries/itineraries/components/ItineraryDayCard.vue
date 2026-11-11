<template>
  <ItineraryDayCardFrame
    :id="`day-${day.id}`"
    ref="frame"
    :day-number="day.dayNumber"
    :departure="day.departure || $t('itinerary.departure')"
    :destination="day.destination || $t('itinerary.destination')"
    :date="hideDate ? undefined : day.date"
    :body-id="`day-body-${day.id}`"
  >
    <ItineraryDayResourceBar
      class="mb-4"
      :actions="resourceActions"
      :summaries="planSummaries"
      @select="selectResource"
    />
    <ItineraryDayForm
      :allow-custom-destination="isLast && day.dayNumber >= plannedDays"
      :is-last="isLast"
      :day="day"
      :destinations="destinations"
      :editable="contentEditable"
      @update-field="updateField"
      @update-via="emit('update-via', $event)"
    />

    <!-- 新增一天只展示基础信息；有资源或已勾选午/晚餐后再显示当日资源区 -->
    <template v-if="hasDayResources">
      <div class="day-card__resources-header m-[20px_0_10px] flex items-center justify-between">
        <strong>{{ $t("itinerary.dailyResources") }}</strong>
      </div>
      <div class="day-card__meals flex flex-wrap items-center gap-[16px] mb-[12px]">
        <el-tag
          :type="
            breakfastStatus === 'included'
              ? 'success'
              : breakfastStatus === 'excluded'
                ? 'info'
                : 'warning'
          "
          :title="
            $t(
              breakfastStatus === 'pending'
                ? 'itinerary.breakfastPending'
                : breakfastStatus === 'included'
                  ? 'itinerary.breakfastIncluded'
                  : 'itinerary.breakfastExcluded',
            )
          "
        >
          {{
            $t(
              breakfastStatus === "pending"
                ? "itinerary.breakfastPending"
                : breakfastStatus === "included"
                  ? "itinerary.breakfastIncluded"
                  : "itinerary.breakfastExcluded",
            )
          }}
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
      <DataTable
        v-if="day.items.length"
        :data="day.items"
        row-key="id"
        border
        size="small"
      >
        <el-table-column :label="$t('itinerary.resource')" min-width="120">
          <template #default="scope">
            <div class="day-card__resource-name font-medium">
              <el-tag v-if="scope.row.mealSlot" size="small">
                {{ $t(`itinerary.meals.${scope.row.mealSlot}`) }}
              </el-tag>
              {{ scope.row.resourceName }}
            </div>
            <small class="text-[14px] text-muted">{{
              scope.row.priceName
            }}</small>
          </template>
        </el-table-column>

        <el-table-column :label="$t('itinerary.unitCost')" width="190" align="right">
          <template #default="scope">
            ¥{{ formatMoney(scope.row.unitCost) }}
          </template>
        </el-table-column>
        <el-table-column
          v-if="day.items.some(item => item.tableCount != null)"
          :label="$t('itinerary.resourceTotalPrice')"
          width="180"
          align="right"
        >
          <template #default="{ row }">
            {{ row.tableCount != null && row.unitCost != null ? '¥' + formatMoney(row.totalCost) : '—' }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('itinerary.resourceCostPerPerson')" width="120" align="right">
          <template #default="scope">
            <el-tooltip placement="top" :disabled="scope.row.tableCount == null || paxTiers.length < 2">
              <template #content>
                <div v-for="pax in paxTiers" :key="pax">
                  {{ pax }} PAX：{{ itemCostLabel(day.items[scope.$index]!, pax) }}
                </div>
              </template>
              <span>{{ itemCostLabel(day.items[scope.$index]!, paxTiers[0]) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column
          v-if="contentEditable"
          :label="$t('common.actions')"
          width="120"
          align="center"
        >
          <template #default="scope">
            <el-button link type="primary" @click="editItem(scope.$index)">
              {{ $t("common.edit") }}
            </el-button>
            <el-button type="danger" link @click="emit('remove-item', scope.$index)">
              {{ $t("common.delete") }}
            </el-button>
          </template>
        </el-table-column>
      </DataTable>
      <FeedbackState v-else :title="$t('itinerary.noDailyResources')" />
      <div
        class="day-card__subtotal mt-[12px] text-[80%] text-muted"
      >
        <el-tooltip placement="top" :disabled="!hasTableMeals || paxTiers.length < 2">
          <template #content>
            <div v-for="pax in paxTiers" :key="pax">
              {{ pax }} PAX：¥{{ formatMoney(getDayResourceCost(day.items, pax)) }}
            </div>
          </template>
          <span>{{ $t("itinerary.dayPerPersonCost") }} ¥{{ formatMoney(dayCost) }}</span>
        </el-tooltip>
      </div>
    </template>
  </ItineraryDayCardFrame>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { Bowl, Coffee, OfficeBuilding, Location, User } from "@element-plus/icons-vue";
import type {
  ItineraryDayRecord,
  ItineraryEditableDayField,
  ItineraryResourceItem,
  MealSlot,
} from "@/types/itinerary";
import { formatMoney } from "@/utils";
import { getItemPerPersonCost, getDayResourceCost } from "../pricing";
import DataTable from "@/components/DataTable/index.vue";
import FeedbackState from "@/components/FeedbackState/index.vue";
import ItineraryDayCardFrame from "./ItineraryDayCardFrame.vue";
import ItineraryDayForm from "./ItineraryDayForm.vue";
import ItineraryDayResourceBar, { type DayResourceAction } from "./ItineraryDayResourceBar.vue";

type EditableDayField = ItineraryEditableDayField;
const props = defineProps<{
  day: ItineraryDayRecord;
  paxTiers: number[];
  hideDate?: boolean;
  breakfastStatus: "included" | "excluded" | "pending";
  destinations: string[];
  contentEditable: boolean;
  isLast: boolean;
  plannedDays: number;
  /** 当天可见的整程/按城市方案摘要，空字符串表示未配置 */
  plans: { hotel: string; vehicle: string; guide: string };
}>();
const emit = defineEmits<{
  "update-field": [field: EditableDayField, value: string | null];
  "update-via": [cities: string[]];
  "update-meal": [slot: MealSlot, included: boolean];
  "select-meal": [slot: MealSlot];
  "add-item": [];
  "edit-item": [item: ItineraryResourceItem];
  "remove-item": [index: number];
  "open-plan": [section: "hotel" | "vehicle" | "guide", command?: string];
}>();
const frame = useTemplateRef<InstanceType<typeof ItineraryDayCardFrame>>("frame");
defineExpose({
  expand: () => frame.value?.expand(),
});
const hasDayResources = computed(
  () => props.day.items.length > 0 || props.day.meals.lunch || props.day.meals.dinner,
);
const hasTableMeals = computed(() => props.day.items.some(item => item.tableCount != null));
const dayCost = computed(() => getDayResourceCost(props.day.items, props.paxTiers[0]));
function itemCostLabel(item: ItineraryResourceItem, pax: number | undefined) {
  const value = getItemPerPersonCost(item, pax);
  return value === null ? "—" : "¥" + formatMoney(value);
}
const { t } = useI18n();

function mealLabel(slot: MealSlot) {
  const item = props.day.items.find((item) => item.type === "restaurant" && item.mealSlot === slot);
  return item
    ? `${item.resourceName} ${item.priceName ? `· ${item.priceName}` : ""}`
    : t("itinerary.selectMealResource");
}
const resourceActions = computed<DayResourceAction[]>(() => {
  const editableActions: DayResourceAction[] = props.contentEditable
    ? [
      {
        key: "attraction",
        label: t("itineraryWorkspace.actions.attraction"),
        icon: Location,
        active: props.day.items.some((item) => item.type === "attraction"),
      },
      ...(["lunch", "dinner"] as const).map((slot) => ({
        key: slot,
        label: t(`itinerary.meals.${slot}`),
        icon: slot === "lunch" ? Bowl : Coffee,
        active: props.day.items.some((item) => item.type === "restaurant" && item.mealSlot === slot),
      })),
    ]
    : [];
  return [
    ...editableActions,
    {
      key: "hotel",
      label: t("itineraryWorkspace.actions.hotel"),
      icon: OfficeBuilding,
      scope: t("itineraryWorkspace.scopes.byCity"),
      hint: t("itineraryWorkspace.hints.normalHotel"),
      active: Boolean(props.plans.hotel),
    },
    {
      key: "guide",
      label: t("itineraryWorkspace.actions.guide"),
      icon: User,
      scope: t("itineraryWorkspace.scopes.wholeTrip"),
      hint: t("itineraryWorkspace.hints.normalGuide"),
      active: Boolean(props.plans.guide),
    },
  ];
});
const planSummaries = computed(() =>
  (["hotel", "guide"] as const)
    .filter((key) => props.plans[key])
    .map((key) => ({ label: t(`itineraryWorkspace.actions.${key}`), value: props.plans[key] })),
);

function editItem(index: number) {
  const item = props.day.items[index];
  if (item) emit("edit-item", item);
}
function selectResource(key: string, command?: string) {
  if (key === "attraction") emit("add-item");
  else if (key === "lunch" || key === "dinner") emit("select-meal", key);
  else if (key === "hotel" || key === "vehicle" || key === "guide") emit("open-plan", key, command);
}
function updateField(field: EditableDayField, value: string | null) {
  emit("update-field", field, value);
}
</script>
