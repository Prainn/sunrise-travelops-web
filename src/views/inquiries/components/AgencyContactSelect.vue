<template>
  <el-select
    :model-value="modelValue"
    allow-create
    default-first-option
    filterable
    :disabled="!agency"
    :placeholder="$t('inquiry.contactSelectPlaceholder')"
    @change="selectContact"
  >
    <el-option
      v-for="contact in agency?.contacts ?? []"
      :key="contact.id"
      :label="contact.name"
      :value="contact.name"
    >
      <span>{{ contact.name }}</span>
      <small class="agency-contact-select__phone">{{ contact.phone || "-" }}</small>
    </el-option>
  </el-select>
</template>

<script setup lang="ts">
import type { AgencyContactRecord, AgencyRecord } from "@/types/resource";

const props = defineProps<{
  modelValue: string;
  agency?: AgencyRecord;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  select: [contact: AgencyContactRecord];
  create: [name: string];
}>();

function selectContact(value: string) {
  const name = value.trim();
  const contact = props.agency?.contacts.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (contact) {
    emit("update:modelValue", contact.name);
    emit("select", contact);
    return;
  }
  if (!props.agency || !name) return;
  emit("update:modelValue", name);
  emit("create", name);
}
</script>

<style scoped lang="scss">
.agency-contact-select__phone {
  float: right;
  color: var(--el-text-color-secondary);
}
</style>
