<template>
  <AppDialog
    :model-value="modelValue"
    :title="
      $t('itineraryWorkspace.resourceDialogTitle', {
        day: dayLabel,
        type: mealSlot ? $t(`itinerary.meals.${mealSlot}`) : $t('itineraryWorkspace.actions.attraction'),
      })
    "
    size="lg"
    destroy-on-close
    @close="emit('update:modelValue', false)"
  >
    <el-form label-width="140px">
      <el-form-item v-if="mealSlot" :label="$t('itinerary.mealSource')">
        <el-radio-group v-model="source">
          <el-radio-button value="library">
            {{ $t("itinerary.mealLibrary") }}
          </el-radio-button>
          <el-radio-button value="custom">
            {{ $t("itinerary.customRestaurant") }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <template v-if="mealSlot && source === 'custom'">
        <el-form-item :label="$t('itinerary.customRestaurantName')" required>
          <div class="flex gap-2 w-300px">
            <el-input v-model="customName" :maxlength="500">
            </el-input>
            <el-button type="primary" @click="customName = $t('itinerary.pending')">
              {{ $t("itinerary.pending") }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item v-if="english" :label="$t('itinerary.english.customRestaurantName')">
          <el-input v-model="customNameEn" :maxlength="500" class="w-300px!" />
        </el-form-item>
        <el-form-item :label="$t('itinerary.customMealUnit')">
          <el-select v-model="customUnit" autocomplete="new-password" class="w-300px!">
            <el-option value="personMeal" :label="$t('itinerary.customMealPerPerson')" />
            <el-option value="table" :label="$t('itinerary.customMealPerTable')" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('itinerary.customMealPrice')">
          <el-input-number
            v-model="customPrice"
            :min="0"
            :max="1e9"
            :precision="2"
            @change="adjustmentReason = ''"
          />
        </el-form-item>

        <p>{{ $t("itinerary.customMealHint") }}</p>
      </template>
      <template v-else>
        <el-form-item :label="$t('common.cityRegion')">
          <el-select
            v-model="city"
            autocomplete="new-password"
            clearable
            :placeholder="$t('itinerary.allCities')"
            class="w-full"
          >
            <el-option-group v-if="dayCities?.length" :label="$t('itinerary.dayCities')">
              <el-option
                v-for="option in dayCities"
                :key="`day-${option}`"
                :label="option"
                :value="option"
              />
            </el-option-group>
            <el-option
              v-for="option in otherCityOptions"
              :key="option"
              :label="option"
              :value="option"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('itinerary.resourcePrice')" required>
          <RemoteSelect
            v-model="selectedId"
            :selected-label="
              selectedOption
                ? selectedOption.resourceName
                : undefined
            "
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
          <el-form-item :label="$t('identity.reference')" class="mt-3">
            <el-input-number :model-value="referencePrice == null ? 0 : referencePrice" readonly />
          </el-form-item>
          <el-form-item :label="$t('identity.actual')">
            <el-input-number
              v-model="actualPrice"
              :min="0"
              :precision="2"
              @change="adjustmentReason = ''"
            />
          </el-form-item>
        </template>
      </template>
      <el-form-item
        v-if="(source === 'custom' ? customUnit : selectedOption?.unit) === 'table'"
        :label="$t('itinerary.tableCount')"
        required
      >
        <el-input-number
          v-model="tableCount"
          :min="1"
          :max="10000"
          :precision="0"
        />
      </el-form-item>
      <el-form-item v-if="reasonRequired" :label="$t('identity.reason')" required>
        <el-input v-model="adjustmentReason" :placeholder="$t('identity.reasonPlaceholder')" />
      </el-form-item>
      <el-alert
        v-if="duplicate"
        :title="$t('apiErrors.ITINERARY_RESOURCE_DUPLICATE')"
        type="warning"
        :closable="false"
      />
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" :disabled="!canSubmit" @click="submit">
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppDialog from "@/components/AppDialog/index.vue";
import RemoteSelect from "@/components/RemoteSelect/index.vue";
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import { useResourcePriceSelection } from "../useResourcePriceSelection";
import { ElMessage } from "element-plus";
import { useCityOptions } from "@/composables/useCityOptions";
import { useI18n } from "vue-i18n";
import { requestErrorMessage } from "@/utils/version-conflict";
import type { ItineraryResourceItem, MealSlot } from "@/types/itinerary";
import { formatMoney } from "@/utils";
import { getResourceUnitName } from "@/utils/resource-unit";
import type { ResourcePriceDetail } from "../pricing";

const props = defineProps<{
  modelValue: boolean;
  /** 当前操作的日序，例如 D3 */
  dayLabel: string;
  destination?: string;
  /** 当日出发、途经与到达城市，置顶便于切换；仍沿用 selections 的 city 参数。 */
  dayCities?: string[];
  /** 盛旭行程显示对客英文字段。 */
  english?: boolean;
  guestCount: number;
  mealSlot: MealSlot | null;
  currentItem?: ItineraryResourceItem;
  itineraryItems: ItineraryResourceItem[];
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [item: ItineraryResourceItem, description: string];
}>();
const { t, locale } = useI18n();
const cityOptions = useCityOptions();
const otherCityOptions = computed(() =>
  cityOptions.value.filter((option) => !props.dayCities?.includes(option)),
);
const {
  actualPrice,
  referencePrice,
  adjustmentReason,
  reasonRequired,
  city,
  selectedId,
  selectedOption,
  loadOptions,
  isDuplicate,
  duplicate,
  source,
  customName,
  customNameEn,
  customPrice,
  customUnit,
  tableCount,
  canSubmit,
  createItem,
} = useResourcePriceSelection(props, (error) => ElMessage.error(requestErrorMessage(error)));
async function loadPriceOptions(query: RemoteOptionsQuery) {
  const result = await loadOptions(query);
  return {
    total: result.total,
    list: result.list.map((option) => ({
      id: option.id,
      label: `${option.isStandardPrice ? `[${t("resource.standardPrice")}] ` : ""}${option.resourceName}`,
      disabled: isDuplicate(option.resourceId, option.isStandardPrice),
      description: `¥${formatMoney(option.unitCost)}/${resourceUnitName(option.unit)}`,
    })),
  };
}
function resourceUnitName(code: string) {
  return getResourceUnitName(code, locale.value);
}
function formatDetail(detail: ResourcePriceDetail) {
  if (detail.format === "money") return `¥${formatMoney(detail.value)}`;
  if (detail.format === "translation") return t(String(detail.value));
  if (detail.format === "unit") return resourceUnitName(String(detail.value));
  return detail.value === "" ? "-" : String(detail.value);
}
function submit() {
  const item = createItem();
  if (!item) return;
  emit("submit", item, item.resourceId ? (selectedOption.value?.description ?? "") : "");
  emit("update:modelValue", false);
}
</script>

<style scoped lang="scss">
.resource-dialog__details :deep(.el-descriptions__label) {
  width: 140px;
}
.resource-dialog__details :deep(.el-descriptions__content) {
  white-space: normal;
  word-break: break-word;
}
</style>
