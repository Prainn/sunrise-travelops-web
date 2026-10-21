import type {
  TourBusinessUnit,
  TourCreateRequest,
  TourGuideOption,
  TourGuideQuery,
  TourInput,
  TourLinkedSourceModule,
  TourManualSource,
  TourRecord,
  TourSchedule,
  TourScheduleMode,
  TourUpdateRequest,
} from "@/types/tour";

export type TourCreateMode = "manual" | "linked";

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
  guideId: string | null;
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
    guideId: null,
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
    guideId: tour.guideId,
    remark: tour.remark,
  };
}

export function tourSchedule(form: TourFormState): TourSchedule {
  return form.scheduleMode === "manual"
    ? { scheduleMode: "manual", pickupAt: form.pickupAt, dropAt: form.dropAt }
    : { scheduleMode: "flight", pickupFlightId: form.pickupFlightId, dropFlightId: form.dropFlightId };
}

function tourInput(form: TourFormState): TourInput {
  return {
    operatorId: form.operatorId,
    adults: form.adults ?? 0,
    children: form.children ?? 0,
    leaders: form.leaders ?? 0,
    language: form.language,
    shopping: form.shopping,
    guideId: form.guideId || null,
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

/**
 * 开始日期变化时同步手填接团日，保留已填时分；首次默认午夜。
 */
export function syncManualPickupDate(form: TourFormState): void {
  if (form.scheduleMode !== "manual" || !form.startDate) return;
  const time = form.pickupAt ? form.pickupAt.slice(11) : "00:00";
  form.pickupAt = `${form.startDate} ${time}`;
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

/** 缺少必要字段或手填时间不合法时返回 null，不发请求。 */
export function guideQuery(
  period: { businessUnit: TourBusinessUnit | null; startDate: string | null; days: number | null },
  form: TourFormState,
  excludeTourId?: string,
): TourGuideQuery | null {
  const { businessUnit, startDate, days } = period;
  if (!businessUnit || !startDate || !days || !form.language) return null;
  const schedule = tourSchedule(form);
  if (schedule.scheduleMode === "manual") {
    if (!schedule.pickupAt || !schedule.dropAt) return null;
    if (manualScheduleError(startDate, schedule.pickupAt, schedule.dropAt)) return null;
  } else if (!schedule.pickupFlightId || !schedule.dropFlightId) {
    return null;
  }
  return {
    businessUnit,
    startDate,
    days,
    ...schedule,
    language: form.language,
    ...(excludeTourId ? { excludeTourId } : {}),
  };
}

/** 是否改动了影响导游占用的接送安排。 */
export function scheduleChanged(tour: TourRecord, form: TourFormState): boolean {
  if (form.scheduleMode !== tour.scheduleMode) return true;
  if (tour.sourceModule === "manual" && (form.startDate !== tour.startDate || form.days !== tour.days))
    return true;
  return form.scheduleMode === "manual"
    ? form.pickupAt !== tour.pickupAt || form.dropAt !== tour.dropAt
    : form.pickupFlightId !== tour.pickupFlightId || form.dropFlightId !== tour.dropFlightId;
}

/**
 * 已选导游确实不在最新候选中时返回 true，由用户自行调整，不自动清空。
 * 原导游、语种且接送未变时，后端允许保留已停用/软删档案，不视为不可用。
 */
export function isGuideUnavailable(
  form: TourFormState,
  candidates: TourGuideOption[],
  tour: TourRecord | null,
): boolean {
  if (!form.guideId || candidates.some((item) => item.id === form.guideId)) return false;
  return !(tour && form.guideId === tour.guideId && !scheduleChanged(tour, form) && form.language === tour.language);
}
