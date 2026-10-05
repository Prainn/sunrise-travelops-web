<template>
  <el-card shadow="never" class="mb-4">
    <template #header>
      <div class="flex justify-between items-center">
        <strong
          >D{{ day.dayNumber }}<span v-if="date" class="ml-3">{{ date }}</span>
        </strong>
        <div v-if="editable">
          <el-button :disabled="index === 0" link @click="emit('move', -1)">上移</el-button>
          <el-button :disabled="last" link @click="emit('move', 1)">下移</el-button>
          <el-button link type="danger" @click="emit('remove')">移除本日</el-button>
        </div>
      </div>
    </template>
    <el-form label-position="top" :disabled="!editable">
      <div class="grid grid-cols-3 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item label="出发城市" required>
          <el-select v-model="day.departCityId" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="结束城市" required>
          <el-select v-model="day.endCityId" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="住宿城市">
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
        <el-form-item label="当天安排导游">
          <el-switch :model-value="Boolean(day.guideLanguage)" @update:model-value="toggleGuide" />
        </el-form-item>
        <el-form-item v-if="day.guideLanguage" label="导游语言">
          <el-input v-model="day.guideLanguage" placeholder="English" maxlength="100" />
        </el-form-item>
        <el-form-item v-if="day.guideLanguage" label="当天导游服务范围">
          <el-input v-model="day.guideScope" placeholder="例如 Full day" maxlength="1000" />
        </el-form-item>
      </div>
      <el-collapse>
        <el-collapse-item title="景点与组件" name="attractions">
          <WebsiteDayAttractions :day="day" :config="config" :editable="editable" />
        </el-collapse-item>
        <el-collapse-item title="交通段" name="transport">
          <WebsiteDayTransport :day="day" :config="config" :editable="editable" />
        </el-collapse-item>
        <el-collapse-item title="酒店方案" name="hotels">
          <WebsiteDayHotels :day="day" :config="config" :editable="editable" />
        </el-collapse-item>
        <el-collapse-item title="餐食与其他服务" name="services">
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
