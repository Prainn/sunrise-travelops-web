<!-- 飞书通知管理：总部管理员按业务类型配置发送时段与飞书提醒开关，不影响业务动作 -->
<template>
  <PageShell>
    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="fetchSettings" />
      <el-alert
        class="mb-3"
        type="info"
        :closable="false"
        show-icon
        :title="$t('notificationSettings.hint')"
      />
      <DataTable
        fill
        :loading="loading"
        :data="settings"
        :error="loadError"
        :empty-text="$t('notificationSettings.empty')"
        row-key="type"
        @retry="fetchSettings"
      >
        <el-table-column :label="$t('notificationSettings.type')" min-width="220">
          <template #default="{ row }">
            {{ typeLabel(row as NotificationSetting) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('notificationSettings.sendWindow')" min-width="240">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <span :class="{ 'text-[var(--el-text-color-secondary)]': !(row as NotificationSetting).sendWindow }">
                {{ formatSendWindow((row as NotificationSetting).sendWindow, t) }}
              </span>
              <el-button
                v-if="canUpdate"
                type="primary"
                link
                :disabled="isSaving((row as NotificationSetting).type)"
                :aria-label="$t('notificationSettings.editSendWindowAria', { name: typeLabel(row as NotificationSetting) })"
                @click="openWindowDialog(row as NotificationSetting)"
              >
                {{ $t("common.edit") }}
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('notificationSettings.enabled')" width="160" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="(row as NotificationSetting).enabled"
              :loading="isSaving((row as NotificationSetting).type)"
              :disabled="!canUpdate || isSaving((row as NotificationSetting).type)"
              :aria-label="typeLabel(row as NotificationSetting)"
              @update:model-value="(value) => handleToggle(row as NotificationSetting, Boolean(value))"
            />
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.updatedAt')" width="200">
          <template #default="{ row }">
            {{ formatDateTime((row as NotificationSetting).updatedAt) }}
          </template>
        </el-table-column>
      </DataTable>
    </SectionCard>

    <AppDialog
      v-model="windowDialogVisible"
      :title="windowDialogTitle"
      size="sm"
      :busy="isWindowDialogSaving"
      destroy-on-close
      @closed="resetWindowDialog"
    >
      <el-form
        label-position="top"
        :disabled="isWindowDialogSaving"
        @submit.prevent="handleSaveWindow"
      >
        <el-form-item :label="$t('notificationSettings.windowMode')">
          <el-radio-group v-model="windowDraft.mode" @change="windowValidationError = ''">
            <el-radio value="allDay">
              {{ $t("notificationSettings.allDay") }}
            </el-radio>
            <el-radio value="custom">
              {{ $t("notificationSettings.customWindow") }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <template v-if="windowDraft.mode === 'custom'">
          <el-form-item
            :label="$t('notificationSettings.windowRange')"
            required
            :error="windowValidationError || undefined"
          >
            <div class="flex items-center gap-2 w-full">
              <el-time-picker
                :model-value="windowDraft.start"
                format="HH:mm"
                value-format="HH:mm"
                :placeholder="$t('notificationSettings.startTime')"
                class="!flex-1"
                @update:model-value="handleDraftTimeChange('start', $event)"
              />
              <span class="text-[var(--el-text-color-secondary)]">
                –
              </span>
              <el-time-picker
                :model-value="windowDraft.end"
                format="HH:mm"
                value-format="HH:mm"
                :placeholder="$t('notificationSettings.endTime')"
                class="!flex-1"
                @update:model-value="handleDraftTimeChange('end', $event)"
              />
            </div>
          </el-form-item>

          <p class="m-0 text-xs text-[var(--el-text-color-secondary)]">
            {{ $t("notificationSettings.windowRangeHint") }}
          </p>
          <p
            v-if="overnightPreviewText"
            class="mt-2 mb-0 text-xs text-[var(--el-color-warning)]"
          >
            {{ overnightPreviewText }}
          </p>
        </template>
      </el-form>

      <template #footer>
        <el-button :disabled="isWindowDialogSaving" @click="windowDialogVisible = false">
          {{ $t("common.cancel") }}
        </el-button>
        <el-button
          type="primary"
          :loading="isWindowDialogSaving"
          :disabled="isWindowDialogSaving"
          @click="handleSaveWindow"
        >
          {{ $t("common.save") }}
        </el-button>
      </template>
    </AppDialog>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import {
  FEISHU_NOTIFICATION_TYPES,
  type NotificationSetting,
  type NotificationType,
} from "@/types/notification";
import AppDialog from "@/components/AppDialog/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { useRefreshOnActivated } from "@/composables";
import { formatDateTime } from "@/utils";
import { hasPerm } from "@/utils/auth";
import {
  formatSendWindow,
  isOvernightSendWindow,
  useNotificationSettings,
  validateSendWindow,
  type SendWindowValidationError,
} from "./useNotificationSettings";

defineOptions({ name: "NotificationManagement" });

type WindowMode = "allDay" | "custom";

const { t } = useI18n();
const {
  settings,
  loading,
  loadError,
  isSaving,
  fetchSettings,
  saveEnabled,
  saveSendWindow,
} = useNotificationSettings();

// 保存按当前身份的有效动作权限控制；服务端仍独立校验。
const canUpdate = computed(() => hasPerm("sys:notification:update"));
const windowDialogVisible = ref(false);
const editingType = ref<NotificationType | null>(null);
const windowValidationError = ref("");
const windowDraft = reactive<{ mode: WindowMode; start: string; end: string }>({
  mode: "allDay",
  start: "",
  end: "",
});

const editingRow = computed(() => (
  editingType.value
    ? settings.value.find((item) => item.type === editingType.value) ?? null
    : null
));

const isWindowDialogSaving = computed(() => (
  editingType.value ? isSaving(editingType.value) : false
));

const windowDialogTitle = computed(() => (
  editingRow.value
    ? t("notificationSettings.editSendWindowTitle", { name: typeLabel(editingRow.value) })
    : t("notificationSettings.editSendWindow")
));

const overnightPreviewText = computed(() => {
  if (windowDraft.mode !== "custom") return "";
  if (validateSendWindow(windowDraft) !== null) return "";
  const candidate = { start: windowDraft.start.trim(), end: windowDraft.end.trim() };
  if (!isOvernightSendWindow(candidate)) return "";
  return t("notificationSettings.overnightPreview", {
    range: formatSendWindow(candidate, t),
  });
});

/** 已知类型使用本地化名称；后端新增类型时显示服务端名称，不暴露技术编码。 */
function typeLabel(row: NotificationSetting) {
  return FEISHU_NOTIFICATION_TYPES.includes(row.type) ? t(`notificationSettings.types.${row.type}`) : row.name;
}

function validationErrorText(reason?: SendWindowValidationError, serverMessage?: string) {
  if (reason === "incomplete") return t("notificationSettings.windowRequired");
  if (reason === "same") return t("notificationSettings.windowSame");
  if (reason === "invalid") return t("notificationSettings.windowInvalid");
  return serverMessage || t("notificationSettings.windowInvalid");
}

function openWindowDialog(row: NotificationSetting) {
  if (!canUpdate.value || isSaving(row.type)) return;
  editingType.value = row.type;
  windowValidationError.value = "";
  if (row.sendWindow) {
    windowDraft.mode = "custom";
    windowDraft.start = row.sendWindow.start;
    windowDraft.end = row.sendWindow.end;
  } else {
    windowDraft.mode = "allDay";
    windowDraft.start = "";
    windowDraft.end = "";
  }
  windowDialogVisible.value = true;
}

function resetWindowDialog() {
  editingType.value = null;
  windowValidationError.value = "";
  windowDraft.mode = "allDay";
  windowDraft.start = "";
  windowDraft.end = "";
}

function handleDraftTimeChange(field: "start" | "end", value: unknown) {
  windowDraft[field] = typeof value === "string" ? value : "";
  windowValidationError.value = "";
}

async function handleToggle(row: NotificationSetting, enabled: boolean) {
  if (!canUpdate.value) return;
  const result = await saveEnabled(row.type, enabled);
  if (result.kind === "saved") ElMessage.success(t("common.saveSuccess"));
  else if (result.kind === "conflict") ElMessage.warning(t("notificationSettings.conflict"));
  else if (result.kind === "validation") ElMessage.error(result.message || t("notificationSettings.windowInvalid"));
  else if (result.kind === "failed") ElMessage.error(result.message || t("common.saveFailed"));
}

async function handleSaveWindow() {
  if (!canUpdate.value || !editingType.value) return;
  const payload = windowDraft.mode === "allDay"
    ? null
    : { start: windowDraft.start.trim(), end: windowDraft.end.trim() };
  const result = await saveSendWindow(editingType.value, payload);
  if (result.kind === "saved") {
    windowDialogVisible.value = false;
    ElMessage.success(t("common.saveSuccess"));
  } else if (result.kind === "skipped") {
    windowDialogVisible.value = false;
  } else if (result.kind === "validation") {
    const message = validationErrorText(result.reason, result.message);
    if (windowDraft.mode === "custom") windowValidationError.value = message;
    else ElMessage.error(message);
  } else if (result.kind === "conflict") {
    windowDialogVisible.value = false;
    ElMessage.warning(t("notificationSettings.conflict"));
  } else if (result.kind === "failed") {
    ElMessage.error(result.message || t("common.saveFailed"));
  }
}

onMounted(fetchSettings);
useRefreshOnActivated(fetchSettings);
</script>
