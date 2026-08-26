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
      :is-editing="Boolean(editingRestaurantId)"
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
import { reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import { restaurants, type RestaurantPriceRecord, type RestaurantRecord } from "@/data/data";
import RestaurantEditorDialog from "./components/RestaurantEditorDialog.vue";
import RestaurantPriceDialog from "./components/RestaurantPriceDialog.vue";
import RestaurantTable from "./components/RestaurantTable.vue";

defineOptions({ name: "Restaurant" });

const { t } = useI18n();
const restaurantStore = reactive(restaurants);
const isRestaurantDialogVisible = ref(false);
const isPriceDialogVisible = ref(false);
const editingRestaurantId = ref("");
const editingPriceId = ref("");
const selectedRestaurant = ref<RestaurantRecord>();
const restaurantForm = ref<RestaurantRecord>(createEmptyRestaurant());
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

function generateRestaurantCode() {
  const max = restaurantStore.reduce((value, record) => Math.max(value, Number(record.code.match(/^RES-(\d+)$/)?.[1] ?? 0)), 0);
  return `RES-${String(max + 1).padStart(3, "0")}`;
}

function openCreateDialog() {
  editingRestaurantId.value = "";
  restaurantForm.value = { ...createEmptyRestaurant(), code: generateRestaurantCode() };
  isRestaurantDialogVisible.value = true;
}

function openEditDialog(record: RestaurantRecord) {
  editingRestaurantId.value = record.id;
  restaurantForm.value = { ...record, prices: record.prices };
  isRestaurantDialogVisible.value = true;
}

function saveRestaurant(record: RestaurantRecord) {
  const current = restaurantStore.find((item) => item.id === editingRestaurantId.value);
  if (current) Object.assign(current, record, { prices: current.prices });
  else restaurantStore.push({ ...record, id: `restaurant-${Date.now()}`, prices: [] });
  isRestaurantDialogVisible.value = false;
  ElMessage.success(t(current ? "common.updateSuccess" : "common.createSuccess"));
}

function toggleStatus(record: RestaurantRecord) {
  record.status = record.status === "enabled" ? "disabled" : "enabled";
  ElMessage.success(t("common.updateSuccess"));
}
async function deleteRestaurant(record: RestaurantRecord) {
  try {
    await ElMessageBox.confirm(t("common.deleteConfirm"), t("common.tip"), { type: "warning" });
  } catch {
    return;
  }
  const index = restaurantStore.findIndex((item) => item.id === record.id);
  if (index < 0) return;
  restaurantStore.splice(index, 1);
  ElMessage.success(t("common.deleteSuccess"));
}

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
  else selectedRestaurant.value.prices.push({ ...price, id: `restaurant-price-${Date.now()}` });
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
