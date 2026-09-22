<template>
  <div class="page-container">
    <el-form inline class="page-search">
      <el-form-item :label="$t('planning.secondLanguage')">
        <el-select v-model="secondLanguage" clearable class="w-[180px]">
          <el-option
            v-for="item in GUIDE_LANGUAGE_OPTIONS"
            :key="item.value"
            :value="item.value"
            :label="$t(`planning.languages.${item.value}`)"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('planning.shopping')">
        <el-select v-model="shopping" clearable class="w-[140px]">
          <el-option :label="$t('planning.withShopping')" value="true" /><el-option
            :label="$t('planning.withoutShopping')"
            value="false"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="resetQuery">
          {{ $t("common.reset") }}
        </el-button>
      </el-form-item>
    </el-form>
    <el-card class="page-content" shadow="never">
      <TableToolbar @refresh="refreshRows">
        <el-button
          v-has-perm="RESOURCE_PERMISSIONS.guide.create"
          type="primary"
          @click="emit('create')"
        >
          {{ $t("guide.createPrice") }}
        </el-button>
      </TableToolbar>
      <div class="page-table-wrapper">
        <el-table v-loading="loading" :data="rows" border height="100%" row-key="id">
          <el-table-column :label="$t('identity.library')" min-width="200">
            <template #default="{ row }">
              <ResourceLibraryTag :library="row.library" />
            </template>
          </el-table-column>
          <el-table-column :label="$t('guide.referenceDailyPrice')">
            <template #default="{ row }"> ¥{{ formatMoney(row.dailyPrice) }} </template>
          </el-table-column>
          <el-table-column :label="$t('planning.secondLanguage')">
            <template #default="{ row }">
              {{
                row.secondLanguage
                  ? $t(`planning.languages.${row.secondLanguage}`)
                  : $t("common.notSet")
              }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('planning.shopping')">
            <template #default="{ row }">
              <el-tag :type="row.shopping ? 'success' : 'info'">
                {{ $t(row.shopping ? "planning.withShopping" : "planning.withoutShopping") }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.status')" min-width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">
                {{ $t(row.status === "enabled" ? "common.enabled" : "common.disabled") }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.actions')" width="260">
            <template #default="{ row }">
              <el-button
                v-has-perm="RESOURCE_PERMISSIONS.guide.update"
                link
                type="primary"
                @click="emit('edit', row as GuideRecord)"
              >
                {{ $t("common.edit") }} </el-button
              ><el-button
                v-has-perm="RESOURCE_PERMISSIONS.guide.update"
                link
                @click="emit('toggle-status', row as GuideRecord)"
              >
                {{
                  $t(row.status === "enabled" ? "common.disabled" : "common.enabled")
                }} </el-button
              ><el-button
                v-has-perm="RESOURCE_PERMISSIONS.guide.delete"
                link
                type="danger"
                @click="emit('delete', row as GuideRecord)"
              >
                {{ $t("common.delete") }}
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
import ResourceLibraryTag from "@/components/ResourceLibraryTag.vue";
import { ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { useResourcePagination } from "@/views/resources/useResourcePagination";
import { GUIDE_LANGUAGE_OPTIONS, type GuideRecord, type ResourceListQuery } from "@/types/resource";
import { RESOURCE_PERMISSIONS } from "@/constants";
import { formatMoney } from "@/utils";
import TableToolbar from "@/components/TableToolbar/index.vue";
defineProps<{
  loading?: boolean;
  rows: GuideRecord[];
  total: number;
}>();
const emit = defineEmits<{
  refresh: [ResourceListQuery];
  "query-change": [ResourceListQuery];
  create: [];
  edit: [GuideRecord];
  "toggle-status": [GuideRecord];
  delete: [GuideRecord];
}>();
const secondLanguage = ref("");
const shopping = ref("");
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
function query(): ResourceListQuery {
  return {
    ...paginationQuery(),
    secondLanguage: secondLanguage.value || undefined,
    shopping: shopping.value || undefined,
  };
}
const requestRows = useDebounceFn(() => emit("query-change", query()), 300);
watch([secondLanguage, shopping], () => {
  pageNum.value = 1;
  requestRows();
});
function refreshRows() {
  emit("refresh", query());
}
function resetQuery() {
  secondLanguage.value = "";
  shopping.value = "";
  pageNum.value = 1;
  requestRows();
}
</script>
