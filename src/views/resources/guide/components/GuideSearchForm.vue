<template>
  <el-card
    class="page-search"
    shadow="never"
  >
    <el-form :inline="true">
      <el-form-item :label="$t('common.keywords')">
        <el-input
          v-model.trim="keywords"
          :placeholder="$t('guide.searchPlaceholder')"
          class="page-search__keywords"
          clearable
        />
      </el-form-item>
      <el-form-item :label="$t('guide.gender')">
        <el-select
          v-model="gender"
          clearable
        >
          <el-option
            :label="$t('guide.male')"
            value="male"
          />
          <el-option
            :label="$t('guide.female')"
            value="female"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('guide.employmentType')">
        <el-select
          v-model="employmentType"
          clearable
        >
          <el-option
            :label="$t('guide.fullTime')"
            value="full-time"
          />
          <el-option
            :label="$t('guide.partTime')"
            value="part-time"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('guide.languages')">
        <el-select
          v-model="language"
          clearable
        >
          <el-option
            v-for="option in languageOptions"
            :key="option"
            :label="option"
            :value="option"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="emit('reset')">
          {{ $t("common.reset") }}
        </el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { GuideEmploymentType, GuideGender } from "@/data/data";

const props = defineProps<{
  keywords: string;
  gender: GuideGender | "";
  employmentType: GuideEmploymentType | "";
  language: string;
}>();
const emit = defineEmits<{
  "update:keywords": [value: string];
  "update:gender": [value: GuideGender | ""];
  "update:employmentType": [value: GuideEmploymentType | ""];
  "update:language": [value: string];
  reset: [];
}>();

const languageOptions = ["中文", "英文", "日文", "韩文", "泰文"];
const keywords = computed({
  get: () => props.keywords,
  set: (value) => emit("update:keywords", value),
});
const gender = computed({
  get: () => props.gender,
  set: (value) => emit("update:gender", value),
});
const employmentType = computed({
  get: () => props.employmentType,
  set: (value) => emit("update:employmentType", value),
});
const language = computed({
  get: () => props.language,
  set: (value) => emit("update:language", value),
});
</script>
