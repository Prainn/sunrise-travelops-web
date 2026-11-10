<template>
  <SectionCard fill padding="compact" body-class="flex flex-col gap-[8px] min-h-0">
    <FilterBar variant="compact" class="whatsapp-filter" @reset="emit('reset')">
      <el-form-item v-if="viewOptions.length" :label="$t('whatsapp.view')">
        <el-select
          :model-value="view"
          autocomplete="new-password"
          @update:model-value="emit('update:view', $event)"
        >
          <el-option
            v-for="option in viewOptions"
            :key="option"
            :value="option"
            :label="$t(`whatsapp.views.${option}`)"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
        <el-input
          :model-value="keyword"
          :placeholder="$t('whatsapp.keywordPlaceholder')"
          clearable
          @update:model-value="emit('update:keyword', $event)"
        />
      </el-form-item>

      <el-form-item :label="$t('common.status')">
        <el-select
          :model-value="state"
          autocomplete="new-password"
          clearable
          :placeholder="$t('whatsapp.statePlaceholder')"
          @update:model-value="emit('update:state', $event || undefined)"
        >
          <el-option
            v-for="option in STATE_OPTIONS"
            :key="option"
            :value="option"
            :label="$t(`whatsapp.states.${option}`)"
          />
        </el-select>
      </el-form-item>
    </FilterBar>
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
          <el-badge v-if="item.unreadCount" :value="item.unreadCount" :max="99" />
        </div>
        <div class="text-[12px] text-[var(--el-text-color-secondary)] truncate">
          {{ item.phone || item.bsuid }}
        </div>
        <div class="text-[13px] truncate">
          {{ item.lastMessageText || $t("whatsapp.noMessage") }}
        </div>
        <div class="flex items-center justify-between gap-[8px] text-[12px]">
          <span :class="item.ownerId ? 'text-[var(--el-text-color-secondary)]' : 'text-[var(--el-color-warning)]'">
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
import FilterBar from "@/components/FilterBar/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import type {
  WhatsappConversationItem,
  WhatsappConversationState,
  WhatsappConversationView,
} from "@/types/whatsapp";
import { STATE_TAG_TYPES } from "../message-utils";

defineProps<{
  items: WhatsappConversationItem[];
  selectedId: string;
  loading: boolean;
  error: string;
  total: number;
  page: number;
  pageSize: number;
  keyword: string;
  view?: WhatsappConversationView;
  state?: WhatsappConversationState;
  /** 主管可切换视图；普通计调由服务端按本人范围返回，不提供视图选择。 */
  viewOptions: WhatsappConversationView[];
}>();
const emit = defineEmits<{
  select: [id: string];
  refresh: [];
  reset: [];
  "update:keyword": [value: string];
  "update:view": [value: WhatsappConversationView];
  "update:state": [value: WhatsappConversationState | undefined];
  "update:page": [value: number];
  "update:pageSize": [value: number];
}>();

const STATE_OPTIONS: WhatsappConversationState[] = ["open", "closed", "archived"];
</script>

<style lang="scss">
/* 侧栏宽度有限：每个筛选项独占一行，标签定宽对齐，重置按钮靠右 */
.whatsapp-filter {
  padding: 4px 4px 8px;

  .filter-bar__form {
    flex-direction: column;
    flex-wrap: nowrap;
    gap: 12px;
    align-items: stretch;
  }

  .filter-bar__fields {
    flex: none;
    flex-direction: column;
    flex-wrap: nowrap;
    gap: 12px;

    > .el-form-item,
    > .el-form-item.filter-bar__wide {
      flex: none;
      width: 100%;
      min-width: 0;
      max-width: none;
    }

    .el-form-item__label {
      width: 72px;
      justify-content: flex-start;
    }
  }

  .filter-bar__actions {
    order: 99;
    justify-content: flex-end;
    margin-left: 0;
  }
}
</style>

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
