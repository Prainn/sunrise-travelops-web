<template>
  <section class="grid [grid-template-rows:auto_minmax(0,_1fr)] h-full min-h-0">
    <div class="page-toolbar">
      <div class="page-toolbar__left">
        <el-button
          v-if="editable"
          type="primary"
          :disabled="config.cities.length < 2"
          @click="openEditor()"
          >新增路线</el-button
        >
        <span class="text-[var(--el-text-color-secondary)] text-[13px]"
          >默认交通方式与费用状态，具体行程可人工修改。</span
        >
      </div>
    </div>
    <div class="page-table-wrapper">
      <el-table :data="config.routes" border height="100%" empty-text="尚未维护跨城路线">
        <el-table-column prop="nameZh" label="路线中文名" min-width="160" />
        <el-table-column prop="nameEn" label="路线英文名" min-width="180" />
        <el-table-column label="起点城市" min-width="120">
          <template #default="{ row }">{{
            config.cities.find((city) => city.id === row.fromCityId)?.nameZh ?? row.fromCityId
          }}</template>
        </el-table-column>
        <el-table-column label="终点城市" min-width="120">
          <template #default="{ row }">{{
            config.cities.find((city) => city.id === row.toCityId)?.nameZh ?? row.toCityId
          }}</template>
        </el-table-column>
        <el-table-column label="默认交通方式" min-width="120">
          <template #default="{ row }">{{
            TRANSPORT_OPTIONS.find((option) => option.value === row.mode)?.label
          }}</template>
        </el-table-column>
        <el-table-column label="默认费用状态" min-width="160">
          <template #default="{ row }">{{
            FEE_OPTIONS.find((option) => option.value === row.feeState)?.label
          }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">{{
              row.status === "enabled" ? "启用" : "停用"
            }}</el-tag>
          </template>
        </el-table-column>
        <!-- @vue-generic {WebsiteRoute} -->
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
      :title="isNew ? '新增路线' : editable ? '编辑路线' : '跨城路线详情'"
      width="min(800px, 94vw)"
      destroy-on-close
      :show-close="!saving"
      :close-on-click-modal="!saving"
      :close-on-press-escape="!saving"
    >
      <el-form v-if="record" :model="record" :disabled="!editable || saving" label-width="auto">
        <div class="grid grid-cols-2 gap-x-[20px] max-[650px]:grid-cols-1">
          <el-form-item label="起点城市" required>
            <el-select v-model="record.fromCityId" filterable
              ><el-option
                v-for="city in config.cities"
                :key="city.id"
                :value="city.id"
                :label="city.nameZh"
            /></el-select>
          </el-form-item>
          <el-form-item label="终点城市" required>
            <el-select v-model="record.toCityId" filterable
              ><el-option
                v-for="city in config.cities"
                :key="city.id"
                :value="city.id"
                :label="city.nameZh"
            /></el-select>
          </el-form-item>
          <el-form-item label="路线中文名" required
            ><el-input v-model="record.nameZh" maxlength="150"
          /></el-form-item>
          <el-form-item label="路线英文名" required
            ><el-input v-model="record.nameEn" maxlength="150"
          /></el-form-item>
          <el-form-item label="默认交通方式">
            <el-select v-model="record.mode"
              ><el-option
                v-for="option in TRANSPORT_OPTIONS"
                :key="option.value"
                :value="option.value"
                :label="option.label"
            /></el-select>
          </el-form-item>
          <el-form-item label="默认费用状态"
            ><FeeStateSelect v-model="record.feeState"
          /></el-form-item>
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
import type { WebsiteConfig, WebsiteRoute } from "@/types/website";
import {
  cloneWebsiteDraft,
  FEE_OPTIONS,
  TRANSPORT_OPTIONS,
} from "@/views/website-inquiries/options";
import FeeStateSelect from "@/views/website-inquiries/components/FeeStateSelect.vue";

const props = defineProps<{
  config: WebsiteConfig;
  editable: boolean;
  saving: boolean;
  saveConfig: (next: WebsiteConfig) => Promise<boolean>;
  deleteConfig: (next: WebsiteConfig) => Promise<boolean>;
}>();
const visible = ref(false);
const isNew = ref(false);
const record = ref<WebsiteRoute>();

function openEditor(route?: WebsiteRoute) {
  isNew.value = !route;
  record.value = route
    ? cloneWebsiteDraft(route)
    : {
        id: crypto.randomUUID(),
        status: "enabled",
        fromCityId: "",
        toCityId: "",
        mode: "private_vehicle",
        nameZh: "",
        nameEn: "",
        feeState: "INCLUDED",
      };
  visible.value = true;
}

async function applyEdit() {
  if (!record.value || !props.editable || props.saving) return;
  const next = cloneWebsiteDraft(props.config);
  const result = cloneWebsiteDraft(record.value);
  const index = next.routes.findIndex((row) => row.id === result.id);
  if (index < 0) next.routes.push(result);
  else next.routes.splice(index, 1, result);
  if (await props.saveConfig(next)) visible.value = false;
}

async function deleteRecord(index: number) {
  if (!props.editable || props.saving) return;
  const next = cloneWebsiteDraft(props.config);
  next.routes.splice(index, 1);
  await props.deleteConfig(next);
}
</script>
