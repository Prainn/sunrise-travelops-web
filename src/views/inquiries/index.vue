<template>
  <div class="page-container">
    <InquirySearchForm
      v-model:keywords="keywords"
      v-model:status="status"
      v-model:owner="owner"
      v-model:source-channel="sourceChannel"
      :owner-options="ownerOptions"
      :source-options="sourceOptions"
      @reset="resetQuery"
    />
    <InquiryTable
      :rows="pagedInquiries"
      :total="filteredInquiries.length"
      :page-num="pageNum"
      :page-size="pageSize"
      @refresh="resetQuery"
      @update:page-num="pageNum = $event"
      @update:page-size="changePageSize"
      @create="openCreateDialog"
      @view="openDetailDrawer"
      @edit="openEditDialog"
      @archive="archiveInquiry"
      @manage-itineraries="openItineraryManagement"
      @view-logs="openInquiryLogs"
    />
    <InquiryEditorDialog
      v-model="isEditorVisible"
      :record="inquiryForm"
      :is-editing="Boolean(editingId)"
      :agency-options="agencyOptions"
      :owner-options="ownerOptions"
      :operations-coordinator-options="operationsCoordinatorOptions"
      :source-options="sourceOptions"
      @submit="saveInquiry"
    />
    <InquiryDetailDrawer
      v-model="isDetailVisible"
      :record="selectedInquiry"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useInquiryLog } from "@/composables/useInquiryLog";
import { inquiryService } from "@/services/inquiry.service";
import { resourceService } from "@/services/resource.service";
import { staffDirectoryService } from "@/services/staff-directory.service";
import type { InquiryRecord, InquiryStatus } from "@/types/inquiry";
import { createId, formatDate, formatDateTime, generateNextCode } from "@/utils";
import InquiryDetailDrawer from "./components/InquiryDetailDrawer.vue";
import InquiryEditorDialog from "./components/InquiryEditorDialog.vue";
import InquirySearchForm from "./components/InquirySearchForm.vue";
import InquiryTable from "./components/InquiryTable.vue";
import { isInquiryReadOnly, transitionInquiry } from "./inquiry-workflow";

defineOptions({ name: "InquiryList" });

const { t } = useI18n();
const router = useRouter();
const { recordInquiryLog } = useInquiryLog();
const inquiryStore = reactive(inquiryService.inquiries);
const keywords = ref("");
const status = ref<InquiryStatus | "">("");
const owner = ref("");
const sourceChannel = ref("");
const pageNum = ref(1);
const pageSize = ref(10);
const isEditorVisible = ref(false);
const isDetailVisible = ref(false);
const editingId = ref("");
const selectedInquiry = ref<InquiryRecord>();
const inquiryForm = ref<InquiryRecord>(createEmptyInquiry());
const agencyOptions = computed(() => resourceService.agencies.filter((agency) => agency.status === "enabled"));
const ownerOptions = computed(() => getEnabledCoordinatorNames("INQUIRY_COORDINATOR"));
const operationsCoordinatorOptions = computed(() => getEnabledCoordinatorNames("OPERATIONS_COORDINATOR"));
const sourceOptions = ["WhatsApp", "Email", "Website", "WeChat", "Referral"];
const filteredInquiries = computed(() => inquiryStore.filter((record) => {
  const query = keywords.value.toLowerCase();
  return (
    (!status.value || record.status === status.value)
    && (!owner.value || record.owner === owner.value)
    && (!sourceChannel.value || record.sourceChannel === sourceChannel.value)
    && (!query || [record.code, record.agencyName, record.contactName, record.email, record.phone]
      .some((field) => field.toLowerCase().includes(query)))
  );
}));
const pagedInquiries = computed(() => filteredInquiries.value.slice(
  (pageNum.value - 1) * pageSize.value,
  pageNum.value * pageSize.value
));

function getEnabledCoordinatorNames(role: "INQUIRY_COORDINATOR" | "OPERATIONS_COORDINATOR") {
  return staffDirectoryService.users
    .filter((user) => user.status === "enabled" && user.roles.includes(role))
    .map((user) => user.nickname);
}

