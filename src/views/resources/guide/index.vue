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

defineOptions({ name: "Guide" });

const columns: ResourceColumn[] = [
  {
    "prop": "code",
    "labelKey": "resource.code"
  },
  {
    "prop": "name",
    "labelKey": "resource.guideName",
    "minWidth": 160
  },
  {
    "prop": "city",
    "labelKey": "resource.city"
  },
  {
    "prop": "languages",
    "labelKey": "resource.languages"
  },
  {
    "prop": "certificateNo",
    "labelKey": "resource.certificateNo"
  },
  {
    "prop": "phone",
    "labelKey": "resource.phone"
  }
];
const fields: ResourceFormField[] = [
  {
    "prop": "name",
    "labelKey": "resource.guideName",
    "required": true
  },
  {
    "prop": "city",
    "labelKey": "resource.city"
  },
  {
    "prop": "languages",
    "labelKey": "resource.languages"
  },
  {
    "prop": "certificateNo",
    "labelKey": "resource.certificateNo"
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
const { rows, record, isDialogVisible, isEditing, openCreateDialog, openEditDialog, toggleStatus, saveRecord } = useResourceMaintenance("guide", "GDE");
</script>
