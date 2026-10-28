<template>
  <PageShell>
    <InquirySearchForm
      v-model:business-unit="businessUnit"
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
      :is-pending="isPending"
      :loading="isLoading"
      :error="listError"
      :filtered="hasActiveFilters"
      @refresh="fetchInquiries"
      @update:page-num="pageNum = $event"
      @update:page-size="changePageSize"
      @create="openCreateDialog"
      @view="openDetailDrawer"
      @edit="openEditDialog"
      @delete="deleteInquiry"
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
      :saving="saving"
      @submit="saveInquiry"
    />
    <InquiryDetailDrawer v-model="isDetailVisible" :record="selectedInquiry" />
  </PageShell>
</template>

<script setup lang="ts">
import { computed, nextTick, onDeactivated, onMounted, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useDebounceFn } from "@vueuse/core";
import PageShell from "@/components/PageShell/index.vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { useOpenInNewTab, usePendingActions, useRefreshOnActivated } from "@/composables";
import { useAccountSwitchGuard } from "@/composables/useAccountSwitchGuard";
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
const openInNewTab = useOpenInNewTab();
const route = useRoute();
let isActive = false;
const exactCode = ref("");
const user = useUserStore();
const inquiryStore = ref<InquiryRecord[]>([]);
const total = ref(0);
const isLoading = ref(false);
const listError = ref("");
const keywords = ref("");
const businessUnit = ref<NonNullable<InquiryRecord["businessUnit"]> | "">("");
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
function showError(error: unknown) {
  ElMessage.error(error instanceof Error ? error.message : t("request.failed"));
}
async function fetchInquiries() {
  const version = ++fetchVersion;
  isLoading.value = true;
  try {
    const result = await inquiryService.list({
      businessUnit:
        user.userInfo.scope === "headquarters" ? businessUnit.value || undefined : undefined,
      page: pageNum.value,
      pageSize: pageSize.value,
      keyword: keywords.value === exactCode.value ? undefined : keywords.value,
      code: keywords.value === exactCode.value ? exactCode.value || undefined : undefined,
      status: status.value,
      ownerId: owner.value,
      sourceChannel: sourceChannel.value,
    });
    if (version !== fetchVersion) return;
    inquiryStore.value = result.list;
    total.value = result.total;
    listError.value = "";
  } catch (error) {
    // 列表失败交给表格展示错误与重试，不另弹提示。
    if (version === fetchVersion)
      listError.value = error instanceof Error ? error.message : t("request.failed");
  } finally {
    if (version === fetchVersion) isLoading.value = false;
  }
}
const hasActiveFilters = computed(() =>
  Boolean(keywords.value || businessUnit.value || status.value || owner.value || sourceChannel.value),
);
// 缓存页面切回时同一 code 不再重复应用，保留用户之后调整的筛选和页码。
let appliedRouteCode: string | undefined;
function applyRouteCode() {
  if (route.name !== "InquiryList") return;
  const code = typeof route.query.code === "string" ? route.query.code : "";
  if (code === appliedRouteCode) return;
  appliedRouteCode = code;
  businessUnit.value = "";
  exactCode.value = code;
  keywords.value = code;
  status.value = "";
  owner.value = "";
  sourceChannel.value = "";
  pageNum.value = 1;
}
watch(() => route.query.code, applyRouteCode);
onDeactivated(() => {
  isActive = false;
});
// 关闭标签栏时页面不缓存，进入页面须在挂载时加载；缓存页面切回时再刷新。
async function enterPage() {
  if (route.query.code) applyRouteCode();
  await nextTick();
  isActive = true;
  await fetchInquiries();
  try {
    ownerOptions.value = await inquiryService.owners();
  } catch (error) {
    showError(error);
  }
}
onMounted(enterPage);
useRefreshOnActivated(enterPage);
const reloadFromFilters = useDebounceFn(() => {
  if (pageNum.value === 1) void fetchInquiries();
  else pageNum.value = 1;
}, 300);
watch([keywords, status, owner, sourceChannel, businessUnit], () => {
  if (isActive) void reloadFromFilters();
});
watch([pageNum, pageSize], () => {
  if (isActive) void fetchInquiries();
});
function createEmptyInquiry(): InquiryRecord {
  return {
    businessUnit: user.userInfo.scope === "headquarters" ? "shengxu" : user.userInfo.scope,
    id: "",
    version: 0,
    code: "",
    agencyId: "",
    contactId: "",
    agencyCode: "",
    agencyName: "",
    contactName: "",
    email: "",
    phone: "",
    hasActiveTour: false,
    countryItemId: "",
    countryOrRegion: "",
    sourceChannel: "",
    originalMessage: "",
    internalRemark: "",
    owner: user.userInfo.nickname ?? "",
    ownerId: "",
    nextFollowUpAt: "",
    plannedDays: 1,
    lostReason: "",
    status: "new",
    creator: "",
    createdAt: "",
  };
}
// 筛选变化由监听统一回到第 1 页并查询；无筛选时直接刷新，避免一次重置发出多个请求。
function resetQuery() {
  if (!hasActiveFilters.value) {
    if (pageNum.value === 1) void fetchInquiries();
    else pageNum.value = 1;
    return;
  }
  businessUnit.value = "";
  keywords.value = "";
  status.value = "";
  owner.value = "";
  sourceChannel.value = "";
}
function changePageSize(value: number) {
  pageSize.value = value;
  pageNum.value = 1;
}
function openCreateDialog() {
  editingId.value = "";
  inquiryForm.value = createEmptyInquiry();
  isEditorVisible.value = true;
}
// 快速点击多行时只采用最后一次打开的记录，过期响应直接丢弃。
let openVersion = 0;
async function openEditDialog(record: InquiryRecord) {
  if (isInquiryReadOnly(record.status, record.hasActiveTour)) return;
  const version = ++openVersion;
  try {
    const detail = await inquiryService.detail(record.id);
    if (version !== openVersion) return;
    if (isInquiryReadOnly(detail.status, detail.hasActiveTour)) {
      await fetchInquiries();
      return;
    }
    const agency = await resourceService.agencyApi.getDetail(detail.agencyId);
    if (version !== openVersion) return;
    const index = resourceService.agencies.findIndex((item) => item.id === agency.id);
    if (index >= 0) resourceService.agencies.splice(index, 1, agency);
    else resourceService.agencies.push(agency);
    editingId.value = detail.id;
    inquiryForm.value = detail;
    isEditorVisible.value = true;
  } catch (error) {
    if (version === openVersion) showError(error);
  }
}
async function openDetailDrawer(record: InquiryRecord) {
  const version = ++openVersion;
  try {
    const detail = await inquiryService.detail(record.id);
    if (version !== openVersion) return;
    selectedInquiry.value = detail;
    isDetailVisible.value = true;
  } catch (error) {
    if (version === openVersion) showError(error);
  }
}
function openItineraryManagement(record: InquiryRecord) {
  openInNewTab({ name: "InquiryItineraries", params: { inquiryId: record.id } });
}
function openInquiryLogs(record: InquiryRecord) {
  openInNewTab({ name: "InquiryLogs", params: { inquiryId: record.id } });
}
// 保存期间弹窗不可关闭，避免旧请求返回后关掉新打开的弹窗。
const saving = ref(false);
// 打开中的询盘编辑弹窗视为未保存，阻止切换账号。
useAccountSwitchGuard({ dirty: () => isEditorVisible.value, saving: () => saving.value });
const { isPending, run } = usePendingActions();
async function saveInquiry(record: InquiryRecord) {
  if (saving.value) return;
  saving.value = true;
  const isUpdate = Boolean(editingId.value);
  try {
    if (isUpdate) await inquiryService.update(record);
    else await inquiryService.create(record);
    isEditorVisible.value = false;
    ElMessage.success(t(isUpdate ? "common.updateSuccess" : "common.createSuccess"));
    await fetchInquiries();
  } catch (error) {
    showError(error);
  } finally {
    saving.value = false;
  }
}
function deleteInquiry(record: InquiryRecord) {
  if (!record.canDelete) return;
  return run(record.id, async () => {
    try {
      await ElMessageBox.confirm(t("inquiry.deleteConfirm", { code: record.code }), t("common.tip"), {
        type: "warning",
        confirmButtonText: t("common.delete"),
        cancelButtonText: t("common.cancel"),
      });
    } catch {
      return;
    }
    try {
      await inquiryService.delete(record);
      ElMessage.success(t("common.deleteSuccess"));
      if (inquiryStore.value.length === 1 && pageNum.value > 1) pageNum.value -= 1;
      else await fetchInquiries();
    } catch (error) {
      showError(error);
    }
  });
}
function archiveInquiry(record: InquiryRecord) {
  if (isInquiryReadOnly(record.status, record.hasActiveTour)) return;
  // 确认前占用该行，请求返回前不能再次归档或编辑。
  return run(record.id, async () => {
    try {
      await ElMessageBox.confirm(t("inquiry.archiveConfirm"), t("common.tip"), { type: "warning" });
    } catch {
      return;
    }
    try {
      await inquiryService.archive(record);
      ElMessage.success(t("inquiry.archiveSuccess"));
    } catch (error) {
      showError(error);
    }
    await fetchInquiries();
  });
}
</script>
