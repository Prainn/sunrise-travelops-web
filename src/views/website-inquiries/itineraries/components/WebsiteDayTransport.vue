<template>
  <section class="flex flex-col gap-3" :class="{ 'surface-muted p-4': !legId }">
    <div v-if="!legId" class="flex flex-wrap justify-between items-center gap-3">
      <h4 class="m-0 text-[14px] text-strong font-600">
        {{ $t("websiteItineraryUi.transportLegs") }}
      </h4>
      <el-button
        v-if="editable"
        link
        type="primary"
        @click="emit('add')"
      >
        {{ $t("itineraryWorkspace.actions.transport") }}
      </el-button>
    </div>
    <div
      v-for="leg in visibleLegs"
      :key="leg.id"
      class="p-3 rounded-[var(--custom-radius)] bg-surface border border-solid border-[var(--divider-color)]"
    >
      <div class="flex items-start gap-3">
        <div class="min-w-0 flex-1 flex flex-col gap-1 text-[13px] [overflow-wrap:anywhere]">
          <strong class="text-strong">{{ cityName(leg.fromCityId) }} → {{ cityName(leg.toCityId) }}</strong>
          <span class="text-muted">{{ $t(TRANSPORT_OPTIONS.find(option => option.value === leg.mode)!.labelKey) }} · {{ $t(`websiteInquiry.feeStates.${leg.feeState}`) }}</span>
          <span v-if="leg.nameZh || leg.nameEn">{{ (locale === 'en' ? leg.nameEn : leg.nameZh) || leg.nameZh || leg.nameEn }}</span>
        </div>
        <el-button
          v-if="editable"
          class="shrink-0 self-start"
          link
          type="primary"
          @click="openEdit(leg)"
        >
          {{ $t("common.edit") }}
        </el-button>
      </div>
    </div>
  </section>
  <AppDialog
    :model-value="Boolean(draft)"
    :title="$t('websiteItineraryUi.transportLegs')"
    size="lg"
    append-to-body
    @close="draft = null"
  >
    <el-form
      v-if="draft"
      label-position="top"
      :disabled="!editable"
      @submit.prevent
    >
      <div class="grid grid-cols-3 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('websiteItineraryUi.departureCity')">
          <el-select v-model="draft.fromCityId" autocomplete="new-password" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="locale === 'en' ? city.nameEn : city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.arrivalCity')">
          <el-select v-model="draft.toCityId" autocomplete="new-password" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="locale === 'en' ? city.nameEn : city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.transportMode')">
          <el-select v-model="draft.mode" autocomplete="new-password">
            <el-option
              v-for="option in TRANSPORT_OPTIONS"
              :key="option.value"
              :value="option.value"
              :label="$t(option.labelKey)"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.transportNameZh')">
          <el-input v-model="draft.nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.transportNameEn')">
          <el-input v-model="draft.nameEn" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.feeState')">
          <FeeStateSelect v-model="draft.feeState" />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="draft = null">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" :disabled="!editable" @click="saveEdit">
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </AppDialog>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import type { WebsiteConfig, WebsiteDay, WebsiteLeg } from "@/types/website";
import { TRANSPORT_OPTIONS } from "../../options";
import FeeStateSelect from "../../components/FeeStateSelect.vue";
const day = defineModel<WebsiteDay>("day", { required: true });
const props = defineProps<{ config: WebsiteConfig; editable: boolean; legId?: string }>();
const emit = defineEmits<{ add: [] }>();
const { locale } = useI18n();
const draft = ref<WebsiteLeg | null>(null);
const visibleLegs = computed(() => day.value.legs.filter(leg => !props.legId || leg.id === props.legId));
function cityName(id: string) {
  const city = props.config.cities.find(item => item.id === id);
  return city ? (locale.value === "en" ? city.nameEn : city.nameZh) : "-";
}
function openEdit(item: WebsiteLeg) {
  if (props.editable) draft.value = { ...item };
}
function saveEdit() {
  if (!props.editable || !draft.value) return;
  const id = draft.value.id;
  const original = day.value.legs.find(item => item.id === id);
  if (original) Object.assign(original, draft.value);
  draft.value = null;
}
defineExpose({ openEdit });
</script>
