<template>
  <PageShell>
    <FilterBar @reset="reset">
      <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
        <el-input
          v-model.trim="query.keyword"
          :placeholder="$t('websiteInquiry.keywordPlaceholder')"
          clearable
        />
      </el-form-item>
      <el-form-item :label="$t('common.status')">
        <el-select v-model="query.status" autocomplete="new-password" clearable>
          <el-option
            v-for="option in INQUIRY_STATUS_OPTIONS"
            :key="option.value"
            :value="option.value"
            :label="$t(option.labelKey)"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        v-if="allowAssign || user.userInfo.scope === 'headquarters'"
        :label="$t('inquiry.owner')"
      >
        <el-select
          v-model="query.ownerId"
          autocomplete="new-password"
          clearable
          filterable
        >
          <el-option
            v-for="owner in filterOwners"
            :key="owner.id"
            :value="owner.id"
            :label="owner.name"
          />
        </el-select>
      </el-form-item>
    </FilterBar>
    <el-alert
      v-if="error && rows.length"
      :title="error"
      type="error"
      :closable="false"
    >
      <el-button :loading="loading" @click="load">
        {{ $t("common.retry") }}
      </el-button>
    </el-alert>
    <WebsiteInquiryTable
      v-model:page="query.page"
      v-model:page-size="query.pageSize"
      :rows="rows"
      :show-business="user.userInfo.scope === 'headquarters'"
      :total="total"
      :can="can"
      :is-pending="isPending"
      :loading="loading"
      :error="error"
      :filtered="hasActiveFilters"
      @refresh="load"
      @create="openEditor()"
      @view="openEditor($event, true)"
      @edit="openEditor($event)"
      @transfer="openTransfer"
      @delete="deleteInquiry"
      @archive="archive"
      @itineraries="openItineraries"
      @view-logs="openInquiryLogs"
    />
    <WebsiteInquiryEditor
      v-model="editorVisible"
      :record="editingRecord"
      :cities="cities"
      :business-unit="inquiryBusinessUnit"
      :show-business="false"
      :owners="owners"
      :allow-assign="allowAssign"
      :saving="saving || optionsLoading"
      :read-only="editorReadOnly"
      @save="save"
    />
    <WebsiteInquiryTransfer
      v-model="transferVisible"
      :record="transferRecord"
      :owners="owners"
      @saved="reloadAfterTransfer"
    />
  </PageShell>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { useOpenInNewTab, usePendingActions, useRefreshOnActivated } from "@/composables";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import { useUserStore } from "@/stores/user";
