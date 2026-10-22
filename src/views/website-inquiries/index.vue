<template>
  <PageShell v-loading="loading">
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
    />
    <FilterBar @reset="reset">
      <el-form-item v-if="user.userInfo.scope === 'headquarters'" :label="$t('websiteInquiry.businessUnit')">
        <el-select
          v-model="query.businessUnit"
          autocomplete="new-password"
          clearable
          :placeholder="$t('common.all')"
        >
          <el-option
            v-for="unit in ['linxi', 'website']"
            :key="unit"
            :value="unit"
            :label="$t(`websiteInquiry.businessUnits.${unit}`)"
          />
        </el-select>
      </el-form-item>
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
        v-if="(allowAssign || user.userInfo.scope === 'headquarters') && (user.userInfo.scope !== 'headquarters' || query.businessUnit)"
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
    <WebsiteInquiryTable
      v-model:page="query.page"
      v-model:page-size="query.pageSize"
      :rows="rows"
      :show-business="user.userInfo.scope === 'headquarters'"
      :total="total"
      :can="can"
      :is-pending="isPending"
      @refresh="load"
      @create="openEditor()"
      @view="openEditor($event, true)"
      @edit="openEditor($event)"
      @transfer="openTransfer"
      @archive="archive"
      @lost="markLost"
      @itineraries="openItineraries"
    />
    <WebsiteInquiryEditor
      v-model="editorVisible"
      :record="editingRecord"
      :cities="cities"
      :business-unit="query.businessUnit"
      :show-business="user.userInfo.scope === 'headquarters'"
      :owners="owners"
      :allow-assign="allowAssign"
      :saving="saving || optionsLoading"
      :read-only="editorReadOnly"
      @business-change="loadOptions"
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
  websiteInquiryInput,
  type WebsiteInquiryQuery,
  type WebsiteOwnerOption,
} from "@/services/website.service";
import type { WebsiteBusinessUnit, WebsiteCity, WebsiteInquiry, WebsiteInquiryInput } from "@/types/website";
import { INQUIRY_STATUS_OPTIONS } from "@/views/inquiries/options";
import WebsiteInquiryTable from "./components/WebsiteInquiryTable.vue";
import WebsiteInquiryEditor from "./components/WebsiteInquiryEditor.vue";
import WebsiteInquiryTransfer from "./components/WebsiteInquiryTransfer.vue";
defineOptions({ name: "WebsiteInquiryList" });
const { t } = useI18n();
const user = useUserStore();
const route = useRoute();
const openInNewTab = useOpenInNewTab();
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
    const result = await websiteService.inquiries(query);
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
function search() {
  query.page = 1;
  void load();
}
watch([() => query.keyword, () => query.status, () => query.ownerId], search);
watch(() => query.businessUnit, () => { query.ownerId = ""; void loadFilterOwners(); search(); });
function reset() {
  const hasFilter = Boolean(query.keyword || query.status || query.ownerId || query.businessUnit);
  Object.assign(query, { keyword: "", status: "", ownerId: "", businessUnit: undefined });
  if (!hasFilter) search();
}
async function openEditor(record?: WebsiteInquiry, readOnly = false) {
  await loadOptions(record?.businessUnit ?? query.businessUnit);
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
function markLost(record: WebsiteInquiry) {
  return run(record.id, () => markRecordLost(record));
}
async function markRecordLost(record: WebsiteInquiry) {
  let reason: string;
  try {
    const result = await ElMessageBox.prompt(
      t("inquiry.lostReasonRequired"),
      t("inquiry.markLost"),
      {
        inputValidator: (value) => Boolean(value?.trim()) || t("inquiry.lostReasonRequired"),
        confirmButtonText: t("common.confirm"),
        cancelButtonText: t("common.cancel"),
      },
    );
    reason = result.value.trim();
  } catch {
    return;
  }
  try {
    await websiteService.updateInquiry(
      record.id,
      { ...websiteInquiryInput(record), status: "lost", lostReason: reason },
      record.version,
    );
    await load();
    ElMessage.success(t("common.updateSuccess"));
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  }
}
let optionsGeneration = 0;
async function loadOptions(businessUnit?: WebsiteBusinessUnit) {
  const current = ++optionsGeneration;
  cities.value = [];
  owners.value = [];
  if (user.userInfo.scope === "headquarters" && !businessUnit) {
    optionsLoading.value = false;
    return;
  }
  optionsLoading.value = true;
  try {
    const [config, candidates] = await Promise.all([
      websiteService.config(undefined, businessUnit),
      websiteService.owners(businessUnit),
    ]);
    if (current !== optionsGeneration) return;
    cities.value = config.cities.filter((city) => city.status === "enabled");
    owners.value = candidates;
  } catch (cause) { ElMessage.error(websiteErrorMessage(cause)); }
  finally { if (current === optionsGeneration) optionsLoading.value = false; }
}
// 转交成功后到列表刷新前，该行仍是旧版本，暂不允许再次操作。
function reloadAfterTransfer() {
  const record = transferRecord.value;
  return record ? run(record.id, load) : load();
}
async function openTransfer(record: WebsiteInquiry) {
  await loadOptions(record.businessUnit);
  transferRecord.value = record;
  transferVisible.value = true;
}
let filterGeneration = 0;
async function loadFilterOwners() {
  const current = ++filterGeneration;
  filterOwners.value = [];
  if (user.userInfo.scope === "headquarters" && !query.businessUnit) return;
  try {
    const result = await websiteService.owners(query.businessUnit);
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
useRefreshOnActivated(load);
</script>
