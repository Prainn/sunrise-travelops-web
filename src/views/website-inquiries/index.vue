<template>
  <div v-loading="loading" class="page-container">
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <el-card class="page-search" shadow="never">
      <el-form inline @submit.prevent="search">
        <el-form-item label="关键词">
          <el-input
            v-model.trim="query.keyword"
            placeholder="客户／编号／需求"
            class="page-search__keywords"
            clearable
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable>
            <el-option
              v-for="(label, value) in INQUIRY_STATUS_LABELS"
              :key="value"
              :value="value"
              :label="label"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="allowAssign || user.userInfo.scope === 'headquarters'" label="负责计调">
          <el-select v-model="query.ownerId" clearable filterable>
            <el-option
              v-for="owner in owners"
              :key="owner.id"
              :value="owner.id"
              :label="owner.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item><el-button @click="reset">重置</el-button></el-form-item>
      </el-form>
    </el-card>
    <WebsiteInquiryTable
      v-model:page="query.page"
      v-model:page-size="query.pageSize"
      :rows="rows"
      :total="total"
      :can="can"
      @refresh="load"
      @create="openEditor()"
      @view="openEditor($event, true)"
      @edit="openEditor($event)"
      @transfer="
        transferRecord = $event;
        transferVisible = true;
      "
      @archive="archive"
      @lost="markLost"
      @itineraries="openItineraries"
      @history="
        historyRecord = $event;
        historyVisible = true;
      "
    />
    <WebsiteInquiryEditor
      v-model="editorVisible"
      :record="editingRecord"
      :cities="cities"
      :owners="owners"
      :allow-assign="allowAssign"
      :saving="saving"
      :read-only="editorReadOnly"
      @save="save"
    />
    <WebsiteInquiryTransfer
      v-model="transferVisible"
      :record="transferRecord"
      :owners="owners"
      @saved="load"
    />
    <WebsiteInquiryHistory v-model="historyVisible" :record="historyRecord" />
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { useUserStore } from "@/stores/user";
import { hasUserPermission } from "@/utils/permission";
import {
  websiteErrorMessage,
  websiteService,
  websiteInquiryInput,
  type WebsiteInquiryQuery,
  type WebsiteOwnerOption,
} from "@/services/website.service";
import type { WebsiteCity, WebsiteInquiry, WebsiteInquiryInput } from "@/types/website";
import { INQUIRY_STATUS_LABELS } from "./options";
import WebsiteInquiryTable from "./components/WebsiteInquiryTable.vue";
import WebsiteInquiryEditor from "./components/WebsiteInquiryEditor.vue";
import WebsiteInquiryTransfer from "./components/WebsiteInquiryTransfer.vue";
import WebsiteInquiryHistory from "./components/WebsiteInquiryHistory.vue";
defineOptions({ name: "WebsiteInquiryList" });
const user = useUserStore();
const router = useRouter();
const query = reactive<WebsiteInquiryQuery>({
  page: 1,
  pageSize: 10,
  keyword: "",
  status: "",
  ownerId: "",
});
const rows = ref<WebsiteInquiry[]>([]);
const total = ref(0);
const loading = ref(false);
const error = ref("");
const owners = ref<WebsiteOwnerOption[]>([]);
const cities = ref<WebsiteCity[]>([]);
const editorVisible = ref(false);
const editingRecord = ref<WebsiteInquiry>();
const editorReadOnly = ref(false);
const saving = ref(false);
const historyVisible = ref(false);
const historyRecord = ref<WebsiteInquiry>();
const transferVisible = ref(false);
const transferRecord = ref<WebsiteInquiry>();
const allowAssign = computed(() => can("website:inquiry:transfer"));
function can(permission: string) {
  return hasUserPermission(user.userInfo, permission);
}
let generation = 0;
async function load() {
  const current = ++generation;
  loading.value = true;
  error.value = "";
  try {
    const result = await websiteService.inquiries(query);
    if (current === generation) {
      rows.value = result.list;
      total.value = result.total;
    }
  } catch (cause) {
    if (current === generation) error.value = websiteErrorMessage(cause);
  } finally {
    if (current === generation) loading.value = false;
  }
}
function search() {
  query.page = 1;
  void load();
}
watch([() => query.keyword, () => query.status, () => query.ownerId], search);
function reset() {
  const hasFilter = Boolean(query.keyword || query.status || query.ownerId);
  Object.assign(query, { keyword: "", status: "", ownerId: "" });
  if (!hasFilter) search();
}
function openEditor(record?: WebsiteInquiry, readOnly = false) {
  editingRecord.value = record;
  editorReadOnly.value = readOnly;
  editorVisible.value = true;
}
function openItineraries(record: WebsiteInquiry) {
  void router.push({
    name: "InquiryItineraries",
    params: { inquiryId: record.id },
    query: { module: "website" },
  });
}
async function save(input: WebsiteInquiryInput) {
  if (saving.value) return;
  saving.value = true;
  try {
    if (editingRecord.value)
      await websiteService.updateInquiry(
        editingRecord.value.id,
        input,
        editingRecord.value.version,
      );
    else await websiteService.createInquiry(input);
    editorVisible.value = false;
    ElMessage.success("已保存");
    await load();
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  } finally {
    saving.value = false;
  }
}
async function archive(record: WebsiteInquiry) {
  try {
    await ElMessageBox.confirm(`归档 ${record.code} 后仅可查看，是否继续？`, "归档询盘", {
      type: "warning",
      confirmButtonText: "归档",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  try {
    await websiteService.archive(record.id, record.version);
    await load();
    ElMessage.success("已归档");
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  }
}
async function markLost(record: WebsiteInquiry) {
  let reason: string;
  try {
    const result = await ElMessageBox.prompt("请填写流失原因", "标记流失", {
      inputValidator: (value) => Boolean(value?.trim()) || "请填写原因",
      confirmButtonText: "确认",
      cancelButtonText: "取消",
    });
    reason = result.value;
  } catch {
    return;
  }
  try {
    await websiteService.updateInquiry(
      record.id,
      { ...websiteInquiryInput(record), status: "lost", lostReason: reason },
      record.version,
    );
    await load();
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  }
}
onMounted(async () => {
  void load();
  try {
    const config = await websiteService.config();
    cities.value = config.cities.filter((city) => city.status === "enabled");
    if (allowAssign.value || user.userInfo.scope === "headquarters")
      owners.value = await websiteService.owners();
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  }
});
</script>
