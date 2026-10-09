<template>
  <div class="agency-tree-row">
    <div class="flex items-center gap-2">
      <strong class="min-w-0 flex-1 truncate" :title="agency.name">{{ agency.name }}</strong>
      <el-tag v-if="!searching && agency.childCount" size="small" type="info">
        {{ $t("resource.agencyChildCount", { count: agency.childCount }) }}
      </el-tag>
      <el-tag :type="agency.status === 'enabled' ? 'success' : 'info'" size="small">
        {{ $t(`common.${agency.status}`) }}
      </el-tag>
    </div>
    <div class="mt-1 truncate text-xs text-[var(--el-text-color-secondary)]">
      {{ agency.code }} · {{ agency.countryOrRegion || "-" }}
      <span v-if="agency.coordinatorName" class="ml-2">
        {{ $t("resource.agencyCoordinator") }}：{{ agency.coordinatorName }}
      </span>
    </div>
    <div v-if="searching" class="mt-1 truncate text-xs text-[var(--el-text-color-secondary)]">
      {{ agency.parentName ? $t("resource.agencyParentContext", { name: agency.parentName }) : $t("resource.agencyPrimary") }}
    </div>
    <div class="mt-2 flex items-center gap-2" @click.stop @keydown.stop>
      <ResourceLibraryTag :library="agency.library" />
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
        :type="agency.status === 'enabled' ? 'warning' : 'success'"
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
</template>

<script setup lang="ts">
import ResourceLibraryTag from "@/components/ResourceLibraryTag.vue";
import type { ResourcePermissionSet } from "@/constants";
import type { AgencyRecord } from "@/types/resource";

defineProps<{ agency: AgencyRecord; searching: boolean; permissions: ResourcePermissionSet }>();
const emit = defineEmits<{
  edit: [agency: AgencyRecord];
  delete: [agency: AgencyRecord];
  "toggle-status": [agency: AgencyRecord];
}>();
</script>

<style scoped lang="scss">
.agency-tree-row {
  @apply 'min-w-0 flex-1 py-2 pr-2';
}
</style>
