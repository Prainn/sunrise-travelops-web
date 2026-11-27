<template>
  <SectionCard :title="$t('whatsapp.customer')" padding="compact" class="min-h-0 overflow-y-auto overscroll-contain">
    <el-descriptions :column="1" size="small" border>
      <el-descriptions-item :label="$t('whatsapp.name')">
        {{ detail.customerName || $t("common.notSet") }}
      </el-descriptions-item>
      <el-descriptions-item :label="$t('mail.customerEmail')">
        <span class="break-all">{{ detail.customerEmail }}</span>
      </el-descriptions-item>
      <el-descriptions-item :label="$t('whatsapp.lastInboundAt')">
        {{ formatShanghaiDateTime(incoming.at(-1)?.occurredAt) }}
      </el-descriptions-item>
      <el-descriptions-item :label="$t('whatsapp.owner')">
        {{ detail.ownerName || $t("whatsapp.views.unassigned") }}
      </el-descriptions-item>
    </el-descriptions>
    <el-button
      v-if="detail.canAssign"
      class="mt-[12px]"
      type="primary"
      @click="assignVisible = true"
    >
      {{ $t(detail.ownerId ? "whatsapp.reassign" : "whatsapp.assign") }}
    </el-button>

    <InboxBusinessLinks
      :inquiry-id="detail.inquiryId"
      :ledger="detail.ledger"
      :can-create-inquiry="detail.canCreateInquiry && !!source"
      :can-view-inquiry="hasUserPermission(user.userInfo, 'website:inquiry:list')"
      :can-create-ledger="detail.canCreateLedger"
      :needs-owner="!detail.ownerId"
      :busy="inquiryBusy || notes.saving.value"
      @create-inquiry="openInquiry"
      @view-inquiry="id => openUserPage(router, { name: 'WebsiteInquiryList', query: { inquiryId: id } })"
      @create-ledger="id => openUserPage(router, { name: 'WebsiteLedger', query: { websiteInquiryId: id } })"
      @view-ledger="orderNo => openUserPage(router, { name: 'WebsiteLedger', query: { keyword: orderNo } })"
    />
    <el-form
      v-if="incoming.length > 1"
      class="mt-[12px]"
      label-position="top"
      size="small"
    >
      <el-form-item :label="$t('mail.original')">
        <el-select
          :model-value="source?.id"
          :disabled="notes.saving.value || inquiryBusy"
          :aria-label="$t('mail.original')"
          autocomplete="new-password"
          @change="id => emit('select-source', id)"
        >
          <el-option
            v-for="message in incoming"
            :key="message.id"
            :value="message.id"
            :label="[formatShanghaiDateTime(message.occurredAt), message.sender.name || message.sender.email, message.subject || $t('mail.noSubject')].join('  ')"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <CustomerNotesPanel
      v-if="source"
      :notes="notes"
      :cities="cities"
      :editable="detail.canUpdateCustomer"
      contact-read-only
      refresh-on-conflict-only
      @save="saveNotes"
      @refresh="refreshNotes"
    />
    <template v-if="detail.assignments.length">
      <h4 class="mt-[16px] mb-[8px] text-[14px] text-strong font-600">
        {{ $t("mail.assignments") }}
      </h4>
      <div
        v-for="assignment in detail.assignments"
        :key="assignment.at"
        class="border-b border-b-solid border-[var(--el-border-color-lighter)] py-[6px] text-[12px]"
      >
        <div class="text-muted">
          {{ formatShanghaiDateTime(assignment.at) }} {{ assignment.actor }}
        </div>
        <div>{{ assignment.previousOwner || $t("whatsapp.views.unassigned") }} → {{ assignment.owner }}</div>
        <div class="whitespace-pre-wrap break-words">
          {{ assignment.reason }}
        </div>
      </div>
    </template>
    <Teleport to="body">
      <AssignDialog
        v-model="assignVisible"
        channel="mail"
        :conversation-id="detail.id"
        :version="detail.version"
        :current-owner-name="detail.ownerName"
        @changed="emit('changed')"
      />
      <WebsiteInquiryEditor
        v-model="inquiryVisible"
        :initial-values="prefill"
        prefill-source="email"
        :assigned-owner-name="detail.ownerName"
        business-unit="website"
        :show-business="false"
        :owners="[]"
        :cities="cities"
        :allow-assign="false"
        :saving="inquiryBusy"
        :read-only="false"
        @save="createInquiry"
      />
    </Teleport>
  </SectionCard>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox } from "element-plus";
import { ApiError } from "@/api/request";
import SectionCard from "@/components/SectionCard/index.vue";
import { mailService } from "@/services/mail.service";
import { websiteErrorMessage, websiteService } from "@/services/website.service";
import { useUserStore } from "@/stores/user";
import type { MailDetail } from "@/types/mail";
import type { WebsiteCity, WebsiteInquiryInput } from "@/types/website";
import { formatShanghaiDateTime } from "@/utils/format";
import { hasUserPermission } from "@/utils/permission";
import { openUserPage } from "@/utils/user-interaction";
import InboxBusinessLinks from "@/views/website-inquiries/components/InboxBusinessLinks.vue";
import WebsiteInquiryEditor from "@/views/website-inquiries/components/WebsiteInquiryEditor.vue";
import AssignDialog from "@/views/whatsapp/components/AssignDialog.vue";
import CustomerNotesPanel from "@/views/whatsapp/components/CustomerNotesPanel.vue";
import { useCustomerNotes } from "@/views/whatsapp/useCustomerNotes";

