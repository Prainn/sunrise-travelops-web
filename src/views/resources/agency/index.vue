<template>
  <div class="page-container agency-page">
    <AgencySidebar
      v-model:selected-id="selectedAgencyId"
      :rows="rows"
      :permissions="RESOURCE_PERMISSIONS.agency"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
      @delete="deleteRecord"
    />
    <AgencyContactsPanel
      :agency="selectedAgency"
      :permissions="RESOURCE_PERMISSIONS.agency"
      @create="openCreateContactDialog"
      @edit="openEditContactDialog"
      @delete="deleteContact"
    />
    <AgencyEditorDialog
      v-model="isDialogVisible"
      :record="record"
      :is-editing="isEditing"
      @submit="saveAgency"
    />
    <AgencyContactDialog
      v-model="isContactDialogVisible"
      :record="contactRecord"
      :is-editing="isContactEditing"
      @submit="saveContact"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import { RESOURCE_PERMISSIONS } from "@/constants";
import { resourceService } from "@/services/resource.service";
import type { AgencyContactRecord, AgencyRecord } from "@/types/resource";
import { createId } from "@/utils";
import AgencyContactDialog from "./components/AgencyContactDialog.vue";
import AgencyContactsPanel from "./components/AgencyContactsPanel.vue";
import AgencyEditorDialog from "./components/AgencyEditorDialog.vue";
import AgencySidebar from "./components/AgencySidebar.vue";
import { useResourceMaintenance } from "../useResourceMaintenance";

defineOptions({ name: "Agency" });

const { t } = useI18n();

function createEmptyAgencyRecord(): AgencyRecord {
  return {
    id: "", code: "", name: "", city: "", countryOrRegion: "", email: "",
    status: "enabled", remark: "", contacts: [],
  };
}

const {
  rows,
  record,
  isDialogVisible,
  isEditing,
  openCreateDialog,
  openEditDialog,
  toggleStatus,
  saveRecord: saveAgencyRecord,
  deleteRecord,
} = useResourceMaintenance<AgencyRecord>({
  records: resourceService.agencies,
  idPrefix: "agency",
  codePrefix: "AGY",
  createEmpty: createEmptyAgencyRecord,
  cloneForEdit: (agency) => ({ ...agency, contacts: agency.contacts.map((contact) => ({ ...contact })) }),
  createRecord: (agency, id) => ({ ...agency, id, contacts: agency.contacts.map((contact) => ({ ...contact })) }),
  updateRecord: (current, agency) => Object.assign(current, agency, {
    contacts: agency.contacts.map((contact) => ({ ...contact })),
  }),
  deleteConfirmKey: "resource.deleteAgencyConfirm",
});

const selectedAgencyId = ref(rows[0]?.id ?? "");
const selectedAgency = computed(() => rows.find((agency) => agency.id === selectedAgencyId.value));
const isContactDialogVisible = ref(false);
const editingContactId = ref("");
const contactRecord = ref<AgencyContactRecord>(createEmptyContact());
const isContactEditing = computed(() => Boolean(editingContactId.value));

watch(() => rows.map((agency) => agency.id), (ids) => {
  if (!ids.includes(selectedAgencyId.value)) selectedAgencyId.value = ids[0] ?? "";
});

function createEmptyContact(): AgencyContactRecord {
  return { id: "", name: "", phone: "" };
}

function saveAgency(agency: AgencyRecord) {
  saveAgencyRecord(agency);
  const savedAgency = rows.find((item) => item.code === agency.code);
  if (savedAgency) selectedAgencyId.value = savedAgency.id;
}

function openCreateContactDialog() {
  if (!selectedAgency.value) return;
  editingContactId.value = "";
  contactRecord.value = createEmptyContact();
  isContactDialogVisible.value = true;
}

function openEditContactDialog(contact: AgencyContactRecord) {
  editingContactId.value = contact.id;
  contactRecord.value = { ...contact };
  isContactDialogVisible.value = true;
}

function saveContact(contact: AgencyContactRecord) {
  const agency = selectedAgency.value;
  if (!agency) return;
  const isDuplicate = agency.contacts.some((item) => (
    item.id !== editingContactId.value && item.name.toLowerCase() === contact.name.toLowerCase()
  ));
  if (isDuplicate) {
    ElMessage.warning(t("resource.contactExists"));
    return;
  }
  const current = agency.contacts.find((item) => item.id === editingContactId.value);
  if (current) Object.assign(current, contact);
  else agency.contacts.push({ ...contact, id: createId("agency-contact") });
  isContactDialogVisible.value = false;
  ElMessage.success(t(current ? "common.updateSuccess" : "common.createSuccess"));
}

async function deleteContact(contact: AgencyContactRecord) {
  const agency = selectedAgency.value;
  if (!agency) return;
  try {
    await ElMessageBox.confirm(t("resource.deleteContactConfirm"), t("common.tip"), { type: "warning" });
  } catch {
    return;
  }
  const index = agency.contacts.findIndex((item) => item.id === contact.id);
  if (index < 0) return;
  agency.contacts.splice(index, 1);
  ElMessage.success(t("common.deleteSuccess"));
}
</script>

<style scoped lang="scss">
.agency-page {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 16px;
  min-height: 620px;
}
</style>
