<template>
  <el-card
    class="agency-contacts-panel"
    shadow="never"
  >
    <template #header>
      <div class="agency-contacts-panel__header">
        <div v-if="agency">
          <div class="agency-contacts-panel__title">
            <strong>{{ agency.name }}</strong>
            <span>{{ agency.code }}</span>
          </div>
          <small>{{ agency.countryOrRegion }} · {{ agency.email || "-" }}</small>
        </div>
        <span v-else>{{ $t("resource.contacts") }}</span>
        <el-button
          v-has-perm="permissions.update"
          type="primary"
          :disabled="!agency"
          @click="emit('create')"
        >
          {{ $t("resource.addContact") }}
        </el-button>
      </div>
    </template>

    <el-table
      v-if="agency"
      :data="agency.contacts"
      border
      height="100%"
      :empty-text="$t('resource.noContacts')"
    >
      <el-table-column
        type="index"
        width="64"
        align="center"
      />
      <el-table-column
        prop="name"
        :label="$t('resource.personName')"
        min-width="180"
      />
      <el-table-column
        prop="phone"
        :label="$t('resource.phone')"
        min-width="180"
      >
        <template #default="scope">
          {{ scope.row.phone || "-" }}
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('common.actions')"
        width="160"
        align="center"
      >
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
    </el-table>
    <el-empty
      v-else
      :description="$t('resource.selectAgencyFirst')"
    />
  </el-card>
</template>

<script setup lang="ts">
import type { ResourcePermissionSet } from "@/constants";
import type { AgencyContactRecord, AgencyRecord } from "@/types/resource";

defineProps<{
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
  min-width: 0;

  :deep(.el-card__body) {
    height: calc(100% - 69px);
    box-sizing: border-box;
  }

  &__header,
  &__title {
    display: flex;
    align-items: center;
  }

  &__header {
    justify-content: space-between;
    gap: 16px;
  }

  &__title {
    gap: 10px;

    span {
      color: var(--el-text-color-secondary);
      font-size: var(--el-font-size-small);
    }
  }

  small {
    display: block;
    margin-top: 5px;
    color: var(--el-text-color-secondary);
  }
}
</style>
