<template>
  <div class="resource-page">
    <ResourceTable
      :rows="rows"
      :columns="columns"
      :search-fields="['code', 'name', 'city']"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
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
import ResourceEditorDialog from "../components/ResourceEditorDialog.vue";
import ResourceTable from "../components/ResourceTable.vue";
import type { ResourceColumn, ResourceFormField } from "../types";
import { useResourceMaintenance } from "../useResourceMaintenance";

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
const { rows, record, isDialogVisible, isEditing, openCreateDialog, openEditDialog, toggleStatus, saveRecord } = useResourceMaintenance("supplier", "SUP");
</script>
