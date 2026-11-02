<template>
  <AppDialog
    class="inquiry-editor-dialog"
    :model-value="modelValue"
    :title="$t(isEditing ? 'common.edit' : 'common.create')"
    size="lg"
    :busy="saving || creatingContact"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form
      :key="formSession"
      ref="formRef"
      :model="form"
      :disabled="creatingContact || saving"
      :rules="rules"
      :validate-on-rule-change="false"
      label-width="auto"
    >
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item
            v-if="userStore.userInfo.scope === 'headquarters'"
            :label="$t('identity.businessUnit')"
          >
            <el-select
              v-model="form.businessUnit"
              autocomplete="new-password"
              :disabled="isEditing"
              :placeholder="$t('identity.selectBusinessUnitToCreate')"
              @change="changeBusinessUnit"
            >
              <el-option
                v-for="scope in ['shengxu', 'linxi', 'website']"
                :key="scope"
                :value="scope"
                :label="businessUnitName(scope)"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col v-if="isEditing" :span="12">
          <el-form-item :label="$t('inquiry.code')">
            <el-input v-model="form.code" disabled />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item :label="$t('common.status')" prop="status">
            <el-select v-model="form.status" autocomplete="new-password" :disabled="!isEditing">
              <el-option
                v-for="option in editableStatusOptions"
                :key="option.value"
                :label="$t(option.labelKey)"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col v-if="form.status === 'lost'" :span="12">
          <el-form-item :label="$t('inquiry.lostReason')" prop="lostReason">
            <el-input v-model.trim="form.lostReason" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <InquiryAgencyFields
          :record="form"
          :agency-options="agencyOptions"
          @create-contact="createContact"
          @select-agency="selectAgency"
          @select-contact="selectContact"
          @update-contact-name="form.contactName = $event"
          @update-phone="form.phone = $event"
          @update-country="form.countryItemId = $event"
        />
        <el-col :span="24">
          <el-form-item :label="$t('inquiry.originalMessage')" prop="originalMessage">
            <InquiryMessageInput
              v-if="modelValue"
              v-model="form.originalMessage"
              @parsing="isParsingDocument = $event"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="$t('inquiry.sourceChannel')" prop="sourceChannel">
            <el-select
              v-model="form.sourceChannel"
              autocomplete="new-password"
              allow-create
              filterable
            >
              <el-option
                v-for="option in sourceOptions"
                :key="option"
                :label="option"
                :value="option"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="$t('inquiry.plannedDays')" prop="plannedDays">
            <el-input-number
              v-model="form.plannedDays"
              :min="1"
              :max="60"
              :precision="0"
              controls-position="right"
            />
            <span class="ml-4 text-[var(--el-text-color-secondary)]">{{
              $t("itinerary.duration", plannedDuration(form.plannedDays))
            }}</span>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="$t('inquiry.owner')" prop="ownerId">
            <el-select
              v-model="form.ownerId"
              autocomplete="new-password"
              disabled
              :loading="loadingOwners"
              :placeholder="$t('common.selectPlaceholder')"
            >
              <el-option
                v-for="option in scopedOwners"
                :key="option.id"
                :label="option.name"
                :value="option.id"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-collapse v-model="expandedDetails" class="inquiry-followup">
            <el-collapse-item name="followup" :title="$t('inquiry.followupDetails')">
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item :label="$t('inquiry.nextFollowUpAt')">
                    <el-date-picker
                      v-model="form.nextFollowUpAt"
                      type="datetime"
                      value-format="YYYY-MM-DDTHH:mm:ssZ"
                      :placeholder="$t('inquiry.nextFollowUpPlaceholder')"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item :label="$t('inquiry.internalRemark')">
                    <el-input v-model.trim="form.internalRemark" type="textarea" :rows="2" />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-collapse-item>
          </el-collapse>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button :disabled="saving || creatingContact" @click="emit('update:modelValue', false)">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button
        type="primary"
        :loading="validating || creatingContact || saving"
        :disabled="isParsingDocument || loadingOwners"
        @click="submitForm"
      >
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import AppDialog from "@/components/AppDialog/index.vue";
import { businessUnitName } from "@/constants/identity";
import { useUserStore } from "@/stores/user";
import { inquiryService } from "@/services/inquiry.service";
import { resourceService } from "@/services/resource.service";
import { plannedDuration } from "@/views/inquiries/itineraries/duration";
import { computed, reactive, ref, watch } from "vue";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import type { InquiryRecord } from "@/types/inquiry";
import type { AgencyContactRecord, AgencyRecord } from "@/types/resource";
import InquiryMessageInput from "./InquiryMessageInput.vue";
import InquiryAgencyFields from "./InquiryAgencyFields.vue";
import { INQUIRY_STATUS_OPTIONS } from "../options";
import { requestErrorMessage } from "@/utils/version-conflict";

