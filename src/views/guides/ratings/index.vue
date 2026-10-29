<template>
  <PageShell>
    <FilterBar @reset="keyword = ''">
      <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
        <el-input
          v-model="keyword"
          :placeholder="$t('guideRating.searchPlaceholder')"
          clearable
        />
      </el-form-item>
    </FilterBar>
    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="load" />
      <DataTable
        fill
        :loading="loading"
        :data="rows"
        :error="loadError"
        :filtered="Boolean(keyword)"
        :row-key="ratingKey"
        @retry="load"
      >
        <el-table-column
          prop="tourNo"
          :label="$t('tour.tourNo')"
          min-width="210"
          fixed="left"
          :show-overflow-tooltip="false"
        />
        <el-table-column :label="$t('guideRating.guide')" min-width="220" :show-overflow-tooltip="false">
          <template #default="{ row }">
            <div class="flex flex-col gap-1">
              <span class="text-strong">{{ guideIdentityText(row as TourRatingRow) }}</span>
              <GuideServiceList :services="(row as TourRatingRow).guideServices" />
            </div>
          </template>
        </el-table-column>
        <el-table-column
          v-for="field in RATING_FIELDS"
          :key="field"
          :label="$t(`guideRating.fields.${field}`)"
          min-width="120"
          align="center"
        >
          <template #default="{ row }">
            <StrictInputNumber
              v-if="isActive(row as TourRatingRow, field)"
              v-model="draft"
              :min="0"
              :max="100"
              :precision="2"
              :controls="false"
              :disabled="savingKey === ratingKey(row as TourRatingRow)"
              size="small"
              @keyup.enter="commit(row as TourRatingRow)"
              @keyup.esc="cancelEdit"
              @blur="commit(row as TourRatingRow)"
            />
            <span
              v-else
              class="inline-block min-w-12"
              :class="{
                'cursor-pointer border-b border-dashed border-[var(--el-border-color)]':
                  canEdit(row as TourRatingRow),
              }"
              @click="startEdit(row as TourRatingRow, field)"
            >
              {{ (row as TourRatingRow)[field]?.toFixed(2) ?? "-" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('guideRating.max')"
          prop="max"
          :formatter="scoreText"
          width="90"
          align="center"
        />
        <el-table-column
          :label="$t('guideRating.min')"
          prop="min"
          :formatter="scoreText"
          width="90"
          align="center"
        />
        <el-table-column
          :label="$t('guideRating.average')"
          prop="average"
          :formatter="scoreText"
          width="90"
          align="center"
        />
        <el-table-column
          :label="$t('guideRating.total')"
          prop="total"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            {{ row.total?.toFixed(2) ?? $t("guideRating.unrated") }}
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.status')" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ $t(`tour.status.${row.status}`) }}
            </el-tag>
          </template>
        </el-table-column>
      </DataTable>
      <Pagination
        v-if="total > 0"
        v-model:page="pageNum"
        v-model:limit="pageSize"
        :total="total"
        @pagination="load"
      />
    </SectionCard>
  </PageShell>
</template>

<script setup lang="ts">
import StrictInputNumber from "@/components/StrictInputNumber/index.vue";
import { onMounted, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { ElMessage } from "element-plus";
import DataTable from "@/components/DataTable/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import GuideServiceList from "@/components/GuideServiceList/index.vue";
import { tourService } from "@/services/tour.service";
import { guideIdentityText } from "@/utils/guide-services";
import { requestErrorMessage } from "@/utils/version-conflict";
import { RATING_FIELDS, type RatingField, type TourRatingRow } from "@/types/tour";
import { ratingKey, replaceRatingRow } from "./rating-row";
import { useResourcePagination } from "@/views/resources/useResourcePagination";

defineOptions({ name: "GuideRatings" });

const { t } = useI18n();
const keyword = ref("");
const loading = ref(false);
const loadError = ref("");
const total = ref(0);
const rows = ref<TourRatingRow[]>([]);
const { pageNum, pageSize, paginationQuery } = useResourcePagination();

// 评分行身份是 团+导游；编辑状态、保存锁和行 key 均使用该组合。

// 只有激活单元格挂载编辑控件；失败时保留输入。
const active = ref<{ key: string; field: RatingField } | null>(null);
const draft = ref<number | null>(null);
const savingKey = ref("");

// 服务端 canEdit 已包含权限、参与人/负责人/总部 ROOT 及撤销状态判断。
const canEdit = (row: TourRatingRow) => row.canEdit;
const isActive = (row: TourRatingRow, field: RatingField) =>
  active.value?.key === ratingKey(row) && active.value.field === field;

let loadVersion = 0;
/** 只有最近一次请求能写入列表、错误与 loading。 */
async function load() {
  const version = ++loadVersion;
  loading.value = true;
  try {
    const result = await tourService.ratings({ ...paginationQuery(), keyword: keyword.value });
    if (version !== loadVersion) return;
    rows.value = result.list;
    total.value = result.total;
    loadError.value = "";
  } catch (error) {
    if (version !== loadVersion) return;
    loadError.value = requestErrorMessage(error);
    ElMessage.error(loadError.value);
  } finally {
    if (version === loadVersion) loading.value = false;
  }
}
const reload = useDebounceFn(() => {
  pageNum.value = 1;
  void load();
}, 300);
watch(keyword, reload);

function startEdit(row: TourRatingRow, field: RatingField) {
  if (!canEdit(row) || savingKey.value) return;
  active.value = { key: ratingKey(row), field };
  draft.value = row[field];
}
function cancelEdit() {
  if (!savingKey.value) active.value = null;
}
async function commit(row: TourRatingRow) {
  const current = active.value;
  if (!current || current.key !== ratingKey(row) || savingKey.value) return;
  if ((draft.value ?? null) === row[current.field]) {
    active.value = null;
    return;
  }
  if (draft.value != null && (!Number.isFinite(draft.value) || draft.value < 0 || draft.value > 100 || Math.abs(draft.value * 100 - Math.round(draft.value * 100)) > 1e-6)) {
    ElMessage.error(t("common.invalidNumber", { min: 0, max: 100, precision: 2 }));
    return;
  }
  savingKey.value = ratingKey(row);
  try {
    // 只提交被修改的单元格，只回填受影响的行。
    const saved = await tourService.saveRating(row.tourId, row.guideId, row.version, {
      [current.field]: draft.value ?? null,
    });
    replaceRatingRow(rows.value, saved);
    active.value = null;
  } catch (error) {
    // 保留输入和原版本；版本冲突需手动刷新，避免覆盖未读更新。
    ElMessage.error(requestErrorMessage(error));

  } finally {
    savingKey.value = "";
  }
}
function scoreText(_row: unknown, _column: unknown, value: number | null) {
  return value?.toFixed(2) ?? "-";
}

onMounted(load);
</script>
