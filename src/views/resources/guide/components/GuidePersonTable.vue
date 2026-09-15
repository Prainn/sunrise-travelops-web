<template>
  <div class="page-container">
    <el-form
      inline
      class="page-search"
    >
      <ResourceBusinessFilter />
      <el-form-item class="w-300px">
        <el-input
          v-model="keyword"
          :placeholder="$t('guide.searchPeople')"
          clearable
        />
      </el-form-item>
      <el-form-item :label="$t('common.status')">
        <el-select
          v-model="status"
          clearable
          class="w-[140px]"
        >
          <el-option
            :label="$t('common.enabled')"
            value="enabled"
          />
          <el-option
            :label="$t('common.disabled')"
            value="disabled"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="resetQuery">
          {{ $t('common.reset') }}
        </el-button>
      </el-form-item>
    </el-form>
    <el-card
      class="page-content"
      shadow="never"
    >
      <TableToolbar @refresh="refreshRows">
        <el-button
          v-has-perm="RESOURCE_PERMISSIONS.guide.create"
          type="primary"
          @click="emit('create')"
        >
          {{ $t('guide.createGuide') }}
        </el-button>
        <el-button @click="emit('open-prices')">
          {{ $t('guide.priceSettings') }}
        </el-button>
      </TableToolbar>
      <div class="page-table-wrapper">
        <el-table
          v-loading="loading"
          :data="rows"
          border
          height="100%"
          row-key="id"
        >
          <el-table-column
            :label="$t('identity.library')"
            min-width="190"
          >
            <template #default="{ row }">
              <ResourceLibraryTag :library="row.library" />
            </template>
          </el-table-column>
          <el-table-column
            prop="name"
            :label="$t('guide.name')"
            min-width="160"
          />
          <el-table-column
            :label="$t('guide.gender')"
            min-width="100"
          >
            <template #default="{ row }">
              {{ $t(`guide.genderOptions.${row.gender}`) }}
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('guide.age')"
            min-width="90"
          >
            <template #default="{ row }">
              {{ row.age ?? $t('common.notSet') }}
            </template>
          </el-table-column>
          <el-table-column
            prop="contact"
            :label="$t('guide.contact')"
            min-width="180"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.contact ?? $t('common.notSet') }}
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('guide.employmentType')"
            min-width="110"
          >
            <template #default="{ row }">
              {{ row.employmentType ? $t(`guide.${row.employmentType === 'full_time' ? 'fullTime' : 'partTime'}`) : $t('common.notSet') }}
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('guide.hasLaborContract')"
            min-width="110"
          >
            <template #default="{ row }">
              {{ row.hasLaborContract === null ? $t('common.notSet') : $t(row.hasLaborContract ? 'guide.contractYes' : 'guide.contractNo') }}
            </template>
          </el-table-column>
          <el-table-column
            prop="remark"
            :label="$t('guide.remark')"
            min-width="180"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ row.remark ?? $t('common.notSet') }}
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('guide.certificateNo')"
            min-width="220"
          >
            <template #default="{ row }">
              {{ row.certificateNo ?? $t('common.notSet') }}
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('guide.identityNumber')"
            min-width="220"
          >
            <template #default="{ row }">
              {{ row.identityNumber ?? $t('common.notSet') }}
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('common.status')"
            min-width="100"
          >
            <template #default="{ row }">
              <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">
                {{ $t(row.status === 'enabled' ? 'common.enabled' : 'common.disabled') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('common.actions')"
            min-width="260"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                @click="emit('detail', row as GuidePersonRecord)"
              >
                {{ $t('guide.detail') }}
              </el-button>
              <el-button
                v-has-perm="RESOURCE_PERMISSIONS.guide.update"
                link
                type="primary"
                @click="emit('edit', row as GuidePersonRecord)"
              >
                {{ $t('common.edit') }}
              </el-button>
              <el-button
                v-has-perm="RESOURCE_PERMISSIONS.guide.update"
                link
                @click="emit('toggle-status', row as GuidePersonRecord)"
              >
                {{ $t(row.status === 'enabled' ? 'common.disabled' : 'common.enabled') }}
              </el-button>
              <el-button
                v-has-perm="RESOURCE_PERMISSIONS.guide.delete"
                link
                type="danger"
                @click="emit('delete', row as GuidePersonRecord)"
              >
                {{ $t('common.delete') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <pagination
        v-if="total > 0"
        v-model:page="pageNum"
        v-model:limit="pageSize"
        :total="total"
        @pagination="refreshRows"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { RESOURCE_PERMISSIONS } from "@/constants";
import ResourceLibraryTag from "@/components/ResourceLibraryTag.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { resetResourceBusinessFilter } from "@/services/resource-library";
import type { GuidePersonRecord, ResourceListQuery, ResourceStatus } from "@/types/resource";
import ResourceBusinessFilter from "@/views/resources/components/ResourceBusinessFilter.vue";
import { useResourcePagination } from "@/views/resources/useResourcePagination";

defineProps<{ loading?: boolean; rows: GuidePersonRecord[]; total: number }>();
const emit = defineEmits<{
  refresh: [ResourceListQuery];
  'query-change': [ResourceListQuery];
  create: [];
  'open-prices': [];
  detail: [GuidePersonRecord];
  edit: [GuidePersonRecord];
  'toggle-status': [GuidePersonRecord];
  delete: [GuidePersonRecord];
}>();
const keyword = ref("");
const status = ref<ResourceStatus | "">("");
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
function query(): ResourceListQuery {
  return { ...paginationQuery(), keyword: keyword.value || undefined, status: status.value || undefined };
}
const requestRows = useDebounceFn(() => emit('query-change', query()), 300);
watch([keyword, status], () => { pageNum.value = 1; requestRows(); });
function refreshRows() { emit('refresh', query()); }
function resetQuery() {
  keyword.value = "";
  status.value = "";
  pageNum.value = 1;
  resetResourceBusinessFilter();
  requestRows();
}
</script>
