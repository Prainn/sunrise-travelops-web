import type { Component } from "vue";
import type { WebsiteReorderDraft, WebsiteLeg } from "@/types/website";

/** 顺序调整看板中的一条缩略信息；sortable 分组内的条目可在当天内调整顺序。 */
export interface ReorderBoardItem {
  id: string;
  label: string;
  detail?: string;
  /** 资源类型图标，与日卡按钮一致；页面需 markRaw */
  icon?: Component;
  /** 分组内唯一的安排位（如酒店档位、餐次、按天导游）；跨天放入已有同位安排时需确认替换 */
  slot?: string;
  /** 未安排的占位（如默认自理的餐次），不可拖动或复制，同位安排放入时直接让位 */
  placeholder?: boolean;
  hotelCityId?: string;
  transportLeg?: WebsiteLeg;
}

export interface ReorderBoardGroup {
  key: string;
  label: string;
  items: ReorderBoardItem[];
  /** 作用范围说明，例如整程方案或按城市备选方案 */
  scope?: string;
  /** 分组标题图标，与日卡资源按钮一致；页面需 markRaw */
  icon?: Component;
  sortable?: boolean;
  /** 看板开启 transfer 时，该分组条目可跨天移动与复制，只能进入同 key 分组 */
  transferable?: boolean;
}

export interface ReorderBoardDay {
  noOvernight?: boolean;
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
  /** 跨天模式：各天各分组的条目 ID（含已安置的副本） */
  placements?: BoardPlacements;
  /** 跨天模式：副本 ID → 原条目 ID，应用时按原条目内容克隆 */
  copies?: Record<string, string>;
  addedDayIds?: string[];
  overnight?: Record<string, string>;
  draft?: WebsiteReorderDraft;
  removedItemIds?: string[];
  transportCopies?: WebsiteLeg[];
}

/** 重排产生的待核对事项；dayId 为空表示整程事项。 */
export interface DayOrderIssue {
  dayId: string;
  key: string;
  params?: Record<string, unknown>;
  /** 对应卡片，用于在看板中标出问题 */
  itemId?: string;
  /** 阻断“应用调整”；未设置的为仅提示的核对事项 */
  blocking?: boolean;
  /** 资源请求失败等可重试的问题 */
  retry?: () => void;
}

/** dayId → groupKey → 条目 ID 顺序 */
export type BoardPlacements = Record<string, Record<string, string[]>>;

/** 看板内的临时排布：只存在于弹窗副本中，取消即丢弃。 */
export interface BoardState {
  removedItemIds?: string[];
  transportCopies?: WebsiteLeg[];
  placements: BoardPlacements;
  /** 临时副本 ID → 原条目 ID 与创建时所在日 */
  copies: Record<string, { sourceId: string; dayId: string; parentId?: string; placed?: boolean }>;
}

/**
 * 按看板日建立初始排布。
 *
 * @param days - 看板日（含回收日）。
 * @returns 各天各分组的条目 ID。
 */
export function boardPlacements(days: ReorderBoardDay[]): BoardPlacements {
  return Object.fromEntries(
    days.map((day) => [day.id, Object.fromEntries(day.groups.map((group) => [group.key, group.items.map((item) => item.id)]))]),
  );
}

function withGroup(state: BoardState, dayId: string, groupKey: string, ids: string[]): BoardPlacements {
  return { ...state.placements, [dayId]: { ...state.placements[dayId], [groupKey]: ids } };
}

/**
 * 预演一次跨天移动；不修改传入状态。
 *
 * 目标分组中同 slot 的已安排条目列入 replaced，由调用方确认替换后再采用 next；
 * 同 slot 的占位直接让位。不允许同天或跨分组移动。
 *
 * @param state - 当前看板排布。
 * @param group - 所在分组，未标记 transferable 的分组（如盛旭普通询盘）不可跨天。
 * @param source - 被拖动条目及其所在日。
 * @param target - 目标日与插入位置，省略 index 时追加到末尾。
 * @param item - 按 ID 读取看板条目（含副本）。
 * @returns 移动后的排布与需确认替换的条目；不可移动时返回 null。
 */