const props = defineProps<{ detail: MailDetail; sourceId?: string }>();
const emit = defineEmits<{ changed: []; "select-source": [id: string] }>();
const { t } = useI18n();
const router = useRouter();
const user = useUserStore();
const incoming = computed(() => props.detail.messages.filter(message => message.direction === "inbound"));
const source = computed(() => incoming.value.find(message => message.id === props.sourceId));
const deliveredMessageIds = computed(() => props.detail.messages
  .filter(message => message.state === "received" || message.state === "sent")
  .map(message => message.id).join(","));
const notes = useCustomerNotes({
  page: "MailInbox",
  service: {
    customerNotes: id => mailService.customerNotes(props.detail.id, id),
    saveCustomerNotes: (id, input) => mailService.saveCustomerNotes(props.detail.id, id, input),
  },
});
const assignVisible = ref(false);
const inquiryVisible = ref(false);
const inquiryBusy = ref(false);
const inquirySource = ref("");
const inquiryVersion = ref(0);
const prefill = ref<Partial<WebsiteInquiryInput>>();
const cities = ref<WebsiteCity[]>([]);
let configRequest: Promise<void> | undefined;
function loadCities() {
  configRequest ??= websiteService.config(undefined, "website").then(config => {
    cities.value = config.cities.filter(city => city.status === "enabled");
  }).catch(cause => {
    configRequest = undefined;
    throw cause;
  });
  return configRequest;
}
onMounted(() => { void loadCities().catch(cause => ElMessage.error(websiteErrorMessage(cause))); });
watch(
  [() => source.value?.id, () => props.detail.version, deliveredMessageIds],
  ([id, version, delivered], [previousId, previousVersion, previousDelivered]) => {
    notes.select(id ?? "", version);
    if (id && id === previousId && version === previousVersion && delivered !== previousDelivered) {
      void notes.load(id);
    }
  },
  { immediate: true },
);

async function saveNotes() {
  const result = await notes.save();
  if (!result) return result;
  if (result.kind === "saved") {
    ElMessage.success(t("common.saveSuccess"));
    emit("changed");
  } else if (result.kind === "conflict") {
    ElMessage.warning(t("whatsapp.versionConflictKeepInput", { message: result.message }));
  } else ElMessage.error(result.message);
  return result;
}

async function refreshNotes() {
  const id = source.value?.id;
  if (!id) return;
  if (notes.dirty.value || notes.entry.value?.conflict) {
    try {
      await ElMessageBox.confirm(t("whatsapp.customerNotesRefreshConfirm"), t("common.warning"), { type: "warning" });
    } catch { return; }
  }
  await notes.load(id, true);
  emit("changed");
}

async function openInquiry() {
  const message = source.value;
  if (!message || inquiryBusy.value || notes.saving.value) return;
  if (notes.entry.value?.conflict) {
    ElMessage.warning(t("whatsapp.customerNotesConflict"));
    return;
  }
  if (notes.dirty.value && props.detail.canUpdateCustomer) {
    const savedResult = await saveNotes();
    if (savedResult?.kind !== "saved" || message.id !== source.value?.id) return;
  }
  inquiryBusy.value = true;
  try {
    const [saved] = await Promise.all([mailService.customerNotes(props.detail.id, message.id), loadCities()]);
    if (message.id !== source.value?.id) return;
    inquirySource.value = message.id;
    inquiryVersion.value = saved.version;
    prefill.value = {
      customerName: saved.customerName, contactInfo: saved.contactInfo,
      receivedAt: formatShanghaiDateTime(message.occurredAt), requirements: saved.requirements,
      countryItemId: saved.countryItemId ?? "", plannedDays: saved.plannedDays ?? undefined,
      startDate: saved.startDate, pax: saved.pax, destinations: saved.destinations,
      internalRemark: saved.internalRemark, contactChannel: "Email", acquisitionSource: "",
    };
    inquiryVisible.value = true;
  } catch (cause) { ElMessage.error(websiteErrorMessage(cause)); }
  finally { inquiryBusy.value = false; }
}

async function createInquiry(input: WebsiteInquiryInput) {
  if (inquiryBusy.value) return;
  inquiryBusy.value = true;
  try {
    const result = await mailService.inquiry(props.detail.id, inquirySource.value, input, inquiryVersion.value);
    ElMessage.success(t(result.created ? "whatsapp.inquiryCreated" : "whatsapp.inquiryExisting"));
    inquiryVisible.value = false;
    emit("changed");
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 409) {
      ElMessage.warning(t("whatsapp.versionConflict", { message: websiteErrorMessage(cause) }));
      try {
        const latest = await mailService.detail(props.detail.id);
        inquiryVersion.value = latest.version;
        if (!latest.canCreateInquiry) inquiryVisible.value = false;
      } catch (reloadError) {
        ElMessage.error(websiteErrorMessage(reloadError));
        if (reloadError instanceof ApiError && [403, 404].includes(reloadError.status ?? 0)) inquiryVisible.value = false;
      }
      emit("changed");
    } else ElMessage.error(websiteErrorMessage(cause));
  } finally { inquiryBusy.value = false; }
}
</script>
