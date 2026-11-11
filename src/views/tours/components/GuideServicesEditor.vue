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
          <el-tag
            v-if="confirmation(row)"
            size="small"
            type="danger"
            effect="dark"
          >
            {{ $t("tour.guideService.conflictConfirmed") }}
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
                :model-value="row.language"
                :load-options="loadLanguages"
                :placeholder="$t('common.selectPlaceholder')"
                :disabled="disabled"
                class="w-full"
                @update:model-value="(value: string) => changeLanguage(row, value)"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('tour.guide')" class="mb-3!">
              <el-select
                v-model="row.guideId"
                :disabled="disabled || !conditionsReady(index)"
                :loading="Boolean(candidates[row.key]?.loading) && !optionCount(row.key)"
                autocomplete="new-password"
                filterable
                remote
                remote-show-suffix
                :debounce="0"
                :remote-method="(value: string) => search(row.key, value)"
                :placeholder="guidePlaceholder(index)"
                class="w-full"
                @end-reached="loadNextPage(row.key)"
              >
                <el-option
                  v-for="item in candidates[row.key]?.list ?? []"
                  :key="item.id"
                  :value="item.id"
                  :label="guideLabel(item)"
                />
                <el-option
                  v-for="item in candidates[row.key]?.unavailable ?? []"
                  :key="item.id"
                  :value="item.id"
                  :label="guideLabel(item)"
                  :disabled="item.id !== row.guideId"
                >
                  <div class="flex-x-between gap-3">
                    <span>{{ guideLabel(item) }}</span>
                    <el-tag size="small" :type="item.canOverride ? 'warning' : 'info'">
                      {{
                        $t(
                          item.canOverride
                            ? "tour.guideService.scheduleConflictTag"
                            : "tour.guideService.unavailableTag",
                        )
                      }}
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
                v-model="row.serviceStartDate"
                type="date"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                :disabled="disabled"
                class="w-full!"
                @change="row.confirmTime = false"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('tour.guideService.endAt')" class="mb-3!">
              <el-date-picker
                v-model="row.serviceEndDate"
                type="date"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                :disabled="disabled"
                class="w-full!"
                @change="row.confirmTime = false"
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
          v-else-if="candidates[row.key]?.status"
          class="mb-3 flex flex-col gap-2 rounded-[var(--custom-radius)] bg-[var(--surface-muted)] px-3 py-2 text-[13px]"
        >
          <span :class="candidates[row.key]!.status === 'available' ? 'text-strong' : 'text-[var(--el-color-warning)]'">
            {{ candidates[row.key]!.message }}
            <span class="ml-2 text-muted">
              {{ $t("tour.guideService.loaded", { loaded: optionCount(row.key), total: candidates[row.key]!.total }) }}
            </span>
          </span>
          <div v-for="item in candidates[row.key]!.unavailable" :key="item.id" class="flex flex-col gap-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium text-strong">{{ guideLabel(item) }}</span>
              <el-button
                v-if="item.canOverride && item.scheduleConflictToken"
                size="small"
                type="warning"
                plain
                :disabled="disabled"
                @click="useAnyway(row, { ...item, label: guideLabel(item) }, item.scheduleConflictToken, candidates[row.key]!.siblingKeys)"
              >
                {{ $t("tour.guideService.useAnyway") }}
              </el-button>
            </div>
            <ul class="m-0 flex flex-col gap-1 pl-5 text-muted">
              <li v-for="(reason, reasonIndex) in item.reasons" :key="reasonIndex">
                {{ reasonTitle(reason) }}
                <div
                  v-for="(line, lineIndex) in reasonDetails(reason, candidates[row.key]!.siblingKeys)"
                  :key="lineIndex"
                >
                  {{ line }}
                </div>
              </li>
            </ul>
          </div>
        </div>
        <div
          v-if="confirmation(row)"
          class="mb-3 flex flex-col gap-1 rounded-[var(--custom-radius)] border border-solid border-[var(--el-color-danger-light-5)] bg-[var(--el-color-danger-light-9)] px-3 py-2 text-[13px]"
        >
          <span class="font-medium text-[var(--el-color-danger)]">
            {{ $t("tour.guideService.conflictConfirmed") }}
          </span>
          <span v-if="confirmation(row)!.by" class="text-muted">
            {{ $t("tour.guideService.conflictConfirmedBy", confirmation(row)!.by!) }}
          </span>
          <span v-else class="text-muted">{{ $t("tour.guideService.conflictRecheckOnSave") }}</span>
          <ul class="m-0 flex flex-col gap-1 pl-5 text-muted">
            <li v-for="(reason, reasonIndex) in confirmation(row)!.reasons" :key="reasonIndex">
              {{ reasonTitle(reason) }}
              <div v-for="(line, lineIndex) in reasonDetails(reason)" :key="lineIndex">
                {{ line }}
              </div>
            </li>
          </ul>
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
        >
          <template v-if="serverConflict(row)" #default>
            <ul class="m-0 flex flex-col gap-1 pl-5">
              <li v-for="(reason, reasonIndex) in serverConflict(row)!.reasons" :key="reasonIndex">
                {{ reasonTitle(reason) }}
                <div v-for="(line, lineIndex) in reasonDetails(reason)" :key="lineIndex">
                  {{ line }}
                </div>
              </li>
            </ul>
            <el-button
              v-if="serverConflict(row)!.canOverride && serverConflict(row)!.scheduleConflictToken"
              class="mt-2"
              size="small"
              type="warning"
              :disabled="disabled"
              @click="useServerConflict(row)"
            >
              {{ $t("tour.guideService.useAnyway") }}
            </el-button>
          </template>
        </el-alert>
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
import { computed, h, onBeforeUnmount, reactive, watch } from "vue";
import { Delete, Plus } from "@element-plus/icons-vue";
import { ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import RemoteSelect from "@/components/RemoteSelect/index.vue";
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import { businessUnitName } from "@/constants/identity";
import { tourService } from "@/services/tour.service";
import type {
  TourBusinessUnit,
  TourGuideOption,
  TourGuideQuery,
  TourGuideUnavailable,
  TourGuideUnavailableReason,
} from "@/types/tour";
import { formatDateTime } from "@/utils/format";
import { requestErrorMessage } from "@/utils/version-conflict";
import {
  clearScheduleConflict,
  emptyGuideServiceRow,
  guideAvailabilityRequest,
  guideServiceChanged,
  guideServiceErrors,
  guideServiceTimeChanged,
  isGuideServiceUnavailable,
  outsideTeamWindow,
  scheduleConflictKey,
  type GuideAvailabilityRequest,
  type GuideServiceRow,
  type GuideServiceServerError,
} from "../tour-form";

const SEARCH_DEBOUNCE = 300;

interface CandidateState {
  /** 本段输入的导游姓名；空串表示按条件自动列出可用导游。 */
  keyword: string;
  /** 当前首页查询键（不含页码）；用于去重与丢弃过期响应。 */
  key?: string;
  /** 已完成或正在加载的查询，翻页时沿用。 */
  query?: TourGuideQuery;
  generation: number;
  timer?: ReturnType<typeof setTimeout>;
  loading: boolean;
  /** 首页返回的业务状态与提示；未查询时为空。 */
  status: "" | "available" | "not_found" | "unavailable";
  message: string;
  /** 两个数组共用分页，total 为分页前候选总数。 */
  total: number;
  page: number;
  list: TourGuideOption[];
  unavailable: TourGuideUnavailable[];
  /** 本次请求 otherServices 各下标对应的行 key，用于把 FORM_CONFLICT 映射回表单行。 */
  siblingKeys: string[];
  error: string;
}

const props = defineProps<{
  businessUnit: TourBusinessUnit | null;
  excludeTourId?: string;
  /** 团队接送窗口，用于“沿用团队接送日期”和越界提示；未知时为 null。 */
  teamWindow: { from: string; to: string } | null;
  disabled?: boolean;
  /** 服务端按段返回的失败信息，key 为行 key。 */
  serverErrors?: Record<string, GuideServiceServerError>;
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
      1,
      props.excludeTourId,
    ),
  ),
);
const conflictKeys = computed(() => rows.value.map((_, index) => scheduleConflictKey(rows.value, index)));