export function planBoardTransfer(
  state: BoardState,
  group: Pick<ReorderBoardGroup, "key" | "transferable">,
  source: { dayId: string; itemId: string },
  target: { dayId: string; index?: number },
  item: (id: string) => ReorderBoardItem | undefined,
): { next: BoardState; replaced: string[] } | null {
  const moving = item(source.itemId);
  const targetIds = state.placements[target.dayId]?.[group.key];
  const sourceIds = state.placements[source.dayId]?.[group.key];
  if (!group.transferable || !moving || moving.placeholder || source.dayId === target.dayId || !targetIds || !sourceIds?.includes(source.itemId))
    return null;
  if (Object.entries(state.copies).some(([id, copy]) =>
    !copy.placed && (copy.parentId ?? copy.sourceId) === source.itemId && copy.dayId === source.dayId && sourceIds.includes(id))) return null;
  const sameSlot = (id: string) => Boolean(moving.slot) && item(id)?.slot === moving.slot;
  const replaced = targetIds.filter((id) => sameSlot(id) && !item(id)?.placeholder);
  const anchor = target.index === undefined ? undefined : targetIds[target.index];
  const kept = targetIds.filter((id) => !sameSlot(id));
  const index = anchor && kept.includes(anchor) ? kept.indexOf(anchor) : kept.length;
  const placements = withGroup(state, source.dayId, group.key, sourceIds.filter((id) => id !== source.itemId));
  const copies = { ...state.copies };
  replaced.forEach((id) => delete copies[id]);
  const movingCopy = copies[source.itemId];
  if (movingCopy) copies[source.itemId] = { ...movingCopy, placed: true };
  return {
    next: {
      ...state,
      placements: {
        ...placements,
        [target.dayId]: { ...placements[target.dayId], [group.key]: [...kept.slice(0, index), source.itemId, ...kept.slice(index)] },
      },
      copies,
      removedItemIds: [...new Set([...(state.removedItemIds ?? []), ...targetIds.filter(id => sameSlot(id) && !state.copies[id])])],
      transportCopies: state.transportCopies?.filter(leg => !replaced.includes(leg.id)),
    },
    replaced,
  };
}

/**
 * 在原卡片后插入临时副本；副本记录根原条目，复制副本时仍指向同一原条目。
 *
 * @param state - 当前看板排布。
 * @param dayId - 原卡片所在日。
 * @param groupKey - 分组。
 * @param itemId - 原卡片 ID。
 * @param copyId - 新副本 ID。
 * @returns 新排布。
 */
export function copyBoardItem(state: BoardState, dayId: string, groupKey: string, itemId: string, copyId: string): BoardState {
  const ids = state.placements[dayId]?.[groupKey] ?? [];
  const index = ids.indexOf(itemId);
  if (index < 0) return state;
  return {
    ...state,
    placements: withGroup(state, dayId, groupKey, [...ids.slice(0, index + 1), copyId, ...ids.slice(index + 1)]),
    copies: { ...state.copies, [copyId]: { sourceId: state.copies[itemId]?.sourceId ?? itemId, parentId: itemId, dayId, placed: false } },
  };
}

/** 删除卡片，保留依赖同一源内容的独立副本；显式删除的原卡在暂存恢复时不补回。 */
export function removeBoardItem(state: BoardState, itemId: string): BoardState {
  const copies = { ...state.copies };
  const isCopy = Boolean(copies[itemId]);
  delete copies[itemId];
  return {
    ...state,
    removedItemIds: isCopy ? state.removedItemIds : [...new Set([...(state.removedItemIds ?? []), itemId])],
    transportCopies: state.transportCopies?.filter(leg => leg.id !== itemId),
    placements: Object.fromEntries(
      Object.entries(state.placements).map(([dayId, groups]) => [
        dayId,
        Object.fromEntries(Object.entries(groups).map(([key, ids]) => [key, ids.filter((id) => id !== itemId)])),
      ]),
    ),
    copies,
  };
}

