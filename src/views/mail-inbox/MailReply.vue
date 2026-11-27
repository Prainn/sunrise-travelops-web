<template>
  <AppDialog
    v-model="visible"
    :title="$t('whatsapp.reply')"
    :busy="busy"
    :before-close="handleClose"
    size="lg"
    append-to-body
  >
    <el-form label-position="top" :disabled="busy">
      <el-form-item :label="$t('mail.from')">
        <span>{{ mailbox }}</span>
      </el-form-item>
      <el-form-item :label="$t('mail.to')">
        <el-input v-model="to" :placeholder="$t('mail.addressHint')" />
      </el-form-item>
      <el-form-item :label="$t('mail.cc')">
        <el-input v-model="cc" :placeholder="$t('mail.addressHint')" />
      </el-form-item>
      <el-form-item :label="$t('mail.subject')">
        <el-input v-model="subject" maxlength="998" />
      </el-form-item>
      <el-form-item :label="$t('mail.body')">
        <el-input
          v-model="body"
          type="textarea"
          :rows="6"
          maxlength="100000"
        />
      </el-form-item>
      <el-form-item :label="$t('mail.attachments')">
        <div class="w-full">
          <input
            ref="picker"
            hidden
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx"
            @change="handleFiles"
          >
          <el-button @click="picker?.click()">
            {{ $t("mail.addFiles") }}
          </el-button>
          <div v-for="file in draft.attachments" :key="file.id" class="flex items-center gap-2 mt-1">
            <span class="break-all">{{ file.fileName }} ({{ formatFileSize(file.sizeBytes) }})</span>
            <el-button link type="danger" @click="handleRemove(file.id)">
              {{ $t("common.remove") }}
            </el-button>
          </div>
        </div>
      </el-form-item>
      <el-form-item :label="$t('mail.signature')">
        <div v-if="signature" class="whitespace-pre-line">
          {{ signature }}
        </div>
        <el-alert
          v-else
          type="warning"
          :closable="false"
          :title="$t('mail.noEnglishName')"
        />
      </el-form-item>
    </el-form>
    <p v-if="sendBlockedReason" class="text-[12px] text-[var(--el-color-warning)]" role="status">
      {{ $t(sendBlockedReason === "send_paused" ? "integration.sendPaused" : "mail.integration.notConfigured") }}
    </p>
    <template #footer>
      <el-button v-if="dirty()" :disabled="busy" @click="handleDiscard">
        {{ $t("mail.discardChanges") }}
      </el-button>
      <el-button
        v-if="draft.state === 'draft' || draft.state === 'failed'"
        type="danger"
        plain
        :disabled="busy"
        @click="confirmDelete = true"
      >
        {{ $t("mail.deleteDraft") }}
      </el-button>
      <el-button :disabled="busy" @click="handleSave">
        {{ $t("mail.saveDraft") }}
      </el-button>
      <el-button
        type="primary"
        :loading="busy"
        :disabled="!!sendBlockedReason || !signature || !parsedTo().length || (!body.trim() && !draft.attachments.length)"
        @click="handleSend"
      >
        {{ $t("common.send") }}
      </el-button>
    </template>
  </AppDialog>
  <AppDialog
    v-model="confirmDelete"
    :title="$t('mail.deleteDraft')"
    size="sm"
    align-center
    append-to-body
    :show-close="false"
    :busy="busy"
    @opened="cancelDelete?.ref?.focus()"
  >
    {{ $t("mail.deleteDraftConfirm") }}
    <template #footer>
      <el-button
        ref="cancelDelete"
        autofocus
        :disabled="busy"
        @click="confirmDelete = false"
      >
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="danger" :loading="busy" @click="handleDeleteDraft">
        {{ $t("mail.deleteDraft") }}
      </el-button>
    </template>
  </AppDialog>
</template>
<script setup lang="ts">
import { type ButtonInstance, ElMessage, ElMessageBox } from "element-plus";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { ApiError } from "@/api/request";
import AppDialog from "@/components/AppDialog/index.vue";
import { mailService } from "@/services/mail.service";
import { websiteErrorMessage } from "@/services/website.service";
import type { MailDetail, MailMessage } from "@/types/mail";
import { formatFileSize } from "@/utils/format";
import { useAccountSwitchGuard } from "@/composables/useAccountSwitchGuard";
import { findInvalidMailAddresses, parseMailAddresses } from "./mail-addresses";

