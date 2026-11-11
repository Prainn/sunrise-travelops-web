<template>
  <SectionCard fill padding="compact" body-class="flex flex-col gap-[8px] min-h-0">
    <template #header>
      <div class="flex items-center justify-between gap-[8px] min-w-0">
        <div class="flex flex-1 items-center flex-wrap gap-[8px] min-w-0">
          <h3 class="m-0 max-w-full text-[16px] truncate">
            {{ detail.name || detail.bsuid || detail.phone }}
          </h3>
          <el-tag
            v-if="phoneRegionLabel"
            type="info"
            effect="plain"
            size="small"
            :title="$t('whatsapp.phoneRegion')"
          >
            {{ phoneRegionLabel }}
          </el-tag>
        </div>
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
    <div ref="scrollRef" class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-[20px] px-[4px] pt-[4px] pb-[12px]">
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
        v-for="message in visibleMessages"
        :key="message.id"
        class="whatsapp-message"
        :class="message.direction === 'inbound' ? 'whatsapp-message--inbound' : 'whatsapp-message--outbound'"
      >
        <div v-if="message.direction === 'outbound'" class="text-[12px] text-muted">
          {{ sourceLabel(message) }}
        </div>
        <div class="flex items-center gap-[6px] min-w-0" :class="message.direction === 'outbound' ? 'flex-row-reverse' : ''">
          <div class="whatsapp-message__bubble min-w-0" :class="{ 'is-reaction': message.presentation?.interaction === 'reaction', 'has-reactions': message.presentation?.reactions.length }">
            <ReplyPreview v-if="messageReply(message)" class="mb-[6px]" :reply="messageReply(message)!" />
            <div v-if="message.presentation?.interaction === 'reaction'" class="text-[24px]" :title="$t('whatsapp.unlinkedReaction')">
              <span v-if="message.presentation.emoji">{{ message.presentation.emoji }}</span>
              <span v-else class="text-muted" :title="$t('whatsapp.unknownReaction')">◌</span>
            </div>
            <MessageText v-else-if="message.presentation?.text ?? message.text" :text="message.presentation?.text ?? message.text ?? ''" />
            <div v-if="['image', 'audio', 'video', 'document', 'sticker'].includes(message.kind) && attachmentSummary(message.attachment).length" class="text-[12px] text-muted">
              {{ attachmentSummary(message.attachment).join(" · ") }}
            </div>
            <div class="flex items-center justify-end flex-wrap gap-[5px] mt-[4px] text-[11px] text-muted">
              <span v-if="message.presentation?.editedAt" :title="formatDateTime(message.presentation.editedAt)">{{ $t("whatsapp.edited") }}</span>
              <time :datetime="message.occurredAt" :title="formatDateTime(message.occurredAt)">{{ formatDateTime(message.occurredAt) }}</time>
              <span v-if="message.direction === 'outbound'" :class="message.status === 'read' ? 'text-[var(--el-color-primary)]' : message.status === 'failed' ? 'text-[var(--el-color-danger)]' : ''">
                <span v-if="['delivered', 'read'].includes(message.status)" aria-hidden="true">✓✓ </span>{{ $t(`whatsapp.statuses.${message.status}`) }}
              </span>
            </div>
            <div v-if="message.presentation?.reactions.length" class="whatsapp-message__reactions">
              <button
                v-for="reaction in message.presentation.reactions"
                :key="reaction.id"
                type="button"
                class="whatsapp-message__reaction"
                :class="reaction.direction === 'outbound' ? 'is-mine' : ''"
                :disabled="reaction.direction !== 'outbound' || !canReact(message)"
                :title="reaction.emoji ? $t(reaction.direction === 'outbound' ? 'whatsapp.removeReaction' : 'whatsapp.sources.customer') : $t('whatsapp.unknownReaction')"
                @click="handleReact(message, '')"
              >
                {{ reaction.emoji || '◌' }}
                <span v-if="['queued', 'sending'].includes(reaction.status)" class="absolute right-[-4px] bottom-[-4px] rounded-full bg-[var(--el-bg-color)] text-[10px]" :aria-label="$t('whatsapp.reactionPending')">◷</span>
              </button>
            </div>
          </div>
          <el-popover
            v-if="canReact(message)"
            placement="top"
            trigger="click"
            :width="260"
          >
            <template #reference>
              <button
                type="button"
                class="whatsapp-message__react"
                :aria-label="$t('whatsapp.react')"
                :title="$t('whatsapp.react')"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 14.5c1 3 7 3 8 0" />
                  <circle
                    cx="9"
                    cy="9"
                    r=".8"
                    fill="currentColor"
                    stroke="none"
                  />
                  <circle
                    cx="15"
                    cy="9"
                    r=".8"
                    fill="currentColor"
                    stroke="none"
                  />
                </svg>
              </button>
            </template>
            <div class="flex justify-between gap-[4px]" :aria-label="$t('whatsapp.react')">
              <button
                v-for="emoji in REACTION_EMOJIS"
                :key="emoji"
                type="button"
                class="grid place-items-center box-border w-[36px] h-[36px] shrink-0 p-0 border-0 bg-transparent cursor-pointer rounded-full text-[23px] leading-none hover:bg-[var(--el-fill-color)] focus-visible:outline-2 focus-visible:outline-[var(--el-color-primary)]"
                :aria-label="`${$t('whatsapp.react')} ${emoji}`"
                @click="handleReact(message, emoji)"
              >
                {{ emoji }}
              </button>
            </div>
          </el-popover>
          <button
            v-if="canReplyTo(message)"
            type="button"
            class="whatsapp-message__react"
            :aria-label="$t('whatsapp.reply')"
            :title="$t('whatsapp.reply')"
            @click="handleReply(message)"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            ><path d="m9 5-6 6 6 6M3 11h10c5 0 7 3 7 8" /></svg>
          </button>
        </div>
        <div v-if="message.errorCode || canRetry(message) || canConfirmFailed(message)" class="flex items-center gap-[6px] text-[12px]">
          <span v-if="message.errorCode" class="text-muted">{{ message.errorCode }}</span>
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
          <el-button
            v-if="canConfirmFailed(message)"
            link
            type="primary"
            size="small"
            :loading="confirmingIds.has(message.id)"
            @click="emit('confirm-failed', message)"
          >
            {{ $t("whatsapp.confirmFailed") }}
          </el-button>
        </div>
      </div>
      <div
        v-for="item in pendingBubbles"
        :key="item.clientRequestId"
        class="whatsapp-message whatsapp-message--outbound"
      >
        <div class="whatsapp-message__bubble">
          <ReplyPreview v-if="item.replyTo" class="mb-[6px]" :reply="item.replyTo" />
          <div v-if="item.reaction" class="text-[24px]" :title="$t(item.text ? 'whatsapp.react' : 'whatsapp.removeReaction')">
            {{ item.text || '◌' }}
          </div>
          <MessageText v-else :text="item.text" />
        </div>
        <div class="flex flex-wrap items-center gap-[6px] text-[12px]">
          <el-tag size="small" :type="item.state === 'rejected' ? 'danger' : item.state === 'uncertain' ? 'warning' : 'info'">
            {{ $t(`whatsapp.pendingStates.${item.state}`) }}
          </el-tag>
          <span v-if="item.error" class="text-muted">{{ item.error }}</span>
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
              v-if="!item.reaction"
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
      <div class="text-[12px]" :class="replyHint.isWarning ? 'text-[var(--el-color-warning)]' : 'text-muted'">
        {{ replyHint.text }}
      </div>
      <template v-if="!access.isReadOnly">
        <div v-if="replyTo" class="flex items-center gap-[8px] p-[8px] surface-muted">
          <div class="flex-1 min-w-0">
            <div class="mb-[3px] text-[12px] text-muted">
              {{ $t('whatsapp.replyingTo') }}
            </div>
            <ReplyPreview :reply="replyTo" />
          </div>
          <el-button
            text
            :aria-label="$t('whatsapp.cancelReply')"
            :title="$t('whatsapp.cancelReply')"
            @click="replyTo = undefined"
          >
            ×
          </el-button>
        </div>
        <MessageComposer
          ref="composerRef"
          v-model="draft"
          :disabled="!access.canCompose"
          @send="handleSend"
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
import type { WhatsappConversationDetail, WhatsappMessage, WhatsappReply } from "@/types/whatsapp";
import { formatDateTime } from "@/utils";
import {
  STATE_TAG_TYPES,
  attachmentSummary,
  canConfirmFailedMessage,
  canRetryMessage,
  compareSeq,
  maxSeq,
  messageSourceLabel,
  messageReply,
  replyWindowState,
  threadAccess,
  threadMessages,
  type PendingMessage,
} from "../message-utils";

