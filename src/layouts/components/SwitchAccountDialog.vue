<!-- 切换到同组关联账号：当前账号仅标记；全部同会话标签页就绪后才发送切换请求 -->
<template>
  <AppDialog
    v-model="visible"
    :title="$t('accountSwitch.title')"
    size="sm"
    :busy="switching"
  >
    <el-empty v-if="!accounts.length" :description="$t('accountSwitch.empty')" :image-size="80" />
    <div v-else class="flex flex-col gap-2">
      <div
        v-for="account in accounts"
        :key="account.userId"
        class="flex items-center gap-2 rounded-[6px] border border-[var(--el-border-color-lighter)] p-[8px_12px]"
      >
        <el-tag size="small">
          {{ account.scopeName }}
        </el-tag>
        <div class="min-w-0 flex-1">
          <div class="truncate">
            {{ account.nickname }}
          </div>
          <div class="truncate text-xs text-[var(--el-text-color-secondary)]">
            {{ account.username }}
          </div>
        </div>
        <el-tag v-if="account.current" type="success" size="small">
          {{ $t("accountSwitch.current") }}
        </el-tag>
        <el-button
          v-else
          type="primary"
          size="small"
          :loading="switchingId === account.userId"
          :disabled="switching"
          @click="handleSwitch(account.userId)"
        >
          {{ $t("accountSwitch.switch") }}
        </el-button>
      </div>
    </div>
  </AppDialog>
</template>

<script setup lang="ts">
import AppDialog from "@/components/AppDialog/index.vue";
import type { LinkedAccount } from "@/types/account-link";
import { switchBlockedMessage, switchToLinkedAccount } from "@/utils/account-switch-runtime";
import { requestErrorMessage } from "@/utils/version-conflict";

defineProps<{ accounts: LinkedAccount[] }>();
const emit = defineEmits<{ failed: [] }>();
const visible = defineModel<boolean>({ required: true });

const { t } = useI18n();
const switchingId = ref("");
const switching = computed(() => Boolean(switchingId.value));

/** 成功与结果不明时页面整页跳转；阻止或明确失败时留在当前页继续编辑。 */
async function handleSwitch(targetUserId: string): Promise<void> {
  if (switching.value) return;
  switchingId.value = targetUserId;
  try {
    const result = await switchToLinkedAccount(targetUserId);
    if (result.status === "blocked") {
      ElMessage.warning(switchBlockedMessage(result.reasons, result.local));
    } else if (result.status === "failed") {
      ElMessage.error(requestErrorMessage(result.error));
      emit("failed");
    } else if (result.status === "unknown") {
      ElMessage.error(t("accountSwitch.unknownResult"));
    }
  } finally {
    switchingId.value = "";
  }
}
</script>
