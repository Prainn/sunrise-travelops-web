<template>
  <SectionCard fill padding="compact" body-class="flex flex-col gap-[8px] min-h-0">
    <div v-loading="loading" class="flex-1 min-h-0 overflow-y-auto">
      <FeedbackState
        v-if="error"
        type="error"
        :description="error"
        retryable
        @retry="emit('refresh')"
      />
      <FeedbackState v-else-if="!loading && !items.length" :title="$t('whatsapp.emptyList')" />
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="whatsapp-conversation"
        :class="{ 'is-active': item.id === selectedId }"
        @click="emit('select', item.id)"
      >
        <div class="flex items-center justify-between gap-[8px]">
          <span class="font-600 truncate">{{ item.name || item.bsuid || item.phone }}</span>
          <span class="flex items-center gap-[6px] shrink-0">
            <time
              v-if="item.lastMessageAt"
              class="text-[12px] text-muted"
              :datetime="item.lastMessageAt"
              :title="formatDateTime(item.lastMessageAt)"
            >{{ formatListTime(item.lastMessageAt) }}</time>
            <el-badge v-if="item.unreadCount" :value="item.unreadCount" :max="99" />
          </span>
        </div>
        <div class="text-[13px] line-clamp-2 break-words">
          <template v-if="drafts.get(item.id).trim()">
            <span class="text-[var(--el-color-danger)]">{{ $t("whatsapp.draftLabel") }}：</span>{{ drafts.get(item.id) }}
          </template>
          <template v-else>
            {{ item.lastMessageText || $t("whatsapp.noMessage") }}
          </template>
        </div>
        <div class="flex items-center justify-between gap-[8px] text-[12px]">
          <span :class="item.ownerId ? 'text-muted' : 'text-[var(--el-color-warning)]'">
            {{ item.ownerName || $t("whatsapp.unassigned") }}
          </span>
          <el-tag size="small" :type="STATE_TAG_TYPES[item.state]">
            {{ $t(`whatsapp.states.${item.state}`) }}
          </el-tag>
        </div>
      </button>
    </div>
    <Pagination
      :page="page"
      :limit="pageSize"
      :total="total"
      variant="compact"
      @update:page="emit('update:page', $event)"
      @update:limit="emit('update:pageSize', $event)"
      @pagination="emit('refresh')"
    />
  </SectionCard>
</template>

<script setup lang="ts">
import FeedbackState from "@/components/FeedbackState/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import type { WhatsappConversationItem } from "@/types/whatsapp";
import { formatDate, formatDateTime } from "@/utils";
import { useWhatsappDrafts } from "../drafts";
import { STATE_TAG_TYPES } from "../message-utils";

defineProps<{
  items: WhatsappConversationItem[];
  selectedId: string;
  loading: boolean;
  error: string;
  total: number;
  page: number;
  pageSize: number;
}>();
const emit = defineEmits<{
  select: [id: string];
  refresh: [];
  "update:page": [value: number];
  "update:pageSize": [value: number];
}>();
const drafts = useWhatsappDrafts();

/** 当天只显示时分，今年显示月日，更早显示完整日期；悬停显示完整时间。 */
function formatListTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const full = formatDateTime(date);
  if (formatDate(date) === formatDate(now)) return full.slice(11);
  return date.getFullYear() === now.getFullYear() ? full.slice(5, 10) : full.slice(0, 10);
}
</script>

<style scoped lang="scss">
.whatsapp-conversation {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-primary);

  &:hover {
    background: var(--el-fill-color-light);
  }

  &.is-active {
    background: var(--el-color-primary-light-9);
  }
}
</style>
