<template>
  <div v-loading="loading" class="page-container">
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
    />
    <el-card class="page-search" shadow="never">
      <el-form inline @submit.prevent="search">
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
        <el-form-item :label="$t('common.keywords')">
          <el-input
            v-model.trim="query.keyword"
            :placeholder="$t('websiteInquiry.keywordPlaceholder')"
            class="page-search__keywords"
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
        <el-form-item>
          <el-button @click="reset">
            {{ $t("common.reset") }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <WebsiteInquiryTable
      v-model:page="query.page"
      v-model:page-size="query.pageSize"
      :rows="rows"
      :show-business="user.userInfo.scope === 'headquarters'"
      :total="total"
      :can="can"
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
      @saved="load"
    />
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox } from "element-plus";
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
const router = useRouter();
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
  void router.push({
    name: "InquiryItineraries",
    params: { inquiryId: record.id },
    query: { module: "website" },
  });
}
async function save(input: WebsiteInquiryInput) {
  if (saving.value) return;
  saving.value = true;
  try {
    if (editingRecord.value)
      await websiteService.updateInquiry(
        editingRecord.value.id,
        input,
        editingRecord.value.version,
      );
    else await websiteService.createInquiry(input);
    editorVisible.value = false;
    ElMessage.success(t(editingRecord.value ? "common.updateSuccess" : "common.createSuccess"));
    await load();
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  } finally {
    saving.value = false;
  }
}
async function archive(record: WebsiteInquiry) {
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
async function markLost(record: WebsiteInquiry) {
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
onMounted(() => { void load(); void loadFilterOwners(); });
</script>
