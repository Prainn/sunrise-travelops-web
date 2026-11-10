<template>
  <PageShell>
    <FilterBar @reset="resetFilters">
      <el-form-item v-if="viewOptions.length" :label="$t('whatsapp.view')">
        <el-select v-model="workbench.view.value" autocomplete="new-password">
          <el-option
            v-for="option in viewOptions"
            :key="option"
            :value="option"
            :label="$t(`whatsapp.views.${option}`)"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
        <el-input
          v-model="workbench.keyword.value"
          :placeholder="$t('whatsapp.keywordPlaceholder')"
          clearable
        />
      </el-form-item>
      <el-form-item :label="$t('common.status')">
        <el-select
          :model-value="workbench.state.value"
          autocomplete="new-password"
          clearable
          :placeholder="$t('whatsapp.statePlaceholder')"
          @update:model-value="workbench.state.value = $event || undefined"
        >
          <el-option
            v-for="option in STATE_OPTIONS"
            :key="option"
            :value="option"
            :label="$t(`whatsapp.states.${option}`)"
          />
        </el-select>
      </el-form-item>
    </FilterBar>
    <div class="whatsapp-workbench__split">
      <aside class="whatsapp-workbench__list">
        <ConversationList
          v-model:page="workbench.page.value"
          v-model:page-size="workbench.pageSize.value"
          :items="workbench.conversations.value"
          :selected-id="workbench.selectedId.value"
          :loading="workbench.listLoading.value"
          :error="workbench.listError.value"
          :total="workbench.total.value"
          @select="handleSelect"
          @refresh="workbench.refreshNow"
        />
      </aside>
      <div class="whatsapp-workbench__content">
        <el-alert
          v-if="integration && !integration.enabled"
          type="warning"
          :closable="false"
          show-icon
          :title="$t('whatsapp.integrationDisabled')"
        />
        <SectionCard v-if="!detail" v-loading="workbench.threadLoading.value" fill>
          <FeedbackState
            v-if="workbench.threadError.value"
            type="error"
            :title="threadErrorTitle"
            :description="workbench.threadError.value.message"
          />
          <FeedbackState v-else-if="!workbench.threadLoading.value" :title="$t('whatsapp.selectConversation')" />
        </SectionCard>
        <div v-else class="whatsapp-workbench__body">
          <ConversationThread
            class="flex-1 min-w-0"
            :detail="detail"
            :messages="workbench.messages.value"
            :pending="workbench.pending.value"
            :has-older="workbench.hasOlder.value"
            :older-loading="workbench.olderLoading.value"
            :retrying-ids="workbench.retryingIds.value"
            :confirming-ids="confirmingIds"
            @send="handleSend"
            @react="handleReact"
            @resubmit="handleResubmit"
            @discard="workbench.discardPending"
            @retry="handleRetry"
            @confirm-failed="handleConfirmFailed"
            @load-older="handleLoadOlder"
            @open-conversation="handleSelect"
            @displayed="workbench.markDisplayed"
          />
          <ConversationInfo
            class="whatsapp-workbench__info"
            :detail="detail"
            :can-update-state="can('whatsapp:conversation:update')"
            :can-view-inquiry="can('website:inquiry:list')"
            :can-create-ledger="can('ledger:direct:create')"
            :busy="actionBusy"
            :show-actions="isManager"
            :actions="actions"
            @assign="assignVisible = true"
            @set-state="handleSetState"
            @start-consultation="handleStartConsultation"
            @create-inquiry="handleCreateInquiry"
            @view-inquiry="(id) => router.push({ name: 'WebsiteInquiryList', query: { inquiryId: id } })"
            @create-ledger="(id) => router.push({ name: 'WebsiteLedger', query: { websiteInquiryId: id } })"
            @view-ledger="(orderNo) => router.push({ name: 'WebsiteLedger', query: { keyword: orderNo } })"
            @open-conversation="handleSelect"
          >
            <template #notes>
              <CustomerNotesPanel
                :notes="customerNotes"
                :cities="cities"
                :editable="detail.state !== 'archived' && Boolean(detail.capabilities.canUpdateCustomer)"
                @save="handleSaveNotes"
                @refresh="handleRefreshNotes"
              />
            </template>
          </ConversationInfo>
        </div>
      </div>
    </div>
    <AssignDialog
      v-if="detail"
      v-model="assignVisible"
      :conversation-id="detail.id"
      :version="detail.version"
      :current-owner-name="detail.ownerName"
      @changed="refreshSelected"
    />
    <WebsiteInquiryEditor
      v-model="inquiryVisible"
      :initial-values="inquiryDraft"
      source-read-only
      business-unit="website"
      :show-business="false"
      :owners="[]"
      :cities="cities"
      :allow-assign="false"
      :saving="inquirySaving"
      :read-only="false"
      @save="handleInquirySave"
    />
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import { ApiError } from "@/api/request";
import FeedbackState from "@/components/FeedbackState/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import { websiteErrorMessage, websiteService } from "@/services/website.service";
import { whatsappService } from "@/services/whatsapp.service";
import { useUserStore } from "@/stores/user";
import type { WebsiteCity, WebsiteInquiryInput } from "@/types/website";
import type {
  WhatsappAction,
  WhatsappConversationState,
  WhatsappConversationView,
  WhatsappIntegrationStatus,
  WhatsappMessage,
  WhatsappReply,
} from "@/types/whatsapp";
import WebsiteInquiryEditor from "@/views/website-inquiries/components/WebsiteInquiryEditor.vue";
import { useCustomerNotes } from "../useCustomerNotes";
import { useWhatsappWorkbench, type SendFeedback } from "../useWhatsappWorkbench";
import AssignDialog from "./AssignDialog.vue";
import ConversationInfo from "./ConversationInfo.vue";
import CustomerNotesPanel from "./CustomerNotesPanel.vue";
import ConversationList from "./ConversationList.vue";
import ConversationThread from "./ConversationThread.vue";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const routeName = route.name;
const user = useUserStore();
const can = (permission: string) => user.userInfo.perms.includes(permission);
const isManager = can("whatsapp:conversation:assign");
const defaultView: WhatsappConversationView | undefined = isManager ? "all" : undefined;
const workbench = useWhatsappWorkbench({ defaultView });
const customerNotes = useCustomerNotes();

