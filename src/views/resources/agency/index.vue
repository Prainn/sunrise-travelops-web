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
import AgencyContactDialog from "./components/AgencyContactDialog.vue";
import AgencyContactsPanel from "./components/AgencyContactsPanel.vue";
import AgencyEditorDialog from "./components/AgencyEditorDialog.vue";
import AgencySidebar from "./components/AgencySidebar.vue";
import { useResourceMaintenance } from "../useResourceMaintenance";

defineOptions({ name: "Agency" });

const { t } = useI18n();
const loadedContactAgencyIds = new Set<string>();
const loadingContactAgencyIds = new Set<string>();

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
  api: resourceService.agencyApi,
  loadRecords: loadAgencies,
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
watch(selectedAgencyId, loadAgencyContacts, { immediate: true });

async function loadAgencies() {
  loadedContactAgencyIds.clear();
  const agencies = await resourceService.loadAgencies();
  const nextAgencyId = agencies.some((agency) => agency.id === selectedAgencyId.value)
    ? selectedAgencyId.value
    : agencies[0]?.id ?? "";
  if (selectedAgencyId.value === nextAgencyId) await loadAgencyContacts(nextAgencyId);
  else selectedAgencyId.value = nextAgencyId;
  return agencies;
}

async function loadAgencyContacts(agencyId: string) {
  if (!agencyId || loadedContactAgencyIds.has(agencyId) || loadingContactAgencyIds.has(agencyId)) return;
  loadingContactAgencyIds.add(agencyId);
  try {
    await resourceService.loadAgencyContacts(agencyId);
    loadedContactAgencyIds.add(agencyId);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    loadingContactAgencyIds.delete(agencyId);
  }
}

function createEmptyContact(): AgencyContactRecord {
  return { id: "", name: "", phone: "" };
}

async function saveAgency(agency: AgencyRecord) {
  await saveAgencyRecord(agency);
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

async function saveContact(contact: AgencyContactRecord) {
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
  try {
    const saved = current
      ? await resourceService.agencyApi.updateContact(agency.id, current.id, contact)
      : await resourceService.agencyApi.createContact(agency.id, contact);
    if (current) Object.assign(current, saved);
    else agency.contacts.push(saved);
    agency.contactCount = agency.contacts.length;
    isContactDialogVisible.value = false;
    ElMessage.success(t(current ? "common.updateSuccess" : "common.createSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function deleteContact(contact: AgencyContactRecord) {
  const agency = selectedAgency.value;
  if (!agency) return;
  try {
    await ElMessageBox.confirm(t("resource.deleteContactConfirm"), t("common.tip"), { type: "warning" });
  } catch {
    return;
  }
  try {
    await resourceService.agencyApi.deleteContacts(agency.id, contact.id);
    const index = agency.contacts.findIndex((item) => item.id === contact.id);
    if (index >= 0) agency.contacts.splice(index, 1);
    agency.contactCount = agency.contacts.length;
    ElMessage.success(t("common.deleteSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
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
