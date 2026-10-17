<template>
  <SectionCard fill class="agency-contacts-panel">
    <template #header>
      <div v-if="agency">
        <div class="agency-contacts-panel__title">
          <strong>{{ agency.name }}</strong>
          <span>{{ agency.code }}</span>
        </div>
        <small>{{ agency.countryOrRegion }} · {{ agency.email || "-" }}</small>
      </div>
      <span v-else>{{ $t("resource.contacts") }}</span>
    </template>
    <template #actions>
      <el-button
        v-has-perm="permissions.create"
        type="primary"
        :disabled="!agency"
        @click="emit('create')"
      >
        {{ $t("resource.addContact") }}
      </el-button>
    </template>
    <DataTable
      v-if="agency"
      :loading="loading"
      :data="agency.contacts"
      fill
      :empty-text="$t('resource.noContacts')"
    >
      <el-table-column type="index" width="64" align="center" />
      <el-table-column prop="name" :label="$t('resource.personName')" min-width="180" />
      <el-table-column prop="phone" :label="$t('resource.phone')" min-width="180">
        <template #default="scope">
          {{ scope.row.phone || "-" }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('common.actions')" width="160" align="center">
        <template #default="scope">
          <el-button
            v-has-perm="permissions.update"
            type="primary"
            link
            @click="editContact(scope.row)"
          >
            {{ $t("common.edit") }}
          </el-button>
          <el-button
            v-has-perm="permissions.delete"
            type="danger"
            link
            @click="deleteContact(scope.row)"
          >
            {{ $t("common.delete") }}
          </el-button>
        </template>
      </el-table-column>
    </DataTable>
    <el-empty v-else :description="$t('resource.selectAgencyFirst')" />
  </SectionCard>
</template>

<script setup lang="ts">
import DataTable from "@/components/DataTable/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import type { ResourcePermissionSet } from "@/constants";
import type { AgencyContactRecord, AgencyRecord } from "@/types/resource";

defineProps<{
  loading?: boolean;
  agency?: AgencyRecord;
  permissions: ResourcePermissionSet;
}>();

const emit = defineEmits<{
  create: [];
  edit: [contact: AgencyContactRecord];
  delete: [contact: AgencyContactRecord];
}>();

function editContact(contact: unknown) {
  emit("edit", contact as AgencyContactRecord);
}

function deleteContact(contact: unknown) {
  emit("delete", contact as AgencyContactRecord);
}
</script>

<style scoped lang="scss">
.agency-contacts-panel {
  &__title {
    @apply 'flex items-center gap-[10px]';

    span {
      @apply 'text-[var(--el-text-color-secondary)] text-[14px]';
    }
  }

  small {
    @apply 'block mt-[5px] text-[var(--el-text-color-secondary)]';
  }
}
</style>
