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
                v-for="city in config.cities"
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
          row-key="id"
          size="small"
          :height="280"
          :filtered="Boolean(cityId || keyword.trim())"
          highlight-current-row
          :current-row-key="selectedId || undefined"
          @row-click="(row: AttractionRow) => (selectedId = row.attraction.id)"
        >
          <el-table-column width="48" align="center">
            <template #default="{ row }">
              <el-radio
                v-model="selectedId"
                :value="row.attraction.id"
                :aria-label="localName(row.attraction)"
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
        <template v-if="selected">
          <el-descriptions
            class="mt-3"
            :column="2"
            border
            size="small"
          >
            <el-descriptions-item :label="$t('common.nameZh')">
              {{ selected.nameZh }}
            </el-descriptions-item>
            <el-descriptions-item :label="$t('common.nameEn')">
              {{ selected.nameEn }}
            </el-descriptions-item>
            <el-descriptions-item :label="$t('websiteItineraryUi.chargeable')">
              {{ $t(selected.chargeable ? "websiteItineraryUi.chargeableYes" : "websiteItineraryUi.chargeableNo") }}
            </el-descriptions-item>
            <el-descriptions-item :label="$t('websiteItineraryUi.recommendedMonths')">
              {{ selected.recommendedMonths.join(", ") || "-" }}
            </el-descriptions-item>
            <el-descriptions-item :label="$t('websiteItineraryUi.coreCopyZh')" :span="2">
              <span class="line-clamp-3 whitespace-pre-wrap">{{ template?.zh || "-" }}</span>
            </el-descriptions-item>
            <el-descriptions-item :label="$t('websiteItineraryUi.coreCopyEn')" :span="2">
              <span class="line-clamp-3 whitespace-pre-wrap">{{ template?.en || "-" }}</span>
            </el-descriptions-item>
          </el-descriptions>
          <el-alert
            v-if="!template"
            class="mt-3"
            type="error"
            :closable="false"
            :title="$t('websiteItineraryUi.attractionCopyMissing')"
          />
          <el-alert
            v-if="usedDays(selected.id)"
            class="mt-3!"
            type="warning"
            :closable="false"
            :title="$t('websiteItineraryUi.duplicateAttraction', { days: usedDays(selected.id) })"
          />
        </template>
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
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import type { WebsiteAttraction, WebsiteConfig, WebsiteDay, WebsiteItem } from "@/types/website";

interface AttractionRow {
  attraction: WebsiteAttraction;
  parentName: string;
}

/**
 * 独立站景点选择：数据来自行程绑定 configVersion 的专属景点与组件，按配置城市筛选，不替换为公共景点。
 */
const props = defineProps<{
  modelValue: boolean;
  dayLabel: string;
  day?: WebsiteDay;
  days: WebsiteDay[];
  config: WebsiteConfig;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [item: WebsiteItem];
}>();
const { locale } = useI18n();
const source = ref<"config" | "manual">("config");
const cityId = ref("");
const keyword = ref("");
const selectedId = ref("");
const manualNameZh = ref("");
const manualNameEn = ref("");

const rows = computed<AttractionRow[]>(() => {
  const query = keyword.value.trim().toLowerCase();
  const enabled = props.config.attractions.filter(
    (item) => item.status === "enabled" && (!cityId.value || item.cityId === cityId.value),
  );
  const matches = (item: WebsiteAttraction) =>
    !query || item.nameZh.toLowerCase().includes(query) || item.nameEn.toLowerCase().includes(query);
  const parents = enabled.filter((item) => item.kind === "attraction" || !item.parentId);
  const childrenOf = (id: string) => enabled.filter((item) => item.parentId === id && item.kind === "component");
  const listed = new Set<string>();
  const result: AttractionRow[] = [];
  // 父景点后紧跟其组件，便于辨认组件归属；组件命中关键词时也带出父景点。
  for (const parent of parents) {
    const children = childrenOf(parent.id).filter(matches);
    if (!matches(parent) && !children.length) continue;
    result.push({ attraction: parent, parentName: "" });
    listed.add(parent.id);
    for (const child of children) {
      result.push({ attraction: child, parentName: localName(parent) });
      listed.add(child.id);
    }
  }
  for (const item of enabled) {
    if (listed.has(item.id) || !matches(item)) continue;
    const parent = props.config.attractions.find((record) => record.id === item.parentId);
    result.push({ attraction: item, parentName: parent ? localName(parent) : "" });
  }
  return result;
});
const selected = computed(() => props.config.attractions.find((item) => item.id === selectedId.value));
const template = computed(() =>
  props.config.templates.find((item) => item.code === selected.value?.copyKey && item.status === "enabled"),
);
const canSubmit = computed(() =>
  source.value === "manual"
    ? Boolean(manualNameZh.value.trim() || manualNameEn.value.trim())
    : Boolean(selected.value && template.value),
);

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;
    source.value = "config";
    cityId.value = props.day?.endCityId || props.day?.departCityId || "";
    keyword.value = "";
    selectedId.value = "";
    manualNameZh.value = "";
    manualNameEn.value = "";
  },
  { immediate: true },
);
// 切换城市后清除不再匹配的待确认景点。
watch(cityId, (id) => {
  if (id && selected.value && selected.value.cityId !== id) selectedId.value = "";
});

function localName(item: { nameZh: string; nameEn: string }) {
  return (locale.value === "en" ? item.nameEn : item.nameZh) || item.nameZh || item.nameEn;
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
    emit("submit", {
      id: crypto.randomUUID(),
      attractionId: null,
      nameZh: manualNameZh.value.trim(),
      nameEn: manualNameEn.value.trim(),
      descriptionZh: "",
      descriptionEn: "",
      appears: true,
      feeState: "UNKNOWN",
    });
  } else {
    const attraction = selected.value!;
    emit("submit", {
      id: crypto.randomUUID(),
      attractionId: attraction.id,
      nameZh: attraction.nameZh,
      nameEn: attraction.nameEn,
      descriptionZh: template.value!.zh,
      descriptionEn: template.value!.en,
      appears: true,
      feeState: attraction.kind === "attraction" && attraction.chargeable ? "INCLUDED" : "UNKNOWN",
    });
  }
  close();
}
</script>
