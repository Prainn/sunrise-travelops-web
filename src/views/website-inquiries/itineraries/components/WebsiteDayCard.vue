<template>
  <el-card
    shadow="never"
    class="website-day-card mb-4 rounded-[10px]"
    :class="{ 'is-collapsed': !expanded }"
  >
    <template #header>
      <div class="flex flex-wrap justify-between items-center gap-3">
        <div class="flex items-center gap-[12px] min-w-0">
          <span class="grid w-[44px] h-[44px] shrink-0 place-items-center rounded-[10px] [background:var(--el-color-primary)] text-white font-bold">
            D{{ day.dayNumber }}
          </span>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-[6px] text-[16px] font-semibold">
              {{ departureName || $t("websiteItineraryUi.departureCity") }}
              <el-icon><Right /></el-icon>
              {{ destinationName || $t("websiteItineraryUi.endCity") }}
            </div>
            <span v-if="date" class="text-sm text-[var(--el-text-color-secondary)]">{{ date }}</span>
          </div>
        </div>
        <div class="flex flex-wrap items-center">
          <template v-if="editable">
            <el-button :disabled="index === 0" link @click="emit('move', -1)">
              {{ $t("websiteItineraryUi.moveUp") }}
            </el-button>
            <el-button :disabled="last" link @click="emit('move', 1)">
              {{ $t("websiteItineraryUi.moveDown") }}
            </el-button>
            <el-button link type="danger" @click="emit('remove')">
              {{ $t("websiteItineraryUi.removeDay") }}
            </el-button>
          </template>
          <el-button
            link
            :aria-expanded="expanded"
            :aria-controls="`website-day-body-${day.id}`"
            @click="expanded = !expanded"
          >
            {{ $t(expanded ? "itinerary.collapseDay" : "itinerary.expandDay") }}
          </el-button>
        </div>
      </div>
    </template>
    <el-form
      v-show="expanded"
      :id="`website-day-body-${day.id}`"
      label-position="top"
      :disabled="!editable"
    >
      <div class="p-[16px] mb-[20px] rounded-[8px] [background:var(--el-fill-color-extra-light)] [border:1px_solid_var(--el-border-color-lighter)]">
        <div class="grid grid-cols-3 gap-x-4 max-[650px]:grid-cols-1">
          <el-form-item :label="$t('websiteItineraryUi.departureCity')" required>
            <el-select v-model="day.departCityId" filterable>
              <el-option
                v-for="city in config.cities"
                :key="city.id"
                :value="city.id"
                :label="locale === 'en' ? city.nameEn : city.nameZh"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('websiteItineraryUi.endCity')" required>
            <el-select v-model="day.endCityId" filterable>
              <el-option
                v-for="city in config.cities"
                :key="city.id"
                :value="city.id"
                :label="locale === 'en' ? city.nameEn : city.nameZh"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('websiteItineraryUi.overnightCity')">
            <el-select
              v-model="day.overnightCityId"
              filterable
              clearable
              :empty-values="[null, undefined]"
              :value-on-clear="null"
            >
              <el-option
                v-for="city in config.cities"
                :key="city.id"
                :value="city.id"
                :label="locale === 'en' ? city.nameEn : city.nameZh"
              />
            </el-select>
          </el-form-item>
        </div>
        <div class="grid grid-cols-3 gap-x-4 max-[650px]:grid-cols-1">
          <el-form-item :label="$t('websiteItineraryUi.guideArranged')">
            <el-switch :model-value="Boolean(day.guideLanguage)" @update:model-value="toggleGuide" />
          </el-form-item>
          <el-form-item v-if="day.guideLanguage" :label="$t('websiteItineraryUi.guideLanguage')">
            <el-input
              v-model="day.guideLanguage"
              :placeholder="$t('websiteItineraryUi.guideLanguagePlaceholder')"
              maxlength="100"
            />
          </el-form-item>
          <el-form-item v-if="day.guideLanguage" :label="$t('websiteItineraryUi.guideScope')">
            <el-input
              v-model="day.guideScope"
              :placeholder="$t('websiteItineraryUi.guideScopePlaceholder')"
              maxlength="1000"
            />
          </el-form-item>
        </div>
      </div>
      <el-collapse>
        <el-collapse-item :title="$t('websiteItineraryUi.attractions')" name="attractions">
          <WebsiteDayAttractions :day="day" :config="config" :editable="editable" />
        </el-collapse-item>
        <el-collapse-item :title="$t('websiteItineraryUi.transportLegs')" name="transport">
          <WebsiteDayTransport :day="day" :config="config" :editable="editable" />
        </el-collapse-item>
        <el-collapse-item :title="$t('websiteItineraryUi.hotelPlans')" name="hotels">
          <WebsiteDayHotels :day="day" :config="config" :editable="editable" />
        </el-collapse-item>
        <el-collapse-item :title="$t('websiteItineraryUi.mealsAndOtherServices')" name="services">
          <WebsiteDayMealsServices :day="day" :editable="editable" />
        </el-collapse-item>
      </el-collapse>
    </el-form>
  </el-card>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Right } from "@element-plus/icons-vue";
import type { WebsiteConfig, WebsiteDay } from "@/types/website";
import { addDays } from "@/utils/format";
import WebsiteDayAttractions from "./WebsiteDayAttractions.vue";
import WebsiteDayTransport from "./WebsiteDayTransport.vue";
import WebsiteDayHotels from "./WebsiteDayHotels.vue";
import WebsiteDayMealsServices from "./WebsiteDayMealsServices.vue";
const props = defineProps<{
  day: WebsiteDay;
  config: WebsiteConfig;
  editable: boolean;
  startDate: string | null;
  index: number;
  last: boolean;
}>();
const emit = defineEmits<{ move: [direction: number]; remove: [] }>();
const { locale } = useI18n();
const expanded = ref(true);
const departureName = computed(() => cityName(props.day.departCityId));
const destinationName = computed(() => cityName(props.day.endCityId));
const date = computed(() =>
  props.startDate ? addDays(props.startDate, props.day.dayNumber - 1) : "",
);
function cityName(id: string) {
  const city = props.config.cities.find((item) => item.id === id);
  return city ? (locale.value === "en" ? city.nameEn : city.nameZh) : "";
}
function toggleGuide(selected: string | number | boolean) {
  props.day.guideLanguage = selected ? "English" : "";
  props.day.guideScope = selected ? "Full day" : "";
}
</script>
<style scoped lang="scss">
.website-day-card.is-collapsed {
  :deep(.el-card__header) {
    border-bottom: 0;
  }

  :deep(.el-card__body) {
    display: none;
  }
}
</style>
