<template>
  <AppDialog
    v-model="visible"
    :title="dialogTitle"
    size="lg"
    :busy="saving"
    destroy-on-close
    @open="resetForm"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      :disabled="readonly || saving"
      label-width="auto"
    >
      <el-row :gutter="12">
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.shengxu.recordDate')" prop="recordDate">
            <el-date-picker
              v-model="form.recordDate"
              type="date"
              value-format="YYYY-MM-DD"
              :placeholder="$t('common.selectPlaceholder')"
              class="w-full"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.shengxu.collectCoordinator')">
            <el-input :model-value="creatorName" disabled />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.shengxu.agency')" prop="agencyId">
            <RemoteSelect
              :model-value="form.agencyId"
              :load-options="loadAgencies"
              :selected-label="form.agencyName"
              :placeholder="$t('ledger.shengxu.agencyPlaceholder')"
              :clearable="false"
              class="w-full"
              @update:model-value="selectAgency"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.shengxu.region')">
            <el-input :model-value="regionText" disabled />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.shengxu.contact')" prop="contactId">
            <RemoteSelect
              v-model="form.contactId"
              :load-options="loadContacts"
              :query-key="form.agencyId"
              :selected-label="form.contactName"
              :disabled="!form.agencyId"
              :placeholder="
                $t(form.agencyId ? 'ledger.shengxu.contactPlaceholder' : 'ledger.shengxu.agencyFirst')
              "
              :clearable="false"
              class="w-full"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.shengxu.quoteSent')" prop="quoteSent">
            <el-radio-group v-model="form.quoteSent">
              <el-radio :value="true">
                {{ $t("common.yes") }}
              </el-radio>
              <el-radio :value="false">
                {{ $t("common.no") }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.shengxu.quotedGroups')" prop="quotedGroups">
            <el-input-number
              :model-value="form.quotedGroups"
              :min="0"
              :max="MAX_GROUPS"
              :precision="0"
              :step="1"
              :value-on-clear="null"
              controls-position="right"
              class="w-full"
              @update:model-value="form.quotedGroups = $event ?? null"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.shengxu.convertedGroups')" prop="convertedGroups">
            <el-input-number
              :model-value="form.convertedGroups"
              :min="0"
              :max="MAX_GROUPS"
              :precision="0"
              :step="1"
              :value-on-clear="null"
              controls-position="right"
              class="w-full"
              @update:model-value="form.convertedGroups = $event ?? null"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item :label="$t('ledger.shengxu.itinerary')" prop="itinerary">
        <el-input
          v-model="form.itinerary"
          type="textarea"
          :rows="3"
          maxlength="5000"
          show-word-limit
        />
      </el-form-item>
      <el-form-item :label="$t('ledger.shengxu.notConvertedReason')" prop="notConvertedReason">
        <el-input
          v-model="form.notConvertedReason"
          type="textarea"
          :rows="3"
          maxlength="2000"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="visible = false">
        {{ $t(readonly ? "common.close" : "common.cancel") }}
      </el-button>
      <el-button
        v-if="!readonly"
        type="primary"
        :loading="saving"
        @click="handleSubmit"
      >
        {{ $t("common.save") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import { isApiError } from "@/api/request";
import AppDialog from "@/components/AppDialog/index.vue";
import RemoteSelect from "@/components/RemoteSelect/index.vue";
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import { shengxuLedgerService } from "@/services/shengxu-ledger.service";
import { useUserStore } from "@/stores/user";
import type { ShengxuAgencyOption, ShengxuLedgerItem } from "@/types/shengxu-ledger";
import {
  emptyShengxuLedgerForm,
  MAX_GROUPS,
  shengxuLedgerFormFromItem,
  shengxuLedgerInput,
} from "../shengxu-ledger-form";

const props = defineProps<{
  /** 编辑或查看时为最新详情；新增为 null。 */
  ledger: ShengxuLedgerItem | null;
  readonly: boolean;
}>();
const emit = defineEmits<{ saved: [ledger: ShengxuLedgerItem] }>();
const visible = defineModel<boolean>({ required: true });

const { t } = useI18n();
const user = useUserStore();
const formRef = ref<FormInstance>();
const form = reactive(emptyShengxuLedgerForm());
const saving = ref(false);
/** 已加载的组团社选项，用于选中后带出地区快照。 */
const agencyOptions = new Map<string, ShengxuAgencyOption>();

const dialogTitle = computed(() => {
  if (!props.ledger) return t("ledger.shengxu.create");
  return t(props.readonly ? "ledger.shengxu.view" : "ledger.shengxu.edit");
});
const creatorName = computed(() => props.ledger?.creatorName ?? user.userInfo.nickname ?? "");
const regionText = computed(() => [form.countryOrRegion, form.city].filter(Boolean).join(" / "));
const rules = computed<FormRules>(() => {
  const required = (key: string) => ({
    required: true,
    message: t("ledger.required", { field: t(key) }),
    trigger: "change",
  });
  return {
    recordDate: [required("ledger.shengxu.recordDate")],
    agencyId: [required("ledger.shengxu.agency")],
    contactId: [required("ledger.shengxu.contact")],
    quotedGroups: [required("ledger.shengxu.quotedGroups")],
    convertedGroups: [required("ledger.shengxu.convertedGroups")],
  };
});

function resetForm() {
  agencyOptions.clear();
  Object.assign(
    form,
    props.ledger ? shengxuLedgerFormFromItem(props.ledger) : emptyShengxuLedgerForm(),
  );
  formRef.value?.clearValidate();
}

async function loadAgencies(query: RemoteOptionsQuery) {
  const result = await shengxuLedgerService.agencies({ ...query, ledgerId: props.ledger?.id });
  result.list.forEach((agency) => agencyOptions.set(agency.id, agency));
  return {
    total: result.total,
    list: result.list.map((agency) => ({
      id: agency.id,
      label: agency.name,
      description: [agency.countryOrRegion, agency.city].filter(Boolean).join(" / "),
    })),
  };
}

async function loadContacts(query: RemoteOptionsQuery) {
  if (!form.agencyId) return { list: [], total: 0 };
  const result = await shengxuLedgerService.contacts(form.agencyId, {
    ...query,
    ledgerId: props.ledger?.id,
  });
  return {
    total: result.total,
    list: result.list.map((contact) => ({
      id: contact.id,
      label: contact.name,
      description: contact.phone,
    })),
  };
}

// 改选组团社后旧联系人不再属于该社，必须重新选择；地区随新组团社带出。
function selectAgency(agencyId: string) {
  if (agencyId === form.agencyId) return;
  const agency = agencyOptions.get(agencyId);
  form.agencyId = agencyId;
  form.agencyName = agency?.name ?? "";
  form.countryOrRegion = agency?.countryOrRegion ?? "";
  form.city = agency?.city ?? "";
  form.contactId = "";
  form.contactName = "";
}

function showSaveError(error: unknown) {
  if (isApiError(error) && error.status === 409) {
    ElMessage.error(t(props.ledger ? "ledger.shengxu.updateConflict" : "ledger.shengxu.duplicate"));
    return;
  }
  ElMessage.error(error instanceof Error ? error.message : String(error));
}

async function handleSubmit() {
  if (saving.value) return;
  saving.value = true;
  try {
    const valid = await formRef.value?.validate().then(
      () => true,
      () => false,
    );
    if (!valid) return;
    const body = shengxuLedgerInput(form);
    const saved = props.ledger
      ? await shengxuLedgerService.update(props.ledger.id, {
        ...body,
        version: props.ledger.version,
      })
      : await shengxuLedgerService.create(body);
    ElMessage.success(t(props.ledger ? "common.updateSuccess" : "common.createSuccess"));
    emit("saved", saved);
    visible.value = false;
  } catch (error) {
    // 冲突或校验失败时保留草稿，由用户修改已有记录或刷新后再操作，不自动重试。
    showSaveError(error);
  } finally {
    saving.value = false;
  }
}
</script>
