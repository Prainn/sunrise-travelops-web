<template>
  <div class="resource-page">
    <AttractionTable
      :rows="attractionStore"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
      @delete="deleteAttraction"
      @create-price="openCreatePriceDialog"
      @edit-price="openEditPriceDialog"
      @delete-price="deletePrice"
    />
    <AttractionEditorDialog
      v-model="isAttractionDialogVisible"
      :record="attractionForm"
      :is-editing="isEditing"
      @submit="saveAttraction"
    />
    <AttractionPriceDialog
      v-model="isPriceDialogVisible"
      :record="priceForm"
      :is-editing="Boolean(editingPriceId)"
      @submit="savePrice"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import { attractions } from "@/data/data";
import type { AttractionPriceRecord, AttractionRecord } from "@/types/resource";
import { createId } from "@/utils";
import { useResourceMaintenance } from "../useResourceMaintenance";
import AttractionEditorDialog from "./components/AttractionEditorDialog.vue";
import AttractionPriceDialog from "./components/AttractionPriceDialog.vue";
import AttractionTable from "./components/AttractionTable.vue";

defineOptions({ name: "Attraction" });

const { t } = useI18n();
const isPriceDialogVisible = ref(false);
const editingPriceId = ref("");
const selectedAttraction = ref<AttractionRecord>();
const priceForm = ref<AttractionPriceRecord>(createEmptyPrice());

function createEmptyAttraction(): AttractionRecord {
  return { id: "", code: "", name: "", area: "", category: "scenic", restroomLocation: "", remark: "", unit: "personVisit", status: "enabled", prices: [] };
}
function createEmptyPrice(): AttractionPriceRecord {
  return { id: "", itemType: "ticket", itemName: "景区门票", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 0, settlementPrice: 0, unit: "personVisit", isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" };
}
const {
  rows: attractionStore,
  record: attractionForm,
  isDialogVisible: isAttractionDialogVisible,
  isEditing,
  openCreateDialog,
  openEditDialog,
  toggleStatus,
  saveRecord: saveAttraction,
  deleteRecord: deleteAttraction,
} = useResourceMaintenance<AttractionRecord>({
  records: attractions,
  idPrefix: "attraction",
  codePrefix: "ATT",
  createEmpty: createEmptyAttraction,
  cloneForEdit: (record) => ({ ...record, prices: record.prices }),
  createRecord: (record, id) => ({ ...record, id, prices: [] }),
  updateRecord: (current, record) => {
    Object.assign(current, record, { prices: current.prices });
    current.prices.forEach((price) => { price.unit = current.unit; });
  },
});
function openCreatePriceDialog(record: AttractionRecord) {
  selectedAttraction.value = record;
  editingPriceId.value = "";
  priceForm.value = { ...createEmptyPrice(), unit: record.unit };
  isPriceDialogVisible.value = true;
}
function openEditPriceDialog(record: AttractionRecord, price: AttractionPriceRecord) {
  selectedAttraction.value = record;
  editingPriceId.value = price.id;
  priceForm.value = { ...price };
  isPriceDialogVisible.value = true;
}
function savePrice(price: AttractionPriceRecord) {
  if (!selectedAttraction.value) return;
  const current = selectedAttraction.value.prices.find((item) => item.id === editingPriceId.value);
  if (current) Object.assign(current, price);
  else selectedAttraction.value.prices.push({ ...price, id: createId("attraction-price") });
  isPriceDialogVisible.value = false;
  ElMessage.success(t(current ? "common.updateSuccess" : "common.createSuccess"));
}
async function deletePrice(record: AttractionRecord, price: AttractionPriceRecord) {
  try {
    await ElMessageBox.confirm(t("attraction.deletePriceConfirm"), t("common.tip"), { type: "warning" });
  } catch {
    return;
  }
  const index = record.prices.findIndex((item) => item.id === price.id);
  if (index < 0) return;
  record.prices.splice(index, 1);
  ElMessage.success(t("common.deleteSuccess"));
}
</script>
