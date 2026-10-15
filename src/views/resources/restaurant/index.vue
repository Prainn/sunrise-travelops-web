<template>
  <div class="resource-page">
    <RestaurantTable
      :loading="isLoading"
      :total="total"
      :rows="restaurantStore"
      @refresh="loadRecords"
      @query-change="loadRecords"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
      @delete="deleteRestaurant"
    />
    <RestaurantEditorDialog
      v-model="isRestaurantDialogVisible"
      :record="restaurantForm"
      :is-editing="isEditing"
      :submit="saveRestaurant"
    />
  </div>
</template>

<script setup lang="ts">
import { resourceService } from "@/services/resource.service";
import type { RestaurantRecord } from "@/types/resource";
import { useResourceMaintenance } from "../useResourceMaintenance";
import RestaurantEditorDialog from "./components/RestaurantEditorDialog.vue";
import RestaurantTable from "./components/RestaurantTable.vue";

defineOptions({ name: "Restaurant" });

function createEmptyRestaurant(): RestaurantRecord {
  return {
    id: "",
    code: "",
    name: "",
    englishName: "",
    city: "",
    cuisine: "",
    contact: "",
    phone: "",
    address: "",
    description: "",
    englishDescription: "",
    isStandardPrice: false,
    remark: "",
    unit: "personMeal",
    price: null,
    dinerCount: null,
    status: "enabled",
  };
}

const {
  isLoading,
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
  loadRecords: (query) => resourceService.loadRestaurants(query),
  createEmpty: createEmptyRestaurant,
  cloneForEdit: (record) => ({ ...record }),
  createRecord: (record, id) => ({ ...record, id }),
  updateRecord: (current, record) => Object.assign(current, record),
});
</script>
