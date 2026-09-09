<template>
  <div class="resource-page">
    <GuideTable
      :total="total"
      :rows="guideStore"
      @refresh="loadRecords"
      @query-change="loadRecords"
      @create="openCreateDialog"
      @edit="openEditDialog"
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
import { resourceService } from "@/services/resource.service";
import type { GuideRecord } from "@/types/resource";
import { useResourceMaintenance } from "../useResourceMaintenance";
import GuideEditorDialog from "./components/GuideEditorDialog.vue";
import GuideTable from "./components/GuideTable.vue";

defineOptions({ name: "Guide" });

function createEmptyGuide(): GuideRecord { return { id: "", code: "", name: "", secondLanguage: "none", shopping: false, dailyPrice: 0, status: "enabled" }; }

const {
  rows: guideStore,
  record: guideForm,
  isDialogVisible,
  isEditing,
  total,
  loadRecords,
  openCreateDialog,
  openEditDialog,
  saveRecord: saveGuide,
  deleteRecord: deleteGuide,
} = useResourceMaintenance<GuideRecord>({
  records: resourceService.guides,
  api: resourceService.guideApi,
  loadRecords: (query) => resourceService.loadGuides(query),
  createEmpty: createEmptyGuide,
});
</script>
