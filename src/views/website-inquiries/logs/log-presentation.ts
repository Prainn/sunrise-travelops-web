import type { WebsiteInquiryLog, WebsiteInquiryLogChange } from "@/types/website";
import { formatDateTime } from "@/utils/format";

type Translate = (key: string, params?: Record<string, string | number>) => string;
export interface LogDisplayContext {
  t: Translate;
  te: (key: string) => boolean;
  locale: string;
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
const collectionSegments = new Set(["days", "items", "legs", "hotels", "meals", "services"]);

/** 未知历史动作保留原编码。 */
export function actionLabel(action: string, { t, te }: LogDisplayContext): string {
  const key = `websiteInquiry.log.actions.${action}`;
  return te(key) ? t(key) : action;
}

/** 旧日志账号为 null 时只显示姓名，不出现空括号。 */
export function operatorLabel(log: Pick<WebsiteInquiryLog, "operatorName" | "operatorUsername">) {
  return log.operatorUsername ? `${log.operatorName}（${log.operatorUsername}）` : log.operatorName;
}

/** 无字段差异、无 detail、无 metadata 的行没有可展开内容。 */
export function canExpandLog(log: Pick<WebsiteInquiryLog, "changes" | "detail" | "metadata">) {
  return (
    log.changes === null ||
    log.changes.length > 0 ||
    Boolean(log.detail) ||
    Object.values(log.metadata ?? {}).some(Boolean)
  );
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
  change: Pick<WebsiteInquiryLogChange, "kind" | "before" | "after">,
): "added" | "removed" | "changed" {
  if (change.kind === "added" || (isEmpty(change.before) && !isEmpty(change.after))) return "added";
  if (change.kind === "removed" || (!isEmpty(change.before) && isEmpty(change.after)))
    return "removed";
  return "changed";
}

function localName(zh: string | undefined, en: string | undefined, locale: string) {
  return (locale.startsWith("zh") ? zh || en : en || zh) ?? "";
}

function segmentLabel(segment: string, previous: string | undefined, context: LogDisplayContext) {
  const { t, te } = context;
  if (previous === "vehiclePrices" && te(`websiteInquiry.vehicleTypes.${segment}`))
    return t(`websiteInquiry.vehicleTypes.${segment}`);
  const key = `websiteInquiry.log.fields.${segment}`;
  return te(key) ? t(key) : segment;
}

/** 酒店档次显示完整标签；历史日志的方案 A/B 位于 plan 字段，不经此处解释为档次。 */
function hotelTierLabel(tier: string, { t, te }: LogDisplayContext) {
  const key = `websiteItineraryUi.hotelTier${tier}`;
  return te(key) ? t(key) : t("websiteInquiry.log.hotelTier", { tier });
}

/** 路径去掉稳定 ID（含报价组合键 ["7_seat","A"]）后翻译各段，并用 context 补充日序、名称、档位、餐次、车型。 */
export function changeLabel(change: WebsiteInquiryLogChange, context: LogDisplayContext): string {
  const { t, te, locale } = context;
  const ctx = change.context;
  const prefix = [
    ctx?.dayNumber ? t("websiteInquiry.log.day", { day: ctx.dayNumber }) : "",
    localName(ctx?.nameZh, ctx?.nameEn, locale),
    ctx?.hotelTier ? hotelTierLabel(ctx.hotelTier, context) : "",
    ctx?.mealSlot && te(`itinerary.meals.${ctx.mealSlot}`) ? t(`itinerary.meals.${ctx.mealSlot}`) : ctx?.mealSlot,
    ctx?.vehicleType && te(`websiteInquiry.vehicleTypes.${ctx.vehicleType}`)
      ? t(`websiteInquiry.vehicleTypes.${ctx.vehicleType}`)
      : ctx?.vehicleType,
  ]
    .filter(Boolean)
    .join(" · ");
  const segments = change.path.replace(/\[[^\]]+\]/g, "").split(".").filter(Boolean);
  const label = segments
    // 集合段（days/items…）在带 context 时已由前缀表达，其余保留层级。
    .filter((segment) => !(prefix && collectionSegments.has(segment)))
    .map((segment) => segmentLabel(segment, segments[segments.indexOf(segment) - 1], context))
    .join(" / ");
  const text = label || t("websiteInquiry.log.record");
  return prefix ? `${prefix} · ${text}` : text;
}

/** 按字段翻译枚举/布尔/日期；管理员录入文本和名称原样显示。 */
export function formatLogValue(value: unknown, path: string, context: LogDisplayContext): string {
  const { t, te } = context;
  if (value == null || value === "") return t("websiteInquiry.log.empty");
  if (typeof value === "boolean") return t(value ? "common.yes" : "common.no");
  if (Array.isArray(value)) {
    return value.length
      ? value.map((item) => formatLogValue(item, path, context)).join("\n")
      : t("websiteInquiry.log.empty");
  }
  if (typeof value === "object") {
    const lines = Object.entries(value)
      .filter(([key]) => !hiddenObjectFields.has(key))
      .map(([key, item]) => {
        const label = te(`websiteInquiry.log.fields.${key}`)
          ? t(`websiteInquiry.log.fields.${key}`)
          : key;
        return `${label}: ${formatLogValue(item, `${path}.${key}`, context)}`;
      });
    return lines.length ? lines.join("\n") : t("websiteInquiry.log.empty");
  }
  const text = String(value);
  const field = path.replace(/\[[^\]]+\]/g, "").split(".").at(-1) ?? "";
  if (dateTimeFields.has(field)) return formatDateTime(text);
  const keys: Record<string, string> = {
    feeState: `websiteInquiry.feeStates.${text}`,
    mode: `websiteInquiry.transportModes.${text}`,
    slot: `itinerary.meals.${text}`,
    mealSlot: `itinerary.meals.${text}`,
    tier: `websiteInquiry.log.hotelTier`,
    status: `inquiry.statuses.${text}`,
    businessUnit: `websiteInquiry.businessUnits.${text}`,
  };
  const key = keys[field] ?? "";
  if (field === "tier") return te(key) ? t(key, { tier: text }) : text;
  if (field === "hotelTier") return hotelTierLabel(text, context);
  if (field === "category" && te(`websiteItineraryUi.priceCategories.${text}`))
    return t(`websiteItineraryUi.priceCategories.${text}`);
  if (field === "vehicleType")
    return te(`websiteInquiry.vehicleTypes.${text}`) ? t(`websiteInquiry.vehicleTypes.${text}`) : text;
  return key && te(key) ? t(key) : text;
}
