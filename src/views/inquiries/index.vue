<template>
  <div
    v-loading="isLoading"
    class="page-container"
  >
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
      :rows="inquiryStore"
      :total="total"
      :page-num="pageNum"
      :page-size="pageSize"
      @refresh="fetchInquiries"
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
import { computed, nextTick, onActivated, onDeactivated, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { inquiryService, type PersonOption } from "@/services/inquiry.service";
import { resourceService } from "@/services/resource.service";
import { useUserStore } from "@/stores/user";
import type { InquiryRecord, InquiryStatus } from "@/types/inquiry";
import InquiryDetailDrawer from "./components/InquiryDetailDrawer.vue";
import InquiryEditorDialog from "./components/InquiryEditorDialog.vue";
import InquirySearchForm from "./components/InquirySearchForm.vue";
import InquiryTable from "./components/InquiryTable.vue";
import { isInquiryReadOnly } from "./inquiry-workflow";
defineOptions({ name: "InquiryList" });
const { t } = useI18n();
const router = useRouter();
const route = useRoute();
let isActive = false;
const exactCode = ref("");
const user = useUserStore();
const inquiryStore = ref<InquiryRecord[]>([]);
const total = ref(0);
const isLoading = ref(false);
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
const agencyOptions = computed(() => resourceService.agencies);
const ownerOptions = ref<PersonOption[]>([]);
const sourceOptions = ["WhatsApp", "Email", "Website", "WeChat", "Referral"];
let fetchVersion = 0;
function showError(error: unknown) { ElMessage.error(error instanceof Error ? error.message : t("request.failed")); }
async function fetchInquiries() {
  const version = ++fetchVersion; isLoading.value = true;
  try {
    const result = await inquiryService.list({ page: pageNum.value, pageSize: pageSize.value, keyword: keywords.value === exactCode.value ? undefined : keywords.value, code: keywords.value === exactCode.value ? exactCode.value || undefined : undefined, status: status.value, ownerId: owner.value, sourceChannel: sourceChannel.value });
    if (version !== fetchVersion) return;
    inquiryStore.value = result.list; total.value = result.total;
  } catch (error) { if (version === fetchVersion) showError(error); }
  finally { if (version === fetchVersion) isLoading.value = false; }
}
function applyRouteCode() {
  if (route.name !== 'InquiryList') return;
  const code = typeof route.query.code === 'string' ? route.query.code : '';
  exactCode.value = code;
  keywords.value = code;
  status.value = ''; owner.value = ''; sourceChannel.value = ''; pageNum.value = 1;
}
watch(() => route.query.code, applyRouteCode);
onDeactivated(() => { isActive = false; });
onActivated(async () => {
  if (route.query.code) applyRouteCode();
  await nextTick(); isActive = true;
  await fetchInquiries(); try { ownerOptions.value = await inquiryService.owners(); } catch (error) { showError(error); } });
watch([keywords,status,owner,sourceChannel], () => { if (!isActive) return; if (pageNum.value === 1) void fetchInquiries(); else pageNum.value = 1; });
watch([pageNum,pageSize], () => { if (isActive) void fetchInquiries(); });
function createEmptyInquiry(): InquiryRecord {
  return { id: "", version: 0, code: "", agencyId: "", contactId: "", agencyCode: "", agencyName: "", contactName: "", email: "", phone: "", countryOrRegion: "", sourceChannel: "", originalMessage: "", internalRemark: "", owner: user.userInfo.nickname ?? "", ownerId: user.userInfo.userId ?? "", nextFollowUpAt: "", plannedDays: 1, lostReason: "", status: "new", creator: "", createdAt: "" };
}
function resetQuery() { keywords.value = ""; status.value = ""; owner.value = ""; sourceChannel.value = ""; pageNum.value = 1; }
function changePageSize(value: number) { pageSize.value = value; pageNum.value = 1; }
function openCreateDialog() { editingId.value = ""; inquiryForm.value = createEmptyInquiry(); isEditorVisible.value = true; }
async function openEditDialog(record: InquiryRecord) {
  if (isInquiryReadOnly(record.status)) return;
  try {
    const detail = await inquiryService.detail(record.id);
    if (isInquiryReadOnly(detail.status)) { await fetchInquiries(); return; }
    const agency = await resourceService.agencyApi.getDetail(detail.agencyId);
    const index = resourceService.agencies.findIndex(item => item.id === agency.id);
    if (index >= 0) resourceService.agencies.splice(index,1,agency); else resourceService.agencies.push(agency);
    editingId.value = detail.id; inquiryForm.value = detail; isEditorVisible.value = true;
  } catch (error) { showError(error); }
}
async function openDetailDrawer(record: InquiryRecord) {
  try { selectedInquiry.value = await inquiryService.detail(record.id); isDetailVisible.value = true; } catch (error) { showError(error); }
}
function openItineraryManagement(record: InquiryRecord) { void router.push({ name: "InquiryItineraries", params: { inquiryId: record.id } }); }
function openInquiryLogs(record: InquiryRecord) { void router.push({ name: "InquiryLogs", params: { inquiryId: record.id } }); }
let saving = false;
async function saveInquiry(record: InquiryRecord) {
  if (saving) return; saving = true;
  try {
    if (editingId.value) await inquiryService.update(record); else await inquiryService.create(record);
    isEditorVisible.value = false; await fetchInquiries(); ElMessage.success(t(editingId.value ? "common.updateSuccess" : "common.createSuccess"));
  } catch (error) { showError(error); } finally { saving = false; }
}
async function archiveInquiry(record: InquiryRecord) {
  if (isInquiryReadOnly(record.status)) return;
  try { await ElMessageBox.confirm(t("inquiry.archiveConfirm"),t("common.tip"),{ type: "warning" }); } catch { return; }
  try { await inquiryService.archive(record); await fetchInquiries(); ElMessage.success(t("inquiry.archiveSuccess")); } catch (error) { showError(error); }
}
</script>
