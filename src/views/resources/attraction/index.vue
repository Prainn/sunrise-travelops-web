<template>
  <div class="resource-page">
    <AttractionTable
      :loading="isLoading"
      :total="total"
      :rows="attractionStore"
      @refresh="loadRecords"
      @query-change="loadRecords"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
      @delete="deleteAttraction"
    />
    <AttractionEditorDialog
      v-model="isAttractionDialogVisible"
      :record="attractionForm"
      :is-editing="isEditing"
      :submit="saveAttraction"
    />
  </div>
</template>

<script setup lang="ts">
import { resourceService } from "@/services/resource.service";
import type { AttractionRecord } from "@/types/resource";
import { useResourceMaintenance } from "../useResourceMaintenance";
import AttractionEditorDialog from "./components/AttractionEditorDialog.vue";
import AttractionTable from "./components/AttractionTable.vue";

defineOptions({ name: "Attraction" });

function createEmptyAttraction(): AttractionRecord {
  return {
    id: "",
    code: "",
    name: "",
    englishName: "",
    area: "",
    category: null,
    restroomLocation: "",
    description: "",
    englishDescription: "",
    isStandardPrice: false,
    remark: "",
    unit: "personVisit",
    price: null,
    status: "enabled",
  };
}
const {
  isLoading,
  rows: attractionStore,
  record: attractionForm,
  isDialogVisible: isAttractionDialogVisible,
  isEditing,
  total,
  loadRecords,
  openCreateDialog,
  openEditDialog,
  toggleStatus,
  saveRecord: saveAttraction,
  deleteRecord: deleteAttraction,
} = useResourceMaintenance<AttractionRecord>({
  records: resourceService.attractions,
  api: resourceService.attractionApi,
  loadRecords: (query) => resourceService.loadAttractions(query),
  createEmpty: createEmptyAttraction,
  cloneForEdit: (record) => ({ ...record }),
  createRecord: (record, id) => ({ ...record, id }),
  updateRecord: (current, record) => Object.assign(current, record),
});
</script>
