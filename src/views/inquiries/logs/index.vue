<template>
  <div class="page-container inquiry-log-page">
    <template v-if="inquiry">
      <el-card
        class="inquiry-log-page__context"
        shadow="never"
      >
        <el-page-header @back="router.push({ name: 'InquiryList' })">
          <template #content>
            <span class="inquiry-log-page__title">{{ $t("inquiry.log.title") }}</span>
          </template>
        </el-page-header>
        <div class="inquiry-log-page__summary">
          <span><small>{{ $t("inquiry.code") }}</small>{{ inquiry.code }}</span>
          <span><small>{{ $t("inquiry.agencyName") }}</small>{{ inquiry.agencyName }}</span>
          <span><small>{{ $t("inquiry.contactName") }}</small>{{ inquiry.contactName }}</span>
          <span><small>{{ $t("common.status") }}</small>{{ $t(`inquiry.statuses.${inquiry.status}`) }}</span>
        </div>
      </el-card>

      <el-card
        v-loading="isLoading"
        class="page-content inquiry-log-page__content"
        shadow="never"
      >
        <el-timeline v-if="logs.length">
          <el-timeline-item
            v-for="log in logs"
            :key="log.id"
            :timestamp="log.occurredAt"
            placement="top"
          >
            <div class="inquiry-log-page__entry">
              <div class="inquiry-log-page__entry-header">
                <el-tag :type="ACTION_TAG_TYPES[log.action]">
                  {{ $t(`inquiry.log.actions.${log.action}`) }}
                </el-tag>
                <span>{{ log.operatorName }}</span>
                <small v-if="log.operatorUsername">（{{ log.operatorUsername }}）</small>
              </div>
              <p v-if="log.targetType === 'itinerary'">
                {{ $t("inquiry.log.itineraryTarget", { code: log.targetCode, title: log.summary || "-" }) }}
              </p>
              <p v-if="log.action === 'inquiry_lost' && log.metadata?.lostReason">
                {{ $t("inquiry.lostReason") }}：{{ log.metadata.lostReason }}
              </p>
            </div>
          </el-timeline-item>
        </el-timeline>
        <el-empty
          v-else-if="!isLoading"
          :description="$t('inquiry.log.empty')"
        />
      </el-card>
    </template>

    <el-result
      v-else
      icon="warning"
      :title="$t('itinerary.inquiryNotFound')"
    >
      <template #extra>
        <el-button
          type="primary"
          @click="router.push({ name: 'InquiryList' })"
        >
          {{ $t("common.goBack") }}
        </el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { TagProps } from "element-plus";
import { useRoute, useRouter } from "vue-router";
import { inquiries } from "@/data/data";
import { inquiryLogService } from "@/services";
import type { InquiryLogAction, InquiryLogRecord } from "@/types/inquiry-log";

defineOptions({ name: "InquiryLogs" });

const ACTION_TAG_TYPES: Record<InquiryLogAction, TagProps["type"]> = {
  inquiry_created: "success",
  inquiry_updated: "primary",
  itinerary_created: "success",
  itinerary_saved: "primary",
  itinerary_pdf_generated: "warning",
  inquiry_archived: "info",
  inquiry_lost: "danger",
};

const route = useRoute();
const router = useRouter();
const inquiryId = computed(() => String(route.params.inquiryId ?? ""));
const inquiry = computed(() => inquiries.find((record) => record.id === inquiryId.value));
const logs = ref<InquiryLogRecord[]>([]);
const isLoading = ref(false);

async function fetchLogs() {
  if (!inquiry.value) return;
  isLoading.value = true;
  try {
    logs.value = await inquiryLogService.listByInquiryId(inquiryId.value);
  } finally {
    isLoading.value = false;
  }
}

onMounted(fetchLogs);
</script>

<style scoped lang="scss">
.inquiry-log-page__context { flex: none; }
.inquiry-log-page__title { color: var(--el-text-color-primary); font-size: 18px; font-weight: 600; }
.inquiry-log-page__summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; margin-top: 18px; }
.inquiry-log-page__summary span { display: flex; flex-direction: column; min-width: 0; }
.inquiry-log-page__summary small { margin-bottom: 4px; color: var(--el-text-color-secondary); }
.inquiry-log-page__content { overflow: auto; padding-top: 8px; }
.inquiry-log-page__entry { padding: 14px 16px; border: 1px solid var(--el-border-color-lighter); border-radius: var(--el-border-radius-base); }
.inquiry-log-page__entry-header { display: flex; align-items: center; gap: 8px; }
.inquiry-log-page__entry-header small { color: var(--el-text-color-secondary); }
.inquiry-log-page__entry p { margin: 10px 0 0; color: var(--el-text-color-regular); }
@media (width <= 900px) { .inquiry-log-page__summary { grid-template-columns: repeat(2, 1fr); } }
</style>
