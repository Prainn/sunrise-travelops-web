import type { DirectLedgerTourInput } from "@/types/direct-ledger";
import { addDays } from "@/utils/format";
import type {
  TourBusinessUnit,
  TourCreateRequest,
  TourGuideAvailability,
  TourGuideQuery,
  TourGuideService,
  TourGuideServiceInput,
  TourGuideUnavailableReason,
  TourInput,
  TourLinkedSourceModule,
  TourManualSource,
  TourRecord,
  TourSchedule,
  TourScheduleMode,
  TourUpdateRequest,
} from "@/types/tour";

export type TourCreateMode = "manual" | "linked";

/** 服务段编辑行；key 仅作 UI 身份，id 是服务端原 ID（新段无）。 */
export interface GuideServiceRow {
  key: string;
  id?: string;
  guideId: string;
  language: string;
  /** Asia/Shanghai 自然日 `YYYY-MM-DD`，首尾均包含。 */
  serviceStartDate: string;
  serviceEndDate: string;
  remark: string;
  /** 仅用于显式确认未改日期的历史段。 */
  confirmTime: boolean;
  /** 本次“确认使用”排期冲突后取得的令牌；条件变化即作废。 */
  scheduleConflictToken: string;
  /** 取得令牌时的确认条件（导游、语种、日期、兄弟段），用于判断令牌是否仍有效。 */
  scheduleConflictKey: string;
  /** 确认时展示的冲突原因，供“已确认排期冲突”摘要。 */
  scheduleConflictReasons: TourGuideUnavailableReason[];
  /** 服务端原样快照，供只读提示、变更判断与停用人员展示。 */
  existing: TourGuideService | null;
}

let rowSeed = 0;
function nextRowKey() {
  rowSeed += 1;
  return `gs-${rowSeed}`;
}

function emptyConflictConfirmation() {
  return { scheduleConflictToken: "", scheduleConflictKey: "", scheduleConflictReasons: [] };
}

export function emptyGuideServiceRow(): GuideServiceRow {
  return {
    key: nextRowKey(),
    guideId: "",
    language: "",
    serviceStartDate: "",
    serviceEndDate: "",
    remark: "",
    confirmTime: false,
    ...emptyConflictConfirmation(),
    existing: null,
  };
}

export function guideServiceRowFromRecord(service: TourGuideService): GuideServiceRow {
  return {
    key: nextRowKey(),
    id: service.id,
    guideId: service.guideId,
    language: service.language,
    serviceStartDate: service.serviceStartDate,
    serviceEndDate: service.serviceEndDate,
    remark: service.remark,
    confirmTime: false,
    ...emptyConflictConfirmation(),
    existing: service,
  };
}

/** 人员、语种或服务起止是否不同于服务端原值（新段恒为 true）。 */
export function guideServiceChanged(row: GuideServiceRow): boolean {
  const old = row.existing;
  return (
    !old ||
    old.guideId !== row.guideId ||
    old.language !== row.language ||
    guideServiceTimeChanged(row)
  );
}

export function guideServiceTimeChanged(row: GuideServiceRow): boolean {
  const old = row.existing;
  return (
    !old ||
    old.serviceStartDate !== row.serviceStartDate ||
    old.serviceEndDate !== row.serviceEndDate
  );
}

/** 清除本次临时冲突确认；服务端已存确认只在段未变时沿用，不在此改写。 */
export function clearScheduleConflict(row: GuideServiceRow) {
  Object.assign(row, emptyConflictConfirmation());
}

/** 请求白名单：不回传 timeSource、快照、已存确认、只读提示和审计字段。 */
export function guideServiceInputs(rows: GuideServiceRow[]): TourGuideServiceInput[] {
  return rows.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    guideId: row.guideId,
    language: row.language.trim(),
    serviceStartDate: row.serviceStartDate,
    serviceEndDate: row.serviceEndDate,
    remark: row.remark.trim(),
    ...(row.id && row.confirmTime ? { confirmTime: true } : {}),
    ...(row.scheduleConflictToken ? { scheduleConflictToken: row.scheduleConflictToken } : {}),
  }));
}

