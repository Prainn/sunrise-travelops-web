<template>
  <div class="resource-page">
    <ResourceTable
      :rows="rows"
      :columns="columns"
      :search-fields="['code', 'name', 'city']"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
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

defineOptions({ name: "Attraction" });

const columns: ResourceColumn[] = [
  {
    "prop": "code",
    "labelKey": "resource.code"
  },
  {
    "prop": "name",
    "labelKey": "resource.attractionName",
    "minWidth": 180
  },
  {
    "prop": "city",
    "labelKey": "resource.city"
  },
  {
    "prop": "ticketPrice",
    "labelKey": "resource.ticketPrice"
  },
  {
    "prop": "visitDuration",
    "labelKey": "resource.visitDuration"
  },
  {
    "prop": "openingHours",
    "labelKey": "resource.openingHours"
  }
];
const fields: ResourceFormField[] = [
  {
    "prop": "name",
    "labelKey": "resource.attractionName",
    "required": true
  },
  {
    "prop": "city",
    "labelKey": "resource.city"
  },
  {
    "prop": "ticketPrice",
    "labelKey": "resource.ticketPrice",
    "type": "number"
  },
  {
    "prop": "visitDuration",
    "labelKey": "resource.visitDuration"
  },
  {
    "prop": "openingHours",
    "labelKey": "resource.openingHours"
  },
  {
    "prop": "contact",
    "labelKey": "resource.contact"
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
const { rows, record, isDialogVisible, isEditing, openCreateDialog, openEditDialog, toggleStatus, saveRecord } = useResourceMaintenance("attraction", "ATT");
</script>
