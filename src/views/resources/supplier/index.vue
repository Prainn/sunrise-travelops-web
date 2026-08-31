<template>
  <div class="resource-page">
    <ResourceTable
      :rows="rows"
      :columns="columns"
      :search-fields="['code', 'name', 'city']"
      :permissions="RESOURCE_PERMISSIONS.supplier"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
      @delete="deleteRecord"
    />
    <ResourceEditorDialog
      v-model="isDialogVisible"
      :record="record"
      :fields="fields"
      :title-key="isEditing ? 'resource.editTitle' : 'resource.createTitle'"
      @submit="saveRecord"
    />
  </div>
</template>

<script setup lang="ts">
import { RESOURCE_PERMISSIONS } from "@/constants";
import { resourceService } from "@/services/resource.service";
import type { TourismResourceRecord } from "@/types/resource";
import ResourceEditorDialog from "../components/ResourceEditorDialog.vue";
import ResourceTable from "../components/ResourceTable.vue";
import type { ResourceColumn, ResourceFormField } from "../types";
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
const { rows, record, isDialogVisible, isEditing, openCreateDialog, openEditDialog, toggleStatus, saveRecord, deleteRecord } = useResourceMaintenance<TourismResourceRecord>({
  records: resourceService.suppliers,
  idPrefix: "supplier",
  codePrefix: "SUP",
  createEmpty: createEmptyTourismResourceRecord,
});
</script>
