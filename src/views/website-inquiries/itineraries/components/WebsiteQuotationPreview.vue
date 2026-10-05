<template>
  <el-dialog
    :model-value="modelValue"
    title="双语行程与报价"
    width="94vw"
    top="3vh"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template v-if="preview">
      <el-alert
        v-for="issue in preview.issues"
        :key="`${issue.code}-${issue.dayNumber ?? 0}-${issue.message}`"
        :type="issue.severity === 'ERROR' ? 'error' : 'warning'"
        :title="`${issue.code}${issue.dayNumber ? ` · D${issue.dayNumber}` : ''}：${issue.message}`"
        :closable="false"
        class="mb-2"
      />
      <el-checkbox-group
        v-if="!confirmed && warningCodes.length"
        v-model="acknowledged"
        class="mb-4"
      >
        <el-checkbox v-for="code in warningCodes" :key="code" :value="code"
          >已确认 {{ code }} 全部提示</el-checkbox
        >
      </el-checkbox-group>
      <el-radio-group v-model="language" class="mb-3">
        <el-radio-button value="en">英文客户版</el-radio-button>
        <el-radio-button value="zh">中文内部版</el-radio-button>
      </el-radio-group>
      <iframe
        v-if="previewUrl"
        :src="previewUrl"
        :title="language === 'en' ? '英文报价预览' : '中文报价预览'"
        class="block w-full h-[64vh] [border:1px_solid_var(--el-border-color)]"
      />
    </template>
    <template #footer>
      <el-button :disabled="loading" @click="emit('update:modelValue', false)">关闭</el-button>
      <el-button
        v-if="confirmed && canDownload"
        type="primary"
        :loading="loading"
        @click="emit('print', language)"
        >打印／另存 PDF</el-button
      >
      <el-button
        v-if="!confirmed && canConfirm"
        type="primary"
        :loading="loading"
        :disabled="hasErrors || acknowledged.length !== warningCodes.length"
        @click="emit('confirm', acknowledged)"
        >确认报价并锁定行程</el-button
      >
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { WebsitePreview } from "@/types/website";
import { websitePrintBlob } from "../print";
const props = defineProps<{
  modelValue: boolean;
  preview?: WebsitePreview;
  confirmed: boolean;
  canConfirm: boolean;
  canDownload: boolean;
  loading: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  confirm: [codes: string[]];
  print: [language: "en" | "zh"];
}>();
const language = ref<"en" | "zh">("en");
const acknowledged = ref<string[]>([]);
const previewUrl = ref("");
const hasErrors = computed(
  () => props.preview?.issues.some((issue) => issue.severity === "ERROR") ?? true,
);
const warningCodes = computed(() => [
  ...new Set(
    props.preview?.issues
      .filter((issue) => issue.severity === "WARNING")
      .map((issue) => issue.code) ?? [],
  ),
]);
function clearUrl() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = "";
}
watch(
  () => [props.modelValue, props.preview, language.value],
  () => {
    clearUrl();
    if (props.modelValue && props.preview)
      previewUrl.value = URL.createObjectURL(websitePrintBlob(props.preview, language.value));
  },
);
watch(
  () => props.preview,
  () => {
    acknowledged.value = [];
  },
);
onBeforeUnmount(clearUrl);
</script>
