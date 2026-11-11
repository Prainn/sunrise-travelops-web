<template>
  <AppDialog
    :model-value="modelValue"
    :title="`${$t('inquiry.followUp.title')} · ${inquiry.code}`"
    size="lg"
    :busy="submitting"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <el-alert
        v-if="delivery && !delivery.available"
        type="warning"
        :closable="false"
        :title="deliveryReasonText(delivery.reason)"
      />
      <p class="m-0 text-[12px] text-muted">
        {{ $t("inquiry.followUp.recipientHint") }}
      </p>

      <el-form
        v-if="canAdd"
        :model="form"
        :disabled="submitting"
        label-position="top"
        class="surface-muted rounded-[var(--custom-radius)] px-4 pt-3"
      >
        <el-form-item :label="$t('inquiry.internalRemark')">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            :maxlength="REMARK_MAX_LENGTH"
            show-word-limit
          />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('inquiry.nextFollowUpAt')">
              <el-date-picker
                v-model="form.nextFollowUpAt"
                type="datetime"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DDTHH:mm:ssZ"
                :placeholder="$t('inquiry.nextFollowUpPlaceholder')"
                class="w-full!"
                @update:model-value="handleNextChange"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('inquiry.followUp.reminder')">
              <el-radio-group v-model="form.reminderDays">
                <el-radio :value="0">
                  {{ $t("inquiry.followUp.noReminder") }}
                </el-radio>
                <el-radio
                  v-for="days in REMINDER_OPTIONS"
                  :key="days"
                  :value="days"
                  :disabled="!form.nextFollowUpAt"
                >
                  {{ $t("inquiry.followUp.daysBefore", { days }) }}
                </el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <p v-if="reminderPreview" class="mt-0 mb-3 text-[13px]" :class="reminderPreview.past ? 'text-[var(--el-color-danger)]' : 'text-strong'">
          {{
            $t(reminderPreview.past ? "inquiry.followUp.reminderInPast" : "inquiry.followUp.reminderAt", {
              time: reminderPreview.time,
            })
          }}
        </p>
        <div class="mb-3 flex justify-end">
          <el-button
            type="primary"
            :loading="submitting"
            :disabled="!canSubmit"
            @click="handleSubmit"
          >
            {{ $t("inquiry.followUp.add") }}
          </el-button>
        </div>
      </el-form>
      <el-alert
        v-else-if="detail"
        type="info"
        :closable="false"
        :title="$t('inquiry.followUp.readOnly')"
      />

      <el-alert
        v-if="error"
        type="error"
        :closable="false"
        :title="error"
      >
        <el-button size="small" :loading="loading" @click="loadAll">
          {{ $t("common.retry") }}
        </el-button>
      </el-alert>
      <div v-loading="loading" class="flex min-h-[80px] flex-col gap-3">
        <p v-if="!loading && !error && !records.length" class="m-0 py-6 text-center text-[13px] text-muted">
          {{ $t("inquiry.followUp.empty") }}
        </p>
        <article
          v-for="record in records"
          :key="record.id"
          class="flex flex-col gap-1 rounded-[var(--custom-radius)] border border-solid border-[var(--card-border)] px-4 py-3 text-[13px]"
        >
          <header class="flex flex-wrap items-center gap-2">
            <template v-if="record.followedAt || record.followedByName">
              <span class="font-medium text-strong">{{ formatShanghaiDateTime(record.followedAt) }}</span>
              <span class="text-muted">{{ record.followedByName || $t("inquiry.followUp.unknownPerson") }}</span>
            </template>
            <span v-else class="text-muted">{{ $t("inquiry.followUp.legacyUnknown") }}</span>
            <el-tag v-if="record.legacy" size="small" type="info">
              {{ $t("inquiry.followUp.legacy") }}
            </el-tag>
          </header>
          <p class="m-0 whitespace-pre-wrap break-words">
            {{ record.remark || "-" }}
          </p>
          <div class="flex flex-wrap gap-x-6 gap-y-1 text-muted">
            <span>
              {{ $t("inquiry.nextFollowUpAt") }}：{{
                record.nextFollowUpAt ? formatShanghaiDateTime(record.nextFollowUpAt) : $t("common.notSet")
              }}
            </span>
            <span>
              {{ $t("inquiry.followUp.reminder") }}：{{
                record.reminderDays
                  ? $t("inquiry.followUp.daysBefore", { days: record.reminderDays })
                  : $t("inquiry.followUp.noReminder")
              }}
            </span>
            <span v-if="record.reminderAt">
              {{ $t("inquiry.followUp.reminderTime") }}：{{ formatShanghaiDateTime(record.reminderAt) }}
            </span>
          </div>
          <div v-if="record.reminderStatus || record.deliveryUnknown" class="flex flex-wrap items-center gap-2">
            <el-tag v-if="record.reminderStatus" size="small" :type="STATUS_TAG_TYPES[record.reminderStatus]">
              {{ $t(`inquiry.followUp.statuses.${record.reminderStatus}`) }}
            </el-tag>
            <el-tag v-if="record.deliveryUnknown" size="small" type="danger">
              {{ $t("inquiry.followUp.deliveryUnknown") }}
            </el-tag>
            <span v-if="record.reminderStatus === 'sent' && record.sentAt" class="text-muted">
              {{ $t("inquiry.followUp.sentAt", { time: formatShanghaiDateTime(record.sentAt) }) }}
            </span>
            <span v-if="record.reminderError && !record.deliveryUnknown" class="text-[var(--el-color-danger)]">
              {{ record.reminderError }}
            </span>
          </div>
        </article>
      </div>
      <Pagination
        v-if="total > pageSize"
        :page="page"
        :limit="pageSize"
        :total="total"
        @update:page="changePage"
        @update:limit="changePageSize"
      />
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import { ApiErrorCode } from "@/api/error-code";
import { isApiError } from "@/api/request";
import AppDialog from "@/components/AppDialog/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import { inquiryService } from "@/services/inquiry.service";
import type {
  FollowUpDelivery,
  FollowUpReminderDays,
  FollowUpReminderStatus,
  InquiryFollowUpInput,
  InquiryFollowUpRecord,
  InquiryRecord,
} from "@/types/inquiry";
import { formatShanghaiDateTime } from "@/utils";
import { hasPerm } from "@/utils/auth";
import { requestErrorMessage } from "@/utils/version-conflict";
import { isInquiryReadOnly } from "../inquiry-workflow";

