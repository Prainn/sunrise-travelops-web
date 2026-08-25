<template>
  <el-dialog
    v-model="isVisible"
    :title="$t(isEditing ? 'guide.editGuide' : 'guide.createGuide')"
    width="780px"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="auto"
    >
      <div class="guide-editor__grid">
        <el-form-item :label="$t('resource.code')">
          <el-input
            v-model="form.code"
            disabled
          />
        </el-form-item>
        <el-form-item
          :label="$t('guide.certificateNo')"
          prop="certificateNo"
        >
          <el-input v-model.trim="form.certificateNo" />
        </el-form-item>
        <el-form-item
          :label="$t('resource.guideName')"
          prop="name"
        >
          <el-input v-model.trim="form.name" />
        </el-form-item>
        <el-form-item
          :label="$t('guide.gender')"
          prop="gender"
        >
          <el-radio-group v-model="form.gender">
            <el-radio value="male">
              {{ $t("guide.male") }}
            </el-radio>
            <el-radio value="female">
              {{ $t("guide.female") }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          :label="$t('guide.age')"
          prop="age"
        >
          <el-input-number
            v-model="form.age"
            :min="18"
            :max="80"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item
          :label="$t('guide.languages')"
          prop="languages"
        >
          <el-select
            v-model="form.languages"
            multiple
            filterable
            allow-create
            default-first-option
          >
            <el-option
              v-for="option in languageOptions"
              :key="option"
              :label="option"
              :value="option"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          :label="$t('guide.employmentType')"
          prop="employmentType"
        >
          <el-radio-group v-model="form.employmentType">
            <el-radio value="full-time">
              {{ $t("guide.fullTime") }}
            </el-radio>
            <el-radio value="part-time">
              {{ $t("guide.partTime") }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          :label="$t('guide.identityNumber')"
          prop="identityNumber"
        >
          <el-input
            v-model.trim="form.identityNumber"
            maxlength="18"
          />
        </el-form-item>
        <el-form-item
          :label="$t('resource.phone')"
          prop="phone"
        >
          <el-input
            v-model.trim="form.phone"
            maxlength="20"
          />
        </el-form-item>
        <el-form-item :label="$t('resource.dailyPrice')">
          <el-input-number
            v-model="form.dailyPrice"
            :min="0"
            :precision="2"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item :label="$t('guide.hasLaborContract')">
          <el-switch v-model="form.hasLaborContract" />
        </el-form-item>
        <el-form-item :label="$t('resource.isGroundOperatorProvided')">
          <el-switch
            v-model="form.isGroundOperatorProvided"
            @change="changeProvider"
          />
        </el-form-item>
        <el-form-item
          v-if="form.isGroundOperatorProvided"
          :label="$t('resource.supplierName')"
          prop="groundOperatorId"
        >
          <el-select v-model="form.groundOperatorId">
            <el-option
              v-for="option in groundOperatorOptions"
              :key="option.id"
              :label="option.name"
              :value="option.id"
            />
          </el-select>
        </el-form-item>
      </div>
      <el-form-item :label="$t('guide.licensePhoto')">
        <div class="guide-editor__photo-field">
          <el-image
            v-if="form.licensePhotoUrl"
            class="guide-editor__photo"
            :src="form.licensePhotoUrl"
            :preview-src-list="[form.licensePhotoUrl]"
            preview-teleported
            fit="cover"
          />
          <div class="guide-editor__photo-actions">
            <el-upload
              accept="image/jpeg,image/png"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handlePhotoChange"
            >
              <el-button>{{ $t(form.licensePhotoUrl ? "guide.replacePhoto" : "guide.uploadPhoto") }}</el-button>
            </el-upload>
            <el-button
              v-if="form.licensePhotoUrl"
              type="danger"
              link
              @click="form.licensePhotoUrl = ''"
            >
              {{ $t("guide.removePhoto") }}
            </el-button>
            <span class="guide-editor__photo-tip">{{ $t("guide.photoTip") }}</span>
          </div>
        </div>
      </el-form-item>
      <el-form-item :label="$t('common.remark')">
        <el-input
          v-model.trim="form.remark"
          type="textarea"
          :rows="3"
        />
      </el-form-item>
      <el-form-item :label="$t('common.status')">
        <el-radio-group v-model="form.status">
          <el-radio value="enabled">
            {{ $t("common.enabled") }}
          </el-radio>
          <el-radio value="disabled">
            {{ $t("common.disabled") }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="isVisible = false">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button
        type="primary"
        @click="handleSubmit"
      >
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { ElMessage, type FormInstance, type FormRules, type UploadFile } from "element-plus";
import { useI18n } from "vue-i18n";
import { tourismResources, type GuideRecord } from "@/data/data";

const props = defineProps<{ modelValue: boolean; record: GuideRecord; isEditing: boolean }>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [record: GuideRecord];
}>();

const { t } = useI18n();
const formRef = ref<FormInstance>();
const form = reactive<GuideRecord>({ ...props.record, languages: [...props.record.languages] });
const isVisible = computed({ get: () => props.modelValue, set: (value) => emit("update:modelValue", value) });
const languageOptions = ["中文", "英文", "日文", "韩文", "泰文"];
const groundOperatorOptions = computed(() => tourismResources.supplier.filter((item) => item.status === "enabled"));
const rules = computed<FormRules>(() => ({
  certificateNo: [{ required: true, message: t("guide.certificateNoRequired"), trigger: "blur" }],
  name: [{ required: true, message: t("guide.nameRequired"), trigger: "blur" }],
  gender: [{ required: true, message: t("guide.genderRequired"), trigger: "change" }],
  age: [{ required: true, message: t("guide.ageRequired"), trigger: "change" }],
  languages: [{ required: true, message: t("guide.languageRequired"), trigger: "change" }],
  employmentType: [{ required: true, message: t("guide.employmentTypeRequired"), trigger: "change" }],
  identityNumber: [{ required: true, message: t("guide.identityNumberRequired"), trigger: "blur" }],
  phone: [{ required: true, message: t("guide.phoneRequired"), trigger: "blur" }],
  groundOperatorId: [{ required: form.isGroundOperatorProvided, message: t("resource.groundOperatorRequired"), trigger: "change" }],
}));

watch(() => props.record, (record) => Object.assign(form, record, { languages: [...record.languages] }), { deep: true });

function changeProvider(value: string | number | boolean) {
  if (!value) form.groundOperatorId = "";
}

function handlePhotoChange(uploadFile: UploadFile) {
  const file = uploadFile.raw;
  if (!file) return;
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    ElMessage.warning(t("guide.photoTypeError"));
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning(t("guide.photoSizeError"));
    return;
  }
  const reader = new FileReader();
  reader.onload = () => { form.licensePhotoUrl = String(reader.result ?? ""); };
  reader.readAsDataURL(file);
}

async function handleSubmit() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  emit("submit", { ...form, languages: [...form.languages] });
}
</script>

<style scoped lang="scss">
.guide-editor {
  &__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 24px; }
  &__photo-field { display: flex; align-items: center; gap: 12px; }
  &__photo { width: 72px; height: 88px; border-radius: 6px; }
  &__photo-actions { display: flex; align-items: center; gap: 8px; }
  &__photo-tip { color: var(--el-text-color-secondary); font-size: 12px; }
}

@media (width <= 768px) {
  .guide-editor {
    &__grid { grid-template-columns: 1fr; }
    &__photo-actions { align-items: flex-start; flex-direction: column; }
  }
}
</style>
