<template>
  <AppDialog
    :model-value="modelValue"
    size="lg"
    :title="$t('itineraryWorkspace.resourceDialogTitle', { day: dayLabel, type: $t('websiteItineraryUi.mealsAndServices') })"
    @close="close"
  >
    <el-form label-position="top" @submit.prevent>
      <div class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('websiteItineraryUi.mealSlot')">
          <el-select v-model="slot" autocomplete="new-password">
            <el-option
              v-for="item in MEAL_SLOTS"
              :key="item"
              :value="item"
              :label="$t(`itinerary.meals.${item}`)"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t(`websiteItineraryUi.mealFees.${slot}`)">
          <FeeStateSelect v-model="feeState" />
        </el-form-item>
      </div>
      <el-form-item :label="$t('websiteItineraryUi.resourceSource')">
        <el-radio-group :model-value="source" @update:model-value="changeSource">
          <el-radio-button value="public">
            {{ $t("websiteItineraryUi.sourcePublic") }}
          </el-radio-button>
          <el-radio-button value="manual">
            {{ $t("websiteItineraryUi.sourceManual") }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <WebsitePublicResourcePicker
        v-if="source === 'public'"
        :key="slot"
        kind="restaurant"
        :model-value="resourceId"
        :linked-city-id="linkedCityId"
        @update:model-value="resourceId = $event"
        @select="(option) => option && (restaurantZh = option.name)"
      />
      <p class="m-0 my-3 text-[12px] text-muted">
        {{ $t(source === "public" ? "websiteItineraryUi.publicResourceNote" : "websiteItineraryUi.mealNameNote") }}
      </p>
      <div class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('websiteItineraryUi.restaurantOrMealNameZh')">
          <el-input v-model="restaurantZh" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.restaurantOrMealNameEn')">
          <el-input v-model="restaurantEn" maxlength="150" />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="close">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" @click="submit">
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppDialog from "@/components/AppDialog/index.vue";
import type { FeeState, WebsiteConfig, WebsiteDay, WebsiteMeal } from "@/types/website";
import FeeStateSelect from "../../components/FeeStateSelect.vue";
import WebsitePublicResourcePicker from "../../components/WebsitePublicResourcePicker.vue";

const MEAL_SLOTS = ["breakfast", "lunch", "dinner"] as const;

/**
 * 独立站三餐编辑：餐次与费用状态独立，公共餐厅只写 resourceId 与中文名；确认后才写回当天对应餐次。
 */
const props = defineProps<{
  modelValue: boolean;
  dayLabel: string;
  day?: WebsiteDay;
  config: WebsiteConfig;
  initialSlot: WebsiteMeal["slot"];
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [meal: Pick<WebsiteMeal, "slot" | "resourceId" | "restaurantZh" | "restaurantEn" | "feeState">];
}>();
const slot = ref<WebsiteMeal["slot"]>("lunch");
const source = ref<"public" | "manual">("public");
const resourceId = ref<string | null>(null);
const restaurantZh = ref("");
const restaurantEn = ref("");
const feeState = ref<FeeState>("SELF_PAY");

const linkedCityId = computed(() => {
  const cityId = props.day?.endCityId;
  return props.config.cities.find((city) => city.id === cityId)?.resourceId ?? null;
});

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) loadSlot(props.initialSlot);
  },
  { immediate: true },
);
watch(slot, (value, previous) => {
  if (props.modelValue && value !== previous) loadSlot(value);
});

function loadSlot(value: WebsiteMeal["slot"]) {
  const meal = props.day?.meals.find((item) => item.slot === value);
  slot.value = value;
  resourceId.value = meal?.resourceId ?? null;
  restaurantZh.value = meal?.restaurantZh ?? "";
  restaurantEn.value = meal?.restaurantEn ?? "";
  feeState.value = meal?.feeState ?? "SELF_PAY";
  source.value = meal?.resourceId || !(meal?.restaurantZh || meal?.restaurantEn) ? "public" : "manual";
}
function changeSource(value: string | number | boolean | undefined) {
  source.value = value as "public" | "manual";
  if (source.value === "manual") resourceId.value = null;
}
function close() {
  emit("update:modelValue", false);
}
function submit() {
  emit("submit", {
    slot: slot.value,
    resourceId: source.value === "public" ? resourceId.value : null,
    restaurantZh: restaurantZh.value.trim(),
    restaurantEn: restaurantEn.value.trim(),
    feeState: feeState.value,
  });
  close();
}
</script>
