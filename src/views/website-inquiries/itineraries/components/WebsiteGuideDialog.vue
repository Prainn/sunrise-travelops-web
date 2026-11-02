<template>
  <AppDialog
    :model-value="modelValue"
    size="md"
    :title="$t('itineraryWorkspace.resourceDialogTitle', { day: dayLabel, type: $t('planning.guideService') })"
    @close="close"
  >
    <el-form :model="{ language }" label-position="top" @submit.prevent>
      <el-form-item>
        <span class="mr-3">{{ $t("websiteItineraryUi.guideArranged") }}</span>
        <el-switch v-model="arranged" />
      </el-form-item>
      <div
        v-if="arranged"
        class="grid grid-cols-1 gap-x-4 p-4 rounded-[var(--custom-radius)] surface-muted max-[560px]:grid-cols-1"
      >
        <el-form-item
          class="mb-0!"
          :label="$t('websiteItineraryUi.guideLanguage')"
          prop="language"
          :rules="[{ required: true, whitespace: true, message: $t('websiteItineraryUi.guideLanguageRequired'), trigger: 'change' }, { max: 100, message: $t('websiteItineraryUi.guideLanguageTooLong'), trigger: 'change' }]"
        >
          <RemoteSelect
            v-model="language"
            :load-options="loadLanguages"
            :query-key="locale"
            allow-create
            :placeholder="$t('websiteItineraryUi.guideLanguagePlaceholder')"
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
import RemoteSelect from "@/components/RemoteSelect/index.vue";
import { useI18n } from "vue-i18n";
import { websiteService } from "@/services/website.service";
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import AppDialog from "@/components/AppDialog/index.vue";
import type { WebsiteDay } from "@/types/website";

/**
 * 独立站当天导游：开关与语言在弹窗内编辑，确认后写回当天；关闭开关确认即取消当天导游。
 * 导游语言为空表示当天不安排导游。
 */
const props = defineProps<{
  modelValue: boolean;
  dayLabel: string;
  day?: WebsiteDay;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [guide: Pick<WebsiteDay, "guideLanguage">];
}>();
const { locale } = useI18n();
const arranged = ref(false);
const language = ref("");
const canSubmit = computed(() => !arranged.value || Boolean(language.value.trim()) && language.value.trim().length <= 100);

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;
    const current = props.day?.guideLanguage ?? "";
    arranged.value = Boolean(current.trim());
    language.value = current;
  },
  { immediate: true },
);
async function loadLanguages(query: RemoteOptionsQuery) {
  const result = await websiteService.guideLanguages(query);
  return { ...result, list: result.list.map(item => ({ id: item.id, label: locale.value.toLowerCase().startsWith("en") ? item.englishName : item.name })) };
}

function close() {
  emit("update:modelValue", false);
}
function submit() {
  if (!canSubmit.value) return;
  emit(
    "submit",
    arranged.value
      ? { guideLanguage: language.value.trim() }
      : { guideLanguage: "" },
  );
  close();
}
</script>
