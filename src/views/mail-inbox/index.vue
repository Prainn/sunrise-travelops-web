<template>
  <PageShell>
    <FilterBar :model="query" @reset="reset">
      <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
        <el-input v-model="query.keyword" :placeholder="$t('mail.searchHint')" clearable />
      </el-form-item>
      <el-form-item v-if="manager" :label="$t('whatsapp.view')">
        <el-select v-model="query.view" autocomplete="new-password">
          <el-option
            v-for="value in views"
            :key="value"
            :value="value"
            :label="$t('whatsapp.views.' + value)"
          />
        </el-select>
      </el-form-item>
    </FilterBar>
    <SectionCard fill>
      <TableToolbar title="biz@lynxtour.cn" :refreshing="loading" @refresh="load" />
      <el-alert
        v-if="error && rows.length"
        type="error"
        :closable="false"
        :title="error"
      />
      <DataTable
        :data="rows"
        row-key="id"
        fill
        :loading="loading"
        :error="error"
        :filtered="!!query.keyword"
        @retry="load"
      >
        <el-table-column :label="$t('mail.subject')" min-width="220">
          <template #default="{ row }">
            <el-button link type="primary" @click="openThread(row.id)">
              {{ row.subject || $t("mail.noSubject") }}
            </el-button>
            <el-tag v-if="row.unreadCount" size="small">
              {{ $t("mail.unread", { count: row.unreadCount }) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('mail.from')" min-width="190">
          <template #default="{ row }">
            {{ row.customerName }} {{ row.customerEmail }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('mail.lastAt')" min-width="155">
          <template #default="{ row }">
            {{ formatShanghaiDateTime(row.lastAt) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('inquiry.owner')" min-width="100">
          <template #default="{ row }">
            {{ row.ownerName || $t("whatsapp.views.unassigned") }}
          </template>
        </el-table-column>
      </DataTable>
      <Pagination
        v-model:page="query.page"
        v-model:limit="query.pageSize"
        :total="total"
        @pagination="load"
      />
    </SectionCard>
    <MailThread
      v-if="detail"
      :key="detail.id"
      :detail="detail"
      :selected="sourceMessage"
      @close="closeThread"
      @refresh="refreshAll"
    />
  </PageShell>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useDebounceFn } from "@vueuse/core";
import PageShell from "@/components/PageShell/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import { useMailUnreadStore } from "@/stores/mail-unread";
import { useUserStore } from "@/stores/user";
import { hasUserPermission } from "@/utils/permission";
import { formatShanghaiDateTime } from "@/utils/format";
import { mailService } from "@/services/mail.service";
import { websiteErrorMessage } from "@/services/website.service";
import type { MailDetail, MailThread as MailThreadItem, MailView } from "@/types/mail";
import MailThread from "./MailThread.vue";

defineOptions({ name: "MailInbox" });
const user = useUserStore();
const mailUnread = useMailUnreadStore();
const manager = computed(() => hasUserPermission(user.userInfo, "mail:thread:assign"));
const route = useRoute();
const router = useRouter();
const views: MailView[] = ["all", "unassigned", "mine"];
const query = reactive({ page: 1, pageSize: 20, keyword: "", view: "all" as MailView });
const rows = ref<MailThreadItem[]>([]);
const total = ref(0);
const loading = ref(false);
const error = ref("");
const detail = ref<MailDetail>();
const sourceMessage = computed(() => typeof route.query.message === "string" ? route.query.message : undefined);
let generation = 0;
let selectedRequest = 0;
async function load() {
  const current = ++generation;
  loading.value = true;
  try {
    const result = await mailService.list({ ...query, view: manager.value ? query.view : undefined });
    if (current === generation) { rows.value = result.list; total.value = result.total; error.value = ""; }
  } catch (cause) { if (current === generation) error.value = websiteErrorMessage(cause); }
  finally { if (current === generation) loading.value = false; }
}
const search = useDebounceFn(() => { query.page = 1; void load(); }, 250);
watch(() => [query.keyword, query.view], search);
function reset() { query.keyword = ""; query.view = "all"; query.page = 1; void load(); }
function openThread(id: string) { void router.replace({ query: { thread: id } }); }
function closeThread() { void router.replace({ query: {} }); }
async function loadSelected() {
  const id = route.query.thread;
  const current = ++selectedRequest;
  if (typeof id !== "string") { detail.value = undefined; return; }
  if (detail.value?.id !== id) detail.value = undefined;
  try {
    const value = await mailService.detail(id);
    if (current !== selectedRequest) return;
    detail.value = value;
    if (value.unreadCount && (value.canReply || manager.value)) {
      const unread = value.messages.filter(message => message.direction === "inbound" && !message.isRead);
      await mailService.read(id, unread.map(message => message.id));
      mailUnread.refresh();
      await load();
    }
  } catch (cause) {
    if (current === selectedRequest) { detail.value = undefined; ElMessage.error(websiteErrorMessage(cause)); closeThread(); }
  }
}
function refreshAll() { mailUnread.refresh(); void load(); void loadSelected(); }
watch(() => route.query.thread, loadSelected, { immediate: true });
let timer: ReturnType<typeof setInterval>;
onMounted(() => {
  void load();
  timer = setInterval(() => { if (!document.hidden && !loading.value) void load(); }, 30000);
});
onUnmounted(() => { clearInterval(timer); selectedRequest++; generation++; });
</script>
