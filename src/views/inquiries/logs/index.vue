<template>
  <div
    v-loading="isLoading"
    class="page-container inquiry-log-page"
  >
    <el-card shadow="never">
      <el-page-header @back="router.push({ name: 'InquiryList' })">
        <template #content>
          {{ inquiry ? `${inquiry.code} · ${inquiry.agencyName}` : $t('inquiry.log.report') }}
        </template>
      </el-page-header>
      <el-form
        :inline="true"
        class="log-filters"
      >
        <el-form-item :label="$t('inquiry.code')">
          <el-input
            v-model.trim="inquiryCode"
            clearable
            maxlength="50"
            @keyup.enter="search"
            @clear="search"
          />
        </el-form-item>
        <el-form-item :label="$t('inquiry.log.dateRange')">
          <el-date-picker
            v-model="dates"
            type="daterange"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item :label="$t('inquiry.log.operator')">
          <el-select
            v-model="operatorId"
            clearable
            filterable
            style="width: 220px"
          >
            <el-option
              v-for="person in operators"
              :key="person.id"
              :value="person.id"
              :label="`${person.name} (${person.username})`"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('inquiry.log.action')">
          <el-select
            v-model="action"
            clearable
            style="width: 200px"
          >
            <el-option
              v-for="kind in actions"
              :key="kind"
              :value="kind"
              :label="$t(`inquiry.log.actions.${kind}`)"
            />
          </el-select>
        </el-form-item>
        <el-button
          type="primary"
          @click="search"
        >
          {{ $t('common.search') }}
        </el-button>
      </el-form>
      <div class="log-totals">
        <span>{{ $t('inquiry.log.totalOperations') }} <strong>{{ report.totalOperations }}</strong></span>
        <span>{{ $t('inquiry.log.inquiryCount') }} <strong>{{ report.inquiryCount }}</strong></span>
        <span>{{ $t('inquiry.log.operatorCount') }} <strong>{{ report.operatorCount }}</strong></span>
        <span>{{ $t('inquiry.log.changedFields') }} <strong>{{ report.changedFields }}</strong></span>
      </div>
      <div class="log-actions">
        <el-tag
          v-for="item in report.byAction"
          :key="item.action"
          size="large"
        >
          {{ $t(`inquiry.log.actions.${item.action}`) }}：{{ item.count }}
        </el-tag>
      </div>
    </el-card>
    <el-card
      class="page-content"
      shadow="never"
    >
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
      />
      <el-table
        :data="logs"
        row-key="id"
        border
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="change-details">
              <p v-if="row.metadata?.creationMode === 'copy'">
                {{ $t('inquiry.log.copySource') }}：{{ row.metadata.sourceCode }}
              </p>
              <p v-if="row.metadata?.lostReason">
                {{ $t('inquiry.lostReason') }}：{{ row.metadata.lostReason }}
              </p>
              <el-table
                :data="row.changes"
                :row-class-name="({ row: change }) => `change-${changeTone(change as InquiryLogRecord['changes'][number])}`"
                :show-overflow-tooltip="false"
                border
              >
                <el-table-column
                  :label="$t('inquiry.log.field')"
                  min-width="240"
                >
                  <template #default="scope">
                    {{ fieldLabel(scope.row as InquiryLogRecord["changes"][number]) }}
                  </template>
                </el-table-column>
                <el-table-column
                  :label="$t('inquiry.log.before')"
                  min-width="280"
                >
                  <template #default="scope">
                    <pre>{{ displayValue(scope.row.before, scope.row.path, row.targetType) }}</pre>
                  </template>
                </el-table-column>
                <el-table-column
                  :label="$t('inquiry.log.after')"
                  min-width="280"
                >
                  <template #default="scope">
                    <pre>{{ displayValue(scope.row.after, scope.row.path, row.targetType) }}</pre>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('inquiry.log.time')"
          min-width="175"
        >
          <template #default="{ row }">
            {{ formatDateTime(new Date(row.occurredAt)) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="action"
          :label="$t('inquiry.log.action')"
          min-width="150"
          :formatter="formatAction"
        />
        <el-table-column
          :label="$t('inquiry.log.operator')"
          min-width="150"
        >
          <template #default="{ row }">
            {{ row.operatorName }}（{{ row.operatorUsername }}）
          </template>
        </el-table-column>
        <el-table-column
          prop="inquiryCode"
          :label="$t('inquiry.code')"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="targetCode"
          :label="$t('inquiry.log.targetCode')"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="summary"
          :label="$t('itinerary.title')"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          :label="$t('common.actions')"
          width="100"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              @click="router.push({ name: 'InquiryList', query: { code: row.inquiryCode } })"
            >
              {{ $t('common.view') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <pagination
        v-if="total"
        :page="page"
        :limit="pageSize"
        :total="total"
        @update:page="page = $event"
        @update:limit="pageSize = $event; page = 1"
      />
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { inquiryService, type PersonOption } from "@/services/inquiry.service";
import { inquiryLogService, type LogReport } from "@/services/inquiry-log.service";
import type { InquiryLogAction, InquiryLogRecord } from "@/types/inquiry-log";
import type { InquiryRecord } from "@/types/inquiry";
import { formatDateTime } from "@/utils";
import { businessDictionaryService } from "@/services/business-dictionary.service";
import { changeTone, formatLogValue } from "./log-presentation";
defineOptions({ name: "InquiryLogs" });
const { t, te, locale } = useI18n();
const route = useRoute(); const router = useRouter();
const inquiryId = computed(() => String(route.params.inquiryId ?? ""));
const inquiry = ref<InquiryRecord>();
const logs = ref<InquiryLogRecord[]>([]);
const operators = ref<PersonOption[]>([]);
const actions: InquiryLogAction[] = ["inquiry_created","inquiry_updated","itinerary_created","itinerary_saved","itinerary_pdf_generated","inquiry_archived","inquiry_lost"];
const report = ref<LogReport>({ totalOperations: 0, inquiryCount: 0, operatorCount: 0, changedFields: 0, byAction: [] });
const inquiryCode = ref("");
const dates = ref<string[]>([]); const operatorId = ref(""); const action = ref<InquiryLogAction | "">("");
const page = ref(1); const pageSize = ref(10); const total = ref(0); const isLoading = ref(false); const error = ref("");
let requestVersion = 0;
async function fetchLogs() {
  const version = ++requestVersion; isLoading.value = true; error.value = "";
  const query = { page: page.value, pageSize: pageSize.value, inquiryCode: inquiryCode.value, inquiryId: inquiryId.value || undefined, operatorId: operatorId.value, action: action.value, from: dates.value?.[0], to: dates.value?.[1] };
  try {
    const [details,summary,people,record] = await Promise.all([inquiryLogService.list(query),inquiryLogService.report(query),inquiryLogService.operators(),inquiryId.value ? inquiryService.detail(inquiryId.value) : Promise.resolve(undefined), businessDictionaryService.ensureBuiltInTypesLoaded()]);
    if (version !== requestVersion) return;
    logs.value = details.list; total.value = details.total; report.value = summary; operators.value = people; inquiry.value = record;
  } catch (reason) {
    if (version !== requestVersion) return;
    error.value = reason instanceof Error ? reason.message : t("request.failed"); logs.value = []; total.value = 0;
    report.value = { totalOperations: 0, inquiryCount: 0, operatorCount: 0, changedFields: 0, byAction: [] };
  } finally { if (version === requestVersion) isLoading.value = false; }
}
function search() { if (page.value === 1) void fetchLogs(); else page.value = 1; }
watch([inquiryId,page,pageSize], () => { void fetchLogs(); }, { immediate: true });
function formatAction(row: InquiryLogRecord) { return t(`inquiry.log.actions.${row.action}`); }
function fieldName(name: string) { const key = `inquiry.log.fields.${name}`; return te(key) ? t(key) : name; }
function fieldLabel(change: InquiryLogRecord["changes"][number]) {
  const context = change.context;
  const prefix = [context?.dayNumber ? t("inquiry.log.day", { day: context.dayNumber }) : "", context?.name, context?.destination, context?.hotelTier ? t(`inquiry.log.tiers.${context.hotelTier}`) : "", context?.vehicleTier ? t(`inquiry.log.tiers.${context.vehicleTier}`) : ""].filter(Boolean).join(" · ");
  const path = change.path.replace(/\[[^\]]+\]/g, "");
  const label = path ? path.split('.').map(fieldName).join(' / ') : t('inquiry.log.record');
  return prefix ? `${prefix} · ${label}` : label;
}
function displayValue(value: unknown, path: string, targetType: InquiryLogRecord["targetType"]): string {
  return formatLogValue(value, path, { t, te, locale: locale.value, targetType });
}
</script>
<style scoped>
.log-filters { margin-top: 20px; }
.log-totals, .log-actions { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; }
.log-totals strong { margin-left: 8px; font-size: 18px; }
.change-details { padding: 16px; }
.change-details :deep(.change-added) { color: var(--el-color-success); }
.change-details :deep(.change-removed) { color: var(--el-color-danger); }
.change-details :deep(.change-changed) { color: var(--el-color-warning); }
pre { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; margin: 0; max-height: 360px; overflow: auto; }
</style>
