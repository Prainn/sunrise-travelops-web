<template>
  <section>
    <div class="flex justify-between items-center mb-4">
      <span>跨城路线默认交通方式与费用状态，具体行程可人工修改。</span>
      <el-button v-if="editable" :disabled="config.cities.length < 2" @click="add"
        >新增路线</el-button
      >
    </div>
    <el-card v-for="(route, index) in config.routes" :key="route.id" shadow="never" class="mb-3">
      <div class="grid grid-cols-2 gap-x-5 max-[650px]:grid-cols-1">
        <el-form-item label="起点城市" required>
          <el-select v-model="route.fromCityId" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="终点城市" required>
          <el-select v-model="route.toCityId" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="路线中文名" required>
          <el-input v-model="route.nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item label="路线英文名" required>
          <el-input v-model="route.nameEn" maxlength="150" />
        </el-form-item>
        <el-form-item label="默认交通方式">
          <el-select v-model="route.mode">
            <el-option
              v-for="option in TRANSPORT_OPTIONS"
              :key="option.value"
              :value="option.value"
              :label="option.label"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="默认费用状态">
          <FeeStateSelect v-model="route.feeState" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="route.status" active-value="enabled" inactive-value="disabled" />
        </el-form-item>
      </div>
      <el-button v-if="editable" link type="danger" @click="config.routes.splice(index, 1)"
        >删除本配置路线</el-button
      >
    </el-card>
    <el-empty v-if="!config.routes.length" description="尚未维护跨城路线" />
  </section>
</template>
<script setup lang="ts">
import type { WebsiteConfig } from "@/types/website";
import { TRANSPORT_OPTIONS } from "@/views/website-inquiries/options";
import FeeStateSelect from "@/views/website-inquiries/components/FeeStateSelect.vue";
const props = defineProps<{ config: WebsiteConfig; editable: boolean }>();
function add() {
  props.config.routes.push({
    id: crypto.randomUUID(),
    status: "enabled",
    fromCityId: "",
    toCityId: "",
    mode: "private_vehicle",
    nameZh: "",
    nameEn: "",
    feeState: "INCLUDED",
  });
}
</script>