function stateOf(key: string): CandidateState {
  candidates[key] ??= {
    keyword: "",
    generation: 0,
    loading: false,
    status: "",
    message: "",
    total: 0,
    page: 0,
    list: [],
    unavailable: [],
    siblingKeys: [],
    error: "",
  };
  return candidates[key]!;
}

function resetResult(state: CandidateState) {
  state.status = "";
  state.message = "";
  state.total = 0;
  state.page = 0;
  state.list = [];
  state.unavailable = [];
  state.siblingKeys = [];
  state.error = "";
}

/** 条件或姓名变化时从第 1 页重查；仅姓名变化防抖，语种/日期/兄弟段变化立即查询。 */
function refresh(rowKey: string, request: GuideAvailabilityRequest) {
  const state = stateOf(rowKey);
  const queryKey = request.ready ? JSON.stringify(request.query) : request.missing;
  if (state.key === queryKey) return;
  const keywordOnly =
    request.ready &&
    state.query !== undefined &&
    JSON.stringify({ ...state.query, keyword: undefined }) ===
      JSON.stringify({ ...request.query, keyword: undefined });
  state.key = queryKey;
  const generation = ++state.generation;
  clearTimeout(state.timer);
  resetResult(state);
  state.loading = request.ready;
  if (!request.ready) {
    state.query = undefined;
    return;
  }
  state.query = request.query;
  const siblingKeys = request.siblingIndexes.map((index) => rows.value[index]!.key);
  const run = () => void load(state, generation, request.query, siblingKeys);
  if (keywordOnly) state.timer = setTimeout(run, SEARCH_DEBOUNCE);
  else run();
}

