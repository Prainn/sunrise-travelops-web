<template>
  <button
    type="button"
    class="inbox-thread-row"
    :aria-current="selected ? 'true' : undefined"
  >
    <span class="flex items-center justify-between gap-[8px] leading-[20px]">
      <span class="min-w-0 truncate text-[14px] font-600" :title="titleHint || title">{{ title }}</span>
      <span class="flex shrink-0 items-center gap-[6px]">
        <time
          v-if="time"
          class="text-[12px] text-muted"
          :datetime="time"
          :title="fullTime"
        >
          {{ shortTime }}
        </time>
        <el-badge v-if="unread" :value="unread" :max="99" />
      </span>
    </span>
    <span class="line-clamp-2 break-words text-[13px] leading-[20px]"><slot /></span>
    <span class="flex items-center justify-between gap-[8px] text-[12px]">
      <span v-if="owner" class="min-w-0 truncate text-muted">{{ owner }}</span>
      <el-tag v-else-if="unassigned" type="warning" size="small">{{ $t("whatsapp.views.unassigned") }}</el-tag>
      <span v-if="$slots.status" class="ml-auto"><slot name="status" /></span>
    </span>
    <span v-if="mailbox" class="truncate text-[12px] text-muted">{{ mailbox }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatDateTime, formatShanghaiDateTime } from "@/utils/format";

const props = defineProps<{
  title: string;
  titleHint?: string;
  time?: string | null;
  unread?: number;
  owner?: string | null;
  unassigned: boolean;
  selected: boolean;
  mailbox?: string;
  shanghaiTime?: boolean;
}>();

const fullTime = computed(() => (props.shanghaiTime ? formatShanghaiDateTime : formatDateTime)(props.time));
const shortTime = computed(() => {
  const now = (props.shanghaiTime ? formatShanghaiDateTime : formatDateTime)(new Date());
  const value = fullTime.value;
  if (now.slice(0, 10) === value.slice(0, 10)) return value.slice(11);
  return now.slice(0, 4) === value.slice(0, 4) ? value.slice(5, 10) : value.slice(0, 10);
});
</script>

<style scoped lang="scss">
.inbox-thread-row {
  @apply flex w-full cursor-pointer flex-col gap-[4px] text-left;
  padding: 10px 12px;
  font-family: inherit;
  color: var(--el-text-color-primary);
  background: transparent;
  border: 0;
  border-block-end: 1px solid var(--el-border-color-lighter);
  &:hover { background: var(--el-fill-color-light); }
  &[aria-current="true"] { background: var(--el-color-primary-light-9); }
  &:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: -2px; }
}
</style>
