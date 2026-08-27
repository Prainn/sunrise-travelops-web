<template>
  <div class="resource-page">
    <ResourceTable
      :rows="rows"
      :columns="columns"
      :search-fields="['code', 'name', 'countryOrRegion', 'contact', 'email', 'phone']"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
      @delete="deleteRecord"
    />
    <ResourceEditorDialog
      v-model="isDialogVisible"
      :record="record"
      :fields="fields"
      :title-key="isEditing ? 'resource.editAgencyTitle' : 'resource.createAgencyTitle'"
      @submit="saveRecord"
    />
  </div>
</template>

<script setup lang="ts">
import { tourismResources } from "@/data/data";
import type { TourismResourceRecord } from "@/types/resource";
import ResourceEditorDialog from "../components/ResourceEditorDialog.vue";
import ResourceTable from "../components/ResourceTable.vue";
import type { ResourceColumn, ResourceFormField } from "../types";
import { createEmptyTourismResourceRecord, useResourceMaintenance } from "../useResourceMaintenance";

defineOptions({ name: "Agency" });

const columns: ResourceColumn[] = [
  { prop: "code", labelKey: "resource.code" },
  { prop: "name", labelKey: "resource.agencyName", minWidth: 180 },
  { prop: "countryOrRegion", labelKey: "resource.countryOrRegion" },
  { prop: "contact", labelKey: "resource.contact" },
  { prop: "email", labelKey: "resource.email", minWidth: 180 },
  { prop: "phone", labelKey: "resource.phone", minWidth: 140 },
];
const fields: ResourceFormField[] = [
  { prop: "name", labelKey: "resource.agencyName", required: true },
  { prop: "countryOrRegion", labelKey: "resource.countryOrRegion", required: true },
  { prop: "contact", labelKey: "resource.contact", required: true },
  { prop: "email", labelKey: "resource.email" },
  { prop: "phone", labelKey: "resource.phone" },
  { prop: "remark", labelKey: "common.remark", type: "textarea" },
];
const { rows, record, isDialogVisible, isEditing, openCreateDialog, openEditDialog, toggleStatus, saveRecord, deleteRecord } = useResourceMaintenance<TourismResourceRecord>({
  records: tourismResources.agency,
  idPrefix: "agency",
  codePrefix: "AGY",
  createEmpty: createEmptyTourismResourceRecord,
});
</script>
