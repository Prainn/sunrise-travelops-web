<template>
  <PageShell>
    <FilterBar @reset="resetQuery">
      <el-form-item :label="$t(isShengxu ? 'ledger.shengxu.recordDate' : 'ledger.direct.receivedDate')" class="filter-bar__wide">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          :start-placeholder="$t('common.startDate')"
          :end-placeholder="$t('common.endDate')"
        />
      </el-form-item>
      <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
        <el-input
          v-model="keyword"
          :placeholder="$t(searchKey)"
          maxlength="200"
          clearable
        />
      </el-form-item>
    </FilterBar>
    <SectionCard fill>
      <TableToolbar :title="$t(titleKey)" :refreshing="loading" @refresh="fetchList" />
      <DataTable
        fill
        :loading="loading"
        :data="rows"
        :error="loadError"
        :filtered="Boolean(keyword.trim() || dateRange)"
        row-key="id"
        @retry="fetchList"
      >
        <el-table-column
          type="index"
          :label="$t('ledgerSummary.sequence')"
          width="70"
          :index="(index: number) => (pageNum - 1) * pageSize + index + 1"
        />
        <el-table-column prop="name" :label="$t(nameKey)" min-width="180" />
        <el-table-column
          prop="quotedCount"
          :label="$t('ledgerSummary.quotedCount')"
          min-width="130"
          align="right"
        />
        <el-table-column
          prop="convertedCount"
          :label="$t('ledgerSummary.convertedCount')"
          min-width="130"
          align="right"
        />
        <el-table-column
          v-if="isAgency"
          prop="firstFollowUp"
          :label="$t('ledgerSummary.firstFollowUp')"
          min-width="180"
        >
          <template #default="{ row }">
            <div class="whitespace-pre-wrap">
              {{ row.firstFollowUp }}
            </div>
          </template>
        </el-table-column>
        <el-table-column v-if="!isPlatform" :label="$t('ledger.shengxu.notConvertedReason')" min-width="260">
          <template #default="{ row }">
            <div class="max-h-40 overflow-y-auto">
              <div v-for="reason in row.reasons" :key="reason.ledgerId" class="mb-2 last:mb-0">
                <span class="text-[var(--el-text-color-secondary)]">{{ reason.date }}</span>
                <div class="whitespace-pre-wrap">
                  {{ reason.text }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          v-if="!isPlatform"
          prop="tourNumbers"
          :label="$t(tourNumberKey)"
          min-width="180"
        >
          <template #default="{ row }">
            <div class="whitespace-pre-wrap">
              {{ row.tourNumbers }}
            </div>
          </template>
        </el-table-column>
        <el-table-column
          v-if="canEditNotes"
          :label="$t('common.actions')"
          width="90"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              v-if="canEditNotes && row.canEdit"
              link
              type="primary"
              @click="openNotes(row as LedgerSummaryItem)"
            >
              {{ $t('common.edit') }}
            </el-button>
          </template>
        </el-table-column>
      </DataTable>
      <Pagination
        v-model:page="pageNum"
        v-model:limit="pageSize"
        :total="total"
        @pagination="fetchList"
      />
    </SectionCard>
    <AppDialog
      v-model="dialogVisible"
      :title="$t('ledgerSummary.editNotes')"
      :busy="saving"
      size="md"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
      >
        <el-form-item :label="$t(nameKey)">
          <span>{{ editing?.name }}</span>
        </el-form-item>
        <el-form-item v-if="isAgency" :label="$t('ledgerSummary.firstFollowUp')" prop="firstFollowUp">
          <el-input
            v-model="form.firstFollowUp"
            type="textarea"
            :rows="3"
            maxlength="2000"
            show-word-limit
            :placeholder="$t('ledgerSummary.followUpPlaceholder')"
          />
        </el-form-item>
        <el-form-item :label="$t(tourNumberKey)" prop="tourNumbers">
          <el-input
            v-model="form.tourNumbers"
            type="textarea"
            :rows="4"
            maxlength="5000"
            show-word-limit
            :placeholder="$t('ledgerSummary.tourNumbersPlaceholder')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="saving" @click="dialogVisible = false">
          {{ $t('common.cancel') }}
        </el-button>
        <el-button
          v-if="canEditNotes"
          type="primary"
          :loading="saving"
          @click="handleSaveNotes"
        >
          {{ $t('common.save') }}
        </el-button>
      </template>
    </AppDialog>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import type { LedgerSummaryItem, SummaryReport } from "@/types/ledger-summary";
import AppDialog from "@/components/AppDialog/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { useRefreshOnActivated } from "@/composables";
import { ledgerSummaryService } from "@/services/ledger-summary.service";
import { useUserStore } from "@/stores/user";
import { useResourcePagination } from "@/views/resources/useResourcePagination";

const props = defineProps<{ report: SummaryReport }>();
const { t } = useI18n();
const user = useUserStore();
const keyword = ref("");
const dateRange = ref<[string, string] | null>(null);
const rows = ref<LedgerSummaryItem[]>([]);
const total = ref(0);
const loading = ref(false);
const loadError = ref("");
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
const dialogVisible = ref(false);
const saving = ref(false);
const editing = ref<LedgerSummaryItem | null>(null);
const formRef = ref<FormInstance>();
const form = reactive({ firstFollowUp: "", tourNumbers: "" });
let generation = 0;

const isAgency = computed(() => props.report === "shengxu-agency-summary");
const isShengxu = computed(() => props.report.startsWith("shengxu-"));
const isPlatform = computed(() => props.report.endsWith("-platform-summary"));
const canEditNotes = computed(() => !isPlatform.value && user.userInfo.perms.includes("ledger:summary:update"));
const nameKey = computed(() => isAgency.value ? "ledger.shengxu.agency" : isPlatform.value ? "ledgerSummary.platformAccount" : "ledger.direct.creator");
const searchKey = computed(() => isAgency.value ? "ledgerSummary.agencySearch" : isPlatform.value ? "ledgerSummary.platformSearch" : "ledgerSummary.coordinatorSearch");
const tourNumberKey = computed(() => isAgency.value ? "ledgerSummary.bookedTourNumbers" : "ledgerSummary.tourNumbers");
const titleKey = computed(() => `route.${{
  "shengxu-agency-summary": "shengxuAgencySummary",
  "shengxu-coordinator-summary": "shengxuCoordinatorSummary",
  "linxi-quote-summary": "linxiQuoteSummary",
  "linxi-platform-summary": "linxiPlatformSummary",
  "website-quote-summary": "websiteQuoteSummary",
  "website-platform-summary": "websitePlatformSummary",
}[props.report]}`);
const rules = computed<FormRules>(() => ({
  firstFollowUp: [{ max: 2000, message: t("ledgerSummary.maxLength", { max: 2000 }), trigger: "blur" }],
  tourNumbers: [{ max: 5000, message: t("ledgerSummary.maxLength", { max: 5000 }), trigger: "blur" }],
}));

async function fetchList() {
  const current = ++generation;
  loading.value = true;
  try {
    const result = await ledgerSummaryService.list(props.report, {
      ...paginationQuery(), keyword: keyword.value.trim() || undefined,
      from: dateRange.value?.[0], to: dateRange.value?.[1],
    });
    if (current !== generation) return;
    rows.value = result.list;
    total.value = result.total;
    loadError.value = "";
  } catch (error) {
    if (current !== generation) return;
    rows.value = [];
    total.value = 0;
    loadError.value = error instanceof Error ? error.message : String(error);
    ElMessage.error(loadError.value);
  } finally {
    if (current === generation) loading.value = false;
  }
}
const reload = useDebounceFn(() => { pageNum.value = 1; void fetchList(); }, 300);
watch([keyword, dateRange], reload);

function resetQuery() {
  keyword.value = "";
  dateRange.value = null;
}
function openNotes(row: LedgerSummaryItem) {
  if (!canEditNotes.value || !row.canEdit) return;
  editing.value = row;
  form.firstFollowUp = row.firstFollowUp;
  form.tourNumbers = row.tourNumbers;
  dialogVisible.value = true;
}
async function handleSaveNotes() {
  if (saving.value || !editing.value || !canEditNotes.value) return;
  if (!(await formRef.value?.validate().catch(() => false))) return;
  saving.value = true;
  try {
    const notes = await ledgerSummaryService.saveNotes(props.report, editing.value.id, {
      version: editing.value.version,
      tourNumbers: form.tourNumbers,
      ...(isAgency.value ? { firstFollowUp: form.firstFollowUp } : {}),
    });
    Object.assign(editing.value, notes);
    dialogVisible.value = false;
    ElMessage.success(t("common.updateSuccess"));
    await fetchList();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    saving.value = false;
  }
}
onMounted(fetchList);
useRefreshOnActivated(fetchList);
</script>
