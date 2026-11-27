<template>
  <div class="mail-thread flex min-h-0 min-w-0 flex-1 flex-col">
    <header class="mail-thread__header">
      <h2 class="m-0 text-lg font-600 leading-snug">
        {{ detail.subject || $t("mail.noSubject") }}
      </h2>
    </header>
    <div ref="reader" class="mail-thread__messages min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <article
        v-for="message in detail.messages"
        :key="message.id"
        class="mail-message"
        :class="{ 'is-expanded': isExpanded(message.id) }"
      >
        <SectionCard
          v-for="quote in message.quotedHistory"
          :key="`${quote.sourceMessageId}-${quote.position}`"
          padding="none"
          class="mb-[10px]"
        >
          <details class="mail-quote">
            <summary class="mail-message__summary box-border">
              <span class="mail-message__summary-main">
                <span class="mail-message__sender-row">
                  <el-icon class="mail-message__chevron" aria-hidden="true">
                    <ArrowRight />
                  </el-icon>
                  <span class="mail-message__sender" :title="quote.sender">{{ quote.sender }}</span>
                </span>
                <span class="mail-message__snippet">{{ messageSnippet(quote.body) }}</span>
              </span>
              <span class="mail-message__summary-meta min-w-0 max-w-1/2 text-end">
                <el-tag type="info" size="small">{{ $t("mail.quotedMessage") }}</el-tag>
                <span class="text-[12px] text-muted tabular-nums">{{ quote.sentAt }}</span>
              </span>
            </summary>
            <div class="mail-message__body">
              <dl v-if="quote.to || quote.cc || quote.subject" class="mail-headers">
                <template v-if="quote.to">
                  <dt>{{ $t("mail.to") }}</dt>
                  <dd>{{ quote.to }}</dd>
                </template>
                <template v-if="quote.cc">
                  <dt>{{ $t("mail.cc") }}</dt>
                  <dd>{{ quote.cc }}</dd>
                </template>
                <template v-if="quote.subject">
                  <dt>{{ $t("mail.subject") }}</dt>
                  <dd>{{ quote.subject }}</dd>
                </template>
              </dl>
              <div class="whitespace-pre-wrap break-words">
                {{ quote.body || $t("mail.noBody") }}
              </div>
            </div>
          </details>
        </SectionCard>
        <SectionCard
          :id="'mail-' + message.id"
          padding="none"
          class="mail-message__card"
          :class="{ 'mail-original': message.id === selected }"
        >
          <div class="mail-message__header" :class="{ 'is-collapsed': !isExpanded(message.id) }">
            <button
              type="button"
              class="mail-message__toggle"
              :aria-expanded="isExpanded(message.id)"
              @click="toggleMessage(message.id)"
            >
              <span class="mail-message__sender-row">
                <el-icon class="mail-message__chevron" :class="{ 'is-open': isExpanded(message.id) }" aria-hidden="true">
                  <ArrowRight />
                </el-icon>
                <span class="mail-message__sender" :title="formatAddress(message.sender)">
                  {{ formatAddress(message.sender) }}
                </span>
              </span>
              <span v-if="isExpanded(message.id)" class="mail-message__recipients">
                {{ $t("mail.to") }}: {{ message.recipients.map(formatAddress).join(", ") }}
              </span>
              <span v-else class="mail-message__snippet">
                {{ messageSnippet(message.authoredBody ?? message.body) }}
              </span>
            </button>
            <div class="mail-message__meta">
              <div class="mail-message__meta-row">
                <el-button
                  v-if="detail.canReply && (message.state === 'received' || message.state === 'sent')
                    && (message.id === latestId || isExpanded(message.id))"
                  size="small"
                  type="primary"
                  plain
                  :disabled="busy || !message.internetId"
                  @click="handleReply(message.id)"
                >
                  <svg
                    class="mr-[4px] shrink-0"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m9 5-6 6 6 6M3 11h10c5 0 7 3 7 8" />
                  </svg>
                  {{ $t("whatsapp.reply") }}
                </el-button>
                <el-button
                  v-if="['draft', 'failed'].includes(message.state) && detail.canReply"
                  size="small"
                  @click="editReply(message)"
                >
                  {{ $t("mail.editDraft") }}
                </el-button>
                <span
                  v-if="message.attachments.length"
                  class="mail-message__clip"
                  :title="$t('mail.attachmentCount', { count: message.attachments.length })"
                >
                  <el-icon aria-hidden="true">
                    <Paperclip />
                  </el-icon>
                  <span class="sr-only">{{ $t("mail.attachmentCount", { count: message.attachments.length }) }}</span>
                </span>
                <el-tag size="small">
                  {{ $t("mail.states." + message.state) }}
                </el-tag>
              </div>
              <time class="text-[12px] text-muted tabular-nums" :datetime="message.occurredAt">
                <span class="sr-only">{{ $t("mail.time") }}</span>
                {{ formatShanghaiDateTime(message.occurredAt) }}
              </time>
            </div>
          </div>
          <div v-if="isExpanded(message.id)" class="mail-message__body">
            <dl
              v-if="(message.subject && message.subject !== detail.subject) || message.cc.length"
              class="mail-headers"
            >
              <template v-if="message.subject && message.subject !== detail.subject">
                <dt>{{ $t("mail.subject") }}</dt>
                <dd>{{ message.subject }}</dd>
              </template>
              <template v-if="message.cc.length">
                <dt>{{ $t("mail.cc") }}</dt>
                <dd>{{ message.cc.map(formatAddress).join(", ") }}</dd>
              </template>
            </dl>
            <div v-if="message.attachments.length" class="mail-message__attachments">
              <div v-for="file in message.attachments" :key="file.id" class="mail-message__attachment">
                <el-button
                  link
                  type="primary"
                  :loading="downloadingIds.has(file.id)"
                  :disabled="!file.available || downloadingIds.has(file.id)"
                  @click="handleDownload(file.id)"
                >
                  <el-icon class="mr-[4px]" aria-hidden="true">
                    <Paperclip />
                  </el-icon>
                  <span>{{ file.fileName }} ({{ formatFileSize(file.sizeBytes) }})</span>
                </el-button>
                <span v-if="!file.available" class="text-[12px] text-muted">{{ $t("mail.archiving") }}</span>
              </div>
            </div>
            <div class="whitespace-pre-wrap break-words my-3">
              {{ message.authoredBody ?? message.body }}
            </div>
            <div v-if="message.signature" class="whitespace-pre-line mb-3">
              {{ message.signature }}
            </div>
            <details v-if="message.authoredBody != null" class="my-3">
              <summary class="w-fit cursor-pointer text-sm text-primary">
                {{ $t("mail.fullBody") }}
              </summary>
              <div class="whitespace-pre-wrap break-words mt-2">
                {{ message.body }}
              </div>
            </details>
            <el-alert
              v-if="message.state === 'unknown'"
              type="warning"
              :closable="false"
              :title="$t('mail.checkSent')"
            />
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
      :send-blocked-reason="detail.sendBlockedReason"
      @updated="emit('refresh')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { ArrowRight, Paperclip } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import SectionCard from "@/components/SectionCard/index.vue";