export type GuideServiceErrorCode = "incomplete" | "order";

/** 新增/调整/人工确认的段须开始不晚于结束；未改历史段（含异常时长）可原样保留。 */
function needsValidRange(row: GuideServiceRow) {
  return guideServiceTimeChanged(row) || row.confirmTime;
}

function hasValidRange(row: Pick<GuideServiceRow, "serviceStartDate" | "serviceEndDate">) {
  return Boolean(
    row.serviceStartDate && row.serviceEndDate && row.serviceStartDate <= row.serviceEndDate,
  );
}

/**
 * 逐行前端校验；同导游按自然日两端包含，同一天即重叠、相邻日不冲突。
 * 同导游重叠只提示，可在可用性查询中“仍然使用”后由服务端确认，故不作为本地阻断。
 */
export function guideServiceErrors(rows: GuideServiceRow[]): Array<GuideServiceErrorCode | null> {
  return rows.map<GuideServiceErrorCode | null>((row) => {
    if (!row.guideId || !row.language.trim() || !row.serviceStartDate || !row.serviceEndDate)
      return "incomplete";
    if (needsValidRange(row) && !hasValidRange(row)) return "order";
    return null;
  });
}

/** 超出团队接送日期范围只提示，不阻止保存；团队接送保留时分，导游服务只比日期。 */
export function outsideTeamWindow(
  row: Pick<GuideServiceRow, "serviceStartDate" | "serviceEndDate">,
  window: { from: string; to: string } | null,
): boolean {
  if (!window?.from || !window.to || !row.serviceStartDate || !row.serviceEndDate) return false;
  return row.serviceStartDate < window.from.slice(0, 10) || row.serviceEndDate > window.to.slice(0, 10);
}

export const GUIDE_KEYWORD_MAX_LENGTH = 150;
export const GUIDE_PAGE_SIZE = 20;

export type GuideAvailabilityRequest =
  /** 语种或当前段起止未就绪。 */
  | { ready: false; missing: "conditions" }
  /** 姓名超长，不发请求。 */
  | { ready: false; missing: "keywordTooLong" }
  /** siblingIndexes[i] 为 otherServices[i] 对应的完整表单行下标。 */
  | { ready: true; query: TourGuideQuery; siblingIndexes: number[] };

function siblingServices(rows: GuideServiceRow[], index: number) {
  const siblingIndexes = rows.flatMap((other, otherIndex) =>
    otherIndex !== index && other.guideId && hasValidRange(other) ? [otherIndex] : [],
  );
  const otherServices = siblingIndexes.map((otherIndex) => ({
    guideId: rows[otherIndex]!.guideId,
    serviceStartDate: rows[otherIndex]!.serviceStartDate,
    serviceEndDate: rows[otherIndex]!.serviceEndDate,
  }));
  return { siblingIndexes, otherServices };
}

/**
 * 某段的可用导游查询：语种及起止日期就绪即查询，姓名可空（空时服务端只返回可用导游）；
 * 除该段外所有完整兄弟段（含未保存）仅传 3 个字段。
 */
export function guideAvailabilityRequest(
  businessUnit: TourBusinessUnit | null,
  rows: GuideServiceRow[],
  index: number,
  keyword: string,
  page: number,
  excludeTourId?: string,
): GuideAvailabilityRequest {
  const row = rows[index];
  if (!businessUnit || !row || !row.language.trim() || !hasValidRange(row))
    return { ready: false, missing: "conditions" };
  const name = keyword.trim();
  if (name.length > GUIDE_KEYWORD_MAX_LENGTH) return { ready: false, missing: "keywordTooLong" };
  const { siblingIndexes, otherServices } = siblingServices(rows, index);
  return {
    ready: true,
    siblingIndexes,
    query: {
      ...(name ? { keyword: name } : {}),
      businessUnit,
      language: row.language.trim(),
      serviceStartDate: row.serviceStartDate,
      serviceEndDate: row.serviceEndDate,
      page,
      pageSize: GUIDE_PAGE_SIZE,
      ...(excludeTourId ? { excludeTourId } : {}),
      ...(otherServices.length ? { otherServices } : {}),
    },
  };
}

