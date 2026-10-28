<template>
  <el-button
    v-has-perm="'inquiry:transfer'"
    link
    type="primary"
    :loading="opening"
    :disabled="saving"
    @click="open"
  >
    {{ $t("identity.transfer") }}
  </el-button>
  <AppDialog
    v-model="visible"
    :title="$t('identity.transfer')"
    size="sm"
    :busy="saving"
    append-to-body
  >
    <el-form ref="form" :model="data" label-position="top">
      <el-form-item
        :label="$t('identity.owner')"
        prop="ownerId"
        :rules="{ required: true, message: $t('common.selectPlaceholder') }"
      >
        <el-select
          v-model="data.ownerId"
          autocomplete="new-password"
          filterable
          :placeholder="$t('common.selectPlaceholder')"
        >
          <el-option
            v-for="person in owners.filter((p) => p.id !== inquiry.ownerId)"
            :key="person.id"
            :value="person.id"
            :label="`${person.name} (${person.username})`"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        :label="$t('identity.reason')"
        prop="reason"
        :rules="{ required: true, whitespace: true, message: $t('identity.reasonPlaceholder') }"
      >
        <el-input
          v-model="data.reason"
          type="textarea"
          :placeholder="$t('identity.reasonPlaceholder')"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="visible = false">
        {{ $t("common.cancel") }}
      </el-button><el-button type="primary" :loading="saving" @click="submit">
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </AppDialog>
</template>
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import type { FormInstance } from "element-plus";
import AppDialog from "@/components/AppDialog/index.vue";
import { requestErrorMessage } from "@/utils/version-conflict";
import type { InquiryRecord } from "@/types/inquiry";
import { inquiryService, type PersonOption } from "@/services/inquiry.service";
const props = defineProps<{ inquiry: InquiryRecord }>();
const emit = defineEmits<{ transferred: [] }>();
const { t } = useI18n();
const visible = ref(false),
  saving = ref(false),
  opening = ref(false),
  owners = ref<PersonOption[]>([]),
  form = ref<FormInstance>();
const data = reactive({ ownerId: "", reason: "" });
async function open() {
  if (opening.value || saving.value) return;
  opening.value = true;
  try {
    owners.value = await inquiryService.owners(props.inquiry.businessUnit);
    data.ownerId = "";
    data.reason = "";
    visible.value = true;
  } catch (e) {
    ElMessage.error(requestErrorMessage(e));
  } finally {
    opening.value = false;
  }
}
// 校验前即占用，保存期间弹窗不可关闭，避免重复转交或以旧版本再次提交。
async function submit() {
  if (saving.value) return;
  saving.value = true;
  try {
    if (!(await form.value?.validate().catch(() => false))) return;
    await inquiryService.transfer(props.inquiry, data.ownerId, data.reason);
    visible.value = false;
    ElMessage.success(t("identity.transferSuccess"));
    emit("transferred");
  } catch (e) {
    ElMessage.error(requestErrorMessage(e));
  } finally {
    saving.value = false;
  }
}
</script>
