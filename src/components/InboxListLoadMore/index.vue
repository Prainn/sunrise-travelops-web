<template>
  <div v-if="hasMore" ref="end" class="min-h-px text-center text-xs text-muted">
    <div v-if="error" class="flex items-center justify-between gap-[8px] px-[8px] py-[4px]" role="alert">
      <span>{{ error }}</span>
      <el-button
        link
        type="primary"
        size="small"
        @click="$emit('load-more')"
      >
        {{ $t('common.retry') }}
      </el-button>
    </div>
    <div v-else-if="loading" class="py-[8px]" role="status">
      {{ $t('common.loading') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from "vue";
import { useIntersectionObserver } from "@vueuse/core";

const props = defineProps<{
  root?: HTMLElement;
  hasMore: boolean;
  busy: boolean;
  loading: boolean;
  error: string;
}>();
const emit = defineEmits<{ "load-more": [] }>();
const end = ref<HTMLElement>();
const target = computed(() => props.root && !props.busy && !props.error ? end.value : undefined);

useIntersectionObserver(target, ([entry]) => {
  if (entry?.isIntersecting) emit("load-more");
}, { root: toRef(props, "root") });
</script>
