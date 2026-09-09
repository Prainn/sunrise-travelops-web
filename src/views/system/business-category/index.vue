<template>
  <div class="page-container business-category-page">
    <el-card
      v-loading="loading"
      class="business-category-page__card"
      shadow="never"
    >
      <div class="business-category-page__toolbar flex gap-[16px] items-center justify-between pb-[12px]">
        <div>
          <div class="business-category-page__title font-semibold">
            {{ $t("businessCategory.typeManagement") }}
          </div>
        </div>
        <el-button
          v-hasPerm="'sys:business-dictionary:create'"
          type="primary"
          @click="openTypeDialog"
        >
          {{ $t("businessCategory.createType") }}
        </el-button>
      </div>

      <div class="business-category-page__workspace grid [grid-template-columns:208px_minmax(0,_1fr)] min-h-0 overflow-hidden [border:1px_solid_var(--el-border-color-light)] rounded-[var(--el-border-radius-base)]">
        <nav
          class="business-category-page__type-list p-[8px] overflow-y-auto [background:var(--el-fill-color-extra-light)] [border-right:1px_solid_var(--el-border-color-light)]"
          :aria-label="$t('businessCategory.typeManagement')"
        >
          <button
            v-for="category in categoryTypes"
            :key="category.id"
            class="business-category-page__type-button"
            :class="{ 'is-active': activeCategory === category.code }"
            type="button"
            @click="activeCategory = category.code"
          >
            <span>{{ categoryName(category) }}</span>
            <span class="business-category-page__type-code mt-[2px] text-[var(--el-text-color-secondary)] text-[14px]">{{ category.code }}</span>
          </button>
        </nav>

        <main class="business-category-page__content min-h-0 p-[12px] overflow-hidden">
          <BusinessCategoryPanel
            v-if="selectedCategory"
            :category="selectedCategory"
            @changed="loadCategoryTypes"
          />
        </main>
      </div>
    </el-card>

    <el-dialog
      v-model="typeDialogVisible"
      :title="$t('businessCategory.createTypeTitle')"
      width="520px"
      destroy-on-close
    >
      <el-form
        ref="typeFormRef"
        :model="typeForm"
        :rules="typeRules"
        label-width="110px"
      >
        <el-form-item
          :label="$t('businessCategory.typeName')"
          prop="name"
        >
          <el-input v-model="typeForm.name" />
        </el-form-item>
        <el-form-item
          :label="$t('businessCategory.typeEnglishName')"
          prop="englishName"
        >
          <el-input v-model="typeForm.englishName" />
        </el-form-item>
        <el-form-item
          :label="$t('businessCategory.typeCode')"
          prop="code"
        >
          <el-input v-model="typeForm.code" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeDialogVisible = false">
          {{ $t("common.cancel") }}
        </el-button>
        <el-button
          type="primary"
          @click="createCategoryType"
        >
          {{ $t("common.confirm") }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import type { BusinessCategoryTypeRecord } from "@/types/resource";
import { businessDictionaryService } from "@/services";
import { businessCategoryTypeStore, getBusinessCategoryTypeName } from "@/utils/business-category";
import BusinessCategoryPanel from "./components/BusinessCategoryPanel.vue";

defineOptions({ name: "BusinessCategory" });

type CategoryTypeForm = Pick<BusinessCategoryTypeRecord, "code" | "name" | "englishName">;

const { locale, t } = useI18n();
const categoryTypes = businessCategoryTypeStore;
const activeCategory = ref(categoryTypes[0]?.code ?? "");
const selectedCategory = computed(() => categoryTypes.find((category) => category.code === activeCategory.value));
const loading = ref(false);
const typeDialogVisible = ref(false);
const typeFormRef = ref<FormInstance>();
const typeForm = reactive<CategoryTypeForm>(emptyTypeForm());
const typeRules: FormRules<CategoryTypeForm> = {
  name: [{ required: true, message: t("businessCategory.typeNameRequired"), trigger: "blur" }],
  englishName: [{ required: true, message: t("businessCategory.typeEnglishNameRequired"), trigger: "blur" }],
  code: [{ required: true, message: t("businessCategory.typeCodeRequired"), trigger: "blur" }],
};

function emptyTypeForm(): CategoryTypeForm {
  return { code: "", name: "", englishName: "" };
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
    if (!activeCategory.value || !categoryTypes.some((category) => category.code === activeCategory.value)) {
      activeCategory.value = categoryTypes[0]?.code ?? "";
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("request.failed"));
  } finally {
    loading.value = false;
  }
}

async function createCategoryType() {
  await typeFormRef.value?.validate();
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
    });
    await loadCategoryTypes();
    activeCategory.value = code;
    typeDialogVisible.value = false;
    ElMessage.success(t("common.createSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("request.failed"));
  }
}

onMounted(loadCategoryTypes);
</script>

<style scoped lang="scss">
.business-category-page__card {
  @apply '[flex:1] min-h-0';
}

.business-category-page :deep(.business-category-page__card > .el-card__body) {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
}

.business-category-page__type-button {
  @apply 'flex w-full p-[10px_12px] text-[var(--el-text-color-regular)] text-left cursor-pointer [background:transparent] [border:0] rounded-[var(--el-border-radius-base)] flex-col';

  & + & { margin-top: 4px; }

  &:hover { background: var(--el-fill-color-light); }

  &.is-active {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

@media (width <= 900px) {
  .business-category-page__workspace { @apply '[grid-template-columns:168px_minmax(0,_1fr)]'; }
}
</style>
