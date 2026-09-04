<template>
  <div class="business-category-panel">
    <BusinessCategorySearch
      v-model:keyword="keyword"
      v-model:status="status"
      :placeholder="$t(labelKeys.search)"
      @reset="resetQuery"
    />

    <el-card
      class="page-content"
      shadow="never"
    >
      <TableToolbar @refresh="resetQuery">
        <el-button
          v-hasPerm="'sys:business-dictionary:create'"
          type="primary"
          @click="openCreate"
        >
          {{ $t("common.create") }}
        </el-button>
      </TableToolbar>
      <div class="page-table-wrapper">
        <el-table
          v-loading="loading"
          :data="rows"
          height="100%"
          border
          row-key="id"
        >
          <el-table-column
            prop="name"
            :label="$t(labelKeys.name)"
            min-width="130"
          />
          <el-table-column
            prop="englishName"
            :label="$t('businessCategory.englishName')"
            min-width="150"
          />
          <el-table-column
            prop="code"
            :label="$t(labelKeys.code)"
            min-width="140"
          />
          <el-table-column
            v-if="isResourceUnit"
            :label="$t('businessCategory.applicableResources')"
            min-width="240"
          >
            <template #default="scope">
              <el-tag
                v-for="type in scope.row.resourceTypes"
                :key="type"
                class="business-category-panel__tag"
                effect="plain"
              >
                {{ $t(`itinerary.resourceTypes.${type}`) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('common.status')"
            width="90"
            align="center"
          >
            <template #default="scope">
              <el-tag :type="scope.row.status === 'enabled' ? 'success' : 'info'">
                {{ $t(scope.row.status === "enabled" ? "common.normal" : "common.disabled") }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="remark"
            :label="$t('common.remark')"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column
            :label="$t('common.actions')"
            width="130"
            fixed="right"
            align="center"
          >
            <template #default="scope">
              <el-button
                v-hasPerm="'sys:business-dictionary:update'"
                link
                type="primary"
                @click="openEdit(scope.row as CategoryItem)"
              >
                {{ $t("common.edit") }}
              </el-button>
              <el-button
                v-hasPerm="'sys:business-dictionary:delete'"
                link
                type="danger"
                @click="removeItem(scope.row as CategoryItem)"
              >
                {{ $t("common.delete") }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="$t(dialogTitleKey)"
      width="560px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="110px"
      >
        <el-form-item
          :label="$t(labelKeys.name)"
          prop="name"
        >
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item
          :label="$t('businessCategory.englishName')"
          prop="englishName"
        >
          <el-input v-model="form.englishName" />
        </el-form-item>
        <el-form-item
          :label="$t(labelKeys.code)"
          prop="code"
        >
          <el-input
            v-model="form.code"
            :disabled="Boolean(editingId)"
          />
        </el-form-item>
        <el-form-item
          v-if="isResourceUnit"
          :label="$t('businessCategory.applicableResources')"
          prop="resourceTypes"
        >
          <el-select
            v-model="form.resourceTypes"
            multiple
            style="width: 100%"
          >
            <el-option
              v-for="type in resourceTypes"
              :key="type"
              :value="type"
              :label="$t(`itinerary.resourceTypes.${type}`)"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('common.status')">
          <el-switch
            v-model="form.status"
            active-value="enabled"
            inactive-value="disabled"
          />
        </el-form-item>
        <el-form-item :label="$t('common.remark')">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          {{ $t("common.cancel") }}
        </el-button>
        <el-button
          type="primary"
          @click="saveItem"
        >
          {{ $t("common.confirm") }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import { businessDictionaryService } from "@/services";
import { inquiryService } from "@/services/inquiry.service";
import type { ItineraryItemType } from "@/types/itinerary";
import type {
  BusinessCategoryOptionRecord, BusinessCategoryTypeRecord,
} from "@/types/resource";
import TableToolbar from "@/components/TableToolbar/index.vue";
import BusinessCategorySearch from "./BusinessCategorySearch.vue";

interface CategoryItem extends BusinessCategoryOptionRecord {
  resourceTypes: ItineraryItemType[];
}

const props = defineProps<{ category: BusinessCategoryTypeRecord }>();
const emit = defineEmits<{ changed: [] }>();
const { t } = useI18n();
const resourceTypes: ItineraryItemType[] = ["hotel", "attraction", "restaurant", "vehicle", "guide"];
const keyword = ref("");
const status = ref("");
const loading = ref(false);
const rows = ref<CategoryItem[]>([]);
const dialogVisible = ref(false);
const editingId = ref("");
const formRef = ref<FormInstance>();
const form = reactive<CategoryItem>(emptyItem());
const isResourceUnit = computed(() => props.category.code === "resource-unit");
const isTransportMethod = computed(() => props.category.code === "transport-method");
const labelKeys = computed(() => {
  if (isResourceUnit.value) return { name: "businessCategory.name", code: "businessCategory.code", search: "businessCategory.searchPlaceholder" };
  if (isTransportMethod.value) return { name: "businessCategory.transportName", code: "businessCategory.transportCode", search: "businessCategory.transportSearchPlaceholder" };
  return { name: "businessCategory.optionName", code: "businessCategory.optionCode", search: "businessCategory.optionSearchPlaceholder" };
});
const dialogTitleKey = computed(() => {
  if (isResourceUnit.value) return editingId.value ? "businessCategory.editTitle" : "businessCategory.createTitle";
  if (isTransportMethod.value) return editingId.value ? "businessCategory.editTransportTitle" : "businessCategory.createTransportTitle";
  return editingId.value ? "businessCategory.editOptionTitle" : "businessCategory.createOptionTitle";
});
const rules = computed<FormRules<CategoryItem>>(() => ({
  name: [{ required: true, message: t(isResourceUnit.value ? "businessCategory.nameRequired" : isTransportMethod.value ? "businessCategory.transportNameRequired" : "businessCategory.optionNameRequired"), trigger: "blur" }],
  englishName: [{ required: true, message: t("businessCategory.englishNameRequired"), trigger: "blur" }],
  code: [{ required: true, message: t(isResourceUnit.value ? "businessCategory.codeRequired" : isTransportMethod.value ? "businessCategory.transportCodeRequired" : "businessCategory.optionCodeRequired"), trigger: "blur" }],
  resourceTypes: [{ required: isResourceUnit.value, type: "array", min: 1, message: t("businessCategory.resourceTypesRequired"), trigger: "change" }],
}));

watch(() => props.category.code, () => {
  resetQuery();
  dialogVisible.value = false;
  loadItems();
});
watch([keyword, status], () => loadItems(), { flush: "post" });

function emptyItem(): CategoryItem {
  return { id: "", code: "", name: "", englishName: "", resourceTypes: [], status: "enabled", remark: "" };
}
function resetQuery() { keyword.value = ""; status.value = ""; }
function openCreate() { editingId.value = ""; Object.assign(form, emptyItem()); dialogVisible.value = true; }
function openEdit(row: CategoryItem) { editingId.value = row.id; Object.assign(form, row, { resourceTypes: [...row.resourceTypes] }); dialogVisible.value = true; }

async function loadItems() {
  loading.value = true;
  try {
    const items = await businessDictionaryService.getItems(props.category.code, {
      keyword: keyword.value,
      status: status.value,
    });
    rows.value = items.map((item) => ({
      ...item,
      resourceTypes: "resourceTypes" in item ? item.resourceTypes as ItineraryItemType[] : [],
    }));
    props.category.items.splice(0, props.category.items.length, ...items);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("request.failed"));
  } finally {
    loading.value = false;
  }
}

async function saveItem() {
  await formRef.value?.validate();
  const duplicate = rows.value.some((item) => item.code === form.code.trim() && item.id !== editingId.value);
  if (duplicate) {
    const key = isResourceUnit.value ? "businessCategory.codeDuplicate" : isTransportMethod.value ? "businessCategory.transportCodeDuplicate" : "businessCategory.optionCodeDuplicate";
    return void ElMessage.warning(t(key));
  }
  const value = {
    code: form.code.trim(),
    name: form.name.trim(),
    englishName: form.englishName.trim(),
    resourceTypes: [...form.resourceTypes],
    status: form.status,
    remark: form.remark,
  };
  try {
    if (editingId.value) await businessDictionaryService.updateItem(props.category.code, editingId.value, value);
    else await businessDictionaryService.createItem(props.category.code, value);
    await loadItems();
    emit("changed");
    dialogVisible.value = false;
    ElMessage.success(t("businessCategory.saveSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("request.failed"));
  }
}

async function removeItem(row: CategoryItem) {
  const transportInUse = inquiryService.itineraries.some((itinerary) => itinerary.dailyPlans.some((day) => day.transport.split(",").includes(row.code)));
  if (isTransportMethod.value && transportInUse) return void ElMessage.warning(t("businessCategory.transportInUse"));
  try { await ElMessageBox.confirm(t("common.deleteConfirm"), t("common.warning"), { type: "warning" }); } catch { return; }
  try {
    await businessDictionaryService.deleteItems(props.category.code, row.id);
    await loadItems();
    emit("changed");
    ElMessage.success(t("common.deleteSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t("request.failed"));
  }
}

onMounted(loadItems);
</script>

<style scoped lang="scss">
.business-category-panel { display: flex; height: 100%; min-height: 0; gap: 12px; flex-direction: column; }
.business-category-panel__tag + .business-category-panel__tag { margin-left: 6px; }
</style>
