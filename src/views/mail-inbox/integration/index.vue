<template>
  <PageShell>
    <RuntimeCard
      :title="$t('route.mailIntegration')"
      :help="$t('mail.integration.help')"
      :inbound-label="$t('mail.integration.inbound')"
      :has-status="!!status"
      :loading="loading"
      :error="error"
      :switches="switches"
      @refresh="load"
      @toggle="handleToggle"
    >
      <template v-if="status">
        <el-descriptions
          v-for="row in status.mailboxes"
          :key="row.mailbox"
          class="mb-[12px] last:mb-0"
          :column="2"
          border
        >
          <el-descriptions-item :label="$t('mail.integration.mailbox')" :span="2">
            <span class="break-all">{{ row.mailbox }}</span>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('mail.integration.inbox')">
            <ActivityStatus :activity="row.inbox" :stale-after-seconds="status.staleAfterSeconds" />
          </el-descriptions-item>
          <el-descriptions-item :label="$t('mail.integration.sent')">
            <ActivityStatus :activity="row.sent" :stale-after-seconds="status.staleAfterSeconds" />
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </RuntimeCard>
  </PageShell>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import ActivityStatus from "@/components/IntegrationStatus/ActivityStatus.vue";
import RuntimeCard from "@/components/IntegrationStatus/RuntimeCard.vue";
import PageShell from "@/components/PageShell/index.vue";
import { useRefreshOnActivated } from "@/composables";
import { useIntegrationStatus } from "@/composables/useIntegrationStatus";
import { mailService } from "@/services/mail.service";

defineOptions({ name: "MailIntegration" });

const { status, loading, error, switches, load, handleToggle } = useIntegrationStatus(mailService.integration, mailService.updateRuntime);
onMounted(load);
useRefreshOnActivated(load);
</script>