import { useWhatsappDrafts } from "../drafts";
import { phoneRegion } from "../phone-region";
import MessageText from "./MessageText.vue";
import ReplyPreview from "./ReplyPreview.vue";
import MessageComposer from "./MessageComposer.vue";

const MAX_TEXT_LENGTH = 4096;
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const props = defineProps<{
  detail: WhatsappConversationDetail;
  messages: WhatsappMessage[];
  pending: PendingMessage[];
  hasOlder: boolean;
  olderLoading: boolean;
  retryingIds: Set<string>;
  confirmingIds: Set<string>;
}>();
const emit = defineEmits<{
  send: [text: string, replyTo?: WhatsappReply];
  react: [message: WhatsappMessage, emoji: string];
  resubmit: [clientRequestId: string];
  discard: [clientRequestId: string];
  retry: [message: WhatsappMessage];
  "confirm-failed": [message: WhatsappMessage];
  "load-older": [];
  "open-conversation": [id: string];
  /** 消息已渲染；isUserOpened 表示用户刚打开该会话。 */
  displayed: [conversationId: string, isUserOpened: boolean];
}>();

const { t, locale } = useI18n();
const drafts = useWhatsappDrafts();
const draft = computed({
  get: () => drafts.get(props.detail.id),
  set: (text: string) => drafts.set(props.detail.id, text),
});
const replyTo = ref<WhatsappReply>();
const composerRef = ref<InstanceType<typeof MessageComposer>>();
const activeReactionMessageId = ref("");
const scrollRef = ref<HTMLElement>();
const now = ref(Date.now());
let clock: ReturnType<typeof setInterval> | undefined;
let renderedConversationId = "";

