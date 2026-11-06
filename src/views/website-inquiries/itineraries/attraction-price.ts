import type { WebsiteAttractionPriceReference, WebsiteConfig, WebsiteDay } from "@/types/website";

function toCents(price: string) {
  const [whole, fraction = ""] = price.split(".");
  return BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function fromCents(cents: bigint) {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

/** 收费景点/组件的两位小数价格；免费、手填或无法在绑定配置中关联时为 null。 */
export function attractionReferencePrice(config: WebsiteConfig, attractionId: string | null) {
  const attraction = attractionId ? config.attractions.find(item => item.id === attractionId) : undefined;
  return attraction?.chargeable ? fromCents(toCents(attraction.price)) : null;
}

/**
 * 与后端 attractionPriceReference 同口径：只读绑定 configVersion 的专属景点，活动日每次出现逐项整数分累加，
 * 不按 feeState/appears/启停过滤，不乘人数；deletedDays 不传入即不参与。
 */
export function websiteAttractionPriceReference(days: WebsiteDay[], config: WebsiteConfig): WebsiteAttractionPriceReference {
  const attractions = new Map(config.attractions.map(item => [item.id, item]));
  let total = 0n;
  const items = days.flatMap(day => day.items.map((item) => {
    const attraction = item.attractionId ? attractions.get(item.attractionId) : undefined;
    let price: string | null = null;
    if (attraction?.chargeable) {
      const cents = toCents(attraction.price);
      total += cents;
      price = fromCents(cents);
    }
    return { dayId: day.id, itemId: item.id, attractionId: item.attractionId, chargeable: attraction?.chargeable ?? null, price };
  }));
  return { configVersion: config.version, items, total: fromCents(total) };
}

/** 与 formatMoney 显示一致（千分位、两位小数），按整数精确分组以免大额合计失真；无价格显示“-”。 */
export function formatAttractionPrice(price: string | null | undefined) {
  if (price == null) return "-";
  const [whole, fraction = ""] = price.split(".");
  return `${BigInt(whole!).toLocaleString("zh-CN")}.${fraction.padEnd(2, "0")}`;
}
