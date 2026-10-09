<template>
  <div class="page-container">
    <el-form inline class="page-search">
      <el-form-item>
        <el-input v-model="keyword" :placeholder="$t('guideRating.searchPlaceholder')" clearable />
      </el-form-item>
      <el-form-item>
        <el-button @click="keyword = ''">
          {{ $t("common.reset") }}
        </el-button>
      </el-form-item>
    </el-form>
    <el-card class="page-content" shadow="never">
      <TableToolbar @refresh="load" />
      <div class="page-table-wrapper">
        <el-table
          v-loading="loading"
          :data="rows"
          border
          height="100%"
          row-key="tourId"
        >
          <el-table-column
            prop="tourNo"
            :label="$t('tour.tourNo')"
            min-width="210"
            fixed="left"
          />
          <el-table-column prop="guideName" :label="$t('guideRating.guide')" min-width="120" />
          <el-table-column
            v-for="field in RATING_FIELDS"
            :key="field"
            :label="$t(`guideRating.fields.${field}`)"
            min-width="120"
            align="center"
          >
            <template #default="{ row }">
              <el-input-number
                v-if="isActive(row as TourRatingRow, field)"
                v-model="draft"
                :min="0"
                :max="100"
                :precision="2"
                :controls="false"
                :disabled="savingId === (row as TourRatingRow).tourId"
                size="small"
                class="!w-[96px]"
                @keyup.enter="commit(row as TourRatingRow)"
                @keyup.esc="cancelEdit"
                @blur="commit(row as TourRatingRow)"
              />
              <span
                v-else
                class="rating-cell"
                :class="{ 'rating-cell--editable': canEdit(row as TourRatingRow) }"
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
        </el-table>
      </div>
      <pagination
        v-if="total > 0"
        v-model:page="pageNum"
        v-model:limit="pageSize"
        :total="total"
        @pagination="load"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { tourService } from "@/services/tour.service";
import { useUserStore } from "@/stores/user";
import { RATING_FIELDS, type RatingField, type TourRatingRow } from "@/types/tour";
import { hasUserPermission } from "@/utils/permission";
import { useResourcePagination } from "@/views/resources/useResourcePagination";

defineOptions({ name: "GuideRatings" });

const { t } = useI18n();
const user = useUserStore();
const canUpdate = computed(() => hasUserPermission(user.userInfo, "tour:rating:update"));
const keyword = ref("");
const loading = ref(false);
const total = ref(0);
const rows = ref<TourRatingRow[]>([]);
const { pageNum, pageSize, paginationQuery } = useResourcePagination();

// 只有激活单元格挂载编辑控件；失败时保留输入。
const active = ref<{ tourId: string; field: RatingField } | null>(null);
const draft = ref<number | null>(null);
const savingId = ref("");

const canEdit = (row: TourRatingRow) => canUpdate.value && row.canEdit;
const isActive = (row: TourRatingRow, field: RatingField) =>
  active.value?.tourId === row.tourId && active.value.field === field;

async function load() {
  loading.value = true;
  try {
    const result = await tourService.ratings({ ...paginationQuery(), keyword: keyword.value });
    rows.value = result.list;
    total.value = result.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    loading.value = false;
  }
}
const reload = useDebounceFn(() => {
  pageNum.value = 1;
  void load();
}, 300);
watch(keyword, reload);

function startEdit(row: TourRatingRow, field: RatingField) {
  if (!canEdit(row) || savingId.value) return;
  active.value = { tourId: row.tourId, field };
  draft.value = row[field];
}
function cancelEdit() {
  if (!savingId.value) active.value = null;
}
async function commit(row: TourRatingRow) {
  const current = active.value;
  if (!current || current.tourId !== row.tourId || savingId.value) return;
  if ((draft.value ?? null) === row[current.field]) {
    active.value = null;
    return;
  }
  savingId.value = row.tourId;
  try {
    // 只提交被修改的单元格，只回填受影响的行。
    const saved = await tourService.saveRating(row.tourId, row.version, {
      [current.field]: draft.value ?? null,
    });
    const index = rows.value.findIndex((item) => item.tourId === row.tourId);
    if (index >= 0) rows.value.splice(index, 1, saved);
    active.value = null;
  } catch (error) {
    // 保留输入和原版本；版本冲突需手动刷新，避免覆盖未读更新。
    ElMessage.error(error instanceof Error ? error.message : t("request.failed"));

  } finally {
    savingId.value = "";
  }
}
function scoreText(_row: unknown, _column: unknown, value: number | null) {
  return value?.toFixed(2) ?? "-";
}

onMounted(load);
</script>

<style scoped lang="scss">
.rating-cell {
  display: inline-block;
  min-width: 48px;
}
.rating-cell--editable {
  cursor: pointer;
  border-bottom: 1px dashed var(--el-border-color);
}
</style>
