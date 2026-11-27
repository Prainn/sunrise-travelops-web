<template>
  <SectionCard :title="title">
    <template #actions>
      <div class="flex flex-wrap items-center justify-end gap-x-[16px] gap-y-[6px]">
        <span v-if="switches.runtime.value" class="text-[12px] text-muted">
          {{ $t("integration.runtime.environment") }}：<strong class="text-strong">{{ switches.runtime.value.environment }}</strong>
        </span>
        <div
          v-for="field in fields"
          :key="field"
          class="inline-flex items-center gap-[6px] text-[14px]"
          :title="switchReason(field)"
        >
          <label :for="`${controlId}-${field}`">{{ label(field) }}</label>
          <el-switch
            :id="`${controlId}-${field}`"
            :model-value="switchValue(field)"
            :disabled="!switches.isAvailable(field) || loading || !!switches.saving.value"
            :loading="switches.saving.value === field"
            @change="emit('toggle', field, $event as boolean)"
          />
          <span class="text-muted">{{ switchText(field) }}</span>
        </div>
      </div>
      <IconButton
        :label="$t('common.refresh')"
        :icon="Refresh"
        :loading="loading"
        :disabled="!!switches.saving.value"
        @click="emit('refresh')"
      />
    </template>
    <p class="mt-0 mb-[12px] text-muted text-[12px]">
      {{ help }}
      <span v-if="runtimeReason" class="block mt-[4px] text-[var(--el-color-warning)]" role="status">{{ runtimeReason }}</span>
    </p>
    <FeedbackState
      v-if="error"
      type="error"
      :description="error"
      retryable
      @retry="emit('refresh')"
    />
    <slot v-else />
  </SectionCard>
</template>

<script setup lang="ts">
import { computed, useId } from "vue";
import { Refresh } from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import FeedbackState from "@/components/FeedbackState/index.vue";
import IconButton from "@/components/IconButton/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import type { RuntimeSwitch, useRuntimeSwitches } from "@/composables/useRuntimeSwitches";

const props = defineProps<{
  title: string;
  help: string;
  inboundLabel: string;
  hasStatus: boolean;
  loading: boolean;
  error: string;
  switches: ReturnType<typeof useRuntimeSwitches>;
}>();
const emit = defineEmits<{ refresh: []; toggle: [field: RuntimeSwitch, enabled: boolean] }>();
const { t } = useI18n();
const controlId = useId();
const fields = ["inbound", "outbound"] as const;

function label(field: RuntimeSwitch) {
  return field === "inbound" ? props.inboundLabel : t("integration.runtime.outbound");
}

function switchValue(field: RuntimeSwitch) {
  const runtime = props.switches.runtime.value;
  if (!runtime) return false;
  return field === "inbound" ? runtime.inboundEnabled : runtime.outboundEnabled;
}

function switchText(field: RuntimeSwitch) {
  if (!props.switches.isAvailable(field)) return t("integration.runtime.unavailable");
  return t(switchValue(field) ? "integration.runtime.on" : "integration.runtime.off");
}

function switchReason(field: RuntimeSwitch) {
  if (props.error) return t("integration.runtime.loadFailedHint");
  if (!props.switches.runtime.value) return props.hasStatus ? t("integration.runtime.missingHint") : "";
  return props.switches.isAvailable(field) ? "" : t("integration.runtime.unavailableHint");
}

const runtimeReason = computed(() => props.switches.runtime.value
  ? fields.filter(field => switchReason(field)).map(field => `${label(field)}：${switchReason(field)}`).join("；")
  : switchReason("inbound"));
</script>
