<template>
  <div class="resource-page">
    <ResourceTable
      :total="total"
      :rows="rows"
      :columns="columns"
      :permissions="RESOURCE_PERMISSIONS.city"
      @refresh="loadRecords"
      @query-change="loadRecords"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
      @delete="deleteRecord"
    />
    <ResourceEditorDialog
      v-model="isDialogVisible"
      :record="record"
      :fields="fields"
      :title-key="isEditing ? 'city.edit' : 'city.create'"
      @submit="saveRecord"
    />
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { RESOURCE_PERMISSIONS } from "@/constants";
import { resourceService } from "@/services/resource.service";
import type { CityRecord } from "@/types/resource";
import ResourceEditorDialog from "../components/ResourceEditorDialog.vue";
import ResourceTable from "../components/ResourceTable.vue";
import type { ResourceColumn, ResourceFormField, ResourceRow } from "../types";
import { useResourceMaintenance } from "../useResourceMaintenance";
defineOptions({ name: "CityResource" });
const columns: ResourceColumn[] = [
  { prop: "code", labelKey: "resource.code" }, { prop: "name", labelKey: "resource.city" }, { prop: "province", labelKey: "city.province" },
];
const maintenance = useResourceMaintenance<CityRecord>({
  records: resourceService.cities, api: resourceService.cityApi, loadRecords: (query) => resourceService.loadCities(query), codePrefix: "CITY",
  createEmpty: () => ({ id: "", code: "", name: "", province: "", status: "enabled" }),
});
const { rows, total, record, isDialogVisible, isEditing, loadRecords, openCreateDialog } = maintenance;
const fields = computed<ResourceFormField[]>(() => [
  { prop: "name", labelKey: "resource.city", required: true, disabled: isEditing.value },
  { prop: "province", labelKey: "city.province" },
]);
const openEditDialog = (row: ResourceRow) => maintenance.openEditDialog(row as CityRecord);
const toggleStatus = (row: ResourceRow) => maintenance.toggleStatus(row as CityRecord);
const deleteRecord = (row: ResourceRow) => maintenance.deleteRecord(row as CityRecord);
const saveRecord = (row: ResourceRow) => maintenance.saveRecord(row as CityRecord);
</script>
