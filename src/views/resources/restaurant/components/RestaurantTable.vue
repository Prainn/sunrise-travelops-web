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
      <div class="page-toolbar">
        <div class="page-toolbar__left">
          <el-button
            type="primary"
            @click="emit('create')"
          >
            {{ $t("restaurant.createRestaurant") }}
          </el-button>
        </div>
      </div>
      <div class="page-table-wrapper">
        <el-table
          :data="pagedRows"
          border
          height="100%"
          row-key="id"
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
                        :type="priceScope.row.unit === 'per-person' ? 'success' : 'primary'"
                        effect="plain"
                      >
                        {{ $t(priceScope.row.unit === "per-person" ? "restaurant.perPerson" : "restaurant.perTable") }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column
                    :label="$t('restaurant.price')"
                    width="110"
                    align="right"
                  >
                    <template #default="priceScope">
                      ¥{{ Number(priceScope.row.price).toFixed(2) }}
                    </template>
                  </el-table-column>
                  <el-table-column
                    :label="$t('restaurant.dinerCount')"
                    width="100"
                    align="center"
                  >
                    <template #default="priceScope">
                      {{ priceScope.row.unit === "per-person" ? "-" : priceScope.row.dinerCount }}
                    </template>
                  </el-table-column>
                  <el-table-column
                    :label="$t('resource.providerSource')"
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
                      <span v-else>{{ $t("resource.directProvided") }}</span>
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
                        type="primary"
                        link
                        @click="emit('edit-price', scope.row as RestaurantRecord, priceScope.row as RestaurantPriceRecord)"
                      >
                        {{ $t("common.edit") }}
                      </el-button>
                      <el-button
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
            width="120"
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
                type="primary"
                link
                @click="emit('edit', scope.row as RestaurantRecord)"
              >
                {{ $t("common.edit") }}
              </el-button>
              <el-button
                type="warning"
                link
                @click="emit('toggle-status', scope.row as RestaurantRecord)"
              >
                {{ $t(scope.row.status === "enabled" ? "common.disabled" : "common.enabled") }}
              </el-button>
              <el-button
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
        v-if="filteredRows.length"
        v-model:page="pageNum"
        v-model:limit="pageSize"
        :total="total"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { tourismResources } from "@/data/data";
import type { RestaurantPriceRecord, RestaurantPriceUnit, RestaurantRecord } from "@/data/data";
import RestaurantSearchForm from "./RestaurantSearchForm.vue";

const props = defineProps<{ rows: RestaurantRecord[] }>();
const emit = defineEmits<{
  create: [];
  edit: [record: RestaurantRecord];
  delete: [record: RestaurantRecord];
  "toggle-status": [record: RestaurantRecord];
  "create-price": [record: RestaurantRecord];
  "edit-price": [record: RestaurantRecord, price: RestaurantPriceRecord];
  "delete-price": [record: RestaurantRecord, price: RestaurantPriceRecord];
}>();

const { t } = useI18n();
const keywords = ref("");
const city = ref("");
const priceUnit = ref<RestaurantPriceUnit | "">("");
const pageNum = ref(1);
const pageSize = ref(10);
const cityOptions = computed(() => [...new Set(props.rows.map((record) => record.city))]);
const groundOperatorOptions = computed(() => tourismResources.supplier.filter((item) => item.status === "enabled"));
const filteredRows = computed(() => props.rows.filter((record) => (
  (!city.value || record.city === city.value)
  && (!priceUnit.value || record.prices.some((price) => price.unit === priceUnit.value))
  && (!keywords.value || [record.code, record.name, record.city, record.cuisine]
    .some((field) => field.toLowerCase().includes(keywords.value.toLowerCase())))
)));
const total = computed(() => filteredRows.value.length);
const pagedRows = computed(() => filteredRows.value.slice((pageNum.value - 1) * pageSize.value, pageNum.value * pageSize.value));

function resetQuery() {
  keywords.value = "";
  city.value = "";
  priceUnit.value = "";
  pageNum.value = 1;
}

function getGroundOperatorName(id: string) {
  return groundOperatorOptions.value.find((item) => item.id === id)?.name ?? t("resource.groundOperatorProvided");
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