const props = defineProps<{
  modelValue: boolean;
  record: InquiryRecord;
  isEditing: boolean;
  agencyOptions: AgencyRecord[];
  ownerOptions: import("@/services/inquiry.service").PersonOption[];
  sourceOptions: string[];
  /** 父级保存请求进行中 */
  saving?: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [record: InquiryRecord];
}>();

const { t } = useI18n();
const userStore = useUserStore();
const scopedOwners = ref(props.ownerOptions);
const loadingOwners = ref(false);
let ownerRequestVersion = 0;
const formRef = ref<FormInstance>();
const formSession = ref(0);
const expandedDetails = ref<string[]>([]);
const creatingContact = ref(false);
const validating = ref(false);
const isParsingDocument = ref(false);
const form = reactive<InquiryRecord>({ ...props.record });
const selectedAgency = computed(() =>
  props.agencyOptions.find((agency) => agency.id === form.agencyId),
);
const editableStatusOptions = computed(() => {
  if (!props.isEditing) return INQUIRY_STATUS_OPTIONS.filter((item) => item.value === "new");
  const allowedStatuses =
    props.record.status === "quoted" ? ["quoted", "lost"] : [props.record.status, "lost"];
  return INQUIRY_STATUS_OPTIONS.filter((item) => allowedStatuses.includes(item.value));
});
const rules = computed<FormRules>(() => ({
  ownerId: [
    {
      required: !props.isEditing,
      message: t("common.selectPlaceholder"),
      trigger: "change",
    },
  ],
  agencyId: [{ required: true, message: t("inquiry.agencyRequired"), trigger: "change" }],
  countryItemId: [{ required: true, message: t("common.selectPlaceholder"), trigger: "change" }],
  contactName: [{ required: true, message: t("inquiry.contactNameRequired"), trigger: "change" }],
  sourceChannel: [
    { required: true, message: t("inquiry.sourceChannelRequired"), trigger: "change" },
  ],
  plannedDays: [{ required: true, message: t("inquiry.plannedDaysRequired"), trigger: "change" }],
  originalMessage: [
    { required: true, message: t("inquiry.originalMessageRequired"), trigger: "blur" },
  ],
  lostReason: [
    { required: form.status === "lost", message: t("inquiry.lostReasonRequired"), trigger: "blur" },
  ],
}));

function resetForm() {
  ++agencySelectionVersion;
  Object.assign(form, props.record);
  void refreshOwners();
  expandedDetails.value = props.isEditing ? ["followup"] : [];
  syncAgencyDetails();
}

async function refreshOwners() {
  const version = ++ownerRequestVersion;
  loadingOwners.value = true;
  scopedOwners.value = [];
  try {
    const owners = await inquiryService.owners(form.businessUnit);
    if (version !== ownerRequestVersion) return;
    scopedOwners.value = owners;
    const user = userStore.userInfo;
    if (
      !props.isEditing &&
      user.scope !== "headquarters" &&
      user.userId &&
      user.username &&
      user.nickname &&
      !owners.some((person) => person.id === user.userId)
    ) {
      scopedOwners.value.push({ id: user.userId, username: user.username, name: user.nickname });
    }
  } catch (error) {
    if (version === ownerRequestVersion)
      ElMessage.error(error instanceof Error ? error.message : t("request.failed"));
  } finally {
    if (version === ownerRequestVersion) loadingOwners.value = false;
  }
}
async function changeBusinessUnit() {
  form.agencyId = "";
  form.contactId = "";
  form.ownerId = "";
  await Promise.all([resourceService.loadAgencies({ businessUnit: form.businessUnit }), refreshOwners()]);
}
function syncAgencyDetails() {
  const agency = selectedAgency.value;
  if (!agency) return;
  const contact = agency.contacts.find((item) => item.id === form.contactId);
  if (props.isEditing && form.agencyId === props.record.agencyId) {
    if (contact && form.contactId !== props.record.contactId) {
      form.contactName = contact.name;
      form.phone = contact.phone;
    }
    return;
  }
  Object.assign(form, {
    agencyCode: agency.code,
    agencyName: agency.name,
    email: agency.email,
    contactId: contact?.id ?? form.contactId,
    phone: contact?.phone ?? form.phone,
    countryItemId: agency.countryItemId ?? form.countryItemId,
    countryOrRegion: agency.countryOrRegion,
  });
}

