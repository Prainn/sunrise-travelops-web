<template>
  <PageShell>
    <FilterBar :model="query" @reset="resetQuery">
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
    <InboxSplitLayout
      ref="splitLayout"
      :has-info="Boolean(detail)"
      :list-collapse-label="$t('mail.collapseThreads')"
      :list-expand-label="$t('mail.expandThreads')"
      :info-collapse-label="$t('whatsapp.collapseCustomer')"
      :info-expand-label="$t('whatsapp.expandCustomer')"
    >
      <template #list>
        <SectionCard
          fill
          padding="none"
          class="mail-inbox__list w-full h-full"
          :aria-label="$t('mail.threadList')"
        >
          <TableToolbar class="mail-inbox__toolbar" :refreshing="accountsLoading || listLoading" @refresh="refreshInbox">
            <el-select
              v-if="accounts?.canSwitch"
              class="mail-inbox__account"
              :model-value="activeMailbox"
              :aria-label="$t('mail.account')"
              :placeholder="$t('mail.noAccounts')"
              :disabled="!accounts.mailboxes.length"
              autocomplete="new-password"
              @change="switchMailbox"
            >
              <template #prefix>
                <el-icon aria-hidden="true">
                  <Message />
                </el-icon>
              </template>
              <el-option
                v-for="address in accounts.mailboxes"
                :key="address"
                :value="address"
                :label="address"
              />
            </el-select>
            <h2 v-else class="m-0 truncate text-base font-600">
              {{ accounts?.mailboxes.length === 1 ? accounts.mailboxes[0] : $t("route.mailInbox") }}
            </h2>
          </TableToolbar>
          <div
            v-loading="(accountsLoading || listLoading) && !rows.length"
            class="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <FeedbackState
              v-if="accountsError || listError"
              type="error"
              :description="accountsError || listError"
              retryable
              @retry="refreshInbox"
            />
            <MailThreadList
              v-else-if="rows.length"
              :threads="rows"
              :selected="threadId"
              :show-mailbox="!activeMailbox && accounts?.mailboxes.length !== 1"
              @select="openThread"
            />
            <FeedbackState
              v-else-if="!accountsLoading && !listLoading && !accountsError && !listError"
              :type="keyword || query.view !== 'all' ? 'no-match' : 'empty'"
            />
          </div>
          <Pagination
            v-model:limit="query.pageSize"
            :page="query.page"
            class="mail-inbox__pagination"
            variant="compact"
            layout="total, sizes, ->, prev, pager, next"
            :total="total"
            @update:page="changePage"
          />
        </SectionCard>
      </template>
      <SectionCard fill padding="none" class="mail-inbox__reader min-w-0">
        <MailThread
          v-if="detail"
          :key="detail.id"
          :detail="detail"
          :selected="sourceMessage"
          @refresh="refreshThread"
        />
        <div v-else v-loading="detailLoading" class="grid min-h-0 flex-1 place-items-center">
          <FeedbackState
            v-if="detailError"
            type="error"
            :description="detailError"
            retryable
            @retry="loadSelected()"
          />
          <FeedbackState v-else-if="!detailLoading" :title="$t('mail.selectThread')" />
        </div>
      </SectionCard>
      <template #info>
        <MailCustomerInfo
          v-if="detail"
          :key="detail.id"
          class="w-full h-full"
          :detail="detail"
          :source-id="selectedSource"
          @select-source="selectSource"
          @changed="refreshThread"
        />
      </template>
    </InboxSplitLayout>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, toRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { refDebounced } from "@vueuse/core";
import { ElMessage } from "element-plus";
import { Message } from "@element-plus/icons-vue";
import FeedbackState from "@/components/FeedbackState/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { mailService } from "@/services/mail.service";
import { websiteErrorMessage } from "@/services/website.service";
import { useMailUnreadStore } from "@/stores/mail-unread";
import { useUserStore } from "@/stores/user";
import type { MailboxOptions, MailDetail, MailThread as MailThreadItem, MailView } from "@/types/mail";
import { hasUserPermission } from "@/utils/permission";
import { ApiError } from "@/api/request";
import InboxSplitLayout from "@/views/website-inquiries/components/InboxSplitLayout.vue";
import MailCustomerInfo from "./MailCustomerInfo.vue";
import MailThread from "./MailThread.vue";
import MailThreadList from "./MailThreadList.vue";

defineOptions({ name: "MailInbox" });

const user = useUserStore();
const mailUnread = useMailUnreadStore();
const route = useRoute();
const router = useRouter();
const views: MailView[] = ["all", "unassigned", "mine"];
const manager = computed(() => hasUserPermission(user.userInfo, "mail:thread:assign"));
const query = reactive({ page: 1, pageSize: 20, keyword: "", view: "all" as MailView });
const keyword = refDebounced(toRef(query, "keyword"), 250);
const accounts = ref<MailboxOptions>();
const accountsLoading = ref(false);
const accountsError = ref("");
const rows = ref<MailThreadItem[]>([]);
const total = ref(0);
const listLoading = ref(false);
const listError = ref("");
const detail = ref<MailDetail>();
const detailLoading = ref(false);
const selectedSource = ref("");
const splitLayout = ref<InstanceType<typeof InboxSplitLayout>>();
const detailError = ref("");
const threadId = computed(() => typeof route.query.thread === "string" ? route.query.thread : undefined);
const sourceMessage = computed(() => typeof route.query.message === "string" ? route.query.message : undefined);
const activeMailbox = computed(() => {
  if (!accounts.value?.canSwitch) return undefined;
  const { mailboxes } = accounts.value;
  // An inquiry can link directly to a message in another mailbox.
  const address = detail.value && detail.value.id === threadId.value ? detail.value.mailbox : route.query.mailbox;
  return typeof address === "string" && mailboxes.includes(address) ? address : mailboxes[0];
});

