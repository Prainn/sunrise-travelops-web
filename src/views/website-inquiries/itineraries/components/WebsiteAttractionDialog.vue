<template>
  <AppDialog
    :model-value="modelValue"
    size="lg"
    :title="$t('itineraryWorkspace.resourceDialogTitle', { day: dayLabel, type: $t('websiteItineraryUi.attractions') })"
    @close="close"
  >
    <el-form label-position="top" @submit.prevent>
      <el-form-item :label="$t('websiteItineraryUi.resourceSource')">
        <el-radio-group v-model="source">
          <el-radio-button value="config">
            {{ $t("websiteItineraryUi.sourceConfig") }}
          </el-radio-button>
          <el-radio-button value="manual">
            {{ $t("websiteItineraryUi.sourceManual") }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <template v-if="source === 'config'">
        <div class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
          <el-form-item :label="$t('websiteItineraryUi.configCity')">
            <el-select
              v-model="cityId"
              autocomplete="new-password"
              filterable
              clearable
              :placeholder="$t('itinerary.allCities')"
            >
              <el-option
                v-for="city in cityOptions"
                :key="city.id"
                :value="city.id"
                :label="localName(city)"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('common.keywords')">
            <el-input v-model="keyword" clearable :placeholder="$t('websiteItineraryUi.bilingualKeywordPlaceholder')" />
          </el-form-item>
        </div>
        <DataTable
          :data="rows"
          row-key="attraction.id"
          size="small"
          :height="280"
          :filtered="Boolean(cityId || keyword.trim())"
          :row-class-name="({ row }: { row: AttractionRow }) => isAttractionDisabled(row.attraction) ? 'cursor-not-allowed text-muted' : 'cursor-pointer'"
          @row-click="(row: AttractionRow) => toggleAttraction(row.attraction)"
        >
          <el-table-column width="48" align="center">
            <template #default="{ row }">
              <el-checkbox
                :model-value="selectedIds.includes(row.attraction.id)"
                :disabled="isAttractionDisabled(row.attraction)"
                :aria-label="localName(row.attraction)"
                @click.stop
                @update:model-value="toggleAttraction(row.attraction)"
              />
            </template>
          </el-table-column>
          <el-table-column :label="$t('websiteItineraryUi.attractionName')" min-width="220">
            <template #default="{ row }">
              <span :class="{ 'pl-5': row.parentName }">
                <el-tag size="small" :type="row.attraction.kind === 'component' ? 'info' : 'primary'" effect="plain">
                  {{ $t(`websiteItineraryUi.attractionKinds.${row.attraction.kind}`) }}
                </el-tag>
                {{ localName(row.attraction) }}
              </span>
              <small v-if="row.parentName" class="block pl-5 text-muted">
                {{ $t("websiteItineraryUi.parentAttraction", { name: row.parentName }) }}
              </small>
            </template>
          </el-table-column>
          <el-table-column :label="$t('websiteItineraryUi.configCity')" min-width="100">
            <template #default="{ row }">
              {{ cityName(row.attraction.cityId) }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('websiteItineraryUi.usedDays')" min-width="90">
            <template #default="{ row }">
              {{ usedDays(row.attraction.id) }}
            </template>
          </el-table-column>
        </DataTable>
        <section v-if="selectedAttractions.length" class="mt-3" :aria-labelledby="selectionHeadingId">
          <h3 :id="selectionHeadingId" class="m-0 mb-2 text-sm text-strong font-600">
            {{ $t("websiteItineraryUi.selectedAttractions", { count: selectedAttractions.length }) }}
          </h3>
          <el-collapse
            v-model="expandedAttractionIds"
            class="website-attraction-preview overflow-hidden border-x border-solid border-[var(--divider-color)] rounded-lg"
            expand-icon-position="left"
          >
            <el-collapse-item v-for="attraction in selectedAttractions" :key="attraction.id" :name="attraction.id">
              <template #title>
                <span class="flex min-w-0 items-center gap-2">
                  <el-tag
                    size="small"
                    class="shrink-0"
                    :type="attraction.kind === 'component' ? 'info' : 'primary'"
                    effect="plain"
                  >
                    {{ $t(`websiteItineraryUi.attractionKinds.${attraction.kind}`) }}
                  </el-tag>
                  <span class="min-w-0 flex-1 font-600 [overflow-wrap:anywhere]">{{ localName(attraction) }}</span>
                  <span class="shrink-0 whitespace-nowrap text-xs text-muted">{{ attractionPriceLabel(attraction) }}</span>
                </span>
              </template>
              <el-descriptions
                :column="2"
                :label-width="76"
                border
                size="small"
              >
                <el-descriptions-item :label="$t('common.nameZh')" width="20%">
                  {{ attraction.nameZh }}
                </el-descriptions-item>
                <el-descriptions-item :label="$t('common.nameEn')">
                  {{ attraction.nameEn }}
                </el-descriptions-item>
                <el-descriptions-item :label="$t('websiteItineraryUi.recommendedMonths')" :span="2">
                  {{ attraction.recommendedMonths.join(", ") || "-" }}
                </el-descriptions-item>
                <el-descriptions-item :label="$t('websiteItineraryUi.coreCopyZh')" :span="2">
                  <span class="whitespace-pre-wrap">{{ attraction.descriptionZh || "-" }}</span>
                </el-descriptions-item>
                <el-descriptions-item :label="$t('websiteItineraryUi.coreCopyEn')" :span="2">
                  <span class="whitespace-pre-wrap">{{ attraction.descriptionEn || "-" }}</span>
                </el-descriptions-item>
              </el-descriptions>
            </el-collapse-item>
          </el-collapse>
          <el-alert
            v-if="missingCopy.length"
            class="mt-3!"
            type="error"
            :closable="false"
            :title="$t('websiteItineraryUi.attractionCopyMissing')"
            :description="missingCopy.map(localName).join($t('websiteInquiry.listSeparator'))"
          />
          <el-alert
            v-for="{ attraction, days: used } in duplicateSelections"
            :key="attraction.id"
            class="mt-3!"
            type="warning"
            :closable="false"
            :title="$t('websiteItineraryUi.duplicateAttraction', { days: used })"
            :description="selectedAttractions.length > 1 ? localName(attraction) : undefined"
          />
        </section>
      </template>
      <div v-else class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('common.nameZh')">
          <el-input v-model="manualNameZh" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('common.nameEn')">
          <el-input v-model="manualNameEn" maxlength="150" />
        </el-form-item>
        <p class="m-0 text-[12px] text-muted [grid-column:1/-1]">
          {{ $t("websiteItineraryUi.manualAttractionHint") }}
        </p>
      </div>
      <el-alert
        v-if="remainingSlots <= 0 || (source === 'config' && selectedAttractions.length >= remainingSlots)"
        class="mt-3!"
        type="info"
        :closable="false"
        :title="$t('websiteItineraryUi.dayAttractionLimit', { max: MAX_DAY_ATTRACTIONS })"
      />
      <div class="mt-3 grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('websiteItineraryUi.feeState')">
          <FeeStateSelect v-model="feeState" />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="close">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" :disabled="!canSubmit" @click="submit">
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import type { FeeState, WebsiteAttraction, WebsiteConfig, WebsiteDay, WebsiteItem } from "@/types/website";
import { hasAttractionCopy } from "@/views/website-inquiries/options";
import FeeStateSelect from "../../components/FeeStateSelect.vue";
import { attractionReferencePrice, formatAttractionPrice } from "../attraction-price";
import { websiteAttractionRows } from "../attraction-search";
import { websiteCityOptions, websiteDayRouteCityIds } from "../city-options";

interface AttractionRow {
  attraction: WebsiteAttraction;
  parentName: string;
}

const MAX_DAY_ATTRACTIONS = 200;

/**
 * 独立站景点选择：数据来自行程绑定 configVersion 的专属景点与组件，按配置城市筛选，不替换为公共景点。
 */
const props = defineProps<{
  modelValue: boolean;
  dayLabel: string;
  day?: WebsiteDay;
  days: WebsiteDay[];
  config: WebsiteConfig;
  selectableCityIds: ReadonlySet<string>;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [items: WebsiteItem[]];
}>();
const { locale, t } = useI18n();
const selectionHeadingId = useId();
const source = ref<"config" | "manual">("config");
const cityId = ref("");
const keyword = ref("");
const selectedIds = ref<string[]>([]);
const expandedAttractionIds = ref<string[]>([]);
const manualNameZh = ref("");
const manualNameEn = ref("");
const feeState = ref<FeeState>("INCLUDED");

const cityOptions = computed(() => websiteCityOptions(
  props.config.cities,
  props.selectableCityIds,
  ...websiteDayRouteCityIds(props.day),
  ...(props.day?.viaCityIds ?? []),
));
const cityOptionIds = computed(() => new Set(cityOptions.value.map((city) => city.id)));
const selectableAttractions = computed(() => props.config.attractions.filter(
  (item) => item.status === "enabled" && cityOptionIds.value.has(item.cityId) && (!cityId.value || item.cityId === cityId.value),
));
const selectableById = computed(() => new Map(selectableAttractions.value.map((item) => [item.id, item])));
const rows = computed<AttractionRow[]>(() =>
  websiteAttractionRows(selectableAttractions.value, keyword.value, props.config.attractions).map(({ attraction, parent }) => ({
    attraction,
    parentName: parent ? localName(parent) : "",
  })),
);
const selectedAttractions = computed(() => selectedIds.value.flatMap((id) => {
  const attraction = selectableById.value.get(id);
  return attraction ? [attraction] : [];
}));
const selectedGroupId = computed(() => {
  const attraction = selectedAttractions.value[0];
  return attraction && attractionGroupId(attraction);
});
const remainingSlots = computed(() => MAX_DAY_ATTRACTIONS - (props.day?.items.length ?? 0));
const missingCopy = computed(() => selectedAttractions.value.filter((attraction) => !hasAttractionCopy(attraction)));
const duplicateSelections = computed(() => selectedAttractions.value.flatMap((attraction) => {
  const days = usedDays(attraction.id);
  return days ? [{ attraction, days }] : [];
}));
const canSubmit = computed(() => {
  if (remainingSlots.value <= 0) return false;
  if (source.value === "manual") return Boolean(manualNameZh.value.trim() || manualNameEn.value.trim());
  const count = selectedAttractions.value.length;
  return count > 0 && count <= remainingSlots.value && missingCopy.value.length === 0;
});

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;
    source.value = "config";
    cityId.value = props.day?.viaCityIds?.[0] || props.day?.endCityId || props.day?.departCityId || "";
    keyword.value = "";
    selectedIds.value = [];
    manualNameZh.value = "";
    manualNameEn.value = "";
    feeState.value = "INCLUDED";
  },
  { immediate: true },
);
// 关键词只过滤显示，城市范围变化才移除不可选项。
watch(selectableById, (options) => {
  selectedIds.value = selectedIds.value.filter((id) => options.has(id));
});
watch(selectedIds, (ids, previousIds) => {
  if (ids.length === 1 && (previousIds.length !== 1 || ids[0] !== previousIds[0])) {
    expandedAttractionIds.value = [...ids];
    return;
  }
  const isEnteringMultiSelect = ids.length > 1 && previousIds.length === 1;
  expandedAttractionIds.value = isEnteringMultiSelect
    ? []
    : expandedAttractionIds.value.filter((id) => ids.includes(id));
});