/** 保存失败定位到某段的信息；排期待确认时附带服务端最新原因与令牌。 */
export interface GuideServiceServerError {
  message: string;
  reasons?: TourGuideUnavailableReason[];
  canOverride?: boolean;
  scheduleConflictToken?: string;
}

/**
 * 按 serviceIndex（优先）或 serviceId 定位保存失败的服务段。
 *
 * @param rows - 提交时的服务段行。
 * @param message - 后端错误提示。
 * @param details - 后端错误 details。
 * @returns key 为行 key 的错误映射；无法定位时为空对象。
 */
export function guideServiceServerErrors(
  rows: GuideServiceRow[],
  message: string,
  details: Record<string, unknown> | undefined,
): Record<string, GuideServiceServerError> {
  if (!details) return {};
  const index = details.serviceIndex;
  const row =
    (typeof index === "number" ? rows[index] : undefined) ??
    (typeof details.serviceId === "string"
      ? rows.find((item) => item.id === details.serviceId)
      : undefined);
  if (!row) return {};
  if (details.reason !== "GUIDE_SCHEDULE_CONFIRMATION_REQUIRED") return { [row.key]: { message } };
  // 令牌过时或未确认：清掉旧令牌，按最新原因让用户重新确认，不自动重试。
  clearScheduleConflict(row);
  return {
    [row.key]: {
      message,
      reasons: Array.isArray(details.reasons) ? (details.reasons as TourGuideUnavailableReason[]) : [],
      canOverride: details.canOverride === true,
      ...(typeof details.scheduleConflictToken === "string"
        ? { scheduleConflictToken: details.scheduleConflictToken }
        : {}),
    },
  };
}

/** 冲突确认条件；导游、语种、日期或兄弟段任一改变，临时令牌即作废。 */
export function scheduleConflictKey(rows: GuideServiceRow[], index: number): string {
  const row = rows[index];
  if (!row) return "";
  return JSON.stringify([
    row.guideId,
    row.language.trim(),
    row.serviceStartDate,
    row.serviceEndDate,
    siblingServices(rows, index).otherServices,
  ]);
}

/**
 * 仅当本次查询明确把所选人员列为不可用、且未完成可覆盖冲突的确认时返回 true；
 * 未命中当前姓名搜索不代表不可用，最终以保存校验为准。未改历史段允许保留停用/软删档案。
 */
export function isGuideServiceUnavailable(
  row: GuideServiceRow,
  availability: Pick<TourGuideAvailability, "list" | "unavailable"> | null | undefined,
): boolean {
  if (!row.guideId || !availability || !guideServiceChanged(row)) return false;
  if (availability.list.some((item) => item.id === row.guideId)) return false;
  const item = availability.unavailable.find((candidate) => candidate.id === row.guideId);
  if (!item) return false;
  return !(item.canOverride && row.scheduleConflictToken);
}

/** 编辑框状态；两种接送模式的输入都保留，提交时只取当前模式字段。 */
export interface TourFormState {
  inquiryId: string;
  businessUnit: TourBusinessUnit | "";
  countryItemId: string;
  collectCoordinatorId: string;
  agencyId: string;
  contactName: string;
  itinerarySummary: string;
  startDate: string;
  days: number | null;
  operatorId: string;
  adults: number | null;
  children: number | null;
  leaders: number | null;
  language: string;
  shopping: boolean;
  scheduleMode: TourScheduleMode;
  pickupFlightId: string;
  dropFlightId: string;
  /** 无时区 `YYYY-MM-DD HH:mm`。 */
  pickupAt: string;
  dropAt: string;
  guideServices: GuideServiceRow[];
  remark: string;
}

export function emptyTourForm(): TourFormState {
  return {
    inquiryId: "",
    businessUnit: "",
    countryItemId: "",
    collectCoordinatorId: "",
    agencyId: "",
    contactName: "",
    itinerarySummary: "",
    startDate: "",
    days: null,
    operatorId: "",
    adults: 0,
    children: 0,
    leaders: 0,
    language: "",
    shopping: false,
    scheduleMode: "manual",
    pickupFlightId: "",
    dropFlightId: "",
    pickupAt: "",
    dropAt: "",
    guideServices: [],
    remark: "",
  };
}

