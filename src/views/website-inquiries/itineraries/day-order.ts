import { toRaw } from "vue";
import type { WebsiteConfig, WebsiteDay, WebsiteMeal } from "@/types/website";
import { isMealArranged } from "../options";
import {
  applyDayChanges,
  createAdjacencyCheck,
  orderById,
  type DayOrderChange,
  type DayOrderIssue,
} from "@/views/inquiries/itineraries/reorder-board";

/** 看板分组 key；跨天移动只在同 key 分组之间进行。 */
export const WEBSITE_BOARD_GROUPS = {
  attractions: "attractions",
  legs: "legs",
  hotels: "hotels",
  meals: "meals",
  services: "services",
} as const;
const MEAL_SLOTS: WebsiteMeal["slot"][] = ["breakfast", "lunch", "dinner"];

/** 按天导游没有明细 ID，看板中以日 ID 派生的稳定标识表示。 */
export function websiteGuideBoardId(dayId: string) {
  return `${dayId}-guide`;
}

/**
 * 按看板跨天排布重建各天内容（就地修改已克隆的日）。
 *
 * 移动的明细保留原 ID 与全部字段；副本按原明细深拷贝并使用看板生成的新 ID；
 * 导游按标识读取原日的语言与范围。被移走的餐次补回默认自理的空餐次，保持三餐可编辑。
 */
function placeWebsiteDays(days: WebsiteDay[], change: DayOrderChange) {
  const placements = change.placements;
  if (!placements) return;
  const copies = change.copies ?? {};
  const pool = {
    items: new Map(days.flatMap((day) => day.items.map((item) => [item.id, item] as const))),
    legs: new Map(days.flatMap((day) => day.legs.map((leg) => [leg.id, leg] as const))),
    hotels: new Map(days.flatMap((day) => day.hotels.map((hotel) => [hotel.id, hotel] as const))),
    meals: new Map(days.flatMap((day) => day.meals.map((meal) => [meal.id, meal] as const))),
    services: new Map(days.flatMap((day) => day.services.map((service) => [service.id, service] as const))),
    guides: new Map(
      days.map((day) => [websiteGuideBoardId(day.id), { guideLanguage: day.guideLanguage, guideScope: day.guideScope }] as const),
    ),
  };
  function resolve<T extends { id: string }>(records: Map<string, T>, ids: string[] = []): T[] {
    return ids.flatMap((id) => {
      const sourceId = copies[id];
      const record = records.get(sourceId ?? id);
      if (!record) return [];
      return [sourceId ? { ...structuredClone(record), id } : record];
    });
  }
  days.forEach((day) => {
    const groups = placements[day.id];
    if (!groups) return;
    day.items = resolve(pool.items, groups[WEBSITE_BOARD_GROUPS.attractions]);
    day.legs = resolve(pool.legs, groups[WEBSITE_BOARD_GROUPS.legs]);
    day.hotels = resolve(pool.hotels, groups[WEBSITE_BOARD_GROUPS.hotels]);
    const meals = resolve(pool.meals, groups[WEBSITE_BOARD_GROUPS.meals]);
    day.meals = MEAL_SLOTS.flatMap((slot) => {
      const placed = meals.filter((meal) => meal.slot === slot);
      return placed.length ? placed : [emptyMeal(slot)];
    });
    const serviceIds = groups[WEBSITE_BOARD_GROUPS.services] ?? [];
    const guide = serviceIds.map((id) => pool.guides.get(copies[id] ?? id)).find(Boolean);
    day.guideLanguage = guide?.guideLanguage ?? "";
    day.guideScope = guide?.guideScope ?? "";
    day.services = resolve(pool.services, serviceIds);
  });
}

function emptyMeal(slot: WebsiteMeal["slot"]): WebsiteMeal {
  return { id: crypto.randomUUID(), slot, resourceId: null, restaurantZh: "", restaurantEn: "", feeState: "SELF_PAY" };
}

/**
 * 按看板结果重排独立站逐日内容，返回新副本与需核对事项。
 *
 * 日、景点与组件保留原 ID 和全部字段；住宿城市、酒店与交通段不自动改写，
 * 末日与中间日的住宿变化、城市衔接和交通段只提示，保存后的预览校验继续生效。
 * 跨天排布（change.placements）先重建各天内容，再整天排序。
 *
 * @param days - 当前草稿逐日内容。
 * @param change - 看板应用结果。
 * @returns 重排后的逐日内容与核对事项。
 */
