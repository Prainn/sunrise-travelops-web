<template>
  <el-card
    class="page-content"
    shadow="never"
  >
    <TableToolbar @refresh="emit('refresh')">
      <el-button
        v-has-perm="RESOURCE_PERMISSIONS.hotel.create"
        type="primary"
        @click="emit('create')"
      >
        {{ $t("hotel.createHotel") }}
      </el-button>
    </TableToolbar>

    <div class="page-table-wrapper">
      <el-table
        :data="rows"
        border
        height="100%"
        row-key="id"
      >
        <el-table-column
          prop="code"
          :label="$t('resource.code')"
          width="120"
        />
        <el-table-column
          prop="name"
          :label="$t('resource.hotelName')"
          min-width="190"
        />
        <el-table-column
          prop="city"
          :label="$t('resource.city')"
          width="100"
        />
        <el-table-column
          prop="rating"
          :label="$t('resource.starRating')"
          width="130"
        >
          <template #default="scope">
            {{ $t(`hotel.ratings.${scope.row.rating}`) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="individualPrice"
          :label="$t('hotel.individualPrice')"
          width="120"
          align="right"
        />
        <el-table-column
          prop="groupPrice"
          :label="$t('hotel.groupPrice')"
          width="120"
          align="right"
        />
        <el-table-column
          prop="minimumGroupSize"
          :label="$t('hotel.minimumGroupSize')"
          width="110"
          align="center"
        />
        <el-table-column
          prop="unit"
          :label="$t('resource.priceUnit')"
          width="120"
        >
          <template #default="scope">
            {{ getResourceUnitName(scope.row.unit, locale) }}
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('hotel.breakfastIncluded')"
          width="120"
        >
          <template #default="scope">
            {{ $t(scope.row.breakfastIncluded ? 'itinerary.breakfastIncluded' : 'itinerary.breakfastExcluded') }}
          </template>
        </el-table-column>
        <el-table-column
          prop="address"
          :label="$t('hotel.address')"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column
          prop="phone"
          :label="$t('resource.phone')"
          width="150"
        />
        <el-table-column
          :label="$t('common.status')"
          width="90"
          align="center"
        >
          <template #default="scope">
            <el-tag :type="scope.row.status === 'enabled' ? 'success' : 'info'">
              {{ $t(`common.${scope.row.status}`) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('common.actions')"
          width="220"
          fixed="right"
        >
          <template #default="scope">
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
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { RESOURCE_PERMISSIONS } from "@/constants";
import type { HotelRecord } from "@/types/resource";
import { getResourceUnitName } from "@/utils/resource-unit";

defineProps<{
  rows: HotelRecord[];
}>();

const emit = defineEmits<{
  refresh: [];
  create: [];
  edit: [hotel: HotelRecord];
  delete: [hotel: HotelRecord];
  "toggle-status": [hotel: HotelRecord];
}>();

const { locale } = useI18n();
</script>