import { mailService } from "@/services/mail.service";
import { websiteErrorMessage } from "@/services/website.service";
import type { MailAddress, MailDetail, MailMessage } from "@/types/mail";
import { formatFileSize, formatShanghaiDateTime } from "@/utils/format";
import { triggerSignedDownload } from "@/utils/signed-download";
import MailReply from "./MailReply.vue";

const props = defineProps<{ detail: MailDetail; selected?: string }>();
const emit = defineEmits<{ refresh: [] }>();
const { t } = useI18n();
const busy = ref(false);
const downloadingIds = ref(new Set<string>());
const replyVisible = ref(false);
const draft = ref<MailMessage>();
const reader = ref<HTMLElement>();
const latestId = computed(() => {
  const messages = props.detail.messages;
  return messages.findLast(message => message.state === "received" || message.state === "sent")?.id ?? messages.at(-1)?.id;
});
// Only explicit choices persist when a newly delivered message becomes the latest.
const expansionOverrides = ref(new Map<string, boolean>());

function isExpanded(id: string) {
  return expansionOverrides.value.get(id) ?? (id === latestId.value || id === props.selected);
}

function toggleMessage(id: string) {
  expansionOverrides.value.set(id, !isExpanded(id));
}

function formatAddress(address: MailAddress) {
  return address.name ? `${address.name} <${address.email}>` : address.email;
}

