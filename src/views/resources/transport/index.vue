<template>
  <div class="resource-page">
    <ResourceTable
      :total="total"
      :rows="tableRows"
      :columns="columns"
      :permissions="RESOURCE_PERMISSIONS.transport"
      @refresh="loadRecords"
      @query-change="loadRecords"
      @create="openCreateDialog"
      @edit="editTransport"
      @toggle-status="toggleTransportStatus"
      @delete="deleteTransport"
    />
    <ResourceEditorDialog
      v-model="isDialogVisible"
      :record="record"
      :fields="fields"
      :title-key="isEditing ? 'resource.editTitle' : 'resource.createTitle'"
      @submit="saveTransport"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { RESOURCE_PERMISSIONS } from "@/constants";
import { resourceService } from "@/services/resource.service";
import type { TransportRecord } from "@/types/resource";
import { getResourceUnitOptions } from "@/utils/resource-unit";
import ResourceEditorDialog from "../components/ResourceEditorDialog.vue";
import ResourceTable from "../components/ResourceTable.vue";
import type { ResourceColumn, ResourceFormField, ResourceRow } from "../types";
import { useResourceMaintenance } from "../useResourceMaintenance";

defineOptions({ name: "TransportResource" });

const { locale, t } = useI18n();

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
  {
    "prop": "dailyPrice",
    "labelKey": "resource.dailyPrice"
  },
  {
    "prop": "city",
    "labelKey": "resource.city"
  }
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
    "prop": "dailyPrice",
    "labelKey": "resource.dailyPrice",
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
    "prop": "city",
    "labelKey": "resource.city"
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
  codePrefix: "VEH",
  createEmpty: () => ({
    id: "", code: "", name: "", serviceLevel: "standard", seats: 1, dailyPrice: 0,
    unit: "vehicleDay", city: "", phone: "", status: "enabled", remark: "",
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
</script>
