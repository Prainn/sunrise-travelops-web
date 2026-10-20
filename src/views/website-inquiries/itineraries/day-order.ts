import { toRaw } from "vue";
import type { WebsiteDay } from "@/types/website";
import {
  applyDayChanges,
  createAdjacencyCheck,
  orderById,
  type DayOrderChange,
  type DayOrderIssue,
} from "@/views/inquiries/itineraries/reorder-board";

/**
 * 按看板结果重排独立站逐日内容，返回新副本与需核对事项。
 *
 * 日、景点与组件保留原 ID 和全部字段；住宿城市、酒店与交通段不自动改写，
 * 末日与中间日的住宿变化、城市衔接和交通段只提示，保存后的预览校验继续生效。
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
  const result = applyDayChanges(days.map((day) => structuredClone(toRaw(day))), deletedDays.map((entry) => ({ ...entry, day: structuredClone(toRaw(entry.day)) })), change);
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
