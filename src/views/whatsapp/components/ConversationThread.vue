<template>
  <SectionCard fill padding="compact" body-class="flex flex-col gap-[8px] min-h-0">
    <template #header>
      <div class="flex items-center justify-between gap-[8px] min-w-0">
        <h3 class="m-0 text-[16px] truncate">
          {{ detail.name || detail.bsuid || detail.phone }}
        </h3>
        <el-tag :type="STATE_TAG_TYPES[detail.state]">
          {{ $t(`whatsapp.states.${detail.state}`) }}
        </el-tag>
      </div>
    </template>
    <el-alert
      v-if="access.isReadOnly"
      type="warning"
      :closable="false"
      show-icon
      :title="$t('whatsapp.archivedHint')"
    >
      <el-button
        v-if="access.currentConversationId"
        link
        type="primary"
        @click="emit('open-conversation', access.currentConversationId)"
      >
        {{ $t("whatsapp.viewCurrent") }}
      </el-button>
    </el-alert>
    <div ref="scrollRef" class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-[10px] p-[4px]">
      <div v-if="hasOlder" class="text-center">
        <el-button
          link
          type="primary"
          :loading="olderLoading"
          @click="emit('load-older')"
        >
          {{ $t("whatsapp.loadOlder") }}
        </el-button>
      </div>
      <FeedbackState v-if="!messages.length && !pending.length" :title="$t('whatsapp.noMessage')" />
      <div
        v-for="message in messages"
        :key="message.id"
        class="whatsapp-message"
        :class="message.direction === 'inbound' ? 'whatsapp-message--inbound' : 'whatsapp-message--outbound'"
      >
        <div class="text-[12px] text-[var(--el-text-color-secondary)] flex flex-wrap gap-x-[8px]">
          <span>{{ sourceLabel(message) }}</span>
          <span>{{ formatDateTime(message.occurredAt) }}</span>
        </div>
        <div class="whatsapp-message__bubble">
          <div v-if="message.text" class="whitespace-pre-wrap break-words" v-text="message.text" />
          <div v-if="message.attachment" class="text-[12px] text-[var(--el-text-color-secondary)]">
            {{ $t("whatsapp.attachment") }}：{{ attachmentSummary(message.attachment).join(" · ") || message.kind }}
          </div>
        </div>
        <div v-if="message.direction === 'outbound'" class="flex items-center gap-[6px] text-[12px]">
          <el-tag size="small" :type="MESSAGE_STATUS_TAG_TYPES[message.status]">
            {{ $t(`whatsapp.statuses.${message.status}`) }}
          </el-tag>
          <span v-if="message.errorCode" class="text-[var(--el-text-color-secondary)]">{{ message.errorCode }}</span>
          <el-button
            v-if="canRetry(message)"
            link
            type="primary"
            size="small"
            :loading="retryingIds.has(message.id)"
            @click="emit('retry', message)"
          >
            {{ $t("common.retry") }}
          </el-button>
        </div>
      </div>
      <div
        v-for="item in pending"
        :key="item.clientRequestId"
        class="whatsapp-message whatsapp-message--outbound"
      >
        <div class="whatsapp-message__bubble">
          <div class="whitespace-pre-wrap break-words" v-text="item.text" />
        </div>
        <div class="flex flex-wrap items-center gap-[6px] text-[12px]">
          <el-tag size="small" :type="item.state === 'rejected' ? 'danger' : item.state === 'uncertain' ? 'warning' : 'info'">
            {{ $t(`whatsapp.pendingStates.${item.state}`) }}
          </el-tag>
          <span v-if="item.error" class="text-[var(--el-text-color-secondary)]">{{ item.error }}</span>
          <el-button
            v-if="item.state === 'uncertain'"
            link
            type="primary"
            size="small"
            @click="emit('resubmit', item.clientRequestId)"
          >
            {{ $t("whatsapp.resubmit") }}
          </el-button>
          <template v-if="item.state === 'rejected'">
            <el-button
              link
              type="primary"
              size="small"
              @click="editAgain(item)"
            >
              {{ $t("whatsapp.editAgain") }}
            </el-button>
            <el-button link size="small" @click="emit('discard', item.clientRequestId)">
              {{ $t("whatsapp.discard") }}
            </el-button>
          </template>
        </div>
      </div>
    </div>
    <div class="flex flex-col gap-[6px]">
      <div class="text-[12px]" :class="replyHint.isWarning ? 'text-[var(--el-color-warning)]' : 'text-[var(--el-text-color-secondary)]'">
        {{ replyHint.text }}
      </div>
      <template v-if="!access.isReadOnly">
        <el-input
          v-model="draft"
          type="textarea"
          :rows="3"
          :maxlength="MAX_TEXT_LENGTH"
          show-word-limit
          :disabled="!access.canCompose"
          :placeholder="$t('whatsapp.composerPlaceholder')"
          @keydown.enter.ctrl.prevent="handleSend"
          @keydown.enter.meta.prevent="handleSend"
        />
        <div class="flex justify-end">
          <el-button
            type="primary"
            :disabled="!access.canCompose || !draft.trim()"
            @click="handleSend"
          >
            {{ $t("whatsapp.send") }}
          </el-button>
        </div>
      </template>
    </div>
  </SectionCard>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import FeedbackState from "@/components/FeedbackState/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import type { WhatsappConversationDetail, WhatsappMessage } from "@/types/whatsapp";
