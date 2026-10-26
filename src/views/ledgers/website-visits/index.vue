<template>
  <PageShell>
    <FilterBar @reset="reset">
      <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
        <el-input
          v-model="keyword"
          :placeholder="$t('websiteVisits.searchPlaceholder')"
          maxlength="200"
          clearable
        />
      </el-form-item>
      <el-form-item :label="$t('websiteVisits.dateRange')" class="filter-bar__wide">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          :start-placeholder="$t('common.startDate')"
          :end-placeholder="$t('common.endDate')"
        />
      </el-form-item>
    </FilterBar>
    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="load">
        <el-button v-if="can('website:visit:export')" :loading="exporting" @click="exportRecords">
          {{ $t('common.export') }}
        </el-button>
      </TableToolbar>
      <DataTable
        fill
        :data="rows"
        :loading="loading"
        :error="error"
        row-key="id"
        @retry="load"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <el-descriptions :column="1" border class="p-4">
              <el-descriptions-item v-for="field in detailFields" :key="field.key" :label="field.label">
                {{ row[field.key] || $t('common.notSet') }}
              </el-descriptions-item>
            </el-descriptions>
          </template>
        </el-table-column>
        <el-table-column
          prop="whatsapp_reference"
          :label="$t('websiteInquiry.whatsappSourceId')"
          min-width="80"
          fixed="left"
        />
        <el-table-column
          prop="website_inquiry_id"
          :label="$t('websiteInquiry.websiteInquiryNo')"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column :label="$t('websiteVisits.beijingTime')" width="180">
          <template #default="{ row }">
            {{ beijingTime(row.created_at_utc) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="first_landing_page"
          :label="$t('websiteInquiry.landingPage')"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column :label="$t('websiteVisits.source')" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.utm_source || row.external_referrer || '' }}
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('common.actions')"
          min-width="220"
          fixed="right"
          :show-overflow-tooltip="false"
        >
          <template #default="{ row }">
            <RowActions>
              <el-button
                v-if="row.inquiry"
                link
                type="primary"
                :loading="openingId === row.id"
                :disabled="saving"
                @click="viewInquiry(row as WebsiteVisit)"
              >
                {{ row.inquiry.code }}
              </el-button>
              <span v-else-if="row.converted">{{ $t('websiteVisits.converted') }}</span>
              <el-button
                v-else-if="can('website:inquiry:create')"
                link
                type="primary"
                :loading="openingId === row.id"
                :disabled="saving"
                @click="generateInquiry(row as WebsiteVisit)"
              >
                {{ $t('websiteVisits.generate') }}
              </el-button>
            </RowActions>
          </template>
        </el-table-column>
      </DataTable>
      <Pagination
        v-if="total > 0"
        v-model:page="page"
        v-model:limit="pageSize"
        :total="total"
        @pagination="load"
      />
    </SectionCard>
    <WebsiteInquiryEditor
      v-model="editorVisible"
      :record="record"
      :initial-values="draft"
      source-read-only
      business-unit="website"
      :show-business="false"
      :owners="owners"
      :cities="cities"
      :allow-assign="allowAssign"
      :saving="saving"
      :read-only="Boolean(record)"
      @save="save"
    />
  </PageShell>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import PageShell from "@/components/PageShell/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import RowActions from "@/components/RowActions/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import { useRefreshOnActivated } from "@/composables";
