<template>
  <SectionCard :title="$t('whatsapp.customer')" padding="compact" class="whatsapp-info">
    <el-descriptions :column="1" size="small" border>
      <el-descriptions-item :label="$t('whatsapp.name')">
        {{ detail.name || $t("common.notSet") }}
      </el-descriptions-item>
      <el-descriptions-item :label="$t('whatsapp.phone')">
        {{ detail.phone || $t("common.notSet") }}
      </el-descriptions-item>
      <el-descriptions-item label="BSUID">
        <span class="break-all">{{ detail.bsuid || $t("common.notSet") }}</span>
      </el-descriptions-item>
      <el-descriptions-item :label="$t('whatsapp.lastInboundAt')">
        {{ formatDateTime(detail.lastInboundAt) }}
      </el-descriptions-item>
      <el-descriptions-item :label="$t('whatsapp.owner')">
        <span :class="{ 'text-[var(--el-color-warning)]': !detail.ownerId }">
          {{ detail.ownerName || $t("whatsapp.unassigned") }}
        </span>
      </el-descriptions-item>
      <el-descriptions-item v-if="detail.assignmentLockedAt" :label="$t('whatsapp.assignmentLock')">
        <el-tooltip :content="$t('whatsapp.assignmentLockedHint')" placement="top">
          <span>{{ $t("whatsapp.assignmentLocked", { time: formatDateTime(detail.assignmentLockedAt) }) }}</span>
        </el-tooltip>
      </el-descriptions-item>
    </el-descriptions>

    <div class="flex flex-wrap gap-[8px] mt-[12px]">
      <el-button v-if="detail.capabilities.canAssign" type="primary" @click="emit('assign')">
        {{ $t(detail.ownerId ? "whatsapp.reassign" : "whatsapp.assign") }}
      </el-button>
      <el-button v-if="canUpdateState && detail.state === 'open'" :loading="busy" @click="emit('set-state', 'closed')">
        {{ $t("whatsapp.closeConversation") }}
      </el-button>
      <el-button
        v-if="canUpdateState && detail.state === 'closed'"
        type="primary"
        :loading="busy"
        @click="emit('set-state', 'open')"
      >
        {{ $t("whatsapp.reopenConversation") }}
      </el-button>
    </div>

    <h4 class="mt-[16px] mb-[8px] text-[14px] text-strong font-600">
      {{ $t("whatsapp.business") }}
    </h4>
    <el-descriptions :column="1" size="small" border>
      <el-descriptions-item :label="$t('whatsapp.inquiry')">
        <el-button
          v-if="detail.inquiryId && canViewInquiry"
          link
          type="primary"
          @click="emit('view-inquiry', detail.inquiryId)"
        >
          {{ $t("whatsapp.viewInquiry") }}
        </el-button>
        <span v-else-if="detail.inquiryId">{{ $t("whatsapp.inquiryLinked") }}</span>
        <template v-else>
          <span>{{ $t("whatsapp.noInquiry") }}</span>
          <el-button
            v-if="detail.capabilities.canCreateInquiry"
            link
            type="primary"
            class="ml-[8px]"
            :loading="busy"
            @click="emit('create-inquiry')"
          >
            {{ $t("whatsapp.createInquiry") }}
          </el-button>
          <div v-else-if="!detail.ownerId && detail.state !== 'archived'" class="text-[12px] text-[var(--el-color-warning)]">
            {{ $t("whatsapp.assignBeforeInquiry") }}
          </div>
        </template>
      </el-descriptions-item>
      <el-descriptions-item :label="$t('whatsapp.ledger')">
        <el-button
          v-if="detail.ledger"
          link
          type="primary"
          @click="emit('view-ledger', detail.ledger.orderNo)"
        >
          {{ detail.ledger.orderNo }}
        </el-button>
        <template v-else>
          <span>{{ $t("whatsapp.noLedger") }}</span>
          <el-button
            v-if="detail.inquiryId && canCreateLedger && detail.state !== 'archived'"
            link
            type="primary"
            class="ml-[8px]"
            @click="emit('create-ledger', detail.inquiryId)"
          >
            {{ $t("whatsapp.createLedger") }}
          </el-button>
        </template>
      </el-descriptions-item>
    </el-descriptions>

    <template v-if="detail.tours.length || detail.previousId || detail.capabilities.canStartConsultation">
      <h4 class="mt-[16px] mb-[8px] text-[14px] text-strong font-600">
        {{ $t("whatsapp.tours") }}
      </h4>
      <el-alert
        v-if="detail.hasFormedTours && detail.state !== 'archived'"
        type="info"
        :closable="false"
        show-icon
        :title="$t('whatsapp.hasTours')"
        class="mb-[8px]!"
      />
      <el-select
        v-if="detail.tours.length"
        :model-value="''"
        autocomplete="new-password"
        :placeholder="$t('whatsapp.tourPlaceholder')"
        class="w-full"
        @update:model-value="openTourConversation"
      >
        <el-option
          v-for="tour in detail.tours"
          :key="tour.id"
          :value="tour.id"
          :label="$t('whatsapp.tourOption', { tourNo: tour.tourNo, title: tour.title || '-' })"
        />
      </el-select>
      <div class="flex flex-wrap gap-[8px] mt-[8px]">
        <el-button v-if="detail.previousId" @click="emit('open-conversation', detail.previousId)">
          {{ $t("whatsapp.viewPrevious") }}
        </el-button>
        <el-button
          v-if="detail.capabilities.canStartConsultation"
          type="primary"
          :loading="busy"
          @click="emit('start-consultation')"
        >
          {{ $t("whatsapp.startConsultation") }}
        </el-button>
      </div>
    </template>

    <slot name="notes" />

    <template v-if="showActions">
      <h4 class="mt-[16px] mb-[8px] text-[14px] text-strong font-600">
        {{ $t("whatsapp.assignmentRecords") }}
      </h4>
      <div v-if="!assignments.length" class="text-[12px] text-muted">
        {{ $t("whatsapp.noAssignmentRecords") }}
      </div>
      <div
        v-for="item in assignments"
        :key="item.id"
        class="text-[12px] py-[6px] border-b border-b-solid border-[var(--el-border-color-lighter)]"
      >
        <div class="text-muted">
          {{ formatDateTime(item.createdAt) }}
        </div>
        <div class="whitespace-pre-wrap break-words">
          {{ actionReason(item) }}
        </div>
      </div>
    </template>
  </SectionCard>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SectionCard from "@/components/SectionCard/index.vue";