function createEmptyInquiry(): InquiryRecord {
  return {
    id: "", code: "", agencyId: "", agencyCode: "", agencyName: "", contactName: "",
    email: "", phone: "", countryOrRegion: "", sourceChannel: "", originalMessage: "",
    internalRemark: "", owner: "", operationsCoordinator: "", nextFollowUpAt: "", plannedDays: 1,
    lostReason: "", status: "new",
    creator: "admin", createdAt: "",
  };
}

function resetQuery() {
  keywords.value = "";
  status.value = "";
  owner.value = "";
  sourceChannel.value = "";
  pageNum.value = 1;
}

function changePageSize(value: number) {
  pageSize.value = value;
  pageNum.value = 1;
}

function generateInquiryCode() {
  const month = formatDate(new Date()).slice(0, 7).replace("-", "");
  return generateNextCode(inquiryStore, `INQ-${month}`);
}

function openCreateDialog() {
  editingId.value = "";
  inquiryForm.value = { ...createEmptyInquiry(), code: generateInquiryCode() };
  isEditorVisible.value = true;
}

function openEditDialog(record: InquiryRecord) {
  if (isInquiryReadOnly(record.status)) return;
  editingId.value = record.id;
  inquiryForm.value = { ...record };
  isEditorVisible.value = true;
}

function openDetailDrawer(record: InquiryRecord) {
  selectedInquiry.value = record;
  isDetailVisible.value = true;
}

function openItineraryManagement(record: InquiryRecord) {
  router.push({
    name: "InquiryItineraries",
    params: { inquiryId: record.id },
  });
}

function openInquiryLogs(record: InquiryRecord) {
  router.push({
    name: "InquiryLogs",
    params: { inquiryId: record.id },
  });
}

async function saveInquiry(record: InquiryRecord) {
  const current = inquiryStore.find((item) => item.id === editingId.value);
  if (current) {
    if (isInquiryReadOnly(current.status)) return;
    const isMarkingLost = record.status === "lost" && current.status !== "lost";
    let nextStatus = current.status;
    if (isMarkingLost) nextStatus = transitionInquiry(current.status, "mark_lost");
    else if (record.status === "planning" && current.status === "quoted") nextStatus = transitionInquiry(current.status, "reopen_for_planning");
    Object.assign(current, record, { status: nextStatus });
    await recordInquiryLog({
      inquiryId: current.id,
      action: "inquiry_updated",
      targetType: "inquiry",
      targetId: current.id,
      targetCode: current.code,
    });
    if (isMarkingLost) {
      await recordInquiryLog({
        inquiryId: current.id,
        action: "inquiry_lost",
        targetType: "inquiry",
        targetId: current.id,
        targetCode: current.code,
        metadata: { lostReason: current.lostReason },
      });
    }
  } else {
    const created = { ...record, id: createId("inquiry"), status: "new" as const, createdAt: formatDateTime(new Date()) };
    inquiryStore.unshift(created);
    await recordInquiryLog({
      inquiryId: created.id,
      action: "inquiry_created",
      targetType: "inquiry",
      targetId: created.id,
      targetCode: created.code,
    });
  }
  isEditorVisible.value = false;
  ElMessage.success(t(current ? "common.updateSuccess" : "common.createSuccess"));
}

async function archiveInquiry(record: InquiryRecord) {
  if (isInquiryReadOnly(record.status)) return;
  try {
    await ElMessageBox.confirm(t("inquiry.archiveConfirm"), t("common.tip"), { type: "warning" });
  } catch {
    return;
  }
  record.status = transitionInquiry(record.status, "archive");
  await recordInquiryLog({
    inquiryId: record.id,
    action: "inquiry_archived",
    targetType: "inquiry",
    targetId: record.id,
    targetCode: record.code,
  });
  ElMessage.success(t("inquiry.archiveSuccess"));
}

</script>
