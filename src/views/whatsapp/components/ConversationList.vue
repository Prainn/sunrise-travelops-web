<template>
  <SectionCard fill padding="compact" body-class="flex flex-col gap-[8px] min-h-0">
    <div ref="scrollRoot" v-loading="loading" class="flex-1 min-h-0 overflow-y-auto">
      <div
        v-if="error && items.length"
        class="mb-[8px] flex items-center justify-between gap-[8px] px-[8px] text-[12px] text-[var(--el-color-warning)]"
        role="alert"
      >
        <span class="min-w-0 truncate" :title="error">{{ error }}</span>
        <el-button
          link
          type="primary"
          size="small"
          class="shrink-0"
          @click="emit('refresh')"
        >
          {{ $t('common.retry') }}
        </el-button>
      </div>
      <FeedbackState
        v-if="error && !items.length"
        type="error"
        :description="error"
        retryable
        @retry="emit('refresh')"
      />
      <FeedbackState v-else-if="!loading && !items.length" :title="$t('whatsapp.emptyList')" />
      <InboxThreadRow
        v-for="item in items"
        :key="item.id"
        :title="item.title"
        :time="item.lastMessageAt"
        :unread="item.unreadCount"
        :owner="item.ownerName"
        :unassigned="!item.ownerId && item.state === 'open'"
        :selected="item.id === selectedId"
        @click="emit('select', item.id)"
      >
        <template v-if="drafts.get(item.id).trim()">
          <span class="text-[var(--el-color-danger)]">{{ $t("whatsapp.draftLabel") }}：</span>{{ plainMessageText(drafts.get(item.id)) }}
        </template>
        <template v-else>
          {{ item.lastMessageText ? plainMessageText(item.lastMessageText) : $t("whatsapp.noMessage") }}
        </template>
        <template #status>
          <el-tag size="small" :type="STATE_TAG_TYPES[item.state]">
            {{ $t(`whatsapp.states.${item.state}`) }}
          </el-tag>
        </template>
      </InboxThreadRow>
      <InboxListLoadMore
        :root="scrollRoot"
        :has-more="hasMore"
        :busy="busy || !!error"
        :loading="loadingMore"
        :error="loadMoreError"
        @load-more="emit('load-more')"
      />
    </div>
  </SectionCard>
</template>

<script setup lang="ts">
import { ref } from "vue";
import FeedbackState from "@/components/FeedbackState/index.vue";
import InboxListLoadMore from "@/components/InboxListLoadMore/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import type { WhatsappConversationItem } from "@/types/whatsapp";
import InboxThreadRow from "@/views/website-inquiries/components/InboxThreadRow.vue";
import { useWhatsappDrafts } from "../drafts";
import { plainMessageText } from "../message-format";
import { STATE_TAG_TYPES } from "../message-utils";

defineProps<{
  items: WhatsappConversationItem[];
  selectedId: string;
  loading: boolean;
  error: string;
  hasMore: boolean;
  busy: boolean;
  loadingMore: boolean;
  loadMoreError: string;
}>();
const emit = defineEmits<{
  select: [id: string];
  refresh: [];
  "load-more": [];
}>();
const drafts = useWhatsappDrafts();
const scrollRoot = ref<HTMLElement>();

</script>
