<template>
  <div class="resource-page">
    <GuideTable
      :total="total"
      :rows="guideStore"
      @refresh="loadRecords"
      @query-change="loadRecords"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
      @delete="deleteGuide"
    />
    <GuideEditorDialog
      v-model="isDialogVisible"
      :record="guideForm"
      :is-editing="isEditing"
      @submit="saveGuide"
    />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { resourceService } from "@/services/resource.service";
import type { GuideRecord } from "@/types/resource";
import { useResourceMaintenance } from "../useResourceMaintenance";
import GuideEditorDialog from "./components/GuideEditorDialog.vue";
import GuideTable from "./components/GuideTable.vue";

defineOptions({ name: "Guide" });

let areSupplierOptionsLoaded = false;

function createEmptyGuide(): GuideRecord {
  return {
    id: "", code: "", certificateNo: "", name: "", gender: "male", age: 18, languages: [],
    employmentType: "full-time", identityNumber: "", phone: "", dailyPrice: 0, unit: "guideDay", hasLaborContract: false,
    groundOperatorId: "", licensePhotoUrl: "", remark: "", status: "enabled",
  };
}

const {
  rows: guideStore,
  record: guideForm,
  isDialogVisible,
  isEditing,
  total,
  loadRecords,
  openCreateDialog: openCreateGuideDialog,
  openEditDialog: openEditGuideDialog,
  toggleStatus,
  saveRecord: saveGuide,
  deleteRecord: deleteGuide,
} = useResourceMaintenance<GuideRecord>({
  records: resourceService.guides,
  api: resourceService.guideApi,
  loadRecords: (query) => resourceService.loadGuides(query),
  createEmpty: createEmptyGuide,
  cloneForEdit: (record) => ({ ...record, languages: [...record.languages] }),
  createRecord: (record, id) => ({ ...record, id, languages: [...record.languages] }),
  updateRecord: (current, record) => Object.assign(current, record, { languages: [...record.languages] }),
});

async function loadSupplierOptions() {
  if (areSupplierOptionsLoaded) return true;
  try {
    await resourceService.loadSupplierOptions();
    areSupplierOptionsLoaded = true;
    return true;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function openCreateDialog() {
  if (await loadSupplierOptions()) openCreateGuideDialog();
}

async function openEditDialog(record: GuideRecord) {
  if (await loadSupplierOptions()) await openEditGuideDialog(record);
}
</script>
