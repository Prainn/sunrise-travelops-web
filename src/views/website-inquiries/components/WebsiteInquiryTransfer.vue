<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t('websiteInquiry.transferTitle')"
    width="min(500px, 94vw)"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form
      ref="formRef"
      :model="form"
      label-width="auto"
      :disabled="saving"
    >
      <el-form-item
        :label="$t('websiteInquiry.receivingOwner')"
        prop="ownerId"
        :rules="[{ required: true, message: $t('websiteInquiry.receivingOwnerRequired') }]"
      >
        <el-select v-model="form.ownerId" filterable>
          <el-option
            v-for="owner in owners.filter((item) => item.id !== record?.ownerId)"
            :key="owner.id"
            :value="owner.id"
            :label="owner.name"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        :label="$t('websiteInquiry.transferReason')"
        prop="reason"
        :rules="[
          {
            required: true,
            whitespace: true,
            message: $t('websiteInquiry.transferReasonRequired'),
          },
        ]"
      >
        <el-input
          v-model="form.reason"
          type="textarea"
          :rows="3"
          maxlength="2000"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="emit('update:modelValue', false)">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" :loading="saving" @click="submit">
        {{ $t("websiteInquiry.confirmTransfer") }}
      </el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage, type FormInstance } from "element-plus";
import {
  websiteErrorMessage,
  websiteService,
  type WebsiteOwnerOption,
} from "@/services/website.service";
import type { WebsiteInquiry } from "@/types/website";
const props = defineProps<{
  modelValue: boolean;
  record?: WebsiteInquiry;
  owners: WebsiteOwnerOption[];
}>();
const emit = defineEmits<{ "update:modelValue": [value: boolean]; saved: [] }>();
const { t } = useI18n();
const formRef = ref<FormInstance>();
const form = reactive({ ownerId: "", reason: "" });
const saving = ref(false);
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      form.ownerId = "";
      form.reason = "";
      formRef.value?.clearValidate();
    }
  },
);
async function submit() {
  if (!props.record || saving.value || !(await formRef.value?.validate().catch(() => false)))
    return;
  saving.value = true;
  try {
    await websiteService.transfer(props.record.id, props.record.version, form.ownerId, form.reason);
    emit("saved");
    emit("update:modelValue", false);
    ElMessage.success(t("websiteInquiry.transferred"));
  } catch (error) {
    ElMessage.error(websiteErrorMessage(error));
  } finally {
    saving.value = false;
  }
}
</script>
