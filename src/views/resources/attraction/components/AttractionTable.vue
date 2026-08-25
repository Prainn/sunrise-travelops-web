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
      <div class="page-toolbar">
        <div class="page-toolbar__left">
          <el-button
            type="primary"
            @click="emit('create')"
          >
            {{ $t("attraction.createAttraction") }}
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
              <div class="attraction-table__prices">
                <div class="attraction-table__price-header">
                  <strong>{{ $t("attraction.priceItems") }}</strong>
                  <el-button
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
                    :label="$t('hotel.pricePeriod')"
                    width="90"
                  />
                  <el-table-column
                    :label="$t('hotel.effectivePeriod')"
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
                        type="primary"
                        link
                        @click="emit('edit-price', scope.row as AttractionRecord, priceScope.row as AttractionPriceRecord)"
                      >
                        {{ $t("common.edit") }}
                      </el-button>
                      <el-button
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
            width="120"
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
              {{ scope.row.prices.length }}
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
                type="primary"
                link
                @click="emit('edit', scope.row as AttractionRecord)"
              >
                {{ $t("common.edit") }}
              </el-button>
              <el-button
                type="warning"
                link
                @click="emit('toggle-status', scope.row as AttractionRecord)"
              >
                {{ $t(scope.row.status === "enabled" ? "common.disabled" : "common.enabled") }}
              </el-button>
              <el-button
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
import type {
  AttractionCategory,
  AttractionPriceItemType,
  AttractionPriceRecord,
  AttractionRecord,
} from "@/data/data";
import AttractionSearchForm from "./AttractionSearchForm.vue";
import { attractionCategoryLabelKeys, attractionItemTypeLabelKeys } from "../options";

const props = defineProps<{ rows: AttractionRecord[] }>();
const emit = defineEmits<{
  create: [];
  edit: [record: AttractionRecord];
  delete: [record: AttractionRecord];
  "toggle-status": [record: AttractionRecord];
  "create-price": [record: AttractionRecord];
  "edit-price": [record: AttractionRecord, price: AttractionPriceRecord];
  "delete-price": [record: AttractionRecord, price: AttractionPriceRecord];
}>();

const { t } = useI18n();
const keywords = ref("");
const area = ref("");
const category = ref<AttractionCategory | "">("");
const pageNum = ref(1);
const pageSize = ref(10);
const groundOperatorOptions = computed(() => tourismResources.supplier.filter((item) => item.status === "enabled"));
const filteredRows = computed(() => props.rows.filter((record) => (
  (!area.value || record.area === area.value)
  && (!category.value || record.category === category.value)
  && (!keywords.value || [record.code, record.name, record.remark].some((field) => field.toLowerCase().includes(keywords.value.toLowerCase())))
)));
const total = computed(() => filteredRows.value.length);
const pagedRows = computed(() => filteredRows.value.slice((pageNum.value - 1) * pageSize.value, pageNum.value * pageSize.value));

function resetQuery() {
  keywords.value = "";
  area.value = "";
  category.value = "";
  pageNum.value = 1;
}
function formatPeriod(price: AttractionPriceRecord) {
  return price.startDate && price.endDate ? `${price.startDate} — ${price.endDate}` : t("common.notSet");
}
function formatPrice(price: AttractionPriceRecord, field: "rackPrice" | "settlementPrice") {
  if (price.isFree) return "免费";
  return price[field] ? price[field].toFixed(2) : "-";
}
function getGroundOperatorName(id: string) {
  return groundOperatorOptions.value.find((item) => item.id === id)?.name ?? t("resource.groundOperatorProvidedTag");
}
</script>

<style scoped lang="scss">
.attraction-table {
  &__prices { padding: 16px 48px; background: var(--el-fill-color-lighter); }
  &__price-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
}
</style>
