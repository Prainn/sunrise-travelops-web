import type {
  WebsiteInquiryLog,
  WebsiteInquiryLogDisplayChange,
  WebsiteLogReference,
  WebsiteLogReferenceKind,
} from "@/types/website";
import { formatDateTime } from "@/utils/format";

type Translate = (key: string, params?: Record<string, string | number>) => string;
export interface LogDisplayContext {
  t: Translate;
  te: (key: string) => boolean;
  locale: string;
}

export interface FormatLogValueOptions {
  kind?: WebsiteInquiryLogDisplayChange["kind"];
  side?: "before" | "after";
  targetType?: WebsiteInquiryLog["targetType"];
}

export interface LogExpansionView {
  copySourceCode: string;
  transferReason: string;
  lostReason: string;
  quotationCode: string;
  detail: string;
  changesState: "unavailable" | "not_recorded" | "empty" | "list";
  changes: WebsiteInquiryLogDisplayChange[];
}

export const WEBSITE_LOG_ACTIONS = [
  "inquiry_created",
  "inquiry_updated",
  "inquiry_transferred",
  "inquiry_archived",
  "inquiry_lost",
  "itinerary_created",
  "itinerary_saved",
  "itinerary_copied",
  "itinerary_generated",
  "quotation_confirmed",
] as const;

const hiddenObjectFields = new Set(["id"]);
const dateTimeFields = new Set(["receivedAt", "createdAt", "updatedAt", "occurredAt"]);
const orderableCollections = new Set(["days", "items", "legs", "hotels", "meals", "services"]);
const itemCollections = new Set(["items", "legs", "hotels", "meals", "services"]);
const logReferenceKinds = new Set<WebsiteLogReferenceKind>([
  "day",
  "event",
  "item",
  "leg",
  "hotel",
  "meal",
  "service",
  "guide",
  "city",
  "attraction",
  "route",
  "configHotel",
  "sharedHotel",
  "restaurant",
  "owner",
  "country",
]);

/** 未知历史动作保留原编码。 */
export function actionLabel(action: string, { t, te }: LogDisplayContext): string {
  const key = `websiteInquiry.log.actions.${action}`;
  return te(key) ? t(key) : action;
}

/** 旧日志账号为 null 时只显示姓名，不出现空括号。 */
export function operatorLabel(log: Pick<WebsiteInquiryLog, "operatorName" | "operatorUsername">) {
  return log.operatorUsername ? `${log.operatorName}（${log.operatorUsername}）` : log.operatorName;
}

/** 无展示差异、无 detail、无 metadata 的行没有可展开内容。 */
export function canExpandLog(
  log: Pick<WebsiteInquiryLog, "changes" | "displayChanges" | "detail" | "metadata">,
) {
  const hasSummary =
    Boolean(log.detail?.trim()) || Object.values(log.metadata ?? {}).some(Boolean);
  if (log.displayChanges === undefined) {
    return log.changes === null || (log.changes?.length ?? 0) > 0 || hasSummary;
  }
  return log.displayChanges === null || log.displayChanges.length > 0 || hasSummary;
}

function isEmpty(value: unknown): boolean {
  return (
    value == null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && Object.keys(value).length === 0)
  );
}

export function changeTone(
  change: Pick<WebsiteInquiryLogDisplayChange, "kind" | "before" | "after">,
): "added" | "removed" | "changed" {
  if (change.kind === "added" || (isEmpty(change.before) && !isEmpty(change.after))) return "added";
  if (change.kind === "removed" || (!isEmpty(change.before) && isEmpty(change.after)))
    return "removed";
  return "changed";
}

function isZhLocale(locale: string): boolean {
  return locale.toLowerCase().startsWith("zh");
}

function localName(zh: string | undefined, en: string | undefined, locale: string): string {
  return (isZhLocale(locale) ? zh || en : en || zh) ?? "";
}

function parenthetical(main: string, details: string[], locale: string): string {
  if (!details.length) return main;
  return isZhLocale(locale)
    ? `${main}（${details.join("，")}）`
    : `${main} (${details.join(", ")})`;
}

/** 酒店档次显示完整标签；历史日志的方案 A/B 位于 plan 字段，不经此处解释为档次。 */
function hotelTierLabel(tier: string, { t, te }: LogDisplayContext): string {
  const key = `websiteItineraryUi.hotelTier${tier}`;
  return te(key) ? t(key) : t("websiteInquiry.log.hotelTier", { tier });
}

function mealSlotLabel(slot: string, { t, te }: LogDisplayContext): string {
  const key = `itinerary.meals.${slot}`;
  return te(key) ? t(key) : slot;
}

