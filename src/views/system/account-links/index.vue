<!-- 账号关联：总部管理同一人员在不同业务的账号组，组内账号可免密切换 -->
<template>
  <PageShell>
    <FilterBar ref="filterBarRef" :model="params" @reset="handleResetQuery">
      <el-form-item :label="$t('common.keywords')" prop="keyword" class="filter-bar__wide">
        <el-input
          v-model="params.keyword"
          :placeholder="$t('accountLink.searchPlaceholder')"
          maxlength="100"
          clearable
        />
      </el-form-item>
    </FilterBar>

    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="fetchData">
        <el-button type="primary" @click="openEditor(null)">
          {{ $t("common.create") }}
        </el-button>
      </TableToolbar>

      <DataTable
        fill
        :error="error"
        :loading="loading"
        :data="list"
        :filtered="Boolean(params.keyword)"
        row-key="id"
        @retry="fetchData"
      >
        <el-table-column
          :label="$t('accountLink.members')"
          min-width="520"
          :show-overflow-tooltip="false"
        >
          <template #default="{ row }">
            <div class="flex flex-col gap-1 py-1">
              <div
                v-for="member in (row as AccountLink).members"
                :key="member.userId"
                class="flex flex-wrap items-center gap-2"
              >
                <el-tag size="small">
                  {{ member.scopeName }}
                </el-tag>
                <span>{{ member.nickname }}（{{ member.username }}）</span>
                <span class="text-[var(--el-text-color-secondary)]">
                  {{ $t("accountLink.tourCode") }}：{{ member.tourCode || "-" }}
                </span>
                <el-tag v-if="member.status !== 'enabled'" type="info" size="small">
                  {{ $t("common.disabled") }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('accountLink.memberCount')"
          width="100"
          align="center"
          :formatter="(row: AccountLink) => String(row.members.length)"
        />
        <el-table-column
          :label="$t('common.actions')"
          fixed="right"
          width="150"
          :show-overflow-tooltip="false"
        >
          <template #default="{ row }">
            <RowActions>
              <el-button
                type="primary"
                size="small"
                link
                @click="openEditor(row as AccountLink)"
              >
                {{ $t("common.edit") }}
              </el-button>
              <el-button
                type="danger"
                size="small"
                link
                @click="openUnlink(row as AccountLink)"
              >
                {{ $t("accountLink.unlink") }}
              </el-button>
            </RowActions>
          </template>
        </el-table-column>
      </DataTable>

      <Pagination
        v-if="total > 0"
        v-model:page="params.page"
        v-model:limit="params.pageSize"
        :total="total"
        @pagination="fetchData"
      />
    </SectionCard>

    <AccountLinkEditor
      v-model="editorVisible"
      :group="current"
      @saved="fetchData"
      @stale="closeStale"
    />
    <AccountLinkUnlink
      v-model="unlinkVisible"
      :group="current"
      @removed="fetchData"
      @stale="closeStale"
    />
  </PageShell>
</template>

<script setup lang="ts">
import { useDebounceFn } from "@vueuse/core";

import DataTable from "@/components/DataTable/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import RowActions from "@/components/RowActions/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { usePageTable, useRefreshOnActivated } from "@/composables";
import { accountLinkService } from "@/services/account-link.service";
import type { AccountLink, AccountLinkQueryParams } from "@/types/account-link";
import AccountLinkEditor from "./components/AccountLinkEditor.vue";
import AccountLinkUnlink from "./components/AccountLinkUnlink.vue";

defineOptions({ name: "AccountLinks", inheritAttrs: false });

const filterBarRef = ref<InstanceType<typeof FilterBar>>();

const { loading, list, total, error, params, fetchData, handleQuery, resetParams } = usePageTable<
  AccountLink,
  AccountLinkQueryParams
>({
  initialParams: { page: 1, pageSize: 20, keyword: "" },
  request: accountLinkService.getPage,
});

const requestRows = useDebounceFn(handleQuery, 300);
watch(
  () => params.keyword,
  () => {
    params.page = 1;
    requestRows();
  },
);

function handleResetQuery(): void {
  filterBarRef.value?.form?.resetFields();
  resetParams();
  requestRows();
}

const current = ref<AccountLink | null>(null);
const editorVisible = ref(false);
const unlinkVisible = ref(false);

function openEditor(row: AccountLink | null): void {
  current.value = row;
  editorVisible.value = true;
}

function openUnlink(row: AccountLink): void {
  current.value = row;
  unlinkVisible.value = true;
}

/** 版本已变化：关闭弹窗并刷新列表，由管理员基于最新数据重新操作，不自动重试。 */
function closeStale(): void {
  editorVisible.value = false;
  unlinkVisible.value = false;
  void fetchData();
}

onMounted(handleQuery);
useRefreshOnActivated(fetchData);
</script>
