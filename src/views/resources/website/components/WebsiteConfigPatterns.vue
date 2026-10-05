<template>
  <section class="grid [grid-template-rows:auto_minmax(0,_1fr)] h-full min-h-0">
    <div class="page-toolbar">
      <div class="page-toolbar__left">
        <el-button
          v-if="editable"
          type="primary"
          :disabled="!config.cities.length"
          @click="openEditor()"
          >新增 Day Pattern</el-button
        >
        <span class="text-[var(--el-text-color-secondary)] text-[13px]"
          >生成每日草案，景点顺序由人工维护。</span
        >
      </div>
    </div>
    <div class="page-table-wrapper">
      <el-table :data="config.patterns" border height="100%" empty-text="尚未维护 Day Pattern">
        <el-table-column prop="nameZh" label="中文名称" min-width="160" />
        <el-table-column prop="nameEn" label="英文名称" min-width="180" />
        <el-table-column label="所属城市" min-width="120">
          <template #default="{ row }">{{
            config.cities.find((city) => city.id === row.cityId)?.nameZh ?? row.cityId
          }}</template>
        </el-table-column>
        <!-- @vue-generic {WebsitePattern} -->
        <el-table-column label="景点顺序" min-width="280" show-overflow-tooltip>
          <template #default="{ row }">{{ attractionNames(row) || "尚未选择景点" }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">{{
              row.status === "enabled" ? "启用" : "停用"
            }}</el-tag>
          </template>
        </el-table-column>
        <!-- @vue-generic {WebsitePattern} -->
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row, $index }">
            <el-button type="primary" link @click="openEditor(row)">{{
              editable ? "编辑" : "查看"
            }}</el-button>
            <el-button v-if="editable" type="danger" link @click="deleteRecord($index)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </div>
    <el-dialog
      v-model="visible"
      :title="isNew ? '新增 Day Pattern' : editable ? '编辑 Day Pattern' : 'Day Pattern 详情'"
      width="min(800px, 94vw)"
      destroy-on-close
      :show-close="!saving"
      :close-on-click-modal="!saving"
      :close-on-press-escape="!saving"
    >
      <el-form v-if="record" :model="record" :disabled="!editable || saving" label-width="auto">
        <div class="grid grid-cols-2 gap-x-[20px] max-[650px]:grid-cols-1">
          <el-form-item label="所属城市" required>
            <el-select v-model="record.cityId" filterable
              ><el-option
                v-for="city in config.cities"
                :key="city.id"
                :value="city.id"
                :label="city.nameZh"
            /></el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-radio-group v-model="record.status"
              ><el-radio value="enabled">启用</el-radio
              ><el-radio value="disabled">停用</el-radio></el-radio-group
            >
          </el-form-item>
          <el-form-item label="中文名称" required
            ><el-input v-model="record.nameZh" maxlength="150"
          /></el-form-item>
          <el-form-item label="英文名称" required
            ><el-input v-model="record.nameEn" maxlength="150"
          /></el-form-item>
        </div>
        <el-form-item label="景点／组件">
          <el-select v-model="record.attractionIds" multiple filterable>
            <el-option
              v-for="item in config.attractions.filter((row) => row.cityId === record?.cityId)"
              :key="item.id"
              :value="item.id"
              :label="item.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-table
          :data="record.attractionIds.map((id) => ({ id }))"
          border
          empty-text="尚未选择景点"
        >
          <el-table-column type="index" label="顺序" width="70" align="center" />
          <el-table-column label="景点／组件" min-width="180">
            <template #default="{ row }">{{
              config.attractions.find((item) => item.id === row.id)?.nameZh ?? row.id
            }}</template>
          </el-table-column>
          <el-table-column v-if="editable" label="调整顺序" width="150" align="center">
            <template #default="{ $index }">
              <el-button :disabled="$index === 0" type="primary" link @click="move($index, -1)"
                >上移</el-button
              >
              <el-button
                :disabled="$index === record.attractionIds.length - 1"
                type="primary"
                link
                @click="move($index, 1)"
                >下移</el-button
              >
            </template>
          </el-table-column>
        </el-table>
      </el-form>
      <template #footer>
        <el-button :disabled="saving" @click="visible = false">{{
          editable ? "取消" : "关闭"
        }}</el-button>
        <el-button v-if="editable" type="primary" :loading="saving" @click="applyEdit"
          >确认</el-button
        >
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { WebsiteConfig, WebsitePattern } from "@/types/website";
import { cloneWebsiteDraft } from "@/views/website-inquiries/options";

const props = defineProps<{
  config: WebsiteConfig;
  editable: boolean;
  saving: boolean;
  saveConfig: (next: WebsiteConfig) => Promise<boolean>;
  deleteConfig: (next: WebsiteConfig) => Promise<boolean>;
}>();
const visible = ref(false);
const isNew = ref(false);
const record = ref<WebsitePattern>();

function openEditor(pattern?: WebsitePattern) {
  isNew.value = !pattern;
  record.value = pattern
    ? cloneWebsiteDraft(pattern)
    : {
        id: crypto.randomUUID(),
        status: "enabled",
        cityId: "",
        nameZh: "",
        nameEn: "",
        attractionIds: [],
      };
  visible.value = true;
}

async function applyEdit() {
  if (!record.value || !props.editable || props.saving) return;
  const next = cloneWebsiteDraft(props.config);
  const result = cloneWebsiteDraft(record.value);
  const index = next.patterns.findIndex((row) => row.id === result.id);
  if (index < 0) next.patterns.push(result);
  else next.patterns.splice(index, 1, result);
  if (await props.saveConfig(next)) visible.value = false;
}

async function deleteRecord(index: number) {
  if (!props.editable || props.saving) return;
  const next = cloneWebsiteDraft(props.config);
  next.patterns.splice(index, 1);
  await props.deleteConfig(next);
}

function attractionNames(pattern: WebsitePattern) {
  return pattern.attractionIds
    .map((id) => props.config.attractions.find((item) => item.id === id)?.nameZh ?? id)
    .join(" → ");
}

function move(index: number, direction: number) {
  if (!record.value) return;
  const id = record.value.attractionIds.splice(index, 1)[0];
  if (id) record.value.attractionIds.splice(index + direction, 0, id);
}
</script>
