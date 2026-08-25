<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t('itinerary.pdfPreviewTitle')"
    width="92vw"
    top="4vh"
    destroy-on-close
    class="itinerary-pdf-preview"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="emit('closed')"
  >
    <iframe
      v-if="src"
      class="itinerary-pdf-preview__frame"
      :src="src"
      :title="$t('itinerary.pdfPreviewTitle')"
    />
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button
        type="primary"
        @click="emit('confirm')"
      >
        {{ $t("itinerary.confirmDownloadPdf") }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  src: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  closed: [];
  confirm: [];
}>();
</script>

<style scoped lang="scss">
.itinerary-pdf-preview__frame {
  display: block;
  width: 100%;
  height: 76vh;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background: var(--el-fill-color-light);
}

:global(.itinerary-pdf-preview .el-dialog__body) {
  padding-top: 8px;
  padding-bottom: 8px;
}
</style>
