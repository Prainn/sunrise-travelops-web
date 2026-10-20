<template>
  <AppDialog
    :model-value="modelValue"
    size="md"
    :title="$t('itineraryWorkspace.resourceDialogTitle', { day: dayLabel, type: $t('planning.guideService') })"
    @close="close"
  >
    <el-form label-position="top" @submit.prevent>
      <el-form-item :label="$t('websiteItineraryUi.guideArranged')">
        <el-switch v-model="arranged" />
      </el-form-item>
      <div
        v-if="arranged"
        class="grid grid-cols-2 gap-x-4 p-4 rounded-[var(--custom-radius)] surface-muted max-[560px]:grid-cols-1"
      >
        <el-form-item class="mb-0!" :label="$t('websiteItineraryUi.guideLanguage')" required>
          <el-input
            v-model="language"
            :placeholder="$t('websiteItineraryUi.guideLanguagePlaceholder')"
            maxlength="100"
          />
        </el-form-item>
        <el-form-item class="mb-0!" :label="$t('websiteItineraryUi.guideScope')">
          <el-input
            v-model="scope"
            :placeholder="$t('websiteItineraryUi.guideScopePlaceholder')"
            maxlength="1000"
          />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="close">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" :disabled="!canSubmit" @click="submit">
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppDialog from "@/components/AppDialog/index.vue";
import type { WebsiteDay } from "@/types/website";

/**
 * 独立站当天导游：开关与语言、服务范围在弹窗内编辑，确认后写回当天；关闭开关确认即取消当天导游。
 * 导游语言为空表示当天不安排导游。
 */
const props = defineProps<{
  modelValue: boolean;
  dayLabel: string;
  day?: WebsiteDay;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [guide: Pick<WebsiteDay, "guideLanguage" | "guideScope">];
}>();
const arranged = ref(false);
const language = ref("");
const scope = ref("");
const canSubmit = computed(() => !arranged.value || Boolean(language.value.trim()));

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;
    const current = props.day?.guideLanguage ?? "";
    // 新安排导游时沿用原默认值，减少常见输入。
    arranged.value = true;
    language.value = current || "English";
    scope.value = current ? (props.day?.guideScope ?? "") : "Full day";
  },
  { immediate: true },
);
// 关闭后重新打开开关时恢复默认值，不保留空白输入。
watch(arranged, (value) => {
  if (value && !language.value.trim()) language.value = "English";
});

function close() {
  emit("update:modelValue", false);
}
function submit() {
  if (!canSubmit.value) return;
  emit(
    "submit",
    arranged.value
      ? { guideLanguage: language.value.trim(), guideScope: scope.value.trim() }
      : { guideLanguage: "", guideScope: "" },
  );
  close();
}
</script>