const STATE_OPTIONS: WhatsappConversationState[] = ["open", "closed", "archived"];
const viewOptions: WhatsappConversationView[] = isManager ? ["all", "unassigned", "mine"] : [];
const assignVisible = ref(false);
const actionBusy = ref(false);
const confirmingIds = ref(new Set<string>());
const actions = ref<WhatsappAction[]>([]);
const integration = ref<WhatsappIntegrationStatus | null>(null);
const inquiryVisible = ref(false);
const inquirySaving = ref(false);
const inquiryDraft = ref<Partial<WebsiteInquiryInput>>();
const inquiryVersion = ref(0);
const cities = ref<WebsiteCity[]>([]);
let actionsGeneration = 0;

const detail = computed(() => workbench.detail.value);
const threadErrorTitle = computed(() => {
  const kind = workbench.threadError.value?.kind;
  if (kind === "not-found") return t("whatsapp.notFound");
  if (kind === "forbidden") return t("whatsapp.forbidden");
  return t("common.loadFailed");
});

watch(() => detail.value?.id, () => {
  // 切换会话时关闭基于旧会话的弹窗，避免把操作提交到错误的咨询。
  assignVisible.value = false;
  inquiryVisible.value = false;
  void loadActions();
});

// 切换会话或会话版本前进（建询盘、状态变化等）时读取客户资料；未保存输入不被覆盖。
watch(() => [detail.value?.id, detail.value?.version] as const, ([id, version]) => {
  customerNotes.select(id ?? "", version ?? 0);
});

// 当前会话写入地址参数，刷新页面后恢复；页面缓存于其他标签时不改写别的路由。
watch(workbench.selectedId, (id) => {
  if (route.name !== routeName || (route.query.conversationId ?? "") === id) return;
  const query = { ...route.query, conversationId: id || undefined };
  void router.replace({ query });
});

onMounted(() => {
  workbench.start();
  const initialId = route.query.conversationId;
  if (typeof initialId === "string" && initialId) void workbench.selectConversation(initialId);
  void loadIntegration();
  void loadCities();
});

