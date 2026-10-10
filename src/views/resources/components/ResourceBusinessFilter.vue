<template>
  <el-form-item :label="$t('identity.businessUnit')">
    <el-select v-model="businessUnit" :empty-values="[null, undefined]" class="!w-[180px]">
      <el-option v-if="isHeadquarters" value="" :label="$t('identity.allBusinesses')" />
      <el-option
        v-for="unit in businessUnits"
        :key="unit"
        :value="unit"
        :label="businessUnitName(unit)"
      />
    </el-select>
  </el-form-item>
</template>
<script setup lang="ts">
import { businessUnitName } from "@/constants/identity";
import { computed } from "vue";
import { useUserStore } from "@/stores/user";
import type { LoginScope } from "@/types/auth";
import { selectedResourceBusinessUnit, selectedResourceLibrary } from "@/services/resource-library";
const userStore = useUserStore();
const isHeadquarters = computed(() => userStore.userInfo.scope === "headquarters");
const businessUnits = computed<Exclude<LoginScope, "headquarters">[]>(() => {
  const scope = userStore.userInfo.scope;
  if (scope === "headquarters") return ["shengxu", "linxi", "website"];
  return scope ? [scope] : [];
});
const businessUnit = computed({
  get: () => isHeadquarters.value
    ? selectedResourceBusinessUnit.value ?? ""
    : userStore.userInfo.scope ?? "",
  set: (value: "" | "shengxu" | "linxi" | "website") => {
    if (!isHeadquarters.value) return;
    selectedResourceBusinessUnit.value = value || undefined;
    if (!value) selectedResourceLibrary.value = undefined;
    else selectedResourceLibrary.value = value === "shengxu" ? "shengxu" : "shared";
  },
});
</script>
