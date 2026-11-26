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
    <template #footer>
      <el-button v-if="dirty()" :disabled="busy" @click="visible = false; emit('updated')">
        {{ $t("mail.discardChanges") }}
      </el-button>
      <el-button :disabled="busy" @click="handleSave">
        {{ $t("mail.saveDraft") }}
      </el-button>
      <el-button
        type="primary"
        :loading="busy"
        :disabled="!signature || !to.trim() || (!body.trim() && !draft.attachments.length)"
        @click="handleSend"
      >
        {{ $t("common.send") }}
      </el-button>
    </template>
  </AppDialog>
</template>
<script setup lang="ts">
import { ElMessage } from "element-plus";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import { mailService } from "@/services/mail.service";
import { websiteErrorMessage } from "@/services/website.service";
import type { MailMessage } from "@/types/mail";
import { formatFileSize } from "@/utils/format";
import { useAccountSwitchGuard } from "@/composables/useAccountSwitchGuard";

const props = defineProps<{ initial: MailMessage; mailbox: string; signature: string | null }>();
const emit = defineEmits<{ updated: [] }>();
const visible = defineModel<boolean>({ required: true });
const { t } = useI18n();
const draft = ref(props.initial);
const to = ref(props.initial.recipients.map(address => address.email).join(", "));
const cc = ref(props.initial.cc.map(address => address.email).join(", "));
const subject = ref(props.initial.subject);
const body = ref(props.initial.body);
const busy = ref(false);
const picker = ref<HTMLInputElement>();
const split = (value: string) => value.split(/[,;，；\s]+/).map(x => x.trim()).filter(Boolean);
function dirty() {
  const saved = draft.value;
  return body.value !== saved.body || subject.value !== saved.subject
    || split(to.value).join(",") !== saved.recipients.map(r => r.email).join(",")
    || split(cc.value).join(",") !== saved.cc.map(r => r.email).join(",");
}
useAccountSwitchGuard({ dirty: () => visible.value && (busy.value || dirty()) });
async function saveChanges() {
  if (dirty()) draft.value = await mailService.save(draft.value.threadId, draft.value.id, {
    version: draft.value.version, to: split(to.value), cc: split(cc.value), subject: subject.value, body: body.value,
  });
}
async function run(operation: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  try { await operation(); }
  catch (error) { ElMessage.error(websiteErrorMessage(error)); }
  finally { busy.value = false; }
}
async function handleClose(done: () => void) {
  await run(async () => { await saveChanges(); done(); emit("updated"); });
}
async function handleSave() {
  await handleClose(() => { visible.value = false; ElMessage.success(t("mail.saved")); });
}
async function handleFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  input.value = "";
  await run(async () => {
    await saveChanges();
    for (const file of files) draft.value = await mailService.attach(draft.value.threadId, draft.value.id, file);
  });
}
async function handleRemove(file: string) {
  await run(async () => {
    await saveChanges();
    draft.value = await mailService.remove(draft.value.threadId, draft.value.id, file);
  });
}
async function handleSend() {
  await run(async () => {
    await saveChanges();
    const result = await mailService.send(draft.value.threadId, draft.value.id, draft.value.version);
    draft.value = result;
    if (result.state === "failed") ElMessage.error(t("mail.failed"));
    else if (result.state === "sent") ElMessage.success(t("mail.sent"));
    else ElMessage.warning(t("mail.checkSent"));
    visible.value = false;
    emit("updated");
  });
}
</script>