function messageSnippet(body: string) {
  const text = body.replace(/\s+/g, " ").trim();
  if (!text) return t("mail.noBody");
  return text.length > 160 ? text.slice(0, 160).trimEnd() + "…" : text;
}

function scrollToMessage(id?: string, showPrevious = false) {
  const container = reader.value;
  const card = id && document.getElementById("mail-" + id);
  if (!container || !card) return;
  const offset = card.getBoundingClientRect().top - container.getBoundingClientRect().top;
  if (offset < 0 || offset + card.offsetHeight > container.clientHeight) {
    // Keep a few collapsed replies in view when opening the latest message.
    container.scrollTop += offset - (showPrevious ? container.clientHeight / 4 : 0);
  }
}

onMounted(() => scrollToMessage(props.selected || latestId.value, !props.selected));

watch(() => props.selected, (id) => {
  if (id) expansionOverrides.value.delete(id);
  scrollToMessage(id);
}, { flush: "post" });

async function handleDownload(file: string) {
  if (downloadingIds.value.has(file)) return;
  downloadingIds.value = new Set(downloadingIds.value).add(file);
  try {
    const { url } = await mailService.download(props.detail.id, file);
    triggerSignedDownload(url);
  } catch (error) { ElMessage.error(websiteErrorMessage(error)); }
  finally {
    const next = new Set(downloadingIds.value);
    next.delete(file);
    downloadingIds.value = next;
  }
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

<style scoped lang="scss">
.mail-thread {
  overflow-wrap: anywhere;
}

.mail-thread__header {
  padding: var(--section-padding);
  border-block-end: 1px solid var(--divider-color);
}

.mail-thread__messages {
  padding: var(--section-padding);
}

.mail-message {
  margin-block-end: 10px;

  &.is-expanded {
    margin-block-end: 14px;
  }

  &:last-child {
    margin-block-end: 0;
  }
}

.mail-original {
  outline: 2px solid var(--el-color-primary);
}

.mail-message__summary {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 14px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--card-radius);
  transition: background-color 0.16s;

  &:hover {
    background: var(--surface-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
  }
}

.mail-quote {
  > summary::-webkit-details-marker { display: none; }

  &[open] > summary {
    border-block-end: 1px solid var(--divider-color);
    .mail-message__chevron { rotate: 90deg; }
    .mail-message__snippet { display: none; }
  }
}

.mail-message__summary-main {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.mail-message__summary-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
  flex-shrink: 0;
}

.mail-message__header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px var(--section-padding);
  border-block-end: 1px solid var(--divider-color);

  &.is-collapsed {
    position: relative;
    flex-wrap: nowrap;
    align-items: center;
    padding: 10px 14px;
    border: 0;
    border-radius: var(--card-radius);

    &:hover {
      background: var(--surface-hover);
    }

    .mail-message__toggle {
      flex-basis: 0;

      &::after {
        position: absolute;
        inset: 0;
        content: "";
      }
    }

    .el-button {
      position: relative;
    }
  }
}

.mail-message__toggle {
  display: flex;
  flex: 1 1 220px;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.mail-message__sender-row {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
}

.mail-message__chevron {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  transition: rotate 0.2s;

  &.is-open {
    rotate: 90deg;
  }
}

.mail-message__sender {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.mail-message__snippet {
  overflow: hidden;
  text-overflow: ellipsis;
  padding-inline-start: 19px;
  font-size: 13px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.mail-message__recipients {
  padding-inline-start: 19px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
  overflow-wrap: anywhere;
}

.mail-message__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
  margin-inline-start: auto;
}

.mail-message__meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
}

.mail-message__clip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: var(--el-text-color-secondary);
}

.mail-message__body {
  padding: var(--section-padding);
}

.mail-message__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-block-end: 12px;
}

.mail-message__attachment {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 4px 10px;
  background: var(--surface-muted);
  border: 1px solid var(--card-border);
  border-radius: var(--control-radius);
}

.mail-headers {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 14px;
  margin: 0 0 12px;
  font-size: 13px;

  dt {
    color: var(--el-text-color-secondary);
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mail-message__summary,
  .mail-message__chevron {
    transition: none;
  }
}
</style>
