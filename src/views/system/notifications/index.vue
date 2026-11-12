<!-- 飞书通知管理：总部管理员按业务类型开关飞书提醒，开关不影响业务动作 -->
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
        <el-table-column :label="$t('notificationSettings.enabled')" width="160" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="(row as NotificationSetting).enabled"
              :loading="isSaving((row as NotificationSetting).type)"
              :disabled="!canUpdate"
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
  </PageShell>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import { FEISHU_NOTIFICATION_TYPES, type NotificationSetting } from "@/types/notification";
import DataTable from "@/components/DataTable/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { useRefreshOnActivated } from "@/composables";
import { formatDateTime } from "@/utils";
import { hasPerm } from "@/utils/auth";
import { useNotificationSettings } from "./useNotificationSettings";

defineOptions({ name: "NotificationManagement" });

const { t } = useI18n();
const { settings, loading, loadError, isSaving, fetchSettings, saveEnabled } = useNotificationSettings();
// 保存按当前身份的有效动作权限控制；服务端仍独立校验。
const canUpdate = hasPerm("sys:notification:update");

/** 已知类型使用本地化名称；后端新增类型时显示服务端名称，不暴露技术编码。 */
function typeLabel(row: NotificationSetting) {
  return FEISHU_NOTIFICATION_TYPES.includes(row.type) ? t(`notificationSettings.types.${row.type}`) : row.name;
}
async function handleToggle(row: NotificationSetting, enabled: boolean) {
  if (!canUpdate) return;
  const result = await saveEnabled(row.type, enabled);
  if (result.kind === "saved") ElMessage.success(t("common.saveSuccess"));
  else if (result.kind === "conflict") ElMessage.warning(t("notificationSettings.conflict"));
  else if (result.kind === "failed") ElMessage.error(result.message || t("common.saveFailed"));
}

onMounted(fetchSettings);
useRefreshOnActivated(fetchSettings);
</script>
