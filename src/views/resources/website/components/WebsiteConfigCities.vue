<template>
  <section class="grid [grid-template-rows:auto_minmax(0,_1fr)] h-full min-h-0">
    <div class="page-toolbar">
      <div class="page-toolbar__left">
        <el-button v-if="editable" type="primary" @click="openEditor()">新增城市</el-button>
        <span class="text-[var(--el-text-color-secondary)] text-[13px]">
          人工维护城市中英文名称，可关联共用基础城市。
        </span>
      </div>
    </div>
    <div class="page-table-wrapper">
      <el-table :data="config.cities" border height="100%" empty-text="尚未维护独立站城市">
        <el-table-column prop="nameZh" label="中文名称" min-width="160" />
        <el-table-column prop="nameEn" label="英文名称" min-width="180" />
        <el-table-column label="共用基础城市" min-width="160">
          <template #default="{ row }">{{ row.resourceId ? "已关联" : "未关联" }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">
              {{ row.status === "enabled" ? "启用" : "停用" }}
            </el-tag>
          </template>
        </el-table-column>
        <!-- @vue-generic {WebsiteCity} -->
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
      :title="isNew ? '新增城市' : editable ? '编辑城市' : '城市详情'"
      width="560px"
      destroy-on-close
      :show-close="!saving"
      :close-on-click-modal="!saving"
      :close-on-press-escape="!saving"
    >
      <el-form v-if="record" :model="record" :disabled="!editable || saving" label-width="auto">
        <el-form-item label="中文名称" required>
          <el-input v-model="record.nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item label="英文名称" required>
          <el-input v-model="record.nameEn" maxlength="150" />
        </el-form-item>
        <el-form-item label="关联共用基础城市">
          <WebsiteResourceSelect
            v-model="record.resourceId"
            kind="city"
            :selected-name="record.nameZh"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="record.status">
            <el-radio value="enabled">启用</el-radio>
            <el-radio value="disabled">停用</el-radio>
          </el-radio-group>
        </el-form-item>
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
import type { WebsiteCity, WebsiteConfig } from "@/types/website";
import { cloneWebsiteDraft } from "@/views/website-inquiries/options";
import WebsiteResourceSelect from "@/views/website-inquiries/components/WebsiteResourceSelect.vue";

const props = defineProps<{
  config: WebsiteConfig;
  editable: boolean;
  saving: boolean;
  saveConfig: (next: WebsiteConfig) => Promise<boolean>;
  deleteConfig: (next: WebsiteConfig) => Promise<boolean>;
}>();
const visible = ref(false);
const isNew = ref(false);
const record = ref<WebsiteCity>();

function openEditor(city?: WebsiteCity) {
  isNew.value = !city;
  record.value = city
    ? cloneWebsiteDraft(city)
    : {
        id: crypto.randomUUID(),
        status: "enabled",
        nameZh: "",
        nameEn: "",
        resourceId: null,
      };
  visible.value = true;
}

async function applyEdit() {
  if (!record.value || !props.editable || props.saving) return;
  const next = cloneWebsiteDraft(props.config);
  const result = cloneWebsiteDraft(record.value);
  const index = next.cities.findIndex((row) => row.id === result.id);
  if (index < 0) next.cities.push(result);
  else next.cities.splice(index, 1, result);
  if (await props.saveConfig(next)) visible.value = false;
}

async function deleteRecord(index: number) {
  if (!props.editable || props.saving) return;
  const next = cloneWebsiteDraft(props.config);
  next.cities.splice(index, 1);
  await props.deleteConfig(next);
}
</script>