const phoneRegionLabel = computed(() => {
  const region = phoneRegion(props.detail.phone);
  if (!region) return "";
  if (region.regions.includes("001")) return t("whatsapp.globalPhoneRegion", { code: region.callingCode });
  if (region.regions.length !== 1) return t("whatsapp.sharedPhoneRegion", { code: region.callingCode });
  const names = new Intl.DisplayNames([locale.value], { type: "region", style: "short" });
  return `${names.of(region.regions[0]!)} ${region.callingCode}`;
});
/** 发送中的表情直接叠加到目标消息上，避免先在右侧出现一条独立的待发送气泡。 */
const visibleMessages = computed(() => {
  const items = threadMessages(props.messages);
  for (const item of props.pending) {
    if (!item.reaction || item.state !== "sending") continue;
    const target = items.find((message) => message.id === item.reaction!.targetMessageId)?.presentation;
    if (!target) continue;
    target.reactions = target.reactions.filter((reaction) => reaction.direction !== "outbound");
    if (item.reaction.emoji) target.reactions.push({
      id: item.clientRequestId, seq: "0", direction: "outbound", emoji: item.reaction.emoji, source: "system", status: "sending",
    });
  }
  return items;
});
const pendingBubbles = computed(() => props.pending.filter((item) => !item.reaction || item.state !== "sending" ||
  !visibleMessages.value.some((message) => message.id === item.reaction!.targetMessageId)));
