import type { WebsiteDay, WebsiteItineraryInput } from "@/types/website";
import { serviceDayDate } from "@/utils/service-dates";
import { emptyDay } from "../options";
import { alignAirportTransfers } from "./airport-transfers";

type Calendar = Pick<WebsiteItineraryInput, "days" | "deletedDays" | "startDate" | "serviceDates" | "duration">;
export interface ScheduledDay {
  day: WebsiteDay;
  date: string | null;
}
export interface RescheduleDiff {
  /** 新旧清单共有的日期，沿用原行程日 */
  kept: ScheduledDay[];
  /** 原日期不在新清单中（或原日期未定）的行程日 */
  removed: ScheduledDay[];
  /** 新清单中新选的日期，原清单中尚未编排的日期不自动接收其他天的内容。 */
  added: string[];
}
/** 移除日的去向：新增日期之一，null 表示放入回收站。 */
export type RescheduleTargets = Record<string, string | null>;

/** 草稿按自身日历（自选清单或开始日期顺延）比较询盘的新服务日期。 */
export function rescheduleDiff(plan: Calendar, dates: readonly string[]): RescheduleDiff {
  const kept: ScheduledDay[] = [];
  const removed: ScheduledDay[] = [];
  plan.days.forEach((day) => {
    const date = serviceDayDate(plan, day.dayNumber);
    (date && dates.includes(date) ? kept : removed).push({ day, date });
  });
  const originalDates = new Set(plan.serviceDates ?? kept.map(entry => entry.date));
  return { kept, removed, added: dates.filter(date => !originalDates.has(date)) };
}

/** 默认把移除日按原顺序改排到新增日期（如只把 24 日换成 25 日），多出的放入回收站；由计调核对后应用。 */
export function defaultRescheduleTargets(diff: RescheduleDiff): RescheduleTargets {
  return Object.fromEntries(diff.removed.map((entry, index) => [entry.day.id, diff.added[index] ?? null]));
}

/**
 * 把询盘服务日期应用到草稿。
 *
 * 自选清单：共有日期沿用原 day.id 及明细；移除日按 targets 改排或整日放入 deletedDays（originalDate 为原服务日）；
 * 其余新增日期补空白行程日，使 Dn 与 serviceDates[n - 1] 一一对应。
 * 连续模式（dates 为 null）：逐日内容及顺序不变，按询盘开始日期顺延。
 */
export function applyReschedule(
  plan: Calendar,
  dates: string[] | null,
  targets: RescheduleTargets,
  inquiry: { startDate: string | null; plannedDays: number },
): Calendar {
  if (!dates) {
    return {
      days: alignAirportTransfers(plan.days.map((day, index) => ({ ...day, dayNumber: index + 1 })), plan.days.length),
      deletedDays: plan.deletedDays ?? [],
      serviceDates: null,
      startDate: inquiry.startDate,
      duration: plan.days.length || inquiry.plannedDays,
    };
  }
  const diff = rescheduleDiff(plan, dates);
  const byDate = new Map(diff.kept.map(entry => [entry.date!, entry.day]));
  const recycled: { day: WebsiteDay; originalDate: string | null }[] = [];
  for (const { day, date } of diff.removed) {
    const target = targets[day.id];
    if (target && diff.added.includes(target) && !byDate.has(target)) byDate.set(target, day);
    else recycled.push({ day, originalDate: date });
  }
  return {
    days: alignAirportTransfers(dates.map((date, index) => ({ ...(byDate.get(date) ?? emptyDay(index + 1)), dayNumber: index + 1 })), dates.length),
    deletedDays: [...(plan.deletedDays ?? []), ...recycled],
    serviceDates: [...dates],
    startDate: dates[0] ?? null,
    duration: dates.length,
  };
}
