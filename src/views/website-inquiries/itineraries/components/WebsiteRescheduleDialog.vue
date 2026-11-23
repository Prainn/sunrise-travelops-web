<template>
  <AppDialog
    :model-value="modelValue"
    :title="$t('websiteWorkspace.rescheduleTitle')"
    size="md"
    :busy="saving"
    destroy-on-close
    @close="emit('update:modelValue', false)"
  >
    <el-descriptions
      :column="1"
      border
      size="small"
      class="mb-4"
    >
      <el-descriptions-item :label="$t('websiteWorkspace.rescheduleDraftDates')">
        {{ draftDatesLabel }}
      </el-descriptions-item>
      <el-descriptions-item :label="$t('websiteWorkspace.rescheduleInquiryDates')">
        {{ inquiryDatesLabel }}
      </el-descriptions-item>
    </el-descriptions>
    <el-alert
      v-if="!dates"
      type="info"
      :closable="false"
      :title="$t('websiteWorkspace.rescheduleContinuous', { start: startDate ?? $t('websiteWorkspace.noDate') })"
    />
    <template v-else-if="diff">
      <p class="m-0 mb-3 text-sm text-muted">
        {{ $t("websiteWorkspace.rescheduleKeptDays", { count: diff.kept.length }) }}
      </p>
      <template v-if="diff.removed.length">
        <h4 class="m-0 mb-2 text-[14px] font-600 text-strong">
          {{ $t("websiteWorkspace.rescheduleRemovedDays") }}
        </h4>
        <el-form label-position="left" label-width="auto">
          <el-form-item
            v-for="entry in diff.removed"
            :key="entry.day.id"
            :label="dayLabel(entry.day, entry.date)"
          >
            <el-select v-model="targets[entry.day.id]" autocomplete="new-password" class="w-full">
              <el-option :value="RECYCLE" :label="$t('websiteWorkspace.rescheduleRecycle')" />
              <el-option
                v-for="date in diff.added"
                :key="date"
                :value="date"
                :label="$t('websiteWorkspace.rescheduleMoveTo', { date })"
                :disabled="isTaken(date, entry.day.id)"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </template>
      <template v-if="diff.added.length">
        <h4 class="m-0 mb-2 text-[14px] font-600 text-strong">
          {{ $t("websiteWorkspace.rescheduleAddedDates") }}
        </h4>
        <ul class="m-0 pl-5 text-sm leading-[24px]">
          <li v-for="date in diff.added" :key="date">
            {{ date }} — {{ addedSource(date) }}
          </li>
        </ul>
      </template>
    </template>
    <template #footer>
      <el-button :disabled="saving" @click="emit('update:modelValue', false)">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" :loading="saving" @click="submit">
        {{ $t("websiteWorkspace.rescheduleApply") }}
      </el-button>
    </template>
  </AppDialog>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import type { WebsiteDay, WebsiteItinerary } from "@/types/website";
import { serviceDateRanges, serviceDayDate } from "@/utils/service-dates";
import { defaultRescheduleTargets, rescheduleDiff, type RescheduleTargets } from "../reschedule";

const RECYCLE = "recycle";
const props = defineProps<{
  modelValue: boolean;
  plan: WebsiteItinerary;
  /** 询盘服务日期；null 为连续模式 */
  dates: string[] | null;
  startDate: string | null;
  saving: boolean;
  apply: (targets: RescheduleTargets) => Promise<boolean>;
  describeDay: (day: WebsiteDay) => string;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();
const { t } = useI18n();
const targets = ref<Record<string, string>>({});
const diff = computed(() => (props.dates ? rescheduleDiff(props.plan, props.dates) : undefined));
const separator = computed(() => t("websiteInquiry.listSeparator"));
const draftDatesLabel = computed(() => {
  const dates = props.plan.serviceDates ?? props.plan.days.map(day => serviceDayDate(props.plan, day.dayNumber));
  if (!dates.length || dates.some(date => !date)) return t("websiteWorkspace.noDate");
  return serviceDateRanges(dates as string[]).join(separator.value);
});
const inquiryDatesLabel = computed(() => {
  if (props.dates) return serviceDateRanges(props.dates).join(separator.value);
  return props.startDate ?? t("websiteWorkspace.noDate");
});

function dayLabel(day: WebsiteDay, date: string | null) {
  return [`D${day.dayNumber}`, date ?? t("websiteWorkspace.noDate"), props.describeDay(day)].filter(Boolean).join(" ");
}
function isTaken(date: string, dayId: string) {
  return Object.entries(targets.value).some(([id, target]) => id !== dayId && target === date);
}
function addedSource(date: string) {
  const entry = diff.value?.removed.find(item => targets.value[item.day.id] === date);
  return entry
    ? t("websiteWorkspace.rescheduleFromDay", { day: entry.day.dayNumber, date: entry.date ?? t("websiteWorkspace.noDate") })
    : t("websiteWorkspace.rescheduleNewDay");
}
async function submit() {
  if (props.saving) return;
  const selected = Object.fromEntries(Object.entries(targets.value).map(([id, value]) => [id, value === RECYCLE ? null : value]));
  if (await props.apply(selected)) emit("update:modelValue", false);
}
watch(() => props.modelValue, (opened) => {
  if (!opened || !diff.value) return;
  targets.value = Object.fromEntries(
    Object.entries(defaultRescheduleTargets(diff.value)).map(([id, date]) => [id, date ?? RECYCLE]),
  );
}, { immediate: true });
</script>