async function load(
  state: CandidateState,
  generation: number,
  query: TourGuideQuery,
  siblingKeys: string[],
) {
  state.loading = true;
  try {
    const result = await tourService.availableGuides(query);
    if (generation !== state.generation) return;
    for (const item of [...result.list, ...result.unavailable]) labels[item.id] = guideLabel(item);
    if (query.page === 1) {
      state.status = result.status;
      state.message = result.message;
    }
    state.total = result.total;
    state.page = result.page;
    state.list = [...state.list, ...result.list];
    state.unavailable = [...state.unavailable, ...result.unavailable];
    state.siblingKeys = siblingKeys;
  } catch (error) {
    if (generation !== state.generation) return;
    // 保留查询键，其他段变化不触发重试；用户再次输入姓名时由 search 重试。
    state.error = requestErrorMessage(error);
  } finally {
    if (generation === state.generation) state.loading = false;
  }
}

function optionCount(rowKey: string) {
  const state = candidates[rowKey];
  return state ? state.list.length + state.unavailable.length : 0;
}

/** 下拉滚到底部时按需加载下一页；总数以服务端 total 为准。 */
function loadNextPage(rowKey: string) {
  const state = candidates[rowKey];
  if (!state?.query || state.loading || state.error || optionCount(rowKey) >= state.total) return;
  void load(
    state,
    state.generation,
    { ...state.query, page: state.page + 1 },
    state.siblingKeys,
  );
}

// 姓名、语种、日期或兄弟段变化后按各段新查询刷新；移除行时清理其状态，过期响应由 generation 丢弃。
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
// 导游、语种、日期或兄弟段改变后，本次临时冲突确认作废，需重新查询确认。
watch(conflictKeys, (keys) => {
  rows.value.forEach((row, index) => {
    if (row.scheduleConflictToken && row.scheduleConflictKey !== keys[index]) clearScheduleConflict(row);
  });
});
onBeforeUnmount(() => Object.keys(candidates).forEach(discard));

function discard(key: string) {
  const state = candidates[key]!;
  state.generation++;
  clearTimeout(state.timer);
  delete candidates[key];
}

