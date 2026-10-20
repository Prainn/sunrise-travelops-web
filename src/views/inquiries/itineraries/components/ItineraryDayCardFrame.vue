<template>
  <SectionCard
    class="itinerary-day-card"
    :class="{ 'is-collapsed': !expanded }"
    :padding="expanded ? 'default' : 'none'"
  >
    <template #header>
      <div class="flex items-center gap-3 min-w-0">
        <span class="grid w-[44px] h-[44px] shrink-0 place-items-center rounded-[10px] bg-primary text-white font-bold">
          D{{ dayNumber }}
        </span>
        <div class="min-w-0">
          <h3 class="m-0 flex flex-wrap items-center gap-[6px] text-[16px] text-strong font-600">
            {{ departure }}
            <el-icon><Right /></el-icon>
            {{ destination }}
          </h3>
          <span v-if="date" class="text-sm text-muted">{{ date }}</span>
        </div>
      </div>
    </template>
    <template #actions>
      <slot name="actions" />
      <el-button
        link
        :aria-expanded="expanded"
        :aria-controls="bodyId"
        @click="expanded = !expanded"
      >
        {{ $t(expanded ? "itinerary.collapseDay" : "itinerary.expandDay") }}
      </el-button>
    </template>
    <div v-show="expanded" :id="bodyId">
      <slot />
    </div>
  </SectionCard>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Right } from "@element-plus/icons-vue";
import SectionCard from "@/components/SectionCard/index.vue";

/**
 * 每日卡片外壳：普通询盘与独立站共用的日序徽标、路线、日期与折叠交互；正文与额外操作由业务卡片提供。
 */
defineProps<{
  dayNumber: number;
  /** 已按业务填好占位文案的出发/到达名称 */
  departure: string;
  destination: string;
  date?: string;
  bodyId: string;
}>();
const expanded = ref(true);

defineExpose({
  expand: () => {
    expanded.value = true;
  },
});
</script>

<style scoped lang="scss">
.itinerary-day-card.is-collapsed > :deep(.section-card__header) {
  border-bottom: 0;
}
</style>
