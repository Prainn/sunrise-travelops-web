<template>
  <div class="resource-page">
    <ResourceTable
      :loading="isLoading"
      :rows="rows"
      :total="total"
      :columns="columns"
      :permissions="RESOURCE_PERMISSIONS.flight"
      :filters="queryFilters"
      search-placeholder-key="flight.searchPlaceholder"
      @refresh="loadRecords"
      @query-change="loadRecords"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
      @delete="deleteRecord"
      @reset-query="resetFilters"
    >
      <template #column-departureAirport="{ row }">
        {{ row.departureAirport ? airportText(row.departureAirport) : $t('flight.pendingAirport', { city: row.departureCity ?? '-' }) }}
      </template>
      <template #column-arrivalAirport="{ row }">
        {{ row.arrivalAirport ? airportText(row.arrivalAirport) : $t('flight.pendingAirport', { city: row.arrivalCity ?? '-' }) }}
      </template>
      <template #filters>
        <el-form-item :label="$t('flight.departureAirport')">
          <BusinessItemSelect
            v-model="departureAirportId"
            type-code="city-airport"
            clearable
            class="!w-[220px]"
          />
        </el-form-item>
        <el-form-item :label="$t('flight.arrivalAirport')">
          <BusinessItemSelect
            v-model="arrivalAirportId"
            type-code="city-airport"
            clearable
            class="!w-[220px]"
          />
        </el-form-item>
        <el-form-item :label="$t('common.status')">
          <el-select
            v-model="status"
            :placeholder="$t('flight.allStatuses')"
            class="!w-[150px]"
            clearable
          >
            <el-option value="enabled" :label="$t('common.enabled')" />
            <el-option value="disabled" :label="$t('common.disabled')" />
          </el-select>
        </el-form-item>
      </template>
    </ResourceTable>
    <FlightEditorDialog
      v-model="isDialogVisible"
      :record="record"
      :is-editing="isEditing"
      :submit="saveRecord"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { RESOURCE_PERMISSIONS } from "@/constants";
import { resourceService } from "@/services/resource.service";
import type { AirportLabel, FlightRecord, ResourceListQuery, ResourceStatus } from "@/types/resource";
import ResourceTable from "../components/ResourceTable.vue";
import type { ResourceColumn } from "../types";
import { useResourceMaintenance } from "../useResourceMaintenance";
import FlightEditorDialog from "./components/FlightEditorDialog.vue";

defineOptions({ name: "FlightResource" });

const { locale } = useI18n();
function airportText(airport?: AirportLabel | null) {
  if (!airport) return "-";
  return `${locale.value === "en" ? airport.englishName : airport.name} (${airport.code})`;
}
const status = ref<ResourceStatus | "">("");
const departureAirportId = ref("");
const arrivalAirportId = ref("");
function resetFilters() {
  status.value = "";
  departureAirportId.value = "";
  arrivalAirportId.value = "";
}
const queryFilters = computed<ResourceListQuery>(() => ({
  status: status.value || undefined,
  departureAirportId: departureAirportId.value || undefined,
  arrivalAirportId: arrivalAirportId.value || undefined,
}));
const columns: ResourceColumn[] = [
  { prop: "departureAirport", labelKey: "flight.departureAirport", minWidth: 200 },
  { prop: "arrivalAirport", labelKey: "flight.arrivalAirport", minWidth: 200 },
  { prop: "flightNumber", labelKey: "flight.flightNumber" },
  { prop: "departureTime", labelKey: "flight.departureTime" },
  { prop: "arrivalTime", labelKey: "flight.arrivalTime" },
];
const {
  isLoading,
  rows,
  total,
  record,
  isDialogVisible,
  isEditing,
  loadRecords,
  openCreateDialog,
  openEditDialog,
  toggleStatus,
  saveRecord,
  deleteRecord,
} = useResourceMaintenance<FlightRecord>({
  records: resourceService.flights,
  api: resourceService.flightApi,
  loadRecords: (query) => resourceService.loadFlights(query),
  createEmpty: () => ({
    id: "",
    departureAirportId: "",
    arrivalAirportId: "",
    flightNumber: "",
    departureTime: "",
    arrivalTime: "",
    status: "enabled",
  }),
  selectLibraryInDialog: true,
});
</script>
