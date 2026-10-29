<template>
  <div class="flex w-full flex-col gap-3">
    <el-empty v-if="!rows.length" :image-size="48" :description="$t('tour.guideService.empty')" />
    <div
      v-for="(row, index) in rows"
      :key="row.key"
      class="flex flex-col gap-2 rounded border border-solid border-[var(--el-border-color)] p-3"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="text-[13px] text-strong">
          {{ $t("tour.guideService.segment", { n: index + 1 }) }}
        </span>
        <el-button
          link
          type="danger"
          :disabled="disabled"
          @click="remove(index)"
        >
          {{ $t("common.delete") }}
        </el-button>
      </div>
      <el-row :gutter="12">
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('common.language')" class="mb-2!">
            <RemoteSelect
              v-model="row.language"
              :load-options="loadLanguages"
              :placeholder="$t('common.selectPlaceholder')"
              :disabled="disabled"
              class="w-full"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('tour.guide')" class="mb-2!">
            <el-select
              v-model="row.guideId"
              :disabled="disabled || !candidates[row.key]?.ready"
              :loading="Boolean(candidates[row.key]?.loading)"
              autocomplete="new-password"
              filterable
              :placeholder="guidePlaceholder(row.key)"
              class="w-full"
            >
              <el-option
                v-for="item in candidates[row.key]?.list ?? []"
                :key="item.id"
                :value="item.id"
                :label="guideLabel(item)"
              />
              <el-option
                v-if="row.guideId && !candidates[row.key]?.list.some((item) => item.id === row.guideId)"
                :value="row.guideId"
                :label="currentLabel(row)"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="12">
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('tour.guideService.startAt')" class="mb-2!">
            <el-date-picker
              v-model="row.serviceStartAt"
              type="datetime"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm"
              :disabled="disabled"
              class="w-full!"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="$t('tour.guideService.endAt')" class="mb-2!">
            <el-date-picker
              v-model="row.serviceEndAt"
              type="datetime"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm"
              :disabled="disabled"
              class="w-full!"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item :label="$t('common.remark')" class="mb-2!">
        <el-input v-model="row.remark" maxlength="2000" :disabled="disabled" />
      </el-form-item>
      <div class="flex flex-wrap items-center gap-2">
        <el-button
          size="small"
          :disabled="disabled || !teamWindow"
          @click="useTeamWindow(row)"
        >
          {{ $t("tour.guideService.useTeamTime") }}
        </el-button>
        <el-button
          v-if="row.existing?.timeSource === 'legacy'"
          size="small"
          :type="row.confirmTime ? 'success' : 'default'"
          :disabled="disabled || guideServiceTimeChanged(row)"
          @click="row.confirmTime = !row.confirmTime"
        >
          {{ $t(row.confirmTime ? "tour.guideService.confirmed" : "tour.guideService.confirmTime") }}
        </el-button>
        <el-tag
          v-if="row.existing?.timeSource === 'legacy' && !timeVerified(row)"
          size="small"
          type="warning"
        >
          {{ $t("tour.guideService.legacyTime") }}
        </el-tag>
        <el-tag v-if="row.existing?.invalidDuration && !timeVerified(row)" size="small" type="danger">
          {{ $t("tour.guideService.invalidDuration") }}
        </el-tag>
        <el-tag v-if="outside(row)" size="small" type="info">
          {{ $t("tour.guideService.outsideWindow") }}
        </el-tag>
      </div>
      <el-alert
        v-if="rowMessage(row, index)"
        type="error"
        :closable="false"
        :title="rowMessage(row, index)"
      />
      <el-alert
        v-else-if="unavailable(row)"
        type="warning"
        :closable="false"
        :title="$t('tour.guideUnavailable')"
      />
    </div>
    <div>
      <el-button :disabled="disabled" @click="add">
        {{ $t("tour.guideService.add") }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import RemoteSelect from "@/components/RemoteSelect/index.vue";
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import { tourService } from "@/services/tour.service";
import type { TourBusinessUnit, TourGuideOption } from "@/types/tour";
import {
  emptyGuideServiceRow,
  guideAvailabilityQuery,
  guideServiceErrors,
  guideServiceTimeChanged,
  isGuideServiceUnavailable,
  outsideTeamWindow,
  type GuideServiceRow,
} from "../tour-form";

interface CandidateState {
  /** 当前已发请求的查询键；用于去重与丢弃过期响应。 */
  key?: string;
  generation: number;
  ready: boolean;
  loading: boolean;
  list: TourGuideOption[];
}

const props = defineProps<{
  businessUnit: TourBusinessUnit | null;
  excludeTourId?: string;
  /** 团队接送窗口，用于“沿用团队接送时间”和越界提示；未知时为 null。 */
  teamWindow: { from: string; to: string } | null;
  disabled?: boolean;
  /** 服务端按段返回的失败信息，key 为行 key。 */
  serverErrors?: Record<string, string>;
  /** 尝试保存后才提示“信息不完整”，避免新增空段即报错。 */
  showIncomplete?: boolean;
}>();
const rows = defineModel<GuideServiceRow[]>({ required: true });
const { t } = useI18n();

const candidates = reactive<Record<string, CandidateState>>({});
const localErrors = computed(() => guideServiceErrors(rows.value));
const queryKeys = computed(() =>
  rows.value.map((_, index) =>
    JSON.stringify(
      guideAvailabilityQuery(props.businessUnit, rows.value, index, props.excludeTourId),
    ),
  ),
);

function stateOf(key: string): CandidateState {
  return (candidates[key] ??= { generation: 0, ready: false, loading: false, list: [] });
}

async function refresh(rowKey: string, queryKey: string) {
  const state = stateOf(rowKey);
  if (state.key === queryKey) return;
  state.key = queryKey;
  const generation = ++state.generation;
  state.ready = false;
  state.list = [];
  const index = rows.value.findIndex((row) => row.key === rowKey);
  const query = guideAvailabilityQuery(props.businessUnit, rows.value, index, props.excludeTourId);
  if (!query) {
    state.loading = false;
    return;
  }
  state.loading = true;
  try {
    const list = await tourService.availableGuides(query);
    if (generation !== state.generation) return;
    state.list = list;
    state.ready = true;
  } catch (error) {
    if (generation !== state.generation) return;
    state.key = undefined;
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    if (generation === state.generation) state.loading = false;
  }
}

// 任一段或兄弟段变化后按各自新查询刷新；移除行时清理其状态，过期响应由 generation 丢弃。
watch(
  queryKeys,
  (keys) => {
    const alive = new Set(rows.value.map((row) => row.key));
    for (const key of Object.keys(candidates)) {
      if (alive.has(key)) continue;
      candidates[key]!.generation++;
      delete candidates[key];
    }
    rows.value.forEach((row, index) => void refresh(row.key, keys[index]!));
  },
  { immediate: true },
);

function loadLanguages(query: RemoteOptionsQuery) {
  return tourService
    .guideLanguages(query)
    .then((result) => ({
      ...result,
      list: result.list.map((item) => ({ id: item.id, label: item.name })),
    }));
}

function guideLabel(item: TourGuideOption) {
  const base = item.code ? `${item.name} (${item.code})` : item.name;
  return item.language ? `${base} · ${item.language}` : base;
}
function currentLabel(row: GuideServiceRow) {
  const old = row.existing;
  if (old && old.guideId === row.guideId)
    return old.guideCode ? `${old.guideName} (${old.guideCode})` : old.guideName;
  return row.guideId;
}
function guidePlaceholder(key: string) {
  const state = candidates[key];
  if (state?.ready) return t("tour.guideService.selectGuide");
  return t("tour.guideService.fillFirst");
}
function unavailable(row: GuideServiceRow) {
  const state = candidates[row.key];
  return Boolean(state?.ready) && isGuideServiceUnavailable(row, state!.list);
}
/** 用户明确修改了时间或点击确认后，旧段不再显示历史/异常提示。 */
function timeVerified(row: GuideServiceRow) {
  return row.confirmTime || guideServiceTimeChanged(row);
}
function outside(row: GuideServiceRow) {
  if (row.existing && !guideServiceTimeChanged(row)) return row.existing.outsideTourWindow;
  return outsideTeamWindow(row, props.teamWindow);
}
function rowMessage(row: GuideServiceRow, index: number) {
  const server = props.serverErrors?.[row.key];
  if (server) return server;
  const code = localErrors.value[index];
  if (code === "incomplete" && !props.showIncomplete) return "";
  return code ? t(`tour.guideService.errors.${code}`) : "";
}

function add() {
  rows.value.push(emptyGuideServiceRow());
}
function remove(index: number) {
  rows.value.splice(index, 1);
}
function useTeamWindow(row: GuideServiceRow) {
  if (!props.teamWindow) return;
  row.serviceStartAt = props.teamWindow.from;
  row.serviceEndAt = props.teamWindow.to;
  row.confirmTime = false;
}

/** 候选已加载且所选人员不在其中（仅调整过的段）时为 true。 */
function hasUnavailable() {
  return rows.value.some(unavailable);
}
defineExpose({ hasUnavailable });
</script>
