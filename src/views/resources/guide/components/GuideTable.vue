<template>
  <div class="page-container">
    <el-form
      inline
      class="page-search"
    >
      <el-form-item :label="$t('planning.secondLanguage')">
        <el-select
          v-model="secondLanguage"
          clearable
          class="w-[180px]"
        >
          <el-option
            v-for="item in GUIDE_LANGUAGE_OPTIONS"
            :key="item.value"
            :value="item.value"
            :label="$t(`planning.languages.${item.value}`)"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('planning.shopping')">
        <el-select
          v-model="shopping"
          clearable
          class="w-[140px]"
        >
          <el-option
            :label="$t('planning.withShopping')"
            value="true"
          /><el-option
            :label="$t('planning.withoutShopping')"
            value="false"
          />
        </el-select>
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
          {{ $t('planning.createGuide') }}
        </el-button>
      </TableToolbar>
      <div class="page-table-wrapper">
        <el-table
          :data="rows"
          border
          height="100%"
          row-key="id"
        >
          <el-table-column :label="$t('planning.guidePrice')">
            <template #default="{ row }">
              ¥{{ formatMoney(row.dailyPrice) }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('planning.secondLanguage')">
            <template #default="{ row }">
              {{ $t(`planning.languages.${row.secondLanguage}`) }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('planning.shopping')">
            <template #default="{ row }">
              {{ $t(row.shopping ? 'planning.withShopping' : 'planning.withoutShopping') }}
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('common.operation')"
            width="180"
          >
            <template #default="{ row }">
              <el-button
                v-has-perm="RESOURCE_PERMISSIONS.guide.update"
                link
                type="primary"
                @click="emit('edit', row as GuideRecord)"
              >
                {{ $t('common.edit') }}
              </el-button><el-button
                v-has-perm="RESOURCE_PERMISSIONS.guide.delete"
                link
                type="danger"
                @click="emit('delete', row as GuideRecord)"
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
import { ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useResourcePagination } from '@/views/resources/useResourcePagination';
import { GUIDE_LANGUAGE_OPTIONS, type GuideRecord, type ResourceListQuery } from '@/types/resource';
import { RESOURCE_PERMISSIONS } from '@/constants';
import { formatMoney } from '@/utils';
import TableToolbar from '@/components/TableToolbar/index.vue';
defineProps<{ rows: GuideRecord[]; total: number }>();
const emit = defineEmits<{ refresh: [ResourceListQuery]; 'query-change': [ResourceListQuery]; create: []; edit: [GuideRecord]; delete: [GuideRecord] }>();
const secondLanguage = ref(''); const shopping = ref('');
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
function query(): ResourceListQuery { return { ...paginationQuery(), secondLanguage: secondLanguage.value || undefined, shopping: shopping.value || undefined }; }
const requestRows = useDebounceFn(() => emit('query-change', query()), 300);
watch([secondLanguage, shopping], () => { pageNum.value = 1; requestRows(); });
function refreshRows() { emit('refresh', query()); }
</script>
