import {
  OPERATION_RESULTS,
  type OperationResult,
} from "@/types/operation-log";

type TranslateFn = (key: string, named?: Record<string, unknown>) => string;
type TagType = "success" | "danger" | "warning" | "info";

const RESULT_SET = new Set<string>(OPERATION_RESULTS);

const SCOPE_LABELS: Record<string, string> = {
  headquarters: "login.brandDesign.headquarters",
  shengxu: "ledger.shengxu.businessUnitName",
  linxi: "websiteInquiry.businessUnits.linxi",
  website: "websiteInquiry.businessUnits.website",
  system: "route.systemManagement",
  unknown: "operationLog.scopeUnknown",
};

const RESULT_LABELS: Record<OperationResult, string> = {
  success: "operationLog.resultStatus.success",
  failure: "operationLog.resultStatus.failure",
  denied: "operationLog.resultStatus.denied",
  cancelled: "operationLog.resultStatus.cancelled",
  unknown: "operationLog.resultStatus.unknown",
  pending: "operationLog.resultStatus.pending",
};

const RESULT_TAG_TYPES: Record<OperationResult, TagType> = {
  success: "success",
  failure: "danger",
  denied: "danger",
  cancelled: "info",
  unknown: "warning",
  pending: "warning",
};

const STAGE_LABELS: Record<string, string> = {
  send_requested: "operationLog.stages.sendRequested",
  stream_started: "operationLog.stages.streamStarted",
  link_issued: "operationLog.stages.linkIssued",
  download_requested: "operationLog.stages.downloadRequested",
  guard: "operationLog.stages.guard",
};

const DETAIL_FIELD_LABELS: Record<string, string> = {
  recordId: "operationLog.detailFields.recordId",
  inquiryId: "operationLog.detailFields.inquiryId",
  itineraryId: "operationLog.detailFields.itineraryId",
  tourId: "operationLog.detailFields.tourId",
  guideId: "operationLog.detailFields.guideId",
  messageId: "operationLog.detailFields.messageId",
  messageIds: "operationLog.detailFields.messageIds",
  eventId: "operationLog.detailFields.eventId",
  visitId: "operationLog.detailFields.visitId",
  sourceVisitId: "operationLog.detailFields.sourceVisitId",
  roleCode: "operationLog.detailFields.roleCode",
  group: "operationLog.detailFields.group",
  page: "operationLog.detailFields.page",
  action: "operationLog.detailFields.action",
  value: "operationLog.detailFields.value",
  stage: "operationLog.detailFields.stage",
  states: "operationLog.detailFields.states",
  enabled: "operationLog.detailFields.enabled",
  status: "operationLog.detailFields.status",
  fromStatus: "operationLog.detailFields.fromStatus",
  toStatus: "operationLog.detailFields.toStatus",
  previousStatus: "operationLog.detailFields.previousStatus",
  nextStatus: "operationLog.detailFields.nextStatus",
  before: "operationLog.detailFields.before",
  after: "operationLog.detailFields.after",
  added: "operationLog.detailFields.added",
  removed: "operationLog.detailFields.removed",
  errorCode: "operationLog.detailFields.errorCode",
  statusCode: "operationLog.detailFields.statusCode",
  occurredAt: "operationLog.detailFields.occurredAt",
  start: "operationLog.detailFields.start",
  end: "operationLog.detailFields.end",
  operation: "operationLog.detailFields.operation",
  source: "operationLog.detailFields.source",
};

const PREFERRED_DETAIL_ORDER = [
  "page",
  "action",
  "value",
  "recordId",
  "inquiryId",
  "itineraryId",
  "tourId",
  "guideId",
  "messageId",
  "messageIds",
  "visitId",
  "sourceVisitId",
  "eventId",
  "roleCode",
  "group",
  "stage",
  "states",
  "enabled",
  "fromStatus",
  "toStatus",
  "previousStatus",
  "nextStatus",
  "status",
  "before",
  "after",
  "added",
  "removed",
  "start",
  "end",
  "errorCode",
  "statusCode",
  "occurredAt",
  "operation",
  "source",
];

/**
 * 优先解析结构化 result 字段，旧接口仅返回 success 布尔值时兼容映射为 success/failure。
 */
export function resolveOperationResult(
  row: { result?: OperationResult | string | null; success?: boolean },
): OperationResult {
  if (typeof row.result === "string" && RESULT_SET.has(row.result)) {
    return row.result as OperationResult;
  }
  return row.success ? "success" : "failure";
}

export function operationResultLabelKey(result: OperationResult): string {
  return RESULT_LABELS[result];
}

export function operationResultTagType(result: OperationResult): TagType {
  return RESULT_TAG_TYPES[result];
}

/**
 * 按北京时间格式化 ISO 时间；非法时间原样返回。
 */
export function formatBeijingTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * 格式化操作日志业务部；历史空值显示“历史未记录”。
 */
export function formatOperationScope(
  scope: string | null | undefined,
  t: TranslateFn,
): string {
  const normalized = scope?.trim();
  if (!normalized) return t("operationLog.legacyUnrecorded");
  const key = SCOPE_LABELS[normalized];
  return key ? t(key) : normalized;
}

/**
 * 格式化操作日志操作人；历史空值显示“历史未记录”。
 */
export function formatOperationActor(
  actorName: string | null | undefined,
  t: TranslateFn,
): string {
  const normalized = actorName?.trim();
  return normalized ? normalized : t("operationLog.legacyUnrecorded");
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatDetailValue(key: string, value: unknown, t: TranslateFn): string | null {
  if (value === undefined || value === null) return null;
  if (key === "occurredAt" && typeof value === "string") {
    return formatBeijingTime(value);
  }
  if (key === "stage" && typeof value === "string") {
    const stageKey = STAGE_LABELS[value];
    return stageKey ? t(stageKey) : value;
  }
  if (typeof value === "boolean") {
    return value ? t("common.yes") : t("common.no");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const items = value
      .map((item) => (typeof item === "string" || typeof item === "number" ? String(item) : JSON.stringify(item)))
      .filter((item) => item !== "");
    return items.length ? items.join(", ") : null;
  }
  const serialized = JSON.stringify(value);
  return serialized === "{}" ? null : serialized;
}

/**
 * 将详情 JSON 或历史纯文本格式化为可读纯文本，始终按文本展示。
 */
export function formatOperationDetail(
  detail: string | null | undefined,
  t: TranslateFn,
): string {
  const trimmed = detail?.trim();
  if (!trimmed) return t("operationLog.legacyUnrecorded");

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return trimmed;
  }

  if (!isPlainRecord(parsed)) {
    return trimmed;
  }

  const keys = Object.keys(parsed);
  if (!keys.length) return t("operationLog.legacyUnrecorded");

  const orderedKeys = [
    ...PREFERRED_DETAIL_ORDER.filter((key) => key in parsed),
    ...keys.filter((key) => !PREFERRED_DETAIL_ORDER.includes(key)),
  ];

  const parts: string[] = [];
  for (const key of orderedKeys) {
    const formatted = formatDetailValue(key, parsed[key], t);
    if (!formatted) continue;
    const labelKey = DETAIL_FIELD_LABELS[key];
    const label = labelKey ? t(labelKey) : key;
    parts.push(`${label}: ${formatted}`);
  }

  return parts.length ? parts.join(t("operationLog.detailSeparator")) : t("operationLog.legacyUnrecorded");
}