function attractionGroupId(attraction: WebsiteAttraction) {
  return attraction.kind === "component" ? (attraction.parentId ?? attraction.id) : attraction.id;
}
function isAttractionDisabled(attraction: WebsiteAttraction) {
  if (selectedIds.value.includes(attraction.id)) return false;
  if (selectedAttractions.value.length >= remainingSlots.value) return true;
  return selectedGroupId.value !== undefined && attractionGroupId(attraction) !== selectedGroupId.value;
}
function toggleAttraction(attraction: WebsiteAttraction) {
  if (isAttractionDisabled(attraction)) return;
  if (selectedIds.value.includes(attraction.id)) {
    selectedIds.value = selectedIds.value.filter((id) => id !== attraction.id);
  } else {
    selectedIds.value = [...selectedIds.value, attraction.id];
  }
}
function localName(item: { nameZh: string; nameEn: string }) {
  return (locale.value === "en" ? item.nameEn : item.nameZh) || item.nameZh || item.nameEn;
}
function attractionPriceLabel(attraction: WebsiteAttraction) {
  if (!attraction.chargeable) return t("websiteItineraryUi.chargeableNo");
  const price = formatAttractionPrice(attractionReferencePrice(props.config, attraction.id));
  return t("websiteItineraryUi.attractionPriceValue", { price });
}
function cityName(id: string) {
  const city = props.config.cities.find((item) => item.id === id);
  return city ? localName(city) : "-";
}
function usedDays(attractionId: string) {
  return props.days
    .filter((day) => day.items.some((item) => item.attractionId === attractionId))
    .map((day) => `D${day.dayNumber}`)
    .join("、");
}
function close() {
  emit("update:modelValue", false);
}
function submit() {
  if (!canSubmit.value) return;
  if (source.value === "manual") {
    emit("submit", [{
      id: crypto.randomUUID(),
      attractionId: null,
      nameZh: manualNameZh.value.trim(),
      nameEn: manualNameEn.value.trim(),
      descriptionZh: "",
      descriptionEn: "",
      appears: true,
      feeState: feeState.value,
    }]);
  } else {
    const items = selectedAttractions.value.map((attraction): WebsiteItem => ({
      id: crypto.randomUUID(),
      attractionId: attraction.id,
      nameZh: attraction.nameZh,
      nameEn: attraction.nameEn,
      descriptionZh: attraction.descriptionZh,
      descriptionEn: attraction.descriptionEn,
      appears: true,
      feeState: feeState.value,
    }));
    emit("submit", items);
  }
  close();
}
</script>

<style scoped lang="scss">
.website-attraction-preview {
  --el-collapse-border-color: var(--divider-color);
  --el-collapse-header-height: 44px;

  :deep(.el-collapse-item__header) {
    padding: 8px 12px;
    line-height: 1.4;

    &:hover {
      background: var(--surface-hover);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary);
      outline-offset: -2px;
    }
  }

  :deep(.el-collapse-item__title) {
    min-width: 0;
  }

  :deep(.el-collapse-item__content) {
    padding: 0 12px 12px;
    overflow-wrap: anywhere;
  }
}
</style>
