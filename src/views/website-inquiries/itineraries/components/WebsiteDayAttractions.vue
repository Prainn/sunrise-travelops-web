<template>
  <section>
    <div class="flex justify-between items-center mb-3">
      <strong>景点与组件</strong>
      <div v-if="editable" class="flex gap-2">
        <el-select
          v-model="selectedId"
          filterable
          clearable
          placeholder="选择专属景点／组件"
          class="w-[240px]!"
        >
          <el-option
            v-for="attraction in config.attractions.filter((item) => item.status === 'enabled')"
            :key="attraction.id"
            :value="attraction.id"
            :label="attraction.nameZh"
          />
        </el-select>
        <el-button @click="addSelected">添加所选</el-button>
        <el-button @click="addManual">手填景点</el-button>
      </div>
    </div>
    <el-empty v-if="!day.items.length" description="尚未安排景点" :image-size="40" />
    <el-card v-for="(item, index) in day.items" :key="item.id" shadow="never" class="mb-3">
      <div class="flex gap-3 justify-between items-center mb-3">
        <span>{{ index + 1 }}. {{ item.nameZh || "手填景点／组件" }}</span>
        <div v-if="editable">
          <el-button :disabled="index === 0" link @click="move(index, -1)">上移</el-button>
          <el-button :disabled="index === day.items.length - 1" link @click="move(index, 1)"
            >下移</el-button
          >
          <el-button link type="danger" @click="day.items.splice(index, 1)">移除</el-button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item label="中文名称">
          <el-input v-model="item.nameZh" :disabled="Boolean(item.attractionId)" maxlength="150" />
        </el-form-item>
        <el-form-item label="英文名称">
          <el-input v-model="item.nameEn" :disabled="Boolean(item.attractionId)" maxlength="150" />
        </el-form-item>
        <el-form-item label="中文核心文案">
          <el-input
            v-model="item.descriptionZh"
            type="textarea"
            :rows="3"
            :disabled="Boolean(item.attractionId)"
            maxlength="20000"
          />
        </el-form-item>
        <el-form-item label="英文核心文案">
          <el-input
            v-model="item.descriptionEn"
            type="textarea"
            :rows="3"
            :disabled="Boolean(item.attractionId)"
            maxlength="20000"
          />
        </el-form-item>
        <el-form-item label="出现在行程中">
          <el-switch v-model="item.appears" />
        </el-form-item>
        <el-form-item label="费用状态">
          <FeeStateSelect v-model="item.feeState" />
        </el-form-item>
      </div>
      <el-button v-if="editable && item.attractionId" link @click="item.attractionId = null"
        >转为本行程手填文案</el-button
      >
    </el-card>
  </section>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";
import type { WebsiteConfig, WebsiteDay } from "@/types/website";
import FeeStateSelect from "../../components/FeeStateSelect.vue";
const props = defineProps<{ day: WebsiteDay; config: WebsiteConfig; editable: boolean }>();
const selectedId = ref("");
function addSelected() {
  const attraction = props.config.attractions.find((item) => item.id === selectedId.value);
  if (!attraction) return;
  const template = props.config.templates.find(
    (item) => item.code === attraction.copyKey && item.status === "enabled",
  );
  if (!template) {
    ElMessage.error("所选景点尚无启用的双语核心文案，请维护独立站资源配置");
    return;
  }
  props.day.items.push({
    id: crypto.randomUUID(),
    attractionId: attraction.id,
    nameZh: attraction.nameZh,
    nameEn: attraction.nameEn,
    descriptionZh: template.zh,
    descriptionEn: template.en,
    appears: true,
    feeState: attraction.kind === "attraction" && attraction.chargeable ? "INCLUDED" : "UNKNOWN",
  });
  selectedId.value = "";
}
function addManual() {
  props.day.items.push({
    id: crypto.randomUUID(),
    attractionId: null,
    nameZh: "",
    nameEn: "",
    descriptionZh: "",
    descriptionEn: "",
    appears: true,
    feeState: "UNKNOWN",
  });
}
function move(index: number, direction: number) {
  const item = props.day.items.splice(index, 1)[0];
  if (item) props.day.items.splice(index + direction, 0, item);
}
</script>
