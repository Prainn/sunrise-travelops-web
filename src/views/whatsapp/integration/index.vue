<template>
  <PageShell>
    <SectionCard :title="$t('whatsapp.integrationStatus')">
      <template #actions>
        <IconButton
          :label="$t('common.refresh')"
          :icon="Refresh"
          :loading="statusLoading"
          @click="loadStatus"
        />
      </template>
      <FeedbackState
        v-if="statusError"
        type="error"
        :description="statusError"
        retryable
        @retry="loadStatus"
      />
      <el-descriptions v-else-if="status" :column="2" border>
        <el-descriptions-item :label="$t('whatsapp.moduleEnabled')">
          <el-tag :type="status.enabled ? 'success' : 'info'">
            {{ $t(status.enabled ? "whatsapp.enabled" : "whatsapp.disabled") }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="$t('whatsapp.workerEnabled')">
          <el-tag :type="status.workerEnabled ? 'success' : 'info'">
            {{ $t(status.workerEnabled ? "whatsapp.enabled" : "whatsapp.disabled") }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-for="loop in workerLoops" :key="loop" :label="$t(`whatsapp.workerLoops.${loop}`)">
          <div class="flex flex-col gap-1">
            <el-tag class="self-start" :type="workerTagType(status.worker[loop].state)">
              {{ $t(`whatsapp.workerStates.${status.worker[loop].state}`) }}
            </el-tag>
            <span class="text-muted text-[12px]">{{ $t('whatsapp.lastWorkerSuccess') }}：{{ formatDateTime(status.worker[loop].lastCompletedAt) }}</span>
            <span v-if="status.worker[loop].lastErrorAt" class="text-muted text-[12px]">{{ $t('whatsapp.lastWorkerError') }}：{{ formatDateTime(status.worker[loop].lastErrorAt) }}</span>
          </div>
        </el-descriptions-item>
        <el-descriptions-item :label="$t('whatsapp.receiveMode')">
          {{ $t(`whatsapp.receiveModes.${status.receiveMode}`) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('whatsapp.sendEnabled')">
          <el-tag :type="status.sendEnabled ? 'success' : 'info'">
            {{ $t(status.sendEnabled ? "whatsapp.enabled" : "whatsapp.disabled") }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item :label="$t('whatsapp.lastReceivedAt')">
          {{ formatDateTime(status.lastReceivedAt) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('whatsapp.lastProcessedAt')">
          {{ formatDateTime(status.lastProcessedAt) }}
        </el-descriptions-item>
        <el-descriptions-item v-for="state in outboundStates" :key="state" :label="$t('whatsapp.outboundCount', { state: $t(`whatsapp.statuses.${state}`) })">
          {{ status.outbound[state] }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('whatsapp.oldestOutbound')">
          {{ formatDateTime(status.outbound.oldestPendingAt) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('whatsapp.pendingEvents')">
          {{ status.pending }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('whatsapp.failedEvents')">
          {{ status.failed }}
        </el-descriptions-item>
      </el-descriptions>
      <p v-if="status" class="text-muted text-[12px] mb-0">
        {{ $t("whatsapp.workerScopeHint") }}
      </p>
    </SectionCard>
    <SectionCard fill>
      <TableToolbar :title="$t('whatsapp.failedEvents')" :refreshing="eventsLoading" @refresh="loadEvents" />
      <FeedbackState
        v-if="eventsError"
        type="error"
        :description="eventsError"
        retryable
        @retry="loadEvents"
      />
      <DataTable
        v-else
        fill
        :loading="eventsLoading"
        :data="events"
        row-key="id"
        :empty-text="$t('whatsapp.noFailedEvents')"
      >
        <el-table-column prop="kind" :label="$t('whatsapp.eventKind')" min-width="120" />
        <el-table-column prop="attempts" :label="$t('whatsapp.attempts')" width="100" />
        <el-table-column :label="$t('whatsapp.errorCode')" min-width="160">
          <template #default="{ row }">
            {{ row.errorCode || "-" }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('whatsapp.receivedAt')" min-width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.receivedAt) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.actions')" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :loading="retrying.has(row.id)"
              @click="handleRetry(row.id)"
            >
              {{ $t("whatsapp.replay") }}
            </el-button>
          </template>
        </el-table-column>
      </DataTable>
      <Pagination
        v-model:page="page"
        v-model:limit="pageSize"
        :total="total"
        @pagination="loadEvents"
      />
    </SectionCard>
  </PageShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import DataTable from "@/components/DataTable/index.vue";
import FeedbackState from "@/components/FeedbackState/index.vue";
import IconButton from "@/components/IconButton/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { useRefreshOnActivated } from "@/composables";
import { websiteErrorMessage } from "@/services/website.service";
import { whatsappService } from "@/services/whatsapp.service";
import type { WhatsappFailedEvent, WhatsappIntegrationStatus, WhatsappWorkerStatus } from "@/types/whatsapp";
import { formatDateTime } from "@/utils";

defineOptions({ name: "WhatsappIntegration" });

const { t } = useI18n();
const workerLoops = ["events", "outbound"] as const;
const outboundStates = ["queued", "sending", "unknown", "failed"] as const;
function workerTagType(state: WhatsappWorkerStatus["state"]) {
  if (state === "running") return "success";
  if (state === "error" || state === "stalled") return "danger";
  if (state === "starting") return "warning";
  return "info";
}
const status = ref<WhatsappIntegrationStatus | null>(null);
const statusLoading = ref(false);
const statusError = ref("");
const events = ref<WhatsappFailedEvent[]>([]);
const eventsLoading = ref(false);
const eventsError = ref("");
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const retrying = ref(new Set<string>());

onMounted(refresh);
useRefreshOnActivated(refresh);

function refresh() {
  void loadStatus();
  void loadEvents();
}
async function loadStatus() {
  statusLoading.value = true;
  try {
    status.value = await whatsappService.integration();
    statusError.value = "";
  } catch (cause) {
    status.value = null;
    statusError.value = websiteErrorMessage(cause);
  } finally {
    statusLoading.value = false;
  }
}
async function loadEvents() {
  eventsLoading.value = true;
  try {
    const result = await whatsappService.failedEvents({ page: page.value, pageSize: pageSize.value });
    events.value = result.list;
    total.value = result.total;
    eventsError.value = "";
  } catch (cause) {
    events.value = [];
    total.value = 0;
    eventsError.value = websiteErrorMessage(cause);
  } finally {
    eventsLoading.value = false;
  }
}
// 重放只把失败事件重置为待处理，不会重发结果未知的出站消息。
async function handleRetry(id: string) {
  if (retrying.value.has(id)) return;
  try {
    await ElMessageBox.confirm(t("whatsapp.replayConfirm"), t("common.warning"), { type: "warning" });
  } catch {
    return;
  }
  retrying.value = new Set(retrying.value).add(id);
  try {
    await whatsappService.retryEvent(id);
    ElMessage.success(t("whatsapp.replaySuccess"));
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  } finally {
    const next = new Set(retrying.value);
    next.delete(id);
    retrying.value = next;
    refresh();
  }
}
</script>
