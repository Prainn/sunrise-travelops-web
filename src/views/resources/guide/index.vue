<template>
  <div class="resource-page">
    <GuideTable
      :rows="guideStore"
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
import { guides } from "@/data/data";
import type { GuideRecord } from "@/types/resource";
import { useResourceMaintenance } from "../useResourceMaintenance";
import GuideEditorDialog from "./components/GuideEditorDialog.vue";
import GuideTable from "./components/GuideTable.vue";

defineOptions({ name: "Guide" });

function createEmptyGuide(): GuideRecord {
  return {
    id: "", code: "", certificateNo: "", name: "", gender: "male", age: 18, languages: [],
    employmentType: "full-time", identityNumber: "", phone: "", dailyPrice: 0, unit: "guideDay", hasLaborContract: false,
    isGroundOperatorProvided: false, groundOperatorId: "", licensePhotoUrl: "", remark: "", status: "enabled",
  };
}

const {
  rows: guideStore,
  record: guideForm,
  isDialogVisible,
  isEditing,
  openCreateDialog,
  openEditDialog,
  toggleStatus,
  saveRecord: saveGuide,
  deleteRecord: deleteGuide,
} = useResourceMaintenance<GuideRecord>({
  records: guides,
  idPrefix: "guide",
  codePrefix: "GDE",
  createEmpty: createEmptyGuide,
  cloneForEdit: (record) => ({ ...record, languages: [...record.languages] }),
  createRecord: (record, id) => ({ ...record, id, languages: [...record.languages] }),
  updateRecord: (current, record) => Object.assign(current, record, { languages: [...record.languages] }),
});
</script>