/** 从扁平响应字段组装编辑表单，空航班/空来源保持为空字符串。 */
export function tourFormFromRecord(tour: TourRecord): TourFormState {
  const manual = tour.scheduleMode === "manual";
  return {
    ...emptyTourForm(),
    businessUnit: tour.businessUnit,
    countryItemId: tour.countryItemId ?? "",
    collectCoordinatorId: tour.collectCoordinatorId,
    agencyId: tour.agencyId ?? "",
    contactName: tour.contactName,
    itinerarySummary: tour.itinerarySummary,
    startDate: tour.startDate,
    days: tour.days,
    operatorId: tour.operatorId,
    adults: tour.adults,
    children: tour.children,
    leaders: tour.leaders,
    language: tour.language,
    shopping: tour.shopping,
    scheduleMode: tour.scheduleMode,
    pickupFlightId: tour.pickupFlightId ?? "",
    dropFlightId: tour.dropFlightId ?? "",
    pickupAt: manual ? tour.pickupAt : "",
    dropAt: manual ? tour.dropAt : "",
    guideServices: tour.guideServices.map(guideServiceRowFromRecord),
    remark: tour.remark,
  };
}

export function tourSchedule(form: TourFormState): TourSchedule {
  return form.scheduleMode === "manual"
    ? { scheduleMode: "manual", pickupAt: form.pickupAt, dropAt: form.dropAt }
    : { scheduleMode: "flight", pickupFlightId: form.pickupFlightId, dropFlightId: form.dropFlightId };
}

/**
 * 导游专用保存保留当前团资料，不重提手工来源或重建来源快照。
 */
export function guideAssignmentRequest(tour: TourRecord, rows: GuideServiceRow[]): TourUpdateRequest {
  return {
    ...tourInput({ ...tourFormFromRecord(tour), guideServices: rows }),
    version: tour.version,
  };
}

function tourInput(form: TourFormState): TourInput {
  return {
    operatorId: form.operatorId,
    adults: form.adults ?? 0,
    children: form.children ?? 0,
    leaders: form.leaders ?? 0,
    language: form.language,
    shopping: form.shopping,
    guideServices: guideServiceInputs(form.guideServices),
    remark: form.remark,
    ...tourSchedule(form),
  };
}

export function manualSourceFromForm(form: TourFormState): TourManualSource | null {
  if (!form.businessUnit || !form.countryItemId || form.days == null) return null;
  return {
    businessUnit: form.businessUnit,
    countryItemId: form.countryItemId,
    collectCoordinatorId: form.collectCoordinatorId,
    ...(form.businessUnit === "shengxu" && form.agencyId ? { agencyId: form.agencyId } : {}),
    contactName: form.contactName,
    itinerarySummary: form.itinerarySummary,
    startDate: form.startDate,
    days: form.days,
  };
}

export function createTourRequest(
  form: TourFormState,
  source:
    | { sourceModule: "manual" }
    | {
      sourceModule: TourLinkedSourceModule;
      inquiryId: string;
      quoteId: string;
      seriesStartDate?: string;
    },
): TourCreateRequest | null {
  if (source.sourceModule !== "manual") {
    // 关联来源只能按航班计算接送。
    return { ...tourInput({ ...form, scheduleMode: "flight" }), ...source };
  }
  const manualSource = manualSourceFromForm(form);
  return manualSource ? { ...tourInput(form), sourceModule: "manual", manualSource } : null;
}

export function updateTourRequest(tour: TourRecord, form: TourFormState): TourUpdateRequest {
  if (tour.sourceModule !== "manual")
    return {
      ...tourInput({ ...form, scheduleMode: "flight" }),
      version: tour.version,
      // 系列来源团可改本团出发日，团号与其他团不变。
      ...(tour.isSeriesSource && form.startDate ? { seriesStartDate: form.startDate } : {}),
    };
  const manualSource = manualSourceFromForm(form);
  return {
    ...tourInput(form),
    version: tour.version,
    ...(manualSource ? { manualSource } : {}),
  };
}