const REMARK_MAX_LENGTH = 20000;
const REMINDER_OPTIONS: FollowUpReminderDays[] = [1, 3, 5, 15];
const DAY_MS = 24 * 60 * 60 * 1000;
const STATUS_TAG_TYPES: Record<FollowUpReminderStatus, "primary" | "warning" | "success" | "danger" | "info"> = {
  pending: "primary",
  sending: "warning",
  sent: "success",
  failed: "danger",
  cancelled: "info",
};

const props = defineProps<{ modelValue: boolean; inquiry: InquiryRecord }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean]; changed: [] }>();
const { t } = useI18n();

/** 打开时重新读取的询盘详情，提交使用其最新 version。 */
const detail = ref<InquiryRecord>();
const records = ref<InquiryFollowUpRecord[]>([]);
const delivery = ref<FollowUpDelivery>();
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const error = ref("");
const submitting = ref(false);
/** reminderDays 为 0 表示不提醒，提交时转为 null。 */
const form = reactive<{ remark: string; nextFollowUpAt: string; reminderDays: FollowUpReminderDays | 0 }>({
  remark: "",
  nextFollowUpAt: "",
  reminderDays: 0,
});
/** 失败重试沿用的提交；内容或版本变化即视为新提交，换新的 requestId。 */
let pendingSubmission: { signature: string; requestId: string } | null = null;
let loadGeneration = 0;

