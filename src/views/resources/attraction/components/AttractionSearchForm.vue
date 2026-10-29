<template>
  <FilterBar @reset="emit('reset')">
    <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
      <el-input
        v-model.trim="keywords"
        :placeholder="$t('attraction.searchPlaceholder')"
        clearable
      />
    </el-form-item>
    <el-form-item :label="$t('attraction.area')">
      <CitySelect v-model="area" />
    </el-form-item>
    <el-form-item :label="$t('attraction.category')">
      <el-select v-model="category" autocomplete="new-password" clearable>
        <el-option
          v-for="option in attractionCategoryOptions"
          :key="option.value"
          :label="$t(option.labelKey)"
          :value="option.value"
        />
      </el-select>
    </el-form-item>
    <el-form-item :label="$t('resource.isStandardPrice')">
      <el-select v-model="standardPriceSelection" autocomplete="new-password" :placeholder="$t('common.all')">
        <el-option :label="$t('common.all')" value="all" />
        <el-option :label="$t('common.yes')" value="yes" />
        <el-option :label="$t('common.no')" value="no" />
      </el-select>
    </el-form-item>
  </FilterBar>
</template>

<script setup lang="ts">
import { computed } from "vue";
import CitySelect from "@/components/CitySelect.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import type { AttractionCategory } from "@/types/resource";
import { attractionCategoryOptions } from "../options";

const props = defineProps<{
  keywords: string;
  area: string;
  category: AttractionCategory | "";
  isStandardPrice: boolean | "";
}>();

const emit = defineEmits<{
  "update:keywords": [value: string];
  "update:area": [value: string];
  "update:category": [value: AttractionCategory | ""];
  "update:isStandardPrice": [value: boolean | ""];
  reset: [];
}>();

const keywords = computed({
  get: () => props.keywords,
  set: (value) => emit("update:keywords", value),
});
const area = computed({
  get: () => props.area,
  set: (value) => emit("update:area", value),
});
const category = computed({
  get: () => props.category,
  set: (value) => emit("update:category", value),
});
const isStandardPrice = computed({
  get: () => props.isStandardPrice,
  set: (value) => emit("update:isStandardPrice", value),
});
const standardPriceSelection = computed({
  get: () => isStandardPrice.value === "" ? "all" : isStandardPrice.value ? "yes" : "no",
  set: (value: string) => { isStandardPrice.value = value === "all" ? "" : value === "yes"; },
});
</script>
