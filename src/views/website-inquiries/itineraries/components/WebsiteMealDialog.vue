<template>
  <AppDialog
    :model-value="modelValue"
    size="lg"
    :busy="busy"
    :title="$t('itineraryWorkspace.resourceDialogTitle', { day: dayLabel, type: $t('websiteItineraryUi.mealsAndServices') })"
    @close="close"
  >
    <el-form label-position="top" :inert="busy" @submit.prevent>
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
        :key="mealId"
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
      <el-button :disabled="busy" @click="close">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" :loading="busy" @click="submit">
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import type { FeeState, WebsiteConfig, WebsiteDay, WebsiteMeal } from "@/types/website";
import FeeStateSelect from "../../components/FeeStateSelect.vue";
import WebsitePublicResourcePicker from "../../components/WebsitePublicResourcePicker.vue";
import { isMealArranged } from "../../options";

const MEAL_SLOTS = ["breakfast", "lunch", "dinner"] as const;

/**
 * 独立站三餐编辑：打开时绑定原明细 ID，切换餐次只改 slot，确认后才写回；已有目标安排须确认替换。
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
  submit: [meal: WebsiteMeal];
}>();
const { t } = useI18n();
const mealId = ref("");
const busy = ref(false);
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
function loadSlot(value: WebsiteMeal["slot"]) {
  const meal = props.day?.meals.find((item) => item.slot === value);
  mealId.value = meal?.id ?? crypto.randomUUID();
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
  if (!busy.value) emit("update:modelValue", false);
}
async function submit() {
  if (busy.value) return;
  const target = props.day?.meals.find(meal => meal.slot === slot.value && meal.id !== mealId.value);
  if (target && isMealArranged(target)) {
    busy.value = true;
    try {
      await ElMessageBox.confirm(t("websiteItineraryUi.replaceMealConfirm", {
        day: props.dayLabel,
        slot: t(`itinerary.meals.${target.slot}`),
        name: target.restaurantZh || target.restaurantEn || t("websiteItineraryUi.noRestaurant"),
      }), t("itineraryWorkspace.transfer.replaceTitle"), {
        confirmButtonText: t("itineraryWorkspace.transfer.replace"),
        cancelButtonText: t("common.cancel"),
        type: "warning",
      });
    } catch {
      return;
    } finally {
      busy.value = false;
    }
  }
  emit("submit", {
    id: mealId.value,
    slot: slot.value,
    resourceId: source.value === "public" ? resourceId.value : null,
    restaurantZh: restaurantZh.value.trim(),
    restaurantEn: restaurantEn.value.trim(),
    feeState: feeState.value,
  });
  close();
}
</script>