export const ITINERARY_SUMMARY_MAX_LENGTH = 500;
export const CANCEL_REASON_MAX_LENGTH = 500;

export function isItinerarySummaryTooLong(summary: string) {
  return summary.trim().length > ITINERARY_SUMMARY_MAX_LENGTH;
}

/** 撤销原因：去除首尾空白后必填且不超过上限。 */
export function cancelReasonError(reason: string | null | undefined): "required" | "tooLong" | null {
  const value = (reason ?? "").trim();
  if (!value) return "required";
  return value.length > CANCEL_REASON_MAX_LENGTH ? "tooLong" : null;
}

export type LedgerTourMode = "convert" | "backfill" | "rebuild";

/** 从直客台账打开建团资料；业务与人员按台账固定。 */
export interface LedgerTourDraft {
  mode: LedgerTourMode;
  businessUnit: TourBusinessUnit;
  collectCoordinatorId: string;
  collectCoordinatorName: string;
  operatorId: string;
  operatorName: string;
  countryItemId: string;
  countryName: string;
  startDate: string;
  itinerarySummary: string;
  contactName: string;
  submit: (input: DirectLedgerTourInput) => Promise<unknown>;
}

/** 人数沿用新建默认值；超长行程原样带入，由校验提示人工整理。 */
export function tourFormFromLedgerDraft(draft: LedgerTourDraft): TourFormState {
  const form: TourFormState = {
    ...emptyTourForm(),
    businessUnit: draft.businessUnit,
    countryItemId: draft.countryItemId,
    collectCoordinatorId: draft.collectCoordinatorId,
    operatorId: draft.operatorId,
    startDate: draft.startDate,
    itinerarySummary: draft.itinerarySummary,
    contactName: draft.contactName,
  };
  syncManualPickupDate(form);
  return form;
}

/** 资料未补齐时返回 null；不把缺失人数转成 0。 */
export function ledgerTourInput(form: TourFormState): DirectLedgerTourInput | null {
  const { days, adults, children, leaders } = form;
  if (!form.countryItemId || days == null || adults == null || children == null || leaders == null)
    return null;
  return {
    countryItemId: form.countryItemId,
    contactName: form.contactName,
    itinerarySummary: form.itinerarySummary,
    startDate: form.startDate,
    days,
    adults,
    children,
    leaders,
    language: form.language,
    shopping: form.shopping,
    remark: form.remark,
    // 导游之后在成团表安排，合同要求显式提交空数组。
    guideServices: [],
    ...tourSchedule(form),
  };
}

/**
 * 开始日期变化时同步手填接团日，保留已填时分；首次默认午夜。
 */
export function syncManualPickupDate(form: TourFormState): void {
  if (form.scheduleMode !== "manual" || !form.startDate) return;
  const time = form.pickupAt ? form.pickupAt.slice(11) : "00:00";
  form.pickupAt = `${form.startDate} ${time}`;
}

/**
 * 台账建团按包含首日的天数带出送团日期，保留已选送团时分；首次沿用接团时分。
 */
export function syncLedgerDropDate(form: TourFormState): void {
  const { days, startDate } = form;
  if (form.scheduleMode !== "manual" || !startDate || days == null || !Number.isInteger(days) || days < 1 || days > 365) return;
  const time = form.dropAt ? form.dropAt.slice(11) : form.pickupAt ? form.pickupAt.slice(11) : "00:00";
  form.dropAt = `${addDays(startDate, days - 1)} ${time}`;
}

/** 手填接送校验：接团日须为开始日期，送团不得早于接团。 */
export function manualScheduleError(
  startDate: string,
  pickupAt: string,
  dropAt: string,
): "pickupDate" | "dropOrder" | null {
  if (startDate && pickupAt && pickupAt.slice(0, 10) !== startDate) return "pickupDate";
  if (pickupAt && dropAt && dropAt < pickupAt) return "dropOrder";
  return null;
}
