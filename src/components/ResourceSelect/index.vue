<template>
  <RemoteSelect
    :model-value="modelValue"
    :disabled="disabled"
    :placeholder="placeholder"
    :selected-label="selectedLabel"
    :query-key="JSON.stringify([kind, filters, locale])"
    :load-options="loadOptions"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import RemoteSelect from "@/components/RemoteSelect/index.vue";
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import { resourceService } from "@/services/resource.service";
import { formatMoney } from "@/utils";
const props = defineProps<{ modelValue: string; kind: "hotels" | "transports" | "guides" | "agencies"; filters?: Record<string, string | number>; selectedLabel?: string; disabled?: boolean; placeholder?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const { t, locale } = useI18n();
type Item = Awaited<ReturnType<typeof resourceService.getSelectionOptions>>["list"][number];
function label(item: Item) {
  if (props.kind === "agencies") return `${item.name} (${item.code})`;
  const extra = props.kind === "hotels" ? t(item.breakfastIncluded ? "itinerary.breakfastIncluded" : "itinerary.breakfastExcluded") : props.kind === "transports" ? `${item.seats}座｜${item.city}` : "";
  return `${item.name}${extra ? `｜${extra}` : ""}｜¥${formatMoney(Number(item.unitCost))}`;
}
async function loadOptions(query: RemoteOptionsQuery) {
  const result = await resourceService.getSelectionOptions(props.kind, { ...props.filters, ...query });
  return { total: result.total, list: result.list.map(item => ({ id: item.id, label: label(item) })) };
}
</script>
