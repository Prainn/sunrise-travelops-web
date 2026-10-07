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
      @reset-query="status = ''"
    >
      <template #filters>
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
import { RESOURCE_PERMISSIONS } from "@/constants";
import { resourceService } from "@/services/resource.service";
import type { FlightRecord, ResourceListQuery, ResourceStatus } from "@/types/resource";
import ResourceTable from "../components/ResourceTable.vue";
import type { ResourceColumn } from "../types";
import { useResourceMaintenance } from "../useResourceMaintenance";
import FlightEditorDialog from "./components/FlightEditorDialog.vue";

defineOptions({ name: "FlightResource" });

const status = ref<ResourceStatus | "">("");
const queryFilters = computed<ResourceListQuery>(() => ({ status: status.value || undefined }));
const columns: ResourceColumn[] = [
  { prop: "departureCity", labelKey: "flight.departureCity", minWidth: 160 },
  { prop: "arrivalCity", labelKey: "flight.arrivalCity", minWidth: 160 },
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
    departureCity: "",
    arrivalCity: "",
    flightNumber: "",
    departureTime: "",
    arrivalTime: "",
    status: "enabled",
  }),
  selectLibraryInDialog: true,
});
</script>
