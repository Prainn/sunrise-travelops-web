<template>
  <div :class="compact ? 'mb-3 flex min-w-0 flex-col items-stretch gap-1' : 'min-w-0 flex items-start gap-3'">
    <el-checkbox :model-value="expanded" :disabled="disabled" @update:model-value="toggle">
      {{ $t("itinerary.viaDestinations") }}
    </el-checkbox>
    <div v-if="expanded" class="min-w-0 flex-1">
      <el-select
        v-model="cities"
        :aria-label="$t('itinerary.viaDestinations')"
        autocomplete="new-password"
        :disabled="disabled"
        multiple
        :multiple-limit="365"
        :collapse-tags="compact"
        :collapse-tags-tooltip="compact"
        filterable
        :placeholder="$t('itinerary.viaDestinationsPlaceholder')"
      >
        <el-option
          v-for="option in options"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
      <div v-if="cities.length > 1" class="mt-2 flex flex-wrap items-center gap-1">
        <el-tag
          v-for="(city, index) in cities"
          :key="city"
          size="small"
          type="info"
          class="via-tag max-w-full"
        >
          <el-button
            link
            size="small"
            :icon="ArrowLeft"
            :disabled="disabled || index === 0"
            :aria-label="$t('itinerary.moveViaEarlier', { city: labels.get(city) ?? city })"
            @click="moveCity(index, -1)"
          />
          <span class="truncate leading-none" :title="labels.get(city) ?? city">{{ index + 1 }}. {{ labels.get(city) ?? city }}</span>
          <el-button
            link
            size="small"
            :icon="ArrowRight"
            :disabled="disabled || index === cities.length - 1"
            :aria-label="$t('itinerary.moveViaLater', { city: labels.get(city) ?? city })"
            @click="moveCity(index, 1)"
          />
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ArrowLeft, ArrowRight } from "@element-plus/icons-vue";

const props = defineProps<{
  options: { value: string; label: string }[];
  disabled: boolean;
  compact?: boolean;
}>();
const cities = defineModel<string[]>({ required: true });
const expanded = ref(cities.value.length > 0);
const labels = computed(() => new Map(props.options.map(({ value, label }) => [value, label])));
watch(() => cities.value.length, count => { if (count) expanded.value = true; });

function toggle(checked: string | number | boolean) {
  expanded.value = Boolean(checked);
  if (!checked) cities.value = [];
}

function moveCity(index: number, offset: -1 | 1) {
  const next = [...cities.value];
  const target = index + offset;
  if (target < 0 || target >= next.length) return;
  [next[index], next[target]] = [next[target]!, next[index]!];
  cities.value = next;
}
</script>

<style scoped>
.via-tag :deep(.el-tag__content) {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
</style>
