<template>
  <section class="grid [grid-template-rows:auto_minmax(0,_1fr)] h-full min-h-0">
    <div class="page-toolbar">
      <div class="page-toolbar__left">
        <el-button
          v-if="editable"
          type="primary"
          :disabled="!config.cities.length"
          @click="openEditor()"
          >新增城市骨架</el-button
        >
        <span class="text-[var(--el-text-color-secondary)] text-[13px]"
          >按天维护城市及可选 Day Pattern。</span
        >
      </div>
    </div>
    <div class="page-table-wrapper">
      <el-table
        :data="config.skeletons"
        border
        height="100%"
        empty-text="尚未维护城市骨架；仍可手工逐日编排行程"
      >
        <el-table-column prop="nameZh" label="中文名称" min-width="160" />
        <el-table-column prop="nameEn" label="英文名称" min-width="180" />
        <el-table-column label="天数" width="90" align="center">
          <template #default="{ row }">{{ row.days.length }}</template>
        </el-table-column>
        <!-- @vue-generic {WebsiteSkeleton} -->
        <el-table-column label="城市顺序" min-width="280" show-overflow-tooltip>
          <template #default="{ row }">{{ citySequence(row) || "尚未添加天数" }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">{{
              row.status === "enabled" ? "启用" : "停用"
            }}</el-tag>
          </template>
        </el-table-column>
        <!-- @vue-generic {WebsiteSkeleton} -->
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
      :title="isNew ? '新增城市骨架' : editable ? '编辑城市骨架' : '城市骨架详情'"
      width="min(960px, 94vw)"
      destroy-on-close
      :show-close="!saving"
      :close-on-click-modal="!saving"
      :close-on-press-escape="!saving"
    >
      <el-form v-if="record" :model="record" :disabled="!editable || saving" label-width="auto">
        <div class="grid grid-cols-2 gap-x-[20px] max-[650px]:grid-cols-1">
          <el-form-item label="中文名称" required
            ><el-input v-model="record.nameZh" maxlength="150"
          /></el-form-item>
          <el-form-item label="英文名称" required
            ><el-input v-model="record.nameEn" maxlength="150"
          /></el-form-item>
        </div>
        <el-form-item label="状态">
          <el-radio-group v-model="record.status"
            ><el-radio value="enabled">启用</el-radio
            ><el-radio value="disabled">停用</el-radio></el-radio-group
          >
        </el-form-item>
        <div class="page-toolbar">
          <el-button
            v-if="editable"
            type="primary"
            plain
            @click="record.days.push({ cityId: '', patternId: null })"
            >添加一天</el-button
          >
        </div>
        <el-table :data="record.days" border empty-text="请添加天数，按天维护城市与 Day Pattern">
          <el-table-column label="天数" width="70" align="center">
            <template #default="{ $index }">D{{ $index + 1 }}</template>
          </el-table-column>
          <el-table-column label="城市" min-width="160">
            <template #default="{ row }">
              <el-select v-model="row.cityId" filterable>
                <el-option
                  v-for="city in config.cities"
                  :key="city.id"
                  :value="city.id"
                  :label="city.nameZh"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="Day Pattern" min-width="200">
            <template #default="{ row }">
              <el-select
                v-model="row.patternId"
                filterable
                clearable
                :value-on-clear="null"
                :empty-values="[null, undefined]"
              >
                <el-option
                  v-for="pattern in config.patterns.filter((item) => item.cityId === row.cityId)"
                  :key="pattern.id"
                  :value="pattern.id"
                  :label="pattern.nameZh"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column v-if="editable" label="操作" width="210" align="center">
            <template #default="{ $index }">
              <el-button :disabled="$index === 0" type="primary" link @click="move($index, -1)"
                >上移</el-button
              >
              <el-button
                :disabled="$index === record.days.length - 1"
                type="primary"
                link
                @click="move($index, 1)"
                >下移</el-button
              >
              <el-button type="danger" link @click="record.days.splice($index, 1)">移除</el-button>
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
import type { WebsiteConfig, WebsiteSkeleton } from "@/types/website";
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
const record = ref<WebsiteSkeleton>();

function openEditor(skeleton?: WebsiteSkeleton) {
  isNew.value = !skeleton;
  record.value = skeleton
    ? cloneWebsiteDraft(skeleton)
    : {
        id: crypto.randomUUID(),
        status: "enabled",
        nameZh: "",
        nameEn: "",
        days: [],
      };
  visible.value = true;
}

async function applyEdit() {
  if (!record.value || !props.editable || props.saving) return;
  const next = cloneWebsiteDraft(props.config);
  const result = cloneWebsiteDraft(record.value);
  const index = next.skeletons.findIndex((row) => row.id === result.id);
  if (index < 0) next.skeletons.push(result);
  else next.skeletons.splice(index, 1, result);
  if (await props.saveConfig(next)) visible.value = false;
}

async function deleteRecord(index: number) {
  if (!props.editable || props.saving) return;
  const next = cloneWebsiteDraft(props.config);
  next.skeletons.splice(index, 1);
  await props.deleteConfig(next);
}

function citySequence(skeleton: WebsiteSkeleton) {
  return skeleton.days
    .map((day) => props.config.cities.find((city) => city.id === day.cityId)?.nameZh ?? day.cityId)
    .join(" → ");
}

function move(index: number, direction: number) {
  if (!record.value) return;
  const day = record.value.days.splice(index, 1)[0];
  if (day) record.value.days.splice(index + direction, 0, day);
}
</script>