function transportModeLabel(mode: string, { t, te }: LogDisplayContext): string {
  const key = `websiteInquiry.transportModes.${mode}`;
  return te(key) ? t(key) : mode;
}

function vehicleTypeLabel(vehicleType: string, { t, te }: LogDisplayContext): string {
  const key = `websiteInquiry.vehicleTypes.${vehicleType}`;
  return te(key) ? t(key) : vehicleType;
}

function refTypeLabel(kind: WebsiteLogReferenceKind, { t, te }: LogDisplayContext): string {
  const key = `websiteInquiry.log.refs.${kind}`;
  return te(key) ? t(key) : kind;
}

function isLogReference(value: unknown): value is WebsiteLogReference {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const ref = (value as Record<string, unknown>).ref;
  return typeof ref === "string" && logReferenceKinds.has(ref as WebsiteLogReferenceKind);
}

/** 按引用类型、语言及业务上下文渲染后端解析好的引用对象，不递归打印内部属性。 */
export function formatLogReference(ref: WebsiteLogReference, context: LogDisplayContext): string {
  const { t, locale } = context;
  const name = localName(ref.nameZh, ref.nameEn, locale);
  const missingName = t("websiteInquiry.log.nameNotRecorded");
  const entrySource = t("websiteInquiry.log.entryNameSource");

  switch (ref.ref) {
    case "day":
      return ref.dayNumber != null
        ? t("websiteInquiry.log.day", { day: ref.dayNumber })
        : parenthetical(refTypeLabel("day", context), [missingName], locale);
    case "country":
      if (name && ref.code) return parenthetical(name, [ref.code], locale);
      if (name) return name;
      if (ref.code) return ref.code;
      return parenthetical(refTypeLabel("country", context), [missingName], locale);
    case "owner":
    case "city":
      return name || parenthetical(refTypeLabel(ref.ref, context), [missingName], locale);
    case "attraction":
    case "route":
    case "configHotel":
    case "sharedHotel":
    case "restaurant": {
      const typeLabel = refTypeLabel(ref.ref, context);
      if (!name) return parenthetical(typeLabel, [missingName], locale);
      const details = [typeLabel, ...(ref.source === "entry" ? [entrySource] : [])];
      return parenthetical(name, details, locale);
    }
    case "leg": {
      const typeLabel = refTypeLabel("leg", context);
      const modeLabel = ref.mode ? transportModeLabel(ref.mode, context) : "";
      if (name) return parenthetical(name, [typeLabel, ...(modeLabel ? [modeLabel] : [])], locale);
      if (modeLabel) return parenthetical(typeLabel, [modeLabel], locale);
      return parenthetical(typeLabel, [missingName], locale);
    }
    case "hotel": {
      const typeLabel = refTypeLabel("hotel", context);
      const tierLabel = ref.hotelTier ? hotelTierLabel(ref.hotelTier, context) : "";
      if (name) return parenthetical(name, [typeLabel, ...(tierLabel ? [tierLabel] : [])], locale);
      return parenthetical(typeLabel, [...(tierLabel ? [tierLabel] : []), missingName], locale);
    }
    case "meal": {
      const typeLabel = refTypeLabel("meal", context);
      const slotLabel = ref.mealSlot ? mealSlotLabel(ref.mealSlot, context) : "";
      if (name) return parenthetical(name, [typeLabel, ...(slotLabel ? [slotLabel] : [])], locale);
      if (slotLabel) return parenthetical(typeLabel, [slotLabel], locale);
      return parenthetical(typeLabel, [missingName], locale);
    }
    case "guide":
    case "event":
    case "item":
    case "service": {
      const typeLabel = refTypeLabel(ref.ref, context);
      return name
        ? parenthetical(name, [typeLabel], locale)
        : parenthetical(typeLabel, [missingName], locale);
    }
  }
}

function segmentLabel(
  segment: string,
  previous: string | undefined,
  context: LogDisplayContext,
): string {
  const { t, te } = context;
  if (previous === "priceComponents" && te(`websiteItineraryUi.priceCategories.${segment}`)) {
    return t(`websiteItineraryUi.priceCategories.${segment}`);
  }
  if (
    (previous === "vehiclePrices" || previous === "nightlyVehiclePrices") &&
    te(`websiteInquiry.vehicleTypes.${segment}`)
  ) {
    return t(`websiteInquiry.vehicleTypes.${segment}`);
  }
  const key = `websiteInquiry.log.fields.${segment}`;
  return te(key) ? t(key) : segment;
}

