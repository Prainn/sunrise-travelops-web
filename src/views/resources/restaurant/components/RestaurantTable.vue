<template>
  <PageShell>
    <RestaurantSearchForm
      v-model:keywords="keywords"
      v-model:city="city"
      v-model:price-unit="priceUnit"
      v-model:is-standard-price="isStandardPrice"
      :city-options="cityOptions"
      @reset="resetQuery"
    />
    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="refreshRows">
        <el-button
          v-has-perm="RESOURCE_PERMISSIONS.restaurant.create"
          type="primary"
          @click="emit('create')"
        >
          {{ $t("common.create") }}
        </el-button>
      </TableToolbar>
      <DataTable
        fill
        :loading="loading"
        :data="rows"
        :error="error"
        :filtered="hasActiveFilters"
        row-key="id"
        @retry="refreshRows"
      >
        <el-table-column :label="$t('resource.isStandardPrice')" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isStandardPrice ? 'success' : 'info'">
              {{ $t(row.isStandardPrice ? "common.yes" : "common.no") }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="code" :label="$t('resource.code')" width="170" />
        <el-table-column prop="name" :label="$t('resource.restaurantName')" min-width="200" />
        <el-table-column
          prop="englishName"
          :label="$t('common.englishName')"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column :label="$t('common.price')" width="110" align="right">
          <template #default="scope">
            {{ formatMoney(scope.row.price) }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('restaurant.priceUnit')" width="130">
          <template #default="scope">
            {{
              scope.row.unit === "table" && scope.row.dinerCount
                ? `${$t("restaurant.perTable")} / ${scope.row.dinerCount}`
                : $t("restaurant.perPerson")
            }}
          </template>
        </el-table-column>
        <el-table-column prop="contact" :label="$t('common.contact')" min-width="110" />
        <el-table-column prop="phone" :label="$t('resource.phone')" min-width="130" />
        <el-table-column prop="city" :label="$t('common.cityRegion')" width="100" />
        <el-table-column
          prop="description"
          :label="$t('resource.description')"
          min-width="240"
          show-overflow-tooltip
        />
        <el-table-column
          prop="englishDescription"
          :label="$t('resource.englishDescription')"
          min-width="240"
          show-overflow-tooltip
        />
        <el-table-column :label="$t('common.status')" width="90" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'enabled' ? 'success' : 'info'">
              {{ $t(`common.${scope.row.status}`) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('common.actions')"
          width="190"
          fixed="right"
          align="center"
          :show-overflow-tooltip="false"
        >
          <template #default="scope">
            <RowActions>
              <el-button
                v-has-perm="RESOURCE_PERMISSIONS.restaurant.update"
                type="primary"
                link
                @click="emit('edit', scope.row as RestaurantRecord)"
              >
                {{ $t("common.edit") }}
              </el-button>
              <el-button
                v-has-perm="RESOURCE_PERMISSIONS.restaurant.update"
                type="warning"
                link
                @click="emit('toggle-status', scope.row as RestaurantRecord)"
              >
                {{ $t(scope.row.status === "enabled" ? "common.disabled" : "common.enabled") }}
              </el-button>
              <el-button
                v-has-perm="RESOURCE_PERMISSIONS.restaurant.delete"
                type="danger"
                link
                @click="emit('delete', scope.row as RestaurantRecord)"
              >
                {{ $t("common.delete") }}
              </el-button>
            </RowActions>
          </template>
        </el-table-column>
      </DataTable>
      <Pagination
        v-if="total > 0"
        v-model:page="pageNum"
        v-model:limit="pageSize"
        :total="total"
        @pagination="refreshRows"
      />
    </SectionCard>
  </PageShell>
</template>

<script setup lang="ts">
import { useResourcePagination } from "@/views/resources/useResourcePagination";
import { useCityOptions } from "@/composables/useCityOptions";
import { computed, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { RESOURCE_PERMISSIONS } from "@/constants";
import type {
  ResourceListQuery,
  RestaurantPriceUnit,
  RestaurantRecord,
} from "@/types/resource";
import { formatMoney } from "@/utils";
import DataTable from "@/components/DataTable/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import RowActions from "@/components/RowActions/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import RestaurantSearchForm from "./RestaurantSearchForm.vue";

defineProps<{
  loading?: boolean;
  rows: RestaurantRecord[];
  total: number;
  /** 列表加载失败信息 */
  error?: string;
}>();
const emit = defineEmits<{
  refresh: [query: ResourceListQuery];
  "query-change": [query: ResourceListQuery];
  create: [];
  edit: [record: RestaurantRecord];
  delete: [record: RestaurantRecord];
  "toggle-status": [record: RestaurantRecord];
}>();

const keywords = ref("");
const city = ref("");
const priceUnit = ref<RestaurantPriceUnit | "">("");
const isStandardPrice = ref<boolean | "">("");
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
const cityOptions = useCityOptions();
const hasActiveFilters = computed(
  () => Boolean(keywords.value || city.value || priceUnit.value) || isStandardPrice.value !== "",
);
const requestRows = useDebounceFn(() => emit("query-change", currentQuery()), 300);

watch([keywords, city, priceUnit, isStandardPrice], () => {
  pageNum.value = 1;
  requestRows();
});

function currentQuery(): ResourceListQuery {
  return {
    ...paginationQuery(),
    keyword: keywords.value,
    city: city.value,
    unit: priceUnit.value,
    isStandardPrice: isStandardPrice.value === "" ? undefined : isStandardPrice.value,
  };
}

function resetQuery() {
  keywords.value = "";
  city.value = "";
  priceUnit.value = "";
  isStandardPrice.value = "";
  pageNum.value = 1;
  requestRows();
}

function refreshRows() {
  emit("refresh", currentQuery());
}
</script>
