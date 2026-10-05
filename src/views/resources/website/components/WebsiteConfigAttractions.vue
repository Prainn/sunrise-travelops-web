<template>
  <section class="grid [grid-template-rows:auto_minmax(0,_1fr)] h-full min-h-0">
    <div class="page-toolbar">
      <div class="page-toolbar__left">
        <el-button
          v-if="editable"
          type="primary"
          :disabled="!config.cities.length"
          @click="openEditor()"
          >新增景点／组件</el-button
        >
        <span class="text-[var(--el-text-color-secondary)] text-[13px]"
          >维护景点、父子关系与季节推荐。</span
        >
      </div>
    </div>
    <div class="page-table-wrapper">
      <el-table
        :data="config.attractions"
        border
        height="100%"
        empty-text="先维护城市和双语文案，再添加景点与组件"
      >
        <el-table-column prop="nameZh" label="中文名称" min-width="160" />
        <el-table-column prop="nameEn" label="英文名称" min-width="180" />
        <el-table-column label="城市" min-width="120">
          <template #default="{ row }">{{
            config.cities.find((city) => city.id === row.cityId)?.nameZh ?? row.cityId
          }}</template>
        </el-table-column>
        <el-table-column label="类型" width="110">
          <template #default="{ row }">{{
            row.kind === "attraction" ? "景点" : "景点内组件"
          }}</template>
        </el-table-column>
        <el-table-column prop="copyKey" label="核心文案编码" min-width="180" />
        <el-table-column label="推荐月份" min-width="160">
          <template #default="{ row }">{{
            row.recommendedMonths.length ? row.recommendedMonths.join("、") + " 月" : "不限定"
          }}</template>
        </el-table-column>
        <el-table-column label="收费" width="80" align="center">
          <template #default="{ row }">{{ row.chargeable ? "是" : "否" }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">{{
              row.status === "enabled" ? "启用" : "停用"
            }}</el-tag>
          </template>
        </el-table-column>
        <!-- @vue-generic {WebsiteAttraction} -->
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
      :title="isNew ? '新增景点／组件' : editable ? '编辑景点／组件' : '景点／组件详情'"
      width="min(800px, 94vw)"
      destroy-on-close
      :show-close="!saving"
      :close-on-click-modal="!saving"
      :close-on-press-escape="!saving"
    >
      <el-form v-if="record" :model="record" :disabled="!editable || saving" label-width="auto">
        <div class="grid grid-cols-2 gap-x-[20px] max-[650px]:grid-cols-1">
          <el-form-item label="所属城市" required>
            <el-select v-model="record.cityId" filterable>
              <el-option
                v-for="city in config.cities"
                :key="city.id"
                :value="city.id"
                :label="city.nameZh"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="record.kind">
              <el-option value="attraction" label="景点" />
              <el-option value="component" label="景点内组件" />
            </el-select>
          </el-form-item>
          <el-form-item label="中文名称" required
            ><el-input v-model="record.nameZh" maxlength="150"
          /></el-form-item>
          <el-form-item label="英文名称" required
            ><el-input v-model="record.nameEn" maxlength="150"
          /></el-form-item>
          <el-form-item label="父景点">
            <el-select
              v-model="record.parentId"
              filterable
              clearable
              :value-on-clear="null"
              :empty-values="[null, undefined]"
            >
              <el-option
                v-for="parent in config.attractions.filter(
                  (row) => row.id !== record?.id && row.cityId === record?.cityId,
                )"
                :key="parent.id"
                :value="parent.id"
                :label="parent.nameZh"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="核心文案编码" required>
            <el-select v-model="record.copyKey" filterable>
              <el-option
                v-for="template in config.templates"
                :key="template.id"
                :value="template.code"
                :label="template.code"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="关联共用基础景点">
            <WebsiteResourceSelect
              v-model="record.resourceId"
              kind="attraction"
              :selected-name="record.nameZh"
            />
          </el-form-item>
          <el-form-item label="推荐月份（空表示不限定）">
            <el-select v-model="record.recommendedMonths" multiple>
              <el-option v-for="month in 12" :key="month" :value="month" :label="`${month} 月`" />
            </el-select>
          </el-form-item>
          <el-form-item label="收费景点"><el-switch v-model="record.chargeable" /></el-form-item>
          <el-form-item label="状态">
            <el-radio-group v-model="record.status"
              ><el-radio value="enabled">启用</el-radio
              ><el-radio value="disabled">停用</el-radio></el-radio-group
            >
          </el-form-item>
        </div>
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
import type { WebsiteAttraction, WebsiteConfig } from "@/types/website";
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
const record = ref<WebsiteAttraction>();

function openEditor(item?: WebsiteAttraction) {
  isNew.value = !item;
  record.value = item
    ? cloneWebsiteDraft(item)
    : {
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
      };
  visible.value = true;
}

async function applyEdit() {
  if (!record.value || !props.editable || props.saving) return;
  const next = cloneWebsiteDraft(props.config);
  const result = cloneWebsiteDraft(record.value);
  const index = next.attractions.findIndex((row) => row.id === result.id);
  if (index < 0) next.attractions.push(result);
  else next.attractions.splice(index, 1, result);
  if (await props.saveConfig(next)) visible.value = false;
}

async function deleteRecord(index: number) {
  if (!props.editable || props.saving) return;
  const next = cloneWebsiteDraft(props.config);
  next.attractions.splice(index, 1);
  await props.deleteConfig(next);
}
</script>