/** 结合分段 fields 与 context 生成可读字段路径，区分日内项目顺序与分类顺序并保留整项类型。 */
export function changeLabel(
  change: Pick<WebsiteInquiryLogDisplayChange, "fields" | "context">,
  context: LogDisplayContext,
  targetType?: WebsiteInquiryLog["targetType"],
): string {
  const { t, te, locale } = context;
  if (targetType === "itinerary" && change.fields.length === 1 && change.fields[0] === "pax") return t("websiteReport.pax");
  const ctx = change.context;
  const hasDay = ctx?.dayNumber != null;
  const itemName = localName(ctx?.nameZh, ctx?.nameEn, locale);
  const hasItemIdentity = Boolean(itemName || ctx?.hotelTier || ctx?.mealSlot);

  const prefix = [
    hasDay ? t("websiteInquiry.log.day", { day: ctx!.dayNumber! }) : "",
    itemName,
    ctx?.hotelTier ? hotelTierLabel(ctx.hotelTier, context) : "",
    ctx?.mealSlot ? mealSlotLabel(ctx.mealSlot, context) : "",
    ctx?.vehicleType ? vehicleTypeLabel(ctx.vehicleType, context) : "",
  ].filter(Boolean);

  const labels: string[] = [];
  const fields = change.fields;
  for (let i = 0; i < fields.length; i++) {
    const segment = fields[i]!;
    const previous = i > 0 ? fields[i - 1] : undefined;
    const next = i + 1 < fields.length ? fields[i + 1] : undefined;
    const isLast = i === fields.length - 1;

    if (next === "order" && orderableCollections.has(segment)) {
      const orderKey = `websiteInquiry.log.orders.${segment}`;
      labels.push(
        te(orderKey)
          ? t(orderKey)
          : `${segmentLabel(segment, previous, context)} / ${segmentLabel("order", segment, context)}`,
      );
      i++;
      continue;
    }

    if (segment === "days" && hasDay && !isLast) continue;
    if (segment === "day" && previous === "deletedDays" && hasDay && !isLast) continue;
    if (itemCollections.has(segment) && !isLast && hasItemIdentity) continue;

    labels.push(segmentLabel(segment, previous, context));
  }

  const text = labels.join(" / ") || t("websiteInquiry.log.record");
  return prefix.length ? `${prefix.join(" / ")} / ${text}` : text;
}

function indentMultiline(text: string): string {
  if (!text.includes("\n")) return ` ${text}`;
  const indented = text
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
  return `\n${indented}`;
}

function formatValueInternal(
  value: unknown,
  fields: string[],
  context: LogDisplayContext,
  options: FormatLogValueOptions & { isRoot: boolean },
): string {
  const { t, te } = context;
  const field = fields.at(-1) ?? "";

  // 新增的 before 与移除的 after 表示该侧原本没有对应记录，即使字段为 serviceDates 也显示空。
  if (
    options.isRoot &&
    value === null &&
    ((options.side === "before" && options.kind === "added") ||
      (options.side === "after" && options.kind === "removed"))
  ) {
    return t("websiteInquiry.log.empty");
  }

  if (value === null && field === "serviceDates") {
    return t("websiteInquiry.log.consecutiveDates");
  }
  if (value == null || value === "") return t("websiteInquiry.log.empty");
  if (typeof value === "boolean") return t(value ? "common.yes" : "common.no");

  if (Array.isArray(value)) {
    if (!value.length) return t("websiteInquiry.log.empty");
    const items = value.map((item) =>
      formatValueInternal(item, fields, context, { ...options, isRoot: false }),
    );
    const hasMultiline = items.some((item) => item.includes("\n"));
    return items.join(hasMultiline ? "\n\n" : "\n");
  }

  if (typeof value === "object") {
    if (isLogReference(value)) return formatLogReference(value, context);
    const lines = Object.entries(value)
      .filter(([key]) => !hiddenObjectFields.has(key))
      .map(([key, item]) => {
        const label = segmentLabel(key, field || undefined, context);
        const formatted = formatValueInternal(item, [...fields, key], context, {
          ...options,
          isRoot: false,
        });
        return `${label}:${indentMultiline(formatted)}`;
      });
    return lines.length ? lines.join("\n") : t("websiteInquiry.log.empty");
  }

  const text = String(value);
  if (dateTimeFields.has(field)) return formatDateTime(text);
  if (field === "status") {
    if (options.targetType === "itinerary" && te(`itinerary.statuses.${text}`)) {
      return t(`itinerary.statuses.${text}`);
    }
    return te(`inquiry.statuses.${text}`) ? t(`inquiry.statuses.${text}`) : text;
  }
  if (field === "plan") return text;
  if (field === "tier" || field === "hotelTier") return hotelTierLabel(text, context);
  if (field === "category") {
    return te(`websiteItineraryUi.priceCategories.${text}`)
      ? t(`websiteItineraryUi.priceCategories.${text}`)
      : text;
  }
  if (field === "vehicleType") return vehicleTypeLabel(text, context);

  const keys: Record<string, string> = {
    feeState: `websiteInquiry.feeStates.${text}`,
    mode: `websiteInquiry.transportModes.${text}`,
    hotelPricingMode: `websiteItineraryUi.${text}Mode`,
    slot: `itinerary.meals.${text}`,
    mealSlot: `itinerary.meals.${text}`,
    businessUnit: `websiteInquiry.businessUnits.${text}`,
  };
  const key = keys[field] ?? "";
  return key && te(key) ? t(key) : text;
}

