<template>
  <div class="itinerary-day-resources flex flex-col gap-2">
    <div
      v-if="actions.length"
      class="flex flex-wrap items-center gap-2"
      role="toolbar"
      :aria-label="$t('itineraryWorkspace.dayResources')"
    >
      <el-tooltip
        v-for="action in actions"
        :key="action.key"
        :content="action.hint"
        :disabled="!action.hint"
        placement="top"
      >
        <!-- 包一层元素，禁用按钮仍能显示原因提示 -->
        <span>
          <el-button
            round
            :type="action.active ? 'primary' : undefined"
            :plain="action.active"
            :disabled="action.disabled"
            class="ml-0!"
            @click="emit('select', action.key)"
          >
            <el-icon class="mr-1">
              <component :is="action.icon" />
            </el-icon>
            {{ action.label }}
            <small v-if="action.scope" class="ml-1 text-[12px] opacity-75">· {{ action.scope }}</small>
          </el-button>
        </span>
      </el-tooltip>
    </div>
    <dl v-if="summaries.length" class="m-0 grid gap-x-3 gap-y-1 [grid-template-columns:max-content_minmax(0,1fr)] text-[13px]">
      <template v-for="summary in summaries" :key="summary.label">
        <dt class="text-muted">
          {{ summary.label }}
        </dt>
        <dd class="m-0 [overflow-wrap:anywhere]">
          {{ summary.value }}
        </dd>
      </template>
    </dl>
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";

export interface DayResourceAction {
  key: string;
  label: string;
  icon: Component;
  /** 作用范围，例如整程或按城市；用于区分当天资源与整程方案 */
  scope?: string;
  hint?: string;
  active?: boolean;
  disabled?: boolean;
}

/**
 * 每天标题下方的资源入口：带文字按钮集中展示，已配置项高亮，整程/按城市方案附作用范围说明。
 */
withDefaults(
  defineProps<{
    actions: DayResourceAction[];
    summaries?: Array<{ label: string; value: string }>;
  }>(),
  { summaries: () => [] },
);
const emit = defineEmits<{ select: [key: string] }>();
</script>
