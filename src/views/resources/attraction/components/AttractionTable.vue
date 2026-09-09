<template>
  <div class="page-container">
    <AttractionSearchForm
      v-model:keywords="keywords"
      v-model:area="area"
      v-model:category="category"
      @reset="resetQuery"
    />

    <el-card
      class="page-content"
      shadow="never"
    >
      <TableToolbar @refresh="refreshRows">
        <el-button
          v-has-perm="RESOURCE_PERMISSIONS.attraction.create"
          type="primary"
          @click="emit('create')"
        >
          {{ $t("attraction.createAttraction") }}
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
              <div class="attraction-table__prices">
                <div class="attraction-table__price-header">
                  <strong>{{ $t("attraction.priceItems") }}</strong>
                  <el-button
                    v-has-perm="RESOURCE_PERMISSIONS.attraction.update"
                    type="primary"
                    link
                    @click="emit('create-price', scope.row as AttractionRecord)"
                  >
                    {{ $t("attraction.createPrice") }}
                  </el-button>
                </div>
                <el-table
                  :data="scope.row.prices"
                  border
                  size="small"
                >
                  <el-table-column
                    :label="$t('attraction.itemType')"
                    width="100"
                  >
                    <template #default="priceScope">
                      {{ $t(attractionItemTypeLabelKeys[priceScope.row.itemType as AttractionPriceItemType]) }}
                    </template>
                  </el-table-column>
                  <el-table-column
                    prop="itemName"
                    :label="$t('attraction.itemName')"
                    min-width="130"
                  />
                  <el-table-column
                    prop="audience"
                    :label="$t('attraction.audience')"
                    width="90"
                  />
                  <el-table-column
                    prop="periodName"
                    :label="$t('attraction.pricePeriod')"
                    width="90"
                  />
                  <el-table-column
                    :label="$t('attraction.effectivePeriod')"
                    min-width="180"
                  >
                    <template #default="priceScope">
                      {{ formatPeriod(priceScope.row as AttractionPriceRecord) }}
                    </template>
                  </el-table-column>
                  <el-table-column
                    :label="$t('attraction.rackPrice')"
                    width="100"
                    align="right"
                  >
                    <template #default="priceScope">
                      {{ formatPrice(priceScope.row as AttractionPriceRecord, "rackPrice") }}
                    </template>
                  </el-table-column>
                  <el-table-column
                    :label="$t('attraction.settlementPrice')"
                    width="100"
                    align="right"
                  >
                    <template #default="priceScope">
                      {{ formatPrice(priceScope.row as AttractionPriceRecord, "settlementPrice") }}
                    </template>
                  </el-table-column>
                  <el-table-column
                    prop="priceNote"
                    :label="$t('attraction.priceNote')"
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
                        v-has-perm="RESOURCE_PERMISSIONS.attraction.update"
                        type="primary"
                        link
                        @click="emit('edit-price', scope.row as AttractionRecord, priceScope.row as AttractionPriceRecord)"
                      >
                        {{ $t("common.edit") }}
                      </el-button>
                      <el-button
                        v-has-perm="RESOURCE_PERMISSIONS.attraction.delete"
                        type="danger"
                        link
                        @click="emit('delete-price', scope.row as AttractionRecord, priceScope.row as AttractionPriceRecord)"
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
            :label="$t('resource.attractionName')"
            min-width="180"
          />
          <el-table-column
            prop="area"
            :label="$t('attraction.area')"
            width="100"
          />
          <el-table-column
            :label="$t('attraction.category')"
            width="100"
          >
            <template #default="scope">
              {{ $t(attractionCategoryLabelKeys[scope.row.category as AttractionCategory]) }}
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('attraction.priceCount')"
            width="100"
            align="center"
          >
            <template #default="scope">
              {{ scope.row.priceCount ?? scope.row.prices.length }}
            </template>
          </el-table-column>
          <el-table-column
            prop="restroomLocation"
            :label="$t('attraction.restroomLocation')"
            min-width="220"
            show-overflow-tooltip
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
                v-has-perm="RESOURCE_PERMISSIONS.attraction.update"
                type="primary"
                link
                @click="emit('edit', scope.row as AttractionRecord)"
              >
                {{ $t("common.edit") }}
              </el-button>
              <el-button
                v-has-perm="RESOURCE_PERMISSIONS.attraction.update"
                type="warning"
                link
                @click="emit('toggle-status', scope.row as AttractionRecord)"
              >
                {{ $t(scope.row.status === "enabled" ? "common.disabled" : "common.enabled") }}
              </el-button>
              <el-button
                v-has-perm="RESOURCE_PERMISSIONS.attraction.delete"
                type="danger"
                link
                @click="emit('delete', scope.row as AttractionRecord)"
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
import { ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import { RESOURCE_PERMISSIONS } from "@/constants";
import type {
  AttractionCategory,
  AttractionPriceItemType,
  AttractionPriceRecord,
  AttractionRecord,
  ResourceListQuery,
} from "@/types/resource";
import { formatMoney } from "@/utils";
import TableToolbar from "@/components/TableToolbar/index.vue";
import AttractionSearchForm from "./AttractionSearchForm.vue";
import { attractionCategoryLabelKeys, attractionItemTypeLabelKeys } from "../options";

defineProps<{ rows: AttractionRecord[]; total: number }>();
const emit = defineEmits<{
  refresh: [query: ResourceListQuery];
  "query-change": [query: ResourceListQuery];
  create: [];
  edit: [record: AttractionRecord];
  delete: [record: AttractionRecord];
  "toggle-status": [record: AttractionRecord];
  expand: [record: AttractionRecord];
  "create-price": [record: AttractionRecord];
  "edit-price": [record: AttractionRecord, price: AttractionPriceRecord];
  "delete-price": [record: AttractionRecord, price: AttractionPriceRecord];
}>();

const { t } = useI18n();
const keywords = ref("");
const area = ref("");
const category = ref<AttractionCategory | "">("");
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
const requestRows = useDebounceFn(() => emit("query-change", currentQuery()), 300);

watch([keywords, area, category], () => {
  pageNum.value = 1;
  requestRows();
});

function currentQuery(): ResourceListQuery {
  return { ...paginationQuery(), keyword: keywords.value, area: area.value, category: category.value || undefined };
}

function resetQuery() {
  keywords.value = "";
  area.value = "";
  category.value = "";
  pageNum.value = 1;
}
function refreshRows() {
  emit("refresh", currentQuery());
}
function changeExpand(record: AttractionRecord, expanded: AttractionRecord[] | boolean) {
  const isExpanded = Array.isArray(expanded)
    ? expanded.some((item) => item.id === record.id)
    : expanded;
  if (isExpanded) emit("expand", record);
}
function formatPeriod(price: AttractionPriceRecord) {
  return price.startDate && price.endDate ? `${price.startDate} — ${price.endDate}` : t("common.notSet");
}
function formatPrice(price: AttractionPriceRecord, field: "rackPrice" | "settlementPrice") {
  if (price.isFree) return "免费";
  return price[field] ? formatMoney(price[field]) : "-";
}
</script>

<style scoped lang="scss">
.attraction-table {
  &__prices { padding: 16px 48px; background: var(--el-fill-color-lighter); }
  &__price-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
}
</style>