import { hasUserPermission } from "@/utils/permission";
import {
  websiteErrorMessage,
  websiteService,
  type WebsiteInquiryQuery,
  type WebsiteOwnerOption,
} from "@/services/website.service";
import type { WebsiteBusinessUnit, WebsiteCity, WebsiteInquiry, WebsiteInquiryInput } from "@/types/website";
import { INQUIRY_STATUS_OPTIONS } from "@/views/inquiries/options";
import { staleDeleteReason } from "@/views/inquiries/inquiry-workflow";
import { useAccountSwitchGuard } from "@/composables/useAccountSwitchGuard";
import WebsiteInquiryTable from "./components/WebsiteInquiryTable.vue";
import WebsiteInquiryEditor from "./components/WebsiteInquiryEditor.vue";
import WebsiteInquiryTransfer from "./components/WebsiteInquiryTransfer.vue";
defineOptions({ name: "WebsiteInquiryList" });
const { t } = useI18n();
const user = useUserStore();
const route = useRoute();
const openInNewTab = useOpenInNewTab();
const inquiryBusinessUnit = computed<WebsiteBusinessUnit>(() =>
  user.userInfo.scope === "linxi" ? "linxi" : "website",
);
const query = reactive<WebsiteInquiryQuery>({
  page: 1,
  pageSize: 10,
  keyword: "",
  status: "",
  ownerId: "",
});
const rows = ref<WebsiteInquiry[]>([]);
const total = ref(0);
const loading = ref(false);
const error = ref("");
const owners = ref<WebsiteOwnerOption[]>([]);
const filterOwners = ref<WebsiteOwnerOption[]>([]);
const cities = ref<WebsiteCity[]>([]);
const editorVisible = ref(false);
const editingRecord = ref<WebsiteInquiry>();
const editorReadOnly = ref(false);
const saving = ref(false);
// 打开中的可编辑询盘弹窗视为未保存，阻止切换账号。
useAccountSwitchGuard({
  dirty: () => editorVisible.value && !editorReadOnly.value,
  saving: () => saving.value,
});
const optionsLoading = ref(false);
const transferVisible = ref(false);
const transferRecord = ref<WebsiteInquiry>();
const allowAssign = computed(() => can("website:inquiry:transfer"));
function can(permission: string) {
  return hasUserPermission(user.userInfo, permission);
}
let generation = 0;
async function load() {
  const current = ++generation;
  loading.value = true;
  error.value = "";
  try {
    const result = await websiteService.inquiries({ ...query, businessUnit: inquiryBusinessUnit.value });
    if (current === generation) {
      rows.value = result.list;
      total.value = result.total;
    }
  } catch (cause) {
    if (current === generation) error.value = websiteErrorMessage(cause);
  } finally {
    if (current === generation) loading.value = false;
  }
}
const hasActiveFilters = computed(() =>
  Boolean(query.keyword || query.status || query.ownerId),
);
function search() {
  query.page = 1;
  void load();
}
// 多个筛选同时变化（如重置）合并为一次查询。
const searchFromFilters = useDebounceFn(search, 300);
watch([() => query.keyword, () => query.status, () => query.ownerId], () => void searchFromFilters());
function reset() {
  const hasFilter = hasActiveFilters.value;
  Object.assign(query, { keyword: "", status: "", ownerId: "" });
  if (!hasFilter) search();
}
async function openEditor(record?: WebsiteInquiry, readOnly = false) {
  // 选项加载失败已提示，不打开下拉为空的弹窗。
  if (!(await loadOptions(record?.businessUnit ?? inquiryBusinessUnit.value))) return;
  editingRecord.value = record;
  editorReadOnly.value = readOnly;
  editorVisible.value = true;
}
function openItineraries(record: WebsiteInquiry) {
  openInNewTab({
    name: "InquiryItineraries",
    params: { inquiryId: record.id },
    query: { module: "website" },
  });
}
function openInquiryLogs(record: WebsiteInquiry) {
  openInNewTab({ name: "WebsiteInquiryLogs", params: { inquiryId: record.id } });
}
async function save(input: WebsiteInquiryInput) {
  if (saving.value) return;
  saving.value = true;
  const record = editingRecord.value;
  try {
    if (record) await websiteService.updateInquiry(record.id, input, record.version);
    else await websiteService.createInquiry(input);
    editorVisible.value = false;
    ElMessage.success(t(record ? "common.updateSuccess" : "common.createSuccess"));
    await load();
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  } finally {
    saving.value = false;
  }
}
// 行操作从确认前占用到请求结束，期间同一行不能再次归档、转交或编辑。
const { isPending, run } = usePendingActions();
function deleteInquiry(record: WebsiteInquiry) {
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
      await websiteService.deleteInquiry(record.id, record.version);
      ElMessage.success(t("common.deleteSuccess"));
      await reloadAfterRemoval();
    } catch (error) {
      // 过期行只刷新供用户核对，不用新版本自动重试删除。
      const stale = staleDeleteReason(error);
      if (!stale) return ElMessage.error(websiteErrorMessage(error));
      ElMessage.warning(t(stale === "removed" ? "inquiry.deleteNotFound" : "inquiry.deleteVersionConflict"));
      await (stale === "removed" ? reloadAfterRemoval() : load());
    }
  });
}
/** 当前页最后一行被移除时回到上一页，再按当前筛选加载。 */
function reloadAfterRemoval() {
  if (rows.value.length === 1 && query.page > 1) query.page -= 1;
  return load();
}
function archive(record: WebsiteInquiry) {
  return run(record.id, () => archiveRecord(record));
}
async function archiveRecord(record: WebsiteInquiry) {
  try {
    await ElMessageBox.confirm(
      t("inquiry.archiveConfirm"),
      t("common.tip"),
      {
        type: "warning",
        confirmButtonText: t("common.confirm"),
        cancelButtonText: t("common.cancel"),
      },
    );
  } catch {
    return;
  }
  try {
    await websiteService.archive(record.id, record.version);
    await load();
    ElMessage.success(t("inquiry.archiveSuccess"));
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  }
}
let optionsGeneration = 0;
/** 返回选项是否可用；被后发请求取代或失败时为 false。 */
async function loadOptions(businessUnit?: WebsiteBusinessUnit): Promise<boolean> {
  const current = ++optionsGeneration;
  cities.value = [];
  owners.value = [];
  if (user.userInfo.scope === "headquarters" && !businessUnit) {
    optionsLoading.value = false;
    return true;
  }
  optionsLoading.value = true;
  try {
    const [config, candidates] = await Promise.all([
      websiteService.config(undefined, businessUnit),
      websiteService.owners(businessUnit),
    ]);
    if (current !== optionsGeneration) return false;
    cities.value = config.cities.filter((city) => city.status === "enabled");
    owners.value = candidates;
    return true;
  } catch (cause) {
    if (current === optionsGeneration) ElMessage.error(websiteErrorMessage(cause));
    return false;
  } finally { if (current === optionsGeneration) optionsLoading.value = false; }
}
// 转交成功后到列表刷新前，该行仍是旧版本，暂不允许再次操作。
function reloadAfterTransfer() {
  const record = transferRecord.value;
  return record ? run(record.id, load) : load();
}
async function openTransfer(record: WebsiteInquiry) {
  if (!(await loadOptions(record.businessUnit))) return;
  transferRecord.value = record;
  transferVisible.value = true;
}
let filterGeneration = 0;
async function loadFilterOwners() {
  const current = ++filterGeneration;
  filterOwners.value = [];
  try {
    const result = await websiteService.owners(inquiryBusinessUnit.value);
    if (current === filterGeneration) filterOwners.value = result;
  } catch (cause) { ElMessage.error(websiteErrorMessage(cause)); }
}
// 汇总页“查看”通过 query.inquiryId 精确打开只读详情；无权限或记录不存在时按接口错误提示。
async function openRequestedInquiry() {
  const id = route.query.inquiryId;
  if (typeof id !== "string" || !id) return;
  try {
    await openEditor(await websiteService.inquiry(id), true);
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  }
}
onMounted(() => { void load(); void loadFilterOwners(); void openRequestedInquiry(); });
// 行程/报价在新浏览器标签页编辑会递增询盘 version，切回时按当前筛选和页码刷新。
useRefreshOnActivated(load, { refreshOnVisible: load });
</script>
