<template>
  <PageShell aside-width="440px">
    <template #aside>
      <AgencySidebar
        :selected-id="selectedAgency?.id ?? ''"
        :loading="loading"
        :rows="treeRows"
        :expanded-ids="expandedIds"
        :searching="searching"
        :page="page"
        :total="total"
        :permissions="RESOURCE_PERMISSIONS.agency"
        @create="openCreateDialog"
        @edit="openEditDialog"
        @toggle-status="toggleStatus"
        @delete="deleteRecord"
        @select="selectAgency"
        @expand="expandNode"
        @collapse="collapseNode"
        @load-more="loadBranch"
        @query-change="changeQuery"
        @page-change="changePage"
      />
    </template>
    <AgencyContactsPanel
      :loading="contactsLoading"
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
      :submit="saveAgency"
    />
    <AgencyContactDialog
      v-model="isContactDialogVisible"
      :record="contactRecord"
      :is-editing="isContactEditing"
      :submit="saveContact"
    />
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import PageShell from "@/components/PageShell/index.vue";
import { usePendingActions } from "@/composables";
import { RESOURCE_PERMISSIONS } from "@/constants";
import { resourceService } from "@/services/resource.service";
import type { AgencyContactRecord, AgencyRecord } from "@/types/resource";
import AgencyContactDialog from "./components/AgencyContactDialog.vue";
import AgencyContactsPanel from "./components/AgencyContactsPanel.vue";
import AgencyEditorDialog from "./components/AgencyEditorDialog.vue";
import AgencySidebar from "./components/AgencySidebar.vue";
import { useAgencyTree } from "./useAgencyTree";

defineOptions({ name: "Agency" });

const { t } = useI18n();
const {
  treeRows, expandedIds, searching, page, total, loading, selectedAgency, contactsLoading,
  selectAgency, expandNode, collapseNode, loadBranch, changeQuery, changePage, refreshAfterChange,
} = useAgencyTree();
const record = ref<AgencyRecord>(createEmptyAgencyRecord());
const isDialogVisible = ref(false);
const isEditing = computed(() => Boolean(record.value.id));

function createEmptyAgencyRecord(): AgencyRecord {
  return {
    childCount: 0,
    parentId: null,
    parentName: null,
    shortName: "",
    businessUnit: null,
    coordinatorId: null,
    coordinatorName: null,
    id: "",
    code: "",
    name: "",
    city: "",
    countryItemId: null,
    countryOrRegion: "",
    email: "",
    status: "enabled",
    remark: "",
    contacts: [],
  };
}

const isContactDialogVisible = ref(false);
const editingContactId = ref("");
const contactRecord = ref<AgencyContactRecord>(createEmptyContact());
const isContactEditing = computed(() => Boolean(editingContactId.value));

function openCreateDialog() {
  record.value = createEmptyAgencyRecord();
  isDialogVisible.value = true;
}

async function openEditDialog(agency: AgencyRecord) {
  try {
    record.value = await resourceService.agencyApi.getDetail(agency.id);
    isDialogVisible.value = true;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

function createEmptyContact(): AgencyContactRecord {
  return { id: "", name: "", phone: "" };
}

async function saveAgency(agency: AgencyRecord) {
  const previous = isEditing.value ? record.value : undefined;
  try {
    const saved = previous
      ? await resourceService.agencyApi.update(previous.id, agency)
      : await resourceService.agencyApi.create(agency);
    isDialogVisible.value = false;
    await refreshAfterChange(saved, previous);
    ElMessage.success(t(previous ? "common.updateSuccess" : "common.createSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

// 启停、删除从确认前占用到树刷新结束，同一组团社或联系人不会以旧版本重复提交。
const { run } = usePendingActions();

function toggleStatus(agency: AgencyRecord) {
  return run(agency.id, async () => {
    try {
      const saved = await resourceService.agencyApi.update(agency.id, {
        ...agency,
        status: agency.status === "enabled" ? "disabled" : "enabled",
      });
      await refreshAfterChange(saved, agency);
      ElMessage.success(t("common.updateSuccess"));
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : String(error));
    }
  });
}

function deleteRecord(agency: AgencyRecord) {
  return run(agency.id, async () => {
    try {
      await ElMessageBox.confirm(t("resource.deleteAgencyConfirm"), t("common.tip"), { type: "warning" });
    } catch { return; }
    try {
      await resourceService.agencyApi.deleteByIds(agency.id);
      await refreshAfterChange(undefined, agency);
      ElMessage.success(t("common.deleteSuccess"));
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : String(error));
    }
  });
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
  const isDuplicate = agency.contacts.some(
    (item) =>
      item.id !== editingContactId.value && item.name.toLowerCase() === contact.name.toLowerCase(),
  );
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

function deleteContact(contact: AgencyContactRecord) {
  return run(`contact:${contact.id}`, () => deleteContactRecord(contact));
}

async function deleteContactRecord(contact: AgencyContactRecord) {
  const agency = selectedAgency.value;
  if (!agency) return;
  try {
    await ElMessageBox.confirm(t("resource.deleteContactConfirm"), t("common.tip"), {
      type: "warning",
    });
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
