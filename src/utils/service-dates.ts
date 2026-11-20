import { addDays } from "./format";

/** 自选服务日按 YYYY-MM-DD 字符串去重升序，不经过 Date 以免时区换算。 */
export function sortServiceDates(dates: readonly string[]): string[] {
  return [...new Set(dates)].sort();
}

/** 第 dayNumber 天的日期：自选按清单下标，连续按开始日期顺延；未定返回 null。 */
export function serviceDayDate(
  calendar: { startDate: string | null; serviceDates?: string[] | null },
  dayNumber: number,
): string | null {
  if (calendar.serviceDates) return calendar.serviceDates[dayNumber - 1] ?? null;
  return calendar.startDate ? addDays(calendar.startDate, dayNumber - 1) : null;
}

/** 第 dayNumber 天是否紧接前一服务日；连续模式恒为 true。 */
export function isConsecutiveServiceDay(dates: readonly string[] | null | undefined, dayNumber: number) {
  if (!dates) return true;
  const previous = dates[dayNumber - 2];
  return previous !== undefined && addDays(previous, 1) === dates[dayNumber - 1];
}

/** null/undefined 均表示连续模式；数组须逐日一致。 */
export function sameServiceDates(left?: readonly string[] | null, right?: readonly string[] | null) {
  if (!left || !right) return !left && !right;
  return left.length === right.length && left.every((date, index) => date === right[index]);
}

/** 合并相邻自然日用于摘要，如 ["2026-11-21", "2026-11-23 ~ 2026-11-24"]。 */
export function serviceDateRanges(dates: readonly string[]): string[] {
  const ranges: string[] = [];
  let start = "";
  let end = "";
  for (const date of dates) {
    if (start && addDays(end, 1) === date) {
      end = date;
      continue;
    }
    if (start) ranges.push(start === end ? start : `${start} ~ ${end}`);
    start = date;
    end = date;
  }
  if (start) ranges.push(start === end ? start : `${start} ~ ${end}`);
  return ranges;
}
