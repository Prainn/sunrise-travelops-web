<template>
  <AppDialog
    :model-value="modelValue"
    :title="$t('websiteItineraryUi.quotationTitle')"
    size="full"
    :busy="loading"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="handleClosed"
  >
    <template v-if="preview">
      <el-alert
        v-for="group in issueGroups"
        :key="group.type"
        :type="group.type"
        :title="$t(group.title)"
        :closable="false"
        class="mb-3!"
      >
        <ul class="m-0 pl-4">
          <li v-for="issue in group.issues" :key="`${issue.code}-${issue.dayNumber ?? 0}-${issue.message}`">
            <button
              v-if="canLocateIssue(issue)"
              type="button"
              :disabled="loading"
              class="p-0 border-0 bg-transparent text-inherit text-left font-inherit cursor-pointer hover:underline focus-visible:underline disabled:cursor-wait"
              @click="locateIssue(issue)"
            >
              {{ issueText(issue) }}
            </button>
            <template v-else>
              {{ issueText(issue) }}
            </template>
          </li>
        </ul>
      </el-alert>
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
      <el-button
        v-if="canDownload && (confirmed || canConfirm)"
        :loading="loading"
        :disabled="!preview || (!confirmed && (hasErrors || acknowledged.length !== warningCodes.length))"
        @click="emit('export-word', language, acknowledged)"
      >
        {{ $t("itinerary.exportWord") }}
      </el-button>
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
import type { WebsitePreview, WebsiteValidation } from "@/types/website";
import { websitePrintBlob } from "../print";
const props = defineProps<{
  modelValue: boolean;
  preview?: WebsitePreview;
  confirmed: boolean;
  canConfirm: boolean;
  canDownload: boolean;
  loading: boolean;
  canLocateIssue: (issue: WebsiteValidation) => boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  confirm: [codes: string[]];
  print: [language: "en" | "zh"];
  "export-word": [language: "en" | "zh", codes: string[]];
  "locate-issue": [issue: WebsiteValidation];
}>();
const language = ref<"en" | "zh">("en");
const acknowledged = ref<string[]>([]);
const previewUrl = ref("");
let pendingIssue: WebsiteValidation | undefined;
function locateIssue(issue: WebsiteValidation) {
  if (props.loading) return;
  pendingIssue = issue;
  emit("update:modelValue", false);
}
function handleClosed() {
  const issue = pendingIssue;
  pendingIssue = undefined;
  if (issue) emit("locate-issue", issue);
}
/** 同级别问题合并为一个“标题 + 列表”提示，与行程调整顺序后的核对提示保持一致。 */
const issueGroups = computed(() => {
  const issues = props.preview?.issues ?? [];
  const errors = issues.filter((issue) => issue.severity === "ERROR");
  const warnings = issues.filter((issue) => issue.severity !== "ERROR");
  return [
    { type: "error" as const, title: "websiteItineraryUi.errorIssuesTitle", issues: errors },
    { type: "warning" as const, title: "websiteItineraryUi.warningIssuesTitle", issues: warnings },
  ].filter((group) => group.issues.length);
});
function issueText(issue: WebsiteValidation) {
  return `${issue.code}${issue.dayNumber ? ` · D${issue.dayNumber}` : ""}：${issue.message}`;
}
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
