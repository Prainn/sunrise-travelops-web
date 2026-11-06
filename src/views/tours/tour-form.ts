import type { DirectLedgerTourInput } from "@/types/direct-ledger";
import { addDays } from "@/utils/format";
import type {
  TourBusinessUnit,
  TourCreateRequest,
  TourGuideAvailability,
  TourGuideQuery,
  TourGuideService,
  TourGuideServiceInput,
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
  serviceStartAt: string;
  serviceEndAt: string;
  remark: string;
  /** 仅用于显式确认未改时间的历史段。 */
  confirmTime: boolean;
  /** 服务端原样快照，供只读提示、变更判断与停用人员展示。 */
  existing: TourGuideService | null;
}

let rowSeed = 0;
function nextRowKey() {
  rowSeed += 1;
  return `gs-${rowSeed}`;
}

export function emptyGuideServiceRow(): GuideServiceRow {
  return {
    key: nextRowKey(),
    guideId: "",
    language: "",
    serviceStartAt: "",
    serviceEndAt: "",
    remark: "",
    confirmTime: false,
    existing: null,
  };
}

export function guideServiceRowFromRecord(service: TourGuideService): GuideServiceRow {
  return {
    key: nextRowKey(),
    id: service.id,
    guideId: service.guideId,
    language: service.language,
    serviceStartAt: service.serviceStartAt,
    serviceEndAt: service.serviceEndAt,
    remark: service.remark,
    confirmTime: false,
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
  return !old || old.serviceStartAt !== row.serviceStartAt || old.serviceEndAt !== row.serviceEndAt;
}

/** 请求白名单：不回传 timeSource、快照、只读提示和审计字段。 */
export function guideServiceInputs(rows: GuideServiceRow[]): TourGuideServiceInput[] {
  return rows.map((row) => ({
    ...(row.id ? { id: row.id } : {}),
    guideId: row.guideId,
    language: row.language.trim(),
    serviceStartAt: row.serviceStartAt,
    serviceEndAt: row.serviceEndAt,
    remark: row.remark.trim(),
    ...(row.id && row.confirmTime ? { confirmTime: true } : {}),
  }));
}

export type GuideServiceErrorCode = "incomplete" | "order" | "overlap";

/** 新增/调整/人工确认的段须开始早于结束；未改历史段（含异常时长）可原样保留。 */
function needsPositiveDuration(row: GuideServiceRow) {
  return guideServiceTimeChanged(row) || row.confirmTime;
}

function hasPositiveDuration(row: GuideServiceRow) {
  return Boolean(row.serviceStartAt && row.serviceEndAt && row.serviceStartAt < row.serviceEndAt);
}

/**
 * 逐行前端校验；同导游两端包含，前段结束须严格早于后段开始。
 * 仅在涉及被改动段时校验冲突，未改历史段之间的既有关系交给服务端。
 */
export function guideServiceErrors(rows: GuideServiceRow[]): Array<GuideServiceErrorCode | null> {
  const errors = rows.map<GuideServiceErrorCode | null>((row) => {
    if (
      !row.guideId ||
      !row.language.trim() ||
      !row.serviceStartAt ||
      !row.serviceEndAt
    )
      return "incomplete";
    if (needsPositiveDuration(row) && !hasPositiveDuration(row)) return "order";
    return null;
  });
  rows.forEach((row, index) => {
    if (errors[index] || !hasPositiveDuration(row)) return;
    const clash = rows.some((other, otherIndex) => {
      if (otherIndex === index || other.guideId !== row.guideId || !hasPositiveDuration(other))
        return false;
      if (!guideServiceChanged(row) && !guideServiceChanged(other)) return false;
      return row.serviceStartAt <= other.serviceEndAt && other.serviceStartAt <= row.serviceEndAt;
    });
    if (clash) errors[index] = "overlap";
  });
  return errors;
}

/** 超出团队接送范围只提示，不阻止保存。 */
export function outsideTeamWindow(
  row: Pick<GuideServiceRow, "serviceStartAt" | "serviceEndAt">,
  window: { from: string; to: string } | null,
): boolean {
  if (!window?.from || !window.to || !row.serviceStartAt || !row.serviceEndAt) return false;
  return row.serviceStartAt < window.from || row.serviceEndAt > window.to;
}

export const GUIDE_KEYWORD_MAX_LENGTH = 150;

export type GuideAvailabilityRequest =
  /** 语种或当前段起止未就绪。 */
  | { ready: false; missing: "conditions" }
  /** 姓名为空或超长，不发请求。 */
  | { ready: false; missing: "keyword" | "keywordTooLong" }
  /** siblingIndexes[i] 为 otherServices[i] 对应的完整表单行下标。 */
  | { ready: true; query: TourGuideQuery; siblingIndexes: number[] };

/**
 * 某段按姓名选人的可用性查询：当前段须正时长；除该段外所有完整兄弟段（含未保存）仅传 3 个字段。
 * 条件不全或姓名无效时不发请求，由界面提示补齐。
 */
export function guideAvailabilityRequest(
  businessUnit: TourBusinessUnit | null,
  rows: GuideServiceRow[],
  index: number,
  keyword: string,
  excludeTourId?: string,
): GuideAvailabilityRequest {
  const row = rows[index];
  if (!businessUnit || !row || !row.language.trim() || !hasPositiveDuration(row))
    return { ready: false, missing: "conditions" };
  const name = keyword.trim();
  if (!name) return { ready: false, missing: "keyword" };
  if (name.length > GUIDE_KEYWORD_MAX_LENGTH) return { ready: false, missing: "keywordTooLong" };
  const siblingIndexes = rows.flatMap((other, otherIndex) =>
    otherIndex !== index &&
    other.guideId &&
    other.serviceStartAt &&
    other.serviceEndAt &&
    other.serviceStartAt <= other.serviceEndAt
      ? [otherIndex]
      : [],
  );
  const otherServices = siblingIndexes.map((otherIndex) => ({
    guideId: rows[otherIndex]!.guideId,
    serviceStartAt: rows[otherIndex]!.serviceStartAt,
    serviceEndAt: rows[otherIndex]!.serviceEndAt,
  }));
  return {
    ready: true,
    siblingIndexes,
    query: {
      keyword: name,
      businessUnit,
      language: row.language.trim(),
      serviceStartAt: row.serviceStartAt,
      serviceEndAt: row.serviceEndAt,
      ...(excludeTourId ? { excludeTourId } : {}),
      ...(otherServices.length ? { otherServices } : {}),
    },
  };
}

/**
 * 仅当本次查询明确把所选人员列为不可用时返回 true；未命中当前姓名搜索不代表不可用，
 * 最终以保存校验为准。人员、语种、起止均未改的历史段允许保留停用/软删档案。
 */
export function isGuideServiceUnavailable(
  row: GuideServiceRow,
  availability: TourGuideAvailability | null | undefined,
): boolean {
  if (!row.guideId || !availability || !guideServiceChanged(row)) return false;
  if (availability.list.some((item) => item.id === row.guideId)) return false;
  return availability.unavailable.some((item) => item.id === row.guideId);
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
    | { sourceModule: TourLinkedSourceModule; inquiryId: string; quoteId: string },
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
    return { ...tourInput({ ...form, scheduleMode: "flight" }), version: tour.version };
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
