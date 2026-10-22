<template>
  <SectionCard
    v-loading="loading"
    fill
    class="agency-sidebar"
    :title="$t('resource.agencyList')"
  >
    <template #actions>
      <el-button v-has-perm="permissions.create" type="primary" @click="emit('create')">
        {{ $t("common.create") }}
      </el-button>
    </template>
    <FilterBar variant="compact" @reset="resetQuery">
      <el-form-item :label="$t('common.keywords')">
        <el-input
          v-model.trim="keywords"
          :placeholder="$t('resource.agencySearchPlaceholder')"
          clearable
        />
      </el-form-item>
    </FilterBar>
    <el-scrollbar class="min-h-0 flex-1">
      <el-tree
        :data="rows"
        node-key="id"
        :current-node-key="selectedId"
        :default-expanded-keys="searching ? [] : expandedIds"
        :auto-expand-parent="false"
        :expand-on-click-node="false"
        :indent="20"
        highlight-current
        :empty-text="$t('resource.noAgencies')"
        @node-click="selectNode"
        @node-expand="emit('expand', $event)"
        @node-collapse="emit('collapse', $event)"
      >
        <template #default="{ data }">
          <AgencyTreeRow
            v-if="data.agency"
            :agency="data.agency"
            :searching="searching"
            :permissions="permissions"
            @edit="emit('edit', $event)"
            @toggle-status="emit('toggle-status', $event)"
            @delete="emit('delete', $event)"
          />
          <el-button
            v-else
            class="my-2"
            type="primary"
            link
            :loading="data.loading"
            @click.stop="emit('load-more', data.parentId)"
            @keydown.stop
          >
            {{ $t("resource.agencyLoadMore") }}
          </el-button>
        </template>
      </el-tree>
    </el-scrollbar>
    <Pagination
      :page="page"
      :limit="RESOURCE_PAGE_SIZE"
      :total="total"
      variant="compact"
      layout="prev, pager, next, total"
      @update:page="emit('page-change', $event)"
    />
  </SectionCard>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import FilterBar from "@/components/FilterBar/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import type { ResourcePermissionSet } from "@/constants";
import type { AgencyRecord } from "@/types/resource";
import { RESOURCE_PAGE_SIZE } from "../../useResourcePagination";
import type { AgencyTreeNode } from "../useAgencyTree";
import AgencyTreeRow from "./AgencyTreeRow.vue";

defineProps<{
  loading: boolean;
  rows: AgencyTreeNode[];
  selectedId: string;
  permissions: ResourcePermissionSet;
  expandedIds: string[];
  searching: boolean;
  page: number;
  total: number;
}>();
const emit = defineEmits<{
  select: [agency: AgencyRecord];
  create: [];
  edit: [agency: AgencyRecord];
  delete: [agency: AgencyRecord];
  "toggle-status": [agency: AgencyRecord];
  expand: [node: AgencyTreeNode];
  collapse: [node: AgencyTreeNode];
  "load-more": [parentId: string];
  "query-change": [keyword: string];
  "page-change": [page: number];
}>();
const keywords = ref("");
const requestRows = useDebounceFn(() => emit("query-change", keywords.value), 300);
watch(keywords, () => requestRows());

function selectNode(node: AgencyTreeNode) {
  if ("agency" in node) emit("select", node.agency);
}
function resetQuery() {
  keywords.value = "";
  requestRows();
}
</script>

<style scoped lang="scss">
.agency-sidebar {
  :deep(.el-tree-node__content) {
    @apply 'h-auto items-start';
  }

  :deep(.el-tree-node__expand-icon) {
    @apply 'mt-2';
  }
}
</style>
