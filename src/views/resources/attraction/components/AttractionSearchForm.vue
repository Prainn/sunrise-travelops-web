<template>
  <el-card
    class="page-search"
    shadow="never"
  >
    <el-form :inline="true">
      <el-form-item :label="$t('common.keywords')">
        <el-input
          v-model.trim="keywords"
          :placeholder="$t('attraction.searchPlaceholder')"
          class="page-search__keywords"
          clearable
        />
      </el-form-item>
      <el-form-item :label="$t('attraction.area')">
        <el-select
          v-model="area"
          clearable
          filterable
        >
          <el-option
            v-for="option in YUNNAN_TOURISM_AREA_OPTIONS"
            :key="option"
            :label="option"
            :value="option"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('attraction.category')">
        <el-select
          v-model="category"
          clearable
        >
          <el-option
            v-for="option in categoryOptions"
            :key="option.value"
            :label="$t(option.labelKey)"
            :value="option.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary">
          {{ $t("common.search") }}
        </el-button>
        <el-button @click="emit('reset')">
          {{ $t("common.reset") }}
        </el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { YUNNAN_TOURISM_AREA_OPTIONS } from "@/constants/yunnan-tourism-regions";
import type { AttractionCategory } from "@/data/data";

const props = defineProps<{
  keywords: string;
  area: string;
  category: AttractionCategory | "";
}>();

const emit = defineEmits<{
  "update:keywords": [value: string];
  "update:area": [value: string];
  "update:category": [value: AttractionCategory | ""];
  reset: [];
}>();

const keywords = computed({ get: () => props.keywords, set: (value) => emit("update:keywords", value) });
const area = computed({ get: () => props.area, set: (value) => emit("update:area", value) });
const category = computed({ get: () => props.category, set: (value) => emit("update:category", value) });
const categoryOptions: Array<{ value: AttractionCategory; labelKey: string }> = [
  { value: "scenic", labelKey: "attraction.categoryScenic" },
  { value: "performance", labelKey: "attraction.categoryPerformance" },
  { value: "experience", labelKey: "attraction.categoryExperience" },
  { value: "transport", labelKey: "attraction.categoryTransport" },
  { value: "package", labelKey: "attraction.categoryPackage" },
];
</script>