import { formatDateTime } from "@/utils";
import {
  MESSAGE_STATUS_TAG_TYPES,
  STATE_TAG_TYPES,
  attachmentSummary,
  canRetryMessage,
  messageSourceLabel,
  replyWindowState,
  threadAccess,
  type PendingMessage,
} from "../message-utils";

const MAX_TEXT_LENGTH = 4096;

const props = defineProps<{
  detail: WhatsappConversationDetail;
  messages: WhatsappMessage[];
  pending: PendingMessage[];
  hasOlder: boolean;
  olderLoading: boolean;
  retryingIds: Set<string>;
}>();
const emit = defineEmits<{
  send: [text: string];
  resubmit: [clientRequestId: string];
  discard: [clientRequestId: string];
  retry: [message: WhatsappMessage];
  "load-older": [];
  "open-conversation": [id: string];
  /** 消息已渲染；isUserOpened 表示用户刚打开该会话。 */
  displayed: [conversationId: string, isUserOpened: boolean];
}>();

const { t } = useI18n();
const draft = ref("");
const scrollRef = ref<HTMLElement>();
const now = ref(Date.now());
let clock: ReturnType<typeof setInterval> | undefined;
let renderedConversationId = "";

const access = computed(() => threadAccess(props.detail));
const retriedIds = computed(() => new Set(props.messages.map((message) => message.retryOf).filter(Boolean)));
const replyHint = computed(() => {
  if (props.detail.state === "archived") return { text: t("whatsapp.archivedHint"), isWarning: true };
  if (props.detail.state === "closed") return { text: t("whatsapp.closedHint"), isWarning: true };
  const window = replyWindowState(props.detail.replyWindowExpiresAt, now.value);
  if (window.kind === "none") return { text: t("whatsapp.window.none"), isWarning: true };
  if (window.kind === "expired") return { text: t("whatsapp.window.expired"), isWarning: true };
  const minutes = Math.floor(window.remainingMs / 60_000);
  const remaining = t("whatsapp.window.duration", { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
  if (!props.detail.capabilities.canReply) return { text: t("whatsapp.cannotReply"), isWarning: true };
  return { text: t("whatsapp.window.open", { time: remaining }), isWarning: false };
});

watch(
  () => [props.detail.id, props.messages] as const,
  async ([id], previous) => {
    // 详情先于消息到达；首次真正渲染出消息时才视为用户打开后的展示。
    const isUserOpened = id !== renderedConversationId;
    const wasAtBottom = isUserOpened || isNearBottom();
    if (previous && previous[0] !== id) draft.value = "";
    await nextTick();
    if (wasAtBottom && scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
    if (!props.messages.length) return;
    renderedConversationId = id;
    emit("displayed", id, isUserOpened);
  },
  { immediate: true, flush: "post" },
);

onMounted(() => {
  clock = setInterval(() => (now.value = Date.now()), 30_000);
});
onBeforeUnmount(() => clearInterval(clock));

function isNearBottom() {
  const el = scrollRef.value;
  return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80;
}
function sourceLabel(message: WhatsappMessage) {
  return messageSourceLabel(message, t);
}
function canRetry(message: WhatsappMessage) {
  return canRetryMessage(message, retriedIds.value, props.detail.capabilities.canReply);
}
function handleSend() {
  const text = draft.value.trim();
  if (!text || text.length > MAX_TEXT_LENGTH || !access.value.canCompose) return;
  emit("send", text);
  draft.value = "";
}
function editAgain(item: PendingMessage) {
  draft.value = item.text;
  emit("discard", item.clientRequestId);
}
</script>

<style scoped lang="scss">
.whatsapp-message {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 78%;

  &--inbound {
    align-self: flex-start;
  }

  &--outbound {
    align-self: flex-end;
    align-items: flex-end;
  }

  &__bubble {
    padding: 8px 12px;
    border-radius: 8px;
    background: var(--el-fill-color-light);
  }

  &--outbound &__bubble {
    background: var(--el-color-primary-light-9);
  }
}
</style>