const access = computed(() => threadAccess(props.detail));
const retriedIds = computed(() => new Set(props.messages.map((message) => message.retryOf).filter(Boolean)));
const replyHint = computed(() => {
  if (props.detail.state === "archived") return { text: t("whatsapp.archivedHint"), isWarning: true };
  if (props.detail.state === "closed") return { text: t("whatsapp.closedHint"), isWarning: true };
  const window = replyWindowState(props.detail.replyWindowExpiresAt, now.value);
  if (window.kind === "none") return { text: t("whatsapp.window.none"), isWarning: true };
  if (window.kind === "expired") return { text: t("whatsapp.window.expired"), isWarning: true };
  if (props.detail.sendBlockedReason) return { text: t(`whatsapp.sendBlockedReasons.${props.detail.sendBlockedReason}`), isWarning: true };
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
    const hasNewMessage = previous?.[0] === id &&
      compareSeq(maxSeq(props.messages) ?? "0", maxSeq(previous[1]) ?? "0") > 0;
    const shouldScroll = isUserOpened || hasNewMessage || isNearBottom();
    if (previous && previous[0] !== id) {
      replyTo.value = undefined;
      activeReactionMessageId.value = "";
    }
    await nextTick();
    if (shouldScroll) scrollToBottom();
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

function scrollToBottom() {
  if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
}
function isNearBottom() {
  const el = scrollRef.value;
  return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80;
}
function sourceLabel(message: WhatsappMessage) {
  return messageSourceLabel(message, t);
}
function canReact(message: WhatsappMessage) {
  return access.value.canCompose && replyWindowState(props.detail.replyWindowExpiresAt, now.value).kind === "open" &&
    message.direction === "inbound" && !!message.providerId && !message.presentation?.interaction;
}
function canReplyTo(message: WhatsappMessage) {
  return access.value.canCompose && replyWindowState(props.detail.replyWindowExpiresAt, now.value).kind === "open" &&
    !!message.providerId && !message.presentation?.interaction && !["reaction", "edit"].includes(message.kind);
}
async function handleReply(message: WhatsappMessage) {
  if (!canReplyTo(message)) return;
  replyTo.value = {
    id: message.id,
    text: (message.presentation?.text ?? message.text).slice(0, 280),
    kind: message.kind,
    direction: message.direction,
    source: message.source,
  };
  await nextTick();
  composerRef.value?.focus();
}
function handleReact(message: WhatsappMessage, emoji: string) {
  activeReactionMessageId.value = "";
  emit("react", message, emoji);
}
function canRetry(message: WhatsappMessage) {
  return canRetryMessage(message, retriedIds.value, props.detail.capabilities.canReply);
}
function canConfirmFailed(message: WhatsappMessage) {
  return canConfirmFailedMessage(message, props.detail.capabilities.canConfirmFailed, now.value);
}
function handleSend() {
  const text = draft.value.trim();
  if (!text || text.length > MAX_TEXT_LENGTH || !access.value.canCompose) return;
  emit("send", text, replyTo.value);
  draft.value = "";
  replyTo.value = undefined;
  // 发送记录由父组件同步加入待发送列表，渲染后滚到最新一条。
  void nextTick(scrollToBottom);
}

function editAgain(item: PendingMessage) {
  draft.value = item.text;
  replyTo.value = item.replyTo;
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
    position: relative;
    padding: 8px 12px;
    border-radius: 14px;
    background: var(--el-fill-color-light);
  }

  &__bubble.is-reaction {
    padding: 4px 10px;
  }

  &__bubble.has-reactions {
    margin-bottom: 18px;
  }

  // 参照 WhatsApp：表情以小胶囊压在气泡底边，客户消息靠左、企业消息靠右。
  &__reactions {
    @apply absolute bottom-[-22px] flex items-center gap-[2px] px-[6px] h-[28px] rounded-full bg-[var(--el-bg-color)] shadow-[0_1px_3px_rgba(0,0,0,0.16)] border-solid border-[2px] border-[var(--el-bg-color)];
  }

  &--inbound &__reactions {
    left: 10px;
  }

  &--outbound &__reactions {
    right: 10px;
  }

  &__reaction {
    @apply relative grid place-items-center p-0 border-0 bg-transparent text-[16px] leading-none text-strong;

    &.is-mine:not(:disabled) {
      cursor: pointer;
    }
  }

  &__react {
    @apply grid place-items-center box-border w-[32px] h-[32px] min-w-[32px] shrink-0 p-0 rounded-full border-solid border-[1px] border-[var(--el-border-color)] bg-[var(--el-bg-color)] text-muted cursor-pointer hover:text-[var(--el-color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--el-color-primary)];
    opacity: 0;
  }
  &:hover &__react, &:focus-within &__react { opacity: 1; }
  @media (hover: none) { &__react { opacity: 1; } }

  &--outbound &__bubble {
    background: var(--el-color-primary-light-9);
  }
}
</style>
