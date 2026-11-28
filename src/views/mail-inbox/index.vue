<template>
  <PageShell>
    <FilterBar :model="query" @reset="resetQuery">
      <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
        <el-input v-model="query.keyword" :placeholder="$t('mail.searchHint')" clearable />
      </el-form-item>
      <el-form-item v-if="canViewAll" :label="$t('whatsapp.view')">
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
          <TableToolbar class="mail-inbox__toolbar" :refreshing="accountsLoading || listBusy" @refresh="refreshInbox">
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
            ref="scrollRoot"
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
            <InboxListLoadMore
              v-if="!accountsError && !listError"
              :root="scrollRoot"
              :has-more="hasMore"
              :busy="listBusy || accountsLoading"
              :loading="loadingMore"
              :error="loadMoreError"
              @load-more="inboxList.loadMore"
            />
          </div>
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
import InboxListLoadMore from "@/components/InboxListLoadMore/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { useInboxList } from "@/composables/useInboxList";
import { mailService } from "@/services/mail.service";
import { websiteErrorMessage } from "@/services/website.service";
import { useMailUnreadStore } from "@/stores/mail-unread";
import type { MailboxOptions, MailDetail, MailView } from "@/types/mail";
import { ApiError } from "@/api/request";
import InboxSplitLayout from "@/views/website-inquiries/components/InboxSplitLayout.vue";
import MailCustomerInfo from "./MailCustomerInfo.vue";
import MailThread from "./MailThread.vue";
import MailThreadList from "./MailThreadList.vue";

defineOptions({ name: "MailInbox" });

const mailUnread = useMailUnreadStore();
const route = useRoute();
const router = useRouter();
const views: MailView[] = ["all", "unassigned", "mine"];
const query = reactive({ keyword: "", view: "all" as MailView });
const keyword = refDebounced(toRef(query, "keyword"), 250);
const accounts = ref<MailboxOptions>();
const canViewAll = computed(() => accounts.value?.canSwitch === true);
const accountsLoading = ref(false);
const accountsError = ref("");
const scrollRoot = ref<HTMLElement>();
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
const inboxList = useInboxList(() => {
  const filters = { keyword: keyword.value, mailbox: activeMailbox.value, view: canViewAll.value ? query.view : undefined };
  return (page, pageSize) => mailService.list({ ...filters, page, pageSize });
});
const { items: rows, busy: listBusy, loading: listLoading, error: listError, hasMore, loadingMore, loadMoreError } = inboxList;

let detailRequest = 0;
let timer: ReturnType<typeof setInterval>;

watch([keyword, () => query.view], closeThread);
watch([() => !!accounts.value, activeMailbox, keyword, () => query.view, canViewAll], () => {
  inboxList.reset();
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
    if (!listBusy.value && !accountsLoading.value) void loadThreads(true);
    if (threadId.value && !detailLoading.value) void loadSelected(true);
  }, 30_000);
});
onUnmounted(() => {
  clearInterval(timer);
  inboxList.reset();
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
  await inboxList.refresh(background).catch(() => undefined);
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
function resetQuery() {
  const alreadyDefault = !keyword.value && query.view === "all";
  query.keyword = "";
  query.view = "all";
  if (alreadyDefault) {
    inboxList.reset();
    void loadThreads();
  }
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
    if (value.unreadCount && (value.canReply || canViewAll.value)) {
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
</style>
