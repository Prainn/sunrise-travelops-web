<template>
  <section>
    <div class="flex justify-between items-center mb-4">
      <span>景点／组件、父子关系与季节推荐</span>
      <el-button v-if="editable" :disabled="!config.cities.length" @click="add"
        >新增景点／组件</el-button
      >
    </div>
    <el-card v-for="(item, index) in config.attractions" :key="item.id" shadow="never" class="mb-3">
      <div class="grid grid-cols-2 gap-x-5 max-[650px]:grid-cols-1">
        <el-form-item label="所属城市" required>
          <el-select v-model="item.cityId" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="item.kind">
            <el-option value="attraction" label="景点" />
            <el-option value="component" label="景点内组件" />
          </el-select>
        </el-form-item>
        <el-form-item label="中文名称" required>
          <el-input v-model="item.nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item label="英文名称" required>
          <el-input v-model="item.nameEn" maxlength="150" />
        </el-form-item>
        <el-form-item label="父景点（可空）">
          <el-select
            v-model="item.parentId"
            filterable
            clearable
            :value-on-clear="null"
            :empty-values="[null, undefined]"
          >
            <el-option
              v-for="parent in config.attractions.filter(
                (row) => row.id !== item.id && row.cityId === item.cityId,
              )"
              :key="parent.id"
              :value="parent.id"
              :label="parent.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="核心文案编码" required>
          <el-select v-model="item.copyKey" filterable>
            <el-option
              v-for="template in config.templates"
              :key="template.id"
              :value="template.code"
              :label="template.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关联共用基础景点（可空）">
          <WebsiteResourceSelect
            v-model="item.resourceId"
            kind="attraction"
            :selected-name="item.nameZh"
          />
        </el-form-item>
        <el-form-item label="推荐月份（空表示不限定）">
          <el-select v-model="item.recommendedMonths" multiple>
            <el-option v-for="month in 12" :key="month" :value="month" :label="`${month} 月`" />
          </el-select>
        </el-form-item>
        <el-form-item label="收费景点">
          <el-switch v-model="item.chargeable" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="item.status" active-value="enabled" inactive-value="disabled" />
        </el-form-item>
      </div>
      <el-button v-if="editable" link type="danger" @click="config.attractions.splice(index, 1)"
        >删除本配置景点／组件</el-button
      >
    </el-card>
    <el-empty
      v-if="!config.attractions.length"
      description="先维护城市和双语核心文案，再添加景点与组件"
    />
  </section>
</template>
<script setup lang="ts">
import type { WebsiteConfig } from "@/types/website";
import WebsiteResourceSelect from "@/views/website-inquiries/components/WebsiteResourceSelect.vue";
const props = defineProps<{ config: WebsiteConfig; editable: boolean }>();
function add() {
  props.config.attractions.push({
    id: crypto.randomUUID(),
    status: "enabled",
    cityId: "",
    parentId: null,
    nameZh: "",
    nameEn: "",
    resourceId: null,
    kind: "attraction",
    chargeable: true,
    copyKey: "",
    recommendedMonths: [],
  });
}
</script>
