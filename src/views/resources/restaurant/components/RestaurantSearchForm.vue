<template>
  <FilterBar @reset="emit('reset')">
    <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
      <el-input
        v-model.trim="keywords"
        :placeholder="$t('restaurant.searchPlaceholder')"
        clearable
      />
    </el-form-item>
    <el-form-item :label="$t('resource.city')">
      <el-select
        v-model="city"
        autocomplete="new-password"
        clearable
        filterable
      >
        <el-option
          v-for="option in cityOptions"
          :key="option"
          :label="option"
          :value="option"
        />
      </el-select>
    </el-form-item>
    <el-form-item :label="$t('restaurant.priceUnit')">
      <el-select v-model="priceUnit" autocomplete="new-password" clearable>
        <el-option
          v-for="option in unitOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </el-form-item>
    <el-form-item :label="$t('resource.isStandardPrice')">
      <el-select v-model="isStandardPrice" autocomplete="new-password" :placeholder="$t('common.all')">
        <el-option :label="$t('common.all')" value="" />
        <el-option :label="$t('common.yes')" :value="true" />
        <el-option :label="$t('common.no')" :value="false" />
      </el-select>
    </el-form-item>
  </FilterBar>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import FilterBar from "@/components/FilterBar/index.vue";
import type { RestaurantPriceUnit } from "@/types/resource";
import { getResourceUnitOptions } from "@/utils/resource-unit";

const props = defineProps<{
  keywords: string;
  city: string;
  priceUnit: RestaurantPriceUnit | "";
  isStandardPrice: boolean | "";
  cityOptions: string[];
}>();
const emit = defineEmits<{
  "update:keywords": [value: string];
  "update:city": [value: string];
  "update:priceUnit": [value: RestaurantPriceUnit | ""];
  "update:isStandardPrice": [value: boolean | ""];
  reset: [];
}>();
const { locale } = useI18n();
const unitOptions = computed(() => getResourceUnitOptions("restaurant", locale.value));

const keywords = computed({
  get: () => props.keywords,
  set: (value) => emit("update:keywords", value),
});
const city = computed({
  get: () => props.city,
  set: (value) => emit("update:city", value),
});
const priceUnit = computed({
  get: () => props.priceUnit,
  set: (value) => emit("update:priceUnit", value),
});
const isStandardPrice = computed({
  get: () => props.isStandardPrice,
  set: (value) => emit("update:isStandardPrice", value),
});
</script>
