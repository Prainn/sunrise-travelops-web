<!-- 解除账号关联：可在同一请求为共享标识的账号分配新标识，冲突时整体不解除 -->
<template>
  <AppDialog
    v-model="visible"
    :title="$t('accountLink.unlinkTitle')"
    size="md"
    :busy="isSubmitting"
    destroy-on-close
  >
    <el-alert
      :title="$t('accountLink.unlinkConfirm')"
      type="warning"
      :closable="false"
      show-icon
      class="mb-3"
    />
    <div class="mb-2 text-xs text-[var(--el-text-color-secondary)]">
      {{ $t("accountLink.overridesHint") }}
    </div>
    <el-form ref="formRef" :model="form" @submit.prevent>
      <el-form-item
        v-for="account in members"
        :key="account.userId"
        :prop="['overrides', account.userId]"
        :rules="tourCodeRules(false)"
        class="mb-3"
      >
        <div class="flex w-full items-center gap-2">
          <span class="min-w-0 flex-1 truncate">
            {{ account.scopeName }} · {{ account.nickname }}（{{ account.username }}）·
            {{ account.tourCode || "-" }}
          </span>
          <el-tag v-if="sharesTourCode(account, members)" type="danger" size="small">
            {{ $t("accountLink.sharedTourCode") }}
          </el-tag>
          <el-input
            v-model="form.overrides[account.userId]"
            class="!w-40"
            maxlength="10"
            clearable
            :placeholder="$t('accountLink.newTourCode')"
            @blur="
              form.overrides[account.userId] = normalizeTourCode(form.overrides[account.userId] ?? '')
            "
          />
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="isSubmitting" @click="visible = false">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="danger" :loading="isSubmitting" @click="handleSubmit">
        {{ $t("accountLink.unlink") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { ElMessage, type FormInstance } from "element-plus";

import { ApiErrorCode } from "@/api/error-code";
import { isApiError } from "@/api/request";
import AppDialog from "@/components/AppDialog/index.vue";
import { accountLinkService } from "@/services/account-link.service";
import type { AccountLink } from "@/types/account-link";
import { requestErrorMessage } from "@/utils/version-conflict";
import { useResourceFormSubmit } from "@/views/resources/useResourceFormSubmit";
import { collectTourCodes, normalizeTourCode, sharesTourCode, tourCodeRules } from "../tour-code";

const props = defineProps<{ group: AccountLink | null }>();
const emit = defineEmits<{ removed: []; stale: [] }>();
const visible = defineModel<boolean>({ required: true });

const { t } = useI18n();
const formRef = ref<FormInstance>();
const { isSubmitting, submitForm } = useResourceFormSubmit(formRef);
const form = reactive<{ overrides: Record<string, string> }>({ overrides: {} });
const members = computed(() => props.group?.members ?? []);

watch(visible, (open) => {
  if (open) form.overrides = {};
});

function handleSubmit(): Promise<void> {
  return submitForm(async () => {
    const group = props.group;
    if (!group) return;
    const tourCodes = collectTourCodes(form.overrides, members.value);
    try {
      await accountLinkService.remove(group.id, {
        version: group.version,
        ...(tourCodes.length ? { tourCodes } : {}),
      });
      ElMessage.success(t("accountLink.unlinkSuccess"));
      visible.value = false;
      emit("removed");
    } catch (error) {
      if (
        isApiError(error) &&
        error.code === ApiErrorCode.CONFLICT &&
        error.details?.currentVersion !== undefined
      ) {
        ElMessage.warning(requestErrorMessage(error));
        emit("stale");
        return;
      }
      // USER_TOUR_CODE_EXISTS 等保留弹窗，由管理员分配新标识后重试。
      ElMessage.error(requestErrorMessage(error));
    }
  });
}
</script>
