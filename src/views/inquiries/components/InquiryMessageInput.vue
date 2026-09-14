<template>
  <div class="w-full">
    <el-upload
      drag
      accept=".doc,.docx"
      :auto-upload="false"
      :show-file-list="false"
      :disabled="isParsing"
      :on-change="importDocument"
      class="mb-2"
    >
      <el-button :loading="isParsing">
        {{ $t('inquiry.uploadDocument') }}
      </el-button>
      <template #tip>
        <div class="text-xs text-[var(--el-text-color-secondary)]">
          {{ $t('inquiry.documentHint') }}
        </div>
      </template>
    </el-upload>
    <el-input
      :model-value="modelValue"
      type="textarea"
      :rows="5"
      :maxlength="200000"
      :disabled="isParsing"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { ElMessage, type UploadFile } from "element-plus";
import { useI18n } from "vue-i18n";
import { inquiryService } from "@/services/inquiry.service";

defineProps<{ modelValue: string }>();
const emit = defineEmits<{
  "update:modelValue": [value: string];
  parsing: [value: boolean];
}>();
const { t } = useI18n();
const isParsing = ref(false);
let isActive = true;
onBeforeUnmount(() => { isActive = false; emit("parsing", false); });

async function importDocument(upload: UploadFile) {
  const file = upload.raw;
  if (!file || isParsing.value) return;
  if (!/\.docx?$/i.test(file.name) || file.size > 2 * 1024 * 1024) {
    ElMessage.error(t("inquiry.documentHint"));
    return;
  }
  isParsing.value = true;
  emit("parsing", true);
  try {
    const { text } = await inquiryService.parseDocument(file);
    if (isActive) emit("update:modelValue", text);
  } catch {
    if (isActive) ElMessage.error(t("inquiry.documentParseFailed"));
  } finally {
    if (isActive) {
      isParsing.value = false;
      emit("parsing", false);
    }
  }
}
</script>