export function reorderWebsiteDays(
  days: WebsiteDay[],
  change: DayOrderChange,
  deletedDays: { day: WebsiteDay; originalDate: string | null }[] = [],
): { days: WebsiteDay[]; deletedDays: { day: WebsiteDay; originalDate: string | null }[]; issues: DayOrderIssue[] } {
  const previousIds = days.map((day) => day.id);
  const previousLastId = previousIds[previousIds.length - 1];
  const isNewAdjacency = createAdjacencyCheck(previousIds);
  const activeDays = days.map((day) => structuredClone(toRaw(day)));
  const recycled = deletedDays.map((entry) => ({ ...entry, day: structuredClone(toRaw(entry.day)) }));
  placeWebsiteDays([...activeDays, ...recycled.map((entry) => entry.day)], change);
  const result = applyDayChanges(activeDays, recycled, change);
  const ordered = result.days;
  result.deletedDays.forEach(({ day }) => {
    const itemIds = change.itemIds[day.id];
    if (itemIds) day.items = orderById(day.items, itemIds);
  });
  const issues: DayOrderIssue[] = [];
  const lastIndex = ordered.length - 1;

  ordered.forEach((day, index) => {
    const moved = day.id !== previousIds[index];
    day.dayNumber = index + 1;
    const itemIds = change.itemIds[day.id];
    if (itemIds) day.items = orderById(day.items, itemIds);
    if (index < lastIndex && day.id === previousLastId && day.overnightCityId === null)
      issues.push({ dayId: day.id, key: "itineraryWorkspace.issues.middleNoOvernight", params: { day: day.dayNumber } });
    if (index === lastIndex && day.id !== previousLastId)
      issues.push({ dayId: day.id, key: "itineraryWorkspace.issues.newLastDay", params: { day: day.dayNumber } });
    const previous = ordered[index - 1];
    const previousCity = previous ? (previous.overnightCityId ?? previous.endCityId) : "";
    if (
      previous &&
      isNewAdjacency(previous.id, day.id) &&
      previousCity &&
      day.departCityId &&
      day.departCityId !== previousCity
    )
      issues.push({
        dayId: day.id,
        key: "itineraryWorkspace.issues.cityBreak",
        params: { day: day.dayNumber, previous: previous.dayNumber },
      });
    if (moved && day.legs.length)
      issues.push({ dayId: day.id, key: "itineraryWorkspace.issues.legsCheck", params: { day: day.dayNumber } });
  });
  return { days: ordered, deletedDays: result.deletedDays, issues };
}

export type ResourceLookup<T> =
  | { status: "loading" }
  | { status: "error"; message: string; retry: () => void }
  /** 资源不存在或已删除（404） */
  | { status: "missing" }
  | { status: "ready"; value: T };

/** 跨天校验所需的配置与公共资源城市读取（按公共资源 ID 读取详情并缓存，不遍历全库）。 */
export interface WebsiteTransferContext {
  /** 行程绑定的配置版本 */
  config: WebsiteConfig;
  /** 按公共城市 ID 读取公共城市名称 */
  publicCityName: (resourceId: string) => ResourceLookup<string | null>;
  /** 按公共餐厅 ID 读取其所在公共城市名称；未记录城市时为 null */
  restaurantCity: (resourceId: string) => ResourceLookup<string | null>;
}

interface TransferCheck extends DayOrderIssue {
  /** 加载中/失败等读取状态不与调整前比较，始终阻断 */
  lookup?: boolean;
}

function detailKey(day: WebsiteDay) {
  const ids = (records: { id: string }[]) => records.map((record) => record.id).sort();
  return JSON.stringify([
    ids(day.items),
    day.legs.map((leg) => leg.id),
    ids(day.hotels),
    ids(day.meals.filter(isMealArranged)),
    ids(day.services),
    day.guideLanguage,
    day.guideScope,
  ]);
}

/**
 * 校验跨天移动/复制的必要影响，只返回本次调整新产生的问题。
 *
 * 只检查内容发生变化的日（含来源日与目标日），并与这些日调整前的结果比较，历史遗留问题不阻断；
 * 景点/组件与餐厅城市须在当天出发、结束及交通段起终点城市内，酒店城市须等于住宿城市，
 * 需要住宿的日须有酒店，交通段须从出发城市连续到结束城市。手填或缺少城市信息只提示人工核对。
 *
 * @param days - 当前草稿活动日。
 * @param change - 看板结果（含 placements）。
 * @param deletedDays - 当前回收日。
 * @param context - 配置版本与资源城市读取。
 * @returns 阻断或提示事项。
 */
export function websiteTransferIssues(
  days: WebsiteDay[],
  change: DayOrderChange,
  deletedDays: { day: WebsiteDay; originalDate: string | null }[],
  context: WebsiteTransferContext,
): DayOrderIssue[] {
  if (!change.placements) return [];
  const original = new Map([...days, ...deletedDays.map((entry) => entry.day)].map((day) => [day.id, day]));
  const origin = new Map<string, string>();
  original.forEach((day) =>
    [...day.items, ...day.legs, ...day.hotels, ...day.meals, ...day.services].forEach((record) => origin.set(record.id, day.id)),
  );
  const next = reorderWebsiteDays(days, change, deletedDays).days;
  return next.flatMap((day, index) => {
    const before = original.get(day.id);
    if (before && detailKey(before) === detailKey(day)) return [];
    const isMoved = (id: string) => Boolean(change.copies?.[id]) || origin.get(id) !== day.id;
    const checks = checkWebsiteDay(day, index + 1, isMoved, context);
    if (!before || !checks.some((issue) => issue.blocking && !issue.lookup)) return checks.map(({ lookup: _lookup, ...issue }) => issue);
    // 调整前结果只用于排除历史问题；已离开当天的餐食无需再读取资源。
    const remaining = new Set(day.meals.map((meal) => meal.id));
    const previous = new Set(
      checkWebsiteDay(before, index + 1, () => false, context, (meal) => remaining.has(meal.id))
        .filter((issue) => issue.blocking && !issue.lookup)
        .map((issue) => `${issue.key}|${issue.itemId ?? ""}`),
    );
    return checks
      .filter((issue) => issue.lookup || !issue.blocking || !previous.has(`${issue.key}|${issue.itemId ?? ""}`))
      .map(({ lookup: _lookup, ...issue }) => issue);
  });
}

