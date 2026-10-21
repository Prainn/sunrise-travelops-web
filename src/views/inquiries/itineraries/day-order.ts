import { toRaw } from "vue";
import type { ItineraryDayRecord, ItineraryRecord } from "@/types/itinerary";
import { addDays } from "@/utils";
import { applyDayChanges, createAdjacencyCheck, orderById, type DayOrderChange, type DayOrderIssue } from "./reorder-board";

/**
 * 按看板结果重排普通询盘日程，返回新的日程副本与需人工核对的事项。
 *
 * 日与资源保持原 ID；景点只在景点占用的位置间交换，午/晚餐绑定和位置不变。
 * 非末日住宿沿用“住宿=到达地”联动；出发地、用车日期段和当日文案不自动改写，只提示核对。
 *
 * @param plan - 当前草稿。
 * @param change - 看板应用结果。
 * @returns 重排后的日程与核对事项。
 */
export function reorderItineraryDays(
  plan: Pick<ItineraryRecord, "dailyPlans" | "deletedDays" | "startDate" | "vehiclePlans">,
  change: DayOrderChange,
): { dailyPlans: ItineraryDayRecord[]; deletedDays: NonNullable<ItineraryRecord["deletedDays"]>; issues: DayOrderIssue[] } {
  const previousIds = plan.dailyPlans.map((day) => day.id);
  const previousLastId = previousIds[previousIds.length - 1];
  const isNewAdjacency = createAdjacencyCheck(previousIds);
  const result = applyDayChanges(plan.dailyPlans.map((day) => structuredClone(toRaw(day))), (plan.deletedDays ?? []).map((entry) => ({ ...entry, day: structuredClone(toRaw(entry.day)) })), change);
  const days = result.days;
  const issues: DayOrderIssue[] = [];
  const dayOrderChanged = days.length !== previousIds.length || days.some((day, index) => day.id !== previousIds[index]);

  days.forEach((day, index) => {
    day.dayNumber = index + 1;
    if (plan.startDate) day.date = addDays(plan.startDate, index);
  });
  [...days, ...result.deletedDays.map((entry) => entry.day)].forEach((day) => {
    const attractionIds = change.itemIds[day.id];
    if (attractionIds) {
      const original = day.items.filter((item) => item.type === "attraction");
      const attractions = orderById(original, attractionIds);
      const attractionOrderChanged = attractions.some((item, position) => item.id !== original[position]?.id);
      let cursor = 0;
      day.items = day.items.map((item) => (item.type === "attraction" ? attractions[cursor++]! : item));
      if (attractionOrderChanged && day.description?.trim())
        issues.push({ dayId: day.id, key: "itineraryWorkspace.issues.descriptionCheck", params: { day: day.dayNumber } });
    }
  });

  const lastIndex = days.length - 1;
  days.forEach((day, index) => {
    if (index < lastIndex && day.id === previousLastId) {
      day.overnightDestination = day.destination || null;
      issues.push({
        dayId: day.id,
        key: "itineraryWorkspace.issues.formerLastDay",
        params: { day: day.dayNumber, city: day.destination || "-" },
      });
    }
    if (index === lastIndex && day.id !== previousLastId)
      issues.push({ dayId: day.id, key: "itineraryWorkspace.issues.newLastDay", params: { day: day.dayNumber } });
    const previous = days[index - 1];
    if (
      previous &&
      isNewAdjacency(previous.id, day.id) &&
      previous.overnightDestination &&
      day.departure !== previous.overnightDestination
    )
      issues.push({
        dayId: day.id,
        key: "itineraryWorkspace.issues.routeBreak",
        params: { day: day.dayNumber, previous: previous.dayNumber },
      });
  });

  if (dayOrderChanged && plan.vehiclePlans.some((vehicle) => vehicle.arrangements.length))
    issues.push({ dayId: "", key: "itineraryWorkspace.issues.vehicleCheck" });
  return { dailyPlans: days, deletedDays: result.deletedDays, issues };
}