import type { WhatsappAction, WhatsappConversationDetail } from "@/types/whatsapp";
import { formatDateTime } from "@/utils";

const props = defineProps<{
  detail: WhatsappConversationDetail;
  canUpdateState: boolean;
  canViewInquiry: boolean;
  canCreateLedger: boolean;
  busy: boolean;
  /** 有分配权限的主管在收件箱查看分配记录及理由。 */
  showActions: boolean;
  actions: WhatsappAction[];
}>();
const emit = defineEmits<{
  assign: [];
  "set-state": [state: "open" | "closed"];
  "start-consultation": [];
  "create-inquiry": [];
  "view-inquiry": [inquiryId: string];
  "create-ledger": [inquiryId: string];
  "view-ledger": [orderNo: string];
  "open-conversation": [id: string];
}>();

const assignments = computed(() => props.actions.filter((item) => item.action === "assigned"));

function actionReason(item: WhatsappAction) {
  const reason = item.details.reason;
  return typeof reason === "string" ? reason : "";
}
function openTourConversation(tourId: string) {
  const tour = props.detail.tours.find((item) => item.id === tourId);
  if (tour && tour.conversationId !== props.detail.id) emit("open-conversation", tour.conversationId);
}
</script>

<style scoped lang="scss">
.whatsapp-info {
  overflow-y: auto;
}
</style>