const props = defineProps<{
  initial: MailMessage;
  mailbox: string;
  signature: string | null;
  sendBlockedReason: MailDetail["sendBlockedReason"];
}>();
const emit = defineEmits<{ updated: [] }>();
const visible = defineModel<boolean>({ required: true });
const { t } = useI18n();
const draft = ref(props.initial);
const to = ref(props.initial.recipients.map(address => address.email).join(", "));
const cc = ref(props.initial.cc.map(address => address.email).join(", "));
const subject = ref(props.initial.subject);
const body = ref(props.initial.body);
const busy = ref(false);
const confirmDelete = ref(false);
const cancelDelete = ref<ButtonInstance>();
const picker = ref<HTMLInputElement>();
let hasServerChanges = false;
const parsedTo = () => parseMailAddresses(to.value);
const parsedCc = () => parseMailAddresses(cc.value);
function dirty() {
  const saved = draft.value;
  return body.value !== saved.body || subject.value !== saved.subject
    || parsedTo().join(",") !== saved.recipients.map(r => r.email).join(",")
    || parsedCc().join(",") !== saved.cc.map(r => r.email).join(",");
}
useAccountSwitchGuard({ dirty: () => visible.value && (busy.value || dirty()) });
function validateAddresses(): boolean {
  const invalid = findInvalidMailAddresses([...parsedTo(), ...parsedCc()]);
  if (!invalid.length) return true;
  ElMessage.error(t("mail.invalidAddresses", { addresses: invalid.join(t("websiteInquiry.listSeparator")) }));
  return false;
}
async function saveChanges(): Promise<boolean> {
  if (!dirty()) return true;
  if (!validateAddresses()) return false;
  draft.value = await mailService.save(draft.value.threadId, draft.value.id, {
    version: draft.value.version, to: parsedTo(), cc: parsedCc(), subject: subject.value, body: body.value,
  });
  hasServerChanges = true;
  return true;
}
async function run(operation: () => Promise<boolean | void>): Promise<boolean> {
  if (busy.value) return false;
  busy.value = true;
  try {
    return (await operation()) !== false;
  } catch (error) {
    if (error instanceof ApiError && error.details?.reason === "OUTBOUND_PAUSED") emit("updated");
    ElMessage.error(websiteErrorMessage(error));
    return false;
  } finally {
    busy.value = false;
  }
}
function handleDiscard() {
  if (busy.value) return;
  visible.value = false;
  if (hasServerChanges) emit("updated");
}
async function handleClose(done: () => void) {
  if (busy.value) return;
  if (!dirty()) {
    done();
    if (hasServerChanges) emit("updated");
    return;
  }
  const saved = await run(async () => saveChanges());
  if (saved) {
    done();
    emit("updated");
    return;
  }
  // 保存失败（如地址格式非法或冲突）时允许用户确认放弃未保存改动并关闭，避免被弹窗困住。
  try {
    await ElMessageBox.confirm(t("mail.closeDiscardConfirm"), t("common.warning"), {
      type: "warning",
      confirmButtonText: t("mail.discardChanges"),
      cancelButtonText: t("common.cancel"),
    });
    done();
    if (hasServerChanges) emit("updated");
  } catch { /* 继续留在弹窗修正 */ }
}
async function handleDeleteDraft() {
  await run(async () => {
    const { threadId, id, version } = draft.value;
    await mailService.deleteDraft(threadId, id, version);
    confirmDelete.value = false;
    visible.value = false;
    emit("updated");
    ElMessage.success(t("mail.draftDeleted"));
  });
}
async function handleSave() {
  const saved = await run(async () => saveChanges());
  if (!saved) return;
  visible.value = false;
  ElMessage.success(t("mail.saved"));
  if (hasServerChanges) emit("updated");
}
async function handleFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  input.value = "";
  await run(async () => {
    if (!(await saveChanges())) return false;
    for (const file of files) {
      draft.value = await mailService.attach(draft.value.threadId, draft.value.id, file);
      hasServerChanges = true;
    }
  });
}
async function handleRemove(file: string) {
  await run(async () => {
    if (!(await saveChanges())) return false;
    draft.value = await mailService.remove(draft.value.threadId, draft.value.id, file);
    hasServerChanges = true;
  });
}
async function handleSend() {
  await run(async () => {
    if (!(await saveChanges())) return false;
    const result = await mailService.send(draft.value.threadId, draft.value.id, draft.value.version);
    draft.value = result;
    hasServerChanges = true;
    if (result.state === "failed") ElMessage.error(t("mail.failed"));
    else if (result.state === "sent") ElMessage.success(t("mail.sent"));
    else ElMessage.warning(t("mail.checkSent"));
    visible.value = false;
    emit("updated");
  });
}
</script>
