<template>
  <div class="resource-page">
    <ResourceTable
      :rows="rows"
      :columns="columns"
      :search-fields="['code', 'name', 'city']"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
      @delete="deleteRecord"
    />
    <ResourceEditorDialog
      v-model="isDialogVisible"
      :record="record"
      :fields="fields"
      :title-key="isEditing ? 'resource.editTitle' : 'resource.createTitle'"
      @submit="saveRecord"
    />
  </div>
</template>

<script setup lang="ts">
import ResourceEditorDialog from "../components/ResourceEditorDialog.vue";
import ResourceTable from "../components/ResourceTable.vue";
import type { ResourceColumn, ResourceFormField } from "../types";
import { useResourceMaintenance } from "../useResourceMaintenance";

defineOptions({ name: "TransportResource" });

const columns: ResourceColumn[] = [
  {
    "prop": "code",
    "labelKey": "resource.code"
  },
  {
    "prop": "name",
    "labelKey": "resource.vehicleModel",
    "minWidth": 180
  },
  {
    "prop": "plateNumber",
    "labelKey": "resource.plateNumber"
  },
  {
    "prop": "seats",
    "labelKey": "resource.seats"
  },
  {
    "prop": "dailyPrice",
    "labelKey": "resource.dailyPrice"
  },
  {
    "prop": "city",
    "labelKey": "resource.city"
  },
  {
    "prop": "contact",
    "labelKey": "resource.driver"
  }
];
const fields: ResourceFormField[] = [
  {
    "prop": "name",
    "labelKey": "resource.vehicleModel",
    "required": true
  },
  {
    "prop": "plateNumber",
    "labelKey": "resource.plateNumber"
  },
  {
    "prop": "seats",
    "labelKey": "resource.seats",
    "type": "number"
  },
  {
    "prop": "dailyPrice",
    "labelKey": "resource.dailyPrice",
    "type": "number"
  },
  {
    "prop": "city",
    "labelKey": "resource.city"
  },
  {
    "prop": "contact",
    "labelKey": "resource.driver"
  },
  {
    "prop": "phone",
    "labelKey": "resource.phone"
  },
  {
    "prop": "remark",
    "labelKey": "common.remark",
    "type": "textarea"
  }
];
const { rows, record, isDialogVisible, isEditing, openCreateDialog, openEditDialog, toggleStatus, saveRecord, deleteRecord } = useResourceMaintenance("transport", "VEH");
</script>
