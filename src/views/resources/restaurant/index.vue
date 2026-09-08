<template>
  <div class="resource-page">
    <RestaurantTable
      :total="total"
      :rows="restaurantStore"
      @refresh="loadRecords"
      @query-change="loadRecords"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
      @delete="deleteRestaurant"
      @expand="loadRestaurantPrices"
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
import { resourceService } from "@/services/resource.service";
import type { ResourceListQuery, RestaurantPriceRecord, RestaurantRecord } from "@/types/resource";
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
const loadedRestaurantPriceIds = new Set<string>();
const loadingRestaurantPriceIds = new Set<string>();

function createEmptyRestaurant(): RestaurantRecord {
  return {
    id: "", code: "", name: "", city: "", cuisine: "", contact: "", phone: "", address: "",
    remark: "", unit: "personMeal", status: "enabled", prices: [],
  };
}

function createEmptyPrice(): RestaurantPriceRecord {
  return {
    id: "", menuName: "", dishDetails: "", unit: "personMeal", price: 0, dinerCount: 10, remark: "",

  };
}

const {
  rows: restaurantStore,
  record: restaurantForm,
  isDialogVisible: isRestaurantDialogVisible,
  isEditing,
  total,
  loadRecords,
  openCreateDialog,
  openEditDialog,
  toggleStatus,
  saveRecord: saveRestaurant,
  deleteRecord: deleteRestaurant,
} = useResourceMaintenance<RestaurantRecord>({
  records: resourceService.restaurants,
  api: resourceService.restaurantApi,
  loadRecords: loadRestaurants,
  codePrefix: "RES",
  createEmpty: createEmptyRestaurant,
  cloneForEdit: (record) => ({ ...record, prices: record.prices }),
  createRecord: (record, id) => ({ ...record, id, prices: [] }),
  updateRecord: (current, record) => Object.assign(current, record, { prices: current.prices }),
});

async function loadRestaurants(query?: ResourceListQuery) {
  loadedRestaurantPriceIds.clear();
  return resourceService.loadRestaurants(query);
}

async function loadRestaurantPrices(record: RestaurantRecord) {
  if (loadedRestaurantPriceIds.has(record.id) || loadingRestaurantPriceIds.has(record.id)) return;
  loadingRestaurantPriceIds.add(record.id);
  try {
    record.prices = await resourceService.loadRestaurantPrices(record.id);
    record.priceCount = record.prices.length;
    loadedRestaurantPriceIds.add(record.id);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    loadingRestaurantPriceIds.delete(record.id);
  }
}

async function openCreatePriceDialog(record: RestaurantRecord) {
  selectedRestaurant.value = record;
  editingPriceId.value = "";
  priceForm.value = { ...createEmptyPrice(), unit: record.unit };
  isPriceDialogVisible.value = true;
}

async function openEditPriceDialog(record: RestaurantRecord, price: RestaurantPriceRecord) {
  selectedRestaurant.value = record;
  editingPriceId.value = price.id;
  priceForm.value = { ...price };
  isPriceDialogVisible.value = true;
}

async function savePrice(price: RestaurantPriceRecord) {
  if (!selectedRestaurant.value) return;
  const restaurant = selectedRestaurant.value;
  const current = restaurant.prices.find((item) => item.id === editingPriceId.value);
  try {
    const saved = current
      ? await resourceService.restaurantApi.updatePrice(restaurant.id, current.id, price)
      : await resourceService.restaurantApi.createPrice(restaurant.id, price);
    if (current) Object.assign(current, saved);
    else restaurant.prices.push(saved);
    restaurant.priceCount = restaurant.prices.length;
    isPriceDialogVisible.value = false;
    ElMessage.success(t(current ? "common.updateSuccess" : "common.createSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function deletePrice(record: RestaurantRecord, price: RestaurantPriceRecord) {
  try {
    await ElMessageBox.confirm(t("restaurant.deletePriceConfirm"), t("common.tip"), { type: "warning" });
  } catch {
    return;
  }
  try {
    await resourceService.restaurantApi.deletePrices(record.id, price.id);
    const index = record.prices.findIndex((item) => item.id === price.id);
    if (index >= 0) record.prices.splice(index, 1);
    record.priceCount = record.prices.length;
    ElMessage.success(t("common.deleteSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}
</script>
