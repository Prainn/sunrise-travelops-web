<!-- OSS 管理展示当前环境的原始媒体和聊天文档。 -->
<template>
  <PageShell>
    <FilterBar @reset="resetFilters">
      <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
        <el-input
          v-model="keyword"
          clearable
          maxlength="200"
          :placeholder="$t('oss.searchPlaceholder')"
          @keydown.enter="runOnEnter($event, search)"
        />
      </el-form-item>
      <el-form-item :label="$t('oss.kind')">
        <el-select
          v-model="kind"
          clearable
          autocomplete="new-password"
          :placeholder="$t('common.all')"
          @change="search"
        >
          <el-option
            v-for="item in KINDS"
            :key="item"
            :label="$t(`oss.kinds.${item}`)"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('common.status')">
        <el-select
          v-model="state"
          clearable
          autocomplete="new-password"
          :placeholder="$t('common.all')"
          @change="search"
        >
          <el-option
            v-for="item in STATES"
            :key="item"
            :label="$t(`oss.states.${item}`)"
            :value="item"
          />
        </el-select>
      </el-form-item>
      <template #actions>
        <el-button type="primary" @click="search">
          {{ $t('common.search') }}
        </el-button>
      </template>
    </FilterBar>
    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="fetchList">
        <template #default>
          <el-button
            v-if="canCreate"
            type="primary"
            :loading="uploading"
            @click="openUploadPicker"
          >
            {{ $t('oss.upload') }}
          </el-button>
          <input
            ref="fileInput"
            type="file"
            class="hidden"
            :accept="IMAGE_ACCEPT"
            @change="handleFileChange"
          />
        </template>
      </TableToolbar>
      <DataTable
        fill
        :loading="loading"
        :data="rows"
        :error="loadError"
        row-key="id"
        :filtered="!!keyword.trim() || !!kind || !!state"
        @retry="fetchList"
      >
        <el-table-column :label="$t('oss.preview')" width="96">
          <template #default="{ row }">
            <el-tag v-if="isOssChatDocument(row as OssCatalogItem)" type="info" effect="plain">
              {{ row.extension.toUpperCase() }}
            </el-tag>
            <OssMediaPreview
              v-else
              :resource="row as OssResource"
              :max-size="64"
              compact
            />
          </template>
        </el-table-column>
        <el-table-column :label="$t('oss.name')" min-width="200">
          <template #default="{ row }">
            <div class="truncate text-strong" :title="row.name">
              {{ row.name }}
            </div>
            <div v-if="row.remark" class="truncate text-[12px] text-muted" :title="row.remark">
              {{ row.remark }}
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('oss.kind')" width="90">
          <template #default="{ row }">
            {{ $t(`oss.kinds.${row.kind}`) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('oss.source')" width="110">
          <template #default="{ row }">
            {{ $t(`oss.sources.${row.source}`) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.status')" min-width="150">
          <template #default="{ row }">
            <el-tag :type="STATE_TAG_TYPES[(row as OssCatalogItem).state]">
              {{ $t(`oss.states.${row.state}`) }}
            </el-tag>
            <div v-if="row.state === 'failed'" class="mt-[4px] text-[12px] text-[var(--el-color-danger)]">
              {{ $t(ossErrorKey(row.errorCode)) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('oss.size')" width="100">
          <template #default="{ row }">
            {{ formatFileSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('oss.dimensions')" width="120">
          <template #default="{ row }">
            {{ dimensions(row as OssCatalogItem) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('oss.referenceCount')" width="90" align="center">
          <template #default="{ row }">
            {{ row.referenceCount }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.updatedAt')" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('common.actions')"
          width="260"
          fixed="right"
          :show-overflow-tooltip="false"
        >
          <template #default="{ row }">
            <div class="flex items-center">
              <el-button link type="primary" @click="openDetail(row as OssCatalogItem)">
                {{ $t('oss.detail') }}
              </el-button>
              <el-button
                v-if="isOssChatDocument(row as OssCatalogItem) && row.documentMessage"
                link
                type="primary"
                :aria-label="$t('whatsapp.documentPreview.open', { name: row.name })"
                @click="openDocument(row as OssChatDocument)"
              >
                {{ $t('oss.openDocument') }}
              </el-button>
              <el-button
                v-if="canUpdate && !isOssChatDocument(row as OssCatalogItem)"
                link
                type="primary"
                :disabled="row.state === 'deleting'"
                @click="openEditor(row as OssResource)"
              >
                {{ $t('common.edit') }}
              </el-button>
              <el-button
                v-if="canUpdate && canRetry(row as OssCatalogItem)"
                link
                type="primary"
                :loading="busyId === row.id"
                @click="handleRetry(row as OssResource)"
              >
                {{ $t('oss.retry') }}
              </el-button>
              <el-tooltip
                v-if="canDelete && !isOssChatDocument(row as OssCatalogItem)"
                :content="deleteBlockedReason(row as OssResource)"
                :disabled="!deleteBlockedReason(row as OssResource)"
                placement="top"
              >
                <!-- 禁用按钮不触发悬停事件，由外层元素承载原因提示 -->
                <span class="inline-flex ml-[12px]">
                  <el-button
                    link
                    type="danger"
                    :disabled="!!deleteBlockedReason(row as OssResource)"
                    :loading="busyId === row.id"
                    @click="handleDelete(row as OssResource)"
                  >
                    {{ $t('common.delete') }}
                  </el-button>
                </span>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </DataTable>
      <Pagination
        v-model:page="page"
        v-model:limit="pageSize"
        :total="total"
        @pagination="fetchList"
      />
    </SectionCard>

    <AppDialog v-model="detailVisible" :title="$t('oss.detail')">
      <FeedbackState
        v-if="detailError"
        type="error"
        :description="detailError"
        retryable
        @retry="loadDetail"
      />
      <div v-else-if="detail" v-loading="detailLoading" class="flex flex-col gap-3">
        <div v-if="isOssChatDocument(detail)" class="flex justify-center">
          <el-button v-if="detail.documentMessage" @click="openDocument(detail)">
            {{ $t('oss.openDocument') }}
          </el-button>
          <el-tag v-else type="info" effect="plain">
            {{ detail.extension.toUpperCase() }}
          </el-tag>
        </div>
        <div v-else class="flex justify-center">
          <OssMediaPreview :resource="detail" :max-size="360" />
        </div>
        <el-descriptions :column="1" border>
          <el-descriptions-item :label="$t('oss.name')">
            {{ detail.name }}
          </el-descriptions-item>
          <el-descriptions-item v-if="!isOssChatDocument(detail)" :label="$t('oss.remark')">
            <span class="whitespace-pre-wrap break-words">{{ detail.remark || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('oss.environment')">
            {{ $t(`oss.environments.${detail.environment}`) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('oss.kind')">
            {{ $t(`oss.kinds.${detail.kind}`) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('oss.source')">
            {{ $t(`oss.sources.${detail.source}`) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('common.status')">
            {{ $t(`oss.states.${detail.state}`) }}
            <span v-if="detail.state === 'failed'" class="ml-2 text-[var(--el-color-danger)]">{{ $t(ossErrorKey(detail.errorCode)) }}</span>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('oss.mimeType')">
            {{ detail.mimeType || '-' }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('oss.size')">
            {{ formatFileSize(detail.size) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="!isOssChatDocument(detail)" :label="$t('oss.dimensions')">
            {{ dimensions(detail) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('oss.referenceCount')">
            {{ detail.referenceCount }}
          </el-descriptions-item>
          <el-descriptions-item v-if="!isOssChatDocument(detail)" :label="$t('oss.objectKey')">
            <span class="break-all">{{ detail.objectKey || '-' }}</span>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('common.createdAt')">
            {{ formatDateTime(detail.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('common.updatedAt')">
            {{ formatDateTime(detail.updatedAt) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </AppDialog>

    <DocumentPreviewDialog
      v-if="selectedDocument?.documentMessage"
      :key="selectedDocument.id"
      v-model="documentOpen"
      :conversation-id="selectedDocument.documentMessage.conversationId"
      :message-id="selectedDocument.documentMessage.messageId"
      :document="{ fileName: selectedDocument.name, mimeType: selectedDocument.mimeType }"
    />

    <AppDialog
      v-model="editorVisible"
      :title="$t('oss.edit')"
      :busy="saving"
      @closed="formRef?.clearValidate()"
    >
      <el-alert
        v-if="hasConflict"
        class="mb-4"
        type="warning"
        :closable="false"
        show-icon
        :title="$t('oss.conflict')"
      >
        <el-button link type="primary" @click="reloadEditor">
          {{ $t('oss.reloadLatest') }}
        </el-button>
      </el-alert>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
      >
        <el-form-item prop="name" :label="$t('oss.name')">
          <el-input v-model="form.name" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item prop="remark" :label="$t('oss.remark')">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="4"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="saving" @click="editorVisible = false">
          {{ $t('common.cancel') }}
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          :disabled="hasConflict"
          @click="handleSave"
        >
          {{ $t('common.save') }}
        </el-button>
      </template>
    </AppDialog>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import { ApiError } from "@/api/request";
import AppDialog from "@/components/AppDialog/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import FeedbackState from "@/components/FeedbackState/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import OssMediaPreview from "@/components/OssMediaPreview/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { useRefreshOnActivated } from "@/composables";
import { ossService } from "@/services/oss.service";
import { websiteErrorMessage } from "@/services/website.service";
import { isOssChatDocument, ossErrorKey, type OssCatalogItem, type OssChatDocument, type OssResource, type OssResourceState } from "@/types/oss";
import DocumentPreviewDialog from "@/views/whatsapp/components/DocumentPreviewDialog.vue";
import { formatDateTime, formatFileSize, runOnEnter } from "@/utils";
import { hasPerm } from "@/utils/auth";
import { IMAGE_ACCEPT, validateImageFile } from "@/utils/image-file";

defineOptions({ name: "OssManagement" });

const KINDS: OssCatalogItem["kind"][] = ["image", "sticker", "pdf", "word"];
const STATES: OssResourceState[] = ["pending", "processing", "ready", "failed", "deleting"];
const STATE_TAG_TYPES: Record<OssResourceState, "info" | "primary" | "success" | "warning" | "danger"> = {
  pending: "info",
  processing: "primary",
  ready: "success",
  failed: "danger",
  deleting: "warning",
};

const { t } = useI18n();
// 按钮按当前身份有效权限显示；服务端仍独立校验。
const canCreate = hasPerm("sys:oss:create");
const canUpdate = hasPerm("sys:oss:update");
const canDelete = hasPerm("sys:oss:delete");

const keyword = ref("");
const kind = ref<OssCatalogItem["kind"]>();
const state = ref<OssResourceState>();
const page = ref(1);
const pageSize = ref(20);
const rows = ref<OssCatalogItem[]>([]);
const total = ref(0);
const loading = ref(false);
const loadError = ref("");
const uploading = ref(false);
const busyId = ref("");
const fileInput = ref<HTMLInputElement>();

const detailVisible = ref(false);
const detailId = ref("");
const detail = ref<OssCatalogItem>();
const detailLoading = ref(false);
const detailError = ref("");
const selectedDocument = ref<OssChatDocument>();
const documentOpen = ref(false);

const editorVisible = ref(false);
const editingId = ref("");
const form = reactive({ version: 0, name: "", remark: "" });
const formRef = ref<FormInstance>();
const saving = ref(false);
const hasConflict = ref(false);
const rules = computed<FormRules>(() => ({
  name: [{ required: true, whitespace: true, message: t("oss.nameRequired"), trigger: "blur" }],
}));

let generation = 0;

async function fetchList() {
  const current = ++generation;
  loading.value = true;
  loadError.value = "";
  try {
    const result = await ossService.list({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined,
      kind: kind.value,
      state: state.value,
    });
    if (current !== generation) return;
    rows.value = result.list;
    total.value = result.total;
  } catch (cause) {
    if (current !== generation) return;
    rows.value = [];
    total.value = 0;
    loadError.value = websiteErrorMessage(cause);
  } finally {
    if (current === generation) loading.value = false;
  }
}
function search() {
  page.value = 1;
  void fetchList();
}
function resetFilters() {
  keyword.value = "";
  kind.value = undefined;
  state.value = undefined;
  search();
}

function dimensions(row: OssCatalogItem) {
  return row.width && row.height ? `${row.width} × ${row.height}` : "-";
}
function canRetry(row: OssCatalogItem) {
  return row.state === "failed" && row.source === "whatsapp";
}
/** 被消息引用或仍在处理时禁止删除；服务端仍以 409 兜底。 */
function deleteBlockedReason(row: OssResource) {
  if (row.referenceCount > 0) return t("oss.deleteReferenced", { count: row.referenceCount });
  if (row.state === "pending" || row.state === "processing") return t("oss.deleteProcessing");
  return "";
}

/** 409 包括版本冲突、处理中、引用保护和存储未配置；显示原因并刷新，不自动重试。 */
function notifyActionError(cause: unknown) {
  if (cause instanceof ApiError && cause.status === 409) {
    ElMessage.warning(t("oss.actionConflict", { message: websiteErrorMessage(cause) }));
    void fetchList();
  } else if (cause instanceof ApiError && cause.status === 404) {
    ElMessage.error(websiteErrorMessage(cause));
    void fetchList();
  } else {
    ElMessage.error(websiteErrorMessage(cause));
  }
}

function openUploadPicker() {
  if (canCreate && !uploading.value) fileInput.value?.click();
}
async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || uploading.value) return;
  const invalid = validateImageFile(file);
  if (invalid) {
    ElMessage.warning(t(invalid === "type" ? "whatsapp.imageDraft.invalidType" : "whatsapp.imageDraft.tooLarge"));
    return;
  }
  uploading.value = true;
  try {
    await ossService.upload(file);
    ElMessage.success(t("oss.uploadSuccess"));
    search();
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  } finally {
    uploading.value = false;
  }
}

async function loadDetail() {
  const id = detailId.value;
  detailLoading.value = true;
  detailError.value = "";
  try {
    const result = await ossService.detail(id);
    if (id === detailId.value) detail.value = result;
  } catch (cause) {
    if (id === detailId.value) detailError.value = websiteErrorMessage(cause);
  } finally {
    if (id === detailId.value) detailLoading.value = false;
  }
}
function openDetail(row: OssCatalogItem) {
  detailId.value = row.id;
  detail.value = row;
  detailVisible.value = true;
  void loadDetail();
}

function openDocument(row: OssChatDocument) {
  selectedDocument.value = row;
  documentOpen.value = true;
}

function fillEditor(row: OssResource) {
  editingId.value = row.id;
  form.version = row.version;
  form.name = row.name;
  form.remark = row.remark;
  hasConflict.value = false;
}
function openEditor(row: OssResource) {
  fillEditor(row);
  editorVisible.value = true;
}
/** 用户明确选择后才载入最新记录，替换当前输入。 */
async function reloadEditor() {
  try {
    const row = await ossService.detail(editingId.value);
    if (!isOssChatDocument(row)) fillEditor(row);
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  }
}
async function handleSave() {
  if (!await formRef.value?.validate().catch(() => false)) return;
  saving.value = true;
  try {
    await ossService.update(editingId.value, { version: form.version, name: form.name.trim(), remark: form.remark });
    ElMessage.success(t("common.saveSuccess"));
    editorVisible.value = false;
    void fetchList();
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 409) {
      hasConflict.value = true;
      void fetchList();
    } else {
      notifyActionError(cause);
    }
  } finally {
    saving.value = false;
  }
}

async function handleRetry(row: OssResource) {
  try {
    await ElMessageBox.confirm(t("oss.retryConfirm"), t("common.warning"), { type: "warning" });
  } catch {
    return;
  }
  busyId.value = row.id;
  try {
    await ossService.retry(row.id, row.version);
    ElMessage.success(t("oss.retrySuccess"));
    void fetchList();
  } catch (cause) {
    notifyActionError(cause);
  } finally {
    busyId.value = "";
  }
}

async function handleDelete(row: OssResource) {
  if (deleteBlockedReason(row)) return;
  try {
    await ElMessageBox.confirm(t("oss.deleteConfirm", { name: row.name }), t("common.warning"), { type: "warning" });
  } catch {
    return;
  }
  busyId.value = row.id;
  try {
    await ossService.remove(row.id, row.version);
    ElMessage.success(t("oss.deleteSuccess"));
    void fetchList();
  } catch (cause) {
    notifyActionError(cause);
  } finally {
    busyId.value = "";
  }
}

onMounted(fetchList);
useRefreshOnActivated(fetchList);
</script>
