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
      :is-editing="Boolean(editingGuideId)"
      @submit="saveGuide"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import { guides, type GuideRecord } from "@/data/data";
import GuideEditorDialog from "./components/GuideEditorDialog.vue";
import GuideTable from "./components/GuideTable.vue";

defineOptions({ name: "Guide" });

const { t } = useI18n();
const guideStore = reactive(guides);
const isDialogVisible = ref(false);
const editingGuideId = ref("");
const guideForm = ref<GuideRecord>(createEmptyGuide());

function createEmptyGuide(): GuideRecord {
  return {
    id: "", code: "", certificateNo: "", name: "", gender: "male", age: 18, languages: [],
    employmentType: "full-time", identityNumber: "", phone: "", dailyPrice: 0, unit: "guideDay", hasLaborContract: false,
    isGroundOperatorProvided: false, groundOperatorId: "", licensePhotoUrl: "", remark: "", status: "enabled",
  };
}

function generateGuideCode() {
  const max = guideStore.reduce((value, record) => Math.max(value, Number(record.code.match(/^GDE-(\d+)$/)?.[1] ?? 0)), 0);
  return `GDE-${String(max + 1).padStart(3, "0")}`;
}

function openCreateDialog() {
  editingGuideId.value = "";
  guideForm.value = { ...createEmptyGuide(), code: generateGuideCode() };
  isDialogVisible.value = true;
}

function openEditDialog(record: GuideRecord) {
  editingGuideId.value = record.id;
  guideForm.value = { ...record, languages: [...record.languages] };
  isDialogVisible.value = true;
}

function saveGuide(record: GuideRecord) {
  const current = guideStore.find((item) => item.id === editingGuideId.value);
  if (current) Object.assign(current, record, { languages: [...record.languages] });
  else guideStore.push({ ...record, id: `guide-${Date.now()}`, languages: [...record.languages] });
  isDialogVisible.value = false;
  ElMessage.success(t(current ? "common.updateSuccess" : "common.createSuccess"));
}

function toggleStatus(record: GuideRecord) {
  record.status = record.status === "enabled" ? "disabled" : "enabled";
  ElMessage.success(t("common.updateSuccess"));
}
async function deleteGuide(record: GuideRecord) {
  try {
    await ElMessageBox.confirm(t("common.deleteConfirm"), t("common.tip"), { type: "warning" });
  } catch {
    return;
  }
  const index = guideStore.findIndex((item) => item.id === record.id);
  if (index < 0) return;
  guideStore.splice(index, 1);
  ElMessage.success(t("common.deleteSuccess"));
}
</script>