function checkWebsiteDay(
  day: WebsiteDay,
  dayNumber: number,
  isMoved: (id: string) => boolean,
  { config, publicCityName, restaurantCity }: WebsiteTransferContext,
  includeMeal: (meal: WebsiteMeal) => boolean = () => true,
): TransferCheck[] {
  const issues: TransferCheck[] = [];
  const add = (key: string, itemId: string, params: Record<string, unknown>, blocking = true, lookup = false) =>
    issues.push({ dayId: day.id, itemId: itemId || undefined, key: `itineraryWorkspace.transfer.${key}`, params: { day: dayNumber, ...params }, blocking, lookup });
  const cityLabel = (id: string) => {
    const city = config.cities.find((record) => record.id === id);
    return city ? city.nameZh || city.nameEn : "";
  };
  const allowed = new Set([day.departCityId, day.endCityId, ...day.legs.flatMap((leg) => [leg.fromCityId, leg.toCityId])].filter(Boolean));
  for (const item of day.items) {
    const name = item.nameZh || item.nameEn;
    const cityId = config.attractions.find((record) => record.id === item.attractionId)?.cityId;
    if (!cityId) {
      if (isMoved(item.id)) add("manualCheck", item.id, { name }, false);
    } else if (!allowed.has(cityId)) add("cityMismatch", item.id, { name, city: cityLabel(cityId) });
  }
  for (const meal of day.meals.filter((value) => isMealArranged(value) && includeMeal(value))) {
    const name = meal.restaurantZh || meal.restaurantEn;
    if (!meal.resourceId) {
      if (name && isMoved(meal.id)) add("manualCheck", meal.id, { name }, false);
      continue;
    }
    const pending = (lookups: (ResourceLookup<string | null> | null)[]) => {
      const failed = lookups.find((lookup) => lookup?.status === "error");
      if (failed?.status === "error") {
        issues.push({
          dayId: day.id, itemId: meal.id, blocking: true, lookup: true, retry: failed.retry,
          key: "itineraryWorkspace.transfer.lookupFailed", params: { day: dayNumber, name, message: failed.message },
        });
        return true;
      }
      if (!lookups.some((lookup) => lookup?.status === "loading")) return false;
      add("checking", meal.id, { name }, true, true);
      return true;
    };
    const restaurant = restaurantCity(meal.resourceId);
    if (pending([restaurant])) continue;
    if (restaurant.status === "missing") {
      add("restaurantMissing", meal.id, { name });
      continue;
    }
    const city = restaurant.status === "ready" ? restaurant.value : null;
    if (!city) {
      if (isMoved(meal.id)) add("manualCheck", meal.id, { name }, false);
      continue;
    }
    // 只通过绑定配置版本中城市明确的 resourceId 读取公共城市名称；未关联的城市无法判定。
    const linked = [...allowed].map((id) => {
      const resourceId = config.cities.find((record) => record.id === id)?.resourceId;
      return { id, lookup: resourceId ? publicCityName(resourceId) : null };
    });
    if (linked.some(({ lookup }) => lookup?.status === "ready" && lookup.value === city)) continue;
    if (pending(linked.map(({ lookup }) => lookup))) continue;
    const missingCity = linked.find(({ lookup }) => lookup?.status === "missing");
    if (missingCity) add("linkedCityMissing", meal.id, { name, city: cityLabel(missingCity.id) });
    else if (linked.some(({ lookup }) => !lookup || (lookup.status === "ready" && !lookup.value))) {
      if (isMoved(meal.id)) add("manualCheck", meal.id, { name }, false);
    } else add("restaurantCityMismatch", meal.id, { name, city });
  }
  for (const hotel of day.hotels) {
    const name = `${hotel.tier} · ${hotel.nameZh || hotel.nameEn}`;
    if (!day.overnightCityId) add("hotelNoOvernight", hotel.id, { name });
    else if (hotel.cityId !== day.overnightCityId) add("hotelCityMismatch", hotel.id, { name, city: cityLabel(day.overnightCityId) });
  }
  if (day.overnightCityId && !day.hotels.length) add("missingHotel", "", {});
  let legCity = day.departCityId;
  const connected = day.legs.every((leg) => {
    const linked = leg.fromCityId === legCity;
    legCity = leg.toCityId;
    return linked;
  });
  if (!connected || legCity !== day.endCityId) add("legChainBroken", "", {});
  return issues;
}
