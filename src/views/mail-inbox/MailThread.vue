<template>
  <div class="mail-thread flex min-h-0 min-w-0 flex-1 flex-col">
    <header class="mail-thread__header">
      <h2 class="m-0 text-lg font-600 leading-snug">
        {{ detail.subject || $t("mail.noSubject") }}
      </h2>
      <div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span class="text-muted">{{ detail.mailbox }}</span>
        <el-tag size="small" type="info">
          {{ detail.ownerName || $t("whatsapp.views.unassigned") }}
        </el-tag>
        <el-button v-if="detail.canAssign" size="small" @click="assignVisible = true">
          {{ $t("whatsapp.assignTitle") }}
        </el-button>
        <router-link v-if="detail.inquiryId" :to="{ name: 'WebsiteInquiryList', query: { inquiryId: detail.inquiryId } }">
          {{ $t("mail.viewInquiry") }}
        </router-link>
        <el-button link @click="emit('refresh')">
          {{ $t("common.refresh") }}
        </el-button>
      </div>
    </header>
    <div class="mail-thread__messages min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <el-collapse v-if="detail.assignments.length" class="mb-4">
        <el-collapse-item :title="$t('mail.assignments')">
          <p v-for="assignment in detail.assignments" :key="assignment.at" class="mb-2">
            {{ formatShanghaiDateTime(assignment.at) }} {{ assignment.actor }}
            {{ assignment.previousOwner || $t("whatsapp.views.unassigned") }} → {{ assignment.owner }}
            {{ assignment.reason }}
          </p>
        </el-collapse-item>
      </el-collapse>
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
            <el-button v-if="message.direction === 'inbound' && detail.canCreateInquiry" :disabled="busy" @click="handlePrefill(message)">
              {{ $t("mail.createInquiry") }}
            </el-button>
          </div>
        </SectionCard>
      </article>
    </div>
    <AssignDialog
      v-model="assignVisible"
      channel="mail"
      :conversation-id="detail.id"
      :version="detail.version"
      :current-owner-name="detail.ownerName"
      @changed="emit('refresh')"
    />
    <MailReply
      v-if="replyVisible && draft"
      :key="draft.id"
      v-model="replyVisible"
      :initial="draft"
      :mailbox="detail.mailbox"
      :signature="detail.signature"
      @updated="emit('refresh')"
    />
    <WebsiteInquiryEditor
      v-model="inquiryVisible"
      :initial-values="prefill"
      prefill-source="email"
      :assigned-owner-name="detail.ownerName"
      business-unit="website"
      :show-business="false"
      :owners="[]"
      :cities="cities"
      :allow-assign="false"
      :saving="busy"
      :read-only="false"
      @save="handleInquiry"
    />
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import SectionCard from "@/components/SectionCard/index.vue";
import AssignDialog from "@/views/whatsapp/components/AssignDialog.vue";
import WebsiteInquiryEditor from "@/views/website-inquiries/components/WebsiteInquiryEditor.vue";
import { mailService } from "@/services/mail.service";
import { websiteService, websiteErrorMessage } from "@/services/website.service";
import type { MailAddress, MailDetail, MailMessage } from "@/types/mail";
import type { WebsiteCity, WebsiteInquiryInput } from "@/types/website";
import { formatFileSize, formatShanghaiDateTime } from "@/utils/format";
import MailReply from "./MailReply.vue";

const props = defineProps<{ detail: MailDetail; selected?: string }>();
const emit = defineEmits<{ refresh: [] }>();
const { t } = useI18n();
const busy = ref(false);
const assignVisible = ref(false);
const replyVisible = ref(false);
const draft = ref<MailMessage>();
const inquiryVisible = ref(false);
const cities = ref<WebsiteCity[]>([]);
const prefill = ref<Partial<WebsiteInquiryInput>>();
const inquirySource = ref("");
const inquiryVersion = ref(0);
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
async function handlePrefill(message: MailMessage) {
  if (busy.value) return;
  busy.value = true;
  try {
    const config = await websiteService.config(undefined, "website");
    cities.value = config.cities.filter(city => city.status === "enabled");
    const replyTo = message.replyTo[0] ?? message.sender;
    prefill.value = {
      customerName: replyTo.name || message.sender.name || "", contactInfo: replyTo.email,
      receivedAt: formatShanghaiDateTime(message.occurredAt), requirements: [message.subject, message.body].filter(Boolean).join("\n\n"),
      contactChannel: "Email", acquisitionSource: "",
    };
    inquirySource.value = message.id;
    inquiryVersion.value = props.detail.version;
    inquiryVisible.value = true;
  } catch (error) { ElMessage.error(websiteErrorMessage(error)); }
  finally { busy.value = false; }
}
async function handleInquiry(input: WebsiteInquiryInput) {
  if (busy.value) return;
  busy.value = true;
  try {
    const result = await mailService.inquiry(props.detail.id, inquirySource.value, input, inquiryVersion.value);
    ElMessage.success(t(result.created ? "whatsapp.inquiryCreated" : "whatsapp.inquiryExisting"));
    inquiryVisible.value = false;
    emit("refresh");
  } catch (error) { ElMessage.error(websiteErrorMessage(error)); emit("refresh"); }
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
