<template>
  <section class="flex flex-col gap-3" :class="{ 'surface-muted p-4': !mealId }">
    <h4 v-if="!mealId" class="m-0 text-[14px] text-strong font-600">
      {{ $t("websiteItineraryUi.mealsAndServices") }}
    </h4>
    <div
      v-for="meal in visibleMeals"
      :key="meal.id"
      class="flex items-start gap-3 p-3 rounded-[var(--custom-radius)] bg-surface border border-solid border-[var(--divider-color)] text-[13px]"
    >
      <div class="min-w-0 flex-1 flex flex-wrap items-center gap-2">
        <strong class="text-strong">{{ $t(`itinerary.meals.${meal.slot}`) }}</strong>
        <el-tag size="small" effect="plain">
          {{ $t(`websiteInquiry.feeStates.${meal.feeState}`) }}
        </el-tag>
        <span class="[overflow-wrap:anywhere]">
          {{ mealName(meal) || $t("websiteItineraryUi.noRestaurant") }}
        </span>
        <el-tag
          v-if="meal.resourceId"
          size="small"
          type="info"
          effect="plain"
        >
          {{ $t("websiteItineraryUi.hotelSources.public") }}
        </el-tag>
      </div>
      <el-button
        v-if="editable"
        class="shrink-0 self-start"
        link
        type="primary"
        @click="emit('edit-meal', meal.slot)"
      >
        {{ $t("common.edit") }}
      </el-button>
    </div>
    <div
      v-if="!mealId && day.services.length"
      :id="`website-day-services-${day.id}`"
      class="flex flex-wrap justify-between items-center gap-3 mt-1"
    >
      <h5 class="m-0 text-[13px] text-strong font-600">
        {{ $t("websiteItineraryUi.otherServices") }}
      </h5>
      <el-button v-if="editable" @click="emit('add-service')">
        {{ $t("common.create") }}
      </el-button>
    </div>
    <div
      v-for="service in mealId ? [] : day.services"
      :key="service.id"
      class="p-3 rounded-[var(--custom-radius)] bg-surface border border-solid border-[var(--divider-color)]"
    >
      <div class="flex items-start gap-3">
        <div class="min-w-0 flex-1 flex flex-wrap items-center gap-2 text-[13px] [overflow-wrap:anywhere]">
          <strong class="text-strong">{{ (locale === 'en' ? service.nameEn : service.nameZh) || service.nameZh || service.nameEn || $t('websiteItineraryUi.otherServices') }}</strong>
          <el-tag size="small" effect="plain">
            {{ $t(`websiteInquiry.feeStates.${service.feeState}`) }}
          </el-tag>
        </div>
        <el-button
          v-if="editable"
          class="shrink-0 self-start"
          link
          type="primary"
          @click="openEdit(service)"
        >
          {{ $t("common.edit") }}
        </el-button>
      </div>
    </div>
  </section>
  <AppDialog
    :model-value="Boolean(draft)"
    :title="$t('websiteItineraryUi.otherServices')"
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
      <div class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('websiteItineraryUi.serviceNameZh')">
          <el-input v-model="draft.nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.serviceNameEn')">
          <el-input v-model="draft.nameEn" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.appears')">
          <el-switch v-model="draft.appears" />
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
import type { WebsiteDay, WebsiteMeal, WebsiteService } from "@/types/website";
import FeeStateSelect from "../../components/FeeStateSelect.vue";
import { isMealArranged } from "../../options";
const day = defineModel<WebsiteDay>("day", { required: true });
const props = defineProps<{ editable: boolean; mealId?: string; servicesOnly?: boolean }>();
const emit = defineEmits<{ "edit-meal": [slot: WebsiteMeal["slot"]]; "add-service": [] }>();
const { locale } = useI18n();
const draft = ref<WebsiteService | null>(null);
const visibleMeals = computed(() => props.servicesOnly ? [] : day.value.meals
  .filter(meal => isMealArranged(meal) && (!props.mealId || meal.id === props.mealId)));
function mealName(meal: WebsiteMeal) {
  return (locale.value === "en" ? meal.restaurantEn : meal.restaurantZh) || meal.restaurantZh || meal.restaurantEn;
}
function openEdit(item: WebsiteService) {
  if (props.editable) draft.value = { ...item };
}
function saveEdit() {
  if (!props.editable || !draft.value) return;
  const id = draft.value.id;
  const original = day.value.services.find(item => item.id === id);
  if (original) Object.assign(original, draft.value);
  draft.value = null;
}
defineExpose({ openEdit });
</script>