let agencySelectionVersion = 0;
async function selectAgency(agencyId: string) {
  const version = ++agencySelectionVersion;
  if (!agencyId) {
    Object.assign(form, {
      agencyId: "",
      ownerId: "",
      agencyCode: "",
      agencyName: "",
      contactId: "",
      contactName: "",
      email: "",
      phone: "",
      countryItemId: "",
      countryOrRegion: "",
    });
    return;
  }
  let agency: AgencyRecord;
  try {
    agency = await resourceService.agencyApi.getDetail(agencyId);
  } catch {
    if (version === agencySelectionVersion) ElMessage.error(t("request.failed"));
    return;
  }
  if (version !== agencySelectionVersion) return;
  const retainedAgency = props.isEditing && agencyId === props.record.agencyId;
  if (!retainedAgency && (agency.businessUnit !== form.businessUnit || !agency.coordinatorId)) {
    ElMessage.error(t("inquiry.agencyCoordinatorUnavailable"));
    return;
  }
  const index = resourceService.agencies.findIndex((item) => item.id === agencyId);
  if (index >= 0) resourceService.agencies.splice(index, 1, agency);
  else resourceService.agencies.push(agency);
  if (retainedAgency) {
    const original = props.record;
    Object.assign(form, {
      agencyId: original.agencyId,
      ownerId: original.ownerId,
      agencyCode: original.agencyCode,
      agencyName: original.agencyName,
      contactId: original.contactId,
      contactName: original.contactName,
      email: original.email,
      phone: original.phone,
      countryItemId: original.countryItemId,
      countryOrRegion: original.countryOrRegion,
    });
    return;
  }
  Object.assign(form, {
    agencyId: agency.id,
    ownerId: props.isEditing ? props.record.ownerId : agency.coordinatorId,
    agencyCode: agency.code,
    agencyName: agency.name,
    contactId: "",
    contactName: "",
    email: agency.email,
    phone: "",
    countryItemId: agency.countryItemId ?? "",
    countryOrRegion: agency.countryOrRegion,
  });
}

function selectContact(contact: AgencyContactRecord) {
  form.contactId = contact.id;
  form.contactName = contact.name;
  form.phone = contact.phone;
}

function createContact(name: string) {
  if (!selectedAgency.value) return;
  form.contactId = "";
  form.contactName = name;
  form.phone = "";
}

// 从校验开始即占用，连续点击不会在校验期间重复新建联系人或重复提交。
async function submitForm() {
  if (validating.value || creatingContact.value || props.saving || isParsingDocument.value || loadingOwners.value) return;
  validating.value = true;
  try {
    if (!(await formRef.value?.validate().catch(() => false))) return;
  } finally {
    validating.value = false;
  }
  if (!form.contactId) {
    const agency = selectedAgency.value;
    if (!agency) return;
    creatingContact.value = true;
    try {
      const contact = await inquiryService.createContact(agency.id, form.contactName, form.phone, props.isEditing ? props.record.id : undefined);
      agency.contacts.push(contact);
      selectContact(contact);
    } catch (error) {
      ElMessage.error(requestErrorMessage(error));
      return;
    } finally {
      creatingContact.value = false;
    }
  }
  syncAgencyDetails();
  emit("submit", { ...form, lostReason: form.status === "lost" ? form.lostReason : "" });
}
// 在控件挂载前回填；重建表单以隔离旧校验状态及关闭动画期间残留的控件。
watch(() => props.modelValue, (opened) => {
  if (!opened) return;
  resetForm();
  formSession.value++;
}, { immediate: true });
</script>

<style scoped lang="scss">
:deep(.el-select),
:deep(.el-date-editor) {
  width: 100%;
}

:deep(.inquiry-followup),
:deep(.inquiry-followup .el-collapse-item__header),
:deep(.inquiry-followup .el-collapse-item__wrap) {
  border-bottom: 0;
}

:deep(.inquiry-followup .el-collapse-item__content) {
  padding-bottom: 0;
}

:global(.inquiry-editor-dialog .el-dialog__footer) {
  padding-top: 0;
  border-top: 0;
}
</style>