import WebsiteInquiryEditor from "@/views/website-inquiries/components/WebsiteInquiryEditor.vue";
import { websiteVisitService } from "@/services/website-visit.service";
import { websiteService, websiteErrorMessage, type WebsiteOwnerOption } from "@/services/website.service";
import type { WebsiteVisit } from "@/types/website-visit";
import type { WebsiteInquiry, WebsiteInquiryInput, WebsiteCity } from "@/types/website";
import { useUserStore } from "@/stores/user";
defineOptions({ name: "WebsiteVisits" });
const { t } = useI18n();
const user = useUserStore();
const can = (permission: string) => user.userInfo.perms.includes(permission);
const allowAssign = computed(() => can("website:inquiry:transfer"));
const rows = ref<WebsiteVisit[]>([]);
const page = ref(1);
const pageSize = ref(50);
const total = ref(0);
const keyword = ref("");
const dateRange = ref<[string, string] | null>(null);
const loading = ref(false);
const exporting = ref(false);
const saving = ref(false);
const editorVisible = ref(false);
const error = ref("");
const openingId = ref("");
const selectedId = ref("");
const record = ref<WebsiteInquiry>();
const draft = ref<Partial<WebsiteInquiryInput>>();
const owners = ref<WebsiteOwnerOption[]>([]);
const cities = ref<WebsiteCity[]>([]);
const detailFields = computed(() => [
  { key: "id", label: t("websiteVisits.recordId") },
  { key: "contract_version", label: t("websiteVisits.contractVersion") },
  { key: "created_at_utc", label: t("websiteVisits.originalTime") },
  { key: "expires_at_utc", label: t("websiteVisits.expiresAt") },
  { key: "first_landing_page", label: t("websiteInquiry.landingPage") },
  { key: "external_referrer", label: t("websiteVisits.externalReferrer") },
  ...["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "gbraid", "wbraid"].map(key => ({ key, label: key })),
  { key: "payload_fingerprint", label: t("websiteVisits.fingerprint") },
]);
const formatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
let generation = 0;
const search = useDebounceFn(() => {
  page.value = 1;
  void load();
}, 300);
watch([keyword, dateRange], search);
onMounted(load);
useRefreshOnActivated(load);

function beijingTime(value: string) {
  return formatter.format(new Date(value));
}
function filters() {
  return {
    keyword: keyword.value.trim() || undefined,
    start: dateRange.value?.[0],
    end: dateRange.value?.[1],
  };
}
async function load() {
  const current = ++generation;
  loading.value = true;
  try {
    const data = await websiteVisitService.list({ page: page.value, pageSize: pageSize.value, ...filters() });
    if (current !== generation) return;
    rows.value = data.list;
    total.value = data.total;
    error.value = "";
  } catch (cause) {
    if (current === generation) error.value = websiteErrorMessage(cause);
  } finally {
    if (current === generation) loading.value = false;
  }
}
function reset() {
  keyword.value = "";
  dateRange.value = null;
  page.value = 1;
  void load();
}
// 生成询盘保存后会等待列表刷新才释放 saving，期间不能对访问记录再次生成。
async function generateInquiry(row: WebsiteVisit) {
  if (openingId.value || saving.value) return;
  openingId.value = row.id;
  try {
    const [initial, config, candidates] = await Promise.all([
      websiteVisitService.draft(row.id),
      websiteService.config(undefined, "website"),
      websiteService.owners("website"),
    ]);
    selectedId.value = row.id;
    record.value = undefined;
    draft.value = initial;
    cities.value = config.cities.filter(city => city.status === "enabled");
    owners.value = candidates;
    editorVisible.value = true;
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
    void load();
  } finally {
    openingId.value = "";
  }
}
async function viewInquiry(row: WebsiteVisit) {
  if (!row.inquiry || openingId.value || saving.value) return;
  openingId.value = row.id;
  try {
    const [detail, config] = await Promise.all([
      websiteService.inquiry(row.inquiry.id),
      websiteService.config(undefined, "website"),
    ]);
    record.value = detail;
    cities.value = config.cities;
    draft.value = undefined;
    editorVisible.value = true;
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  } finally {
    openingId.value = "";
  }
}
async function save(input: WebsiteInquiryInput) {
  if (saving.value) return;
  saving.value = true;
  try {
    await websiteVisitService.createInquiry(selectedId.value, input);
    editorVisible.value = false;
    ElMessage.success(t("common.createSuccess"));
    await load();
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
    void load();
  } finally {
    saving.value = false;
  }
}
async function exportRecords() {
  if (!dateRange.value) {
    ElMessage.warning(t("websiteVisits.chooseRange"));
    return;
  }
  exporting.value = true;
  try {
    const [start, end] = dateRange.value;
    const blob = await websiteVisitService.export({ start, end, keyword: filters().keyword });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lynxtour-visits_${start}_${end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  } finally {
    exporting.value = false;
  }
}
</script>
