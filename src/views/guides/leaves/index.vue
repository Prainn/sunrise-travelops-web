<template>
  <div class="page-container">
    <el-form inline class="page-search">
      <ResourceBusinessFilter />
      <el-form-item>
        <el-input v-model="keyword" :placeholder="$t('guideLeave.searchPlaceholder')" clearable />
      </el-form-item>
      <el-form-item>
        <el-button @click="resetQuery">
          {{ $t("common.reset") }}
        </el-button>
      </el-form-item>
    </el-form>
    <el-card class="page-content" shadow="never">
      <TableToolbar @refresh="load">
        <el-button v-has-perm="RESOURCE_PERMISSIONS.guide.create" type="primary" @click="openCreate">
          {{ $t("common.create") }}
        </el-button>
      </TableToolbar>
      <div class="page-table-wrapper">
        <el-table
          v-loading="loading"
          :data="rows"
          border
          height="100%"
          row-key="id"
        >
          <el-table-column :label="$t('identity.library')" min-width="190">
            <template #default="{ row }">
              <ResourceLibraryTag :library="row.library" />
            </template>
          </el-table-column>
          <el-table-column prop="guideName" :label="$t('guideLeave.guide')" min-width="140" />
          <el-table-column prop="startDate" :label="$t('guideLeave.startDate')" min-width="120" />
          <el-table-column prop="endDate" :label="$t('guideLeave.endDate')" min-width="120" />
          <el-table-column
            prop="reason"
            :label="$t('guideLeave.reason')"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column
            prop="remark"
            :label="$t('common.remark')"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column :label="$t('common.actions')" width="140" fixed="right">
            <template #default="{ row }">
              <el-button
                v-has-perm="RESOURCE_PERMISSIONS.guide.update"
                link
                type="primary"
                @click="openEdit(row as GuideLeaveRecord)"
              >
                {{ $t("common.edit") }}
              </el-button>
              <el-button
                v-has-perm="RESOURCE_PERMISSIONS.guide.delete"
                link
                type="danger"
                @click="remove(row as GuideLeaveRecord)"
              >
                {{ $t("common.delete") }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <pagination
        v-if="total > 0"
        v-model:page="pageNum"
        v-model:limit="pageSize"
        :total="total"
        @pagination="load"
      />
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="$t(editing ? 'guideLeave.editTitle' : 'guideLeave.createTitle')"
      width="520px"
      destroy-on-close
      :close-on-click-modal="!saving"
      :close-on-press-escape="!saving"
      :show-close="!saving"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        :disabled="saving"
        label-width="auto"
      >
        <el-form-item :label="$t('guideLeave.guide')" prop="guidePersonId">
          <el-select
            v-model="form.guidePersonId"
            filterable
            remote
            :remote-method="loadGuides"
            :disabled="Boolean(editing)"
            class="w-full"
          >
            <el-option
              v-for="guide in guideOptions"
              :key="guide.id"
              :value="guide.id"
              :label="`${guide.name} (${guide.code})`"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('guideLeave.period')" prop="startDate">
          <el-date-picker
            v-model="range"
            type="daterange"
            value-format="YYYY-MM-DD"
            :start-placeholder="$t('guideLeave.startDate')"
            :end-placeholder="$t('guideLeave.endDate')"
            class="!w-full"
          />
        </el-form-item>
        <el-form-item :label="$t('guideLeave.reason')">
          <el-input v-model.trim="form.reason" maxlength="200" />
        </el-form-item>
        <el-form-item :label="$t('common.remark')">
          <el-input
            v-model.trim="form.remark"
            type="textarea"
            :rows="3"
            maxlength="2000"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="saving" @click="dialogVisible = false">
          {{ $t("common.cancel") }}
        </el-button>
        <el-button
          type="primary"
          :loading="requesting"
          :disabled="saving"
          @click="save"
        >
          {{ $t("common.confirm") }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import ResourceLibraryTag from "@/components/ResourceLibraryTag.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { RESOURCE_PERMISSIONS } from "@/constants";
import { resourceService } from "@/services/resource.service";
import { resetResourceBusinessFilter, selectedResourceLibrary } from "@/services/resource-library";
import { tourService } from "@/services/tour.service";
import type { GuidePersonRecord } from "@/types/resource";
import type { GuideLeaveInput, GuideLeaveRecord } from "@/types/tour";
import ResourceBusinessFilter from "@/views/resources/components/ResourceBusinessFilter.vue";
import { useResourcePagination } from "@/views/resources/useResourcePagination";

defineOptions({ name: "GuideLeaves" });

const { t } = useI18n();
const keyword = ref("");
const loading = ref(false);
const validating = ref(false);
const requesting = ref(false);
const saving = computed(() => validating.value || requesting.value);
const total = ref(0);
const rows = ref<GuideLeaveRecord[]>([]);
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
const dialogVisible = ref(false);
const editing = ref<GuideLeaveRecord | null>(null);
const formRef = ref<FormInstance>();
const guideOptions = ref<GuidePersonRecord[]>([]);
const form = reactive<GuideLeaveInput>(emptyForm());
const range = computed({
  get: (): string[] | null => (form.startDate && form.endDate ? [form.startDate, form.endDate] : null),
  set: (value: string[] | null) => {
    form.startDate = value?.[0] ?? "";
    form.endDate = value?.[1] ?? "";
  },
});
const rules = computed<FormRules>(() => ({
  guidePersonId: [{ required: true, message: t("common.selectPlaceholder"), trigger: "change" }],
  startDate: [{ required: true, message: t("guideLeave.periodRequired"), trigger: "change" }],
}));

function emptyForm(): GuideLeaveInput {
  return { guidePersonId: "", startDate: "", endDate: "", reason: "", remark: "" };
}
function message(error: unknown) {
  ElMessage.error(error instanceof Error ? error.message : String(error));
}
async function load() {
  loading.value = true;
  try {
    const result = await tourService.leaves({
      ...paginationQuery(),
      keyword: keyword.value,
    });
    rows.value = result.list;
    total.value = result.total;
  } catch (error) {
    message(error);
  } finally {
    loading.value = false;
  }
}
const reload = useDebounceFn(() => {
  pageNum.value = 1;
  void load();
}, 300);
watch(keyword, reload);
function resetQuery() {
  keyword.value = "";
  resetResourceBusinessFilter();
  pageNum.value = 1;
  void load();
}
async function loadGuides(keyword = "") {
  try {
    guideOptions.value = (
      await resourceService.guidePersonApi.getPage({ page: 1, pageSize: 100, status: "enabled", keyword })
    ).list;
  } catch (error) {
    message(error);
  }
}
async function openCreate() {
  if (!selectedResourceLibrary.value) return void ElMessage.info(t("identity.selectLibraryToCreate"));
  editing.value = null;
  Object.assign(form, emptyForm());
  await loadGuides();
  dialogVisible.value = true;
}
async function openEdit(row: GuideLeaveRecord) {
  editing.value = row;
  Object.assign(form, {
    guidePersonId: row.guidePersonId,
    startDate: row.startDate,
    endDate: row.endDate,
    reason: row.reason,
    remark: row.remark,
  });
  guideOptions.value = [{ id: row.guidePersonId, name: row.guideName, code: row.guideCode } as GuidePersonRecord];
  dialogVisible.value = true;
}
async function save() {
  if (saving.value) return;
  validating.value = true;
  try {
    const valid = await formRef.value?.validate().then(
      () => true,
      () => false,
    );
    if (!valid) return;
    requesting.value = true;
    validating.value = false;
    const current = editing.value;
    if (current) await tourService.updateLeave(current.id, current.version, current.library, form);
    else await tourService.createLeave(form);
    dialogVisible.value = false;
    ElMessage.success(t(current ? "common.updateSuccess" : "common.createSuccess"));
    await load();
  } catch (error) {
    message(error);
  } finally {
    requesting.value = false;
    validating.value = false;
  }
}
async function remove(row: GuideLeaveRecord) {
  try {
    await ElMessageBox.confirm(t("common.deleteConfirm"), t("common.tip"), { type: "warning" });
  } catch {
    return;
  }
  try {
    await tourService.deleteLeave(row.id);
    ElMessage.success(t("common.deleteSuccess"));
    await load();
  } catch (error) {
    message(error);
  }
}

onMounted(load);
</script>
