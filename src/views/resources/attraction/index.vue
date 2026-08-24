<template>
  <div class="resource-page">
    <AttractionTable
      :rows="attractionStore"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
      @create-price="openCreatePriceDialog"
      @edit-price="openEditPriceDialog"
      @delete-price="deletePrice"
    />
    <AttractionEditorDialog
      v-model="isAttractionDialogVisible"
      :record="attractionForm"
      :is-editing="Boolean(editingAttractionId)"
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
import { reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import {
  attractions,
  type AttractionPriceRecord,
  type AttractionRecord,
} from "@/data/data";
import AttractionEditorDialog from "./components/AttractionEditorDialog.vue";
import AttractionPriceDialog from "./components/AttractionPriceDialog.vue";
import AttractionTable from "./components/AttractionTable.vue";

defineOptions({ name: "Attraction" });

const { t } = useI18n();
const attractionStore = reactive(attractions);
const isAttractionDialogVisible = ref(false);
const isPriceDialogVisible = ref(false);
const editingAttractionId = ref("");
const editingPriceId = ref("");
const selectedAttraction = ref<AttractionRecord>();
const attractionForm = ref<AttractionRecord>(createEmptyAttraction());
const priceForm = ref<AttractionPriceRecord>(createEmptyPrice());

function createEmptyAttraction(): AttractionRecord {
  return { id: "", code: "", name: "", area: "", category: "scenic", restroomLocation: "", remark: "", status: "enabled", prices: [] };
}
function createEmptyPrice(): AttractionPriceRecord {
  return { id: "", itemType: "ticket", itemName: "景区门票", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 0, settlementPrice: 0, isFree: false, priceNote: "", isGroundOperatorProvided: false, groundOperatorId: "" };
}
function generateAttractionCode() {
  const max = attractionStore.reduce((value, record) => Math.max(value, Number(record.code.match(/^ATT-(\d+)$/)?.[1] ?? 0)), 0);
  return `ATT-${String(max + 1).padStart(3, "0")}`;
}
function openCreateDialog() {
  editingAttractionId.value = "";
  attractionForm.value = { ...createEmptyAttraction(), code: generateAttractionCode() };
  isAttractionDialogVisible.value = true;
}
function openEditDialog(record: AttractionRecord) {
  editingAttractionId.value = record.id;
  attractionForm.value = { ...record, prices: record.prices };
  isAttractionDialogVisible.value = true;
}
function saveAttraction(record: AttractionRecord) {
  const current = attractionStore.find((item) => item.id === editingAttractionId.value);
  if (current) Object.assign(current, record, { prices: current.prices });
  else attractionStore.push({ ...record, id: `attraction-${Date.now()}`, prices: [] });
  isAttractionDialogVisible.value = false;
  ElMessage.success(t(current ? "common.updateSuccess" : "common.createSuccess"));
}
function toggleStatus(record: AttractionRecord) {
  record.status = record.status === "enabled" ? "disabled" : "enabled";
  ElMessage.success(t("common.updateSuccess"));
}
function openCreatePriceDialog(record: AttractionRecord) {
  selectedAttraction.value = record;
  editingPriceId.value = "";
  priceForm.value = createEmptyPrice();
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
  else selectedAttraction.value.prices.push({ ...price, id: `attraction-price-${Date.now()}` });
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
