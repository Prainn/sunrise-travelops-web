<template>
  <div class="resource-page">
    <RestaurantTable
      :rows="restaurantStore"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
      @delete="deleteRestaurant"
      @create-price="openCreatePriceDialog"
      @edit-price="openEditPriceDialog"
      @delete-price="deletePrice"
    />
    <RestaurantEditorDialog
      v-model="isRestaurantDialogVisible"
      :record="restaurantForm"
      :is-editing="isEditing"
      @submit="saveRestaurant"
    />
    <RestaurantPriceDialog
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
import { restaurants } from "@/data/data";
import type { RestaurantPriceRecord, RestaurantRecord } from "@/types/resource";
import { createId } from "@/utils";
import { useResourceMaintenance } from "../useResourceMaintenance";
import RestaurantEditorDialog from "./components/RestaurantEditorDialog.vue";
import RestaurantPriceDialog from "./components/RestaurantPriceDialog.vue";
import RestaurantTable from "./components/RestaurantTable.vue";

defineOptions({ name: "Restaurant" });

const { t } = useI18n();
const isPriceDialogVisible = ref(false);
const editingPriceId = ref("");
const selectedRestaurant = ref<RestaurantRecord>();
const priceForm = ref<RestaurantPriceRecord>(createEmptyPrice());

function createEmptyRestaurant(): RestaurantRecord {
  return {
    id: "", code: "", name: "", city: "", cuisine: "", contact: "", phone: "", address: "",
    remark: "", unit: "personMeal", status: "enabled", prices: [],
  };
}

function createEmptyPrice(): RestaurantPriceRecord {
  return {
    id: "", menuName: "", dishDetails: "", unit: "personMeal", price: 0, dinerCount: 10, remark: "",
    isGroundOperatorProvided: false, groundOperatorId: "",
  };
}

const {
  rows: restaurantStore,
  record: restaurantForm,
  isDialogVisible: isRestaurantDialogVisible,
  isEditing,
  openCreateDialog,
  openEditDialog,
  toggleStatus,
  saveRecord: saveRestaurant,
  deleteRecord: deleteRestaurant,
} = useResourceMaintenance<RestaurantRecord>({
  records: restaurants,
  idPrefix: "restaurant",
  codePrefix: "RES",
  createEmpty: createEmptyRestaurant,
  cloneForEdit: (record) => ({ ...record, prices: record.prices }),
  createRecord: (record, id) => ({ ...record, id, prices: [] }),
  updateRecord: (current, record) => Object.assign(current, record, { prices: current.prices }),
});

function openCreatePriceDialog(record: RestaurantRecord) {
  selectedRestaurant.value = record;
  editingPriceId.value = "";
  priceForm.value = { ...createEmptyPrice(), unit: record.unit };
  isPriceDialogVisible.value = true;
}

function openEditPriceDialog(record: RestaurantRecord, price: RestaurantPriceRecord) {
  selectedRestaurant.value = record;
  editingPriceId.value = price.id;
  priceForm.value = { ...price };
  isPriceDialogVisible.value = true;
}

function savePrice(price: RestaurantPriceRecord) {
  if (!selectedRestaurant.value) return;
  const current = selectedRestaurant.value.prices.find((item) => item.id === editingPriceId.value);
  if (current) Object.assign(current, price);
  else selectedRestaurant.value.prices.push({ ...price, id: createId("restaurant-price") });
  isPriceDialogVisible.value = false;
  ElMessage.success(t(current ? "common.updateSuccess" : "common.createSuccess"));
}

async function deletePrice(record: RestaurantRecord, price: RestaurantPriceRecord) {
  try {
    await ElMessageBox.confirm(t("restaurant.deletePriceConfirm"), t("common.tip"), { type: "warning" });
  } catch {
    return;
  }
  const index = record.prices.findIndex((item) => item.id === price.id);
  if (index < 0) return;
  record.prices.splice(index, 1);
  ElMessage.success(t("common.deleteSuccess"));
}
</script>