/** 删除临时副本，保留既有调用的副本限定语义。 */
export function removeBoardCopy(state: BoardState, copyId: string): BoardState {
  return state.copies[copyId] ? removeBoardItem(state, copyId) : state;
}

/**
 * 看板自身的阻断事项：仍在原日的临时副本，以及同一天同 slot 的重复安排。
 *
 * @param state - 当前看板排布。
 * @param days - 活动日（按当前顺序）。
 * @param item - 按 ID 读取看板条目（含副本）。
 * @returns 阻断事项。
 */
export function boardTransferIssues(
  state: BoardState,
  days: ReorderBoardDay[],
  item: (id: string) => ReorderBoardItem | undefined,
): DayOrderIssue[] {
  return days.flatMap((day, index) =>
    day.groups.flatMap((group) => {
      const ids = state.placements[day.id]?.[group.key] ?? [];
      const unplaced = ids
        .filter((id) => state.copies[id]?.dayId === day.id && !state.copies[id]?.placed)
        .map((id) => ({
          dayId: day.id, itemId: id, blocking: true,
          key: "itineraryWorkspace.transfer.unplacedCopy",
          params: { day: index + 1, name: item(id)?.label ?? "" },
        }));
      const seen = new Set<string>();
      const duplicates = ids.flatMap((id) => {
        const record = item(id);
        if (!record?.slot || record.placeholder) return [];
        if (!seen.has(record.slot)) {
          seen.add(record.slot);
          return [];
        }
        return [{
          dayId: day.id, itemId: id, blocking: true,
          key: "itineraryWorkspace.transfer.duplicateSlot",
          params: { day: index + 1, group: group.label, name: record.label },
        }];
      });
      return [...unplaced, ...duplicates];
    }),
  );
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

/**
 * Restore pending website placements, preserving new canonical content and dropping removed references.
 *
 * Items the draft no longer places are normally new main-page content, except those displaced by a confirmed slot
 * replacement before stashing; a same-slot item already placed that day marks them as displaced.
 */
export function restoreWebsiteBoard(days: ReorderBoardDay[], draft: WebsiteReorderDraft): BoardState {
  const current = boardPlacements(days);
  const items = new Map(days.flatMap(day => day.groups.flatMap(group => group.items.map(item => [item.id, item] as const))));
  const available = new Set(items.keys());
  const removed = new Set(draft.removedItemIds ?? []);
  const copies = Object.fromEntries(draft.copies.filter(copy => available.has(copy.sourceId)).map(({ id, ...copy }) => [id, copy]));
  const itemOf = (id: string) => items.get(id) ?? items.get(copies[id]?.sourceId ?? "");
  const saved = new Map(draft.placements.map(entry => [entry.dayId, entry.itemIds]));
  const assigned = new Set(draft.placements.filter(entry => current[entry.dayId]).flatMap(entry => entry.itemIds));
  const overnight = new Set(draft.overnight.map(entry => entry.dayId));
  return {
    copies,
    removedItemIds: [...removed],
    transportCopies: (draft.transportCopies ?? []).filter(leg => copies[leg.id]),
    placements: Object.fromEntries(days.map(day => {
      let previous = (saved.get(day.id) ?? []).filter(id => !removed.has(id) && (available.has(id) || copies[id]));
      const added = (current[day.id]?.events ?? []).filter(id => !removed.has(id) && !assigned.has(id) && !(id === `${day.id}-no-stay` && overnight.has(day.id)))
        .filter(id => {
          const slot = itemOf(id)?.slot;
          if (!slot) return true;
          const occupant = previous.find(other => itemOf(other)?.slot === slot);
          if (!occupant) return true;
          // New real content takes over a draft placeholder; otherwise it is a displaced item.
          if (itemOf(occupant)?.placeholder && !itemOf(id)?.placeholder) {
            previous = previous.filter(other => other !== occupant);
            return true;
          }
          return false;
        });
      return [day.id, { events: [...previous, ...added] }];
    })),
  };
}
