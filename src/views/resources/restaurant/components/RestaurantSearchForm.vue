<template>
  <el-card
    class="page-search"
    shadow="never"
  >
    <el-form :inline="true">
      <el-form-item :label="$t('common.keywords')">
        <el-input
          v-model.trim="keywords"
          :placeholder="$t('restaurant.searchPlaceholder')"
          class="page-search__keywords"
          clearable
        />
      </el-form-item>
      <el-form-item :label="$t('resource.city')">
        <el-select
          v-model="city"
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
        <el-select
          v-model="priceUnit"
          clearable
        >
          <el-option
            :label="$t('restaurant.perPerson')"
            value="per-person"
          />
          <el-option
            :label="$t('restaurant.perTable')"
            value="per-table"
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
import type { RestaurantPriceUnit } from "@/data/data";

const props = defineProps<{
  keywords: string;
  city: string;
  priceUnit: RestaurantPriceUnit | "";
  cityOptions: string[];
}>();
const emit = defineEmits<{
  "update:keywords": [value: string];
  "update:city": [value: string];
  "update:priceUnit": [value: RestaurantPriceUnit | ""];
  reset: [];
}>();

const keywords = computed({ get: () => props.keywords, set: (value) => emit("update:keywords", value) });
const city = computed({ get: () => props.city, set: (value) => emit("update:city", value) });
const priceUnit = computed({ get: () => props.priceUnit, set: (value) => emit("update:priceUnit", value) });
</script>
