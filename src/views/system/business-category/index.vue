<template>
  <div class="page-container business-category-page">
    <el-card
      class="business-category-page__card"
      shadow="never"
    >
      <div class="business-category-page__toolbar">
        <div>
          <div class="business-category-page__title">
            {{ $t("businessCategory.typeManagement") }}
          </div>
          <div class="business-category-page__description">
            {{ $t("businessCategory.typeDescription") }}
          </div>
        </div>
        <el-button
          v-hasPerm="'sys:business-category:create'"
          type="primary"
          @click="openTypeDialog"
        >
          {{ $t("businessCategory.createType") }}
        </el-button>
      </div>

      <div class="business-category-page__workspace">
        <nav
          class="business-category-page__type-list"
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
            <span class="business-category-page__type-code">{{ category.code }}</span>
          </button>
        </nav>

        <main class="business-category-page__content">
          <BusinessCategoryPanel
            v-if="selectedCategory"
            :category="selectedCategory"
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
import { computed, reactive, ref } from "vue";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import type { BusinessCategoryTypeRecord } from "@/data/data";
import { businessCategoryTypeStore, getBusinessCategoryTypeName } from "@/utils/business-category";
import BusinessCategoryPanel from "./components/BusinessCategoryPanel.vue";

defineOptions({ name: "BusinessCategory" });

type CategoryTypeForm = Pick<BusinessCategoryTypeRecord, "code" | "name" | "englishName">;

const { locale, t } = useI18n();
const categoryTypes = businessCategoryTypeStore;
const activeCategory = ref(categoryTypes[0]?.code ?? "");
const selectedCategory = computed(() => categoryTypes.find((category) => category.code === activeCategory.value));
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

async function createCategoryType() {
  await typeFormRef.value?.validate();
  const code = typeForm.code.trim();
  if (categoryTypes.some((category) => category.code === code)) {
    ElMessage.warning(t("businessCategory.typeCodeDuplicate"));
    return;
  }
  categoryTypes.push({
    id: `business-category-${Date.now()}`,
    code,
    name: typeForm.name.trim(),
    englishName: typeForm.englishName.trim(),
    builtIn: false,
    items: [],
  });
  activeCategory.value = code;
  typeDialogVisible.value = false;
  ElMessage.success(t("common.createSuccess"));
}
</script>

<style scoped lang="scss">
.business-category-page__card {
  flex: 1;
  min-height: 0;
}

.business-category-page__toolbar {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
}

.business-category-page__title { font-weight: 600; }

.business-category-page__description {
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.business-category-page :deep(.business-category-page__card > .el-card__body) {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
}

.business-category-page__workspace {
  display: grid;
  grid-template-columns: 208px minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
}

.business-category-page__type-list {
  padding: 8px;
  overflow-y: auto;
  background: var(--el-fill-color-extra-light);
  border-right: 1px solid var(--el-border-color-light);
}

.business-category-page__type-button {
  display: flex;
  width: 100%;
  padding: 10px 12px;
  color: var(--el-text-color-regular);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--el-border-radius-base);
  flex-direction: column;

  & + & { margin-top: 4px; }

  &:hover { background: var(--el-fill-color-light); }

  &.is-active {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.business-category-page__type-code {
  margin-top: 2px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.business-category-page__content {
  min-height: 0;
  padding: 12px;
  overflow: hidden;
}

@media (width <= 900px) {
  .business-category-page__workspace { grid-template-columns: 168px minmax(0, 1fr); }
}
</style>
