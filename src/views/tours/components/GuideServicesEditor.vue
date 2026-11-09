<template>
  <div class="flex w-full flex-col gap-3">
    <div
      v-if="!rows.length"
      class="flex flex-col items-center gap-3 rounded-[var(--custom-radius)] border border-dashed border-[var(--card-border)] px-4 py-8"
    >
      <span class="text-[13px] text-muted">{{ $t("tour.guideService.empty") }}</span>
      <el-button
        type="primary"
        plain
        :icon="Plus"
        :disabled="disabled"
        @click="add"
      >
        {{ $t("tour.guideService.add") }}
      </el-button>
    </div>
    <section
      v-for="(row, index) in rows"
      :key="row.key"
      class="overflow-hidden rounded-[var(--custom-radius)] border border-solid border-[var(--card-border)]"
    >
      <header class="flex-x-between gap-2 bg-[var(--surface-muted)] px-4 py-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[13px] font-medium text-strong">
            {{ $t("tour.guideService.segment", { n: index + 1 }) }}
          </span>
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
        <el-button
          link
          type="danger"
          :icon="Delete"
          :disabled="disabled"
          @click="remove(index)"
        >
          {{ $t("common.delete") }}
        </el-button>
      </header>
      <div class="px-4 pt-3">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('common.language')" class="mb-3!">
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
            <el-form-item :label="$t('tour.guide')" class="mb-3!">
              <el-select
                v-model="row.guideId"
                :disabled="disabled || !conditionsReady(index)"
                :loading="Boolean(candidates[row.key]?.loading)"
                autocomplete="new-password"
                filterable
                remote
                :debounce="0"
                :remote-method="(value: string) => search(row.key, value)"
                :placeholder="guidePlaceholder(index)"
                class="w-full"
              >
                <el-option
                  v-for="item in candidates[row.key]?.result?.list ?? []"
                  :key="item.id"
                  :value="item.id"
                  :label="guideLabel(item)"
                />
                <el-option
                  v-for="item in candidates[row.key]?.result?.unavailable ?? []"
                  :key="item.id"
                  :value="item.id"
                  :label="guideLabel(item)"
                  disabled
                >
                  <div class="flex-x-between gap-3">
                    <span>{{ guideLabel(item) }}</span>
                    <el-tag size="small" type="info">
                      {{ $t("tour.guideService.unavailableTag") }}
                    </el-tag>
                  </div>
                </el-option>
                <el-option
                  v-if="row.guideId && !matched(row)"
                  :value="row.guideId"
                  :label="currentLabel(row)"
                />
                <template #empty>
                  <p class="el-select-dropdown__empty">
                    {{ emptyText(row.key) }}
                  </p>
                </template>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('tour.guideService.startAt')" class="mb-3!">
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
            <el-form-item :label="$t('tour.guideService.endAt')" class="mb-3!">
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
        <el-alert
          v-if="candidates[row.key]?.error"
          class="mb-3"
          type="error"
          :closable="false"
          :title="$t('tour.guideService.searchFailed')"
          :description="candidates[row.key]?.error"
        />
        <p v-else-if="keywordTooLong(index)" class="mb-3 text-[13px] text-[var(--el-color-warning)]">
          {{ $t("tour.guideService.keywordTooLong") }}
        </p>
        <div
          v-else-if="candidates[row.key]?.result"
          class="mb-3 flex flex-col gap-2 rounded-[var(--custom-radius)] bg-[var(--surface-muted)] px-3 py-2 text-[13px]"
        >
          <span :class="candidates[row.key]!.result!.status === 'available' ? 'text-strong' : 'text-[var(--el-color-warning)]'">
            {{ candidates[row.key]!.result!.message }}
          </span>
          <div v-for="item in candidates[row.key]!.result!.unavailable" :key="item.id" class="flex flex-col gap-1">
            <span class="font-medium text-strong">{{ guideLabel(item) }}</span>
            <ul class="m-0 flex flex-col gap-1 pl-5 text-muted">
              <li v-for="(reason, reasonIndex) in item.reasons" :key="reasonIndex">
                {{ reasonTitle(reason) }}
                <div v-for="(line, lineIndex) in reasonDetails(row.key, reason)" :key="lineIndex">
                  {{ line }}
                </div>
              </li>
            </ul>
          </div>
        </div>
        <div class="mb-3 flex flex-wrap items-center gap-3">
          <el-button
            link
            type="primary"
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
        </div>
        <el-form-item :label="$t('common.remark')" class="mb-3!">
          <el-input v-model="row.remark" maxlength="2000" :disabled="disabled" />
        </el-form-item>
        <el-alert
          v-if="rowMessage(row, index)"
          class="mb-3"
          type="error"
          :closable="false"
          :title="rowMessage(row, index)"
        />
        <el-alert
          v-else-if="unavailable(row)"
          class="mb-3"
          type="warning"
          :closable="false"
          :title="$t('tour.guideUnavailable')"
        />
      </div>
    </section>
    <el-button
      v-if="rows.length"
      class="ml-0! w-full border-dashed!"
      :icon="Plus"
      :disabled="disabled"
      @click="add"
    >
      {{ $t("tour.guideService.add") }}
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, watch } from "vue";
import { Delete, Plus } from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import RemoteSelect from "@/components/RemoteSelect/index.vue";
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import { businessUnitName } from "@/constants/identity";
import { tourService } from "@/services/tour.service";
import type {
  TourBusinessUnit,
  TourGuideAvailability,
  TourGuideOption,
  TourGuideQuery,
  TourGuideUnavailableReason,
} from "@/types/tour";
import { requestErrorMessage } from "@/utils/version-conflict";
import {
  emptyGuideServiceRow,
  guideAvailabilityRequest,
  guideServiceErrors,
  guideServiceTimeChanged,
  isGuideServiceUnavailable,
  outsideTeamWindow,
  type GuideAvailabilityRequest,
  type GuideServiceRow,
} from "../tour-form";