async function loadIntegration() {
  if (!can("whatsapp:integration:manage")) return;
  try {
    integration.value = await whatsappService.integration();
  } catch {
    integration.value = null;
  }
}
/** 目的地选项取独立站配置中的启用城市；读取失败时已选城市仍保留 ID。 */
async function loadCities() {
  try {
    const config = await websiteService.config(undefined, "website");
    cities.value = config.cities.filter((city) => city.status === "enabled");
  } catch {
    cities.value = [];
  }
}
async function handleSaveNotes() {
  const result = await customerNotes.save();
  if (!result) return;
  if (result.kind === "saved") {
    ElMessage.success(t("common.saveSuccess"));
    workbench.applyCustomerName(result.notes.conversationId, result.notes.customerName, result.notes.version);
    void loadActions();
  } else if (result.kind === "conflict") {
    // 保留用户输入，由用户确认后再刷新，不自动覆盖或重试。
    ElMessage.warning(t("whatsapp.versionConflictKeepInput", { message: result.message }));
  } else {
    ElMessage.error(result.message);
  }
}
async function handleRefreshNotes() {
  const id = customerNotes.conversationId.value;
  if (!id) return;
  if (customerNotes.dirty.value || customerNotes.entry.value?.conflict) {
    try {
      await ElMessageBox.confirm(t("whatsapp.customerNotesRefreshConfirm"), t("common.warning"), { type: "warning" });
    } catch {
      return;
    }
  }
  await customerNotes.load(id, true);
  if (id === detail.value?.id) await workbench.reloadSelected();
}
async function loadActions() {
  const id = detail.value?.id;
  const current = ++actionsGeneration;
  actions.value = [];
  if (!id || !isManager) return;
  try {
    const result = await whatsappService.actions(id, { page: 1, pageSize: 100 });
    if (current === actionsGeneration) actions.value = result.list;
  } catch {
    if (current === actionsGeneration) actions.value = [];
  }
}
function resetFilters() {
  workbench.keyword.value = "";
  workbench.state.value = undefined;
  workbench.view.value = defaultView;
}
function handleSelect(id: string) {
  void workbench.selectConversation(id);
}
async function refreshSelected() {
  await workbench.reloadSelected();
  workbench.refreshNow();
  void loadActions();
}
async function handleLoadOlder() {
  try {
    await workbench.loadOlder();
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  }
}
function notifySend(feedback: SendFeedback | undefined) {
  if (!feedback || feedback.kind === "queued") return;
  if (feedback.kind === "uncertain") ElMessage.warning(t("whatsapp.uncertainHint"));
  else if (feedback.message) ElMessage.error(feedback.message);
}
async function handleSend(text: string, replyTo?: WhatsappReply) {
  notifySend(await workbench.sendText(text, replyTo));
}
async function handleReact(message: WhatsappMessage, emoji: string) {
  notifySend(await workbench.sendReaction(message, emoji));
}
async function handleResubmit(clientRequestId: string) {
  notifySend(await workbench.resubmitPending(clientRequestId));
}
async function handleRetry(message: WhatsappMessage) {
  try {
    await ElMessageBox.confirm(t("whatsapp.retryConfirm"), t("common.warning"), { type: "warning" });
  } catch {
    return;
  }
  const feedback = await workbench.retryMessage(message);
  if (feedback.kind === "uncertain") ElMessage.warning(t("whatsapp.retryUncertain"));
  else if (feedback.kind === "rejected" && feedback.message) ElMessage.error(feedback.message);
}
async function handleConfirmFailed(message: WhatsappMessage) {
  if (confirmingIds.value.has(message.id)) return;
  try {
    await ElMessageBox.confirm(t("whatsapp.confirmFailedConfirm"), t("common.warning"), { type: "warning" });
  } catch {
    return;
  }
  confirmingIds.value = new Set(confirmingIds.value).add(message.id);
  try {
    await whatsappService.confirmFailed(message.conversationId, message.id);
    ElMessage.success(t("whatsapp.confirmFailedSuccess"));
    await refreshSelected();
  } catch (cause) {
    handleActionError(cause);
  } finally {
    const next = new Set(confirmingIds.value);
    next.delete(message.id);
    confirmingIds.value = next;
  }
}
/** 409 表示会话已更新或状态不允许，刷新后由用户重新决定。 */
function handleActionError(cause: unknown) {
  if (cause instanceof ApiError && cause.status === 409) {
    ElMessage.warning(t("whatsapp.versionConflict", { message: websiteErrorMessage(cause) }));
    void refreshSelected();
  } else if (cause instanceof ApiError && cause.status === 404) {
    ElMessage.error(t("whatsapp.notFound"));
    void refreshSelected();
  } else {
    ElMessage.error(websiteErrorMessage(cause));
  }
}
async function handleSetState(state: "open" | "closed") {
  const current = detail.value;
  if (!current || actionBusy.value) return;
  actionBusy.value = true;
  try {
    await whatsappService.setState(current.id, current.version, state);
    ElMessage.success(t("whatsapp.stateUpdated"));
    await refreshSelected();
  } catch (cause) {
    handleActionError(cause);
  } finally {
    actionBusy.value = false;
  }
}
async function handleStartConsultation() {
  const current = detail.value;
  if (!current || actionBusy.value) return;
  try {
    await ElMessageBox.confirm(t("whatsapp.startConsultationConfirm"), t("whatsapp.startConsultation"), { type: "warning" });
  } catch {
    return;
  }
  actionBusy.value = true;
  try {
    const result = await whatsappService.startConsultation(current.id, current.version);
    if (result.canView) {
      ElMessage.success(t("whatsapp.consultationStarted"));
      await workbench.selectConversation(result.id);
    } else {
      // 计调创建的新咨询须等待主管分配，不请求无权详情。
      ElMessage.success(t("whatsapp.consultationWaiting"));
      await workbench.selectConversation("");
    }
    workbench.refreshNow();
  } catch (cause) {
    handleActionError(cause);
  } finally {
    actionBusy.value = false;
  }
}
async function handleCreateInquiry() {
  const current = detail.value;
  if (!current || actionBusy.value) return;
  actionBusy.value = true;
  try {
    const [prefill, config] = await Promise.all([
      whatsappService.inquiryPrefill(current.id),
      websiteService.config(undefined, "website"),
    ]);
    if (current.id !== detail.value?.id) return;
    if (prefill.inquiryId) {
      ElMessage.info(t("whatsapp.inquiryExisting"));
      await refreshSelected();
      return;
    }
    inquiryVersion.value = prefill.version;
    // 未填国家或天数保持空白，由询盘表单必填校验拦截。
    inquiryDraft.value = {
      ...prefill.input,
      countryItemId: prefill.input.countryItemId ?? "",
      plannedDays: prefill.input.plannedDays ?? undefined,
    };
    cities.value = config.cities.filter((city) => city.status === "enabled");
    inquiryVisible.value = true;
  } catch (cause) {
    handleActionError(cause);
  } finally {
    actionBusy.value = false;
  }
}
async function handleInquirySave(input: WebsiteInquiryInput) {
  const current = detail.value;
  if (!current || inquirySaving.value) return;
  inquirySaving.value = true;
  try {
    const result = await whatsappService.createInquiry(current.id, input, inquiryVersion.value);
    ElMessage.success(t(result.created ? "whatsapp.inquiryCreated" : "whatsapp.inquiryExisting"));
    inquiryVisible.value = false;
    await refreshSelected();
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 409) {
      // 保留表单，读取最新版本后由用户确认再提交。
      ElMessage.warning(t("whatsapp.versionConflict", { message: websiteErrorMessage(cause) }));
      try {
        const prefill = await whatsappService.inquiryPrefill(current.id);
        inquiryVersion.value = prefill.version;
        if (prefill.inquiryId) inquiryVisible.value = false;
      } catch {
        inquiryVisible.value = false;
      }
      await refreshSelected();
    } else {
      ElMessage.error(websiteErrorMessage(cause));
    }
  } finally {
    inquirySaving.value = false;
  }
}
</script>

<style scoped lang="scss">
.whatsapp-workbench__split {
  display: flex;
  flex: 1 1 0;
  gap: var(--page-gap);
  min-height: 0;
}

.whatsapp-workbench__list {
  display: flex;
  flex: 0 0 320px;
  flex-direction: column;
  width: 320px;
  min-height: 0;
}

.whatsapp-workbench__content {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: var(--page-gap);
  min-width: 0;
  min-height: 0;
}

.whatsapp-workbench__body {
  display: flex;
  flex: 1 1 0;
  gap: var(--page-gap);
  min-height: 0;
}

.whatsapp-workbench__info {
  flex: 0 0 320px;
  width: 320px;
}

@media (width <= 900px) {
  .whatsapp-workbench__split {
    flex-direction: column;
  }

  .whatsapp-workbench__list {
    flex-basis: auto;
    width: 100%;
    max-height: 50vh;
  }
}

@media (width <= 1200px) {
  .whatsapp-workbench__body {
    flex-direction: column;
  }

  .whatsapp-workbench__info {
    flex-basis: auto;
    width: 100%;
  }
}
</style>
