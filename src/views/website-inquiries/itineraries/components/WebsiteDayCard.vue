<template>
  <el-card shadow="never" class="mb-4">
    <template #header>
      <div class="flex justify-between items-center">
        <strong>
          D{{ day.dayNumber }}
          <span v-if="date" class="ml-3">{{ date }}</span>
        </strong>
        <div v-if="editable">
          <el-button :disabled="index === 0" link @click="emit('move', -1)">
            {{ $t("websiteItineraryUi.moveUp") }}
          </el-button>
          <el-button :disabled="last" link @click="emit('move', 1)">
            {{ $t("websiteItineraryUi.moveDown") }}
          </el-button>
          <el-button link type="danger" @click="emit('remove')">
            {{ $t("websiteItineraryUi.removeDay") }}
          </el-button>
        </div>
      </div>
    </template>
    <el-form label-position="top" :disabled="!editable">
      <div class="grid grid-cols-3 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('websiteItineraryUi.departureCity')" required>
          <el-select v-model="day.departCityId" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.endCity')" required>
          <el-select v-model="day.endCityId" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="city.nameZh"
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
              :label="city.nameZh"
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
import { computed } from "vue";
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
const date = computed(() =>
  props.startDate ? addDays(props.startDate, props.day.dayNumber - 1) : "",
);
function toggleGuide(selected: string | number | boolean) {
  props.day.guideLanguage = selected ? "English" : "";
  props.day.guideScope = selected ? "Full day" : "";
}
</script>
