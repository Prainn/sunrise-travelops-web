<template>
  <AppDialog
    v-model="visible"
    :title="$t('whatsapp.assignTitle')"
    size="md"
    :busy="saving"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="auto"
      :disabled="saving"
    >
      <el-form-item :label="$t('whatsapp.currentOwner')">
        <el-input :model-value="currentOwnerName || $t('whatsapp.unassigned')" disabled />
      </el-form-item>
      <el-form-item :label="$t('whatsapp.assignOwner')" prop="ownerId">
        <el-select
          v-model="form.ownerId"
          v-loading="ownersLoading"
          autocomplete="new-password"
          filterable
          :placeholder="$t('common.selectPlaceholder')"
        >
          <el-option
            v-for="owner in owners"
            :key="owner.id"
            :value="owner.id"
            :label="owner.name"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('whatsapp.assignReason')" prop="reason">
        <el-input
          v-model="form.reason"
          type="textarea"
          :rows="3"
          maxlength="2000"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="visible = false">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" :loading="saving" @click="handleSubmit">
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import { ApiError } from "@/api/request";
import AppDialog from "@/components/AppDialog/index.vue";
import { websiteErrorMessage, type WebsiteOwnerOption } from "@/services/website.service";
import { whatsappService } from "@/services/whatsapp.service";

const props = defineProps<{
  conversationId: string;
  version: number;
  currentOwnerName: string | null;
}>();
const emit = defineEmits<{
  /** 分配成功，或版本冲突需要刷新会话。 */
  changed: [];
}>();
const visible = defineModel<boolean>({ required: true });

const { t } = useI18n();
const formRef = ref<FormInstance>();
const form = reactive({ ownerId: "", reason: "" });
const owners = ref<WebsiteOwnerOption[]>([]);
const ownersLoading = ref(false);
const saving = ref(false);

const rules = computed<FormRules>(() => ({
  ownerId: [{ required: true, message: t("whatsapp.ownerRequired"), trigger: "change" }],
}));

watch(visible, async (opened) => {
  if (!opened) return;
  form.ownerId = "";
  form.reason = "";
  formRef.value?.clearValidate();
  ownersLoading.value = true;
  try {
    owners.value = await whatsappService.owners();
  } catch (cause) {
    owners.value = [];
    ElMessage.error(websiteErrorMessage(cause));
  } finally {
    ownersLoading.value = false;
  }
});

async function handleSubmit() {
  if (saving.value) return;
  const valid = await formRef.value?.validate().then(() => true, () => false);
  if (!valid) return;
  saving.value = true;
  try {
    await whatsappService.assign(props.conversationId, {
      version: props.version,
      ownerId: form.ownerId,
      reason: form.reason.trim(),
    });
    ElMessage.success(t("whatsapp.assignSuccess"));
    visible.value = false;
    emit("changed");
  } catch (cause) {
    // 版本冲突只刷新会话并保留用户输入，由用户确认最新状态后重新决定，不自动重放改派。
    if (cause instanceof ApiError && cause.status === 409) {
      ElMessage.warning(t("whatsapp.versionConflict", { message: websiteErrorMessage(cause) }));
      emit("changed");
    } else {
      ElMessage.error(websiteErrorMessage(cause));
    }
  } finally {
    saving.value = false;
  }
}
</script>