let listRequest = 0;
let detailRequest = 0;
let timer: ReturnType<typeof setInterval>;

watch([activeMailbox, keyword, () => query.view], () => {
  query.page = 1;
  total.value = 0;
}, { flush: "sync" });
watch([keyword, () => query.view, () => query.pageSize], closeThread);
watch([() => !!accounts.value, activeMailbox, keyword, () => query.view, () => query.page, () => query.pageSize], () => {
  rows.value = [];
  void loadThreads();
});
watch(threadId, () => {
  selectedSource.value = "";
  void loadSelected();
}, { immediate: true });
watch(sourceMessage, id => {
  if (id && detail.value?.messages.some(message => message.id === id && message.direction === "inbound")) selectedSource.value = id;
});
function selectSource(id: string) {
  selectedSource.value = id;
  void router.replace({ query: { ...route.query, message: id } });
}

onMounted(() => {
  void refreshInbox();
  timer = setInterval(() => {
    if (document.hidden) return;
    if (!listLoading.value && !accountsLoading.value) void loadThreads(true);
    if (threadId.value && !detailLoading.value) void loadSelected(true);
  }, 30_000);
});
onUnmounted(() => {
  clearInterval(timer);
  listRequest++;
  detailRequest++;
});

async function refreshInbox() {
  if (accountsLoading.value) return;
  accountsLoading.value = true;
  const previous = activeMailbox.value;
  const hadAccounts = !!accounts.value;
  try {
    accounts.value = await mailService.mailboxes();
    accountsError.value = "";
    if (hadAccounts && previous === activeMailbox.value) await loadThreads();
  } catch (cause) {
    accountsError.value = websiteErrorMessage(cause);
  } finally {
    accountsLoading.value = false;
  }
}

async function loadThreads(background = false) {
  if (!accounts.value) return;
  const current = ++listRequest;
  listLoading.value = true;
  listError.value = "";
  try {
    const result = await mailService.list({
      page: query.page, pageSize: query.pageSize, keyword: keyword.value,
      mailbox: activeMailbox.value, view: manager.value ? query.view : undefined,
    });
    if (current !== listRequest) return;
    rows.value = result.list;
    total.value = result.total;
  } catch (cause) {
    if (current !== listRequest) return;
    const authRejected = cause instanceof ApiError && [401, 403].includes(cause.status ?? 0);
    if (background && rows.value.length && !authRejected) return;
    if (authRejected) {
      rows.value = [];
      total.value = 0;
    }
    listError.value = websiteErrorMessage(cause);
  } finally {
    if (current === listRequest) listLoading.value = false;
  }
}

function switchMailbox(address: string) {
  void router.replace({ query: { ...route.query, mailbox: address, thread: undefined, message: undefined } });
}
function openThread(id: string) {
  splitLayout.value?.closeOverlayList();
  void router.replace({ query: { ...route.query, mailbox: activeMailbox.value, thread: id, message: undefined } });
}
function closeThread() {
  if (threadId.value) void router.replace({ query: { ...route.query, mailbox: activeMailbox.value, thread: undefined, message: undefined } });
}
function changePage(page: number) {
  if (query.page === page) return;
  query.page = page;
  closeThread();
}
function resetQuery() {
  query.keyword = "";
  query.view = "all";
  query.page = 1;
  closeThread();
}

async function loadSelected(background = false) {
  const id = threadId.value;
  const current = ++detailRequest;
  if (detail.value?.id !== id) detail.value = undefined;
  detailError.value = "";
  detailLoading.value = !!id;
  if (!id) return;
  try {
    const value = await mailService.detail(id);
    if (current !== detailRequest) return;
    detail.value = value;
    const incoming = value.messages.filter(message => message.direction === "inbound");
    if (!incoming.some(message => message.id === selectedSource.value)) {
      selectedSource.value = incoming.find(message => message.id === sourceMessage.value)?.id
        ?? value.sourceMessageId ?? incoming.at(-1)?.id ?? "";
    }
    if (value.unreadCount && (value.canReply || manager.value)) {
      await nextTick();
      if (current !== detailRequest) return;
      const unread = value.messages.filter(message => message.direction === "inbound" && !message.isRead);
      if (unread.length) {
        try {
          await mailService.read(id, unread.map(message => message.id));
        } catch (cause) {
          if (current === detailRequest) ElMessage.error(websiteErrorMessage(cause));
          return;
        }
        mailUnread.refresh();
        if (current === detailRequest) void loadThreads();
      }
    }
  } catch (cause) {
    if (current !== detailRequest) return;
    if (background && detail.value && !(cause instanceof ApiError && [403, 404].includes(cause.status ?? 0))) return;
    detail.value = undefined;
    detailError.value = websiteErrorMessage(cause);
  } finally {
    if (current === detailRequest) detailLoading.value = false;
  }
}
function refreshThread() {
  mailUnread.refresh();
  void loadThreads();
  void loadSelected();
}
</script>

<style scoped lang="scss">
.mail-inbox__list,
.mail-inbox__reader {
  :deep(> .section-card__body) { gap: 0; }
}
.mail-inbox__list :deep(.mail-inbox__toolbar) {
  padding: 10px 12px;
}
.mail-inbox__account { width: 100%; }
.mail-inbox__pagination {
  padding: 8px;
  border-block-start: 1px solid var(--divider-color);

  :deep(.el-pagination) { flex-wrap: wrap; justify-content: center; row-gap: 4px; }
  :deep(.el-pagination__rightwrapper) { margin-inline-start: 0; }
}
</style>
