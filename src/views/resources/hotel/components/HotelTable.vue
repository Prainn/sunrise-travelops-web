<template>
  <SectionCard fill>
    <TableToolbar :refreshing="loading" @refresh="emit('refresh')">
      <el-button
        v-has-perm="RESOURCE_PERMISSIONS.hotel.create"
        type="primary"
        @click="emit('create')"
      >
        {{ $t("hotel.createHotel") }}
      </el-button>
    </TableToolbar>

    <DataTable
      fill
      :loading="loading"
      :data="rows"
      :error="error"
      :filtered="filtered"
      row-key="id"
      @retry="emit('refresh')"
    >
      <el-table-column prop="code" :label="$t('resource.code')" width="200" />
      <el-table-column prop="name" :label="$t('resource.hotelName')" min-width="190" />
      <el-table-column
        prop="englishName"
        :label="$t('resource.englishName')"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column prop="city" :label="$t('resource.city')" width="100" />
      <el-table-column prop="rating" :label="$t('resource.starRating')" width="130">
        <template #default="scope">
          <el-tag :type="scope.row.rating === 5 ? 'success' : scope.row.rating === 4 ? 'primary' : 'info'">
            {{ $t(`hotel.ratings.${scope.row.rating}`) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="individualPrice"
        :label="$t('hotel.individualPrice')"
        width="120"
        align="right"
      >
        <template #default="{ row }">
          {{ formatMoney(row.individualPrice) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="groupPrice"
        :label="$t('hotel.groupPrice')"
        width="120"
        align="right"
      >
        <template #default="{ row }">
          {{ formatMoney(row.groupPrice) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="minimumGroupSize"
        :label="$t('hotel.minimumGroupSize')"
        width="110"
        align="center"
      />
      <el-table-column prop="unit" :label="$t('resource.priceUnit')" width="120">
        <template #default="scope">
          {{ getResourceUnitName(scope.row.unit, locale) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="address"
        :label="$t('hotel.address')"
        min-width="220"
        show-overflow-tooltip
      />
      <el-table-column prop="phone" :label="$t('resource.phone')" width="150" />
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
        :show-overflow-tooltip="false"
      >
        <template #default="scope">
          <RowActions>
            <el-button
              v-has-perm="RESOURCE_PERMISSIONS.hotel.update"
              type="primary"
              link
              @click="emit('edit', scope.row as HotelRecord)"
            >
              {{ $t("common.edit") }}
            </el-button>
            <el-button
              v-has-perm="RESOURCE_PERMISSIONS.hotel.update"
              type="warning"
              link
              @click="emit('toggle-status', scope.row as HotelRecord)"
            >
              {{ $t(scope.row.status === "enabled" ? "common.disabled" : "common.enabled") }}
            </el-button>
            <el-button
              v-has-perm="RESOURCE_PERMISSIONS.hotel.delete"
              type="danger"
              link
              @click="emit('delete', scope.row as HotelRecord)"
            >
              {{ $t("common.delete") }}
            </el-button>
          </RowActions>
        </template>
      </el-table-column>
    </DataTable>
    <Pagination
      v-if="total > 0"
      v-model:page="page"
      v-model:limit="limit"
      :total="total"
      @pagination="emit('pagination')"
    />
  </SectionCard>
</template>

<script setup lang="ts">
import { formatMoney } from "@/utils";
import { useI18n } from "vue-i18n";
import DataTable from "@/components/DataTable/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import RowActions from "@/components/RowActions/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { RESOURCE_PERMISSIONS } from "@/constants";
import type { HotelRecord } from "@/types/resource";
import { getResourceUnitName } from "@/utils/resource-unit";

defineProps<{
  loading?: boolean;
  rows: HotelRecord[];
  total: number;
  /** 列表加载失败信息 */
  error?: string;
  /** 存在生效的筛选条件 */
  filtered?: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
  pagination: [];
  create: [];
  edit: [hotel: HotelRecord];
  delete: [hotel: HotelRecord];
  "toggle-status": [hotel: HotelRecord];
}>();

const page = defineModel<number>("page", { required: true });
const limit = defineModel<number>("limit", { required: true });
const { locale } = useI18n();
</script>
