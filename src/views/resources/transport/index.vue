<template>
  <div class="resource-page">
    <ResourceTable
      :total="total"
      :rows="tableRows"
      :columns="columns"
      :permissions="RESOURCE_PERMISSIONS.transport"
      :filters="queryFilters"
      @refresh="loadRecords"
      @query-change="loadRecords"
      @reset-query="resetQuery"
      @create="openCreateDialog"
      @edit="editTransport"
      @toggle-status="toggleTransportStatus"
      @delete="deleteTransport"
    >
      <template #filters>
        <el-form-item :label="$t('resource.vehicleServiceLevel')">
          <el-select
            v-model="serviceLevel"
            :placeholder="$t('common.all')"
            clearable
            class="transport-page__service-level-select"
          >
            <el-option
              :label="$t('resource.vehicleServiceLevels.standard')"
              value="standard"
            />
            <el-option
              :label="$t('resource.vehicleServiceLevels.vip')"
              value="vip"
            />
          </el-select>
        </el-form-item>
      </template>
    </ResourceTable>
    <ResourceEditorDialog
      v-model="isDialogVisible"
      :record="record"
      :fields="fields"
      :title-key="isEditing ? 'resource.editTitle' : 'resource.createTitle'"
      :is-editing="isEditing"
      @submit="saveTransport"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { RESOURCE_PERMISSIONS } from "@/constants";
import { resourceService } from "@/services/resource.service";
import type { ResourceListQuery, TransportRecord, VehicleServiceLevel } from "@/types/resource";
import { getResourceUnitOptions } from "@/utils/resource-unit";
import ResourceEditorDialog from "../components/ResourceEditorDialog.vue";
import ResourceTable from "../components/ResourceTable.vue";
import type { ResourceColumn, ResourceFormField, ResourceRow } from "../types";
import { useResourceMaintenance } from "../useResourceMaintenance";

defineOptions({ name: "TransportResource" });

const { locale, t } = useI18n();
const serviceLevel = ref<VehicleServiceLevel | "">("");
const queryFilters = computed<ResourceListQuery>(() => ({
  serviceLevel: serviceLevel.value || undefined,
}));

const columns: ResourceColumn[] = [
  {
    "prop": "code",
    "labelKey": "resource.code"
  },
  {
    "prop": "name",
    "labelKey": "resource.vehicleModel",
    "minWidth": 180
  },
  {
    "prop": "serviceLevelLabel",
    "labelKey": "resource.vehicleServiceLevel"
  },
  {
    "prop": "seats",
    "labelKey": "resource.seats"
  },
];
const fields = computed<ResourceFormField[]>(() => [
  {
    "prop": "name",
    "labelKey": "resource.vehicleModel",
    "required": true
  },
  {
    "prop": "serviceLevel",
    "labelKey": "resource.vehicleServiceLevel",
    "required": true,
    "type": "select",
    "options": [
      { label: t("resource.vehicleServiceLevels.standard"), value: "standard" },
      { label: t("resource.vehicleServiceLevels.vip"), value: "vip" },
    ]
  },
  {
    "prop": "seats",
    "labelKey": "resource.seats",
    "type": "number"
  },
  {
    "prop": "unit",
    "labelKey": "resource.priceUnit",
    "required": true,
    "type": "select",
    "options": getResourceUnitOptions("vehicle", locale.value)
  },
  {
    "prop": "phone",
    "labelKey": "resource.phone"
  },
  {
    "prop": "remark",
    "labelKey": "common.remark",
    "type": "textarea"
  }
]);
const { rows, total, record, isDialogVisible, isEditing, loadRecords, openCreateDialog, openEditDialog, toggleStatus, saveRecord, deleteRecord } = useResourceMaintenance<TransportRecord>({
  records: resourceService.transports,
  api: resourceService.transportApi,
  loadRecords: (query) => resourceService.loadTransports(query),
  createEmpty: () => ({
    id: "", code: "", name: "", serviceLevel: "standard", seats: 1,
    unit: "vehicleDay", phone: "", status: "enabled", remark: "",
  }),
});
const tableRows = computed(() => rows.map((row) => ({
  ...row,
  serviceLevelLabel: t(`resource.vehicleServiceLevels.${row.serviceLevel}`),
})));

function editTransport(record: ResourceRow) {
  return openEditDialog(record as TransportRecord);
}

function toggleTransportStatus(record: ResourceRow) {
  return toggleStatus(record as TransportRecord);
}

function deleteTransport(record: ResourceRow) {
  return deleteRecord(record as TransportRecord);
}

function saveTransport(record: ResourceRow) {
  return saveRecord(record as TransportRecord);
}

function resetQuery() {
  serviceLevel.value = "";
}
</script>

<style scoped lang="scss">
.transport-page__service-level-select {
  @apply 'w-[150px]';
}
</style>
