<template>
  <div class="mail-thread flex min-h-0 min-w-0 flex-1 flex-col">
    <header class="mail-thread__header">
      <h2 class="m-0 text-lg font-600 leading-snug">
        {{ detail.subject || $t("mail.noSubject") }}
      </h2>
    </header>
    <div class="mail-thread__messages min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <article
        v-for="message in detail.messages"
        :id="'mail-' + message.id"
        :key="message.id"
        class="mb-4"
      >
        <SectionCard :title="formatAddress(message.sender)" :class="{ 'mail-original': message.id === selected }">
          <template #actions>
            <time class="text-xs text-muted" :datetime="message.occurredAt">
              <span class="sr-only">{{ $t("mail.time") }}</span>
              {{ formatShanghaiDateTime(message.occurredAt) }}
            </time>
            <el-tag size="small">
              {{ $t('mail.states.' + message.state) }}
            </el-tag>
          </template>
          <dl class="mail-headers">
            <template v-if="message.subject && message.subject !== detail.subject">
              <dt>{{ $t("mail.subject") }}</dt><dd>{{ message.subject }}</dd>
            </template>
            <dt>{{ $t("mail.to") }}</dt><dd>{{ message.recipients.map(formatAddress).join(", ") }}</dd>
            <template v-if="message.cc.length">
              <dt>{{ $t("mail.cc") }}</dt><dd>{{ message.cc.map(formatAddress).join(", ") }}</dd>
            </template>
          </dl>
          <div class="whitespace-pre-wrap break-words my-3">
            {{ message.body }}
          </div>
          <div v-if="message.signature" class="whitespace-pre-line mb-3">
            {{ message.signature }}
          </div>
          <div v-for="file in message.attachments" :key="file.id" class="mb-1">
            <el-button
              link
              type="primary"
              :disabled="!file.available"
              @click="handleDownload(file.id)"
            >
              {{ file.fileName }} ({{ formatFileSize(file.sizeBytes) }})
            </el-button>
            <span v-if="!file.available">{{ $t("mail.archiving") }}</span>
          </div>
          <el-alert
            v-if="message.state === 'unknown'"
            type="warning"
            :closable="false"
            :title="$t('mail.checkSent')"
          />
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <el-button v-if="message.direction === 'inbound' && detail.canReply" :disabled="busy || !message.internetId" @click="handleReply(message.id)">
              {{ $t("whatsapp.reply") }}
            </el-button>
            <el-button v-if="['draft','failed'].includes(message.state) && detail.canReply" @click="editReply(message)">
              {{ $t("mail.editDraft") }}
            </el-button>
            <el-button
              v-if="message.direction === 'inbound' && detail.canCreateInquiry"
              @click="emit('create-inquiry', message.id)"
            >
              {{ $t("mail.createInquiry") }}
            </el-button>
          </div>
        </SectionCard>
      </article>
    </div>
    <MailReply
      v-if="replyVisible && draft"
      :key="draft.id"
      v-model="replyVisible"
      :initial="draft"
      :mailbox="detail.mailbox"
      :signature="detail.signature"
      @updated="emit('refresh')"
    />
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import SectionCard from "@/components/SectionCard/index.vue";
import { mailService } from "@/services/mail.service";
import { websiteErrorMessage } from "@/services/website.service";
import type { MailAddress, MailDetail, MailMessage } from "@/types/mail";
import { formatFileSize, formatShanghaiDateTime } from "@/utils/format";
import MailReply from "./MailReply.vue";

const props = defineProps<{ detail: MailDetail; selected?: string }>();
const emit = defineEmits<{ refresh: []; "create-inquiry": [source: string] }>();
const { t } = useI18n();
const busy = ref(false);
const replyVisible = ref(false);
const draft = ref<MailMessage>();
function formatAddress(address: MailAddress) {
  return address.name ? `${address.name} <${address.email}>` : address.email;
}
function focusOriginal() {
  if (props.selected) document.getElementById("mail-" + props.selected)?.scrollIntoView({ block: "center" });
}
onMounted(focusOriginal);
watch(() => props.selected, focusOriginal, { flush: "post" });
async function handleDownload(file: string) {
  try {
    const { url } = await mailService.download(props.detail.id, file);
    const link = document.createElement("a");
    link.href = url;
    link.rel = "noreferrer";
    link.click();
  } catch (error) { ElMessage.error(websiteErrorMessage(error)); }
}
function editReply(message: MailMessage) {
  draft.value = message;
  replyVisible.value = true;
}
async function handleReply(source: string) {
  if (busy.value) return;
  busy.value = true;
  try {
    const message = await mailService.openDraft(props.detail.id, source);
    if (["draft", "failed"].includes(message.state)) editReply(message);
    else { ElMessage.info(t("mail.checkSent")); emit("refresh"); }
  } catch (error) { ElMessage.error(websiteErrorMessage(error)); }
  finally { busy.value = false; }
}
</script>
<style scoped>
.mail-thread { overflow-wrap: anywhere; }
.mail-thread__header {
  padding: var(--section-padding);
  border-block-end: 1px solid var(--divider-color);
}
.mail-thread__messages { padding: var(--section-padding); }
.mail-original { outline: 2px solid var(--el-color-primary); }
.mail-headers { display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; margin: 0; }
.mail-headers dt { color: var(--el-text-color-secondary); }
.mail-headers dd { margin: 0; overflow-wrap: anywhere; }
</style>
