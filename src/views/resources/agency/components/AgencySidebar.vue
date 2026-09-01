<template>
  <el-card
    class="agency-sidebar"
    shadow="never"
  >
    <template #header>
      <div class="agency-sidebar__header">
        <span>{{ $t("resource.agencyList") }}</span>
        <el-button
          v-has-perm="permissions.create"
          type="primary"
          @click="emit('create')"
        >
          {{ $t("resource.addAgency") }}
        </el-button>
      </div>
    </template>

    <el-input
      v-model.trim="keywords"
      :placeholder="$t('resource.agencySearchPlaceholder')"
      clearable
    />
    <el-scrollbar class="agency-sidebar__scrollbar">
      <div class="agency-sidebar__list">
        <div
          v-for="agency in filteredRows"
          :key="agency.id"
          class="agency-sidebar__item"
          :class="{ 'is-active': agency.id === selectedId }"
          role="button"
          tabindex="0"
          @click="emit('update:selectedId', agency.id)"
          @keydown.enter="emit('update:selectedId', agency.id)"
        >
          <div class="agency-sidebar__item-heading">
            <strong>{{ agency.name }}</strong>
            <el-tag
              :type="agency.status === 'enabled' ? 'success' : 'info'"
              size="small"
            >
              {{ $t(`common.${agency.status}`) }}
            </el-tag>
          </div>
          <small>{{ agency.code }} · {{ agency.countryOrRegion }}</small>
          <div
            class="agency-sidebar__actions"
            @click.stop
          >
            <el-button
              v-has-perm="permissions.update"
              type="primary"
              link
              @click="emit('edit', agency)"
            >
              {{ $t("common.edit") }}
            </el-button>
            <el-button
              v-has-perm="permissions.update"
              type="warning"
              link
              @click="emit('toggle-status', agency)"
            >
              {{ $t(agency.status === "enabled" ? "common.disabled" : "common.enabled") }}
            </el-button>
            <el-button
              v-has-perm="permissions.delete"
              type="danger"
              link
              @click="emit('delete', agency)"
            >
              {{ $t("common.delete") }}
            </el-button>
          </div>
        </div>
        <el-empty
          v-if="!filteredRows.length"
          :description="$t('resource.noAgencies')"
          :image-size="64"
        />
      </div>
    </el-scrollbar>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { ResourcePermissionSet } from "@/constants";
import type { AgencyRecord } from "@/types/resource";

const props = defineProps<{
  rows: AgencyRecord[];
  selectedId: string;
  permissions: ResourcePermissionSet;
}>();

const emit = defineEmits<{
  "update:selectedId": [id: string];
  create: [];
  edit: [agency: AgencyRecord];
  delete: [agency: AgencyRecord];
  "toggle-status": [agency: AgencyRecord];
}>();

const keywords = ref("");
const filteredRows = computed(() => {
  const value = keywords.value.toLowerCase();
  if (!value) return props.rows;
  return props.rows.filter((agency) => [agency.code, agency.name, agency.countryOrRegion, agency.email]
    .some((field) => field.toLowerCase().includes(value)));
});
</script>

<style scoped lang="scss">
.agency-sidebar {
  min-width: 0;

  :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: calc(100% - 61px);
    box-sizing: border-box;
  }

  &__header,
  &__item-heading,
  &__actions {
    display: flex;
    align-items: center;
  }

  &__header,
  &__item-heading {
    justify-content: space-between;
    gap: 8px;
  }

  &__header {
    font-weight: 600;
  }

  &__scrollbar {
    flex: 1;
    min-height: 0;
  }

  &__list {
    display: grid;
    gap: 10px;
    padding-right: 8px;
  }

  &__item {
    padding: 12px;
    cursor: pointer;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: var(--el-border-radius-base);
    transition: border-color var(--el-transition-duration), background-color var(--el-transition-duration);

    &:hover,
    &.is-active {
      background: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary-light-5);
    }

    strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    small {
      display: block;
      margin-top: 6px;
      color: var(--el-text-color-secondary);
    }
  }

  &__actions {
    gap: 4px;
    margin-top: 8px;
  }
}
</style>
