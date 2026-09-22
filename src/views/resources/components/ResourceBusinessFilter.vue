<template>
  <el-form-item
    v-if="userStore.userInfo.scope === 'headquarters'"
    :label="$t('identity.businessUnit')"
  >
    <el-select v-model="businessUnit" :empty-values="[null, undefined]" class="!w-[180px]">
      <el-option value="" :label="$t('identity.allBusinesses')" />
      <el-option
        v-for="unit in ['shengxu', 'linxi', 'website']"
        :key="unit"
        :value="unit"
        :label="$t(`identity.scopes.${unit}`)"
      />
    </el-select>
  </el-form-item>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { useUserStore } from "@/stores/user";
import { selectedResourceBusinessUnit, selectedResourceLibrary } from "@/services/resource-library";
const userStore = useUserStore();
const businessUnit = computed({
  get: () => selectedResourceBusinessUnit.value ?? "",
  set: (value: "" | "shengxu" | "linxi" | "website") => {
    selectedResourceBusinessUnit.value = value || undefined;
    if (!value) selectedResourceLibrary.value = undefined;
    else selectedResourceLibrary.value = value === "shengxu" ? "shengxu" : "shared";
  },
});
</script>
