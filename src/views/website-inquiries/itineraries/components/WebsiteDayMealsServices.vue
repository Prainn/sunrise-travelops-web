<template>
  <section>
    <strong>餐食与服务</strong>
    <el-card v-for="meal in day.meals" :key="meal.id" shadow="never" class="mt-3">
      <div class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="`${MEAL_LABELS[meal.slot]}费用`">
          <FeeStateSelect v-model="meal.feeState" />
        </el-form-item>
        <el-form-item label="共用餐厅（可空）">
          <WebsiteResourceSelect
            v-model="meal.resourceId"
            kind="restaurant"
            :selected-name="meal.restaurantZh"
            @select="
              (resource) => {
                if (resource) meal.restaurantZh = resource.name;
              }
            "
          />
        </el-form-item>
        <el-form-item label="推荐餐厅／餐食中文名">
          <el-input v-model="meal.restaurantZh" maxlength="150" />
        </el-form-item>
        <el-form-item label="推荐餐厅／餐食英文名">
          <el-input v-model="meal.restaurantEn" maxlength="150" />
        </el-form-item>
      </div>
    </el-card>
    <div class="flex justify-between items-center mt-4 mb-2">
      <strong>其他服务</strong>
      <el-button v-if="editable" @click="addService">添加服务</el-button>
    </div>
    <el-card v-for="(service, index) in day.services" :key="service.id" shadow="never" class="mb-3">
      <div class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item label="服务中文名">
          <el-input v-model="service.nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item label="服务英文名">
          <el-input v-model="service.nameEn" maxlength="150" />
        </el-form-item>
        <el-form-item label="出现在行程中">
          <el-switch v-model="service.appears" />
        </el-form-item>
        <el-form-item label="费用状态">
          <FeeStateSelect v-model="service.feeState" />
        </el-form-item>
      </div>
      <el-button v-if="editable" link type="danger" @click="day.services.splice(index, 1)"
        >移除服务</el-button
      >
    </el-card>
  </section>
</template>
<script setup lang="ts">
import type { WebsiteDay } from "@/types/website";
import FeeStateSelect from "../../components/FeeStateSelect.vue";
import WebsiteResourceSelect from "../../components/WebsiteResourceSelect.vue";
const props = defineProps<{ day: WebsiteDay; editable: boolean }>();
const MEAL_LABELS = { breakfast: "当天早餐", lunch: "午餐", dinner: "晚餐" };
function addService() {
  props.day.services.push({
    id: crypto.randomUUID(),
    nameZh: "",
    nameEn: "",
    appears: true,
    feeState: "UNKNOWN",
  });
}
</script>
