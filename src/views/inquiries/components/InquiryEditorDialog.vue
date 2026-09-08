<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t(isEditing ? 'inquiry.editInquiry' : 'inquiry.createInquiry')"
    width="820px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
    @open="resetForm"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="auto"
    >
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item :label="$t('inquiry.code')">
            <el-input
              v-model="form.code"
              disabled
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item
            :label="$t('common.status')"
            prop="status"
          >
            <el-select
              v-model="form.status"
              :disabled="!isEditing"
            >
              <el-option
                v-for="option in editableStatusOptions"
                :key="option.value"
                :label="$t(option.labelKey)"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <InquiryAgencyFields
          :record="form"
          :agency-options="agencyOptions"
          @create-contact="createContact"
          @select-agency="selectAgency"
          @select-contact="selectContact"
          @update-contact-name="form.contactName = $event"
        />
        <el-col :span="24">
          <el-form-item
            :label="$t('inquiry.originalMessage')"
            prop="originalMessage"
          >
            <el-input
              v-model.trim="form.originalMessage"
              type="textarea"
              :rows="3"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item
            :label="$t('inquiry.operationsCoordinator')"
            prop="operationsCoordinator"
          >
            <el-select v-model="form.operationsCoordinator">
              <el-option
                v-for="option in operationsCoordinatorOptions"
                :key="option"
                :label="option"
                :value="option"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item
            :label="$t('inquiry.sourceChannel')"
            prop="sourceChannel"
          >
            <el-select
              v-model="form.sourceChannel"
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
          <el-form-item
            :label="$t('inquiry.plannedDays')"
            prop="plannedDays"
          >
            <el-input-number
              v-model="form.plannedDays"
              :min="1"
              :max="60"
              :precision="0"
              controls-position="right"
            />
            <span style="width: 100%; margin-top: 4px; color: var(--el-text-color-secondary)">{{ $t('itinerary.duration', plannedDuration(form.plannedDays)) }}</span>
          </el-form-item>
        </el-col>
        <el-col
          v-if="form.status === 'lost'"
          :span="12"
        >
          <el-form-item
            :label="$t('inquiry.lostReason')"
            prop="lostReason"
          >
            <el-input v-model.trim="form.lostReason" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-collapse v-model="expandedDetails">
            <el-collapse-item
              name="followup"
              :title="$t('inquiry.followupDetails')"
            >
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item
                    :label="$t('inquiry.owner')"
                    prop="owner"
                  >
                    <el-select
                      v-model="form.owner"
                      clearable
                    >
                      <el-option
                        v-for="option in ownerOptions"
                        :key="option"
                        :label="option"
                        :value="option"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item :label="$t('inquiry.nextFollowUpAt')">
                    <el-date-picker
                      v-model="form.nextFollowUpAt"
                      type="datetime"
                      value-format="YYYY-MM-DD HH:mm"
                      :placeholder="$t('inquiry.nextFollowUpPlaceholder')"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item :label="$t('inquiry.internalRemark')">
                    <el-input
                      v-model.trim="form.internalRemark"
                      type="textarea"
                      :rows="2"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-collapse-item>
          </el-collapse>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button
        type="primary"
        @click="submitForm"
      >
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { resourceService } from "@/services/resource.service";
import { plannedDuration } from "@/views/inquiries/itineraries/duration";
import { computed, reactive, ref } from "vue";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import type { InquiryRecord } from "@/types/inquiry";
import type { AgencyContactRecord, AgencyRecord } from "@/types/resource";
import InquiryAgencyFields from "./InquiryAgencyFields.vue";
import { INQUIRY_STATUS_OPTIONS } from "../options";

const props = defineProps<{
  modelValue: boolean;
  record: InquiryRecord;
  isEditing: boolean;
  agencyOptions: AgencyRecord[];
  ownerOptions: string[];
  operationsCoordinatorOptions: string[];
  sourceOptions: string[];
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [record: InquiryRecord];
  "create-contact": [agencyId: string, name: string];
}>();

const { t } = useI18n();
const formRef = ref<FormInstance>();
const expandedDetails = ref<string[]>([]);
const form = reactive<InquiryRecord>({ ...props.record });
const selectedAgency = computed(() => props.agencyOptions.find((agency) => agency.id === form.agencyId));
const editableStatusOptions = computed(() => {
  if (!props.isEditing) return INQUIRY_STATUS_OPTIONS.filter((item) => item.value === "new");
  const allowedStatuses = props.record.status === "quoted"
    ? ["quoted", "lost"]
    : [props.record.status, "lost"];
  return INQUIRY_STATUS_OPTIONS.filter((item) => allowedStatuses.includes(item.value));
});
const rules = computed<FormRules>(() => ({
  agencyId: [{ required: true, message: t("inquiry.agencyRequired"), trigger: "change" }],
  contactName: [{ required: true, message: t("inquiry.contactNameRequired"), trigger: "change" }],
  sourceChannel: [{ required: true, message: t("inquiry.sourceChannelRequired"), trigger: "change" }],
  operationsCoordinator: [{ required: true, message: t("inquiry.operationsCoordinatorRequired"), trigger: "change" }],
  plannedDays: [{ required: true, message: t("inquiry.plannedDaysRequired"), trigger: "change" }],
  originalMessage: [{ required: true, message: t("inquiry.originalMessageRequired"), trigger: "blur" }],
  lostReason: [{ required: form.status === "lost", message: t("inquiry.lostReasonRequired"), trigger: "blur" }],
}));

function resetForm() {
  ++agencySelectionVersion;
  Object.assign(form, props.record);
  expandedDetails.value = props.isEditing ? ["followup"] : [];
  syncAgencyDetails();
  formRef.value?.clearValidate();
}

function syncAgencyDetails() {
  const agency = selectedAgency.value;
  if (!agency) return;
  const contact = agency.contacts.find((item) => item.name === form.contactName);
  Object.assign(form, {
    agencyCode: agency.code,
    agencyName: agency.name,
    email: agency.email,
    phone: contact?.phone ?? "",
    countryOrRegion: agency.countryOrRegion,
  });
}

let agencySelectionVersion = 0;
async function selectAgency(agencyId: string) {
  const version = ++agencySelectionVersion;
  if (!agencyId) { Object.assign(form, { agencyId: "", agencyCode: "", agencyName: "", contactName: "", email: "", phone: "", countryOrRegion: "" }); return; }
  let agency: AgencyRecord;
  try { agency = await resourceService.agencyApi.getDetail(agencyId); }
  catch { if (version === agencySelectionVersion) ElMessage.error(t("request.failed")); return; }
  if (version !== agencySelectionVersion) return;
  const index = resourceService.agencies.findIndex(item => item.id === agencyId);
  if (index >= 0) resourceService.agencies.splice(index, 1, agency);
  else resourceService.agencies.push(agency);
  Object.assign(form, {
    agencyId: agency.id,
    agencyCode: agency.code,
    agencyName: agency.name,
    contactName: "",
    email: agency.email,
    phone: "",
    countryOrRegion: agency.countryOrRegion,
  });

}

function selectContact(contact: AgencyContactRecord) {
  form.contactName = contact.name;
  form.phone = contact.phone;
}

function createContact(name: string) {
  if (!selectedAgency.value) return;
  form.phone = "";
  emit("create-contact", selectedAgency.value.id, name);
}

async function submitForm() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  syncAgencyDetails();
  emit("submit", { ...form, lostReason: form.status === "lost" ? form.lostReason : "" });
}
</script>

<style scoped lang="scss">
:deep(.el-select),
:deep(.el-date-editor) {
  width: 100%;
}
</style>
