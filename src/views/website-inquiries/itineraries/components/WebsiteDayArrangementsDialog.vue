<template>
  <AppDialog
    :model-value="modelValue"
    size="lg"
    :busy="saving"
    @update:model-value="handleVisibleChange"
    @closed="emit('closed')"
  >
    <template v-if="day" #header="{ titleId, titleClass }">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 :id="titleId" :class="titleClass" class="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span>D{{ day.dayNumber }}</span>
          <span v-if="date" class="text-sm font-normal text-muted">{{ date }}</span>
          <span class="min-w-0 text-sm font-normal text-strong [overflow-wrap:anywhere]">
            {{ route || $t("itineraryWorkspace.notArranged") }}
          </span>
        </h2>
        <p
          v-if="remark"
          class="m-0 min-w-0 flex gap-[6px] text-sm font-normal [overflow-wrap:anywhere]"
        >
          <span class="text-[var(--el-text-color-secondary)]">{{ remark }}</span>
        </p>
      </div>
    </template>
    <div v-if="day" class="flex flex-col gap-4">
      <section class="surface-muted p-4 flex flex-col gap-3">
        <div class="flex flex-wrap justify-between items-center gap-3">
          <h4 class="m-0 text-[14px] text-strong font-600">
            {{ $t("itineraryWorkspace.groups.meals") }}
          </h4>
          <el-button
            v-if="canEdit"
            link
            type="primary"
            :disabled="!nextMealSlot"
            @click="openCreateMeal"
          >
            {{ $t("common.create") }}
          </el-button>
        </div>
        <p v-if="!arrangedMeals.length" class="m-0 text-[12px] text-muted">
          {{ $t("websiteItineraryUi.noMeals") }}
        </p>
        <div
          v-for="meal in arrangedMeals"
          :key="meal.id"
          class="flex items-start gap-3 p-3 rounded-[var(--custom-radius)] bg-surface border border-solid border-[var(--divider-color)] text-[14px]"
        >
          <div class="min-w-0 flex-1 flex flex-wrap items-center gap-2">
            <strong class="text-strong">{{ $t(`itinerary.meals.${meal.slot}`) }}</strong>
            <el-tag size="small" effect="plain">
              {{ $t(`websiteInquiry.feeStates.${meal.feeState}`) }}
            </el-tag>
            <span class="[overflow-wrap:anywhere]">
              {{ mealName(meal) || $t("websiteItineraryUi.noRestaurant") }}
            </span>
            <el-tag
              v-if="meal.resourceId"
              size="small"
              type="info"
              effect="plain"
            >
              {{ $t("websiteItineraryUi.sourcePublic") }}
            </el-tag>
          </div>
          <div v-if="canEdit" class="flex shrink-0 self-start">
            <el-button link type="primary" @click="emit('open-resource', { kind: 'meal', slot: meal.slot })">
              {{ $t("common.edit") }}
            </el-button>
            <el-button link type="danger" @click="handleRemoveMeal(meal)">
              {{ $t("common.delete") }}
            </el-button>
          </div>
        </div>
      </section>
      <WebsiteDayTransport
        :day="day"
        :config="config"
        :selectable-city-ids="selectableCityIds"
        :airport-transfers="airportTransfers"
        :editable="canEdit"
        @add="emit('open-resource', { kind: 'transport' })"
        @remove="(id, name) => emit('remove-item', id, name)"
      />
      <WebsiteDayHotels
        :day="day"
        :config="config"
        :editable="canEdit"
        :nightly="nightly"
        @edit="handleEditHotel"
        @remove="(id, name) => emit('remove-item', id, name)"
      />
    </div>
    <template #footer>
      <el-button :disabled="saving" @click="close">
        {{ $t("common.close") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { WebsiteConfig, WebsiteDay, WebsiteMeal } from "@/types/website";
import AppDialog from "@/components/AppDialog/index.vue";
import { isMealArranged } from "../../options";
import type { AirportTransferOptions } from "../airport-transfers";
import type { WebsiteResourceSelection } from "./WebsiteDayCard.vue";
import WebsiteDayHotels from "./WebsiteDayHotels.vue";
import WebsiteDayTransport from "./WebsiteDayTransport.vue";

const MEAL_SLOTS: WebsiteMeal["slot"][] = ["breakfast", "lunch", "dinner"];

/**
 * 独立站逐日行程「查看当天」弹窗：固定展示餐食、交通段和酒店三组，禁用拖拽，与主日卡共用当前草稿。
 */
const props = defineProps<{
  modelValue: boolean;
  day?: WebsiteDay;
  /** 当天实际服务日期（自选或连续日期算法得出）；未定为 null */
  date: string | null;
  route: string;
  config: WebsiteConfig;
  selectableCityIds: ReadonlySet<string>;
  airportTransfers?: AirportTransferOptions;
  nightly?: boolean;
  editable: boolean;
  saving?: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  closed: [];
  "open-resource": [selection: WebsiteResourceSelection];
  "remove-item": [id: string, name: string];
}>();

const { t, locale } = useI18n();
const canEdit = computed(() => props.editable && !props.saving);
const remark = computed(() => props.day?.internalRemark?.trim() ?? "");
/** 餐食固定按早、午、晚展示已安排餐次。 */
const arrangedMeals = computed(() =>
  MEAL_SLOTS.flatMap((slot) => {
    const meal = props.day?.meals.find((item) => item.slot === slot && isMealArranged(item));
    return meal ? [meal] : [];
  }),
);
const nextMealSlot = computed(() =>
  MEAL_SLOTS.find((slot) => !arrangedMeals.value.some((meal) => meal.slot === slot)),
);

function mealName(meal: WebsiteMeal) {
  return (locale.value === "en" ? meal.restaurantEn : meal.restaurantZh) || meal.restaurantZh || meal.restaurantEn;
}
function close() {
  if (!props.saving) emit("update:modelValue", false);
}
function handleVisibleChange(visible: boolean) {
  if (!visible) close();
}
function openCreateMeal() {
  if (!canEdit.value || !nextMealSlot.value) return;
  emit("open-resource", { kind: "meal", slot: nextMealSlot.value });
}
function handleRemoveMeal(meal: WebsiteMeal) {
  const name = mealName(meal);
  emit("remove-item", meal.id, t(`itinerary.meals.${meal.slot}`) + (name ? ` (${name})` : ""));
}
function handleEditHotel(index: number) {
  if (!props.day) return;
  const hotel = props.day.hotels[index];
  emit("open-resource", { kind: "hotel", id: hotel?.id, tier: hotel?.tier });
}
</script>
