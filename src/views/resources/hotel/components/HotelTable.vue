<template>
  <el-card
    class="page-content"
    shadow="never"
  >
    <div class="page-toolbar">
      <div class="page-toolbar__left">
        <el-button
          type="primary"
          @click="emit('create')"
        >
          {{ $t("hotel.createHotel") }}
        </el-button>
      </div>
    </div>

    <div class="page-table-wrapper">
      <el-table
        :data="rows"
        border
        height="100%"
        row-key="id"
      >
        <el-table-column
          type="expand"
          width="48"
        >
          <template #default="scope">
            <div class="hotel-table__prices">
              <div class="hotel-table__price-header">
                <strong>{{ $t("hotel.roomPriceTitle") }}</strong>
                <el-button
                  type="primary"
                  link
                  @click="emit('create-price', scope.row as HotelRecord)"
                >
                  {{ $t("hotel.addRoomPrice") }}
                </el-button>
              </div>
              <el-table
                :data="flattenPricePlans(scope.row as HotelRecord)"
                size="small"
                border
              >
                <el-table-column
                  prop="roomType"
                  :label="$t('hotel.roomType')"
                  min-width="170"
                />
                <el-table-column
                  prop="rackRate"
                  :label="$t('hotel.rackRate')"
                  width="100"
                  align="right"
                />
                <el-table-column
                  prop="periodName"
                  :label="$t('hotel.pricePeriod')"
                  width="100"
                />
                <el-table-column
                  prop="effectivePeriod"
                  :label="$t('hotel.effectivePeriod')"
                  min-width="190"
                />
                <el-table-column
                  prop="individualPrice"
                  :label="$t('hotel.individualPrice')"
                  width="100"
                  align="right"
                />
                <el-table-column
                  prop="groupPrice"
                  :label="$t('hotel.groupPrice')"
                  width="100"
                  align="right"
                />
                <el-table-column
                  prop="minimumRooms"
                  :label="$t('hotel.minimumRooms')"
                  width="100"
                  align="center"
                />
                <el-table-column
                  :label="$t('resource.priceSource')"
                  min-width="160"
                >
                  <template #default="priceScope">
                    <el-tag
                      v-if="priceScope.row.isGroundOperatorProvided"
                      type="warning"
                      effect="plain"
                    >
                      {{ getGroundOperatorName(priceScope.row.groundOperatorId) }}
                    </el-tag>
                    <span v-else>{{ $t("resource.directPrice") }}</span>
                  </template>
                </el-table-column>
                <el-table-column
                  :label="$t('common.actions')"
                  width="210"
                  align="center"
                >
                  <template #default="priceScope">
                    <el-button
                      type="primary"
                      link
                      @click="emit('edit-price', scope.row as HotelRecord, priceScope.row as RoomPriceRow)"
                    >
                      {{ $t("common.edit") }}
                    </el-button>
                    <el-button
                      type="danger"
                      link
                      @click="emit('delete-price', scope.row as HotelRecord, priceScope.row as RoomPriceRow)"
                    >
                      {{ $t("common.delete") }}
                    </el-button>
                    <el-button
                      type="danger"
                      link
                      @click="emit('delete-room', scope.row as HotelRecord, priceScope.row as RoomPriceRow)"
                    >
                      {{ $t("hotel.deleteRoomType") }}
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </template>
        </el-table-column>
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
          width="90"
        />
        <el-table-column
          :label="$t('hotel.roomTypeCount')"
          width="100"
          align="center"
        >
          <template #default="scope">
            {{ scope.row.roomTypes.length }}
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
              type="primary"
              link
              @click="emit('edit', scope.row as HotelRecord)"
            >
              {{ $t("common.edit") }}
            </el-button>
            <el-button
              type="warning"
              link
              @click="emit('toggle-status', scope.row as HotelRecord)"
            >
              {{ $t(scope.row.status === "enabled" ? "common.disabled" : "common.enabled") }}
            </el-button>
            <el-button
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
import type { HotelRecord, TourismResourceRecord } from "@/data/data";
import type { RoomPriceRow } from "../types";

const props = defineProps<{
  rows: HotelRecord[];
  groundOperatorOptions: TourismResourceRecord[];
}>();

const emit = defineEmits<{
  create: [];
  edit: [hotel: HotelRecord];
  delete: [hotel: HotelRecord];
  "toggle-status": [hotel: HotelRecord];
  "create-price": [hotel: HotelRecord];
  "edit-price": [hotel: HotelRecord, row: RoomPriceRow];
  "delete-price": [hotel: HotelRecord, row: RoomPriceRow];
  "delete-room": [hotel: HotelRecord, row: RoomPriceRow];
}>();

const { t } = useI18n();

function getGroundOperatorName(id: string) {
  return (
    props.groundOperatorOptions.find((item) => item.id === id)?.name ??
    t("resource.groundOperatorProvidedTag")
  );
}

function flattenPricePlans(hotel: HotelRecord): RoomPriceRow[] {
  return hotel.roomTypes.flatMap((room) =>
    room.pricePlans.map((plan) => ({
      ...plan,
      roomId: room.id,
      pricePlanId: plan.id,
      roomType: room.name,
      rackRate: room.rackRate,
      effectivePeriod:
        plan.startDate && plan.endDate
          ? `${plan.startDate} — ${plan.endDate}`
          : t("common.notSet"),
    }))
  );
}
</script>

<style scoped lang="scss">
.hotel-table {
  &__prices {
    padding: 16px 48px;
    background: var(--el-fill-color-lighter);
  }

  &__price-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
}
</style>
