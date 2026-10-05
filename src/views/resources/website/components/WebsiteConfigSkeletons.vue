<template>
  <section>
    <div class="flex justify-between items-center mb-4">
      <span>城市骨架按天定义城市及可选 Day Pattern，不自动猜测城市分配。</span>
      <el-button v-if="editable" :disabled="!config.cities.length" @click="add"
        >新增城市骨架</el-button
      >
    </div>
    <el-card
      v-for="(skeleton, index) in config.skeletons"
      :key="skeleton.id"
      shadow="never"
      class="mb-3"
    >
      <div class="grid grid-cols-2 gap-x-5 max-[650px]:grid-cols-1">
        <el-form-item label="中文名称" required>
          <el-input v-model="skeleton.nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item label="英文名称" required>
          <el-input v-model="skeleton.nameEn" maxlength="150" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="skeleton.status" active-value="enabled" inactive-value="disabled" />
        </el-form-item>
      </div>
      <div
        v-for="(day, position) in skeleton.days"
        :key="position"
        class="grid [grid-template-columns:60px_1fr_1fr_auto] gap-3 items-center mb-3 max-[650px]:grid-cols-1"
      >
        <strong>D{{ position + 1 }}</strong>
        <el-form-item label="城市" required class="mb-0!">
          <el-select v-model="day.cityId" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Day Pattern（可空）" class="mb-0!">
          <el-select
            v-model="day.patternId"
            filterable
            clearable
            :value-on-clear="null"
            :empty-values="[null, undefined]"
          >
            <el-option
              v-for="pattern in config.patterns.filter((item) => item.cityId === day.cityId)"
              :key="pattern.id"
              :value="pattern.id"
              :label="pattern.nameZh"
            />
          </el-select>
        </el-form-item>
        <div v-if="editable">
          <el-button :disabled="position === 0" link @click="move(skeleton, position, -1)"
            >上移</el-button
          >
          <el-button
            :disabled="position === skeleton.days.length - 1"
            link
            @click="move(skeleton, position, 1)"
            >下移</el-button
          >
          <el-button link type="danger" @click="skeleton.days.splice(position, 1)">移除</el-button>
        </div>
      </div>
      <div v-if="editable" class="mt-4">
        <el-button @click="skeleton.days.push({ cityId: '', patternId: null })">添加一天</el-button>
        <el-button link type="danger" @click="config.skeletons.splice(index, 1)"
          >删除城市骨架</el-button
        >
      </div>
    </el-card>
    <el-empty
      v-if="!config.skeletons.length"
      description="尚未维护城市骨架；仍可手工逐日编排行程"
    />
  </section>
</template>
<script setup lang="ts">
import type { WebsiteConfig, WebsiteSkeleton } from "@/types/website";
const props = defineProps<{ config: WebsiteConfig; editable: boolean }>();
function add() {
  props.config.skeletons.push({
    id: crypto.randomUUID(),
    status: "enabled",
    nameZh: "",
    nameEn: "",
    days: [],
  });
}
function move(skeleton: WebsiteSkeleton, index: number, direction: number) {
  const day = skeleton.days.splice(index, 1)[0];
  if (day) skeleton.days.splice(index + direction, 0, day);
}
</script>
