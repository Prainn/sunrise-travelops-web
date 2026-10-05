<template>
  <section>
    <el-alert
      title="双语模板请人工填写并保持包含项含义一致。只支持 {city}、{attraction}、{language}、{service_scope}、{hotel}、{service}、{restaurant_or_meal}、{component} 变量。"
      type="info"
      :closable="false"
      class="mb-4"
    />
    <p class="text-sm [color:var(--el-text-color-secondary)]">
      请选择服务模板用途，或为景点核心文案输入唯一编码；景点需明确选择对应的核心文案。
    </p>
    <el-button v-if="editable" class="mb-4" @click="add">新增双语模板</el-button>
    <el-card
      v-for="(template, index) in config.templates"
      :key="template.id"
      shadow="never"
      class="mb-3"
    >
      <div class="grid grid-cols-2 gap-x-5 max-[650px]:grid-cols-1">
        <el-form-item label="唯一编码" required>
          <el-select
            v-model="template.code"
            filterable
            allow-create
            default-first-option
            placeholder="选择服务用途或输入景点文案编码"
          >
            <el-option
              v-for="option in SYSTEM_TEMPLATES"
              :key="option.code"
              :value="option.code"
              :label="`${option.label}（${option.code}）`"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="template.status" active-value="enabled" inactive-value="disabled" />
        </el-form-item>
        <el-form-item label="中文文案" required>
          <el-input v-model="template.zh" type="textarea" :rows="5" maxlength="20000" />
        </el-form-item>
        <el-form-item label="英文文案" required>
          <el-input v-model="template.en" type="textarea" :rows="5" maxlength="20000" />
        </el-form-item>
      </div>
      <el-button v-if="editable" link type="danger" @click="config.templates.splice(index, 1)"
        >删除双语模板</el-button
      >
    </el-card>
    <el-empty
      v-if="!config.templates.length"
      description="请先填写并启用双语模板，再选用景点和生成正式报价。"
    />
  </section>
</template>
<script setup lang="ts">
import type { WebsiteConfig } from "@/types/website";
const props = defineProps<{ config: WebsiteConfig; editable: boolean }>();
const SYSTEM_TEMPLATES = [
  { code: "arrival-basic", label: "抵达安排" },
  { code: "departure-basic", label: "离开安排" },
  { code: "overnight", label: "住宿城市" },
  { code: "guide", label: "导游服务" },
  { code: "private-driver", label: "专车与司机" },
  { code: "hsr-second-class", label: "高铁二等座" },
  { code: "hotel-breakfast", label: "酒店与早餐" },
  { code: "first-entry-ticket", label: "景点首次入园门票" },
  { code: "included-service", label: "包含的服务" },
  { code: "restaurant-recommendation", label: "餐厅／餐食推荐" },
  { code: "optional-not-included", label: "可选项目不包含" },
  { code: "hotel-substitution", label: "客满时同等级替代" },
  { code: "peak-season", label: "旺季与节假日重新确认" },
  { code: "no-shopping", label: "全程无购物" },
];
function add() {
  props.config.templates.push({
    id: crypto.randomUUID(),
    status: "enabled",
    code: "",
    zh: "",
    en: "",
  });
}
</script>
