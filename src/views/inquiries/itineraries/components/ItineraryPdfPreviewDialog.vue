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
      class="itinerary-pdf-preview__frame block w-full h-[76vh] [border:1px_solid_var(--el-border-color)] rounded-[var(--el-border-radius-base)] [background:var(--el-fill-color-light)]"
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
:global(.itinerary-pdf-preview .el-dialog__body) {
  padding-top: 8px;
  padding-bottom: 8px;
}
</style>
