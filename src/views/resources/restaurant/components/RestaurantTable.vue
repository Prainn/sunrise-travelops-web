<template>
  <div class="page-container">
    <RestaurantSearchForm
      v-model:keywords="keywords"
      v-model:city="city"
      v-model:price-unit="priceUnit"
      :city-options="cityOptions"
      @reset="resetQuery"
    />
    <el-card
      class="page-content"
      shadow="never"
    >
      <TableToolbar @refresh="refreshRows">
        <el-button
          v-has-perm="RESOURCE_PERMISSIONS.restaurant.create"
          type="primary"
          @click="emit('create')"
        >
          {{ $t("restaurant.createRestaurant") }}
        </el-button>
      </TableToolbar>
      <div class="page-table-wrapper">
        <el-table
          :data="rows"
          border
          height="100%"
          row-key="id"
          @expand-change="changeExpand"
        >
          <el-table-column
            type="expand"
            width="48"
          >
            <template #default="scope">
              <div class="restaurant-table__prices">
                <div class="restaurant-table__price-header">
                  <strong>{{ $t("restaurant.priceItems") }}</strong>
                  <el-button
                    v-has-perm="RESOURCE_PERMISSIONS.restaurant.update"
                    type="primary"
                    link
                    @click="emit('create-price', scope.row as RestaurantRecord)"
                  >
                    {{ $t("restaurant.createPrice") }}
                  </el-button>
                </div>
                <el-table
                  :data="scope.row.prices"
                  border
                  size="small"
                >
                  <el-table-column
                    prop="menuName"
                    :label="$t('restaurant.menuName')"
                    min-width="200"
                  />
                  <el-table-column
                    :label="$t('restaurant.dishDetails')"
                    min-width="420"
                    :show-overflow-tooltip="false"
                  >
                    <template #default="priceScope">
                      <ul
                        v-if="priceScope.row.dishDetails"
                        class="restaurant-table__dish-list"
                      >
                        <li
                          v-for="detail in splitDishDetails(priceScope.row.dishDetails)"
                          :key="detail"
                        >
                          {{ detail }}
                        </li>
                      </ul>
                      <span v-else>-</span>
                    </template>
                  </el-table-column>
                  <el-table-column
                    :label="$t('restaurant.priceUnit')"
                    width="110"
                    align="center"
                  >
                    <template #default="priceScope">
                      <el-tag
                        :type="priceScope.row.unit === 'personMeal' ? 'success' : 'primary'"
                        effect="plain"
                      >
                        {{ $t(priceScope.row.unit === "personMeal" ? "restaurant.perPerson" : "restaurant.perTable") }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column
                    :label="$t('restaurant.price')"
                    width="110"
                    align="right"
                  >
                    <template #default="priceScope">
                      ¥{{ formatMoney(Number(priceScope.row.price)) }}
                    </template>
                  </el-table-column>
                  <el-table-column
                    :label="$t('restaurant.dinerCount')"
                    width="100"
                    align="center"
                  >
                    <template #default="priceScope">
                      {{ priceScope.row.unit === "personMeal" ? "-" : priceScope.row.dinerCount }}
                    </template>
                  </el-table-column>
                  <el-table-column
                    prop="remark"
                    :label="$t('common.remark')"
                    min-width="180"
                    show-overflow-tooltip
                  />
                  <el-table-column
                    :label="$t('common.actions')"
                    width="120"
                    align="center"
                  >
                    <template #default="priceScope">
                      <el-button
                        v-has-perm="RESOURCE_PERMISSIONS.restaurant.update"
                        type="primary"
                        link
                        @click="emit('edit-price', scope.row as RestaurantRecord, priceScope.row as RestaurantPriceRecord)"
                      >
                        {{ $t("common.edit") }}
                      </el-button>
                      <el-button
                        v-has-perm="RESOURCE_PERMISSIONS.restaurant.delete"
                        type="danger"
                        link
                        @click="emit('delete-price', scope.row as RestaurantRecord, priceScope.row as RestaurantPriceRecord)"
                      >
                        {{ $t("common.delete") }}
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
            width="200"
          />
          <el-table-column
            prop="name"
            :label="$t('resource.restaurantName')"
            min-width="190"
          />
          <el-table-column
            prop="city"
            :label="$t('resource.city')"
            width="100"
          />
          <el-table-column
            prop="cuisine"
            :label="$t('resource.cuisine')"
            min-width="180"
          />
          <el-table-column
            prop="contact"
            :label="$t('resource.contact')"
            min-width="110"
          />
          <el-table-column
            prop="phone"
            :label="$t('resource.phone')"
            min-width="130"
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
            align="center"
          >
            <template #default="scope">
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
import { useResourcePagination } from "@/views/resources/useResourcePagination";
import { useCityOptions } from "@/composables/useCityOptions";
import { ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { RESOURCE_PERMISSIONS } from "@/constants";
import type { ResourceListQuery, RestaurantPriceRecord, RestaurantPriceUnit, RestaurantRecord } from "@/types/resource";
import { formatMoney } from "@/utils";
import TableToolbar from "@/components/TableToolbar/index.vue";
import RestaurantSearchForm from "./RestaurantSearchForm.vue";

defineProps<{ rows: RestaurantRecord[]; total: number }>();
const emit = defineEmits<{
  refresh: [query: ResourceListQuery];
  "query-change": [query: ResourceListQuery];
  create: [];
  edit: [record: RestaurantRecord];
  delete: [record: RestaurantRecord];
  "toggle-status": [record: RestaurantRecord];
  expand: [record: RestaurantRecord];
  "create-price": [record: RestaurantRecord];
  "edit-price": [record: RestaurantRecord, price: RestaurantPriceRecord];
  "delete-price": [record: RestaurantRecord, price: RestaurantPriceRecord];
}>();

const keywords = ref("");
const city = ref("");
const priceUnit = ref<RestaurantPriceUnit | "">("");
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
const cityOptions = useCityOptions();
const requestRows = useDebounceFn(() => emit("query-change", currentQuery()), 300);

watch([keywords, city, priceUnit], () => {
  pageNum.value = 1;
  requestRows();
});

function currentQuery(): ResourceListQuery {
  return { ...paginationQuery(), keyword: keywords.value, city: city.value, unit: priceUnit.value };
}

function resetQuery() {
  keywords.value = "";
  city.value = "";
  priceUnit.value = "";
  pageNum.value = 1;
}

function refreshRows() {
  emit("refresh", currentQuery());
}

function changeExpand(record: RestaurantRecord, expanded: RestaurantRecord[] | boolean) {
  const isExpanded = Array.isArray(expanded)
    ? expanded.some((item) => item.id === record.id)
    : expanded;
  if (isExpanded) emit("expand", record);
}

function splitDishDetails(details: string) {
  return details.split("；").filter(Boolean);
}
</script>

<style scoped lang="scss">
.restaurant-table {
  &__prices { padding: 16px 48px; background: var(--el-fill-color-lighter); }
  &__price-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  &__dish-list { max-height: 180px; margin: 0; padding-left: 18px; overflow-y: auto; line-height: 1.7; white-space: normal; }
}
</style>
