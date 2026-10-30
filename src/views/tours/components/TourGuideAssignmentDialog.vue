<template>
  <AppDialog
    v-model="visible"
    :title="$t('tour.assignGuide')"
    size="lg"
    :busy="saving"
    destroy-on-close
  >
    <el-form :disabled="saving" label-width="auto">
      <el-form-item :label="$t('tour.tourNo')">
        {{ tour.tourNo }}
      </el-form-item>
      <el-form-item :label="$t('tour.guideService.title')">
        <GuideServicesEditor
          v-if="visible"
          ref="editorRef"
          v-model="rows"
          :business-unit="tour.businessUnit"
          :exclude-tour-id="tour.id"
          :team-window="{ from: tour.pickupAt, to: tour.dropAt }"
          :disabled="saving"
          :server-errors="serverErrors"
          :show-incomplete="showIncomplete"
        />
      </el-form-item>
    </el-form>
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
  type GuideServiceRow,
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
const serverErrors = ref<Record<string, string>>({});
const showIncomplete = ref(false);

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
    if (isApiError(error)) {
      const index = error.details?.serviceIndex;
      const row = typeof index === "number" ? rows.value[index] : undefined;
      if (row) serverErrors.value = { [row.key]: error.message };
    }
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    saving.value = false;
  }
}
</script>
