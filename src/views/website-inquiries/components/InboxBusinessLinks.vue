<template>
  <h4 class="mt-[16px] mb-[8px] text-[14px] text-strong font-600">
    {{ $t("whatsapp.business") }}
  </h4>
  <el-descriptions :column="1" size="small" border>
    <el-descriptions-item :label="$t('whatsapp.inquiry')">
      <div class="flex flex-wrap items-center gap-x-[8px]">
        <el-button
          v-if="inquiryId && canViewInquiry"
          link
          size="small"
          type="primary"
          @click="emit('view-inquiry', inquiryId)"
        >
          {{ $t("whatsapp.viewInquiry") }}
        </el-button>
        <span v-else-if="inquiryId">{{ $t("whatsapp.inquiryLinked") }}</span>
        <template v-else>
          <span>{{ $t("whatsapp.noInquiry") }}</span>
          <el-button
            link
            size="small"
            type="primary"
            :disabled="!canCreateInquiry"
            :loading="busy"
            @click="emit('create-inquiry')"
          >
            {{ $t("websiteInquiry.log.actions.inquiry_created") }}
          </el-button>
          <div v-if="needsOwner" class="w-full text-[var(--el-color-warning)]">
            {{ $t("whatsapp.assignBeforeInquiry") }}
          </div>
        </template>
      </div>
    </el-descriptions-item>
    <el-descriptions-item :label="$t('whatsapp.ledger')">
      <div class="flex flex-wrap items-center gap-x-[8px]">
        <el-button
          v-if="ledger"
          link
          size="small"
          type="primary"
          @click="emit('view-ledger', ledger.orderNo)"
        >
          {{ ledger.orderNo }}
        </el-button>
        <template v-else>
          <span>{{ $t("whatsapp.noLedger") }}</span>
          <el-button
            link
            size="small"
            type="primary"
            :disabled="!inquiryId || !canCreateLedger"
            @click="inquiryId && emit('create-ledger', inquiryId)"
          >
            {{ $t("whatsapp.createLedger") }}
          </el-button>
        </template>
      </div>
    </el-descriptions-item>
  </el-descriptions>
</template>

<script setup lang="ts">
defineProps<{
  inquiryId: string | null;
  ledger: { orderNo: string } | null;
  canCreateInquiry: boolean;
  canViewInquiry: boolean;
  canCreateLedger: boolean;
  needsOwner: boolean;
  busy: boolean;
}>();
const emit = defineEmits<{
  "create-inquiry": [];
  "view-inquiry": [id: string];
  "create-ledger": [id: string];
  "view-ledger": [orderNo: string];
}>();
</script>
