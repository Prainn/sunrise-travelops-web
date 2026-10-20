<template>
  <AppDialog
    :model-value="modelValue"
    :title="$t('websiteItineraryUi.quotationTitle')"
    size="full"
    :busy="loading"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template v-if="preview">
      <el-alert
        v-for="issue in preview.issues"
        :key="`${issue.code}-${issue.dayNumber ?? 0}-${issue.message}`"
        :type="issue.severity === 'ERROR' ? 'error' : 'warning'"
        :title="`${issue.code}${issue.dayNumber ? ` · D${issue.dayNumber}` : ''}：${issue.message}`"
        :closable="false"
        class="mb-3!"
      />
      <el-checkbox-group
        v-if="!confirmed && warningCodes.length"
        v-model="acknowledged"
        class="mb-4"
      >
        <el-checkbox v-for="code in warningCodes" :key="code" :value="code">
          {{ $t("websiteItineraryUi.acknowledgeWarnings", { code }) }}
        </el-checkbox>
      </el-checkbox-group>
      <el-radio-group v-model="language" class="mb-3">
        <el-radio-button value="en">
          {{ $t("websiteItineraryUi.englishCustomerVersion") }}
        </el-radio-button>
        <el-radio-button value="zh">
          {{ $t("websiteItineraryUi.chineseInternalVersion") }}
        </el-radio-button>
      </el-radio-group>
      <iframe
        v-if="previewUrl"
        :src="previewUrl"
        :title="
          $t(
            language === 'en'
              ? 'websiteItineraryUi.englishPreview'
              : 'websiteItineraryUi.chinesePreview',
          )
        "
        class="block w-full h-[64vh] border border-solid border-[var(--card-border)] rounded-[var(--custom-radius)]"
      />
    </template>
    <template #footer>
      <el-button :disabled="loading" @click="emit('update:modelValue', false)">
        {{ $t("common.close") }}
      </el-button>
      <el-button
        v-if="confirmed && canDownload"
        type="primary"
        :loading="loading"
        @click="emit('print', language)"
      >
        {{ $t("websiteItineraryUi.printPdf") }}
      </el-button>
      <el-button
        v-if="!confirmed && canConfirm"
        type="primary"
        :loading="loading"
        :disabled="hasErrors || acknowledged.length !== warningCodes.length"
        @click="emit('confirm', acknowledged)"
      >
        {{ $t("websiteItineraryUi.confirmQuotation") }}
      </el-button>
    </template>
  </AppDialog>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import AppDialog from "@/components/AppDialog/index.vue";
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
