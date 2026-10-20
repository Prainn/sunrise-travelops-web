/** 顺序调整看板中的一条缩略信息；sortable 分组内的条目可在当天内调整顺序。 */
export interface ReorderBoardItem {
  id: string;
  label: string;
  detail?: string;
}

export interface ReorderBoardGroup {
  key: string;
  label: string;
  items: ReorderBoardItem[];
  /** 作用范围说明，例如整程方案或按城市备选方案 */
  scope?: string;
  sortable?: boolean;
}

export interface ReorderBoardDay {
  id: string;
  title: string;
  groups: ReorderBoardGroup[];
  dayNumber?: number;
  date?: string | null;
}

/** 看板应用结果：整天顺序与各天 sortable 分组的条目顺序，均使用稳定 ID。 */
export interface DayOrderChange {
  dayIds: string[];
  itemIds: Record<string, string[]>;
  deletedDays?: { id: string; dayNumber: number; date: string | null }[];
}

/** 重排产生的待核对事项；dayId 为空表示整程事项。 */
export interface DayOrderIssue {
  dayId: string;
  key: string;
  params?: Record<string, unknown>;
}

/**
 * 按 ID 顺序重排数组，未出现在顺序中的元素保持原相对位置追加在后。
 *
 * @param items - 原数组。
 * @param ids - 目标 ID 顺序。
 * @returns 重排后的新数组。
 */
export function orderById<T extends { id: string }>(items: T[], ids: string[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = ids.flatMap((id) => {
    const item = byId.get(id);
    if (!item) return [];
    byId.delete(id);
    return [item];
  });
  return [...ordered, ...byId.values()];
}

/**
 * 只在重排产生的新相邻关系上报告问题，原有相邻关系的问题不归因于本次调整。
 *
 * @param previousIds - 调整前的日 ID 顺序。
 * @returns 判断 (前一日, 当日) 是否为新相邻关系的函数。
 */
export function createAdjacencyCheck(previousIds: string[]) {
  const pairs = new Set(previousIds.slice(1).map((id, index) => `${previousIds[index]}>${id}`));
  return (previousId: string, id: string) => !pairs.has(`${previousId}>${id}`);
}

/** Apply a board transaction to active and recycled days without losing their contents or IDs. */
export function applyDayChanges<T extends { id: string; dayNumber: number }>(
  days: T[],
  deletedDays: { day: T; originalDate: string | null }[],
  change: DayOrderChange,
) {
  const pool = new Map([...days, ...deletedDays.map((entry) => entry.day)].map((day) => [day.id, day]));
  if (!change.deletedDays) return { days: orderById(days, change.dayIds), deletedDays };
  return {
    days: change.dayIds.map((id) => pool.get(id)!).filter(Boolean),
    deletedDays: change.deletedDays.map((entry) => ({
      day: { ...pool.get(entry.id)!, dayNumber: entry.dayNumber },
      originalDate: entry.date,
    })),
  };
}

/** Locate the original calendar day, inserting before its current occupant. */
export function restoredDayIndex(dates: (string | null)[], date: string | null, dayNumber: number) {
  if (date && dates.some(Boolean)) {
    const index = dates.findIndex((value) => value !== null && value >= date);
    return index < 0 ? dates.length : index;
  }
  return Math.min(Math.max(dayNumber - 1, 0), dates.length);
}
