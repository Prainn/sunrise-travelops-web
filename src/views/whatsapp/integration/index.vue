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
        <el-descriptions-item :label="$t('whatsapp.pendingEvents')">
          {{ status.pending }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('whatsapp.failedEvents')">
          {{ status.failed }}
        </el-descriptions-item>
      </el-descriptions>
    </SectionCard>
    <SectionCard fill>
      <TableToolbar :title="$t('whatsapp.failedEvents')" :refreshing="eventsLoading" @refresh="loadEvents" />
      <DataTable
        fill
        :loading="eventsLoading"
        :data="events"
        row-key="id"
        :empty-text="eventsError || $t('whatsapp.noFailedEvents')"
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
import type { WhatsappFailedEvent, WhatsappIntegrationStatus } from "@/types/whatsapp";
import { formatDateTime } from "@/utils";

defineOptions({ name: "WhatsappIntegration" });

const { t } = useI18n();
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
