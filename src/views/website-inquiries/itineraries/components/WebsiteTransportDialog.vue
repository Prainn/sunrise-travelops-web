<template>
  <AppDialog
    :model-value="modelValue"
    size="lg"
    :title="$t('itineraryWorkspace.resourceDialogTitle', { day: dayLabel, type: $t('websiteItineraryUi.transportLegs') })"
    @close="close"
  >
    <el-form
      ref="formRef"
      :model="details"
      :rules="rules"
      label-position="top"
      @submit.prevent
    >
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
        <el-table-column :label="$t('websiteReport.vehicleType')" min-width="110">
          <template #default="{ row }">
            {{ row.mode === 'private_vehicle' && row.vehicleOptions?.length ? row.vehicleOptions.map((option: WebsiteRouteVehicleOption) => `${vehicleLabel(option.vehicleType)} · ${option.durationMinutes == null ? $t('websiteReport.notSpecified') : $t('websiteReport.minutesValue', { value: option.durationMinutes })}`).join(' / ') : $t('websiteReport.notSpecified') }}
          </template>
        </el-table-column>
        <el-table-column prop="distanceKm" :label="$t('websiteReport.distanceKm')" min-width="110" />
        <el-table-column prop="durationMinutes" :label="$t('websiteReport.durationMinutes')" min-width="130" />
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
      <p class="text-muted my-3">
        {{ $t("websiteReport.transportDetailsHelp") }}
      </p>
      <div class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <WebsiteTransportFields v-model="details" :mode="effectiveMode" :vehicle-options="vehicleOptions" />
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
import type { FormInstance } from "element-plus";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import type { TransportMode, WebsiteConfig, WebsiteDay, WebsiteLeg, WebsiteRoute, WebsiteRouteVehicleOption } from "@/types/website";
import WebsiteTransportFields from "./WebsiteTransportFields.vue";
import { transportRules } from "@/views/resources/website/useWebsiteConfigRules";
import { TRANSPORT_OPTIONS, VEHICLE_OPTIONS } from "../../options";

/**
 * 独立站交通段：从当前配置的专属路线按出发/抵达城市筛选，或手填；确认后才加入当天。
 */
const props = defineProps<{
  modelValue: boolean;
  dayLabel: string;
  day?: WebsiteDay;
  config: WebsiteConfig;
  /** 编辑看板交通副本；复制时仅预填交通方式，城市保持空白。 */
  leg?: WebsiteLeg;
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
const formRef = ref<FormInstance>();
const details = ref<Pick<WebsiteLeg, "vehicleType" | "distanceKm" | "durationMinutes" | "showInMileage">>({});
const rules = computed(() => transportRules(t));
const effectiveMode = computed(() => source.value === "route" ? selected.value?.mode ?? mode.value : mode.value);

const routes = computed(() =>
  props.config.routes.filter(
    (route) =>
      route.status === "enabled" &&
      (!fromCityId.value || route.fromCityId === fromCityId.value) &&
      (!toCityId.value || route.toCityId === toCityId.value),
  ),
);
const vehicleOptions = computed(() => source.value === "route"
  ? selected.value?.vehicleOptions ?? []
  : routes.value.filter(route => route.mode === "private_vehicle").flatMap(route => route.vehicleOptions ?? []));
const selected = computed(() => routes.value.find((route) => route.id === selectedId.value));
watch(selected, (route) => {
  if (route) details.value = { vehicleType: route.mode === "private_vehicle" && route.vehicleOptions?.length === 1 ? route.vehicleOptions[0]!.vehicleType : null, distanceKm: route.distanceKm ?? null, durationMinutes: route.mode === "private_vehicle" ? (route.vehicleOptions?.length === 1 ? route.vehicleOptions[0]!.durationMinutes : null) : route.durationMinutes ?? null, showInMileage: false };
}, { flush: "sync" });
watch(effectiveMode, (value) => { if (value !== "private_vehicle") details.value.vehicleType = null; });

const canSubmit = computed(() =>
  source.value === "route" ? Boolean(selected.value) : Boolean(fromCityId.value && toCityId.value),
);

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;
    source.value = props.leg ? (props.leg.routeId ? "route" : "manual") : "route";
    fromCityId.value = props.leg?.fromCityId ?? props.day?.departCityId ?? "";
    toCityId.value = props.leg?.toCityId ?? props.day?.endCityId ?? "";
    selectedId.value = props.leg?.routeId ?? "";
    mode.value = props.leg?.mode ?? "private_vehicle";
    nameZh.value = props.leg?.nameZh ?? "";
    nameEn.value = props.leg?.nameEn ?? "";
    details.value = { vehicleType: props.leg?.vehicleType ?? null, distanceKm: props.leg?.distanceKm ?? null, durationMinutes: props.leg?.durationMinutes ?? null, showInMileage: props.leg?.showInMileage ?? false };
    formRef.value?.clearValidate();
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
function vehicleLabel(value: WebsiteLeg["vehicleType"]) {
  const option = VEHICLE_OPTIONS.find(item => item.value === value);
  return option ? t(option.labelKey) : value || t("websiteReport.notSpecified");
}
function close() {
  emit("update:modelValue", false);
}
async function submit() {
  if (!canSubmit.value || !(await formRef.value?.validate().catch(() => false))) return;
  const route = selected.value;
  emit(
    "submit",
    source.value === "route" && route
      ? {
        id: props.leg?.id ?? crypto.randomUUID(),
        routeId: route.id,
        fromCityId: route.fromCityId,
        toCityId: route.toCityId,
        mode: route.mode,
        nameZh: route.nameZh,
        nameEn: route.nameEn,
        feeState: props.leg?.routeId === route.id ? props.leg.feeState : route.feeState,
        ...details.value,
        vehicleType: effectiveMode.value === "private_vehicle" ? details.value.vehicleType ?? null : null,
      }
      : {
        id: props.leg?.id ?? crypto.randomUUID(),
        routeId: null,
        fromCityId: fromCityId.value,
        toCityId: toCityId.value,
        mode: mode.value,
        nameZh: nameZh.value.trim(),
        nameEn: nameEn.value.trim(),
        feeState: props.leg?.feeState ?? "INCLUDED",
        ...details.value,
        vehicleType: effectiveMode.value === "private_vehicle" ? details.value.vehicleType ?? null : null,
      },
  );
  close();
}
</script>