const canAdd = computed(() =>
  Boolean(
    detail.value &&
      hasPerm("inquiry:update") &&
      !isInquiryReadOnly(detail.value.status, detail.value.hasActiveTour, detail.value.isSeries),
  ),
);
/** 提醒按上海自然日提前、保留时分；上海无夏令时，按整天毫秒数推算展示，最终以服务端为准。 */
const reminderPreview = computed(() => {
  if (!form.nextFollowUpAt || !form.reminderDays) return null;
  const at = new Date(form.nextFollowUpAt).getTime() - form.reminderDays * DAY_MS;
  if (Number.isNaN(at)) return null;
  return { time: formatShanghaiDateTime(new Date(at)), past: at <= Date.now() };
});
const canSubmit = computed(
  () => Boolean(form.remark.trim() || form.nextFollowUpAt) && !reminderPreview.value?.past,
);

watch(
  () => props.modelValue,
  (opened) => {
    if (!opened) return;
    resetForm();
    page.value = 1;
    void loadAll();
  },
  { immediate: true },
);

function resetForm() {
  form.remark = "";
  form.nextFollowUpAt = "";
  form.reminderDays = 0;
  pendingSubmission = null;
}

async function loadAll() {
  const generation = ++loadGeneration;
  loading.value = true;
  error.value = "";
  try {
    const [inquiry, result] = await Promise.all([
      inquiryService.detail(props.inquiry.id),
      inquiryService.followUps(props.inquiry.id, { page: page.value, pageSize: pageSize.value }),
    ]);
    if (generation !== loadGeneration) return;
    detail.value = inquiry;
    records.value = result.list;
    total.value = result.total;
    delivery.value = result.delivery;
  } catch (loadError) {
    if (generation === loadGeneration) error.value = requestErrorMessage(loadError);
  } finally {
    if (generation === loadGeneration) loading.value = false;
  }
}

function changePage(value: number) {
  page.value = value;
  void loadAll();
}
function changePageSize(value: number) {
  pageSize.value = value;
  page.value = 1;
  void loadAll();
}

/** 清空下次跟进时间时同时取消提醒，未填写时间不能启用提醒。 */
function handleNextChange(value: string | null) {
  if (!value) form.reminderDays = 0;
}

function deliveryReasonText(reason: FollowUpDelivery["reason"]) {
  if (reason === "FEISHU_NOT_CONFIGURED" || reason === "FOLLOW_UP_RECIPIENT_UNAVAILABLE")
    return t(`inquiry.followUp.deliveryReasons.${reason}`);
  return t("inquiry.followUp.deliveryUnavailable");
}

/** 浏览器非安全上下文没有 randomUUID，用 getRandomValues 生成 v4 UUID。 */
function createRequestId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function buildInput(version: number): InquiryFollowUpInput {
  const content = {
    remark: form.remark,
    nextFollowUpAt: form.nextFollowUpAt || null,
    reminderDays: form.nextFollowUpAt && form.reminderDays ? form.reminderDays : null,
  };
  const signature = JSON.stringify([version, content]);
  if (pendingSubmission?.signature !== signature)
    pendingSubmission = { signature, requestId: createRequestId() };
  return { version, requestId: pendingSubmission.requestId, ...content };
}

async function handleSubmit() {
  const current = detail.value;
  if (submitting.value || !current || !canSubmit.value) return;
  submitting.value = true;
  try {
    const result = await inquiryService.addFollowUp(current.id, buildInput(current.version));
    current.version = result.inquiryVersion;
    delivery.value = result.delivery;
    pendingSubmission = null;
    ElMessage.success(t("inquiry.followUp.saved"));
    if (result.delivery && !result.delivery.available && form.reminderDays)
      ElMessage.warning(deliveryReasonText(result.delivery.reason));
    resetForm();
    page.value = 1;
    emit("changed");
    await loadAll();
  } catch (submitError) {
    // 保留未提交内容；网络失败重试沿用同一 requestId，业务错误按提示调整。
    if (isApiError(submitError) && submitError.code === ApiErrorCode.INQUIRY_VERSION_CONFLICT) {
      ElMessage.warning(t("inquiry.followUp.versionConflict"));
      await loadAll();
      return;
    }
    if (isApiError(submitError) && submitError.details?.reason === "FOLLOW_UP_REMINDER_IN_PAST") {
      ElMessage.error(t("inquiry.followUp.reminderInPastError"));
      return;
    }
    ElMessage.error(requestErrorMessage(submitError));
  } finally {
    submitting.value = false;
  }
}
</script>
