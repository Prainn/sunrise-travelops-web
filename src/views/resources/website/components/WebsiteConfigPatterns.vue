<template>
  <section>
    <div class="flex justify-between items-center mb-4">
      <span>Day Pattern 仅用于生成可编辑每日草案，景点顺序由这里明确维护。</span>
      <el-button v-if="editable" :disabled="!config.cities.length" @click="add"
        >新增 Day Pattern</el-button
      >
    </div>
    <el-card
      v-for="(pattern, index) in config.patterns"
      :key="pattern.id"
      shadow="never"
      class="mb-3"
    >
      <div class="grid grid-cols-2 gap-x-5 max-[650px]:grid-cols-1">
        <el-form-item label="所属城市" required>
          <el-select v-model="pattern.cityId" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="pattern.status" active-value="enabled" inactive-value="disabled" />
        </el-form-item>
        <el-form-item label="中文名称" required>
          <el-input v-model="pattern.nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item label="英文名称" required>
          <el-input v-model="pattern.nameEn" maxlength="150" />
        </el-form-item>
      </div>
      <el-form-item label="景点／组件">
        <el-select v-model="pattern.attractionIds" multiple filterable>
          <el-option
            v-for="item in config.attractions.filter((row) => row.cityId === pattern.cityId)"
            :key="item.id"
            :value="item.id"
            :label="item.nameZh"
          />
        </el-select>
      </el-form-item>
      <div
        v-for="(id, position) in pattern.attractionIds"
        :key="id"
        class="flex items-center gap-3 mb-2"
      >
        <span
          >{{ position + 1 }}.
          {{ config.attractions.find((item) => item.id === id)?.nameZh ?? id }}</span
        >
        <el-button
          v-if="editable"
          :disabled="position === 0"
          link
          @click="move(pattern, position, -1)"
          >上移</el-button
        >
        <el-button
          v-if="editable"
          :disabled="position === pattern.attractionIds.length - 1"
          link
          @click="move(pattern, position, 1)"
          >下移</el-button
        >
      </div>
      <el-button v-if="editable" link type="danger" @click="config.patterns.splice(index, 1)"
        >删除 Day Pattern</el-button
      >
    </el-card>
    <el-empty v-if="!config.patterns.length" description="尚未维护 Day Pattern" />
  </section>
</template>
<script setup lang="ts">
import type { WebsiteConfig, WebsitePattern } from "@/types/website";
const props = defineProps<{ config: WebsiteConfig; editable: boolean }>();
function add() {
  props.config.patterns.push({
    id: crypto.randomUUID(),
    status: "enabled",
    cityId: "",
    nameZh: "",
    nameEn: "",
    attractionIds: [],
  });
}
function move(pattern: WebsitePattern, index: number, direction: number) {
  const id = pattern.attractionIds.splice(index, 1)[0];
  if (id) pattern.attractionIds.splice(index + direction, 0, id);
}
</script>
