<template>
  <div class="resource-page">
    <AttractionTable
      :rows="attractionStore"
      @refresh="loadRecords"
      @query-change="loadRecords"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
      @delete="deleteAttraction"
      @expand="loadAttractionPrices"
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
import { resourceService } from "@/services/resource.service";
import type { AttractionPriceRecord, AttractionRecord, ResourceListQuery } from "@/types/resource";
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
const loadedAttractionPriceIds = new Set<string>();
const loadingAttractionPriceIds = new Set<string>();

function createEmptyAttraction(): AttractionRecord {
  return { id: "", code: "", name: "", area: "", category: "scenic", restroomLocation: "", remark: "", unit: "personVisit", status: "enabled", prices: [] };
}
function createEmptyPrice(): AttractionPriceRecord {
  return { id: "", itemType: "ticket", itemName: "景区门票", audience: "成人", periodName: "常规期", startDate: "", endDate: "", rackPrice: 0, settlementPrice: 0, unit: "personVisit", isFree: false, priceNote: "", };
}
const {
  rows: attractionStore,
  record: attractionForm,
  isDialogVisible: isAttractionDialogVisible,
  isEditing,
  loadRecords,
  openCreateDialog,
  openEditDialog,
  toggleStatus,
  saveRecord: saveAttraction,
  deleteRecord: deleteAttraction,
} = useResourceMaintenance<AttractionRecord>({
  records: resourceService.attractions,
  api: resourceService.attractionApi,
  loadRecords: loadAttractions,
  codePrefix: "ATT",
  createEmpty: createEmptyAttraction,
  cloneForEdit: (record) => ({ ...record, prices: record.prices }),
  createRecord: (record, id) => ({ ...record, id, prices: [] }),
  updateRecord: (current, record) => {
    Object.assign(current, record, { prices: current.prices });
    current.prices.forEach((price) => { price.unit = current.unit; });
  },
});

async function loadAttractions(query?: ResourceListQuery) {
  loadedAttractionPriceIds.clear();
  return resourceService.loadAttractions(query);
}

async function loadAttractionPrices(record: AttractionRecord) {
  if (loadedAttractionPriceIds.has(record.id) || loadingAttractionPriceIds.has(record.id)) return;
  loadingAttractionPriceIds.add(record.id);
  try {
    await resourceService.loadAttractionPrices(record.id);
    loadedAttractionPriceIds.add(record.id);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    loadingAttractionPriceIds.delete(record.id);
  }
}

async function openCreatePriceDialog(record: AttractionRecord) {
  selectedAttraction.value = record;
  editingPriceId.value = "";
  priceForm.value = { ...createEmptyPrice(), unit: record.unit };
  isPriceDialogVisible.value = true;
}
async function openEditPriceDialog(record: AttractionRecord, price: AttractionPriceRecord) {
  selectedAttraction.value = record;
  editingPriceId.value = price.id;
  priceForm.value = { ...price };
  isPriceDialogVisible.value = true;
}
async function savePrice(price: AttractionPriceRecord) {
  if (!selectedAttraction.value) return;
  const attraction = selectedAttraction.value;
  const current = attraction.prices.find((item) => item.id === editingPriceId.value);
  try {
    const saved = current
      ? await resourceService.attractionApi.updatePrice(attraction.id, current.id, price)
      : await resourceService.attractionApi.createPrice(attraction.id, price);
    if (current) Object.assign(current, saved);
    else attraction.prices.push(saved);
    attraction.priceCount = attraction.prices.length;
    isPriceDialogVisible.value = false;
    ElMessage.success(t(current ? "common.updateSuccess" : "common.createSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}
async function deletePrice(record: AttractionRecord, price: AttractionPriceRecord) {
  try {
    await ElMessageBox.confirm(t("attraction.deletePriceConfirm"), t("common.tip"), { type: "warning" });
  } catch {
    return;
  }
  try {
    await resourceService.attractionApi.deletePrices(record.id, price.id);
    const index = record.prices.findIndex((item) => item.id === price.id);
    if (index >= 0) record.prices.splice(index, 1);
    record.priceCount = record.prices.length;
    ElMessage.success(t("common.deleteSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}
</script>
