<template>
  <el-dialog
    :model-value="modelValue"
    :title="readOnly ? '独立站询盘详情' : record ? '编辑独立站询盘' : '新增独立站询盘'"
    width="min(850px, 94vw)"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      :disabled="saving || readOnly"
    >
      <div class="grid grid-cols-2 gap-x-5 max-[600px]:grid-cols-1">
        <el-form-item v-if="record" label="负责计调"
          ><el-input :model-value="record.owner" disabled
        /></el-form-item>
        <el-form-item label="客户称呼" prop="customerName">
          <el-input v-model="form.customerName" maxlength="100" />
        </el-form-item>
        <el-form-item label="计划天数" prop="plannedDays">
          <el-input-number v-model="form.plannedDays" :min="1" :max="365" />
        </el-form-item>
        <el-form-item v-if="allowAssign && !record" label="负责计调" prop="ownerId">
          <el-select v-model="form.ownerId" filterable>
            <el-option
              v-for="owner in owners"
              :key="owner.id"
              :value="owner.id"
              :label="owner.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期（可空）">
          <el-date-picker v-model="form.startDate" value-format="YYYY-MM-DD" clearable />
        </el-form-item>
        <el-form-item label="人数（可空）">
          <el-input-number v-model="form.pax" :min="1" :max="10000" controls-position="right" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" maxlength="50" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" maxlength="254" />
        </el-form-item>
        <el-form-item label="抵达时间（未确认可空）">
          <el-input
            v-model="form.arrivalTime"
            placeholder="例如 10:30；留空表示未确认"
            maxlength="100"
          />
        </el-form-item>
        <el-form-item label="离开时间（未确认可空）">
          <el-input
            v-model="form.departureTime"
            placeholder="例如 18:00；留空表示未确认"
            maxlength="100"
          />
        </el-form-item>
      </div>
      <el-form-item label="目的地（可空）">
        <el-select v-model="form.destinations" multiple filterable>
          <el-option v-for="city in cities" :key="city.id" :value="city.id" :label="city.nameZh" />
        </el-select>
      </el-form-item>
      <el-form-item label="询盘原文／需求说明" prop="requirements">
        <el-input v-model="form.requirements" type="textarea" :rows="5" maxlength="200000" />
      </el-form-item>
      <el-form-item label="内部备注">
        <el-input v-model="form.internalRemark" type="textarea" :rows="2" maxlength="20000" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="emit('update:modelValue', false)">取消</el-button>
      <el-button v-if="!readOnly" type="primary" :loading="saving" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { websiteInquiryInput, type WebsiteOwnerOption } from "@/services/website.service";
import type { WebsiteCity, WebsiteInquiry, WebsiteInquiryInput } from "@/types/website";
import { cloneWebsiteDraft, emptyInquiry } from "../options";
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
async function submit() {
  if (await formRef.value?.validate().catch(() => false))
    emit("save", cloneWebsiteDraft(form.value));
}
</script>
