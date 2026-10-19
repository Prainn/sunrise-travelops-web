<template>
  <AppDialog
    :model-value="modelValue"
    :title="$t('itinerary.pdfPreviewTitle')"
    size="full"
    close-on-click-modal
    :busy="loading"
    destroy-on-close
    class="itinerary-pdf-preview"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="emit('closed')"
  >
    <p class="mt-0 mb-[12px] text-[var(--el-text-color-regular)]">
      {{ $t("itinerary.pdfPrintHint") }}
    </p>
    <iframe
      v-if="src"
      class="itinerary-pdf-preview__frame block w-full h-[76vh] [border:1px_solid_var(--card-border)] rounded-[var(--el-border-radius-base)] [background:var(--surface-muted)]"
      :src="src"
      :title="$t('itinerary.pdfPreviewTitle')"
    />
    <template #footer>
      <el-button :disabled="loading" @click="emit('update:modelValue', false)">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" :loading="loading" @click="emit('confirm')">
        {{ $t("itinerary.confirmDownloadPdf") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import AppDialog from "@/components/AppDialog/index.vue";

defineProps<{
  modelValue: boolean;
  src: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  closed: [];
  confirm: [];
}>();
</script>
