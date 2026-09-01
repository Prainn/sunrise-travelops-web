<template>
  <el-col :span="12">
    <el-form-item
      :label="$t('inquiry.agencyName')"
      prop="agencyId"
    >
      <el-select
        :model-value="record.agencyId"
        filterable
        :placeholder="$t('common.selectPlaceholder')"
        @change="emit('select-agency', $event)"
      >
        <el-option
          v-for="agency in agencyOptions"
          :key="agency.id"
          :label="`${agency.name} (${agency.code})`"
          :value="agency.id"
        />
      </el-select>
    </el-form-item>
  </el-col>
  <el-col :span="12">
    <el-form-item :label="$t('inquiry.agencyCode')">
      <el-input
        :model-value="record.agencyCode"
        disabled
      />
    </el-form-item>
  </el-col>
  <el-col :span="12">
    <el-form-item
      :label="$t('inquiry.contactName')"
      prop="contactName"
    >
      <AgencyContactSelect
        :model-value="record.contactName"
        :agency="selectedAgency"
        @create="emit('create-contact', $event)"
        @select="emit('select-contact', $event)"
        @update:model-value="emit('update-contact-name', $event)"
      />
    </el-form-item>
  </el-col>
  <el-col :span="12">
    <el-form-item :label="$t('inquiry.email')">
      <el-input
        :model-value="record.email"
        disabled
      />
    </el-form-item>
  </el-col>
  <el-col :span="12">
    <el-form-item :label="$t('inquiry.phone')">
      <el-input
        :model-value="record.phone"
        disabled
      />
    </el-form-item>
  </el-col>
  <el-col :span="12">
    <el-form-item :label="$t('inquiry.countryOrRegion')">
      <el-input
        :model-value="record.countryOrRegion"
        disabled
      />
    </el-form-item>
  </el-col>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { InquiryRecord } from "@/types/inquiry";
import type { AgencyContactRecord, AgencyRecord } from "@/types/resource";
import AgencyContactSelect from "./AgencyContactSelect.vue";

const props = defineProps<{
  record: InquiryRecord;
  agencyOptions: AgencyRecord[];
}>();

const emit = defineEmits<{
  "select-agency": [agencyId: string];
  "select-contact": [contact: AgencyContactRecord];
  "create-contact": [name: string];
  "update-contact-name": [name: string];
}>();

const selectedAgency = computed(() => props.agencyOptions.find((agency) => agency.id === props.record.agencyId));
</script>

<style scoped lang="scss">
:deep(.el-select) {
  width: 100%;
}
</style>
