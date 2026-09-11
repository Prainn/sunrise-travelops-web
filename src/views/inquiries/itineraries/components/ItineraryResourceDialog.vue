<template>
  <el-dialog
    :model-value="modelValue"
    :title="mealSlot ? $t(`itinerary.meals.${mealSlot}`) : $t('itinerary.addResource')"
    width="680px"
    destroy-on-close
    @close="emit('update:modelValue', false)"
  >
    <el-form label-width="100px">
      <el-form-item
        v-if="mealSlot"
        :label="$t('itinerary.mealSource')"
      >
        <el-radio-group v-model="source">
          <el-radio-button value="library">
            {{ $t('itinerary.mealLibrary') }}
          </el-radio-button>
          <el-radio-button value="custom">
            {{ $t('itinerary.customRestaurant') }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <template v-if="mealSlot && source === 'custom'">
        <el-form-item
          :label="$t('itinerary.customRestaurantName')"
          required
        >
          <el-input
            v-model="customName"
            :maxlength="500"
          />
        </el-form-item>
        <el-form-item :label="$t('itinerary.customMealUnit')">
          <el-select
            v-model="customUnit"
            class="w-full"
          >
            <el-option
              value="personMeal"
              :label="$t('itinerary.customMealPerPerson')"
            />
            <el-option
              value="table"
              :label="$t('itinerary.customMealPerTable')"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          :label="$t('itinerary.customMealPrice')"
          required
        >
          <el-input-number
            v-model="customPrice"
            :min="0"
            :max="1e9"
            :precision="2"
          />
        </el-form-item>
        <el-form-item
          :label="$t('itinerary.quantity')"
          required
        >
          <el-input-number
            v-model="customQuantity"
            :min="1"
            :max="100000"
            :precision="0"
          />
        </el-form-item>
        <p>{{ $t('itinerary.customMealHint') }}</p>
      </template>
      <template v-else>
        <el-form-item :label="$t('resource.city')">
          <el-select
            v-model="city"
            clearable
            :placeholder="$t('itinerary.allCities')"
            class="w-full"
          >
            <el-option
              v-for="option in cityOptions"
              :key="option"
              :label="option"
              :value="option"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          :label="$t('itinerary.resourcePrice')"
          required
        >
          <RemoteSelect
            v-model="selectedId"
            :query-key="JSON.stringify([city, mealSlot, locale])"
            :load-options="loadPriceOptions"
            :placeholder="$t('itinerary.resourcePricePlaceholder')"
            class="w-full"
          />
        </el-form-item>
        <template v-if="selectedOption">
          <el-descriptions
            class="resource-dialog__details max-h-[320px] overflow-y-auto"
            :column="1"
            border
          >
            <el-descriptions-item
              v-for="detail in selectedOption.details"
              :key="detail.labelKey"
              :label="$t(detail.labelKey)"
            >
              {{ formatDetail(detail) }}
            </el-descriptions-item>
          </el-descriptions>
          <el-form-item
            class="resource-dialog__quantity mt-[18px]"
            :label="$t('itinerary.quantity')"
          >
            <el-input-number
              v-model="quantity"
              :min="1"
              :precision="0"
            />
            <span class="resource-dialog__unit ml-[8px] text-[var(--el-text-color-secondary)]">
              {{ resourceUnitName(selectedOption.unit) }}
            </span>
          </el-form-item>
        </template>
      </template>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button
        type="primary"
        :disabled="!canSubmit"
        @click="submit"
      >
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import RemoteSelect from "@/components/RemoteSelect/index.vue";
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import { useResourcePriceSelection } from "../useResourcePriceSelection";
import { ElMessage } from "element-plus";
import { useCityOptions } from "@/composables/useCityOptions";
import { useI18n } from "vue-i18n";
import type { ItineraryResourceItem, MealSlot } from "@/types/itinerary";
import { createId, formatMoney, multiplyMoney } from "@/utils";
import { getResourceUnitName } from "@/utils/resource-unit";
import { calculateItem } from "../pricing";
import type { ResourcePriceDetail } from "../pricing";

const props = defineProps<{
  modelValue: boolean;
  destination?: string;
  guestCount: number;
  mealSlot: MealSlot | null;
}>();
const emit = defineEmits<{ "update:modelValue": [value: boolean]; submit: [item: ItineraryResourceItem] }>();
const { t, locale } = useI18n();
const cityOptions = useCityOptions();
const { city, selectedId, quantity, selectedOption, loadOptions } = useResourcePriceSelection(props, () => ElMessage.error(t("request.failed")));
const source = ref<"library" | "custom">("library");
const customName = ref("");
const customPrice = ref<number>();
const customUnit = ref<"personMeal" | "table">("personMeal");
const customQuantity = ref<number>(1);
const canSubmit = computed(() => props.mealSlot && source.value === "custom"
  ? Boolean(customName.value.trim()) && customPrice.value != null && Number.isFinite(customPrice.value) && customPrice.value >= 0 && Number.isInteger(customQuantity.value) && customQuantity.value > 0
  : Boolean(selectedOption.value));
watch(() => props.modelValue, visible => {
  if (!visible) return;
  source.value = "library";
  customName.value = "";
  customPrice.value = undefined;
  customUnit.value = "personMeal";
  customQuantity.value = Math.max(props.guestCount, 1);
});
watch(customUnit, unit => { customQuantity.value = unit === "table" ? 1 : Math.max(props.guestCount, 1); });
async function loadPriceOptions(query: RemoteOptionsQuery) {
  const result = await loadOptions(query);
  return { total: result.total, list: result.list.map(option => ({
    id: option.id, label: `${option.resourceName}｜${option.priceName}`,
    description: `¥${formatMoney(option.unitCost)}/${resourceUnitName(option.unit)}`,
  })) };
}
function resourceUnitName(code: string) { return getResourceUnitName(code, locale.value); }
function formatDetail(detail: ResourcePriceDetail) {
  if (detail.format === "money") return `¥${formatMoney(Number(detail.value))}`;
  if (detail.format === "translation") return t(String(detail.value));
  if (detail.format === "unit") return resourceUnitName(String(detail.value));
  return detail.value === "" ? "-" : String(detail.value);
}
function submit() {
  if (!canSubmit.value) return;
  if (props.mealSlot && source.value === "custom" && customPrice.value != null) {
    emit("submit", { id: createId("item"), type: "restaurant", mealSlot: props.mealSlot,
      resourceId: null, resourcePriceId: null, resourceName: customName.value.trim(), priceName: "",
      unit: customUnit.value, unitCost: customPrice.value, quantity: customQuantity.value,
      totalCost: multiplyMoney(customPrice.value, customQuantity.value), remark: "" });
    emit("update:modelValue", false);
    return;
  }
  if (!selectedOption.value) return;
  emit("submit", { ...calculateItem(selectedOption.value, quantity.value), ...(props.mealSlot ? { mealSlot: props.mealSlot } : {}) });
  emit("update:modelValue", false);
}
</script>

<style scoped lang="scss">
.resource-dialog__details :deep(.el-descriptions__label) { width: 140px; }
.resource-dialog__details :deep(.el-descriptions__content) { white-space: normal; word-break: break-word; }
</style>
