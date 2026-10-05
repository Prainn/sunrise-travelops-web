<template>
  <el-drawer
    v-if="readOnly"
    :model-value="modelValue"
    title="独立站询盘详情"
    size="min(680px, 94vw)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template v-if="record">
      <div class="flex items-start justify-between mb-[20px]">
        <div>
          <h3 class="m-[0_0_4px] text-[18px]">{{ record.customerName }}</h3>
          <span class="text-[var(--el-text-color-secondary)]">{{ record.code }}</span>
        </div>
        <el-tag :type="INQUIRY_STATUS_TAG_TYPES[record.status]">{{
          INQUIRY_STATUS_LABELS[record.status]
        }}</el-tag>
      </div>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="负责计调">{{ record.owner }}</el-descriptions-item>
        <el-descriptions-item label="计划天数">{{ record.plannedDays }} 天</el-descriptions-item>
        <el-descriptions-item label="开始日期">{{
          record.startDate || "未确认"
        }}</el-descriptions-item>
        <el-descriptions-item label="人数">{{ record.pax ?? "未确认" }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ record.phone || "未设置" }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ record.email || "未设置" }}</el-descriptions-item>
        <el-descriptions-item label="抵达时间">{{
          record.arrivalTime || "未确认"
        }}</el-descriptions-item>
        <el-descriptions-item label="离开时间">{{
          record.departureTime || "未确认"
        }}</el-descriptions-item>
        <el-descriptions-item label="目的地">{{
          record.destinations.map(cityName).join("、") || "未设置"
        }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{
          formatDateTime(record.createdAt)
        }}</el-descriptions-item>
        <el-descriptions-item label="询盘原文／需求说明"
          ><div class="whitespace-pre-wrap">{{ record.requirements }}</div></el-descriptions-item
        >
        <el-descriptions-item label="内部备注"
          ><div class="whitespace-pre-wrap">
            {{ record.internalRemark || "未设置" }}
          </div></el-descriptions-item
        >
        <el-descriptions-item v-if="record.status === 'lost'" label="流失原因">{{
          record.lostReason
        }}</el-descriptions-item>
      </el-descriptions>
    </template>
  </el-drawer>
  <el-dialog
    v-else
    :model-value="modelValue"
    :title="record ? '编辑独立站询盘' : '新增独立站询盘'"
    width="min(820px, 94vw)"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="auto" :disabled="saving">
      <el-row :gutter="16">
        <el-col v-if="record" :xs="24" :sm="12">
          <el-form-item label="编号"><el-input :model-value="record.code" disabled /></el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="客户称呼" prop="customerName"
            ><el-input v-model="form.customerName" maxlength="100"
          /></el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="计划天数" prop="plannedDays"
            ><el-input-number
              v-model="form.plannedDays"
              :min="1"
              :max="365"
              controls-position="right"
          /></el-form-item>
        </el-col>
        <el-col v-if="record" :xs="24" :sm="12">
          <el-form-item label="负责计调"
            ><el-input :model-value="record.owner" disabled
          /></el-form-item>
        </el-col>
        <el-col v-else-if="allowAssign" :xs="24" :sm="12">
          <el-form-item label="负责计调" prop="ownerId">
            <el-select v-model="form.ownerId" filterable>
              <el-option
                v-for="owner in owners"
                :key="owner.id"
                :value="owner.id"
                :label="owner.name"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="开始日期"
            ><el-date-picker
              v-model="form.startDate"
              value-format="YYYY-MM-DD"
              clearable
              class="w-full"
          /></el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="人数"
            ><el-input-number v-model="form.pax" :min="1" :max="10000" controls-position="right"
          /></el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="联系电话"
            ><el-input v-model="form.phone" maxlength="50"
          /></el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="邮箱" prop="email"
            ><el-input v-model="form.email" maxlength="254"
          /></el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="抵达时间"
            ><el-input v-model="form.arrivalTime" placeholder="例如 10:30" maxlength="100"
          /></el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item label="离开时间"
            ><el-input v-model="form.departureTime" placeholder="例如 18:00" maxlength="100"
          /></el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="目的地">
            <el-select v-model="form.destinations" multiple filterable>
              <el-option
                v-for="city in cities"
                :key="city.id"
                :value="city.id"
                :label="city.nameZh"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="询盘原文／需求说明" prop="requirements"
            ><el-input v-model="form.requirements" type="textarea" :rows="5" maxlength="200000"
          /></el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="内部备注"
            ><el-input v-model="form.internalRemark" type="textarea" :rows="2" maxlength="20000"
          /></el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { websiteInquiryInput, type WebsiteOwnerOption } from "@/services/website.service";
import type { WebsiteCity, WebsiteInquiry, WebsiteInquiryInput } from "@/types/website";
import { cloneWebsiteDraft, emptyInquiry, INQUIRY_STATUS_LABELS } from "../options";
import { INQUIRY_STATUS_TAG_TYPES } from "@/views/inquiries/options";
import { formatDateTime } from "@/utils";
const props = defineProps<{
  modelValue: boolean;
  record?: WebsiteInquiry;
  owners: WebsiteOwnerOption[];
  cities: WebsiteCity[];
  allowAssign: boolean;
  saving: boolean;
  readOnly: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  save: [input: WebsiteInquiryInput];
}>();
const formRef = ref<FormInstance>();
const form = ref<WebsiteInquiryInput>(emptyInquiry());
const rules = computed<FormRules>(() => ({
  customerName: [{ required: true, whitespace: true, message: "请填写客户称呼", trigger: "blur" }],
  plannedDays: [
    {
      required: true,
      type: "number",
      min: 1,
      max: 365,
      message: "计划天数为 1–365",
      trigger: "change",
    },
  ],
  requirements: [{ required: true, whitespace: true, message: "请填写需求说明", trigger: "blur" }],
  email: [{ type: "email", message: "请填写有效邮箱", trigger: "blur" }],
  ownerId: [
    {
      required: props.allowAssign && !props.record,
      message: "请选择启用的独立站计调",
      trigger: "change",
    },
  ],
}));
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      form.value = props.record
        ? cloneWebsiteDraft(websiteInquiryInput(props.record))
        : emptyInquiry();
      formRef.value?.clearValidate();
    }
  },
);
function cityName(id: string) {
  return props.cities.find((city) => city.id === id)?.nameZh ?? id;
}
async function submit() {
  if (await formRef.value?.validate().catch(() => false))
    emit("save", cloneWebsiteDraft(form.value));
}
</script>