const SEARCH_DEBOUNCE = 300;

interface CandidateState {
  /** 本段输入的导游姓名。 */
  keyword: string;
  /** 当前查询键；用于去重与丢弃过期响应。 */
  key?: string;
  generation: number;
  timer?: ReturnType<typeof setTimeout>;
  loading: boolean;
  result: TourGuideAvailability | null;
  /** 本次请求 otherServices 各下标对应的行 key，用于把 FORM_CONFLICT 映射回表单行。 */
  siblingKeys: string[];
  error: string;
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
/** 查询过的导游名称，换搜索词后已选人员仍按名称回填。 */
const labels = reactive<Record<string, string>>({});
const localErrors = computed(() => guideServiceErrors(rows.value));
const requests = computed(() =>
  rows.value.map((row, index) =>
    guideAvailabilityRequest(
      props.businessUnit,
      rows.value,
      index,
      candidates[row.key]?.keyword ?? "",
      props.excludeTourId,
    ),
  ),
);

function stateOf(key: string): CandidateState {
  candidates[key] ??= {
    keyword: "",
    generation: 0,
    loading: false,
    result: null,
    siblingKeys: [],
    error: "",
  };
  return candidates[key]!;
}

function refresh(rowKey: string, request: GuideAvailabilityRequest) {
  const state = stateOf(rowKey);
  const queryKey = request.ready ? JSON.stringify(request.query) : request.missing;
  if (state.key === queryKey) return;
  state.key = queryKey;
  const generation = ++state.generation;
  clearTimeout(state.timer);
  state.result = null;
  state.siblingKeys = [];
  state.error = "";
  state.loading = request.ready;
  if (!request.ready) return;
  const siblingKeys = request.siblingIndexes.map((index) => rows.value[index]!.key);
  state.timer = setTimeout(
    () => void load(state, generation, request.query, siblingKeys),
    SEARCH_DEBOUNCE,
  );
}

async function load(
  state: CandidateState,
  generation: number,
  query: TourGuideQuery,
  siblingKeys: string[],
) {
  try {
    const result = await tourService.availableGuides(query);
    if (generation !== state.generation) return;
    for (const item of [...result.list, ...result.unavailable]) labels[item.id] = guideLabel(item);
    state.result = result;
    state.siblingKeys = siblingKeys;
  } catch (error) {
    if (generation !== state.generation) return;
    // 保留查询键，其他段变化不触发重试；用户再次输入姓名时由 search 重试。
    state.error = requestErrorMessage(error);
  } finally {
    if (generation === state.generation) state.loading = false;
  }
}

// 姓名、语种、时段或兄弟段变化后按各段新查询刷新；移除行时清理其状态，过期响应由 generation 丢弃。
watch(
  requests,
  (list) => {
    const alive = new Set(rows.value.map((row) => row.key));
    for (const key of Object.keys(candidates)) {
      if (alive.has(key)) continue;
      discard(key);
    }
    rows.value.forEach((row, index) => refresh(row.key, list[index]!));
  },
  { immediate: true },
);
onBeforeUnmount(() => Object.keys(candidates).forEach(discard));

function discard(key: string) {
  const state = candidates[key]!;
  state.generation++;
  clearTimeout(state.timer);
  delete candidates[key];
}

/** 下拉展开时会以空串回调；空姓名不请求，保留上次结果。 */
function search(rowKey: string, value: string) {
  if (!value.trim()) return;
  const state = stateOf(rowKey);
  state.keyword = value;
  // 上次查询失败时，同一条件也重新请求。
  if (state.error) state.key = undefined;
  const index = rows.value.findIndex((row) => row.key === rowKey);
  if (index >= 0) refresh(rowKey, requests.value[index]!);
}

function loadLanguages(query: RemoteOptionsQuery) {
  return tourService
    .guideLanguages(query)
    .then((result) => ({
      ...result,
      list: result.list.map((item) => ({ id: item.id, label: item.name })),
    }));
}

function conditionsReady(index: number) {
  const request = requests.value[index];
  return Boolean(request && (request.ready || request.missing !== "conditions"));
}
function keywordTooLong(index: number) {
  const request = requests.value[index];
  return request?.ready === false && request.missing === "keywordTooLong";
}
function guideLabel(item: TourGuideOption) {
  const base = item.code ? `${item.name} (${item.code})` : item.name;
  return item.language ? `${base} · ${item.language}` : base;
}
function currentLabel(row: GuideServiceRow) {
  const old = row.existing;
  if (old && old.guideId === row.guideId)
    return old.guideCode ? `${old.guideName} (${old.guideCode})` : old.guideName;
  return labels[row.guideId] ?? row.guideId;
}
function matched(row: GuideServiceRow) {
  const result = candidates[row.key]?.result;
  return Boolean(
    result &&
      [...result.list, ...result.unavailable].some((item) => item.id === row.guideId),
  );
}
function guidePlaceholder(index: number) {
  if (!conditionsReady(index)) return t("tour.guideService.fillFirst");
  return t("tour.guideService.searchGuide");
}
function emptyText(key: string) {
  const state = candidates[key];
  if (state?.loading) return t("remoteSelect.loading");
  if (state?.error) return t("tour.guideService.searchFailed");
  return state?.result?.message || t("tour.guideService.searchGuide");
}
function reasonTitle(reason: TourGuideUnavailableReason) {
  if (reason.code === "LANGUAGE_MISMATCH")
    return t("tour.guideService.reasons.LANGUAGE_MISMATCH", {
      expected: reason.expectedLanguage ?? "",
      actual: reason.actualLanguage || t("tour.guideService.reasons.languageEmpty"),
    });
  return t(`tour.guideService.reasons.${reason.code}`);
}
function reasonDetails(rowKey: string, reason: TourGuideUnavailableReason): string[] {
  if (reason.code === "LEAVE_CONFLICT")
    return (reason.leaves ?? []).map((leave) => `${leave.startDate} ~ ${leave.endDate}`);
  if (reason.code === "SCHEDULE_CONFLICT")
    return (reason.tours ?? []).map(
      (tour) =>
        `${tour.tourNo} · ${businessUnitName(tour.businessUnit)} · ${tour.serviceStartAt} ~ ${tour.serviceEndAt}`,
    );
  if (reason.code === "FORM_CONFLICT")
    return (reason.services ?? []).map(
      (service) =>
        `${siblingLabel(rowKey, service.otherServiceIndex)} · ${service.serviceStartAt} ~ ${service.serviceEndAt}`,
    );
  return [];
}
/** otherServiceIndex 是请求 otherServices 的下标，经请求时记录的行 key 映射回当前表单段号。 */
function siblingLabel(rowKey: string, otherServiceIndex: number) {
  const siblingKey = candidates[rowKey]?.siblingKeys[otherServiceIndex];
  const index = rows.value.findIndex((row) => row.key === siblingKey);
  return index >= 0
    ? t("tour.guideService.segment", { n: index + 1 })
    : t("tour.guideService.removedSegment");
}
function unavailable(row: GuideServiceRow) {
  return isGuideServiceUnavailable(row, candidates[row.key]?.result);
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

/** 本次查询明确列为不可用的已选人员（仅调整过的段）；未命中搜索词不算，保存仍由服务端校验。 */
function hasUnavailable() {
  return rows.value.some(unavailable);
}
defineExpose({ hasUnavailable });
</script>
