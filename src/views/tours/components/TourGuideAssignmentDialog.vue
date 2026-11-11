<template>
  <AppDialog
    v-model="visible"
    :title="$t('tour.assignGuide')"
    size="lg"
    :busy="saving"
    destroy-on-close
  >
    <div class="flex flex-col gap-4">
      <div class="surface-muted flex flex-wrap items-center gap-x-8 gap-y-1 px-4 py-3 text-[13px]">
        <span>
          <span class="text-muted">{{ $t("tour.tourNo") }}</span>
          <span class="ml-2 font-medium text-strong">{{ tour.tourNo }}</span>
        </span>
        <span v-if="teamWindow">
          <span class="text-muted">{{ $t("tour.guideService.teamWindow") }}</span>
          <span class="ml-2 text-strong">{{ teamWindow.from }} ~ {{ teamWindow.to }}</span>
        </span>
      </div>
      <el-form :disabled="saving" label-position="top">
        <GuideServicesEditor
          v-if="visible"
          ref="editorRef"
          v-model="rows"
          :business-unit="tour.businessUnit"
          :exclude-tour-id="tour.id"
          :team-window="teamWindow"
          :disabled="saving"
          :server-errors="serverErrors"
          :show-incomplete="showIncomplete"
        />
      </el-form>
    </div>
    <template #footer>
      <el-button :disabled="saving" @click="visible = false">
        {{ $t('common.cancel') }}
      </el-button>
      <el-button type="primary" :loading="saving" @click="save">
        {{ $t('common.save') }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import { isApiError } from "@/api/request";
import AppDialog from "@/components/AppDialog/index.vue";
import { tourService } from "@/services/tour.service";
import type { TourRecord } from "@/types/tour";
import {
  guideAssignmentRequest,
  guideServiceErrors,
  guideServiceRowFromRecord,
  guideServiceServerErrors,
  type GuideServiceRow,
  type GuideServiceServerError,
} from "../tour-form";
import GuideServicesEditor from "./GuideServicesEditor.vue";

const props = defineProps<{ modelValue: boolean; tour: TourRecord }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean]; saved: [] }>();
const { t } = useI18n();
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
const rows = ref<GuideServiceRow[]>([]);
const saving = ref(false);
const editorRef = ref<InstanceType<typeof GuideServicesEditor>>();
const serverErrors = ref<Record<string, GuideServiceServerError>>({});
const showIncomplete = ref(false);
const teamWindow = computed(() =>
  props.tour.pickupAt && props.tour.dropAt ? { from: props.tour.pickupAt, to: props.tour.dropAt } : null,
);

watch(visible, (opened) => {
  if (!opened) return;
  rows.value = props.tour.guideServices.map(guideServiceRowFromRecord);
  serverErrors.value = {};
  showIncomplete.value = false;
}, { immediate: true });

async function save() {
  if (saving.value || props.tour.status !== "active") return;
  serverErrors.value = {};
  if (guideServiceErrors(rows.value).some(Boolean)) {
    showIncomplete.value = true;
    ElMessage.warning(t("tour.guideService.fixBeforeSave"));
    return;
  }
  if (editorRef.value?.hasUnavailable()) {
    ElMessage.warning(t("tour.guideUnavailable"));
    return;
  }
  saving.value = true;
  try {
    await tourService.update(props.tour.id, guideAssignmentRequest(props.tour, rows.value));
    ElMessage.success(t("common.updateSuccess"));
    visible.value = false;
    emit("saved");
  } catch (error) {
    if (isApiError(error))
      serverErrors.value = guideServiceServerErrors(rows.value, error.message, error.details);
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    saving.value = false;
  }
}
</script>