/** 递归格式化展示值：识别引用对象、按目标类型翻译状态、区分新增/移除空侧与连续服务日。 */
export function formatLogValue(
  value: unknown,
  fields: string[],
  context: LogDisplayContext,
  options: FormatLogValueOptions = {},
): string {
  return formatValueInternal(value, fields, context, { ...options, isRoot: true });
}

function matchesTransferDetail(detail: string, reason: string): boolean {
  if (detail === reason) return true;
  const hasArrow = detail.includes("→") || detail.includes("->");
  return (
    hasArrow &&
    (detail.endsWith(`：${reason}`) ||
      detail.endsWith(`:${reason}`) ||
      detail.endsWith(`: ${reason}`))
  );
}

/** 汇总展开区视图，确保报价编号、转交原因和流失原因不重复呈现并保留独立历史说明与实质前后变化。 */
export function buildLogExpansionView(
  log: Pick<WebsiteInquiryLog, "displayChanges" | "detail" | "metadata">,
): LogExpansionView {
  const copySourceCode =
    log.metadata?.creationMode === "copy" && log.metadata.sourceCode
      ? log.metadata.sourceCode
      : "";
  const quotationCode = log.metadata?.quotationCode?.trim() ?? "";
  const rawLostReason = log.metadata?.lostReason?.trim() ?? "";
  let lostReason = rawLostReason;
  let transferReason = log.metadata?.transferReason?.trim() ?? "";
  let detail = log.detail?.trim() ?? "";

  let changesState: LogExpansionView["changesState"];
  let changes: WebsiteInquiryLogDisplayChange[] = [];

  if (log.displayChanges === undefined) {
    changesState = "unavailable";
  } else if (log.displayChanges === null) {
    changesState = "not_recorded";
  } else if (log.displayChanges.length === 0) {
    changesState = "empty";
  } else {
    changesState = "list";
    changes = [...log.displayChanges];
  }

  let lostReasonAfter = "";
  const lostIndex = changes.findIndex(
    (item) => item.fields.length === 1 && item.fields[0] === "lostReason",
  );
  if (lostIndex >= 0) {
    const lostChange = changes[lostIndex]!;
    const beforeText = typeof lostChange.before === "string" ? lostChange.before.trim() : "";
    const afterText = typeof lostChange.after === "string" ? lostChange.after.trim() : "";
    lostReasonAfter = afterText;
    const hasSubstantialDiff = Boolean(beforeText) && Boolean(afterText) && beforeText !== afterText;
    if (hasSubstantialDiff) {
      if (lostReason && (lostReason === afterText || lostReason === beforeText)) {
        lostReason = "";
      }
    } else if (lostReason && !beforeText && afterText === lostReason) {
      changes.splice(lostIndex, 1);
    }
  }

  if (detail && quotationCode && detail === quotationCode) {
    detail = "";
  }
  if (detail && (detail === rawLostReason || (lostReasonAfter && detail === lostReasonAfter))) {
    detail = "";
  }
  if (detail && transferReason) {
    const hasOwnerChange = changes.some(
      (item) =>
        item.fields.length === 1 && (item.fields[0] === "ownerId" || item.fields[0] === "owner"),
    );
    if (detail === transferReason) {
      detail = "";
    } else if (matchesTransferDetail(detail, transferReason)) {
      if (hasOwnerChange) {
        detail = "";
      } else {
        // 历史未记录差异时保留含前后负责人姓名的 detail，并隐藏重复的转交原因行。
        transferReason = "";
      }
    }
  }

  return {
    copySourceCode,
    transferReason,
    lostReason,
    quotationCode,
    detail,
    changesState,
    changes,
  };
}
