<template>
  <section>
    <div class="flex justify-between items-center mb-3">
      <strong>交通段</strong>
      <div v-if="editable" class="flex gap-2">
        <el-select
          v-model="selectedId"
          filterable
          clearable
          placeholder="选择专属路线"
          class="w-[240px]!"
        >
          <el-option
            v-for="route in config.routes.filter((item) => item.status === 'enabled')"
            :key="route.id"
            :value="route.id"
            :label="route.nameZh"
          />
        </el-select>
        <el-button @click="addRoute">添加所选</el-button>
        <el-button @click="addManual">手填交通段</el-button>
      </div>
    </div>
    <el-card v-for="(leg, index) in day.legs" :key="leg.id" shadow="never" class="mb-3">
      <div class="grid grid-cols-3 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item label="出发城市">
          <el-select v-model="leg.fromCityId" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="抵达城市">
          <el-select v-model="leg.toCityId" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="交通方式">
          <el-select v-model="leg.mode">
            <el-option
              v-for="option in TRANSPORT_OPTIONS"
              :key="option.value"
              :value="option.value"
              :label="option.label"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="交通段中文说明">
          <el-input v-model="leg.nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item label="交通段英文说明">
          <el-input v-model="leg.nameEn" maxlength="150" />
        </el-form-item>
        <el-form-item label="费用状态">
          <FeeStateSelect v-model="leg.feeState" />
        </el-form-item>
      </div>
      <el-button v-if="editable" link type="danger" @click="day.legs.splice(index, 1)"
        >移除交通段</el-button
      >
    </el-card>
  </section>
</template>
<script setup lang="ts">
import { ref } from "vue";
import type { WebsiteConfig, WebsiteDay } from "@/types/website";
import { TRANSPORT_OPTIONS } from "../../options";
import FeeStateSelect from "../../components/FeeStateSelect.vue";
const props = defineProps<{ day: WebsiteDay; config: WebsiteConfig; editable: boolean }>();
const selectedId = ref("");
function addRoute() {
  const route = props.config.routes.find((item) => item.id === selectedId.value);
  if (!route) return;
  props.day.legs.push({
    id: crypto.randomUUID(),
    routeId: route.id,
    fromCityId: route.fromCityId,
    toCityId: route.toCityId,
    mode: route.mode,
    nameZh: route.nameZh,
    nameEn: route.nameEn,
    feeState: route.feeState,
  });
  selectedId.value = "";
}
function addManual() {
  props.day.legs.push({
    id: crypto.randomUUID(),
    routeId: null,
    fromCityId: props.day.departCityId,
    toCityId: props.day.endCityId,
    mode: "private_vehicle",
    nameZh: "",
    nameEn: "",
    feeState: "INCLUDED",
  });
}
</script>
