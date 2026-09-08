<template>
  <el-dialog
    :model-value="modelValue"
    :title="mealSlot ? $t(`itinerary.meals.${mealSlot}`) : $t('itinerary.addResource')"
    width="680px"
    destroy-on-close
    @close="emit('update:modelValue', false)"
  >
    <el-form label-width="100px">
      <el-form-item :label="$t('resource.city')">
        <el-select
          v-model="city"
          clearable
          :placeholder="$t('itinerary.allCities')"
          style="width: 100%"
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
        <el-select
          v-model="selectedId"
          filterable
          :filter-method="filterOptions"
          :placeholder="$t('itinerary.resourcePricePlaceholder')"
          style="width: 100%"
        >
          <el-option
            v-for="option in visibleOptions"
            :key="option.id"
            :label="`${option.resourceName}｜${option.priceName}`"
            :value="option.id"
          >
            <div class="resource-option">
              <span>{{ option.resourceName }}｜{{ option.priceName }}</span>
              <strong>¥{{ formatMoney(option.unitCost) }}/{{ resourceUnitName(option.unit) }}</strong>
            </div>
          </el-option>
        </el-select>
      </el-form-item>
      <template v-if="selectedOption">
        <el-descriptions
          class="resource-dialog__details"
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
          class="resource-dialog__quantity"
          :label="$t('itinerary.quantity')"
        >
          <el-input-number
            v-model="quantity"
            :min="1"
            :precision="0"
          />
          <span class="resource-dialog__unit">
            {{ resourceUnitName(selectedOption.unit) }}
          </span>
        </el-form-item>
      </template>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button
        type="primary"
        :disabled="!selectedOption"
        @click="submit"
      >
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useCityOptions } from "@/composables/useCityOptions";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { ItineraryDailyItemType, ItineraryResourceItem, MealSlot } from "@/types/itinerary";
import { formatMoney } from "@/utils";
import { getResourceUnitName } from "@/utils/resource-unit";
import { calculateItem, getDefaultResourceQuantity } from "../pricing";
import type { ResourcePriceDetail, ResourcePriceOption } from "../pricing";

const props = defineProps<{
  modelValue: boolean;
  guestCount: number;
  options: ResourcePriceOption[];
  mealSlot: MealSlot | null;
}>();
const emit = defineEmits<{ "update:modelValue": [value: boolean]; submit: [item: ItineraryResourceItem] }>();
const { t, locale } = useI18n();
const type = computed<ItineraryDailyItemType>(() => props.mealSlot ? "restaurant" : "attraction");
const city = ref("");
const selectedId = ref("");
const keyword = ref("");
const quantity = ref(1);
const filteredByType = computed(() => props.options.filter((option) => option.type === type.value));
const cityOptions = useCityOptions();
const filteredByCity = computed(() => city.value
  ? filteredByType.value.filter((option) => option.city === city.value)
  : filteredByType.value);
const visibleOptions = computed(() => {
  const normalized = keyword.value.trim().toLowerCase();
  return normalized ? filteredByCity.value.filter((option) => option.searchText.toLowerCase().includes(normalized)) : filteredByCity.value;
});
const selectedOption = computed(() => props.options.find((option) => option.id === selectedId.value));

watch(type, () => {
  city.value = "";
  selectedId.value = "";
  keyword.value = "";
  quantity.value = type.value === "attraction" ? Math.max(props.guestCount, 1) : 1;
});
watch(city, () => {
  selectedId.value = "";
  keyword.value = "";
});
watch(() => props.modelValue, (visible) => {
  if (!visible) return;
  city.value = "";
  selectedId.value = "";
  keyword.value = "";
  quantity.value = Math.max(props.guestCount, 1);
});

watch(selectedOption, (option) => {
  quantity.value = getDefaultResourceQuantity(option, props.guestCount);
});

function filterOptions(value: string) { keyword.value = value; }
function resourceUnitName(code: string) { return getResourceUnitName(code, locale.value); }
function formatDetail(detail: ResourcePriceDetail) {
  if (detail.format === "money") return `¥${formatMoney(Number(detail.value))}`;
  if (detail.format === "translation") return t(String(detail.value));
  if (detail.format === "unit") return resourceUnitName(String(detail.value));
  return detail.value === "" ? "-" : String(detail.value);
}
function submit() {
  if (!selectedOption.value) return;
  emit("submit", { ...calculateItem(selectedOption.value, quantity.value), ...(props.mealSlot ? { mealSlot: props.mealSlot } : {}) });
  emit("update:modelValue", false);
}
</script>

<style scoped lang="scss">
.resource-option { display: flex; justify-content: space-between; gap: 16px; }
.resource-option strong { color: var(--el-color-primary); font-weight: 500; }
.resource-dialog__details { max-height: 320px; overflow-y: auto; }
.resource-dialog__details :deep(.el-descriptions__label) { width: 140px; }
.resource-dialog__details :deep(.el-descriptions__content) { white-space: normal; word-break: break-word; }
.resource-dialog__quantity { margin-top: 18px; }
.resource-dialog__unit { margin-left: 8px; color: var(--el-text-color-secondary); }
</style>
