<template>
  <AppDialog
    :model-value="modelValue"
    size="lg"
    :title="$t('itineraryWorkspace.resourceDialogTitle', { day: dayLabel, type: $t('websiteItineraryUi.transportLegs') })"
    @close="close"
  >
    <el-form label-position="top" @submit.prevent>
      <el-form-item :label="$t('websiteItineraryUi.resourceSource')">
        <el-radio-group v-model="source">
          <el-radio-button value="route">
            {{ $t("websiteItineraryUi.sourceRoute") }}
          </el-radio-button>
          <el-radio-button value="manual">
            {{ $t("websiteItineraryUi.sourceManual") }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <div class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('websiteItineraryUi.departureCity')" :required="source === 'manual'">
          <el-select
            v-model="fromCityId"
            autocomplete="new-password"
            filterable
            :clearable="source === 'route'"
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
        <el-form-item :label="$t('websiteItineraryUi.arrivalCity')" :required="source === 'manual'">
          <el-select
            v-model="toCityId"
            autocomplete="new-password"
            filterable
            :clearable="source === 'route'"
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
      </div>
      <DataTable
        v-if="source === 'route'"
        :data="routes"
        row-key="id"
        size="small"
        :height="260"
        :filtered="Boolean(fromCityId || toCityId)"
        highlight-current-row
        :current-row-key="selectedId || undefined"
        @row-click="(row: WebsiteRoute) => (selectedId = row.id)"
      >
        <el-table-column width="48" align="center">
          <template #default="{ row }">
            <el-radio v-model="selectedId" :value="row.id" :aria-label="localName(row as WebsiteRoute)" />
          </template>
        </el-table-column>
        <el-table-column :label="$t('websiteItineraryUi.transportNameZh')" min-width="200">
          <template #default="{ row }">
            {{ localName(row as WebsiteRoute) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('websiteItineraryUi.transportMode')" min-width="100">
          <template #default="{ row }">
            {{ modeLabel(row.mode) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('websiteItineraryUi.routeCities')" min-width="160">
          <template #default="{ row }">
            {{ cityName(row.fromCityId) }} → {{ cityName(row.toCityId) }}
          </template>
        </el-table-column>
      </DataTable>
      <div v-else class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('websiteItineraryUi.transportMode')">
          <el-select v-model="mode" autocomplete="new-password">
            <el-option
              v-for="option in TRANSPORT_OPTIONS"
              :key="option.value"
              :value="option.value"
              :label="$t(option.labelKey)"
            />
          </el-select>
        </el-form-item>
        <span />
        <el-form-item :label="$t('websiteItineraryUi.transportNameZh')">
          <el-input v-model="nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.transportNameEn')">
          <el-input v-model="nameEn" maxlength="150" />
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
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import type { TransportMode, WebsiteConfig, WebsiteDay, WebsiteLeg, WebsiteRoute } from "@/types/website";
import { TRANSPORT_OPTIONS } from "../../options";

/**
 * 独立站交通段：从当前配置的专属路线按出发/抵达城市筛选，或手填；确认后才加入当天。
 */
const props = defineProps<{
  modelValue: boolean;
  dayLabel: string;
  day?: WebsiteDay;
  config: WebsiteConfig;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [leg: WebsiteLeg];
}>();
const { t, locale } = useI18n();
const source = ref<"route" | "manual">("route");
const fromCityId = ref("");
const toCityId = ref("");
const selectedId = ref("");
const mode = ref<TransportMode>("private_vehicle");
const nameZh = ref("");
const nameEn = ref("");

const routes = computed(() =>
  props.config.routes.filter(
    (route) =>
      route.status === "enabled" &&
      (!fromCityId.value || route.fromCityId === fromCityId.value) &&
      (!toCityId.value || route.toCityId === toCityId.value),
  ),
);
const selected = computed(() => routes.value.find((route) => route.id === selectedId.value));
const canSubmit = computed(() =>
  source.value === "route" ? Boolean(selected.value) : Boolean(fromCityId.value && toCityId.value),
);

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;
    source.value = "route";
    fromCityId.value = props.day?.departCityId ?? "";
    toCityId.value = props.day?.endCityId ?? "";
    selectedId.value = "";
    mode.value = "private_vehicle";
    nameZh.value = "";
    nameEn.value = "";
  },
  { immediate: true },
);
// 城市条件变化后清除不再匹配的待确认路线。
watch([fromCityId, toCityId], () => {
  if (selectedId.value && !selected.value) selectedId.value = "";
});

function localName(item: { nameZh: string; nameEn: string }) {
  return (locale.value === "en" ? item.nameEn : item.nameZh) || item.nameZh || item.nameEn;
}
function cityName(id: string) {
  const city = props.config.cities.find((item) => item.id === id);
  return city ? localName(city) : "-";
}
function modeLabel(value: TransportMode) {
  const option = TRANSPORT_OPTIONS.find((item) => item.value === value);
  return option ? t(option.labelKey) : value;
}
function close() {
  emit("update:modelValue", false);
}
function submit() {
  if (!canSubmit.value) return;
  const route = selected.value;
  emit(
    "submit",
    source.value === "route" && route
      ? {
        id: crypto.randomUUID(),
        routeId: route.id,
        fromCityId: route.fromCityId,
        toCityId: route.toCityId,
        mode: route.mode,
        nameZh: route.nameZh,
        nameEn: route.nameEn,
        feeState: route.feeState,
      }
      : {
        id: crypto.randomUUID(),
        routeId: null,
        fromCityId: fromCityId.value,
        toCityId: toCityId.value,
        mode: mode.value,
        nameZh: nameZh.value.trim(),
        nameEn: nameEn.value.trim(),
        feeState: "INCLUDED",
      },
  );
  close();
}
</script>