/** 下拉展开及清空输入时以空串回调，即回到按条件列出可用导游。 */
function search(rowKey: string, value: string) {
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

/** 改变语种清空本段导游并重查，不影响其他段。 */
function changeLanguage(row: GuideServiceRow, value: string) {
  if (row.language === value) return;
  row.language = value;
  row.guideId = "";
  clearScheduleConflict(row);
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
  const state = candidates[row.key];
  return Boolean(
    state && [...state.list, ...state.unavailable].some((item) => item.id === row.guideId),
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
  return state?.message || t("tour.guideService.searchGuide");
}
function reasonTitle(reason: TourGuideUnavailableReason) {
  if (reason.code === "LANGUAGE_MISMATCH")
    return t("tour.guideService.reasons.LANGUAGE_MISMATCH", {
      expected: reason.expectedLanguage ?? "",
      actual: reason.actualLanguage || t("tour.guideService.reasons.languageEmpty"),
    });
  return t(`tour.guideService.reasons.${reason.code}`);
}
/**
 * 原因明细只含日期与排期摘要，不构造他团详情入口。
 *
 * @param reason - 服务端不可用原因。
 * @param siblingKeys - 查询时 otherServices 对应的行 key；保存失败返回的原因无此映射。
 * @returns 每行一条摘要文本。
 */
function reasonDetails(reason: TourGuideUnavailableReason, siblingKeys?: string[]): string[] {
  if (reason.code === "LEAVE_CONFLICT")
    return (reason.leaves ?? []).map((leave) => `${leave.startDate} ~ ${leave.endDate}`);
  if (reason.code === "SCHEDULE_CONFLICT")
    return (reason.tours ?? []).map(
      (tour) =>
        `${tour.tourNo} · ${businessUnitName(tour.businessUnit)} · ${tour.serviceStartDate} ~ ${tour.serviceEndDate}`,
    );
  if (reason.code === "FORM_CONFLICT")
    return (reason.services ?? []).map(
      (service) =>
        `${siblingLabel(siblingKeys, service.otherServiceIndex)} · ${service.serviceStartDate} ~ ${service.serviceEndDate}`,
    );
  return [];
}
/** otherServiceIndex 是请求 otherServices 的下标，经请求时记录的行 key 映射回当前表单段号。 */
function siblingLabel(siblingKeys: string[] | undefined, otherServiceIndex: number) {
  if (!siblingKeys) return t("tour.guideService.otherSegment");
  const siblingKey = siblingKeys[otherServiceIndex];
  const index = rows.value.findIndex((row) => row.key === siblingKey);
  return index >= 0
    ? t("tour.guideService.segment", { n: index + 1 })
    : t("tour.guideService.removedSegment");
}
function unavailable(row: GuideServiceRow) {
  const state = candidates[row.key];
  if (!state?.status) return false;
  return isGuideServiceUnavailable(row, state);
}
/** 用户明确修改了日期或点击确认后，旧段不再显示历史/异常提示。 */
function timeVerified(row: GuideServiceRow) {
  return row.confirmTime || guideServiceTimeChanged(row);
}
function outside(row: GuideServiceRow) {
  if (row.existing && !guideServiceTimeChanged(row)) return row.existing.outsideTourWindow;
  return outsideTeamWindow(row, props.teamWindow);
}

/** 本次临时确认优先；段未变时沿用服务端已存确认（含真实确认人与时间）。 */
function confirmation(row: GuideServiceRow) {
  if (row.scheduleConflictToken) return { reasons: row.scheduleConflictReasons, by: null };
  const saved = row.existing?.conflictConfirmation;
  if (!saved || guideServiceChanged(row)) return null;
  return {
    reasons: saved.reasons,
    by: { name: saved.confirmedByName, time: formatDateTime(saved.confirmedAt) },
  };
}

function serverConflict(row: GuideServiceRow) {
  const server = props.serverErrors?.[row.key];
  return server?.reasons?.length ? server : null;
}
function rowMessage(row: GuideServiceRow, index: number) {
  const server = props.serverErrors?.[row.key];
  if (server) return server.message;
  const code = localErrors.value[index];
  if (code === "incomplete" && !props.showIncomplete) return "";
  return code ? t(`tour.guideService.errors.${code}`) : "";
}

/**
 * 仅 canOverride 的排期冲突可“仍然使用”：列出冲突后经“确认使用”才把令牌记到本段。
 *
 * @param row - 当前服务段。
 * @param guide - 冲突导游及其原因。
 * @param token - 服务端给出的确认令牌。
 * @param siblingKeys - 查询时兄弟段映射；保存失败返回的冲突不传。
 */
async function useAnyway(
  row: GuideServiceRow,
  guide: Pick<TourGuideUnavailable, "id" | "reasons"> & { label: string },
  token: string,
  siblingKeys?: string[],
) {
  const lines = guide.reasons.flatMap((reason) => [
    reasonTitle(reason),
    ...reasonDetails(reason, siblingKeys).map((line) => `· ${line}`),
  ]);
  try {
    await ElMessageBox.confirm(
      h("div", { class: "flex flex-col gap-1" }, [
        h("p", { class: "m-0" }, t("tour.guideService.conflictConfirmMessage", { guide: guide.label })),
        ...lines.map((line) => h("p", { class: "m-0 text-muted" }, line)),
      ]),
      t("tour.guideService.conflictConfirmTitle"),
      {
        type: "warning",
        confirmButtonText: t("tour.guideService.confirmUse"),
        cancelButtonText: t("common.cancel"),
      },
    );
  } catch {
    return;
  }
  row.guideId = guide.id;
  const index = rows.value.findIndex((item) => item.key === row.key);
  row.scheduleConflictToken = token;
  row.scheduleConflictKey = scheduleConflictKey(rows.value, index);
  row.scheduleConflictReasons = guide.reasons;
}
function useServerConflict(row: GuideServiceRow) {
  const server = serverConflict(row);
  if (!server?.scheduleConflictToken) return;
  void useAnyway(
    row,
    { id: row.guideId, reasons: server.reasons ?? [], label: currentLabel(row) },
    server.scheduleConflictToken,
  );
}

function add() {
  rows.value.push(emptyGuideServiceRow());
}
function remove(index: number) {
  rows.value.splice(index, 1);
}
function useTeamWindow(row: GuideServiceRow) {
  if (!props.teamWindow) return;
  row.serviceStartDate = props.teamWindow.from.slice(0, 10);
  row.serviceEndDate = props.teamWindow.to.slice(0, 10);
  row.confirmTime = false;
}

/** 本次查询明确列为不可用且未确认的已选人员（仅调整过的段）；未命中搜索词不算，保存仍由服务端校验。 */
function hasUnavailable() {
  return rows.value.some(unavailable);
}
defineExpose({ hasUnavailable });
</script>
