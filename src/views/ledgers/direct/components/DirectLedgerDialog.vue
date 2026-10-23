<template>
  <AppDialog
    v-model="visible"
    :title="dialogTitle"
    size="lg"
    :busy="saving"
    destroy-on-close
    @open="resetForm"
  >
    <el-alert
      v-if="ledger?.reviewedAt || ledger?.operatedAt"
      :title="$t('ledger.direct.reviewedLocked')"
      type="info"
      :closable="false"
      show-icon
      class="mb-3!"
    />
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      :disabled="readonly || saving"
      label-width="auto"
    >
      <el-row :gutter="12">
        <el-col v-if="ledger" :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.direct.orderNo')">
            <el-input :model-value="ledger.orderNo" disabled />
          </el-form-item>
        </el-col>
        <el-col v-if="ledger" :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.direct.workflowStatus')">
            <el-input :model-value="$t(`ledger.direct.workflowStatuses.${ledger.workflowStatus}`)" disabled />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('identity.businessUnit')">
            <el-input :model-value="businessUnitName(businessUnit)" disabled />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.direct.receivedDate')" prop="receivedDate">
            <el-date-picker
              v-model="form.receivedDate"
              type="date"
              value-format="YYYY-MM-DD"
              :placeholder="$t('common.selectPlaceholder')"
              class="w-full"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.direct.receivedMonth')">
            <el-input :model-value="receivedMonth" disabled />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.direct.source')" prop="source">
            <el-input
              v-model="form.source"
              :placeholder="sourcePlaceholder"
              maxlength="200"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.direct.creator')" :prop="isDelegate ? 'creatorId' : undefined">
            <RemoteSelect
              v-if="isDelegate"
              v-model="form.creatorId"
              :load-options="loadCollectors"
              :query-key="businessUnit"
              :placeholder="$t('ledger.direct.collectorPlaceholder')"
              :clearable="false"
              class="w-full"
            />
            <el-input v-else :model-value="creatorName" disabled />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item
            :label="$t('ledger.direct.receivingAccount')"
            :prop="isWebsite ? undefined : 'receivingGroupId'"
            :required="!isWebsite"
          >
            <!-- 独立站固定接单账号，不选择人员或业务组。 -->
            <el-input v-if="isWebsite" :model-value="$t('ledger.direct.websiteAccount')" disabled />
            <RemoteSelect
              v-else
              :model-value="form.receivingGroupId ?? ''"
              :load-options="loadReceivingGroups"
              :query-key="businessUnit"
              :selected-label="form.receivingAccountName"
              :placeholder="$t('ledger.direct.receivingGroupPlaceholder')"
              :clearable="false"
              class="w-full"
              @update:model-value="form.receivingGroupId = $event || null"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.direct.operator')" prop="operatorId">
            <RemoteSelect
              v-model="form.operatorId"
              :load-options="loadOperators"
              :query-key="businessUnit"
              :selected-label="form.operatorName"
              :placeholder="$t('ledger.direct.operatorPlaceholder')"
              :empty-text="$t('ledger.direct.noOperators')"
              :clearable="false"
              class="w-full"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.direct.orderStatus')" prop="orderStatus">
            <el-radio-group v-model="form.orderStatus" :disabled="!canChangeStatus">
              <el-radio value="unconverted">
                {{ $t("ledger.direct.orderStatuses.unconverted") }}
              </el-radio>
              <el-radio value="converted">
                {{ $t("ledger.direct.orderStatuses.converted") }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.direct.dealDate')">
            <el-date-picker
              v-model="form.dealDate"
              type="date"
              value-format="YYYY-MM-DD"
              :placeholder="$t('common.selectPlaceholder')"
              class="w-full"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('ledger.direct.departureDate')">
            <el-date-picker
              v-model="form.departureDate"
              type="date"
              value-format="YYYY-MM-DD"
              :placeholder="$t('common.selectPlaceholder')"
              class="w-full"
            />
          </el-form-item>
        </el-col>
        <el-col
          v-for="field in BOOLEAN_FIELDS"
          :key="field"
          :xs="24"
          :sm="12"
        >
          <el-form-item :label="$t(`ledger.direct.${field}`)">
            <el-radio-group v-model="form[field]">
              <el-radio :value="true">
                {{ $t("common.yes") }}
              </el-radio>
              <el-radio :value="false">
                {{ $t("common.no") }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col
          v-for="field in TRI_STATE_FIELDS"
          :key="field"
          :xs="24"
          :sm="12"
        >
          <el-form-item :label="$t(`ledger.direct.${field}`)">
            <el-radio-group
              :model-value="toTriState(form[field])"
              @update:model-value="form[field] = fromTriState($event as TriStateValue)"
            >
              <el-radio value="unset">
                {{ $t("ledger.direct.unset") }}
              </el-radio>
              <el-radio value="yes">
                {{ $t("common.yes") }}
              </el-radio>
              <el-radio value="no">
                {{ $t("common.no") }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item :label="$t('ledger.direct.itinerary')">
        <el-input
          v-model="form.itinerary"
          type="textarea"
          :rows="3"
          maxlength="5000"
          show-word-limit
        />
      </el-form-item>
      <el-form-item v-for="field in TEXT_FIELDS" :key="field" :label="$t(`ledger.direct.${field}`)">
        <el-input
          v-model="form[field]"
          type="textarea"
          :rows="2"
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
import AppDialog from "@/components/AppDialog/index.vue";
import RemoteSelect from "@/components/RemoteSelect/index.vue";
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import { businessUnitName } from "@/constants/identity";
import { directLedgerService } from "@/services/direct-ledger.service";
import { useUserStore } from "@/stores/user";
import type { DirectLedgerBusinessUnit, DirectLedgerItem } from "@/types/direct-ledger";
import {
  directLedgerFormFromItem,
  directLedgerInput,
  emptyDirectLedgerForm,
  fromTriState,
  toTriState,
  type TriStateValue,
} from "../direct-ledger-form";

const BOOLEAN_FIELDS = ["effectiveContact", "proposalSent", "loss", "priority"] as const;
const TRI_STATE_FIELDS = ["complaint", "satisfied"] as const;
const TEXT_FIELDS = [
  "notConvertedReason",
  "lossNote",
  "feedbackReason",
  "solution",
  "remark",
] as const;

const props = defineProps<{
  /** 编辑或查看时为最新详情；新增为 null。 */
  ledger: DirectLedgerItem | null;
  /** 新增时为当前业务；编辑/查看以记录自身业务为准。 */
  businessUnit: DirectLedgerBusinessUnit;
  readonly: boolean;
}>();
const emit = defineEmits<{ saved: [ledger: DirectLedgerItem] }>();
const visible = defineModel<boolean>({ required: true });

const { t } = useI18n();
const user = useUserStore();
const formRef = ref<FormInstance>();
const form = reactive(emptyDirectLedgerForm());
const receivingGroupNames = reactive(new Map<string, string>());
const saving = ref(false);

const businessUnit = computed(() => props.ledger?.businessUnit ?? props.businessUnit);
const isDelegate = computed(
  () => !props.ledger && user.userInfo.scope === "headquarters" && user.userInfo.roles.includes("ROOT"),
);
const isWebsite = computed(() => businessUnit.value === "website");
const sourcePlaceholder = computed(() => {
  if (isWebsite.value) return t("ledger.direct.sourcePlaceholders.website");
  const groupName = receivingGroupNames.get(form.receivingGroupId ?? "") ?? form.receivingAccountName;
  return t(groupName && !groupName.startsWith("定制师")
    ? "ledger.direct.sourcePlaceholders.linxiCustomer"
    : "ledger.direct.sourcePlaceholders.linxi");
});
const dialogTitle = computed(() => {
  if (!props.ledger) return t("common.create");
  return t(props.readonly ? "common.view" : "common.edit");
});
const creatorName = computed(() => props.ledger?.creatorName ?? user.userInfo.nickname ?? "");
const receivedMonth = computed(() => form.receivedDate.slice(0, 7));
// 编辑时由后端判断，指定操作计调不能替他人改订单状态。
const canChangeStatus = computed(() => !props.ledger || props.ledger.capabilities.canChangeStatus);
const rules = computed<FormRules>(() => {
  const required = (key: string) => ({
    required: true,
    message: t("ledger.required", { field: t(key) }),
    trigger: "change",
  });
  return {
    creatorId: isDelegate.value ? [required("ledger.direct.creator")] : [],
    receivedDate: [required("ledger.direct.receivedDate")],
    source: [
      {
        required: true,
        whitespace: true,
        message: t("ledger.required", { field: t("ledger.direct.source") }),
        trigger: "blur",
      },
    ],
    receivingGroupId: isWebsite.value ? [] : [required("ledger.direct.receivingAccount")],
    operatorId: [required("ledger.direct.operator")],
  };
});

function resetForm() {
  receivingGroupNames.clear();
  Object.assign(
    form,
    props.ledger ? directLedgerFormFromItem(props.ledger) : emptyDirectLedgerForm(),
  );
  formRef.value?.clearValidate();
}

type OptionLoader = typeof directLedgerService.operators;

// 选项均按当前合法分工/启用状态分页；总部须显式传业务。旧记录回显使用详情快照。
function optionsLoader(load: OptionLoader) {
  return async (query: RemoteOptionsQuery) => {
    const result = await load({
      ...query,
      businessUnit: user.userInfo.scope === "headquarters" ? businessUnit.value : undefined,
    });
    return {
      total: result.total,
      list: result.list.map((option) => ({ id: option.id, label: option.name })),
    };
  };
}
const loadCollectors = optionsLoader(directLedgerService.collectors);
const loadOperators = optionsLoader(directLedgerService.operators);
async function loadReceivingGroups(query: RemoteOptionsQuery) {
  const result = await optionsLoader(directLedgerService.receivingGroups)(query);
  for (const option of result.list) receivingGroupNames.set(option.id, option.label);
  return result;
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
    const body = directLedgerInput(form, businessUnit.value);
    const saved = props.ledger
      ? await directLedgerService.update(props.ledger.id, {
        ...body,
        version: props.ledger.version,
      })
      : await directLedgerService.create({
        ...body,
        businessUnit: businessUnit.value,
        ...(isDelegate.value ? { creatorId: form.creatorId } : {}),
      });
    ElMessage.success(t(props.ledger ? "common.updateSuccess" : "common.createSuccess"));
    emit("saved", saved);
    visible.value = false;
  } catch (error) {
    // 请求层已按错误码本地化精确原因；保留输入，不自动重试、升级 version 或覆盖。
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    saving.value = false;
  }
}
</script>
