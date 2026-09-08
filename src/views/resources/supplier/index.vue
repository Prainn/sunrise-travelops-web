<template>
  <div class="resource-page">
    <ResourceTable
      :rows="rows"
      :columns="columns"
      :permissions="RESOURCE_PERMISSIONS.supplier"
      @refresh="loadRecords"
      @query-change="loadRecords"
      @create="openCreateDialog"
      @edit="editSupplier"
      @toggle-status="toggleSupplierStatus"
      @delete="deleteSupplier"
    />
    <ResourceEditorDialog
      v-model="isDialogVisible"
      :record="record"
      :fields="fields"
      :title-key="isEditing ? 'resource.editTitle' : 'resource.createTitle'"
      @submit="saveSupplier"
    />
  </div>
</template>

<script setup lang="ts">
import { RESOURCE_PERMISSIONS } from "@/constants";
import { resourceService } from "@/services/resource.service";
import type { SupplierRecord } from "@/types/resource";
import ResourceEditorDialog from "../components/ResourceEditorDialog.vue";
import ResourceTable from "../components/ResourceTable.vue";
import type { ResourceColumn, ResourceFormField, ResourceRow } from "../types";
import { createEmptyTourismResourceRecord, useResourceMaintenance } from "../useResourceMaintenance";

defineOptions({ name: "Supplier" });

const columns: ResourceColumn[] = [
  {
    "prop": "code",
    "labelKey": "resource.code"
  },
  {
    "prop": "name",
    "labelKey": "resource.supplierName",
    "minWidth": 180
  },
  {
    "prop": "city",
    "labelKey": "resource.city"
  },
  {
    "prop": "contact",
    "labelKey": "resource.contact"
  },
  {
    "prop": "phone",
    "labelKey": "resource.phone",
    "minWidth": 140
  }
];
const fields: ResourceFormField[] = [
  {
    "prop": "name",
    "labelKey": "resource.supplierName",
    "required": true
  },
  {
    "prop": "city",
    "labelKey": "resource.city"
  },
  {
    "prop": "contact",
    "labelKey": "resource.contact"
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
];
const { rows, record, isDialogVisible, isEditing, loadRecords, openCreateDialog, openEditDialog, toggleStatus, saveRecord, deleteRecord } = useResourceMaintenance<SupplierRecord>({
  records: resourceService.suppliers,
  api: resourceService.supplierApi,
  loadRecords: (query) => resourceService.loadSuppliers(query),
  codePrefix: "SUP",
  createEmpty: createEmptyTourismResourceRecord,
});

function editSupplier(record: ResourceRow) {
  return openEditDialog(record as SupplierRecord);
}

function toggleSupplierStatus(record: ResourceRow) {
  return toggleStatus(record as SupplierRecord);
}

function deleteSupplier(record: ResourceRow) {
  return deleteRecord(record as SupplierRecord);
}

function saveSupplier(record: ResourceRow) {
  return saveRecord(record as SupplierRecord);
}
</script>
