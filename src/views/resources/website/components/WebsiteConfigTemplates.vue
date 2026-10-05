<template>
  <section class="grid [grid-template-rows:auto_minmax(0,_1fr)] h-full min-h-0">
    <div class="page-toolbar">
      <div class="page-toolbar__left">
        <el-button v-if="editable" type="primary" @click="openEditor()">新增双语模板</el-button>
        <span class="text-[var(--el-text-color-secondary)] text-[13px]"
          >人工维护服务模板与景点核心文案的中英文内容。</span
        >
      </div>
    </div>
    <div class="page-table-wrapper">
      <el-table
        :data="config.templates"
        border
        height="100%"
        empty-text="请先填写并启用双语模板，再选用景点和生成正式报价"
      >
        <el-table-column prop="code" label="唯一编码" min-width="190" />
        <el-table-column label="服务用途" min-width="160">
          <template #default="{ row }">{{
            SYSTEM_TEMPLATES.find((item) => item.code === row.code)?.label ?? "自定义景点文案"
          }}</template>
        </el-table-column>
        <el-table-column prop="zh" label="中文文案" min-width="250" show-overflow-tooltip />
        <el-table-column prop="en" label="英文文案" min-width="250" show-overflow-tooltip />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">{{
              row.status === "enabled" ? "启用" : "停用"
            }}</el-tag>
          </template>
        </el-table-column>
        <!-- @vue-generic {WebsiteTemplate} -->
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
      :title="isNew ? '新增双语模板' : editable ? '编辑双语模板' : '双语模板详情'"
      width="min(900px, 94vw)"
      destroy-on-close
      :show-close="!saving"
      :close-on-click-modal="!saving"
      :close-on-press-escape="!saving"
    >
      <el-form v-if="record" :model="record" :disabled="!editable || saving" label-width="auto">
        <el-form-item label="唯一编码" required>
          <el-select
            v-model="record.code"
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
        <el-form-item label="状态">
          <el-radio-group v-model="record.status"
            ><el-radio value="enabled">启用</el-radio
            ><el-radio value="disabled">停用</el-radio></el-radio-group
          >
        </el-form-item>
        <el-alert
          title="只支持 {city}、{attraction}、{language}、{service_scope}、{hotel}、{service}、{restaurant_or_meal}、{component} 变量。中英文包含项的含义需保持一致。"
          type="info"
          :closable="false"
          class="mb-[20px]"
        />
        <div class="grid grid-cols-2 gap-x-[20px] max-[650px]:grid-cols-1">
          <el-form-item label="中文文案" required
            ><el-input v-model="record.zh" type="textarea" :rows="8" maxlength="20000"
          /></el-form-item>
          <el-form-item label="英文文案" required
            ><el-input v-model="record.en" type="textarea" :rows="8" maxlength="20000"
          /></el-form-item>
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
import type { WebsiteConfig, WebsiteTemplate } from "@/types/website";
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
const record = ref<WebsiteTemplate>();
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

function openEditor(template?: WebsiteTemplate) {
  isNew.value = !template;
  record.value = template
    ? cloneWebsiteDraft(template)
    : {
        id: crypto.randomUUID(),
        status: "enabled",
        code: "",
        zh: "",
        en: "",
      };
  visible.value = true;
}

async function applyEdit() {
  if (!record.value || !props.editable || props.saving) return;
  const next = cloneWebsiteDraft(props.config);
  const result = cloneWebsiteDraft(record.value);
  const index = next.templates.findIndex((row) => row.id === result.id);
  if (index < 0) next.templates.push(result);
  else next.templates.splice(index, 1, result);
  if (await props.saveConfig(next)) visible.value = false;
}

async function deleteRecord(index: number) {
  if (!props.editable || props.saving) return;
  const next = cloneWebsiteDraft(props.config);
  next.templates.splice(index, 1);
  await props.deleteConfig(next);
}
</script>
