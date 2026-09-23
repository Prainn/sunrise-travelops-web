<template>
  <div class="resource-page">
    <ResourceTable
      :loading="isLoading"
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
      :is-editing="isEditing"
      @submit="saveRecord"
    />
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import { RESOURCE_PERMISSIONS } from "@/constants";
import { businessDictionaryService } from "@/services/business-dictionary.service";
import { resourceService } from "@/services/resource.service";
import type { CityRecord } from "@/types/resource";
import ResourceEditorDialog from "../components/ResourceEditorDialog.vue";
import ResourceTable from "../components/ResourceTable.vue";
import type { ResourceColumn, ResourceFormField, ResourceRow } from "../types";
import { useResourceMaintenance } from "../useResourceMaintenance";
defineOptions({ name: "CityResource" });
const columns: ResourceColumn[] = [
  { prop: "code", labelKey: "resource.code" },
  { prop: "name", labelKey: "resource.city" },
  { prop: "province", labelKey: "city.province" },
];
const provinceOptions = ref<Array<{ label: string; value: string }>>([]);
const maintenance = useResourceMaintenance<CityRecord>({
  records: resourceService.cities,
  api: resourceService.cityApi,
  loadRecords: (query) => resourceService.loadCities(query),
  createEmpty: () => ({ id: "", code: "", name: "", province: "", status: "enabled" }),
  selectLibraryInDialog: true,
});
const { isLoading, rows, total, record, isDialogVisible, isEditing, loadRecords } = maintenance;
const fields = computed<ResourceFormField[]>(() => [
  { prop: "name", labelKey: "resource.city", required: true, disabled: isEditing.value },
  {
    prop: "province",
    labelKey: "city.province",
    type: "select",
    clearable: true,
    options: provinceOptions.value,
  },
]);
async function loadProvinceOptions() {
  try {
    const items = await businessDictionaryService.getItems("province", { status: "enabled" });
    provinceOptions.value = items.map((item) => ({ label: item.name, value: item.name }));
    return true;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}
async function openCreateDialog() {
  if (await loadProvinceOptions()) maintenance.openCreateDialog();
}
async function openEditDialog(row: ResourceRow) {
  if (await loadProvinceOptions()) await maintenance.openEditDialog(row as CityRecord);
}
const toggleStatus = (row: ResourceRow) => maintenance.toggleStatus(row as CityRecord);
const deleteRecord = (row: ResourceRow) => maintenance.deleteRecord(row as CityRecord);
const saveRecord = (row: ResourceRow) => maintenance.saveRecord(row as CityRecord);
</script>
