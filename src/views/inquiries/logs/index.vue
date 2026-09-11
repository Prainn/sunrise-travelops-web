<template>
  <div
    v-loading="isLoading"
    class="page-container inquiry-log-page"
  >
    <el-card
      class="log-summary-card shrink-0"
      shadow="never"
    >
      <el-page-header @back="router.push({ name: 'InquiryList' })">
        <template #content>
          {{ inquiry ? `${inquiry.code} · ${inquiry.agencyName}` : $t('inquiry.log.report') }}
        </template>
      </el-page-header>
      <el-form
        :inline="true"
        class="log-filters mt-[20px]"
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
            class="w-[220px]"
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
            :placeholder="$t('common.selectPlaceholder')"
            clearable
            class="!w-[200px]"
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
      <div class="log-totals mt-[12px] flex flex-wrap gap-[16px]">
        <span>{{ $t('inquiry.log.totalOperations') }} <strong class="ml-[8px] text-[18px]">{{ report.totalOperations }}</strong></span>
        <span>{{ $t('inquiry.log.inquiryCount') }} <strong class="ml-[8px] text-[18px]">{{ report.inquiryCount }}</strong></span>
        <span>{{ $t('inquiry.log.operatorCount') }} <strong class="ml-[8px] text-[18px]">{{ report.operatorCount }}</strong></span>
        <span>{{ $t('inquiry.log.changedFields') }} <strong class="ml-[8px] text-[18px]">{{ report.changedFields }}</strong></span>
      </div>
      <div class="log-actions mt-[12px] flex flex-wrap gap-[16px]">
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
      <div class="log-table-feedback">
        <el-alert
          v-if="error"
          :title="error"
          type="error"
          :closable="false"
        />
      </div>
      <div class="page-table-wrapper">
        <el-table
          :data="logs"
          :row-expandable="canExpandLog"
          row-key="id"
          class="page-table"
          height="100%"
          border
        >
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="change-details p-[16px]">
                <p v-if="row.metadata?.creationMode === 'copy'">
                  {{ $t('inquiry.log.copySource') }}：{{ row.metadata.sourceCode }}
                </p>
                <p v-if="row.metadata?.lostReason">
                  {{ $t('inquiry.lostReason') }}：{{ row.metadata.lostReason }}
                </p>
                <el-table
                  :data="displayLogChanges(row.changes)"
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
                      <pre class="m-0 max-h-[360px] overflow-auto whitespace-pre-wrap [overflow-wrap:anywhere] [font:inherit]">{{ displayValue(scope.row.before, scope.row.path, row.targetType, row.targetId) }}</pre>
                    </template>
                  </el-table-column>
                  <el-table-column
                    :label="$t('inquiry.log.after')"
                    min-width="280"
                  >
                    <template #default="scope">
                      <pre class="m-0 max-h-[360px] overflow-auto whitespace-pre-wrap [overflow-wrap:anywhere] [font:inherit]">{{ displayValue(scope.row.after, scope.row.path, row.targetType, row.targetId) }}</pre>
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
              {{ formatDateTime(row.occurredAt) }}
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
      </div>
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
import type { ItineraryDayRecord } from "@/types/itinerary";
import { formatDateTime } from "@/utils";
import { businessDictionaryService } from "@/services/business-dictionary.service";
import { canExpandLog, changeTone, displayLogChanges, formatLogValue } from "./log-presentation";
defineOptions({ name: "InquiryLogs" });
const { t, te, locale } = useI18n();
const route = useRoute(); const router = useRouter();
const inquiryId = computed(() => String(route.params.inquiryId ?? ""));
const inquiry = ref<InquiryRecord>();
const logs = ref<InquiryLogRecord[]>([]);
const itineraryDays = ref<Record<string, Record<string, ItineraryDayRecord>>>({});
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
    const itineraryIds = [...new Set(details.list
      .filter((row) => row.targetType === "itinerary" && row.changes.some((change) => change.path.endsWith(".dayIds")))
      .map((row) => row.targetId))];
    const itineraryRecords = await Promise.all(itineraryIds.map((id) => inquiryService.itinerary(id)));
    if (version !== requestVersion) return;
    logs.value = details.list; total.value = details.total; report.value = summary; operators.value = people; inquiry.value = record;
    itineraryDays.value = Object.fromEntries(itineraryRecords.map((record) => [
      record.id,
      Object.fromEntries(record.dailyPlans.map((day) => [day.id, day])),
    ]));
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
function displayValue(value: unknown, path: string, targetType: InquiryLogRecord["targetType"], targetId: string): string {
  return formatLogValue(value, path, {
    t,
    te,
    locale: locale.value,
    targetType,
    days: itineraryDays.value[targetId],
  });
}
</script>
<style scoped>
.inquiry-log-page :deep(.el-table__expand-icon.is-disabled) { visibility: hidden; }

.change-details :deep(.change-added) { color: var(--el-color-success); }
.change-details :deep(.change-removed) { color: var(--el-color-danger); }
.change-details :deep(.change-changed) { color: var(--el-color-warning); }
</style>
