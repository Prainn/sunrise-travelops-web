<template>
  <section>
    <div class="flex justify-between items-center mb-4">
      <p class="m-0">人工维护城市中英文名称，可关联明确共用的基础城市。</p>
      <el-button v-if="editable" @click="add">新增城市</el-button>
    </div>
    <el-card v-for="(city, index) in config.cities" :key="city.id" shadow="never" class="mb-3">
      <div class="grid grid-cols-2 gap-x-5 max-[650px]:grid-cols-1">
        <el-form-item label="中文名称" required>
          <el-input v-model="city.nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item label="英文名称" required>
          <el-input v-model="city.nameEn" maxlength="150" />
        </el-form-item>
        <el-form-item label="关联共用基础城市（可空）">
          <WebsiteResourceSelect
            v-model="city.resourceId"
            kind="city"
            :selected-name="city.nameZh"
          />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="city.status" active-value="enabled" inactive-value="disabled" />
        </el-form-item>
      </div>
      <el-button v-if="editable" link type="danger" @click="config.cities.splice(index, 1)"
        >删除本配置城市</el-button
      >
    </el-card>
    <el-empty v-if="!config.cities.length" description="尚未维护独立站城市" />
  </section>
</template>
<script setup lang="ts">
import type { WebsiteConfig } from "@/types/website";
import WebsiteResourceSelect from "@/views/website-inquiries/components/WebsiteResourceSelect.vue";
const props = defineProps<{ config: WebsiteConfig; editable: boolean }>();
function add() {
  props.config.cities.push({
    id: crypto.randomUUID(),
    status: "enabled",
    nameZh: "",
    nameEn: "",
    resourceId: null,
  });
}
</script>
