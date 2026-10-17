<template>
  <PageShell aside-width="240px">
    <template #aside>
      <SectionCard
        v-loading="loading"
        fill
        padding="compact"
        :title="$t('businessCategory.typeManagement')"
        body-class="overflow-y-auto"
      >
        <template #actions>
          <el-button
            v-hasPerm="'sys:business-dictionary:create'"
            type="primary"
            @click="openTypeDialog"
          >
            {{ $t("businessCategory.createType") }}
          </el-button>
        </template>
        <nav class="flex flex-col gap-1" :aria-label="$t('businessCategory.typeManagement')">
          <div
            v-for="category in categoryTypes"
            :key="category.id"
            class="flex items-center"
          >
            <button
              :class="
                activeCategory === category.code
                  ? 'text-[var(--el-color-primary)] bg-[var(--el-color-primary-light-9)]'
                  : 'text-[var(--el-text-color-regular)] bg-transparent hover:bg-[var(--surface-hover)]'
              "
              class="flex min-w-0 flex-1 cursor-pointer flex-col rounded-[var(--el-border-radius-base)] border-0 px-3 py-[10px] text-left"
              type="button"
              @click="activeCategory = category.code"
            >
              <span>{{ categoryName(category) }}</span>
              <span class="mt-[2px] text-sm text-muted">{{ category.code }}</span>
            </button>
            <el-button
              v-if="!category.builtIn"
              v-hasPerm="'sys:business-dictionary:delete'"
              :icon="Delete"
              :aria-label="$t('businessCategory.deleteType', { name: categoryName(category) })"
              :title="$t('common.delete')"
              type="danger"
              link
              @click="removeCategoryType(category)"
            />
          </div>
        </nav>
      </SectionCard>
    </template>

    <BusinessCategoryPanel
      v-if="selectedCategory"
      :category="selectedCategory"
      @changed="loadCategoryTypes"
    />

    <AppDialog
      v-model="typeDialogVisible"
      :title="$t('businessCategory.createTypeTitle')"
      size="md"
      :busy="isTypeSubmitting"
      destroy-on-close
    >
      <el-form
        ref="typeFormRef"
        :model="typeForm"
        :rules="typeRules"
        label-width="160px"
      >
        <el-form-item :label="$t('businessCategory.typeName')" prop="name">
          <el-input v-model="typeForm.name" />
        </el-form-item>
        <el-form-item :label="$t('businessCategory.typeEnglishName')" prop="englishName">
          <el-input v-model="typeForm.englishName" />
        </el-form-item>
        <el-form-item :label="$t('businessCategory.typeCode')" prop="code">
          <el-input v-model.trim="typeForm.code" />
        </el-form-item>
        <el-form-item :label="$t('businessCategory.typeBuiltIn')" prop="builtIn">
          <div>
            <el-switch v-model="typeForm.builtIn" />
            <div class="text-xs leading-[18px] text-muted">
              {{ $t("businessCategory.typeBuiltInDescription") }}
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="isTypeSubmitting" @click="typeDialogVisible = false">
          {{ $t("common.cancel") }}
        </el-button>
        <el-button type="primary" :loading="isTypeSubmitting" @click="createCategoryType">
          {{ $t("common.confirm") }}
        </el-button>
      </template>
    </AppDialog>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { Delete } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import type { BusinessCategoryTypeRecord } from "@/types/resource";
import { businessDictionaryService } from "@/services";
import { businessCategoryTypeStore, getBusinessCategoryTypeName } from "@/utils/business-category";
import AppDialog from "@/components/AppDialog/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import BusinessCategoryPanel from "./components/BusinessCategoryPanel.vue";
import { useResourceFormSubmit } from "@/views/resources/useResourceFormSubmit";

defineOptions({ name: "BusinessCategory" });

type CategoryTypeForm = Pick<
  BusinessCategoryTypeRecord,
  "code" | "name" | "englishName" | "builtIn"
>;

const { locale, t } = useI18n();
const categoryTypes = businessCategoryTypeStore;
const activeCategory = ref(categoryTypes[0]?.code ?? "");
const selectedCategory = computed(() =>
  categoryTypes.find((category) => category.code === activeCategory.value),
);
const loading = ref(false);
const typeDialogVisible = ref(false);
const typeFormRef = ref<FormInstance>();
const { isSubmitting: isTypeSubmitting, submitForm: submitTypeForm } =
  useResourceFormSubmit(typeFormRef);
const typeForm = reactive<CategoryTypeForm>(emptyTypeForm());
const typeRules: FormRules<CategoryTypeForm> = {
  name: [{ required: true, message: t("businessCategory.typeNameRequired"), trigger: "blur" }],
  englishName: [
    { required: true, message: t("businessCategory.typeEnglishNameRequired"), trigger: "blur" },
  ],
  code: [
    { required: true, message: t("businessCategory.typeCodeRequired"), trigger: "blur" },
    {
      pattern: /^(?=.{1,100}$)[a-z][a-zA-Z0-9-]*$/,
      message: t("businessCategory.typeCodeFormat"),
      trigger: "blur",
    },
  ],
};

function emptyTypeForm(): CategoryTypeForm {
  return { code: "", name: "", englishName: "", builtIn: false };
}

function categoryName(category: BusinessCategoryTypeRecord) {
  return getBusinessCategoryTypeName(category.name, category.englishName, locale.value);
}

function openTypeDialog() {
  Object.assign(typeForm, emptyTypeForm());
  typeDialogVisible.value = true;
}

async function loadCategoryTypes() {
  loading.value = true;
  try {
    const types = await businessDictionaryService.getTypes();
    categoryTypes.splice(0, categoryTypes.length, ...types);
    if (
      !activeCategory.value ||
      !categoryTypes.some((category) => category.code === activeCategory.value)
    ) {
      activeCategory.value = categoryTypes[0]?.code ?? "";
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("request.failed"));
  } finally {
    loading.value = false;
  }
}

function createCategoryType(): Promise<void> {
  return submitTypeForm(async () => {
    const code = typeForm.code.trim();
    if (categoryTypes.some((category) => category.code === code)) {
      ElMessage.warning(t("businessCategory.typeCodeDuplicate"));
      return;
    }
    try {
      await businessDictionaryService.createType({
        code,
        name: typeForm.name.trim(),
        englishName: typeForm.englishName.trim(),
        builtIn: typeForm.builtIn,
      });
      await loadCategoryTypes();
      activeCategory.value = code;
      typeDialogVisible.value = false;
      ElMessage.success(t("common.createSuccess"));
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : t("request.failed"));
    }
  });
}

async function removeCategoryType(category: BusinessCategoryTypeRecord) {
  try {
    await ElMessageBox.confirm(
      t("businessCategory.deleteTypeConfirm", { name: categoryName(category) }),
      t("common.warning"),
      { type: "warning" },
    );
  } catch {
    return;
  }
  try {
    await businessDictionaryService.deleteTypes(category.id);
    await loadCategoryTypes();
    ElMessage.success(t("common.deleteSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("request.failed"));
  }
}

onMounted(loadCategoryTypes);
</script>
